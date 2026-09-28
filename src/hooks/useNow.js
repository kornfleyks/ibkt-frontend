import { useEffect, useState } from "react";

// The current time (ms), refreshed every `intervalMs` - for countdowns that
// must stay current without reading the clock during render.
function useNow(intervalMs = 30_000) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), intervalMs);

        return () => clearInterval(timer);
    }, [intervalMs]);

    return now;
}

export default useNow;
