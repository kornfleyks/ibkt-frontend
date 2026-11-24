import { CATS_STATUS_OPTIONS } from '../../constants/statuses/catsStatuses';

// The starting values of the Add Cat forms (CatFormFields.jsx).
const S = CATS_STATUS_OPTIONS;

export const EMPTY_CAT_FORM = {
    felvStatus: S.FELV_STATUS.NOT_TESTED_YET,
    fivStatus: S.FIV_STATUS.NOT_TESTED_YET,
};

export const EMPTY_CAT_FILES = { photos: [], videos: [], medicalDocuments: [] };
