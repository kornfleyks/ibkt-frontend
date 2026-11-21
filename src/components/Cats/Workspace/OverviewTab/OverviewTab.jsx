import { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    Autocomplete,
    TextField,
    MenuItem,
    IconButton,
    Stack,
    Typography,
    CircularProgress,
} from '@mui/material';
import useDateFormat from '../../../../hooks/useDateFormat';
import { EditIcon, CheckIcon, CloseIcon } from '../../../icons';
import InfoRow from '../../../Common/InfoRow';
import EditableInfoRow from '../../../Common/EditableInfoRow';
import SectionCard from '../../../Common/SectionCard';
import FosterProfilesCard from '../../FosterProfiles';
import { getRescuers } from '../../../../services/RescuersService';
import AdoptionReadyDialog from '../../AdoptionReadyDialog';
import useCatStatusChange from '../../../../hooks/useCatStatusChange';
import { groupProblems } from '../../../../constants/catReadiness';
import {
    getCatReadiness,
    getCatUpdateClock,
    recordCatUpdateReceived,
    updateCatRescuer,
    updateCatFoster,
    getFosterOptions,
    updateCatName,
    updateCatGender,
    updateCatAge,
    updateCatBreed,
    updateCatColour,
    getCatDropdownOptions,
    getCats,
    getCat,
    linkBondedCats,
} from '../../../../services/CatsService';
import { getMaxBondedCats } from '../../../../services/AppSettingsService';
import { CATS_STATUS_OPTIONS } from '../../../../constants/statuses/catsStatuses';

const STATUS_OPTIONS = Object.values(CATS_STATUS_OPTIONS.STATUS);
const GENDER_OPTIONS = Object.values(CATS_STATUS_OPTIONS.GENDER);

function RescuerRow({ cat, onCatUpdate }) {
    const [editing, setEditing] = useState(false);
    const [rescuers, setRescuers] = useState([]);
    const [loadingRescuers, setLoadingRescuers] = useState(false);
    const [selectedRescuer, setSelectedRescuer] = useState(null);
    const [saving, setSaving] = useState(false);

    async function startEditing() {
        setSelectedRescuer(
            cat.rescuerId ? { id: cat.rescuerId, name: cat.rescuer } : null,
        );
        setEditing(true);

        if (rescuers.length === 0) {
            setLoadingRescuers(true);

            try {
                setRescuers(await getRescuers());
            } catch (error) {
                console.error('Failed to load rescuers:', error);
            } finally {
                setLoadingRescuers(false);
            }
        }
    }

    async function handleSave() {
        setSaving(true);

        try {
            await updateCatRescuer(cat.id, selectedRescuer?.id ?? null);

            onCatUpdate({
                rescuer: selectedRescuer?.name ?? 'N/A',
                rescuerId: selectedRescuer?.id ?? null,
            });

            setEditing(false);
        } catch (error) {
            console.error('Failed to update rescuer:', error);
        } finally {
            setSaving(false);
        }
    }

    if (!editing) {
        return (
            <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{
                    '&:hover .row-edit-button, &:focus-within .row-edit-button': {
                        opacity: 1,
                    },
                }}
            >
                <InfoRow label="Rescuer" value={cat.rescuer} />

                <IconButton
                    size="small"
                    onClick={startEditing}
                    aria-label="Edit rescuer"
                    className="row-edit-button"
                    sx={{ opacity: 0, transition: 'opacity 0.15s' }}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            </Stack>
        );
    }

    return (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
            <Typography sx={{ width: 120, fontWeight: 600, color: 'text.secondary' }}>
                Rescuer
            </Typography>

            <Autocomplete
                size="small"
                sx={{ flex: 1 }}
                options={rescuers}
                loading={loadingRescuers}
                disabled={saving}
                getOptionLabel={(option) => option.name ?? ''}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={selectedRescuer}
                onChange={(event, value) => setSelectedRescuer(value)}
                renderInput={(params) => (
                    <TextField {...params} placeholder="No rescuer" />
                )}
            />

            <IconButton size="small" onClick={handleSave} disabled={saving} aria-label="Save rescuer">
                {saving ? <CircularProgress size={16} sx={{ color: 'text.secondary' }} /> : <CheckIcon fontSize="small" />}
            </IconButton>

            <IconButton size="small" onClick={() => setEditing(false)} disabled={saving} aria-label="Cancel">
                <CloseIcon fontSize="small" />
            </IconButton>
        </Stack>
    );
}

// The foster looking after the cat: pick an Active foster, or none. The server
// refuses anyone else (docs/foster-onboarding.md).
function FosterRow({ cat, onCatUpdate }) {
    const [editing, setEditing] = useState(false);
    const [fosters, setFosters] = useState([]);
    const [loadingFosters, setLoadingFosters] = useState(false);
    const [selectedFoster, setSelectedFoster] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    async function startEditing() {
        setSelectedFoster(cat.linkedFosterId ? { id: cat.linkedFosterId, name: cat.linkedFoster, city: '' } : null);
        setError(null);
        setEditing(true);

        if (fosters.length === 0) {
            setLoadingFosters(true);

            try {
                setFosters(await getFosterOptions());
            } catch (err) {
                console.error('Failed to load fosters:', err);
                setError(err.message || 'Failed to load the fosters.');
            } finally {
                setLoadingFosters(false);
            }
        }
    }

    async function handleSave() {
        setSaving(true);
        setError(null);

        try {
            await updateCatFoster(cat.id, selectedFoster?.id ?? null);

            onCatUpdate({
                linkedFoster: selectedFoster?.name ?? '',
                linkedFosterId: selectedFoster?.id ?? null,
            });

            setEditing(false);
        } catch (err) {
            console.error('Failed to update the foster:', err);
            setError(err.message || 'Failed to update the foster.');
        } finally {
            setSaving(false);
        }
    }

    if (!editing) {
        return (
            <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{
                    '&:hover .row-edit-button, &:focus-within .row-edit-button': {
                        opacity: 1,
                    },
                }}
            >
                <InfoRow label="Foster" value={cat.linkedFoster || 'None'} />

                <IconButton
                    size="small"
                    onClick={startEditing}
                    aria-label="Edit foster"
                    className="row-edit-button"
                    sx={{ opacity: 0, transition: 'opacity 0.15s' }}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            </Stack>
        );
    }

    return (
        <Box>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
                <Typography sx={{ width: 120, fontWeight: 600, color: 'text.secondary' }}>Foster</Typography>

                <Autocomplete
                    size="small"
                    sx={{ flex: 1 }}
                    options={fosters}
                    loading={loadingFosters}
                    disabled={saving}
                    getOptionLabel={(option) => (option.city ? `${option.name} (${option.city})` : (option.name ?? ''))}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={selectedFoster}
                    onChange={(event, value) => setSelectedFoster(value)}
                    renderInput={(params) => <TextField {...params} placeholder="No foster" />}
                />

                <IconButton size="small" onClick={handleSave} disabled={saving} aria-label="Save foster">
                    {saving ? <CircularProgress size={16} sx={{ color: 'text.secondary' }} /> : <CheckIcon fontSize="small" />}
                </IconButton>

                <IconButton size="small" onClick={() => setEditing(false)} disabled={saving} aria-label="Cancel">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Stack>

            {error && (
                <Typography variant="caption" color="error">
                    {error}
                </Typography>
            )}
        </Box>
    );
}

function BondedWithRow({ cat, onCatUpdate }) {
    const [editing, setEditing] = useState(false);
    const [candidates, setCandidates] = useState([]);
    const [loadingCandidates, setLoadingCandidates] = useState(false);
    const [selectedCat, setSelectedCat] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);

    async function startEditing() {
        setSelectedCat(null);
        setSaveError(null);
        setEditing(true);

        if (candidates.length === 0) {
            setLoadingCandidates(true);

            try {
                const allCats = await getCats();

                setCandidates(
                    allCats.filter(
                        (candidate) =>
                            candidate.id !== cat.id && !cat.bondedWithIds.includes(candidate.id),
                    ),
                );
            } catch (error) {
                console.error('Failed to load cats to bond with:', error);
            } finally {
                setLoadingCandidates(false);
            }
        }
    }

    async function handleSave() {
        if (!selectedCat) {
            setEditing(false);
            return;
        }

        setSaving(true);
        setSaveError(null);

        try {
            // Welds the two cats' existing bonded groups together (if either
            // already had one) so everyone ends up mutually linked, not just
            // this cat and the one just picked.
            const fullGroup = [
                ...new Set([
                    cat.id,
                    ...cat.bondedWithIds,
                    selectedCat.id,
                    ...selectedCat.bondedWithIds,
                ]),
            ];

            const maxBondedCats = await getMaxBondedCats();

            if (fullGroup.length > maxBondedCats) {
                setSaveError(`A bonded group can have at most ${maxBondedCats} cats.`);
                return;
            }

            await linkBondedCats(fullGroup);

            const refreshed = await getCat(cat.id);

            onCatUpdate({
                bondedWith: refreshed.bondedWith,
                bondedWithIds: refreshed.bondedWithIds,
            });

            setEditing(false);
        } catch (error) {
            console.error('Failed to link bonded cat:', error);
            setSaveError('Failed to link this cat.');
        } finally {
            setSaving(false);
        }
    }

    if (!editing) {
        return (
            <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{
                    '&:hover .row-edit-button, &:focus-within .row-edit-button': {
                        opacity: 1,
                    },
                }}
            >
                <InfoRow label="Bonded With" value={cat.bondedWith || 'None'} />

                <IconButton
                    size="small"
                    onClick={startEditing}
                    aria-label="Link another cat"
                    className="row-edit-button"
                    sx={{ opacity: 0, transition: 'opacity 0.15s' }}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            </Stack>
        );
    }

    return (
        <Stack spacing={0.5} sx={{ py: 0.5 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography sx={{ width: 120, flexShrink: 0, fontWeight: 600, color: 'text.secondary' }}>
                    Bonded With
                </Typography>

                <Autocomplete
                    size="small"
                    sx={{ flex: 1 }}
                    options={candidates}
                    loading={loadingCandidates}
                    disabled={saving}
                    getOptionLabel={(option) => option.name ?? ''}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={selectedCat}
                    onChange={(event, value) => setSelectedCat(value)}
                    renderInput={(params) => (
                        <TextField {...params} placeholder="Choose a cat to link" />
                    )}
                />

                <IconButton size="small" onClick={handleSave} disabled={saving} aria-label="Save bonded cat">
                    {saving ? <CircularProgress size={16} sx={{ color: 'text.secondary' }} /> : <CheckIcon fontSize="small" />}
                </IconButton>

                <IconButton size="small" onClick={() => setEditing(false)} disabled={saving} aria-label="Cancel">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Stack>

            {saveError && (
                <Typography variant="caption" color="error">
                    {saveError}
                </Typography>
            )}
        </Stack>
    );
}

function StatusRow({ cat, onCatUpdate }) {
    const [editing, setEditing] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(cat.status);
    const [saving, setSaving] = useState(false);
    const { change, notReady, override, cancel } = useCatStatusChange(cat, onCatUpdate);

    function startEditing() {
        setSelectedStatus(cat.status);
        setEditing(true);
    }

    async function handleSave() {
        setSaving(true);

        if (await change(selectedStatus)) setEditing(false);

        setSaving(false);
    }

    if (!editing) {
        return (
            <Stack
                direction="row"
                alignItems="center"
                spacing={1.5}
                sx={{
                    '&:hover .row-edit-button, &:focus-within .row-edit-button': {
                        opacity: 1,
                    },
                }}
            >
                <InfoRow label="Status" value={cat.status} />

                <IconButton
                    size="small"
                    onClick={startEditing}
                    aria-label="Edit status"
                    className="row-edit-button"
                    sx={{ opacity: 0, transition: 'opacity 0.15s' }}
                >
                    <EditIcon fontSize="small" />
                </IconButton>
            </Stack>
        );
    }

    return (
        <>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ py: 0.5 }}>
                <Typography sx={{ width: 120, fontWeight: 600, color: 'text.secondary' }}>
                    Status
                </Typography>

                <TextField
                    select
                    size="small"
                    sx={{ flex: 1 }}
                    disabled={saving}
                    value={selectedStatus}
                    onChange={(event) => setSelectedStatus(event.target.value)}
                >
                    {STATUS_OPTIONS.map((option) => (
                        <MenuItem key={option} value={option}>
                            {option}
                        </MenuItem>
                    ))}
                </TextField>

                <IconButton size="small" onClick={handleSave} disabled={saving} aria-label="Save status">
                    {saving ? <CircularProgress size={16} sx={{ color: 'text.secondary' }} /> : <CheckIcon fontSize="small" />}
                </IconButton>

                <IconButton size="small" onClick={() => setEditing(false)} disabled={saving} aria-label="Cancel">
                    <CloseIcon fontSize="small" />
                </IconButton>
            </Stack>

            <AdoptionReadyDialog
                open={Boolean(notReady)}
                catName={cat.name}
                status={notReady?.status}
                problems={notReady?.problems ?? []}
                canOverride={Boolean(notReady?.canOverride)}
                onCancel={cancel}
                onOverride={async (reason) => {
                    await override(reason);
                    setEditing(false);
                }}
            />
        </>
    );
}

// What the cat still needs before it can be set to Adoption Ready (the server
// works it out from the cat's real values). Read when the tab opens.
function ReadinessCard({ cat }) {
    const [readiness, setReadiness] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        getCatReadiness(cat.id)
            .then((result) => !cancelled && setReadiness(result))
            .catch((error) => {
                console.error('Failed to load the adoption readiness:', error);

                if (!cancelled) setFailed(true);
            });

        return () => {
            cancelled = true;
        };
    }, [cat.id]);

    return (
        <SectionCard title="Adoption readiness">
            {failed && <Typography color="text.secondary">Couldn't check what is missing.</Typography>}

            {!failed && !readiness && <CircularProgress size={20} sx={{ color: 'text.secondary' }} />}

            {readiness?.ready && <Typography>Ready: everything needed to set this cat to Adoption Ready is filled in.</Typography>}

            {readiness && !readiness.ready && (
                <Stack spacing={1.5}>
                    <Typography color="text.secondary">
                        {`Missing before this cat can be set to Adoption Ready (${readiness.problems.length}):`}
                    </Typography>

                    {groupProblems(readiness.problems).map(({ group, items }) => (
                        <div key={group}>
                            <Typography variant="subtitle2">{group}</Typography>
                            <ul style={{ margin: 0, paddingLeft: 20 }}>
                                {items.map((item) => (
                                    <li key={item.key}>
                                        <Typography variant="body2">{item.detail ? `${item.label} (${item.detail})` : item.label}</Typography>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </Stack>
            )}
        </SectionCard>
    );
}

const FLAG_COLORS = { Requested: 'warning', Overdue: 'error', Received: 'success' };

// The update check of a cat waiting for a home (server/catUpdates/): when
// news about it is due, and a button to record that it arrived. Read when the
// tab opens and when the cat's status changes.
function UpdateCheckCard({ cat }) {
    const { formatDate } = useDateFormat();
    const [state, setState] = useState(null);
    const [failed, setFailed] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        getCatUpdateClock(cat.id)
            .then((result) => !cancelled && setState(result))
            .catch((err) => {
                console.error('Failed to load the update check:', err);

                if (!cancelled) setFailed(true);
            });

        return () => {
            cancelled = true;
        };
    }, [cat.id, cat.status]);

    async function handleReceived() {
        setSaving(true);
        setError(null);

        try {
            setState(await recordCatUpdateReceived(cat.id, note.trim()));
            setDialogOpen(false);
            setNote('');
        } catch (err) {
            setError(err?.message || 'Something went wrong. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    const day = (iso) => (iso ? formatDate(new Date(iso)) : 'N/A');

    return (
        <SectionCard title="Update check">
            {failed && <Typography color="text.secondary">Couldn't load the update check.</Typography>}

            {!failed && !state && <CircularProgress size={20} sx={{ color: 'text.secondary' }} />}

            {state && !state.applies && (
                <Typography color="text.secondary">Updates are asked for only while a cat is Adoption Ready and waiting for a home.</Typography>
            )}

            {state?.applies && (
                <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography sx={{ width: 190, fontWeight: 600, color: 'text.secondary' }}>Update status</Typography>
                        <Chip size="small" label={state.flag} color={FLAG_COLORS[state.flag] ?? 'default'} />
                    </Stack>

                    <InfoRow label="Adoption Ready since" value={day(state.readySince)} labelWidth={190} />
                    <InfoRow label="Next update due" value={day(state.dueAt)} labelWidth={190} />
                    {state.requestedAt && <InfoRow label="Update requested on" value={day(state.requestedAt)} labelWidth={190} />}
                    <InfoRow
                        label="Last update received"
                        value={state.lastReceived ? `${day(state.lastReceived.at)}${state.lastReceived.by ? ` by ${state.lastReceived.by}` : ''}` : 'None yet'}
                        labelWidth={190}
                    />
                    {state.lastReceived?.note && <InfoRow label="Note" value={state.lastReceived.note} labelWidth={190} />}

                    <Typography variant="body2" color="text.secondary">
                        {`After ${state.afterMonths} months the Admins and Volunteers are asked to get news from the rescuer or foster. Recording it restarts the ${state.afterMonths} months.`}
                    </Typography>

                    <Box>
                        <Button variant="outlined" size="small" onClick={() => setDialogOpen(true)}>
                            Update received
                        </Button>
                    </Box>
                </Stack>
            )}

            <Dialog open={dialogOpen} onClose={saving ? undefined : () => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{`Update received for ${cat.name}`}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {`This restarts the ${state?.afterMonths ?? 3} months and closes any open request. Add a note about what you heard, if you like.`}
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        label="Note (optional)"
                        value={note}
                        disabled={saving}
                        onChange={(event) => setNote(event.target.value)}
                        slotProps={{ htmlInput: { maxLength: 500 } }}
                    />
                    {error && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {error}
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)} disabled={saving}>
                        Cancel
                    </Button>
                    <Button variant="contained" onClick={handleReceived} disabled={saving}>
                        {saving ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : 'Record update'}
                    </Button>
                </DialogActions>
            </Dialog>
        </SectionCard>
    );
}

function OverviewTab({ cat, onCatUpdate }) {

    const [breedOptions, setBreedOptions] = useState([]);
    const [colourOptions, setColourOptions] = useState([]);

    useEffect(() => {
        getCatDropdownOptions()
            .then((options) => {
                setBreedOptions(options.breed);
                setColourOptions(options.colour);
            })
            .catch((error) => console.error('Failed to load Breed/Colour options:', error));
    }, []);

    return (
        <>
            <FosterProfilesCard cat={cat} onCatUpdate={onCatUpdate} />

        <Grid
            container
            spacing={3}
        >
            <Grid
                size={{
                    xs:12,
                    md:6
                }}
            >
                <SectionCard title="Basic Information">
                        <EditableInfoRow
                            label="Name"
                            displayValue={cat.name}
                            getEditValue={() => cat.name}
                            onSave={async (value) => {
                                if (!value.trim()) {
                                    throw new Error('Name is required.');
                                }

                                await updateCatName(cat.id, value);
                                onCatUpdate({ name: value });
                            }}
                            renderEditor={(value, setValue, saving) => (
                                <TextField
                                    size="small"
                                    sx={{ flex: 1 }}
                                    disabled={saving}
                                    value={value}
                                    onChange={(event) => setValue(event.target.value)}
                                />
                            )}
                        />

                        <EditableInfoRow
                            label="Gender"
                            displayValue={cat.gender}
                            getEditValue={() => (cat.gender === 'N/A' ? '' : cat.gender)}
                            onSave={async (value) => {
                                await updateCatGender(cat.id, value);
                                onCatUpdate({ gender: value });
                            }}
                            renderEditor={(value, setValue, saving) => (
                                <TextField
                                    select
                                    size="small"
                                    sx={{ flex: 1 }}
                                    disabled={saving}
                                    value={value}
                                    onChange={(event) => setValue(event.target.value)}
                                >
                                    <MenuItem value="">—</MenuItem>
                                    {GENDER_OPTIONS.map((option) => (
                                        <MenuItem key={option} value={option}>
                                            {option}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            )}
                        />

                        <EditableInfoRow
                            label="Age"
                            displayValue={`${cat.age} years`}
                            getEditValue={() => cat.age}
                            onSave={async (value) => {
                                await updateCatAge(cat.id, value);
                                onCatUpdate({ age: value });
                            }}
                            renderEditor={(value, setValue, saving) => (
                                <TextField
                                    type="number"
                                    size="small"
                                    sx={{ flex: 1 }}
                                    disabled={saving}
                                    value={value}
                                    onChange={(event) => setValue(event.target.value)}
                                />
                            )}
                        />

                        <BondedWithRow cat={cat} onCatUpdate={onCatUpdate} />

                        <EditableInfoRow
                            label="Breed"
                            displayValue={cat.breed}
                            getEditValue={() => (cat.breed === 'N/A' ? '' : cat.breed)}
                            onSave={async (value) => {
                                await updateCatBreed(cat.id, value);
                                onCatUpdate({ breed: value });
                            }}
                            renderEditor={(value, setValue, saving) => (
                                <Autocomplete
                                    freeSolo
                                    size="small"
                                    sx={{ flex: 1 }}
                                    disabled={saving}
                                    options={breedOptions}
                                    value={value}
                                    onInputChange={(event, newValue) => setValue(newValue)}
                                    renderInput={(params) => <TextField {...params} />}
                                />
                            )}
                        />

                        <EditableInfoRow
                            label="Colour"
                            displayValue={cat.colour}
                            getEditValue={() => (cat.colour === 'N/A' ? '' : cat.colour)}
                            onSave={async (value) => {
                                await updateCatColour(cat.id, value);
                                onCatUpdate({ colour: value });
                            }}
                            renderEditor={(value, setValue, saving) => (
                                <Autocomplete
                                    freeSolo
                                    size="small"
                                    sx={{ flex: 1 }}
                                    disabled={saving}
                                    options={colourOptions}
                                    value={value}
                                    onInputChange={(event, newValue) => setValue(newValue)}
                                    renderInput={(params) => <TextField {...params} />}
                                />
                            )}
                        />
                </SectionCard>
            </Grid>
            <Grid
                size={{
                    xs:12,
                    md:6
                }}
            >
                <SectionCard title="Rescue Information">
                        <RescuerRow cat={cat} onCatUpdate={onCatUpdate} />
                        <FosterRow cat={cat} onCatUpdate={onCatUpdate} />

                        <StatusRow cat={cat} onCatUpdate={onCatUpdate} />

                        <InfoRow
                            label="Foster contact"
                            value={cat.foster}
                        />

                </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <ReadinessCard cat={cat} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
                <UpdateCheckCard cat={cat} />
            </Grid>
        </Grid>
        </>
    );
}


export default OverviewTab;