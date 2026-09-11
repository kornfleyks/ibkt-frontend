# IBKT Upload Proxy

Monday.com's file-upload endpoint (`/v2/file`) doesn't send CORS headers, so
the browser can never call it directly - this is a small local server whose
only job is to receive a file from the frontend, hold the Monday API token
server-side, and forward the upload to Monday from a server context instead.

## Setup

```
cd server
npm install
cp .env.example .env   # then fill in your Monday API token
npm start
```

Runs on `http://localhost:4000` by default. The frontend's `.env` needs
`VITE_UPLOAD_PROXY_URL` pointing at wherever this is running (already set to
`http://localhost:4000` for local dev).

`ALLOWED_ORIGIN` in `.env` must match the URL the frontend dev server is
actually running on (default Vite port `5173`) or the browser will block the
request as a CORS mismatch.

## Scope

This only proxies file uploads. Everything else (fetching boards, updating
column values, creating items) still goes straight from the browser to
Monday's regular GraphQL endpoint, which does support CORS - that part is
unchanged. This is a narrow fix for the one thing that was actually broken,
not a general-purpose backend.
