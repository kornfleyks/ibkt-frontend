# Cat Update Check

Status: built and tested on the server 2026-11-11. The table `cat_update_clock` was created in the database the same day. It is not deployed, and the screens have not been tried in a browser. The step that sends the notifications was not run on real cats (see Testing).

The client brief asks for a 3-month update trigger for unadopted cats. A cat that has been Adoption Ready for 3 months now gets its Update Requested flag set and the Admins and Volunteers are told to ask the rescuer or foster for news. Someone records the news with an Update received button, which restarts the 3 months.

## Decisions (2026-11-11)

| Topic | Decision |
|---|---|
| Who is told | Every active Admin, Super Admin and Volunteer, with a notification in the bell. |
| Where the 3 months count from | From the day the cat became Adoption Ready, and after an update from the day it was recorded. |
| What counts as received | Someone presses Update received on the cat page, with an optional note. Editing the cat does not count. |
| Overdue | A request that nobody answers for 14 days becomes Overdue, with a second notification. |
| Existing cats | A cat that is already Adoption Ready starts counting on the day the check first sees it, because the app never recorded when it became ready. |

The 3 months and the 14 days are `UPDATE_AFTER_MONTHS` and `OVERDUE_AFTER_DAYS` in `src/constants/catUpdates.js`.

## How It Works

- The server records a date for every cat that becomes Adoption Ready, in the table `cat_update_clock` (one row per cat, not sent to Monday). It does this when the status changes through the app or through Matching, because `changeCat` in `server/cats.js` calls the hook. A cat that leaves Adoption Ready loses its row, and its flag goes back to Not Due.
- A daily check (`server/catUpdates/check.js`) runs 2 minutes after the server starts and then every 24 hours. A server that sleeps catches up at its next start.
  - A cat with no row gets one starting today.
  - Three months after the start, the flag becomes Requested and every active Admin, Super Admin and Volunteer gets a notification that links to the cat.
  - If the request is still open after 14 days, the flag becomes Overdue and they are told again.
  - A row whose cat is no longer Adoption Ready is removed.
- Each step happens once per cat. The step is claimed in the database first, so a restart, or two servers running the check, do not send the same notification twice.
- On the cat's Overview tab, an Update check card shows the flag, the date it became Adoption Ready, the next update due, the request date and the last update received with its note. The Update received button opens a dialog for the note. Recording an update restarts the clock, closes any request and sets the flag to Received.
- The flag is set only by the check and by Update received. A request to change it through the cat route is refused.

## Files

- Server: `server/catUpdates/` (`clockStore.js`, `statusHook.js`, `check.js`, `routes.js`), `server/cats.js` (the flag field, the hook and `setUpdateFlag`), `server/index.js` (routes and the daily check), `server/scripts/databaseSchema.js`.
- Shared: `src/constants/catUpdates.js`, the notification type `CAT_UPDATE` in `src/constants/statuses/notificationsStatuses.js`.
- Screens: the Update check card in `src/components/Cats/Workspace/OverviewTab/OverviewTab.jsx`, and `src/services/CatsService.js`.

## Not Changed

- The flag is on the Cats board and is copied to Monday by the nightly sync. The clock table is not.
- There is no dashboard count or Cats page filter for cats with a request open. This can be added later.
- The notification goes to the bell only. No email is sent.

## Testing

- **Timing (33 checks):** the plan of what the check does was tested with made-up cats and clocks: not due, due exactly now, one day early, requested, overdue, already overdue (no repeat), restart after an update, every other status, and several cats at once.
- **Database (live, with made-up cat ids that were removed):** five servers claiming the request at once gave exactly one winner. The overdue claim, restarting the clock after an update, resetting and clearing, and the status hook all behaved correctly. The due date is 3 months after the start.
- **Routes (live, on the existing test cat "test 1", restored afterwards):** the clock state, 404 for an unknown cat, "does not apply" for an Archived cat, Update received with and without a note, a note that is too long, a cat that is not Adoption Ready, and the refusal to set the flag through the cat route. The Activity Log has the recorded update and the flag change.

Not tested: the request and overdue steps on real cats, because they send notifications to real people. The bell notification itself was not exercised. The screens in a browser were not tried.
