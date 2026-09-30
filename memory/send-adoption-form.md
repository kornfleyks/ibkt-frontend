---
name: send-adoption-form
description: IN PROGRESS 2026-09-30 - Send Adoption Form button (UAE vs UK/US Jotform link, copy/mailto, adoption_form_invites); decisions and open steps
metadata:
  type: project
---

Built 2026-09-30, uncommitted at time of writing: "Send Adoption Form" on the application page. Plan, decisions and step checklist in `docs/send-adoption-form.md`.

Decisions (user, 2026-09-30, don't re-ask): country picks the form (UAE -> UAE Adoption Form & Agreement, else Adoption Form and References), volunteer can override; until email exists both Copy link and Open in email (mailto), each records a send; only in Active Application; no stage change; resend allowed with history; Admin + Case Owner only; app-only table `adoption_form_invites`; hidden Jotform field DONE on both forms (q174, q188), Unique Name is lowercase `ibktapplicationid`; webhooks added to both forms (verified 2026-09-30).

Email later: user wants a free email service (Mailgun researched: 100/day free). Client owns `ittybittykittytails.com` (Wix registrar + DNS, Google Workspace mail, SPF already includes Google, so extend SPF, never replace). Jotform sends roughly 200 emails/month (peak ~350).

**Why:** volunteers built and sent the step-2 link by hand.

**How to apply:** check the doc's step list before continuing; table adoption_form_invites CREATED 2026-09-30 (RLS on). Related: [[postman-collection-upkeep]], [[forgot-password-via-jotform]]
