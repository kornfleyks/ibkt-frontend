# Jotform Workflows (client's account)

Read through the Jotform API on 2026-09-30 (read-only): `GET /user/workflows` (list), `/workflow/{id}` (settings), `/workflow/{id}/elements` (steps) and `/workflow/{id}/links` (connections). None of this is in Jotform's public API docs. Approvers are the IBKT info@ mailbox and one Gmail address (not written out here).

## Summary

| Workflow | Form | Runs (active) | What it is |
|---|---|---|---|
| **Approval: Pre-Adoption Form** | Pre-Adoption Form | 1,563 (561) | **The whole adoption process up to references** (below) |
| Approval: Foster Agreement | Foster Agreement | 824 (778) | Approve / Deny; Approve emails a Calendly call link |
| "Clone of Approval: Pet Adoption Contract - England & Wales" | **Contract Scotland** (misnamed clone) | 42 (38) | Approve / Deny, then a generic "request approved / denied" email |
| Workflow: IBKT Foster Compliance & Safeguarding | Foster Compliance form | 8 (3) | Approve, then email each of 3 referees a reference request |
| Automation Action (Contract E&W) | Contract England & Wales | 4 (0) | On submit, sends the **edit link** (for signing) to `{email}` and `{emailOf4}` (the adopter) |
| Clone of Approval: Pre-Adoption Form | Clone of Pre-Adoption Form (disabled form) | 1 | Old copy of the main workflow, assigns an old clone of the Adoption Form |
| Clone of Approval: Foster Agreement | Clone of Foster Agreement | 1 (1) | Copy |
| Clone of Clone ... Pet Adoption Contract (x2) | USA contracts (unused) | 0-1 | Copies |
| Approval: Pet Surrender Form | Pet Surrender Form | 3 | **Disabled** |

"Active" = runs still waiting at a step (an approval nobody has clicked). Most Foster runs and a third of Pre-Adoption runs are open: approvals are not closed, they're left.

## The Pre-Adoption workflow, step by step

1. **Pre-Adoption Form submitted.**
2. **Stage 1. Approval (call request)**, approver: info@. Expires after 3 weeks. Buttons:
   - *Schedule a call*: emails the applicant "Pre Adoption Call" with a **Calendly** link, then goes to Stage 2.
   - *Review Application*: goes to **Ask for clarification** (approver: the Gmail address): *Schedule a call* / *Decline* / *Skip to Request Video (Call done)*.
   - *Decline*: "Your pre-adoption form has been denied." email.
   - *Adopted elsewhere / no longer adopting*: "Come back anytime" email.
3. **Stage 2. Approval (video request)**: *Request a video* ("Lovely talking to you" email, then Stage 4) / *Decline* / *Discuss Fostering* (email suggesting fostering, then ends) / *Adopted elsewhere* / *Schedule 2nd Call* (Stage 3).
4. **Stage 3. Second call**: *Request References* / *Deny* / *Adopted Elsewhere*.
5. **Stage 4. Approval (review by adoption team)**: *Request References* / *Decline* / *Schedule in 2nd call* / *Adopted Elsewhere*.
6. **Request References = Jotform "Assign Form"**: Jotform itself sends the applicant the **Adoption Form and References** ("Reference Request - Itty Bitty Kitty Tails" email), **pre-filled from the Pre-Adoption answers**, and waits for them to submit it.
7. **Approval** after the Adoption Form arrives: *Email Refs* / *Decline* / *Adopted Elsewhere*.
8. **Email Refs**: in parallel, for each of Reference #1-3 whose email is filled in, emails the referee "Reference Request for <applicant>" with a button to **bit.ly/IBKTRefCheck** (the Reference Check form, not pre-filled). Then the workflow ends.

After that (contract, payment) there is no workflow: the Contract E&W automation only sends the signing link.

## What this means for the app

- **The Adoption Form is not sent by hand**, as assumed on 2026-09-30: volunteers click *Request References* in the Jotform approval and Jotform sends it (pre-filled). The app's **Send Adoption Form** button duplicates this step. Links sent by Jotform carry **no `ibktapplicationid`**, so those submissions are matched by email / name.
- **The workflow never branches for the UAE**: *Request References* always assigns the UK/US **Adoption Form and References**. UAE applicants must get the UAE form some other way (by hand, presumably).
- **Referees are emailed by Jotform** (step 8), with a generic link: the Reference Check doesn't say which application it's for, so the app must match it by the referee's email (from the Adoption Form) or the candidate name they type.
- **Stage decisions live only in Jotform**: which stage an applicant is at, declines, "adopted elsewhere" and "discuss fostering" are button clicks in Jotform approvals, not in the app. The app's Adoption Stage doesn't know about them, and the two can disagree.
- The approval stages map loosely onto the app: Stage 1/2 calls and the video = the Screening tab; Request References = the Adoption Form; Email Refs = References.
- **Prefill mapping bug** in step 6 (Jotform's settings, worth telling the client): the Adoption Form's **postcode** is filled from the Pre-Adoption **phone area code** (`120-postal <- input_121_area`), and its Home Phone from the Mobile field.

## Questions for the client / decisions

1. Should the app **replace** the Jotform approvals (stage buttons, emails, sending the Adoption Form, emailing referees), or keep Jotform running them while the app only receives the data?
2. If both stay for a while, which one is the source of truth for the stage?
3. How are UAE applicants sent the UAE form today?
