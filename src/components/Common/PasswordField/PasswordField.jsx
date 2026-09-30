import { useState } from 'react';
import { TextField, InputAdornment, IconButton } from '@mui/material';

import { VisibilityIcon, VisibilityOffIcon } from '../../icons';

// A TextField for passwords with a show/hide button. Hidden by default;
// every TextField prop passes through.
function PasswordField({ disabled, slotProps, ...props }) {

    const [visible, setVisible] = useState(false);

    return (
        <TextField
            {...props}
            disabled={disabled}
            type={visible ? 'text' : 'password'}
            slotProps={{
                ...slotProps,
                input: {
                    ...slotProps?.input,
                    endAdornment: (
                        <InputAdornment position="end">
                            <IconButton
                                edge="end"
                                disabled={disabled}
                                onClick={() => setVisible((current) => !current)}
                                // Keeps focus (and the caret) in the field.
                                onMouseDown={(event) => event.preventDefault()}
                                aria-label={visible ? 'Hide password' : 'Show password'}
                            >
                                {visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                        </InputAdornment>
                    ),
                },
            }}
        />
    );

}

export default PasswordField;
