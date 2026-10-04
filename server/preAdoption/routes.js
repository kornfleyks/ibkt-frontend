import { ACTIVE_APPLICATIONS } from "../../src/constants/boards/activeApplications.js";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../../src/constants/statuses/activeApplicationsStatuses.js";
import { answersErrors, PRE_ADOPTION_FORM_ID } from "../../src/constants/forms/preAdoptionForm.js";
import { ROLES, roleSatisfies } from "../../src/constants/roles.js";
import { isDatabaseBoard } from "../database/switches.js";
import { createItem, fieldsFromMondayValues, StoreError } from "../database/boardStore.js";
import { logCreated, actorOf } from "../database/boardRecords.js";
import { listApplications } from "../applications.js";
import { clearCache } from "../mondayCache.js";
import { toApplication, visibleAnswers, preAdoptionColumnsReady, AnswersError } from "./toApplication.js";
import { saveFormAnswers, getFormAnswers } from "./answersStore.js";

// "Add Application" on the Active Applications page: the in-app copy of the
// Pre-Adoption Form (docs/add-application-form.md). Creates the application
// (its Monday item at once - 1 call; the answers reach Monday at the
// nightly sync). Photos are uploaded afterwards to Application Photos
// through /api/upload, like Add Cat's files.
//
//   POST /api/applications                            { answers } -> { id, name }
//   GET  /api/applications/:id/pre-adoption-answers   the saved answers, for Preview

const A = ACTIVE_APPLICATIONS.COLUMNS;
const TABLE = "applications";
const STAGES = ACTIVE_APPLICATIONS_STATUS_OPTIONS.ADOPTION_STAGE;
// An application in any other stage is "open": a second one for the same
// email is refused.
const CLOSED_STAGES = [STAGES.REJECTED_APPLICATION, STAGES.ARCHIVED_APPLICATION, STAGES.COMPLETED_APPLICATION];
const CAN_ADD = [ROLES.ADMIN, ROLES.VOLUNTEER];

async function openApplicationFor(email) {
  const normalized = email.trim().toLowerCase();

  return (await listApplications()).find(
    (application) => application.email?.trim().toLowerCase() === normalized && !CLOSED_STAGES.includes(application.adoptionStage),
  );
}

export function registerPreAdoptionRoutes(app, { requireAuth }) {
  app.post("/api/applications", requireAuth, async (req, res) => {
    if (!roleSatisfies(CAN_ADD, req.user.role)) {
      return res.status(403).json({ error: "Only Admins and Volunteers can add applications." });
    }

    if (!isDatabaseBoard(TABLE)) {
      return res.status(409).json({ error: "Applications are still kept on Monday on this server." });
    }

    if (!preAdoptionColumnsReady()) {
      return res.status(503).json({ error: "The Pre-Adoption columns aren't set up yet (run scripts/createPreAdoptionColumns.js)." });
    }

    const answers = req.body?.answers;

    if (!answers || typeof answers !== "object") {
      return res.status(400).json({ error: "The form answers are missing." });
    }

    const errors = answersErrors(answers);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: "Some answers are missing or invalid.", fields: errors });
    }

    try {
      const { name, email, columnValues } = toApplication(answers);
      const existing = await openApplicationFor(email);

      if (existing) {
        return res.status(409).json({
          error: `${existing.name || "Someone"} already has an open application with this email.`,
          existingId: existing.id,
        });
      }

      const fields = await fieldsFromMondayValues(TABLE, {
        ...columnValues,
        [A.ADOPTION_STAGE]: { label: STAGES.NEW_APPLICATION },
        // Whoever fills it in owns the case.
        [A.CASE_OWNER]: { item_ids: [Number(req.user.sub)] },
      });
      const record = await createItem(TABLE, { name, fields });

      // For the application page's Preview. The application exists either
      // way - a failure here only means no Preview for it.
      await saveFormAnswers({ applicationId: record.id, formId: PRE_ADOPTION_FORM_ID, answers: visibleAnswers(answers), createdBy: req.user.sub })
        .catch((err) => console.error(`Add application: couldn't save the answers of ${record.id} for Preview.`, err.message));

      clearCache([ACTIVE_APPLICATIONS.BOARD_ID]);
      logCreated({ actor: actorOf(req), table: TABLE, boardName: "Active Applications", record: { id: record.id, name }, raw: { source: "Add Application (Pre-Adoption Form)" } });

      res.json({ id: String(record.id), name });
    } catch (err) {
      if (err instanceof AnswersError) return res.status(400).json({ error: err.message });
      if (err instanceof StoreError) return res.status(err.status ?? 500).json({ error: err.message });
      if (err.rateLimited) return res.status(429).json({ error: err.message, retryAfterSeconds: err.retryAfterSeconds });

      console.error("Add application failed:", err);
      res.status(500).json({ error: "Failed to add the application." });
    }
  });

  // The answers an application was created with, for Preview:
  // { answers, createdAt }, or 404 when it has none (e.g. created before
  // Add Application existed).
  app.get("/api/applications/:id/pre-adoption-answers", requireAuth, async (req, res) => {
    if (!roleSatisfies(CAN_ADD, req.user.role)) {
      return res.status(403).json({ error: "Only Admins and Volunteers can view application forms." });
    }

    try {
      const saved = await getFormAnswers(req.params.id, PRE_ADOPTION_FORM_ID);

      if (!saved) return res.status(404).json({ error: "No Pre-Adoption answers for this application." });

      res.json(saved);
    } catch (err) {
      console.error("Pre-adoption answers request failed:", err);
      res.status(500).json({ error: "Failed to load the application form." });
    }
  });
}
