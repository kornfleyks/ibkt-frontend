---
name: postman-collection-upkeep
description: Standing rule - whenever a server endpoint is added or changed, update postman/IBKT.postman_collection.json in the same change
metadata:
  type: feedback
---

The user asked (2026-09-30) that the Postman collection in `postman/` (collection + Local/Render environments + README) be updated every time a server endpoint is added, and it's good sense to do the same when one changes or is removed.

Scope decided by the user: app endpoints only. Deliberately excluded: the Monday and Jotform webhooks, the raw `/api/monday` and `/api/monday/batch` proxy, and the Admin `/api/data/*` CRUD (`GET /api/database-boards` stays in). Auth: the Login request's test script saves `{{token}}`; collection-level Bearer auth; public routes use `noauth`. The files are committed to git, and secret variables (password, inviteCode, token) stay empty in the environment files.

**Why:** the user tests the server with Postman and wants the collection to stay complete without asking.

**How to apply:** when adding or editing a route in `server/`, add or edit the matching request (right folder, real body field names, role notes in the description, a save-id script for create endpoints) and keep the request count in `postman/README.md` accurate. Never put `.env` values in these files. Related: [[forgot-password-via-jotform]]
