import {
    Card,
    CardContent,
    Avatar,
    Stack,
    Typography,
    Box
} from '@mui/material';


function MessageBubble({message}) {


    return (

<Card sx={{mb:2}}>

<CardContent>

<Stack spacing={1}>


<Stack
direction="row"
spacing={2}
alignItems="center"
>


<Avatar>

{message.author[0]}

</Avatar>


<Box>

<Typography fontWeight={600}>

{message.author}

</Typography>


<Typography
variant="caption"
color="text.secondary"
>

{message.role}

</Typography>


</Box>

</Stack>



<Typography>

{message.message}

</Typography>



<Typography
variant="caption"
color="text.secondary"
>

{new Date(message.createdAt).toLocaleString()}

</Typography>


</Stack>

</CardContent>

</Card>

    )

}


export default MessageBubble;