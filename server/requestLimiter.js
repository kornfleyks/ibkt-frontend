// A limit on how often one client address may call a group of routes, kept in
// memory (one server). It counts every request, including the ones that are
// refused later (a form with missing answers, an application that already
// exists, a large body), which the per-address limits that count saved records
// do not. A fixed window per address: after `max` requests in a window the
// address gets 429 and Retry-After until the window ends.
//
//   app.use("/api/public", requestLimiter({ windowMs: 10 * 60 * 1000, max: 60 }));

export function requestLimiter({ windowMs, max, methods = ["POST", "PUT", "PATCH", "DELETE"], now = () => Date.now() }) {
  const windows = new Map();

  // Drops finished windows, so the map does not grow with every address seen.
  const sweep = setInterval(() => {
    const time = now();

    for (const [key, entry] of windows) if (entry.resetAt <= time) windows.delete(key);
  }, windowMs);

  sweep.unref?.();

  return function limit(req, res, next) {
    if (!methods.includes(req.method)) return next();

    const time = now();
    const key = req.ip || "unknown";
    let entry = windows.get(key);

    if (!entry || entry.resetAt <= time) {
      entry = { count: 0, resetAt: time + windowMs };
      windows.set(key, entry);
    }

    entry.count += 1;

    if (entry.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - time) / 1000));

      res.set("Retry-After", String(retryAfterSeconds));

      return res.status(429).json({ error: "Too many requests from this connection. Please try again in a few minutes.", retryAfterSeconds });
    }

    next();
  };
}
