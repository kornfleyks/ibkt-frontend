# Draft adverts for cats

When a cat is added, Claude writes a draft adoption advert for it. The draft is shown on the Advert tab of the cat page, where staff can ask for a new one. A draft is never published. Accepting and rejecting a draft are separate steps that are not built yet.

## How it works

- Every way of adding a cat (staff Add Cat, the rescuer portal, a cat share link) goes through `createCatFromInput` in `server/cats.js`. At the end it calls `startAdvertDraft`, which writes the draft in the background. A failure never stops the cat from being added.
- `server/adverts/generate.js` builds the request from the cat's details and calls the Claude API with the instructions from `server/adverts/instructions.md`.
- Each generation is one row in the table `cat_advert_drafts`, either a draft or a failure with its error. The newest row is the one shown.
- Staff ask for a new draft with `POST /api/cats/:id/advert-draft`. `GET` on the same path returns the newest draft. Both are limited to staff roles.
- Staff can edit the draft by hand with the Edit button, or write one from scratch. `POST /api/cats/:id/advert-draft/edit` saves the text as a new row with the reason `edit`, so the AI's text stays in the history. Edits work when drafts are switched off and do not count towards the daily cap.
- Every call is counted on the Claude card of the App Settings page (`server/aiUsage/`).

## Mia's instructions

The file `server/adverts/instructions.md` holds the instructions. Mia's instructions have not been provided, so the file contains a neutral default. Replace the text below the line in that file with Mia's instructions. The file is read on every call, so no code change is needed.

## Data sent to Claude

Only these details of the cat are sent: name, age, gender, breed, colour, energy level, lap cat, good with children, cats and dogs, indoor only, personality, special notes, medical summary, vaccinated, neutered or spayed, FeLV and FIV status, and whether medication is needed. Values that say nothing, such as Unknown and N/A, are left out.

The rescuer, the foster, their contact details, the location, the microchip number and photos are never sent. The personality and special notes are free text typed by people, so the prompt tells Claude to treat them as data and to leave out contact details.

## Settings

| Setting | Meaning |
| --- | --- |
| ADVERT_DRAFTS_ENABLED | Set to true to make drafts. Off by default, so nothing is sent to Claude until it is set. |
| ADVERT_MODEL | The Claude model. Default claude-sonnet-5-5. |
| ADVERT_DRAFTS_MAX_PER_DAY | The most drafts made in one day (UTC), counting failures. Default 50. |
| ANTHROPIC_API_KEY | The API key of the Claude account. |
| ANTHROPIC_WORKSPACE_ID | The workspace of the key, sent as a header. |

On Render, set these as environment variables. Never put the key in the repository.
