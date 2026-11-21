# Public Forms

Status: built 2026-11-11. The conversion and the routes are tested. The pages are not yet clicked through in a browser, and no submission has been applied to a real application yet (see Testing).

The app has its own copies of four of the client's Jotform forms. Each has a public page that needs no sign-in, and each is listed on the Forms page (sidebar item Forms) with Copy link and Open.

| Form | Address | Jotform form it copies | What a submission does |
|---|---|---|---|
| Pre-Adoption Form | `/forms/pre-adoption` | 203096212272447 | Creates a new application in stage New Application. |
| Adoption Form and References | `/forms/adoption-form` | 211304838746458 | Adds the answers to the applicant's application. |
| UAE Adoption Form & Agreement | `/forms/uae-adoption-form` | 202981102716450 | Adds the answers to the application and marks the contract as signed when the adopter signs. |
| Reference Check | `/forms/reference-check` | 220642582493458 | Adds a reference to the application, shown under References. |

## Decisions (2026-11-11)

| Topic | Decision |
|---|---|
| Storage | A submission is applied to the application exactly as a Jotform submission is. It is converted to the answer shape of a Jotform submission and passed to the existing handler in `server/jotform`. |
| Matching | Same as Jotform. The link may carry `?applicationId=` (from Send Adoption Form). Otherwise the handler matches by email, then by name. A submission with no match is kept as unmatched and every Active Admin gets a bell notification. The applicant still sees a normal thank-you message. |
| Signatures | A typed full name, not a drawn signature. |
| UAE vet cost | A free text box on the form, as on Jotform. The agreement text shows the amount typed. |
| Uploads | Included (Pre-Adoption photos, adoption form ID documents, Emirates ID). At most 10 MB a file, 10 files a question and 20 a form. The file types are Jotform's list without html. |
| Jotform | Unchanged. Send Adoption Form still builds Jotform links, and the Jotform webhook and handlers keep working. |

## How It Works

1. The page (`src/pages/PublicForm`) draws the form from its definition in `src/constants/forms/publicForms.js`. The definitions are copied from the live Jotform forms, so the questions, order, required fields and wording are the same.
2. When the applicant submits, each chosen file is uploaded to `POST /api/public/form-uploads`. The answers then go to `POST /api/public/forms/:formKey` and carry the file tokens.
3. The server (`server/publicForms/routes.js`) checks the answers against the same definition, converts them with `toJotformAnswers.js`, and stores them in `jotform_submissions` with the id `app-<uuid>` and `received_via` set to `app`.
4. The server answers `ok` and then runs the form's handler in the background. A submission the handler did not finish is handled again at the next server start.
5. The handler copies the files from the temporary store into the application's file column and deletes them.

## Differences from Jotform

- The signature is a typed name. The Reference Check page shows it as "Signed by ..." instead of a link to a signature image.
- The Rescuer/Owner signature, name and date on the UAE form are not shown. Jotform hides them too, and a volunteer fills them in later.
- The two ID uploads on the Adoption Form and the signature block on the UAE form keep Jotform's required flags. The adopter's signature on the UAE form is optional as on Jotform, and the contract is only marked signed when it is filled in.
- In the UAE agreement a space is added where Jotform's text runs the name into the next word.
- The pages are split into steps with Next and Back. Jotform shows the Adoption Form and the Reference Check on one page.
- The "Other" airport on the Adoption Form has a text box that appears when Other is ticked.
- The Pre-Adoption page does not block a second application from the same email. This matches the Jotform handler. The Add Application dialog for staff still blocks it.

## Security

- The routes are open to anyone. They have a hidden bot-trap field, a limit of 10 submissions and 60 uploads per address per hour (kept in memory), strict length caps, and answers cleaned to the shape of each question type.
- A file is kept in the server's temporary folder under a random token. No route serves it. A token that does not exist, or a malformed one, is rejected.
- Every changing request under `/api/public` is also counted per address in `server/requestLimiter.js`: 60 in 10 minutes, then 429 with Retry-After. It counts refused requests too and runs before the body is read. The limits above count only saved submissions and uploads.
- An uploaded file must start with the bytes of the kind its extension names (`server/fileSignature.js`). A program or a script renamed .jpg or .pdf is refused. The foster and rescuer portals use the same check.
- A form is looked up by its own name only, so an address such as `/api/public/forms/constructor` answers 404.
- The reply never says whether an application or a person exists.
- The Reference Check page shows a typed signature as plain text. Before this change the page linked the stored value, so a typed value such as a `javascript:` address would have become a link. Only `https` values are links now.

## Files

- Definitions: `src/constants/forms/` (`publicForms.js`, `adoptionReferencesForm.js`, `uaeAdoptionForm.js`, `referenceCheckForm.js`, and the existing `preAdoptionForm.js`).
- Page and service: `src/pages/PublicForm`, `src/services/PublicFormsService.js`. The question renderer is the one the Add Application dialog uses (`PreAdoptionQuestion.jsx`), with the types date, agreement and custom name labels added.
- Server: `server/publicForms/` (`routes.js`, `toJotformAnswers.js`, `uploadStore.js`), `saveAppSubmission` in `server/jotform/receive.js`, and the upload token support in `server/jotform/uploads.js`.

## Testing

- Done: every form accepts valid sample answers and rejects empty ones. The converted answers go through the real Jotform converters (Pre-Adoption, Adoption Form, UAE form) and give the expected name, email, columns, ID files and summary lines. The routes were tested in an isolated app: unknown form, validation errors, the bot trap, the rate limits and the upload rules. These tests are not part of the repository.
- Not done: opening each page in a browser, and sending a real submission through to an application. A real send writes to Monday and counts against the daily call limit (see monday-daily-limit-testing), so it needs a go-ahead and a throwaway application.
- Not done: a real Mailgun email. The forms send none. Jotform's confirmation emails to applicants are not replaced, because the app only sends emails for the rescuer flow.

## Keeping It in Step with Jotform

When the client edits one of these forms on Jotform, update its definition to match. The script `server/scripts/exportJotformFormStructure.js` downloads the current structure of any form (questions, options, required flags, conditions, no submissions) so the two can be compared.
