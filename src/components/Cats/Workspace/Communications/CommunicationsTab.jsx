import { useEffect, useState } from 'react';

import {
    Stack,
    CircularProgress,
    Alert
} from '@mui/material';

import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import {
    getCatCommunications,
    createCatCommunication,
    formatCommunicationBody,
} from '../../../../services/CommunicationsService';
import useAuth from '../../../../hooks/useAuth';



function CommunicationsTab({ cat }) {

    const { user } = useAuth();

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {

        let cancelled = false;

        async function loadMessages() {

            setLoading(true);
            setError(null);

            try {

                const data = await getCatCommunications(cat.id);

                if (!cancelled) {
                    setMessages(data);
                }

            } catch (err) {

                console.error('Failed to load communications:', err);

                if (!cancelled) {
                    setError('Failed to load messages.');
                }

            } finally {

                if (!cancelled) {
                    setLoading(false);
                }

            }

        }

        loadMessages();

        return () => {
            cancelled = true;
        };

    }, [cat.id]);

    async function handleSend(text) {

        setSending(true);
        setError(null);

        try {

            const body = formatCommunicationBody(user, text);
            const newMessage = await createCatCommunication(cat.id, body);

            setMessages((current) => [...current, newMessage]);

        } catch (err) {

            console.error('Failed to send message:', err);
            setError('Failed to send message.');

        } finally {

            setSending(false);

        }

    }

    if (loading) {

        return (
            <Stack alignItems="center" sx={{ py: 4 }}>
                <CircularProgress size={28} sx={{ color: 'text.secondary' }} />
            </Stack>
        );

    }

    return(

        <Stack spacing={2}>

            {messages.map(message=>(

                <MessageBubble

                    key={message.id}

                    message={message}

                />

            ))}

            {error && (
                <Alert severity="error" sx={{ fontSize: '0.8125rem' }}>
                    {error}
                </Alert>
            )}

            <MessageComposer

                onSend={handleSend}

                disabled={sending}

            />

        </Stack>

    );

}


export default CommunicationsTab;
