// Server health, without any Monday call:
//   GET /api/health               - public; answers { ok: true };
//   GET /api/admin/server-health  - Admin-only details for App Settings.
//
// Keep-alive: Render's free plan puts the server to sleep after ~15 min
// without requests. On Render (RENDER_EXTERNAL_URL is set there
// automatically; KEEP_ALIVE_URL overrides it) the server calls its own
// public /api/health every 10 minutes. The request goes out through
// Render and back in, which counts as traffic and keeps it awake. The
// outcome of each self-ping is kept for the App Settings card. It can't
// wake the server once asleep - the next visit or deploy does, and it keeps
// itself awake from then on. Locally there's no public URL, so it's off.

const KEEP_ALIVE_INTERVAL_MS = 10 * 60_000;
const FIRST_PING_DELAY_MS = 60_000;
const PING_TIMEOUT_MS = 30_000;

const startedAt = new Date();
const keepAliveUrl = (process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/+$/, "");

let lastPingAt = null;
let pingCount = 0;
let selfPing = { lastAt: null, ok: null, responseMs: null, error: null };

// Exported for tests; normally run by the timers in startKeepAlive.
export async function pingSelf() {
  const started = Date.now();

  try {
    const response = await fetch(`${keepAliveUrl}/api/health`, { signal: AbortSignal.timeout(PING_TIMEOUT_MS) });

    selfPing = {
      lastAt: new Date().toISOString(),
      ok: response.ok,
      responseMs: Date.now() - started,
      error: response.ok ? null : `HTTP ${response.status}`,
    };
  } catch (err) {
    selfPing = { lastAt: new Date().toISOString(), ok: false, responseMs: null, error: err.message };
    console.warn("Keep-alive: self-ping failed.", err.message);
  }
}

export function startKeepAlive() {
  if (!keepAliveUrl) {
    return;
  }

  console.log(`Keep-alive: pinging ${keepAliveUrl}/api/health every ${KEEP_ALIVE_INTERVAL_MS / 60_000} minutes.`);
  setTimeout(pingSelf, FIRST_PING_DELAY_MS).unref();
  setInterval(pingSelf, KEEP_ALIVE_INTERVAL_MS).unref();
}

export function registerHealthRoutes(app, { requireAuth, requireAdmin }) {
  app.get("/api/health", (req, res) => {
    lastPingAt = new Date();
    pingCount += 1;
    res.json({ ok: true });
  });

  app.get("/api/admin/server-health", requireAuth, requireAdmin, (req, res) => {
    res.json({
      ok: true,
      startedAt: startedAt.toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      // Any call to /api/health, incl. the self-ping and outside monitors.
      lastPingAt: lastPingAt?.toISOString() ?? null,
      pingsSinceStart: pingCount,
      keepAlive: {
        enabled: Boolean(keepAliveUrl),
        intervalMinutes: KEEP_ALIVE_INTERVAL_MS / 60_000,
        ...selfPing,
      },
      memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    });
  });
}
