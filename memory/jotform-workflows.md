---
name: jotform-workflows
description: Client's Jotform Workflows studied 2026-09-30 (API paths found); the Pre-Adoption approval workflow runs the adoption process and ASSIGNS the Adoption Form itself
metadata:
  type: reference
---

Report: `docs/jotform-workflows.md`. Undocumented but working read-only API paths: `GET /user/workflows`, `/workflow/{id}`, `/workflow/{id}/elements`, `/workflow/{id}/links` (`/user/tasks` lists forms with approval tasks).

Key facts: "Approval: Pre-Adoption Form" (1,563 runs) has approval stages (call, video, 2nd call, team review) with buttons that send emails; "Request References" is a Jotform Assign Form step that sends the Adoption Form and References pre-filled (no UAE branch, no ibktapplicationid); after it, "Email Refs" emails each referee a bit.ly link to the Reference Check form. So the earlier belief that volunteers send the Adoption Form by hand was WRONG; the app's Send Adoption Form button duplicates Jotform. Prefill mapping bug: Adoption Form postcode filled from phone area code.

**How to apply:** before building more of the adoption flow in the app, ask the user whether the app replaces the Jotform approvals or just receives data (open questions at the end of the doc). Related: [[send-adoption-form]], [[jotform-integration-research]]
