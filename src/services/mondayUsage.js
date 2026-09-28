import { MONDAY_USAGE_HEADER, MONDAY_BLOCKED_HEADER, DATABASE_USAGE_HEADER } from '../constants/mondayApiUsage';

// Today's request counts as counted by our server, read off the headers it
// sends Admins on every response: Monday API calls (X-Monday-Usage) and
// database requests (X-Database-Usage). Components subscribe through the
// window events (see hooks/useMondayUsage, hooks/useDatabaseUsage).
export const MONDAY_USAGE_EVENT = 'ibkt:monday-usage';
export const DATABASE_USAGE_EVENT = 'ibkt:database-usage';

let latest = null;
let latestDatabase = null;

export function getLatestMondayUsage() {
    return latest;
}

export function getLatestDatabaseUsage() {
    return latestDatabase;
}

function syncMondayUsage(response) {
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

function syncDatabaseUsage(response) {
    const header = response.headers.get(DATABASE_USAGE_HEADER);

    if (header === null || !/^\d+$/.test(header)) {
        return;
    }

    const next = { count: Number(header) };

    if (latestDatabase?.count === next.count) {
        return;
    }

    latestDatabase = next;
    window.dispatchEvent(new CustomEvent(DATABASE_USAGE_EVENT, { detail: next }));
}

export function syncUsageFromResponse(response) {
    syncMondayUsage(response);
    syncDatabaseUsage(response);
}
