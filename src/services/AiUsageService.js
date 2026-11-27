import { serverGet } from "./MondayService";

// Admin-only: what Oriel's calls to the Claude API used today and this
// month, counted by the server (see server/aiUsage/store.js). Never calls
// Anthropic.
export async function getAiUsage() {
  return serverGet("/api/admin/ai-usage");
}
