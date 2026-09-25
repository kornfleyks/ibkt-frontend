import {
    Card,
    CardContent,
    Avatar,
    Stack,
    Typography,
    Link,
    Box
} from '@mui/material';

import useAuth from '../../hooks/useAuth';
import { splitMentions } from '../../utils/mentions';

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


// Mention tokens (utils/mentions.js) render as "@Name", stronger when it's
// the signed-in user; the text around them is linkified as before.
function renderMessage(text, currentUserId) {
    return splitMentions(text).map((part, index) =>
        part.type === 'mention' ? (
            <Box
                key={index}
                component="span"
                sx={{
                    fontWeight: 600,
                    color: 'info.main',
                    ...(String(part.id) === String(currentUserId) && {
                        bgcolor: 'action.selected',
                        borderRadius: 0.5,
                        px: 0.5,
                    }),
                }}
            >
                @{part.name}
            </Box>
        ) : (
            <span key={index}>{linkifyText(part.value)}</span>
        )
    );
}


function MessageBubble({message}) {

    const { user } = useAuth();


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

{renderMessage(message.message, user?.id)}

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