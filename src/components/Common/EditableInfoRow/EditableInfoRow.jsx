import { useState } from 'react';
import { Box, IconButton, Stack, Typography, CircularProgress } from '@mui/material';
import { EditIcon, CheckIcon, CloseIcon } from '../../icons';
import InfoRow from '../InfoRow';

// Shared scaffold for a single editable "label: value" row - hover-to-reveal
// edit pencil, inline editor, Check/Close to save or cancel. The actual
// input control is left to the caller since it differs per field (plain
// text, select, autocomplete).
function EditableInfoRow({ label, displayValue, getEditValue, onSave, renderEditor, renderDisplay }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    function startEditing() {
        setValue(getEditValue());
        setError(null);
        setEditing(true);
    }

    async function handleSave() {
        setSaving(true);
        setError(null);

        try {
            await onSave(value);
            setEditing(false);
        } catch (err) {
            console.error(`Failed to update ${label}:`, err);
            // Server-side rule failures (e.g. 403) carry a readable message.
            setError(err?.message || 'Failed to save.');
        } finally {
            setSaving(false);
        }
    }

    if (!editing) {
        return (
            <Stack
                direction="row"
                spacing={1.5}
                sx={{
                    alignItems: 'center',
                    '&:hover .row-edit-button, &:focus-within .row-edit-button': {
                        opacity: 1,
                    },
                }}
            >
                {renderDisplay ? renderDisplay() : <InfoRow label={label} value={displayValue} />}

                <IconButton
                    size="small"
                    onClick={startEditing}
                    aria-label={`Edit ${label}`}
                    className="row-edit-button"
                    sx={{ opacity: 0, transition: 'opacity 0.15s' }}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            </Stack>
        );
    }

    // On narrow screens the label wraps onto its own line; the editor and
    // its Save/Cancel buttons always stay together, with the editor
    // shrinking so the buttons never get pushed out of view.
    return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 1, py: 0.5 }}>
            <Typography sx={{ minWidth: 120, flexShrink: 0, fontWeight: 600, color: 'text.secondary' }}>
                {label}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: '1 1 240px', minWidth: 0 }}>
                <Box sx={{ display: 'flex', flex: 1, minWidth: 0 }}>
                    {renderEditor(value, setValue, saving)}
                </Box>

                <IconButton size="small" onClick={handleSave} disabled={saving} aria-label={`Save ${label}`} sx={{ flexShrink: 0 }}>
                    {saving ? <CircularProgress size={16} sx={{ color: 'text.secondary' }} /> : <CheckIcon fontSize="small" />}
                </IconButton>

                <IconButton size="small" onClick={() => setEditing(false)} disabled={saving} aria-label="Cancel" sx={{ flexShrink: 0 }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Box>

            {error && (
                <Typography variant="caption" color="error" sx={{ flexBasis: '100%' }}>
                    {error}
                </Typography>
            )}
        </Box>
    );
}

export default EditableInfoRow;
