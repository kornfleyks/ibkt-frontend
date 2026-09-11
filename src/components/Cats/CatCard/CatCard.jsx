import {
    Card,
    CardContent,
    Typography,
    Chip,
    Stack,
    Avatar,
    Box
} from '@mui/material';

import PetsIcon from '@mui/icons-material/PetsOutlined';
import { useNavigate } from 'react-router-dom';


function CatCard({ cat }) {

    const navigate = useNavigate();

    return (

        <Card

            onClick={() => navigate(`/cats/${cat.id}`)}

            sx={{

                cursor: 'pointer',

                transition: '.2s',

                '&:hover': {

                    transform: 'translateY(-2px)',

                    boxShadow: 4

                }

            }}

        >

            <CardContent>


                <Stack

                    direction="row"

                    spacing={2}

                >

                    <Avatar

                        sx={{

                            width: 56,

                            height: 56

                        }}

                    >

                        <PetsIcon />

                    </Avatar>



                    <Box flex={1}>


                        <Typography

                            variant="h6"

                            fontWeight={600}

                        >

                            {cat.name}

                        </Typography>



                        <Typography

                            variant="body2"

                            color="text.secondary"

                        >

                            {cat.gender} • {cat.age}y

                        </Typography>



                        <Typography

                            variant="body2"

                            color="text.secondary"

                        >

                            {cat.country}

                        </Typography>



                        <Chip

                            label={cat.status}

                            size="small"

                            sx={{

                                mt:1

                            }}

                        />




                        <Typography

                            sx={{

                                mt:1

                            }}

                            variant="body2"

                        >

                            Rescuer: {cat.rescuer}

                        </Typography>


                    </Box>



                </Stack>


            </CardContent>


        </Card>

    );

}

export default CatCard;