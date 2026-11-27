import { answer, HttpError } from "../httpAnswer.js";
import { answerQuestion, assistantSettings, AssistantError } from "./chat.js";

// The in-app assistant (the chat bubble). Staff only (requireAuth lets only
// staff roles through).
//
//   GET  /api/assistant        { enabled }
//   POST /api/assistant/chat   { messages: [{ role, content }] } -> { reply }

export function registerAssistantRoutes(app, { requireAuth }) {
  app.get("/api/assistant", requireAuth, (req, res) => res.json({ enabled: assistantSettings().enabled }));

  app.post("/api/assistant/chat", requireAuth, (req, res) =>
    answer(
      res,
      (async () => {
        try {
          return { reply: await answerQuestion({ user: { id: req.user.sub, role: req.user.role }, messages: req.body?.messages }) };
        } catch (err) {
          throw err instanceof AssistantError ? new HttpError(err.status, err.message) : err;
        }
      })(),
      "assistant",
    ),
  );
}
