// Generated from Monday.com board schema; the dates, Chase Count and the
// Post-Adoption Owner link were added by hand (2026-09-28).
export const POST_ADOPTION = {
  BOARD_ID: "5098487184",
  COLUMNS: {
    NAME: "name", // Name | name
    SUBITEMS: "subtasks_mkrmtgvm", // Subitems | subtasks
    POST_ADOPTION_ID: "pulse_id_mm49esrv", // Post-Adoption ID | item_id
    POST_ADOPTION_STATUS: "color_mm49aj9", // Post-Adoption Status | status
    LINKED_CAT: "board_relation_mm493c3r", // Linked Cat | board_relation
    LINKED_CAT_ID: "lookup_mm49spef", // Linked Cat ID | mirror
    LINKED_ADOPTER: "board_relation_mm497ap1", // Linked Adopter | board_relation
    LINKED_ADOPTER_ID: "lookup_mm49ad9c", // Linked Adopter ID | mirror
    COUNTRY: "country_mm49z1kg", // Country | country
    CITY: "text_mm49c1q8", // City | text
    ADOPTION_DATE: "date_mm49g9w5", // Adoption Date | date
    ARRIVAL_DATE: "date_mm49cewr", // Arrival Date | date
    CLOSED_DATE: "date_mm49xzx2", // Closed Date | date
    CHECK_IN_24H_DUE: "date_mm49ejt", // 24h Check-In Due | date
    CHECK_IN_72H_DUE: "date_mm49jtkc", // 72h Check-In Due | date
    WEEK_1_CHECK_IN_DUE: "date_mm49526k", // Week 1 Check-In Due | date
    WEEK_2_CHECK_IN_DUE: "date_mm492jpw", // Week 2 Check-In Due | date
    WEEK_3_CHECK_IN_DUE: "date_mm4978ht", // Week 3 Check-In Due | date
    WEEK_4_CHECK_IN_DUE: "date_mm49ajqw", // Week 4 Check-In Due | date
    CHECK_IN_3_MONTH_DUE: "date_mm495t38", // 3-Month Check-In Due | date
    CHECK_IN_6_MONTH_DUE: "date_mm49a1k7", // 6-Month Check-In Due | date
    CHECK_IN_1_YEAR_DUE: "date_mm49n7sd", // 1-Year Check-In Due | date
    LAST_CHECK_IN_SENT: "date_mm49e5my", // Last Check-In Sent | date
    LAST_RESPONSE_RECEIVED: "date_mm49b640", // Last Response Received | date
    CHASE_COUNT: "numeric_mm49hcz5", // Chase Count | numbers
    CHECK_IN_24H_CHECK_IN_STATUS: "color_mm498p3b", // 24h Check-In Status | status
    CHECK_IN_72H_CHECK_IN_STATUS: "color_mm49frvn", // 72h Check-In Status | status
    WEEK_1_CHECK_IN_STATUS: "color_mm49px08", // Week 1 Check-In Status | status
    WEEK_2_CHECK_IN_STATUS: "color_mm49m8n3", // Week 2 Check-In Status | status
    WEEK_3_CHECK_IN_STATUS: "color_mm49tpcc", // Week 3 Check-In Status | status
    WEEK_4_CHECK_IN_STATUS: "color_mm49aaqp", // Week 4 Check-In Status | status
    CHECK_IN_3_MONTH_CHECK_IN_STATUS: "color_mm49mxbb", // 3-Month Check-In Status | status
    CHECK_IN_6_MONTH_CHECK_IN_STATUS: "color_mm49saz3", // 6-Month Check-In Status | status
    CHECK_IN_1_YEAR_CHECK_IN_STATUS: "color_mm49t983", // 1-Year Check-In Status | status
    STOP_CHASING: "boolean_mm49gxa4", // Stop Chasing | checkbox
    ESCALATION_REQUIRED: "color_mm49bk8p", // Escalation Required | status
    ESCALATION_NOTES: "long_text_mm491646", // Escalation Notes | long_text
    GENERAL_UPDATE: "long_text_mm49drtc", // General Update | long_text
    HEALTH_UPDATE: "long_text_mm493tjp", // Health Update | long_text
    BEHAVIOUR_UPDATE: "long_text_mm49cm9a", // Behaviour Update | long_text
    PHOTOS_VIDEOS_RECEIVED: "file_mm49gk3j", // Photos / Videos Received | file
    // A link to the Users board (scripts/createPostAdoptionOwnerColumn.js).
    POST_ADOPTION_OWNER: "board_relation_mm7mrw5a", // Post-Adoption Owner | board_relation
    // The text column it replaced, kept on Monday; not used by the app.
    POST_ADOPTION_OWNER_OLD: "text_mm49h4c7", // Post-Adoption Owner (old) | text
    INTERNAL_NOTES: "long_text_mm49782e", // Internal Notes | long_text
    AI_CHECK_IN_SUMMARY: "long_text_mm49scgw", // AI Check-In Summary | long_text
    AI_CONCERN_FLAG: "color_mm493xm", // AI Concern Flag | status
    SUGGESTED_NEXT_ACTION: "long_text_mm49174e", // Suggested Next Action | long_text
    ALL_REQUIRED_CHECK_INS_COMPLETE: "color_mm49szk", // All Required Check-Ins Complete | status
  },
  RELATIONS: {
    LINKED_CAT: ["5098369241"],
    LINKED_ADOPTER: ["5098444415"],
    POST_ADOPTION_OWNER: ["5098492656"],
  },
};
