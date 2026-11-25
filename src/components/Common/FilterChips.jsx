import { Chip, Stack } from '@mui/material';

// The row of filter pills above a list (Oriel mock-ups): the chosen one is dark
// with light text, the others are Lilac. `options` is [{ value, label, count }],
// and a count is shown when given.
function FilterChips({ options, value, onChange }) {
    return (
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            {options.map((option) => {
                const selected = option.value === value;

                return (
                    <Chip
                        key={option.value}
                        label={option.count === undefined ? option.label : `${option.label} (${option.count})`}
                        onClick={() => onChange(option.value)}
                        sx={{
                            height: 36,
                            px: 0.5,
                            fontSize: '0.9375rem',
                            ...(selected && {
                                bgcolor: 'text.primary',
                                color: 'background.default',
                                '&:hover': { bgcolor: 'text.primary' },
                            }),
                        }}
                    />
                );
            })}
        </Stack>
    );
}

export default FilterChips;
