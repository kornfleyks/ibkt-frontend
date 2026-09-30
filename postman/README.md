# IBKT Postman collection

Requests for the Express server in `server/`.

## Import

1. In Postman: **Import** and pick all three files in this folder:
   - `IBKT.postman_collection.json`
   - `IBKT-Local.postman_environment.json` (`baseUrl` = `http://localhost:4000`)
   - `IBKT-Render.postman_environment.json` (`baseUrl` = `https://ibkt-frontend-server.onrender.com`)
2. Pick **IBKT Local** or **IBKT Render** in the environment selector (top right).
3. Fill in `email` and `password` in the environment (and `inviteCode` if you want to try Register). Keep them in the **Current value** column so they are not synced or committed.

## Run Login first

Run **Auth > Login**. Its test script saves the returned token to `{{token}}` (and your user id to `{{userId}}`). Every other request uses the collection's Bearer auth with `{{token}}`, except the public ones (Login, Register, Password reset request/confirm, Health), which are set to No Auth.

Scripts that keep the variables in step:

- **Logout** clears `token`.
- **Change my password**, **Update my profile** and **Change my email** save the re-issued token.
- Create requests save the new id: Add application (`applicationId`), Create cat (`catId`), Create task (`taskId`), Start AI review (`runId`), Start post-adoption (`recordId`), uploads of contracts / transcripts / video / post-adoption photos (`assetId`), Add pasted transcript (`textId`).

**Session events (SSE)** opens a Server-Sent Events stream (authenticated with the same Bearer header). Postman shows it as a stream that stays open: cancel the request to stop it.

## Variables

| Variable | Use |
| --- | --- |
| `baseUrl` | Server address (set per environment) |
| `email` | Login email |
| `password` | Login password (secret, empty in the files) |
| `inviteCode` | Registration invite code (secret, empty in the files) |
| `token` | Session token, set by Login (secret) |
| `applicationId` | Active Applications item id |
| `catId` | Cats item id |
| `taskId` | Task id |
| `userId` | User id (set by Login to your own id) |
| `notificationId` | Notification id |
| `boardId` | Board id: Cats `5098369241` or Active Applications `5098444415` (Communications, Activity filter) |
| `itemId` | Item id on that board (Communications, Activity filter, Upload) |
| `runId` | AI review run id |
| `recordId` | Post-adoption record id |
| `assetId` | File (asset) id for contracts, transcripts, video, photos |
| `textId` | Pasted transcript id |
| `table` | Database table name for Database table rows (e.g. `cats`) |
| `call` | Screening call number: `1` or `2` |

## Deliberately left out

These routes exist in `server/` but are not in the collection:

- `POST /api/webhooks/monday/:secret` and `POST /api/webhooks/jotform/:secret`: webhooks called by Monday and Jotform with a secret in the path, not by people.
- `POST /api/monday` and `POST /api/monday/batch`: the raw Monday GraphQL proxy used by the app internally.
- The Admin data CRUD in `server/database/dataRoutes.js`: `GET /api/data/boards`, `GET` and `POST /api/data/:board`, `GET`, `PATCH` and `DELETE /api/data/:board/:id` (low-level database access). `GET /api/database-boards` from the same file is included.

## Keep it current

When a server endpoint is added or changed, update this collection in the same commit.
