import { answer, HttpError } from "../httpAnswer.js";
import { actorOf } from "../database/boardRecords.js";
import { getCat } from "../cats.js";
import { generateAdvertDraft, advertSettings, AdvertError } from "./generate.js";
import { latestDraft, saveDraft } from "./store.js";

// The draft advert of a cat (the Advert tab of the cat page). Staff only
// (requireAuth lets only staff roles through).
//
//   GET  /api/cats/:id/advert-draft   { enabled, draft | null }
//   POST /api/cats/:id/advert-draft   makes a new draft -> { enabled, draft }
//   POST /api/cats/:id/advert-draft/edit   saves a manual edit { body } -> { enabled, draft }

const ID_PATTERN = /^\d+$/;
const MAX_BODY_LENGTH = 5000;

async function catOf(req) {
  if (!ID_PATTERN.test(req.params.id)) throw new HttpError(400, "Invalid cat id.");

  const cat = await getCat(req.params.id);

  if (!cat) throw new HttpError(404, "Cat not found.");

  return cat;
}

export function registerAdvertRoutes(app, { requireAuth }) {
  app.get("/api/cats/:id/advert-draft", requireAuth, (req, res) =>
    answer(
      res,
      (async () => {
        await catOf(req);

        return { enabled: advertSettings().enabled, draft: await latestDraft(req.params.id) };
      })(),
      "advert draft",
    ),
  );

  // A person's edit of the draft is saved as a new row (reason "edit"), so the
  // AI's text stays in the history. It works even when the AI is switched off.
  app.post("/api/cats/:id/advert-draft/edit", requireAuth, (req, res) =>
    answer(
      res,
      (async () => {
        await catOf(req);

        const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";

        if (!body) throw new HttpError(400, "The advert cannot be empty.");
        if (body.length > MAX_BODY_LENGTH) throw new HttpError(400, `The advert is too long (the limit is ${MAX_BODY_LENGTH} characters).`);

        const draft = await saveDraft({
          catId: req.params.id,
          status: "draft",
          body,
          reason: "edit",
          by: { id: String(req.user.sub), name: actorOf(req).name },
        });

        return { enabled: advertSettings().enabled, draft };
      })(),
      "advert draft",
    ),
  );

  app.post("/api/cats/:id/advert-draft", requireAuth, (req, res) =>
    answer(
      res,
      (async () => {
        const cat = await catOf(req);
        const actor = actorOf(req);

        try {
          const draft = await generateAdvertDraft(cat, { reason: "regenerate", by: { id: String(req.user.sub), name: actor.name } });

          return { enabled: true, draft };
        } catch (err) {
          throw err instanceof AdvertError ? new HttpError(err.status, err.message) : err;
        }
      })(),
      "advert draft",
    ),
  );
}
