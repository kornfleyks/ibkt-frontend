import { useState } from 'react';
import {
    Grid,
    Autocomplete,
    TextField,
    MenuItem,
    IconButton,
    Stack,
    Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/EditOutlined';
import CheckIcon from '@mui/icons-material/CheckOutlined';
import CloseIcon from '@mui/icons-material/CloseOutlined';
import InfoRow from '../../../Common/InfoRow';
import SectionCard from '../../../Common/SectionCard';
import { getRescuers } from '../../../../services/RescuersService';
import { updateCatRescuer, updateCatStatus } from '../../../../services/CatsService';
import { CATS_STATUS_OPTIONS } from '../../../../constants/statuses/catsStatuses';

const STATUS_OPTIONS = Object.values(CATS_STATUS_OPTIONS.STATUS);

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
                <CheckIcon fontSize="small" />
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
                <CheckIcon fontSize="small" />
            </IconButton>

            <IconButton size="small" onClick={() => setEditing(false)} disabled={saving} aria-label="Cancel">
                <CloseIcon fontSize="small" />
            </IconButton>
        </Stack>
    );
}

function OverviewTab({ cat, onCatUpdate }) {

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
                        <InfoRow
                            label="Name"
                            value={cat.name}
                        />

                        <InfoRow
                            label="Gender"
                            value={cat.gender}
                        />

                        <InfoRow
                            label="Age"
                            value={`${cat.age} years`}
                        />

                        <InfoRow
                            label="Breed"
                            value={cat.breed}
                        />

                        <InfoRow
                            label="Colour"
                            value={cat.colour}
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