# Sensitive Fields

Status: built and tested on the server 2026-11-11. It is not deployed, and the screens have not been tried in a browser.

The client brief asks for control over who sees sensitive data, such as a cat's microchip number. Before this change every staff user received the number with every cat.

## Decisions (2026-11-11)

| Topic | Decision |
|---|---|
| Who sees and edits the microchip number | Admin and Super Admin only. The list is `SENSITIVE_FIELD_ROLES` in `src/constants/roles.js`. Adding `ROLES.VOLUNTEER` there lets Volunteers see it too. |
| What other roles get | The server answers "Hidden" instead of the number, and refuses a change with 403. |
| Adding a cat | Any staff user, and a rescuer in the rescuer portal, may type a microchip number when adding a cat. They never see it again afterwards unless they are an Admin. |

## How It Works

- The cats routes (`GET /api/cats`, `GET /api/cats/:id`, and the answers of creating and editing a cat) hide the number for other roles in `server/sensitiveFields.js`. Hiding is done by the server, so it does not depend on the screens.
- `POST /api/cats/:id` refuses a change to the microchip number from a role that may not see it.
- The Activity Log hides the old and new value of the microchip number, and the description that quotes them, for other roles. This applies to entries already in the log. The raw details of an entry are never sent to the app.
- Server code that works on the cats directly is not affected. The contract import matches a contract to a cat by microchip number from the cats it reads itself.
- Screens: the cat Medical tab shows "Hidden (only Admins can see it)" without an edit button for other roles. The header search and the Cats page search do not show or match the hidden value, and the Cats page search hint leaves out "microchip".

## Adding Another Sensitive Field

Add its key to `SENSITIVE_CAT_FIELDS` in `server/sensitiveFields.js` and make sure the screens that edit it check `canSeeSensitiveFields`. For a field on another board, add a mask for that board's routes in the same way.

## Testing

33 checks pass. The helpers were tested for every role. The real cat and activity routes were tested in an isolated app as an Admin and as a Volunteer: the Volunteer receives "Hidden" for every cat and none of the real numbers appear anywhere in the answer, the Admin sees them, and a Volunteer's attempt to change the number is refused and leaves the cat unchanged. The activity log had no microchip entries yet, so the redaction was tested on sample entries.

Not tested: adding a cat as a Volunteer with a microchip number (it writes a cat to Monday), and the screens in a browser.
