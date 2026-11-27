import { getAiUsage } from "./store.js";

// GET /api/admin/ai-usage (Admin): what Oriel's calls to the Claude API used
// today and this month (aiUsage/store.js). Never calls Anthropic.
export function registerAiUsageRoutes(app, { requireAuth, requireAdmin }) {
  app.get("/api/admin/ai-usage", requireAuth, requireAdmin, async (req, res) => {
    try {
      res.json(await getAiUsage());
    } catch (err) {
      console.error("AI usage: failed to read the figures.", err.message);
      res.status(500).json({ error: "Failed to read the Claude usage." });
    }
  });
}
