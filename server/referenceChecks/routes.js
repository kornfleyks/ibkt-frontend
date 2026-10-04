import { requireApplicationAccess } from "../applicationAccess.js";
import { answer } from "../httpAnswer.js";
import { listReferenceChecks } from "./store.js";

// The referees' "Reference Check - IBKT" answers about an application, for
// its References tab (filled by jotform/referenceCheck/handler.js). Admins
// and the application's Case Owner only.
//
//   GET /api/applications/:id/reference-checks   { checks: [...] } in the order they arrived

export function registerReferenceCheckRoutes(app, { requireAuth }) {
  app.get("/api/applications/:id/reference-checks", requireAuth, requireApplicationAccess("reference checks"), (req, res) =>
    answer(res, listReferenceChecks(req.params.id).then((checks) => ({ checks })), "reference checks"),
  );
}
