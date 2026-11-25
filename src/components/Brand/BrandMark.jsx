import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import logoLight from '../../assets/brand/oriel-logo-full-colour.svg';
import logoDark from '../../assets/brand/oriel-logo-reversed.svg';
import sealLight from '../../assets/brand/oriel-seal-full-colour.svg';
import sealDark from '../../assets/brand/oriel-seal-reversed.svg';
import iconLight from '../../assets/brand/oriel-icon-mark-full-colour.svg';
import iconDark from '../../assets/brand/oriel-icon-mark-reversed.svg';

// The three Oriel marks (Oriel brand kit v1), each with one job:
//   logo   wherever the name appears. At least 32 px high.
//   seal   sign-in pages and documents, with "Rescue built on trust". At least
//          120 px across. Not for headers: its lettering is too small to read there.
//   icon   the crowned O, for anything under 32 px (the collapsed sidebar).
// The full-colour file goes on Cream and white, the reversed file on Midnight
// and Plum, so the dark theme gets the reversed one. Never recolour, stretch or
// put a mark on a busy background, and never place the logo and the seal together.
const MARKS = {
    logo: { light: logoLight, dark: logoDark, alt: 'Oriel', minHeight: 32 },
    seal: { light: sealLight, dark: sealDark, alt: 'Oriel: Rescue built on trust', minWidth: 120 },
    icon: { light: iconLight, dark: iconDark, alt: 'Oriel' },
};

// `height` (logo, icon) or `width` (seal) in px; the other side follows the
// artwork's own proportions.
function BrandMark({ variant = 'logo', height, width, sx }) {
    const mark = MARKS[variant];
    const dark = useTheme().palette.mode === 'dark';

    return (
        <Box
            component="img"
            src={dark ? mark.dark : mark.light}
            alt={mark.alt}
            sx={{ display: 'block', height: height ?? 'auto', width: width ?? 'auto', maxWidth: '100%', ...sx }}
        />
    );
}

export default BrandMark;
