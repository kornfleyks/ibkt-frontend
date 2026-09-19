import { useState } from 'react';

import {
    Stack,
    TextField,
    Button
} from '@mui/material';



function MessageComposer({ onSend, disabled = false }) {


const [text,setText]=useState('');



const handleSend=()=>{


if(!text.trim())
return;



onSend(text);

setText('');

};



return(


<Stack
spacing={2}
>


<TextField

multiline
minRows={3}

value={text}

onChange={(e)=>setText(e.target.value)}

placeholder="Write internal note..."

disabled={disabled}

/>



<Button

variant="contained"

onClick={handleSend}

disabled={disabled}

sx={{ alignSelf: 'flex-start' }}

>

{disabled ? 'Sending...' : 'Send'}


</Button>



</Stack>


)


}


export default MessageComposer;
