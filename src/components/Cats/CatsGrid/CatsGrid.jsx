import Grid from '@mui/material/Grid';

import CatCard from '../CatCard';


function CatsGrid({ cats }) {

    return (

        <Grid
            container
            spacing={3}
        >

            {

                cats.map(cat => (

                    <Grid

                        key={cat.id}

                        size={{
                            xs: 12,
                            md: 6,
                            lg: 4
                        }}

                    >

                        <CatCard
                            cat={cat}
                        />

                    </Grid>

                ))

            }

        </Grid>

    );

}


export default CatsGrid;