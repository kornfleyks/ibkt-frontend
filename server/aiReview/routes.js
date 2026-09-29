import { requireApplicationAccess } from "../applicationAccess.js";
import { answer } from "../httpAnswer.js";
import { actorOf, InputError } from "../database/boardRecords.js";
import { reviewState, startReview, acceptReview, discardReview, getReview } from "./reviews.js";

// AI reviews of an application (the Overview's AI Review card and the
// Screening tab). Admins and the application's Case Owner only.
//
//   GET  /api/applications/:id/ai                      { provider, available, mock, draft | null, runs }
//   POST /api/applications/:id/ai/reviews              { kind: "form_review" | "call_1_review" | "call_2_review" } -> { run }
//   GET  /api/applications/:id/ai/reviews/:runId       { run } with its input
//   POST /api/applications/:id/ai/reviews/:runId/accept   -> { run, values }
//   POST /api/applications/:id/ai/reviews/:runId/discard  -> { run }

function runIdOf(req) {
  if (!/^\d+$/.test(req.params.runId ?? "")) throw new InputError("Invalid AI review id.");

  return req.params.runId;
}

function person(req) {
  return { id: String(req.user.sub), name: actorOf(req).name, role: req.user.role };
}

export function registerAiReviewRoutes(app, { requireAuth }) {
  const allowed = requireApplicationAccess("AI reviews");
  const base = "/api/applications/:id/ai";
  const run = (work) => (req, res) => answer(res, (async () => work(req))(), "AI review");

  app.get(base, requireAuth, allowed, run((req) => reviewState(req.params.id)));

  app.post(
    `${base}/reviews`,
    requireAuth,
    allowed,
    run(async (req) => ({ run: await startReview({ applicationId: req.params.id, kindKey: req.body?.kind, actor: actorOf(req), uploader: person(req) }) })),
  );

  app.get(`${base}/reviews/:runId`, requireAuth, allowed, run((req) => getReview(req.params.id, runIdOf(req))));

  app.post(`${base}/reviews/:runId/accept`, requireAuth, allowed, run((req) => acceptReview({ applicationId: req.params.id, runId: runIdOf(req), actor: person(req) })));

  app.post(`${base}/reviews/:runId/discard`, requireAuth, allowed, run((req) => discardReview({ applicationId: req.params.id, runId: runIdOf(req), actor: person(req) })));
}
