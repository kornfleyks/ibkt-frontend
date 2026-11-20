# Travel Tab

Status: built and tested on the server 2026-11-17. It is not deployed, and the tab has not been tried in a browser.

The client brief asks for a travel date and for the crate size and weight on every case. The Travel tab on the application page was an empty placeholder, and the app could not show or edit a travel case. The tab now shows and edits the application's travel record.

## Decisions (2026-11-17)

| Topic | Decision |
|---|---|
| Scope | Columns and a Travel tab on the application page. |
| Fields shown | The core fields only: status, travel date, arrival date, crate size, crate weight with unit, flight number, departure airport, arrival airport and travel notes. The checklist, costs, contacts and collection method stay on Monday. |
| Weight | A free number with a kg or lb choice next to it. |

## Monday Board

The Travel board already had a Travel Date column, an Arrival Date column and a numbers column titled Weight (kg). They were empty and were not used by the app. On 2026-11-17 the script `server/scripts/addTravelWeightUnitColumn.js` did two things on the live board:

- It renamed the title Weight (kg) to Crate Weight (the column id and its database column name `weight_kg` did not change).
- It created a status column Weight Unit with the labels kg and lb.

The ids are in `src/constants/boards/travel.js`, and the database mirror was refreshed with `node scripts/databaseSchema.js --refresh`.

## How It Works

- An application has at most one travel record. The tab shows a Start travel button when there is none. Starting one creates the record with the status Planning, linked to the application and to its cat, and an optional travel date.
- Each field is saved on its own. The server answers the saved record, so the tab always shows what was stored.
- The crate weight is saved together with its unit. A weight saved without a unit gets kg. Emptying the weight clears the unit as well.
- The weight must be above 0 and is rounded to 2 decimals. The arrival date cannot be before the travel date.
- Only Admins and the application's Case Owner can use the tab, like the other application tabs.
- Changes are written to the activity log like other record changes.

The server code is in `server/travel/`. It reads and writes the database when `travel` is in `DATABASE_BOARDS` and Monday otherwise, with the same rules in both. The pure rules are in `server/travel/rules.js`. The tab is in `src/components/ActiveApplications/Workspace/Travel/`.

## Travel Tab on the Cat Page

Added 2026-11-17. The Travel tab of the cat page (it said "Travel Coming Soon") shows and edits the travel record of the application the cat is matched to. It is the same record, with the same fields, rules and activity log as the application's Travel tab, so an edit on one page shows on the other.

Decisions (2026-11-17):

| Topic | Decision |
|---|---|
| Edit | Editable on both pages. |
| Who sees it | The same rule as the application: Admins and the application's Case Owner. Other staff see a note that the travel details are restricted. |
| No application | A plain message that the cat is not matched to an application yet. |
| Starting a record | Only from the application. A matched cat with no record shows a button that opens the application's Travel tab. |

The cat is matched to its application through the cat's linked application. A bonded group of cats shows the same record on each cat. The tab is `src/components/Cats/Workspace/CatTravelTab.jsx`, and it uses the same field component as the application tab (`TravelFields.jsx`).

## Endpoints

- `GET /api/applications/:id/travel` answers `{ record }`, with `record` null when there is none.
- `POST /api/applications/:id/travel` starts the record.
- `POST /api/applications/:id/travel/:recordId` changes it.

- `GET /api/cats/:id/travel` answers `{ record, application: { id, name } }` for the Travel tab of the cat. Both are null when the cat has no application, and `record` is null when the application has none. It answers 403 for a user who may not see the application.
- `POST /api/cats/:id/travel/:recordId` changes the record from the cat page, with the same rules.

The existing `GET /api/travel` list (used for the Dashboard count) is unchanged.

## Not Changed

- Nothing in the app lists all travel cases. The Dashboard still shows the count only.
- The other columns of the Travel board are not in the tab.
- Nobody is notified about travel changes.

## Testing

- **Rules (15 checks):** weight and unit handling, clearing, rounding, refusals and the date order.
- **Routes (21 checks, live, on the test application, record deleted afterwards from the database, Monday and the queue):** no record, start, a second start refused, saving each field, the kg default, changing the unit, clearing the weight, refusals (unit, size, status, negative weight, dates, a link field, nothing to change), a record reached through another application, and the stored database row.

- **Cat page routes (26 checks, live, on the test application and two throwaway cats, all deleted afterwards and the application's cat link restored):** a cat with no application, a matched cat with no record, the record shown on the cat page, an edit made on the cat page showing on the application and the other way round, the same rules and refusals on the cat route, a record that is not on the cat's application, bad and unknown cat ids, and a Volunteer who is not the Case Owner refused (403) on both routes. A record started on the application linked to its cat.

Not tested: the tabs in a browser, and Monday mode.
