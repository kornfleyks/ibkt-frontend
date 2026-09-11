import PageHeader from '../components/PageHeader';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/AddOutlined';

function Tasks() {
    return (
        <PageHeader

    title="Tasks"

    subtitle="Manage tasks"


    actions={

        <Button
            variant="contained"

            startIcon={<AddIcon />}

            sx={{

                minWidth: 140

            }}
        >

            Add Task

        </Button>

    }

/>
    );
}

export default Tasks;