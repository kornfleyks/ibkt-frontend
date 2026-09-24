import { useEffect, useState } from 'react';
import { Autocomplete, TextField, Typography, Box } from '@mui/material';

// Searchable single-user picker. `loadUsers` returns [{ id, name, role }] -
// the caller decides which users are eligible (e.g. the server's
// /api/users/assignable), this component only presents them.
function UserPicker({ value, onChange, loadUsers, disabled = false, label = 'User' }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        loadUsers()
            .then((data) => {
                if (!cancelled) {
                    setUsers(data);
                }
            })
            .catch((err) => {
                console.error('Failed to load users:', err);

                if (!cancelled) {
                    setError(err?.message || 'Failed to load users.');
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [loadUsers]);

    // A current value that is no longer eligible (account suspended, role
    // removed from the setting) still has to be selectable-as-is, or MUI
    // treats it as an invalid value.
    const options = value && !users.some((user) => user.id === value.id) ? [value, ...users] : users;

    return (
        <Autocomplete
            size="small"
            sx={{ minWidth: 240, flex: 1, maxWidth: 360 }}
            options={options}
            value={value}
            loading={loading}
            disabled={disabled}
            onChange={(event, next) => onChange(next)}
            getOptionLabel={(option) => option.name}
            isOptionEqualToValue={(option, selected) => option.id === selected.id}
            renderOption={(props, option) => {
                const { key, ...optionProps } = props;

                return (
                    <Box component="li" key={key} {...optionProps}>
                        <Box>
                            <Typography variant="body2">{option.name}</Typography>
                            {option.role && (
                                <Typography variant="caption" color="text.secondary">
                                    {option.role}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                );
            }}
            renderInput={(params) => (
                <TextField {...params} label={label} error={Boolean(error)} helperText={error} />
            )}
        />
    );
}

export default UserPicker;
