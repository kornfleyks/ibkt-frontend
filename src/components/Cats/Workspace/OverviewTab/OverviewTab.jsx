import { useEffect, useState } from 'react';
import {
    Grid,
    Autocomplete,
    TextField,
    MenuItem,
    IconButton,
    Stack,
    Typography,
    CircularProgress,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import CheckIcon from '@mui/icons-material/CheckOutlined';
import CloseIcon from '@mui/icons-material/CloseOutlined';
import InfoRow from '../../../Common/InfoRow';
import EditableInfoRow from '../../../Common/EditableInfoRow';
import SectionCard from '../../../Common/SectionCard';
import { getRescuers } from '../../../../services/RescuersService';
import {
    updateCatRescuer,
    updateCatStatus,
    updateCatName,
    updateCatGender,
    updateCatAge,
    updateCatBreed,
    updateCatColour,
    getCatDropdownOptions,
} from '../../../../services/CatsService';
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

function StatusRow({ cat, onCatUpdate }) {
    const [editing, setEditing] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState(cat.status);
    const [saving, setSaving] = useState(false);

    function startEditing() {
        setSelectedStatus(cat.status);
        setEditing(true);
    }

    async function handleSave() {
        setSaving(true);

        try {
            await updateCatStatus(cat.id, selectedStatus);

            onCatUpdate({ status: selectedStatus });

            setEditing(false);
        } catch (error) {
            console.error('Failed to update status:', error);
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

                        <StatusRow cat={cat} onCatUpdate={onCatUpdate} />

                        <InfoRow
                            label="Foster"
                            value={cat.foster}
                        />

                </SectionCard>
            </Grid>
        </Grid>
    );
}


export default OverviewTab;