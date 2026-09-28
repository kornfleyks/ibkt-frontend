import { InputError } from "./database/boardRecords.js";
import { StoreError } from "./database/boardStore.js";

// An answer other than 400/500, e.g. 404 for a file not on the item.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Runs a route's work and answers with its result as JSON; errors map to
// 400 (InputError), their own status (HttpError, StoreError), 429 (Monday's
// rate limit), 502 (Monday refused) or 500.
export function answer(res, work, what = "request") {
  work
    .then((result) => res.json(result))
    .catch((err) => {
      if (err instanceof HttpError || err instanceof StoreError) return res.status(err.status).json({ error: err.message });
      if (err instanceof InputError) return res.status(400).json({ error: err.message });
      if (err.rateLimited) return res.status(429).json({ error: err.message, retryAfterSeconds: err.retryAfterSeconds });
      if (err.mondayErrors) return res.status(502).json({ error: err.message });

      console.error(`${what}:`, err);
      res.status(500).json({ error: `The ${what} request failed.` });
    });
}
