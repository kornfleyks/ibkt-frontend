import { useEffect, useState } from "react";
import { getLatestMondayUsage, MONDAY_USAGE_EVENT } from "../services/mondayUsage";

// { count, limit } of today's Monday API calls, updated after every server
// response; null until the first response carrying it arrives.
function useMondayUsage() {
    const [usage, setUsage] = useState(getLatestMondayUsage);

    useEffect(() => {
        function handleUsage(event) {
            setUsage(event.detail);
        }

        window.addEventListener(MONDAY_USAGE_EVENT, handleUsage);

        return () => window.removeEventListener(MONDAY_USAGE_EVENT, handleUsage);
    }, []);

    return usage;
}

export default useMondayUsage;
