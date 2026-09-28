import { useContext } from "react";
import { PreferencesContext } from "../context/preferencesContextInstance";

function usePreferences() {
    return useContext(PreferencesContext);
}

export default usePreferences;
