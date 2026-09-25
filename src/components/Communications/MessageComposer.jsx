import { useRef, useState } from 'react';

import {
    Stack,
    TextField,
    Button,
    Paper,
    Popper,
    List,
    ListItemButton,
    ListItemText,
    ClickAwayListener,
} from '@mui/material';

import useAuth from '../../hooks/useAuth';
import { mentionToken } from '../../utils/mentions';

const MAX_SUGGESTIONS = 6;

// The "@..." being typed right before the caret, or null. Names contain
// spaces, so the query runs from the "@" up to the caret.
function findMentionQuery(value, caret) {
    const match = /(?:^|\s)@([^@\n]{0,30})$/.exec(value.slice(0, caret));

    return match ? { start: caret - match[1].length - 1, text: match[1] } : null;
}

// Picked mentions show as plain "@Name" while typing and become id tokens
// on send; one whose "@Name" was deleted from the text is simply dropped.
function toMessageText(text, mentions) {
    return [...mentions]
        .sort((a, b) => b.name.length - a.name.length)
        .reduce((result, mention) => result.split(`@${mention.name}`).join(mentionToken(mention.name, mention.id)), text);
}

function MessageComposer({ onSend, disabled = false, mentionableUsers = [] }) {
    const { user } = useAuth();
    const [text, setText] = useState('');
    const [mentions, setMentions] = useState([]);
    const [query, setQuery] = useState(null);
    const [highlight, setHighlight] = useState(0);
    const inputRef = useRef(null);
    const [anchorEl, setAnchorEl] = useState(null);

    const suggestions = query
        ? mentionableUsers
              .filter((candidate) => String(candidate.id) !== String(user?.id))
              .filter((candidate) => candidate.name.toLowerCase().includes(query.text.toLowerCase()))
              .slice(0, MAX_SUGGESTIONS)
        : [];
    const open = suggestions.length > 0;

    function handleChange(event) {
        const { value, selectionStart } = event.target;

        setText(value);
        setQuery(findMentionQuery(value, selectionStart ?? value.length));
        setHighlight(0);
    }

    function selectMention(candidate) {
        const caret = inputRef.current?.selectionStart ?? text.length;
        const inserted = `@${candidate.name} `;
        const next = text.slice(0, query.start) + inserted + text.slice(caret);
        const nextCaret = query.start + inserted.length;

        setText(next);
        setMentions((current) =>
            current.some((mention) => mention.id === candidate.id) ? current : [...current, { id: candidate.id, name: candidate.name }],
        );
        setQuery(null);

        requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.setSelectionRange(nextCaret, nextCaret);
        });
    }

    function handleKeyDown(event) {
        if (!open) {
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setHighlight((index) => (index + 1) % suggestions.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlight((index) => (index - 1 + suggestions.length) % suggestions.length);
        } else if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            selectMention(suggestions[highlight]);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            setQuery(null);
        }
    }

    async function handleSend() {
        if (!text.trim()) {
            return;
        }

        // Keep the draft if sending failed, so nothing typed is lost.
        const sent = await onSend(toMessageText(text, mentions));

        if (sent !== false) {
            setText('');
            setMentions([]);
            setQuery(null);
        }
    }

    return (
        <Stack spacing={2}>
            <ClickAwayListener onClickAway={() => setQuery(null)}>
                <div ref={setAnchorEl}>
                    <TextField
                        multiline
                        fullWidth
                        minRows={3}
                        value={text}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        inputRef={inputRef}
                        placeholder="Write internal note... Type @ to mention someone."
                        disabled={disabled}
                    />

                    <Popper
                        open={open}
                        anchorEl={anchorEl}
                        placement="bottom-start"
                        // Inside the click-away area, so picking isn't a click away.
                        disablePortal
                        sx={{ zIndex: (theme) => theme.zIndex.modal }}
                    >
                        <Paper elevation={4} sx={{ mt: 0.5, minWidth: 240 }}>
                            <List dense disablePadding aria-label="People you can mention">
                                {suggestions.map((candidate, index) => (
                                    <ListItemButton
                                        key={candidate.id}
                                        selected={index === highlight}
                                        // Keep focus in the text field while picking.
                                        onMouseDown={(event) => event.preventDefault()}
                                        onClick={() => selectMention(candidate)}
                                    >
                                        <ListItemText primary={candidate.name} secondary={candidate.role} />
                                    </ListItemButton>
                                ))}
                            </List>
                        </Paper>
                    </Popper>
                </div>
            </ClickAwayListener>

            <Button
                variant="contained"
                onClick={handleSend}
                disabled={disabled}
                sx={{ alignSelf: 'flex-start' }}
            >
                {disabled ? 'Sending...' : 'Send'}
            </Button>
        </Stack>
    );
}

export default MessageComposer;
