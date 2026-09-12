# IBKT Server

Small Express server the frontend talks to instead of calling Monday.com
directly. It holds the Monday API token server-side and does two things:

- Proxies every Monday GraphQL request (`POST /api/monday`), so the token is
  never shipped to the browser. A public GitHub Pages build has no way to
  keep a token secret otherwise - anyone can read a bundled JS file.
- Proxies file uploads (`POST /api/upload`) to Monday's `/v2/file` endpoint,
  which doesn't send CORS headers and so can't be called from a browser at
  all.
- Caches Monday query results in memory (`mondayCache.js`) for
  `MONDAY_CACHE_TTL_MS` (default 30s), shared across every client hitting
  this server. Mutations always bypass the cache and clear it afterwards,
  since a mutation can change data behind more than one cached read. A
  caller can request a longer TTL for a specific query via `cacheTtlMs` in
  the request body (used for `getColumnSettings`, which rarely changes).

## Setup

```
cd server
npm install
cp .env.example .env   # then fill in your Monday API token
npm start
```

Runs on `http://localhost:4000` by default. The frontend's `.env` needs
`VITE_SERVER_URL` pointing at wherever this is running (already set to
`http://localhost:4000` for local dev).

`ALLOWED_ORIGIN` in `.env` is a comma-separated list of origins allowed to
call this server - it must include whatever the frontend is actually served
from (the local Vite dev server, and the deployed GitHub Pages origin).

## Deployment

This needs to run somewhere persistent (GitHub Pages only serves static
files, and GitHub Actions runners aren't meant to host a long-running
service). Deploy this folder as its own service - e.g. on Render:

- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables: `MONDAY_API_TOKEN`, `MONDAY_API_URL`,
  `ALLOWED_ORIGIN` (Render sets `PORT` itself, already handled)

Once deployed, set the frontend's `VITE_SERVER_URL` (a GitHub Actions
repository *variable*, not a secret - it's just a public URL) to this
service's URL so the production build points at it.
