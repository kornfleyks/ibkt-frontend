import { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Stack,
    Box,
    CircularProgress,
    Alert,
    TextField,
    Typography,
    Divider,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    Checkbox,
    FormGroup,
    FormControlLabel,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import CheckIcon from '@mui/icons-material/CheckOutlined';
import CloseIcon from '@mui/icons-material/CloseOutlined';
import AddIcon from '@mui/icons-material/AddOutlined';
import PageHeader from '../../components/PageHeader';
import {
    getSettings,
    saveSetting,
    withDefinedSettings,
    createSetting,
    parseListSetting,
    formatListSetting,
    SETTING_DEFINITIONS,
} from '../../services/AppSettingsService';

// A generic "Label: value" editable row, unlike the shared EditableInfoRow,
// keeps the exact same inline shape ("Name: [field]") in both display and
// edit mode - EditableInfoRow's edit mode uses a separate fixed-width label
// column, which visually jumped when switching modes here.
function SettingRow({ setting, onSave }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(setting.value);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    function startEditing() {
        setValue(setting.value);
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
            console.error(`Failed to update ${setting.name}:`, err);
            setError('Failed to save.');
        } finally {
            setSaving(false);
        }
    }

    if (editing) {
        return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                <Box component="span" sx={{ fontWeight: 600 }}>
                    {setting.name}:
                </Box>

                <TextField
                    size="small"
                    sx={{ width: 160 }}
                    disabled={saving}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                />

                <IconButton size="small" onClick={handleSave} disabled={saving} aria-label={`Save ${setting.name}`}>
                    {saving ? <CircularProgress size={16} sx={{ color: 'text.secondary' }} /> : <CheckIcon fontSize="small" />}
                </IconButton>

                <IconButton size="small" onClick={() => setEditing(false)} disabled={saving} aria-label="Cancel">
                    <CloseIcon fontSize="small" />
                </IconButton>

                {error && (
                    <Typography variant="caption" color="error">
                        {error}
                    </Typography>
                )}
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                py: 0.5,
                '&:hover .row-edit-button, &:focus-within .row-edit-button': {
                    opacity: 1,
                },
            }}
        >
            <Box component="span">
                <Box component="span" sx={{ fontWeight: 600 }}>
                    {setting.name}:
                </Box>{' '}
                <Box component="span" sx={{ color: 'text.secondary' }}>
                    {setting.value}
                </Box>
            </Box>

            <IconButton
                size="small"
                onClick={startEditing}
                aria-label={`Edit ${setting.name}`}
                className="row-edit-button"
                sx={{ opacity: 0, transition: 'opacity 0.15s' }}
            >
                <EditIcon fontSize="small" />
            </IconButton>
        </Box>
    );
}

// Defined list settings (a comma-separated list chosen from a fixed set of
// labels) are edited as checkboxes so a typo can't silently drop an entry.
// Every other setting keeps the plain-text SettingRow.
function getListOptions(key) {
    return SETTING_DEFINITIONS[key]?.options ?? null;
}

function ListSettingRow({ setting, options, onSave }) {
    const [editing, setEditing] = useState(false);
    const [selected, setSelected] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const current = parseListSetting(setting.value);

    function startEditing() {
        setSelected(current.filter((entry) => options.includes(entry)));
        setError(null);
        setEditing(true);
    }

    function toggle(option) {
        setSelected((values) =>
            values.includes(option) ? values.filter((value) => value !== option) : [...values, option],
        );
    }

    async function handleSave() {
        if (selected.length === 0) {
            setError('Select at least one.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // Saved in the options' own order so the stored value is stable.
            await onSave(formatListSetting(options.filter((option) => selected.includes(option))));
            setEditing(false);
        } catch (err) {
            console.error(`Failed to update ${setting.name}:`, err);
            setError('Failed to save.');
        } finally {
            setSaving(false);
        }
    }

    if (editing) {
        return (
            <Box sx={{ py: 0.5 }}>
                <Box component="span" sx={{ fontWeight: 600 }}>
                    {setting.name}:
                </Box>

                <FormGroup row sx={{ mt: 0.5 }}>
                    {options.map((option) => (
                        <FormControlLabel
                            key={option}
                            label={option}
                            disabled={saving}
                            control={
                                <Checkbox
                                    size="small"
                                    checked={selected.includes(option)}
                                    onChange={() => toggle(option)}
                                />
                            }
                        />
                    ))}
                </FormGroup>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton size="small" onClick={handleSave} disabled={saving} aria-label={`Save ${setting.name}`}>
                        {saving ? <CircularProgress size={16} sx={{ color: 'text.secondary' }} /> : <CheckIcon fontSize="small" />}
                    </IconButton>

                    <IconButton size="small" onClick={() => setEditing(false)} disabled={saving} aria-label="Cancel">
                        <CloseIcon fontSize="small" />
                    </IconButton>

                    {error && (
                        <Typography variant="caption" color="error">
                            {error}
                        </Typography>
                    )}
                </Box>
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
                py: 0.5,
                '&:hover .row-edit-button, &:focus-within .row-edit-button': {
                    opacity: 1,
                },
            }}
        >
            <Box component="span" sx={{ fontWeight: 600 }}>
                {setting.name}:
            </Box>

            {current.map((entry) => (
                <Chip
                    key={entry}
                    size="small"
                    label={entry}
                    color={options.includes(entry) ? 'default' : 'warning'}
                    title={options.includes(entry) ? undefined : 'Unknown value - ignored by the app'}
                />
            ))}

            <IconButton
                size="small"
                onClick={startEditing}
                aria-label={`Edit ${setting.name}`}
                className="row-edit-button"
                sx={{ opacity: 0, transition: 'opacity 0.15s' }}
            >
                <EditIcon fontSize="small" />
            </IconButton>
        </Box>
    );
}

function suggestKeyFromName(name) {
    return name
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

const initialNewSetting = { name: '', key: '', value: '', description: '' };

function AddSettingDialog({ open, onClose, onCreated }) {
    const [form, setForm] = useState(initialNewSetting);
    const [keyEdited, setKeyEdited] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    function setField(field, value) {
        setForm((current) => ({ ...current, [field]: value }));
    }

    function handleNameChange(value) {
        setField('name', value);

        if (!keyEdited) {
            setField('key', suggestKeyFromName(value));
        }
    }

    function handleClose() {
        if (saving) {
            return;
        }

        setForm(initialNewSetting);
        setKeyEdited(false);
        setError(null);
        onClose();
    }

    async function handleSubmit() {
        if (!form.name.trim() || !form.key.trim() || !form.value.trim()) {
            setError('Name, Setting Key, and Value are all required.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await createSetting(form);
            onCreated();
            handleClose();
        } catch (err) {
            console.error('Failed to create setting:', err);
            setError('Something went wrong while saving this setting. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add Setting</DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2}>
                    <TextField
                        fullWidth
                        required
                        size="small"
                        label="Name"
                        helperText="Human-readable label shown on this page."
                        value={form.name}
                        onChange={(event) => handleNameChange(event.target.value)}
                    />

                    <TextField
                        fullWidth
                        required
                        size="small"
                        label="Setting Key"
                        helperText="Machine key the app looks this setting up by - only change if you know what reads it."
                        value={form.key}
                        onChange={(event) => {
                            setKeyEdited(true);
                            setField('key', event.target.value);
                        }}
                    />

                    <TextField
                        fullWidth
                        required
                        size="small"
                        label="Value"
                        disabled={saving}
                        value={form.value}
                        onChange={(event) => setField('value', event.target.value)}
                    />

                    <TextField
                        fullWidth
                        size="small"
                        multiline
                        minRows={2}
                        label="Description"
                        disabled={saving}
                        value={form.description}
                        onChange={(event) => setField('description', event.target.value)}
                    />

                    {error && <Alert severity="error">{error}</Alert>}
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button size="small" onClick={handleClose} disabled={saving}>
                    Cancel
                </Button>

                <Button size="small" variant="contained" onClick={handleSubmit} disabled={saving}>
                    {saving ? 'Saving...' : 'Add Setting'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function AppSettings() {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [addOpen, setAddOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadSettings() {
            setLoading(true);
            setError(null);

            try {
                const data = await getSettings();

                if (!cancelled) {
                    setSettings(withDefinedSettings(data));
                }
            } catch (err) {
                console.error('Failed to load settings:', err);

                if (!cancelled) {
                    setError('Failed to load settings.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadSettings();

        return () => {
            cancelled = true;
        };
    }, []);

    function handleSettingUpdate(settingId, updates) {
        setSettings((current) =>
            current.map((setting) => (setting.id === settingId ? { ...setting, ...updates } : setting)),
        );
    }

    // A placeholder setting (no board row yet) is created on save, so the
    // list is re-fetched to pick up its real item id.
    async function handleSave(setting, value) {
        await saveSetting(setting, value);

        if (setting.id) {
            handleSettingUpdate(setting.id, { value });
        } else {
            await refreshSettings();
        }
    }

    // Reused after a new setting is created via AddSettingDialog - simpler
    // than the mount-time loader above since there's no unmount race to
    // guard against for a one-off, user-triggered refresh.
    async function refreshSettings() {
        try {
            setSettings(withDefinedSettings(await getSettings()));
        } catch (err) {
            console.error('Failed to refresh settings:', err);
        }
    }

    return (
        <>
            <PageHeader
                title="App Settings"
                subtitle="App-wide configuration"
                actions={
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
                        Add Setting
                    </Button>
                }
            />

            <AddSettingDialog
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onCreated={refreshSettings}
            />

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Stack alignItems="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} sx={{ color: 'text.secondary' }} />
                </Stack>
            ) : (
                <Card>
                    <CardContent>
                        <Stack spacing={2} divider={<Divider />}>
                            {settings.length === 0 ? (
                                <Typography color="text.secondary">No settings found.</Typography>
                            ) : (
                                settings.map((setting) => (
                                    <Stack key={setting.id ?? setting.key} spacing={0.5}>
                                        {getListOptions(setting.key) ? (
                                            <ListSettingRow
                                                setting={setting}
                                                options={getListOptions(setting.key)}
                                                onSave={(value) => handleSave(setting, value)}
                                            />
                                        ) : (
                                            <SettingRow
                                                setting={setting}
                                                onSave={(value) => handleSave(setting, value)}
                                            />
                                        )}

                                        {setting.isDefault && (
                                            <Typography variant="caption" color="text.secondary">
                                                Using the default - saved to the board the first time you edit it.
                                            </Typography>
                                        )}

                                        {setting.description && (
                                            <Typography variant="body2" color="text.secondary">
                                                {setting.description}
                                            </Typography>
                                        )}
                                    </Stack>
                                ))
                            )}
                        </Stack>
                    </CardContent>
                </Card>
            )}
        </>
    );
}

export default AppSettings;
