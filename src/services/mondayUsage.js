import { MONDAY_USAGE_HEADER, MONDAY_BLOCKED_HEADER } from '../constants/mondayApiUsage';

// Today's Monday API call count as counted by our server, read off the
// X-Monday-Usage header it sends Admins on every response. Components
// subscribe through the window event (see hooks/useMondayUsage).
export const MONDAY_USAGE_EVENT = 'ibkt:monday-usage';

let latest = null;

export function getLatestMondayUsage() {
    return latest;
}

export function syncMondayUsageFromResponse(response) {
    const match = /^(\d+)\/(\d+)$/.exec(response.headers.get(MONDAY_USAGE_HEADER) ?? '');

    if (!match) {
        return;
    }

    const blockedFor = Number(response.headers.get(MONDAY_BLOCKED_HEADER));
    const next = {
        count: Number(match[1]),
        limit: Number(match[2]),
        // Only while Monday is refusing calls: when it said the block ends.
        blockedUntil: blockedFor > 0 ? Date.now() + blockedFor * 1000 : null,
    };

    const sameBlock =
        latest?.blockedUntil === next.blockedUntil ||
        (latest?.blockedUntil && next.blockedUntil && Math.abs(latest.blockedUntil - next.blockedUntil) < 5_000);

    if (latest?.count === next.count && latest?.limit === next.limit && sameBlock) {
        return;
    }

    latest = next;
    window.dispatchEvent(new CustomEvent(MONDAY_USAGE_EVENT, { detail: next }));
}
