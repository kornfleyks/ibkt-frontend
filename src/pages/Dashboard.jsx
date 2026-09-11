import Grid from '@mui/material/Grid';
import PetsIcon from '@mui/icons-material/PetsOutlined';
import AssignmentIcon from '@mui/icons-material/AssignmentOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutlined';
import PersonIcon from '@mui/icons-material/PersonOutlined';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoffOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmberOutlined';
import DashboardPanel from '../components/DashboardPanel';
import PageHeader from '../components/PageHeader';

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';

import DashboardCard from '../components/DashboardCard';

function Dashboard() {

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
                    value={14}
                    icon={<PetsIcon />}
                />

            </Grid>


            <Grid size={{xs:12, md:4}}>

                <DashboardCard
                    title="Pending Matching"
                    value={8}
                    icon={<AssignmentIcon />}
                />

            </Grid>



            <Grid size={{xs:12, md:4}}>

                <DashboardCard
                    title="Tasks Due Today"
                    value={3}
                    icon={<CheckCircleIcon />}
                />

            </Grid>



            <Grid size={{xs:12, md:4}}>

                <DashboardCard
                    title="Rescuers Need Update"
                    value={5}
                    icon={<PersonIcon />}
                />

            </Grid>



            <Grid size={{xs:12, md:4}}>

                <DashboardCard
                    title="Travel Pending"
                    value={4}
                    icon={<FlightTakeoffIcon />}
                />

            </Grid>



            <Grid size={{xs:12, md:4}}>

                <DashboardCard
                    title="Post Adoption Concerns"
                    value={2}
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


    </>

);

}

export default Dashboard;