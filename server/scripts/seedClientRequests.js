// One-off: seeds the "request" category of the review_items punch-list
// (server/reviewItems/, src/pages/ReviewItems) with the client change
// requests for Oriel noted on 2026-11-24. Requires the review_items category
// check to include "request" (run scripts/databaseSchema.js first).
// Safe to re-run: an item with the same title is left alone, not duplicated.
//
//   node scripts/seedClientRequests.js
import "dotenv/config";
import { query, closeDatabase } from "../database/db.js";
import { createReviewItem } from "../reviewItems/store.js";

const ITEMS = [
  {
    title: "Replace the current logos with the new logos",
    detail:
      "Note: the logo files are stored by the user, who will provide them when the task starts.",
  },
  {
    title: "Rename the app to Oriel",
    detail:
      "Note: Oriel is the name of the app. The rename applies only inside the app. Emails, the domain and the repository are not renamed.",
  },
  {
    title: "The app has three audiences: admins, rescuers and volunteers",
    detail:
      "Note: these are the role names the app already uses. No new screens are needed for now.",
  },
  {
    title: "Keep the foster flow as it is",
    detail: "The foster flow does not change.",
  },
  {
    title: "The adoption journey has seven steps, as shown in the artifact",
    detail: "Note: the user will provide the artifact later.",
  },
  {
    title: "Connect the Wix rescuer form to the app",
    detail:
      "On submission, the form data is sent to the app.\n\nNote: the user will provide the form fields when work on this task starts.",
  },
  {
    title: "Webhook for the Wix rescuer form: email the rescuer pack link on submission",
    detail:
      "On submission, the rescuer automatically receives an email containing a link to the rescuer pack.\n\nNote: our app calls the Wix API to send the email. The user will provide more details when work starts. The client's contact asked Claude about this approach.",
  },
  {
    title: "Add a form that rescuers complete before signing up to use Oriel",
    detail:
      "Use placeholder content for now.\n\nNote: the form is used for screening and for collecting details. The answers are stored in the app.",
  },
  {
    title: "Remove the approve/reject step for rescuers",
    detail:
      "A rescuer can use the app immediately after signing up.\n\nNote: the step is bypassed, not deleted. The existing statuses stay in the data model.",
  },
  {
    title: "Make the add cat form shareable",
    detail:
      "The form can be sent to someone who fills it in.\n\nNote: the shared link is public. The link can be used only once.",
  },
  {
    title: "Add cat form: ask a foster without a profile for their details",
    detail:
      "When a foster has no profile, the form asks for first name, surname, email and phone.\n\nNote: this foster is a user who is not logged in.",
  },
  {
    title: "Dashboard button to invite someone to fill in the add cat form",
    detail:
      "The button is visible only to rescuers, admins and super admins. It opens a form with an email field and a full name field. On submission, the app sends an email to that person with a link to the add cat form.\n\nNote: the invitation link expires after 3 days. After that, the invitation must be sent again. The app records who sent each invitation.",
  },
  {
    title: "When a cat is added, the AI creates a draft advert",
    detail:
      "The AI runs after the cat is added and creates the advert as a draft, following Mia's instructions.\n\nNote: the user will provide Mia's instructions and the remaining details when work starts.",
  },
  {
    title: "Mia accepts or rejects the draft advert",
    detail:
      "Note: Mia can edit the draft. When Mia rejects a draft, the AI regenerates it.",
  },
  {
    title: "When Mia accepts the draft, add the cat to Wix through the API",
    detail:
      "Note: the Wix API, the target collection and the credentials will be discussed when work starts.",
  },
  {
    title: "Material the user will provide later",
    detail:
      "Logo files, the adoption journey artifact, the Wix form fields, Wix API details and credentials, and Mia's instructions.",
  },
];

for (const item of ITEMS) {
  const { rows } = await query("select 1 from review_items where title = $1", [item.title]);

  if (rows.length > 0) {
    console.log(`Already there: ${item.title}`);
    continue;
  }

  await createReviewItem({ category: "request", ...item });
  console.log(`Added: ${item.title}`);
}

await closeDatabase();
process.exit(0);
