// One-off: seeds the review_items punch-list (server/reviewItems/,
// src/pages/ReviewItems) with the questions and flags prepared for the
// 2026-10-04 client call. Safe to re-run: an item with the same title is
// left alone, not duplicated.
//
//   node scripts/seedReviewItems.js
import "dotenv/config";
import { query, closeDatabase } from "../database/db.js";
import { createReviewItem } from "../reviewItems/store.js";

const ITEMS = [
  {
    category: "question",
    title: "Should the app take over the adoption process, or just watch it?",
    detail:
      "Jotform's own approval workflow currently runs the whole process (calls, video step, declines, sending the Adoption Form, emailing referees); the app just follows along by reading each form as it arrives. Is the long-term plan to move those steps into the app, or keep Jotform running it with the app recording what happens?",
  },
  {
    category: "question",
    title: "How are UAE applicants sent their form today?",
    detail:
      "Jotform's workflow never sends the UAE Adoption Form & Agreement automatically, only the UK/US one. Someone must be sending UAE applicants a link some other way - who, and how?",
  },
  {
    category: "question",
    title: "Who manages DNS for ittybittykittytails.com?",
    detail:
      "The domain is on Wix. To let the app send its own emails (so volunteers don't have to copy-paste Jotform links by hand), someone needs to add a few DNS records there.",
  },
  {
    category: "flag",
    title: "A Google Drive integration on an old Jotform form still has a saved OAuth token",
    detail:
      "The disabled \"Mask Covers For A Cause\" form still has a Google Drive integration with an OAuth auth code and access token from 2020-2021, readable by anyone with the account's API key. The client should remove that integration and revoke Jotform's access in their Google account (Google Account > Security > Third-party access).",
  },
  {
    category: "flag",
    title: "Jotform storage is over the plan limit",
    detail:
      "/user/usage reports about 14.76 GB of uploads against the Silver plan's 10.74 GB limit. Worth asking if uploads are being refused - that would silently lose photos and signatures.",
  },
  {
    category: "question",
    title: "Which of the 7 unused Jotform forms can be deleted?",
    detail:
      "USA versions of the adoption forms, old clones, the Photography Waiver, the Welfare Check Form. Housekeeping, not urgent.",
  },
  {
    category: "flag",
    title: "3 Jotform webhooks still need adding",
    detail:
      "Reference Check - IBKT, Pet Adoption Contract - England & Wales only, and Pet Adoption Contract - Scotland only don't have the app's webhook yet (checked 2026-10-04). Same URL as the other forms - this is on the client's side to add.",
  },
  {
    category: "flag",
    title: "11 submissions are sitting unmatched",
    detail:
      "10 UAE applications and 1 UK/US Adoption Form (Erik Prochazka) have no Pre-Adoption Form with a matching email, so the app couldn't find an application to attach them to. Needs a person to look them up and either link them by hand or let them go.",
  },
  {
    category: "internal",
    title: "Clean up Users board roles (Admin/Volunteer vs Adopter/Rescuer/Foster)",
    detail:
      "The Users 'Role' column mixes staff login roles with external party types that already have their own records elsewhere. Recommendations given 2026-09-25; decisions still pending. Not something to raise with the client unless we want their input on whether fosters need their own portal eventually.",
  },
];

for (const item of ITEMS) {
  const { rows } = await query("select 1 from review_items where title = $1", [item.title]);

  if (rows.length > 0) {
    console.log(`Already there: ${item.title}`);
    continue;
  }

  await createReviewItem(item);
  console.log(`Added: ${item.title}`);
}

await closeDatabase();
process.exit(0);
