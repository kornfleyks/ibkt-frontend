import { serverGet, serverPost, serverDelete } from "./MondayService";

// A standing punch-list for client calls (server/reviewItems/). Each item:
// { id, category: "question" | "flag" | "internal", title, detail,
//   status: "open" | "answered" | "resolved",
//   priority: "high" | "medium" | "low" | null, answer, answeredByName,
//   answeredAt, createdAt, updatedAt }.

export async function getReviewItems() {
  const { items } = await serverGet("/api/review-items");

  return items;
}

export async function createReviewItem({ category, title, detail, priority }) {
  const { item } = await serverPost("/api/review-items", { category, title, detail, priority });

  return item;
}

// changes: any of { category, title, detail, status, priority, answer }
// (priority null clears it).
export async function updateReviewItem(id, changes) {
  const { item } = await serverPost(`/api/review-items/${id}`, changes);

  return item;
}

export async function deleteReviewItem(id) {
  return serverDelete(`/api/review-items/${id}`);
}
