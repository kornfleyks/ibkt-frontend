// Auto-generated from Monday.com board schema.
export const ACTIVE_APPLICATIONS = {
  BOARD_ID: "5098444415",
  COLUMNS: {
    NAME: "name", // Name | name
    SUBITEMS: "subtasks_mkrmtgvm", // Subitems | subtasks
    APPLICATION_ID: "pulse_id_mm48fphv", // Application ID | item_id
    CREATION_DATE: "pulse_log_mm48s6gd", // Creation Date | creation_log
    EMAIL: "email_mm48wqn7", // Email | email
    PHONE: "phone_mm48jdw5", // Phone | phone
    COUNTRY: "country_mm48kqe7", // Country | country
    CITY: "text_mm4865d2", // City | text
    ADDRESS: "long_text_mm48pr65", // Address | long_text
    ADOPTION_STAGE: "color_mm4g93ck", // Adoption Stage | status
    ASSIGNED_VOLUNTEER: "text_mm48zfbv", // Assigned Volunteer | text
    CASE_OWNER_LEGACY: "text_mm48cefa", // Case Owner (Legacy) | text - free-text names, superseded by CASE_OWNER
    CASE_OWNER: "board_relation_mm7gn9en", // Case Owner | board_relation
    PRIORITY: "color_mm4g1c21", // Priority | status
    WHY_ADOPT: "long_text_mm481k90", // Why Adopt | long_text
    PERVIOUS_CAT_EXPERIENCE: "long_text_mm48x98m", // Pervious Cat Experience | long_text
    HOUSEHOLD_INFORMATION: "long_text_mm48y799", // Household Information | long_text
    EXISTING_PETS: "long_text_mm48xf1v", // Existing Pets | long_text
    WORK_SCHEDULE: "long_text_mm48z8w2", // Work Schedule | long_text
    ADOPTION_MOTIVATION: "long_text_mm48y5bj", // Adoption Motivation | long_text
    AI_REVIEW: "long_text_mm481mdw", // AI Review | long_text
    AI_RECOMMENDATION: "color_mm4gxcrh", // AI Recommendation | status
    AI_CONCERNS: "long_text_mm487e1r", // AI Concerns | long_text
    SUGGESTED_QUESTIONS: "long_text_mm48c6qe", // Suggested Questions | long_text
    AI_SUMMARY: "long_text_mm482jhj", // AI Summary | long_text
    AI_RISK_SCORE: "numeric_mm481h8d", // AI Risk Score | numbers (0-100, higher = riskier)
    CALL_1_COMPLETED: "color_mm4gx5v1", // Call 1 Completed | status
    CALL_1_DATE: "date_mm4876bw", // Call 1 Date | date
    // File columns for uploaded transcripts (scripts/createCallTranscriptColumns.js).
    CALL_1_TRANSCRIPT: "file_mm7m93m8", // Call 1 Transcript | file
    CALL_1_SUMMARY: "long_text_mm48pz6y", // Call 1 Summary | long_text
    CALL_1_SENTIMENT: "color_mm4grk8w", // Call 1 Sentiment | status
    CALL_2_REQUIRED: "color_mm4gwfe", // Call 2 Required | status
    CALL_2_SUMMARY: "long_text_mm487q03", // Call 2 Summary | long_text
    CALL_2_DATE: "date_mm48jscw", // Call 2 Date | date
    CALL_2_TRANSCRIPT: "file_mm7mcbhg", // Call 2 Transcript | file
    VIDEO_SUBMITTED: "color_mm4g8c73", // Video Submitted | status
    VIDEO: "file_mm48ah45", // Video | file
    VIDEO_REVIEW_NOTES: "long_text_mm481hjf", // Video Review Notes | long_text
    VIDEO_APPROVED: "color_mm4gjzqx", // Video Approved | status
    REFERENCES_SUBMITTED: "color_mm4gh5rs", // References Submitted | status
    REFEREE_1: "text_mm48yp4a", // Referee 1 | text
    REFEREE_2: "text_mm48wd6r", // Referee 2 | text
    REFERENCE_OUTCOME: "color_mm4gbfb", // Reference Outcome | status
    REFERENCE_NOTES: "long_text_mm48ac18", // Reference Notes | long_text
    LINKED_CAT: "board_relation_mm4852qa", // Linked Cat | board_relation
    LINKED_CAT_ID: "lookup_mm48qmt5", // Linked Cat ID | mirror
    MATCH_CONFIDENCE: "color_mm4gyej7", // Match Confidence | status
    TEAM_DECISION: "color_mm4g1h6t", // Team Decision | status
    DECISION_NOTES: "long_text_mm48x5tz", // Decision Notes | long_text
    DRAFT_CONTRACT_GENERATED: "color_mm4g8sp8", // Draft Contract Generated | status
    FINAL_CONTRACT_SENT: "color_mm4gd6an", // Final Contract Sent | status
    SIGNED_CONTRACT_RECEIVED: "color_mm4g63nj", // Signed Contract Received | status
    CONTRACT_FILE: "file_mm48vatj", // Contract File | file
    PAYMENT_REQUIRED: "dropdown_mm48ff7r", // Payment Required | dropdown
    PAYMENT_STATUS: "color_mm4g8caj", // Payment Status | status
    PAYMENT_DATE: "date_mm48c2bk", // Payment Date | date
    TRAVEL_MANAGEMENT: "board_relation_mm482g9z", // Travel Management | board_relation
    TRAVEL_ID: "lookup_mm48j1ja", // Travel ID | mirror
    POST_ADOPTION_RECORD: "board_relation_mm48ynsy", // Post Adoption Record | board_relation
    INTERNAL_NOTES: "long_text_mm4888v8", // Internal Notes | long_text
    AI_MISSING_INFORMATION: "long_text_mm484cfq", // AI Missing Information | long_text
    SUGGESTED_NEXT_ACTION: "long_text_mm481zf7", // Suggested Next Action | long_text
    CASE_HEALTH: "color_mm4gf5qt", // Case Health | status
    LINKED_POST_ADOPTION_MANAGEMENT: "board_relation_mm49xt5w", // Linked Post-Adoption Management | board_relation
    LINKED_POST_ADOPTION_MANAGEMENT_ID: "lookup_mm49fh76", // Linked Post-Adoption Management ID | mirror
    // Which Jotform form / submission each part of the application came
    // from (scripts/createJotformColumns.js; filled by server/jotform/).
    JOTFORM_APPLICATION_FORM_ID: "text_mm7nn4a0", // Jotform Application Form ID | text
    JOTFORM_APPLICATION_SUBMISSION_ID: "text_mm7n34tx", // Jotform Application Submission ID | text
    JOTFORM_ADOPTION_FORM_FORM_ID: "text_mm7nj5hd", // Jotform Adoption Form Form ID | text
    JOTFORM_ADOPTION_FORM_SUBMISSION_ID: "text_mm7n45g8", // Jotform Adoption Form Submission ID | text
    JOTFORM_REFERENCE_FORM_ID: "text_mm7nmkfh", // Jotform Reference Form ID | text
    JOTFORM_REFERENCE_1_SUBMISSION_ID: "text_mm7nz7wr", // Jotform Reference 1 Submission ID | text
    JOTFORM_REFERENCE_2_SUBMISSION_ID: "text_mm7ngv51", // Jotform Reference 2 Submission ID | text
    JOTFORM_REFERENCE_3_SUBMISSION_ID: "text_mm7n6r58", // Jotform Reference 3 Submission ID | text
    JOTFORM_CONTRACT_FORM_ID: "text_mm7nkcsd", // Jotform Contract Form ID | text
    JOTFORM_CONTRACT_SUBMISSION_ID: "text_mm7nphp8", // Jotform Contract Submission ID | text
    // Pre-Adoption Form answers, one per question (server/scripts/createPreAdoptionColumns.js).
    HOW_HEARD: "text_mm7pqyg3", // How Heard | text
    CATS_INTERESTED_IN: "long_text_mm7pm8ev", // Cats Interested In | long_text
    TIME_AT_ADDRESS: "text_mm7pp6wd", // Time At Address | text
    HOME_TENURE: "color_mm7pdczq", // Home Tenure | status
    ACCOMMODATION_TYPE: "color_mm7p5ysa", // Accommodation Type | status
    PRIVATE_GARDEN: "color_mm7pd1g0", // Private Garden | status
    HOUSEHOLD_ACTIVITY_LEVEL: "text_mm7pvzza", // Household Activity Level | text
    HOUSEHOLD_MEMBERS: "long_text_mm7px44y", // Household Members | long_text
    FAMILY_IN_AGREEMENT: "color_mm7pwshr", // Family In Agreement | status
    FAMILY_AGREEMENT_NOTES: "long_text_mm7pjejw", // Family Agreement Notes | long_text
    PET_OWNER_EXPERIENCE: "text_mm7p72qj", // Pet Owner Experience | text
    CURRENT_PETS: "long_text_mm7pdj40", // Current Pets | long_text
    CURRENT_PETS_STERILISED: "color_mm7pprz1", // Current Pets Sterilised | status
    HOURS_ALONE: "numeric_mm7pzm35", // Hours Alone | numbers
    HOUSEHOLD_ALLERGIES: "color_mm7pm0ya", // Household Allergies | status
    ALLERGY_DETAILS: "long_text_mm7pr32w", // Allergy Details | long_text
    CHIEF_CARER: "text_mm7pvvn1", // Chief Carer | text
    PET_LOST_BEFORE: "color_mm7p7rx7", // Pet Lost Before | status
    AGE_PREFERENCE: "text_mm7p60q8", // Age Preference | text
    CAT_PREFERENCES: "text_mm7pph1j", // Cat Preferences | text
    LIFETIME_COMMITMENT: "color_mm7p1pk5", // Lifetime Commitment | status
    OUTDOOR_ACCESS: "color_mm7ptxn1", // Outdoor Access | status
    TYPICAL_DAY: "long_text_mm7pr9bx", // Typical Day | long_text
    APPLICATION_PHOTOS: "file_mm7pmcm3", // Application Photos | file
    CONTACT_CONSENT: "text_mm7pkfw5", // Contact Consent | text
  },
  RELATIONS: {
    LINKED_CAT: ["5098369241"],
    TRAVEL_MANAGEMENT: ["5098462214"],
    POST_ADOPTION_RECORD: [],
    LINKED_POST_ADOPTION_MANAGEMENT: ["5098487184"],
    CASE_OWNER: ["5098492656"],
  },
};
