// @mentions are stored inside the message text as `@[Name](userId)`, so
// the app always knows exactly who was mentioned (even after a rename) and
// can highlight it. Shared by the composer, the message renderer and the
// server (which validates mentions and notifies the people in them).

const MENTION_PATTERN = /@\[([^\]\n]+)\]\((\d+)\)/g;

export function mentionToken(name, userId) {
  // Brackets would break the token, so they can't be part of the name.
  return `@[${String(name).replace(/[[\]]/g, "")}](${userId})`;
}

// Unique mentioned user ids, in order of first appearance.
export function extractMentionIds(text) {
  const ids = [];

  for (const match of String(text ?? "").matchAll(MENTION_PATTERN)) {
    if (!ids.includes(match[2])) {
      ids.push(match[2]);
    }
  }

  return ids;
}

// [{ type: "text", value } | { type: "mention", name, id }] for rendering.
export function splitMentions(text) {
  const parts = [];
  let lastIndex = 0;

  for (const match of String(text ?? "").matchAll(MENTION_PATTERN)) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }

    parts.push({ type: "mention", name: match[1], id: match[2] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < String(text ?? "").length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts;
}

// Turns any token whose id `isAllowed` rejects back into plain "@Name"
// text, so a stale or hand-written token can't notify or look like a
// real mention.
export function keepAllowedMentions(text, isAllowed) {
  return String(text ?? "").replace(MENTION_PATTERN, (token, name, id) => (isAllowed(id) ? token : `@${name}`));
}
