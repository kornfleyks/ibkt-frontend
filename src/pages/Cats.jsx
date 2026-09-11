import { useEffect, useState } from 'react';

import {
    Button
} from '@mui/material';

import AddIcon from '@mui/icons-material/AddOutlined';

import PageHeader from '../components/PageHeader';

import CatsGrid from '../components/Cats/CatsGrid';
import AddCatDialog from '../components/Cats/AddCatDialog/AddCatDialog';

import { getCats } from '../services/CatsService';

import { useLoading } from '../context/LoadingContext';


function Cats() {

    const [cats, setCats] = useState([]);
    const [addCatOpen, setAddCatOpen] = useState(false);

    const {
        showLoading,
        hideLoading
    } = useLoading();

    async function loadCats() {

        showLoading('Loading cats...');

        try {

            const data = await getCats();

            setCats(data);

        }

        finally {

            hideLoading();

        }

    }



    useEffect(() => {

        loadCats();

    }, []);







    return (

        <>

        <PageHeader

            title="Cats"

            subtitle="Manage rescue cats"


            actions={

                <Button

                    variant="contained"

                    startIcon={<AddIcon />}

                    onClick={() => setAddCatOpen(true)}

                    sx={{

                        minWidth: 140

                    }}

                >

                    Add Cat

                </Button>

            }

        />




            <CatsGrid

                cats={cats}

            />

            <AddCatDialog

                open={addCatOpen}

                onClose={() => setAddCatOpen(false)}

                onCreated={loadCats}

            />

        </>

    );

}


export default Cats;