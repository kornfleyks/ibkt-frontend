import { useEffect, useState } from 'react';

import Grid from '@mui/material/Grid';
import PetsIcon from '@mui/icons-material/PetsOutlined';
import AssignmentIcon from '@mui/icons-material/AssignmentOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoffOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined';
import ReportProblemIcon from '@mui/icons-material/ReportProblemOutlined';
import DashboardPanel from '../components/DashboardPanel';
import PageHeader from '../components/PageHeader';

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import DashboardCard from '../components/DashboardCard';
import AddCatDialog from '../components/Cats/AddCatDialog/AddCatDialog';

import { getCats } from '../services/CatsService';
import { getActiveApplications } from '../services/ActiveApplicationsService';
import { getTasks } from '../services/TasksService';
import { getTravel } from '../services/TravelService';
import { getPostAdoptionCases } from '../services/PostAdoptionService';

import { CATS_STATUS_OPTIONS } from '../constants/statuses/catsStatuses';
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from '../constants/statuses/activeApplicationsStatuses';
import { TASKS_STATUS_OPTIONS } from '../constants/statuses/tasksStatuses';
import { TRAVEL_STATUS_OPTIONS } from '../constants/statuses/travelStatuses';
import { POST_ADOPTION_STATUS_OPTIONS } from '../constants/statuses/postAdoptionStatuses';

const { ADOPTION_STAGE } = ACTIVE_APPLICATIONS_STATUS_OPTIONS;

function todayDateString() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${now.getFullYear()}-${month}-${day}`;
}

function Dashboard() {

    const [addCatOpen, setAddCatOpen] = useState(false);

    const [stats, setStats] = useState({
        awaitingPassport: null,
        pendingMatching: null,
        tasksDueToday: null,
        travelPending: null,
        postAdoptionConcerns: null,
        escalationsRequired: null,
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

        getActiveApplications()
            .then((applications) => {
                const pendingMatching = applications.filter(
                    (application) =>
                        application.adoptionStage === ADOPTION_STAGE.APPROVED_APPLICATION &&
                        !application.linkedCatId,
                ).length;

                setStats((current) => ({ ...current, pendingMatching }));
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
                const postAdoptionConcerns = cases.filter(
                    (item) => item.status === POST_ADOPTION_STATUS_OPTIONS.POST_ADOPTION_STATUS.CONCERN,
                ).length;

                const escalationsRequired = cases.filter(
                    (item) => item.escalationRequired === POST_ADOPTION_STATUS_OPTIONS.ESCALATION_REQUIRED.URGENT,
                ).length;

                setStats((current) => ({ ...current, postAdoptionConcerns, escalationsRequired }));
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
                    title="Post Adoption Concerns"
                    value={stats.postAdoptionConcerns}
                    loading={stats.postAdoptionConcerns === null}
                    icon={<WarningAmberIcon />}
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

    </>

);

}

export default Dashboard;