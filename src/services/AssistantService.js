import { serverGet, serverPost } from "./MondayService";

// The in-app assistant (see server/assistant/). { enabled }.
export function getAssistantStatus() {
  return serverGet("/api/assistant");
}

// Sends the conversation so far, [{ role: "user" | "assistant", content }], and
// answers the assistant's reply text. Takes several seconds.
export async function askAssistant(messages) {
  const { reply } = await serverPost("/api/assistant/chat", { messages });

  return reply;
}
