import { useEffect, useState } from 'react';

import Grid from '@mui/material/Grid';
import { PetsIcon, AssignmentIcon, CheckCircleIcon, FlightTakeoffIcon, ReportProblemIcon, AssignmentIndIcon } from '../components/icons';
import DashboardPanel from '../components/DashboardPanel';
import PageHeader from '../components/PageHeader';


import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import DashboardCard from '../components/DashboardCard';
import AddCatDialog from '../components/Cats/AddCatDialog/AddCatDialog';
import AddTaskDialog from '../components/Cats/Workspace/Tasks/AddTaskDialog';

import { getCats } from '../services/CatsService';
import { getActiveApplications } from '../services/ActiveApplicationsService';
import { getMatchingStages, getMyCasesOpenStages, getUpcomingTasksDays } from '../services/AppSettingsService';
import { selectUpcomingTasks, todayDateString } from '../utils/taskStatus';
import UpcomingTasksPanel from '../components/Dashboard/UpcomingTasksPanel';
import RecentActivityPanel from '../components/Dashboard/RecentActivityPanel';
import MondayApiVersionBanner from '../components/Dashboard/MondayApiVersionBanner';
import { getAllActivity } from '../services/ActivityLogService';
import { selectRecentActivity } from '../utils/recentActivity';
import { canAccessPath } from '../utils/navigationAccess';
import useAuth from '../hooks/useAuth';
import { getTasks } from '../services/TasksService';
import { getTravel } from '../services/TravelService';
import { getPostAdoptionCases } from '../services/PostAdoptionService';

import { CATS_STATUS_OPTIONS } from '../constants/statuses/catsStatuses';
import { TASKS_STATUS_OPTIONS } from '../constants/statuses/tasksStatuses';
import { ROLES } from '../constants/roles';
import { TRAVEL_STATUS_OPTIONS } from '../constants/statuses/travelStatuses';
import { POST_ADOPTION_STATUS_OPTIONS } from '../constants/statuses/postAdoptionStatuses';

const RECENT_ACTIVITY_LIMIT = 5;

function Dashboard() {

    const [addCatOpen, setAddCatOpen] = useState(false);
    const [addTaskOpen, setAddTaskOpen] = useState(false);
    const { user } = useAuth();
    // null while loading; see UpcomingTasksPanel.
    const [upcomingTasks, setUpcomingTasks] = useState(null);
    const [upcomingDays, setUpcomingDays] = useState(null);
    const [upcomingError, setUpcomingError] = useState(false);
    const [recentActivity, setRecentActivity] = useState(null);
    const [recentActivityError, setRecentActivityError] = useState(false);

    const [stats, setStats] = useState({
        awaitingPassport: null,
        pendingMatching: null,
        tasksDueToday: null,
        travelPending: null,
        escalationsRequired: null,
        myOpenCases: null,
        myOpenCasesBreakdown: '',
    });

    // One tasks fetch feeds both the Tasks Due Today tile and the Upcoming
    // Tasks panel. Also re-run after a task is created from this page, so
    // both reflect it (the server drops its cache on every write).
    function loadTasks() {
        Promise.all([getTasks(), getUpcomingTasksDays()])
            .then(([tasks, days]) => {
                const today = todayDateString();

                const count = tasks.filter(
                    (task) =>
                        task.dueDate === today &&
                        task.status !== TASKS_STATUS_OPTIONS.STATUS.COMPLETED &&
                        task.status !== TASKS_STATUS_OPTIONS.STATUS.CANCELLED,
                ).length;

                setStats((current) => ({ ...current, tasksDueToday: count }));
                setUpcomingDays(days);
                setUpcomingTasks(selectUpcomingTasks(tasks, user, days));
                setUpcomingError(false);
            })
            .catch((err) => {
                console.error('Failed to load tasks for dashboard:', err);
                setUpcomingError(true);
            });
    }

    useEffect(() => {

        // Fetched independently so one board failing doesn't blank out
        // counts the others successfully returned.

        getCats()
            .then((cats) => {
                const count = cats.filter(
                    (cat) => cat.status === CATS_STATUS_OPTIONS.STATUS.AWAITING_PASSPORT,
                ).length;

                setStats((current) => ({ ...current, awaitingPassport: count }));
            })
            .catch((err) => console.error('Failed to load cats for dashboard:', err));

        // Pending Matching: same definition as the Matching page's "Needs
        // Match" tab - an unmatched application in one of the MATCHING_STAGES.
        // My Open Cases: applications owned by the logged-in user in one of
        // the MY_CASES_OPEN_STAGES, broken down per stage in that setting's order.
        Promise.all([getActiveApplications(), getMatchingStages(), getMyCasesOpenStages()])
            .then(([applications, matchingStages, openStages]) => {
                const pendingMatching = applications.filter(
                    (application) =>
                        matchingStages.includes(application.adoptionStage) &&
                        application.linkedCatIds.length === 0,
                ).length;

                const myOpenCases = applications.filter(
                    (application) =>
                        String(application.caseOwnerId) === String(user?.id) &&
                        openStages.includes(application.adoptionStage),
                );

                const myOpenCasesBreakdown = openStages
                    .map((stage) => ({
                        stage,
                        count: myOpenCases.filter((application) => application.adoptionStage === stage).length,
                    }))
                    .map(({ stage, count }) => `${count} ${stage.replace(/ Application$/, '')}`)
                    .join(' · ');

                setStats((current) => ({
                    ...current,
                    pendingMatching,
                    myOpenCases: myOpenCases.length,
                    myOpenCasesBreakdown,
                }));
            })
            .catch((err) => console.error('Failed to load active applications for dashboard:', err));

        loadTasks();

        getAllActivity()
            .then((entries) => setRecentActivity(selectRecentActivity(entries, user, RECENT_ACTIVITY_LIMIT)))
            .catch((err) => {
                console.error('Failed to load recent activity for dashboard:', err);
                setRecentActivityError(true);
            });

        getTravel()
            .then((travel) => {
                const count = travel.filter(
                    (item) =>
                        item.status !== TRAVEL_STATUS_OPTIONS.STATUS.COMPLETED &&
                        item.status !== TRAVEL_STATUS_OPTIONS.STATUS.CANCELLED,
                ).length;

                setStats((current) => ({ ...current, travelPending: count }));
            })
            .catch((err) => console.error('Failed to load travel for dashboard:', err));

        getPostAdoptionCases()
            .then((cases) => {
                const escalationsRequired = cases.filter(
                    (item) => item.escalationRequired === POST_ADOPTION_STATUS_OPTIONS.ESCALATION_REQUIRED.URGENT,
                ).length;

                setStats((current) => ({ ...current, escalationsRequired }));
            })
            .catch((err) => console.error('Failed to load post-adoption cases for dashboard:', err));

    }, []);

    return (

    <>

        <PageHeader
            title="Dashboard"
            subtitle="Overview of the IBKT system"
        />

        <MondayApiVersionBanner />


        <Grid
            container
            spacing={3}
        >

            <Grid size={{xs:12, md:4}}>

                <DashboardCard
                    title="Awaiting Passport"
                    value={stats.awaitingPassport}
                    loading={stats.awaitingPassport === null}
                    icon={<PetsIcon />}
                />

            </Grid>


            <Grid size={{xs:12, md:4}}>

                <DashboardCard
                    title="Pending Matching"
                    value={stats.pendingMatching}
                    loading={stats.pendingMatching === null}
                    icon={<AssignmentIcon />}
                />

            </Grid>



            <Grid size={{xs:12, md:4}}>

                <DashboardCard
                    title="Escalations Required"
                    value={stats.escalationsRequired}
                    loading={stats.escalationsRequired === null}
                    icon={<ReportProblemIcon />}
                />

            </Grid>



            <Grid size={{xs:12, md:4}}>

                <DashboardCard
                    title="Tasks Due Today"
                    value={stats.tasksDueToday}
                    loading={stats.tasksDueToday === null}
                    icon={<CheckCircleIcon />}
                />

            </Grid>



            <Grid size={{xs:12, md:4}}>

                <DashboardCard
                    title="Travel Pending"
                    value={stats.travelPending}
                    loading={stats.travelPending === null}
                    icon={<FlightTakeoffIcon />}
                />

            </Grid>



            <Grid size={{xs:12, md:4}}>

                <DashboardCard
                    title="My Open Cases"
                    value={stats.myOpenCases}
                    loading={stats.myOpenCases === null}
                    caption={stats.myOpenCasesBreakdown}
                    icon={<AssignmentIndIcon />}
                />

            </Grid>

        </Grid>

        <Grid
            container
            spacing={3}
            sx={{
                mt: 1
            }}
        >


            <Grid
                size={{ xs:12, md:4 }}
            >

                <RecentActivityPanel
                    entries={recentActivity}
                    error={recentActivityError}
                    canViewAll={canAccessPath('/activity', user)}
                />


            </Grid>



            <Grid
                size={{ xs:12, md:4 }}
            >

                <UpcomingTasksPanel
                    tasks={upcomingTasks}
                    days={upcomingDays}
                    error={upcomingError}
                    showOwner={user?.role === ROLES.ADMIN}
                />

            </Grid>




            <Grid
                size={{ xs:12, md:4 }}
            >

                <DashboardPanel
                    title="Quick Actions"
                >

                    <Stack
                        spacing={2}
                    >

                        <Button
                            variant="contained"
                            onClick={() => setAddCatOpen(true)}
                        >
                            Add Cat
                        </Button>


                        <Button
                            variant="contained"
                        >
                            Add Adopter
                        </Button>



                        <Button
                            variant="contained"
                        >
                            Create Active Application
                        </Button>



                        <Button
                            variant="contained"
                            onClick={() => setAddTaskOpen(true)}
                        >
                            Create Task
                        </Button>


                    </Stack>

                </DashboardPanel>

            </Grid>



        </Grid>

        <AddCatDialog
            open={addCatOpen}
            onClose={() => setAddCatOpen(false)}
        />

        <AddTaskDialog
            open={addTaskOpen}
            onClose={() => setAddTaskOpen(false)}
            onCreated={loadTasks}
        />

    </>

);

}

export default Dashboard;