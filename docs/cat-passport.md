# Cat Passport

Status: built and tested on the server 2026-11-17. It is not deployed, and the new section has not been tried in a browser.

The Cat Passport (the cat's identity and vaccination details) was a separate Jotform form with 18 fields. Its submissions are only kept in a log table, and the form is sometimes not filled in. The brief wants one structured cat record. The passport details are now fields of the cat, and the Medical tab of the cat has a Passport section to enter them.

## Decisions (2026-11-17)

| Topic | Decision |
|---|---|
| Entry point | A Passport section in the cat record, for signed-in staff. There is no public form and no link for fosters. Fosters send their details to staff. |
| New fields | Five new date columns on the Cats board in Monday, and the same columns in the database mirror. |
| Not built | A private link per cat for fosters, which would need a public form. It can be added later and would write to the same fields. |

## Where Each Jotform Field Went

| Jotform field | In the app |
|---|---|
| Cat name, gender, breed, colour, sterilised | Existing cat fields. |
| FIV/FeLV status | Existing FeLV and FIV status fields on the Medical tab. |
| Any medical conditions | Existing Medical Summary field. |
| Microchip number | Existing field, Admin only. The re-entry check of the form is not needed because the field is edited in place. |
| Upload medical report and passport PDF | Existing file fields (Medical Documents, Passport File) on the Documents tab. |
| Date of birth | New field in the Passport section (the column already existed on the board). |
| Microchip implant date, First Tricat, Booster Tricat, Rabies vaccination, Last dewormed | New date fields in the Passport section. |
| Name of parent or guardian | Not kept. |

## Monday Board

The script `server/scripts/addCatPassportColumns.js` created five date columns on the live Cats board on 2026-11-17: Microchip Implant Date, First Tricat, Booster Tricat, Rabies Vaccination and Last Dewormed. The ids are in `src/constants/boards/cats.js`, together with the existing Date of Birth column. The database mirror was refreshed with `node scripts/databaseSchema.js --refresh`.

## The Passport Section

The section is on the Medical tab of the cat. It shows:

- The six dates. Each is saved as soon as it is edited, and an empty value clears it.
- Whether a passport file is uploaded, with a pointer to the Documents tab.
- **Passport marked complete**, a switch that the Adoption Ready check requires. Before this change the checkbox could only be ticked on Monday. It is now editable in the app. Staff switch it on once the dates and the scanned passport are complete.

Any staff role (Admin, Super Admin, Volunteer) can edit the section. The microchip number stays visible to Admins only.

## Server

The dates and `passportComplete` are writable fields of `POST /api/cats/:id` (`server/cats.js`, `CAT_FIELDS`). The Monday fallback in the browser (`src/services/CatsService.js`) and the Monday mapper (`CatMapper.js`) know the same fields. Changes are logged in the activity log like other cat changes.

## Not Changed

- The Jotform Cat Passport form is untouched. Its submissions are still only logged and are not applied to cats.
- The Passport marked complete switch is manual. Nothing checks that the six dates are filled in.
- Nothing lists cats with missing passport dates.

## Testing

- **Server (22 checks, live, on a throwaway cat, deleted afterwards from the database and Monday):** a new cat has empty passport fields, each date saves and reads back, the database row holds the dates, a date is cleared with null, a wrong format and an impossible date are refused, the Adoption Ready check lists Passport marked complete until it is on, a non-boolean value is refused, a Volunteer can edit the dates and still sees the microchip hidden.
- Lint and build are clean.

Not tested: the section in a browser, and the Monday side of the new columns. The test did not push the Monday queue because 46 other changes were waiting in it. The nightly sync sends the new columns the same way as other date columns, and any failure shows in the sync status.

An impossible date such as 31 February is refused, but the answer carries the database's wording ("date/time field value out of range") instead of a friendly message. The date picker in the app cannot produce such a date.
