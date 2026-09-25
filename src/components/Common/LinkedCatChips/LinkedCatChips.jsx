import { Link as RouterLink } from 'react-router-dom';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import PetsIcon from '@mui/icons-material/PetsOutlined';

// An application's linked cat(s) - one chip per cat (a bonded group is
// several). `clickable` makes each chip open the cat's page; leave it off
// inside an element that is itself a link (e.g. a clickable card).
function LinkedCatChips({ cats, clickable = false, emptyText = null }) {
    if (!cats?.length) {
        return emptyText;
    }

    return (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {cats.map((cat) => (
                <Chip
                    key={cat.id}
                    icon={<PetsIcon />}
                    label={cat.name}
                    size="small"
                    variant="outlined"
                    {...(clickable && { component: RouterLink, to: `/cats/${cat.id}`, clickable: true })}
                />
            ))}
        </Stack>
    );
}

export default LinkedCatChips;
