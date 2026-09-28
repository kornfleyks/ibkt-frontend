import { useMemo } from "react";
import usePreferences from "./usePreferences";
import { formatDate, formatDateTime, parseDateOnly } from "../utils/formatDate";

// Date formatters bound to the signed-in user's chosen date format.
function useDateFormat() {
    const { preferences } = usePreferences();
    const format = preferences.dateFormat;

    return useMemo(() => ({
        dateFormat: format,
        formatDate: (date) => formatDate(date, format),
        formatDateTime: (date) => formatDateTime(date, format),
        // For "YYYY-MM-DD" strings; returns the input unchanged if it isn't one.
        formatDateString: (value) => {
            const date = parseDateOnly(value);

            return date ? formatDate(date, format) : value;
        },
    }), [format]);
}

export default useDateFormat;
