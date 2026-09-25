import { useEffect, useState } from 'react';

import {
    Stack,
    CircularProgress,
    Alert
} from '@mui/material';

import MessageBubble from './MessageBubble';
import MessageComposer from './MessageComposer';
import {
    getCommunications,
    createCommunication,
    getMentionableUsers,
} from '../../services/CommunicationsService';

// The Communications thread of one item on any board listed in
// constants/communicationBoards.js (Cats today).
function CommunicationsTab({ boardId, itemId }) {

    const [messages, setMessages] = useState([]);
    const [mentionableUsers, setMentionableUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {

        let cancelled = false;

        async function loadMessages() {

            setLoading(true);
            setError(null);

            try {

                const data = await getCommunications(itemId);

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

    }, [itemId]);

    // Without the list you can still write, just not @mention anyone.
    useEffect(() => {
        getMentionableUsers()
            .then(setMentionableUsers)
            .catch((err) => console.error('Failed to load mentionable users:', err));
    }, []);

    async function handleSend(text) {

        setSending(true);
        setError(null);

        try {

            const newMessage = await createCommunication(boardId, itemId, text);

            setMessages((current) => [...current, newMessage]);
            return true;

        } catch (err) {

            console.error('Failed to send message:', err);
            setError(err?.message || 'Failed to send message.');
            return false;

        } finally {

            setSending(false);

        }

    }

    if (loading) {

        return (
            <Stack sx={{ alignItems: 'center', py: 4 }}>
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

                mentionableUsers={mentionableUsers}

            />

        </Stack>

    );

}


export default CommunicationsTab;
