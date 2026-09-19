import {
    Card,
    CardContent,
    Avatar,
    Stack,
    Typography,
    Link,
    Box
} from '@mui/material';

const URL_PATTERN = /(https?:\/\/[^\s]+)/g;

// String.split with a capturing group interleaves the matched groups
// between the surrounding text, so odd indices are always URLs here.
function linkifyText(text) {
    return text.split(URL_PATTERN).map((part, index) =>
        index % 2 === 1 ? (
            <Link
                key={index}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ wordBreak: 'break-all', color: 'info.main' }}
            >
                {part}
            </Link>
        ) : (
            part
        )
    );
}


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



<Typography sx={{ whiteSpace: 'pre-wrap' }}>

{linkifyText(message.message)}

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