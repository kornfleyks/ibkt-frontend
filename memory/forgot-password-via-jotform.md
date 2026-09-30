---
name: forgot-password-via-jotform
description: Decisions for the Forgot Password feature - reset emails are sent through a hidden Jotform form's autoresponder
metadata:
  type: project
---

Forgot Password (decided 2026-09-30): the server has no email sending, so reset links go out through a hidden Jotform form ("IBKT App - Password Reset", fields Email + Reset Code) whose autoresponder emails the user. The server submits it via the Jotform API, then deletes the submission.

- Link in the template is fixed to https://kornfleyks.github.io/ibkt-frontend/reset-password?code=... (only the code is variable, so the form can't be abused to send arbitrary links).
- Local dev also sends through Jotform (user's choice); local testing means editing the link host by hand.
- Codes expire after 15 minutes, single use, only a hash stored in the Users board Password Reset Token/Expiry columns.
- Jotform API submissions store data but send NO emails (tested 2026-09-30). So server/passwordReset/sender.js posts to the public submit URL like a browser (unofficial; a captcha on the form would break it). Needs only JOTFORM_RESET_FORM_ID; JOTFORM_RESET_API_KEY ended up unused.
- Only Active accounts get emails; max one per 15 min (a new code only once the stored one expired); after reset the user goes to login; Jotform submissions are left in place (user's choice).
- Delivery is isolated in sender.js so Resend/Brevo can replace Jotform later.

**Why:** client already pays for Jotform (Silver, 2,500 submissions/month) and has no domain set up for an email service.
**How to apply:** don't propose a different email provider unless asked; keep the provider seam. Related: [[jotform-account]]
