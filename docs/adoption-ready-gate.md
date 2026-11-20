# Adoption Ready Gate

Status: built and tested on the server 2026-11-11. It is not deployed, and the screens have not been tried in a browser. The path where an Admin sets a cat anyway was tested as a decision only, not as a real change to a cat.

The client brief asks the system to prevent listing a cat unless all required fields are complete. A cat can now be set to Adoption Ready only when its profile, medical details, passport and media are complete. Matching only offers Adoption Ready cats, so an incomplete cat can no longer be matched by mistake.

## Decisions (2026-11-11)

| Topic | Decision |
|---|---|
| Required list | The full list below: profile, medical, passport and media. |
| Unknown values | "Unknown", "N/A", "Not Tested Yet" and "Pending" count as missing. |
| Enforcement | The change is refused for everyone. An Admin or Super Admin can set it anyway by giving a reason, which is saved in the Activity Log. |
| Existing cats | A cat that is already Adoption Ready is not touched. The rule applies only when a cat is set to Adoption Ready. |
| Returning cats | A Reserved or Adopted cat that goes back to Adoption Ready (a match that fell through) is not checked, because it was ready before. |

## Required List

- **Profile:** gender, age, breed, colour, energy level, personality summary, and child, cat and dog friendliness answered.
- **Medical:** vaccinated (Yes or Planned), sterilised (Yes or Planned), FeLV and FIV tested (Negative or Positive), medical summary, and a microchip number.
- **Passport:** Passport Complete ticked and a passport file uploaded.
- **Media:** at least 6 photos and 3 videos. These are the minimums the client's Kitty Profile form asks for.

The list and the two minimums are in `src/constants/catReadiness.js`. Both the server and the screens use that file.

## How It Works

- The cat page lets a user change the status in two places, the header and the Overview tab. Both send the change to `POST /api/cats/:id`.
- When the status is set to Adoption Ready, the server reads the cat with its real values and works out what is missing (`server/adoptionReadyGate.js`). A hidden microchip number still counts, so the check does not depend on who is asking.
- If something is missing the server answers 409 with the code `NOT_READY`, the list of missing items, and whether the caller may override.
- The screens show a dialog with the missing items grouped as Profile, Medical, Passport and Media. For an Admin the dialog has a reason field and a Set anyway button. The reason is sent as `overrideReason`.
- An override is saved in the Activity Log with what was missing and the reason.
- The Overview tab has an Adoption readiness card that lists what is missing, or says the cat is ready. It uses `GET /api/cats/:id/readiness`.
- Changes the server makes on its own, such as Matching returning a cat to Adoption Ready, do not go through the check.

## Not Changed

- The Profile Complete and Media Complete boxes on the Cats board are still not set. The check works from the cat's real data instead of those boxes. They could be set automatically later.
- The separate Adoption Ready Yes or No column is not used.

## Testing

55 checks pass.

- **Rules:** every rule was tested at its edge, including 5 and 6 photos, Planned and No, and a cat with nothing filled in.
- **Decision:** exempt statuses, checked statuses, a Volunteer's reason being ignored, an Admin with and without a reason, and a reason that is too long.
- **Real routes:** in an isolated app, the readiness endpoint answered for all 7 cats and matched the rules. A Volunteer, and an Admin without a reason, were refused with 409 for a real cat that is not ready. A reason that is too long was a 400. The cat's status stayed unchanged after every refusal.

Not tested: setting a real cat to Adoption Ready with an override and the Activity Log entry it writes (it changes a real cat), and the dialog and card in a browser.
