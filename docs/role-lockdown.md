# Role Lockdown

Status: staff-only access built and tested 2026-11-11. By decision on 2026-11-11, Volunteers keep reading the Travel, Post-Adoption and Rescuers lists (see Decisions). The change is not deployed and the sign-in refusal has not been tried in a browser.

## The Problem

Before this change the server let any signed-in account call every staff route that used `requireAuth`, except the Rescuer role, which had been locked out on 2026-10-16. An approved Adopter or Foster could therefore read all applications, the full Pre-Adoption answers (names, emails, phones, addresses), all cats, tasks, the Travel, Post-Adoption and Rescuers lists, and the whole Activity Log. They could also create and edit cats and tasks, create applications and upload files. The frontend only hid the pages.

Editing an application, the Screening, Contracts, Payments and AI review routes and every `/api/admin` route were already limited to Admins or the application's Case Owner, and were not affected.

## What Changed

- Only staff roles (Admin, Super Admin, Volunteer) pass `requireAuth`. The list is `STAFF_ROLES` in `src/constants/roles.js`.
- Any other role, including Adopter, Foster, a role added later or no role, is refused with a 401 and the code `NOT_STAFF`. The app signs that session out and shows an explanation.
- The Rescuer role keeps its own refusal (403, code `PORTAL_ONLY`) and its portal routes, which use `requireAnyAuth`.
- The staff sign-in page refuses an account whose role is not a staff role, after the password was checked, so it does not reveal which emails exist.
- The rule is deny by default. A new external role is closed without anyone having to remember to block it.
- The role is read from the live account state, not from the token. A token that claims Admin does not help.

## Effect on Accounts

On 2026-11-11 the Users table had 2 Super Admins, 1 Active Adopter and 1 Blocked Adopter, and no Volunteers or Fosters. The Active Adopter can no longer sign in to the app.

Update 2026-11-25: the Adopter role was removed from the app. Self-registration (`/register`) now creates Volunteer accounts with the status Pending. The account cannot sign in until an Admin approves it, and approving it gives Volunteer access to the staff app, so an Admin should check who the person is first. The Users page no longer offers Adopter, and the server refuses any role the app does not know. The one account that still had the Adopter role was changed to Volunteer. The label Adopter may still exist in the Role column on the Monday Users board, where it can be deleted.

## Not Changed

- The menu and route lists in the frontend still name Foster for the Dashboard and Cats. They have no effect now.
- `requireAnyAuth` routes (log out, the session stream and the rescuer portal) stay open to every signed-in account.

## Decisions

- **2026-11-11, staff only by default.** Only Admin, Super Admin and Volunteer use the staff app.
- **2026-11-11, Volunteers keep the Travel, Post-Adoption and Rescuers lists.** The brief makes Travel and Post-Adoption admin only, but Volunteers use these lists: the Dashboard reads `/api/travel` and the Add Cat and cat Overview screens read `/api/rescuers` for the rescuer picker. The lists return only names and statuses, and the records themselves (the Travel and Post Adoption tabs) are already limited to Admins and the application's Case Owner. Making the lists Admin only would break those screens, so they stay as they are. If the client later wants them Admin only, the Dashboard and the rescuer picker need a Volunteer-safe replacement first.

## Open Points

- Whether the registration page should stay open, since approving a sign-up now gives Volunteer access.

## Testing

The real `requireAuth` was tested in an isolated app with tokens for real accounts: Super Admin passes, the Active Adopter is refused with `NOT_STAFF` even with a token that claims Admin, the Adopter still passes `requireAnyAuth`, a Blocked account is refused as inactive, and missing or bad tokens give 401. The sign-in refusal and the frontend sign-out message were not exercised in a browser.
