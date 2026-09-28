import { useEffect, useState } from "react";
import { getLatestDatabaseUsage, DATABASE_USAGE_EVENT } from "../services/mondayUsage";

// { count } of today's database requests, updated after every server
// response; null until the first response carrying it arrives (or when the
// server has no database set up).
function useDatabaseUsage() {
    const [usage, setUsage] = useState(getLatestDatabaseUsage);

    useEffect(() => {
        function handleUsage(event) {
            setUsage(event.detail);
        }

        window.addEventListener(DATABASE_USAGE_EVENT, handleUsage);

        return () => window.removeEventListener(DATABASE_USAGE_EVENT, handleUsage);
    }, []);

    return usage;
}

export default useDatabaseUsage;
