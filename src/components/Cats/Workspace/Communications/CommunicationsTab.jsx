import {useState} from 'react';

import {
Stack
} from '@mui/material';

import mockMessages from './mockMessages';

import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';



function CommunicationsTab() {


const [messages,setMessages]=useState(mockMessages);



const handleSend=(text)=>{


const newMessage={

id:Date.now(),

author:"Current User",

role:"Volunteer",

message:text,

createdAt:new Date()

};



setMessages(prev=>[
...prev,
newMessage
]);


};



return(


<Stack spacing={2}>


{messages.map(message=>(

<MessageBubble

key={message.id}

message={message}

/>

))}



<MessageComposer

onSend={handleSend}

/>


</Stack>



);


}


export default CommunicationsTab;