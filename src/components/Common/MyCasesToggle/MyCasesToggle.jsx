import { FormControlLabel, Switch } from '@mui/material';

// Pairs with hooks/useMyCasesFilter - pass its `enabled` / `setEnabled`.
function MyCasesToggle({ enabled, onChange, label = 'My cases' }) {
    return (
        <FormControlLabel
            label={label}
            control={<Switch checked={enabled} onChange={(event) => onChange(event.target.checked)} />}
            sx={{ mr: 0 }}
        />
    );
}

export default MyCasesToggle;
