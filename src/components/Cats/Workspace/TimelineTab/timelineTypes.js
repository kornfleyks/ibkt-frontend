import PetsIcon from '@mui/icons-material/PetsOutlined';
import VaccinesIcon from '@mui/icons-material/VaccinesOutlined';
import DescriptionIcon from '@mui/icons-material/DescriptionOutlined';
import FavoriteIcon from '@mui/icons-material/FavoriteOutlined';



const timelineTypes = {

    created: {
        icon: PetsIcon,
        color: 'secondary'
    },
    medical: {
        icon: VaccinesIcon,
        color: 'success'
    },
    document: {
        icon: DescriptionIcon,
        color: 'primary'
    },
    matching: {
        icon: FavoriteIcon,
        color: 'error'
    }
};


export default timelineTypes;