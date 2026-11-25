import { Box } from '@mui/material';

// A tag in the IBKT palette (brand guidelines, slide "Tags"): the accent colours
// are for tags and labels only, and the text is always Midnight. The colour
// means something, so each caller picks one for one meaning:
//   butter    awareness, and a request that is waiting
//   lavender  a step done on the way
//   sage      care, fostering, and a finished step
//   peach     something that needs a nudge
//   gold      celebrations only
const TONES = {
    butter: '#F3DFA2',
    lavender: '#B3A7BE',
    sage: '#9FB59A',
    peach: '#F7B9AB',
    gold: '#E2B355',
};

function StatusTag({ label, tone = 'lavender' }) {
    return (
        <Box
            component="span"
            sx={{
                display: 'inline-block',
                px: 1.25,
                py: 0.5,
                borderRadius: '6px',
                bgcolor: TONES[tone],
                color: '#3E3447',
                fontSize: '0.75rem',
                fontWeight: 800,
                letterSpacing: '0.06em',
                lineHeight: 1.2,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
            }}
        >
            {label}
        </Box>
    );
}

export default StatusTag;
