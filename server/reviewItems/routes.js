import { answer, HttpError } from "../httpAnswer.js";
import { listReviewItems, createReviewItem, updateReviewItem, deleteReviewItem } from "./store.js";

// A standing punch-list for client calls (server/scripts/databaseSchema.js
// review_items table). Admin-only on the server, same as App Settings; the
// page itself is further restricted in the frontend to one developer
// account (src/routes/AppRoutes.jsx), not re-checked here (see server
// README "Review items").
//
//   GET    /api/review-items           { items }
//   POST   /api/review-items           { category, title, detail? } -> { item }
//   POST   /api/review-items/:id       { category?, title?, detail?, status?, answer? } -> { item }
//   DELETE /api/review-items/:id       -> { deleted: true }

const CATEGORIES = new Set(["question", "flag", "internal"]);
const STATUSES = new Set(["open", "answered", "resolved"]);
const ID_PATTERN = /^\d+$/;

async function create(req) {
  const { category, title, detail } = req.body ?? {};

  if (!CATEGORIES.has(category)) throw new HttpError(400, "category must be one of question, flag, internal.");
  if (!String(title ?? "").trim()) throw new HttpError(400, "A title is required.");

  return { item: await createReviewItem({ category, title: title.trim(), detail }) };
}

async function update(req) {
  if (!ID_PATTERN.test(req.params.id)) throw new HttpError(400, "Invalid id.");

  const { category, title, detail, status, answer: answerText } = req.body ?? {};

  if (category !== undefined && !CATEGORIES.has(category)) throw new HttpError(400, "category must be one of question, flag, internal.");
  if (status !== undefined && !STATUSES.has(status)) throw new HttpError(400, "status must be one of open, answered, resolved.");
  if (title !== undefined && !String(title).trim()) throw new HttpError(400, "The title can't be empty.");

  const changes = {};

  if (category !== undefined) changes.category = category;
  if (title !== undefined) changes.title = title.trim();
  if (detail !== undefined) changes.detail = detail;
  if (status !== undefined) changes.status = status;
  if (answerText !== undefined) changes.answer = answerText;

  const actorName = `${req.user.firstName} ${req.user.lastName}`.trim();
  const item = await updateReviewItem(req.params.id, changes, actorName);

  if (!item) throw new HttpError(404, "Not found.");

  return { item };
}

async function remove(req) {
  if (!ID_PATTERN.test(req.params.id)) throw new HttpError(400, "Invalid id.");

  return { deleted: await deleteReviewItem(req.params.id) };
}

export function registerReviewItemRoutes(app, { requireAuth, requireAdmin }) {
  app.get("/api/review-items", requireAuth, requireAdmin, (req, res) => answer(res, listReviewItems().then((items) => ({ items })), "review items"));
  app.post("/api/review-items", requireAuth, requireAdmin, (req, res) => answer(res, create(req), "review items"));
  app.post("/api/review-items/:id", requireAuth, requireAdmin, (req, res) => answer(res, update(req), "review items"));
  app.delete("/api/review-items/:id", requireAuth, requireAdmin, (req, res) => answer(res, remove(req), "review items"));
}
