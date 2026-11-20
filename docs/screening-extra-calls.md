# Screening Extra Calls

Status: built and set up 2026-11-11. The one-time setup below has run on the database and on Monday, and the server routes and the AI review are tested end to end on the throwaway application "Test Applicant (Claude)". The Screening tab screens have not been tried in a browser, and the code is not deployed yet.

The Screening tab on an application had exactly two calls. A volunteer can now add more with the Add call button, which creates Call 3, then Call 4, and so on. An extra call has the same pieces as Call 2: a date, a summary, transcripts (an uploaded file or pasted text) and the Review call with AI button. An extra call can also be deleted.

## Decisions (2026-11-11)

| Topic | Decision |
|---|---|
| Storage | Date and summary are in a new app-only table `application_calls`. Pasted transcripts use the existing `call_transcripts` table. Uploaded transcript files go in one new Monday file column, "Additional Call Transcripts". |
| Calls 1 and 2 | Unchanged. They keep their own columns on the Applications board. |
| Files of an extra call | All extra calls share the one Monday column. The call number of each file is kept in the `document_type` of its `file_uploads` record (`call-3`). A file added to the column directly on Monday has no call and is not shown. |
| AI review | Works on any extra call, like Calls 1 and 2. The review kind is `call_<n>_review`. Accepting it saves the AI's summary to that call and the other fields (review, concerns, missing information, recommendation, risk score, next action) to the application, as for Call 2. |
| Limit | At most 20 extra calls on one application. |
| Who | Admins and the application's Case Owner, like the rest of the Screening tab. |

## One-time setup

1. Database: run the statements in `scripts/databaseSchema.js` that create `application_calls`, allow any call number in `call_transcripts` (it only accepted 1 and 2), and allow any `call_<n>_review` kind in `ai_runs` (it only accepted three kinds).
2. Monday: run `node scripts/createAdditionalCallTranscriptColumn.js`. It creates the file column (2 Monday calls) and prints its id. Put the id in `ADDITIONAL_CALL_TRANSCRIPTS` in `src/constants/boards/activeApplications.js`.
3. Run `node scripts/databaseSchema.js --refresh` so the database gets the new column (1 Monday call).
4. Restart the server. The server refuses direct changes to the new column through the generic routes once its id is set.

All four steps were done on 2026-11-11. The column id is `file_mm90k84n`. A server that still runs the code from before this change keeps working against the changed database, because the changes only allow more values. A new server needs this code to use extra calls.

## Server

Routes are under `/api/applications/:id/screening` (`server/screening/routes.js`):

- `GET` returns `extraCalls` next to `calls` and `video`.
- `POST /calls` adds the next extra call.
- `POST /calls/:call` changes the date or the summary of an extra call.
- `DELETE /calls/:call` deletes an extra call, its files and its pasted transcripts.
- The existing file and text routes under `/calls/:call` accept any existing call number.

Deleting a call removes its files from Monday first. If that fails, the call stays so the delete can be tried again.

## Reading a Pasted Transcript

Added 2026-11-17 for the Client Review item "Applications: Clickable transcript". On every call (Call 1, Call 2 and the extra calls), clicking a pasted transcript on the Screening tab opens the whole text in a dialog (`ViewTranscriptDialog.jsx`) with a scrollable area, a Copy text button and Close. It replaces the earlier Show all button, which expanded the text inside the page. Uploaded transcript files are not changed. This is a screen change only: no server or data change. It has not been tried in a browser.

## Files

- Server: `server/screening/callsStore.js`, `server/screening/routes.js`, `server/aiReview/reviews.js`, `server/aiReview/applicationFields.js`, `server/aiReview/mockProvider.js`, `server/scripts/createAdditionalCallTranscriptColumn.js`, `server/scripts/databaseSchema.js`.
- Frontend: `src/components/ActiveApplications/Workspace/Screening/` (`ScreeningTab.jsx`, `CallStep.jsx`, `PastedTranscriptRow.jsx`, `ViewTranscriptDialog.jsx`), `src/services/ScreeningService.js`, `src/constants/aiReviews.js`.
