import { useEffect, useState } from 'react';

import Grid from '@mui/material/Grid';
import PetsIcon from '@mui/icons-material/PetsOutlined';
import AssignmentIcon from '@mui/icons-material/AssignmentOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoffOutlined';
import ReportProblemIcon from '@mui/icons-material/ReportProblemOutlined';
import AssignmentIndIcon from '@mui/icons-material/AssignmentIndOutlined';
import DashboardPanel from '../components/DashboardPanel';
import PageHeader from '../components/PageHeader';

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import DashboardCard from '../components/DashboardCard';
import AddCatDialog from '../components/Cats/AddCatDialog/AddCatDialog';
import AddTaskDialog from '../components/Cats/Workspace/Tasks/AddTaskDialog';

import { getCats } from '../services/CatsService';
import { getActiveApplications } from '../services/ActiveApplicationsService';
import { getMatchingStages, getMyCasesOpenStages } from '../services/AppSettingsService';
import useAuth from '../hooks/useAuth';
import { getTasks } from '../services/TasksService';
import { getTravel } from '../services/TravelService';
import { getPostAdoptionCases } from '../services/PostAdoptionService';

import { CATS_STATUS_OPTIONS } from '../constants/statuses/catsStatuses';
import { TASKS_STATUS_OPTIONS } from '../constants/statuses/tasksStatuses';
import { TRAVEL_STATUS_OPTIONS } from '../constants/statuses/travelStatuses';
import { POST_ADOPTION_STATUS_OPTIONS } from '../constants/statuses/postAdoptionStatuses';

function todayDateString() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${now.getFullYear()}-${month}-${day}`;
}

function Dashboard() {

    const [addCatOpen, setAddCatOpen] = useState(false);
    const [addTaskOpen, setAddTaskOpen] = useState(false);
    const { user } = useAuth();

    const [stats, setStats] = useState({
        awaitingPassport: null,
        pendingMatching: null,
        tasksDueToday: null,
        travelPending: null,
        escalationsRequired: null,
        myOpenCases: null,
        myOpenCasesBreakdown: '',
    });

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

        getTasks()
            .then((tasks) => {
                const today = todayDateString();

                const count = tasks.filter(
                    (task) =>
                        task.dueDate === today &&
                        task.status !== TASKS_STATUS_OPTIONS.STATUS.COMPLETED &&
                        task.status !== TASKS_STATUS_OPTIONS.STATUS.CANCELLED,
                ).length;

                setStats((current) => ({ ...current, tasksDueToday: count }));
            })
            .catch((err) => console.error('Failed to load tasks for dashboard:', err));

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

                <DashboardPanel
                    title="Recent Activity"
                >

                    <List>

                        <ListItem>
                            <ListItemText
                                primary="Luna passport uploaded"
                            />
                        </ListItem>


                        <ListItem>
                            <ListItemText
                                primary="John approved"
                            />
                        </ListItem>


                        <ListItem>
                            <ListItemText
                                primary="Travel created"
                            />
                        </ListItem>


                    </List>

                </DashboardPanel>


            </Grid>



            <Grid
                size={{ xs:12, md:4 }}
            >

                <DashboardPanel
                    title="Upcoming Tasks"
                >

                    <List>

                        <ListItem>
                            <ListItemText
                                primary="Review references"
                            />
                        </ListItem>


                        <ListItem>
                            <ListItemText
                                primary="Contact rescuer"
                            />
                        </ListItem>


                        <ListItem>
                            <ListItemText
                                primary="Create travel"
                            />
                        </ListItem>


                    </List>

                </DashboardPanel>

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
        />

    </>

);

}

export default Dashboard;