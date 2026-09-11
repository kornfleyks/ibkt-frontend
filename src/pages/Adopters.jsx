import PageHeader from '../components/PageHeader';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/AddOutlined';

function Adopters() {
    return (
        <PageHeader

    title="Adopters"

    subtitle="Manage adopters"


    actions={

        <Button
            variant="contained"

            startIcon={<AddIcon />}

            sx={{

                minWidth: 140

            }}
        >

            Add Adopter

        </Button>

    }

/>
    );
}

export default Adopters;