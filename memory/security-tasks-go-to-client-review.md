---
name: security-tasks-go-to-client-review
description: Standing rule from the user (2026-11-26) - every security finding or task goes on the Client Review page under the Security category, whoever finds it
metadata:
  type: feedback
---

Every security task goes on the Client Review page (`/client-review`) as an item of the category `security`, not only in chat and not as category `internal`. This covers findings from the security reviewers, from a test, from a chat (for example a secret that was shown), and clean-up tasks that exist for security reasons (test accounts, keys to rotate).

**Why:** the user asked on 2026-11-26 to gather the existing security tasks, add the new ones, mark them as the security category, and treat every future one the same way. The page is the durable place to track them, as in [[review-items]].

**How to apply:**
- When a review, a test or a conversation turns up a security task, add an item with `category: "security"`, a title that starts with "Security:", a priority (high, medium or low), and a detail written for an engineer who does not know the code: what is wrong, where (file), a concrete failure scenario, and a proposed fix. Follow the writing rules (full sentences, no dashes).
- Add it with a one-off script that calls `createReviewItem`, or through the page. The script runs once and is deleted afterwards. Check first that the title is not already there.
- Never put a secret, password or key in an item. Say where it is stored instead.
- After a security review, record the confirmed findings this way, and tell the user how many were added. Ask which ones to fix before changing code.
- Items that already exist and are security related are moved to the category, not duplicated. On 2026-11-26 there were 22: the 9 from the first review, the 9 added that day, and 5, 24, 32 and 49 that were filed under flag or internal.
