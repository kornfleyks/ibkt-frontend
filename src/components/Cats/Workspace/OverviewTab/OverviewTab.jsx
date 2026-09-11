import {
    Grid,
} from '@mui/material';
import InfoRow from '../../../Common/InfoRow';
import SectionCard from '../../../Common/SectionCard';



function OverviewTab({ cat }) {

    return (

        <Grid
            container
            spacing={3}
        >
            <Grid
                size={{
                    xs:12,
                    md:6
                }}
            >
                <SectionCard title="Basic Information">
                        <InfoRow
                            label="Name"
                            value={cat.name}
                        />

                        <InfoRow
                            label="Gender"
                            value={cat.gender}
                        />

                        <InfoRow
                            label="Age"
                            value={`${cat.age} years`}
                        />

                        <InfoRow
                            label="Breed"
                            value={cat.breed}
                        />

                        <InfoRow
                            label="Colour"
                            value={cat.colour}
                        />
                </SectionCard>
            </Grid>
            <Grid
                size={{
                    xs:12,
                    md:6
                }}
            >
                <SectionCard title="Rescue Information">
                        <InfoRow
                            label="Rescuer"
                            value={cat.rescuer}
                        />

                        <InfoRow
                            label="Status"
                            value={cat.status}
                        />

                        <InfoRow
                            label="Foster"
                            value={cat.foster}
                        />

                </SectionCard>
            </Grid>
        </Grid>
    );
}


export default OverviewTab;