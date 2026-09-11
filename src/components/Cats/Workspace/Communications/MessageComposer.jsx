import {useState} from 'react';

import {
Stack,
TextField,
Button
} from '@mui/material';



function MessageComposer({onSend}) {


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


/>



<Button

variant="contained"

onClick={handleSend}

>

Send


</Button>



</Stack>


)


}


export default MessageComposer;