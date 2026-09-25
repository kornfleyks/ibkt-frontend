import { readAuth } from './authStorage';

const SERVER_URL = import.meta.env.VITE_SERVER_URL;

// Window events other parts of the app listen to, so they don't need their
// own connection: a pushed notification (detail = the notification), and
// the stream (re)connecting.
export const NOTIFICATION_RECEIVED_EVENT = 'ibkt:notification-received';
export const SESSION_CONNECTED_EVENT = 'ibkt:session-connected';

const MIN_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

// Parses one server-sent-events block ("event: x\ndata: {...}") into
// { event, data }. Comment-only blocks (heartbeats) return null.
function parseBlock(block) {
    let event = 'message';
    const dataLines = [];

    for (const line of block.split('\n')) {
        if (line.startsWith('event:')) {
            event = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trim());
        }
    }

    if (dataLines.length === 0) {
        return null;
    }

    try {
        return { event, data: JSON.parse(dataLines.join('\n')) };
    } catch {
        return null;
    }
}

// Keeps the server's /api/session/events stream open for the signed-in
// user and reports live account state changes.
//
// Uses fetch rather than EventSource so the session token travels in the
// Authorization header - EventSource can't set headers, which would force
// the token into the URL (and into access logs).
//
// onAccount({ role, accountStatus }) - on connect and on every change.
// onUnauthorized() - the server refused the session (e.g. suspended).
// Returns stop(); reconnects with backoff on network drops until stopped.
export function connectSessionEvents({ onAccount, onUnauthorized }) {
    let stopped = false;
    let controller = null;
    let retryMs = MIN_RETRY_MS;
    let retryTimer = null;

    async function run() {
        const token = readAuth()?.token;

        if (stopped || !token) {
            return;
        }

        controller = new AbortController();

        try {
            const response = await fetch(`${SERVER_URL}/api/session/events`, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
                signal: controller.signal,
            });

            if (response.status === 401) {
                stopped = true;
                onUnauthorized();
                return;
            }

            if (!response.ok || !response.body) {
                throw new Error(`Session events: HTTP ${response.status}`);
            }

            retryMs = MIN_RETRY_MS;

            // Anything pushed while disconnected was missed - listeners
            // (e.g. notifications) reload their state on this.
            window.dispatchEvent(new CustomEvent(SESSION_CONNECTED_EVENT));

            const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
            let buffer = '';

            while (!stopped) {
                const { value, done } = await reader.read();

                if (done) {
                    break;
                }

                buffer += value.replace(/\r\n/g, '\n');

                let separator = buffer.indexOf('\n\n');

                while (separator !== -1) {
                    const parsed = parseBlock(buffer.slice(0, separator));
                    buffer = buffer.slice(separator + 2);

                    if (parsed?.event === 'account') {
                        onAccount(parsed.data);
                    } else if (parsed?.event === 'notification') {
                        window.dispatchEvent(new CustomEvent(NOTIFICATION_RECEIVED_EVENT, { detail: parsed.data }));
                    }

                    separator = buffer.indexOf('\n\n');
                }
            }
        } catch (err) {
            if (stopped || err.name === 'AbortError') {
                return;
            }

            console.warn('Session events connection dropped; reconnecting.', err.message);
        }

        // Stream ended (server restart, proxy timeout, network drop) - retry.
        if (!stopped) {
            retryTimer = setTimeout(run, retryMs);
            retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
        }
    }

    run();

    return function stop() {
        stopped = true;
        clearTimeout(retryTimer);
        controller?.abort();
    };
}
