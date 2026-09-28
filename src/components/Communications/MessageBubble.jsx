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
import useDateFormat from '../../hooks/useDateFormat';
import { splitMentions } from '../../utils/mentions';
import MentionLink from './MentionLink';

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


// Mention tokens (utils/mentions.js) render as clickable "@Name" (opens a
// profile card); the text around them is linkified as before.
function renderMessage(text, currentUserId) {
    return splitMentions(text).map((part, index) =>
        part.type === 'mention' ? (
            <MentionLink
                key={index}
                userId={part.id}
                name={part.name}
                isSelf={String(part.id) === String(currentUserId)}
            />
        ) : (
            <span key={index}>{linkifyText(part.value)}</span>
        )
    );
}


function MessageBubble({message}) {

    const { user } = useAuth();
    const { formatDateTime } = useDateFormat();


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

{formatDateTime(new Date(message.createdAt))}

</Typography>


</Stack>

</CardContent>

</Card>

    )

}


export default MessageBubble;