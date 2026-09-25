import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { SearchIcon } from '../icons';
import useGlobalSearchIndex from '../../hooks/useGlobalSearchIndex';
import { searchIndex } from '../../utils/globalSearch';

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const SHORTCUT_HINT = IS_MAC ? '⌘K' : 'Ctrl K';

function GlobalSearch() {
    const navigate = useNavigate();
    // Autocomplete owns the input's ref, so the input is found via the root.
    const rootRef = useRef(null);
    const [inputValue, setInputValue] = useState('');
    const { index, loading, failedSources, ensureLoaded } = useGlobalSearchIndex();

    // Ctrl+K / Cmd+K focuses the search from anywhere in the app.
    useEffect(() => {
        function handleKeyDown(event) {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                rootRef.current?.querySelector('input')?.focus();
            }
        }

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const results = searchIndex(index, inputValue);

    function handleSelect(event, option) {
        if (!option) {
            return;
        }

        setInputValue('');
        rootRef.current?.querySelector('input')?.blur();
        navigate(option.to);
    }

    function getNoOptionsText() {
        if (loading) {
            return 'Loading...';
        }

        if (failedSources.length > 0) {
            return `No results (couldn't load ${failedSources.join(', ')} - try again).`;
        }

        return `No results for "${inputValue.trim()}".`;
    }

    return (
        <Autocomplete
            ref={rootRef}
            sx={{ width: { xs: 160, sm: 280, md: 380 } }}
            size="small"
            options={results}
            // Matching is done by searchIndex; don't let MUI filter again.
            filterOptions={(options) => options}
            groupBy={(option) => option.group}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, selected) => option.key === selected.key}
            value={null}
            inputValue={inputValue}
            onInputChange={(event, value, reason) => {
                // Selecting an option would otherwise put its label in the box.
                if (reason !== 'reset') {
                    setInputValue(value);
                }
            }}
            onChange={handleSelect}
            onFocus={ensureLoaded}
            open={inputValue.trim().length > 0}
            autoHighlight
            blurOnSelect
            noOptionsText={getNoOptionsText()}
            loading={loading}
            loadingText="Loading..."
            popupIcon={null}
            renderOption={(props, option) => {
                const { key, ...optionProps } = props;

                return (
                    <Box component="li" key={key} {...optionProps}>
                        <Box sx={{ minWidth: 0 }}>
                            <Typography variant="body2" noWrap>
                                {option.label}
                            </Typography>

                            {option.secondary && (
                                <Typography variant="caption" color="text.secondary" noWrap component="div">
                                    {option.secondary}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                );
            }}
            renderInput={(params) => (
                <TextField
                    {...params}
                    placeholder="Search cats, applications, tasks..."
                    slotProps={{
                        ...params.slotProps,
                        input: {
                            ...params.slotProps.input,
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: { xs: 'none', sm: 'block' }, whiteSpace: 'nowrap', pr: 1 }}
                                >
                                    {SHORTCUT_HINT}
                                </Typography>
                            ),
                        },
                    }}
                />
            )}
        />
    );
}

export default GlobalSearch;
