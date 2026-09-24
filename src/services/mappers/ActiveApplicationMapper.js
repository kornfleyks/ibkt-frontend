import { ACTIVE_APPLICATIONS } from "../../constants/boards/activeApplications";

export function mapMondayActiveApplication(item) {
  const columns = Object.fromEntries(
    item.column_values.map((column) => [column.id, column]),
  );

  const linkedCats =
    columns[ACTIVE_APPLICATIONS.COLUMNS.LINKED_CAT]?.linked_items?.map((cat) => ({
      id: cat.id,
      name: cat.name,
    })) ?? [];

  return {
    id: item.id,
    name: item.name,

    email: columns[ACTIVE_APPLICATIONS.COLUMNS.EMAIL]?.text ?? "",
    phone: columns[ACTIVE_APPLICATIONS.COLUMNS.PHONE]?.text ?? "",
    country: columns[ACTIVE_APPLICATIONS.COLUMNS.COUNTRY]?.text ?? "",
    city: columns[ACTIVE_APPLICATIONS.COLUMNS.CITY]?.text ?? "",

    adoptionStage: columns[ACTIVE_APPLICATIONS.COLUMNS.ADOPTION_STAGE]?.text ?? "",

    assignedVolunteer:
      columns[ACTIVE_APPLICATIONS.COLUMNS.ASSIGNED_VOLUNTEER]?.text ?? "",

    // Case Owner is a relation to the Users board (single item).
    caseOwnerId: columns[ACTIVE_APPLICATIONS.COLUMNS.CASE_OWNER]?.linked_items?.[0]?.id ?? null,
    caseOwner: columns[ACTIVE_APPLICATIONS.COLUMNS.CASE_OWNER]?.linked_items?.[0]?.name ?? "",

    priority: columns[ACTIVE_APPLICATIONS.COLUMNS.PRIORITY]?.text ?? "",

    aiRecommendation: columns[ACTIVE_APPLICATIONS.COLUMNS.AI_RECOMMENDATION]?.text ?? "",

    caseHealth: columns[ACTIVE_APPLICATIONS.COLUMNS.CASE_HEALTH]?.text ?? "",
    whyAdopt: columns[ACTIVE_APPLICATIONS.COLUMNS.WHY_ADOPT]?.text ?? "",

    previousCatExperience:
      columns[ACTIVE_APPLICATIONS.COLUMNS.PERVIOUS_CAT_EXPERIENCE]?.text ?? "",

    householdInformation:
      columns[ACTIVE_APPLICATIONS.COLUMNS.HOUSEHOLD_INFORMATION]?.text ?? "",

    existingPets: columns[ACTIVE_APPLICATIONS.COLUMNS.EXISTING_PETS]?.text ?? "",

    workSchedule: columns[ACTIVE_APPLICATIONS.COLUMNS.WORK_SCHEDULE]?.text ?? "",

    adoptionMotivation:
      columns[ACTIVE_APPLICATIONS.COLUMNS.ADOPTION_MOTIVATION]?.text ?? "",
    aiReview: columns[ACTIVE_APPLICATIONS.COLUMNS.AI_REVIEW]?.text ?? "",

    aiConcerns: columns[ACTIVE_APPLICATIONS.COLUMNS.AI_CONCERNS]?.text ?? "",

    suggestedQuestions:
      columns[ACTIVE_APPLICATIONS.COLUMNS.SUGGESTED_QUESTIONS]?.text ?? "",

    aiSummary: columns[ACTIVE_APPLICATIONS.COLUMNS.AI_SUMMARY]?.text ?? "",

    aiMissingInformation:
      columns[ACTIVE_APPLICATIONS.COLUMNS.AI_MISSING_INFORMATION]?.text ?? "",

    suggestedNextAction:
      columns[ACTIVE_APPLICATIONS.COLUMNS.SUGGESTED_NEXT_ACTION]?.text ?? "",
    // Linked Cat holds a whole bonded group when a pair is matched.
    // linkedCatId/linkedCatName stay for single-cat callers: the first id,
    // and every name joined.
    linkedCats,
    linkedCatIds: linkedCats.map((cat) => cat.id),
    linkedCatId: linkedCats[0]?.id ?? null,
    linkedCatName: linkedCats.map((cat) => cat.name).join(", "),

    applicationId: columns[ACTIVE_APPLICATIONS.COLUMNS.APPLICATION_ID]?.text ?? "",
    creationDate: columns[ACTIVE_APPLICATIONS.COLUMNS.CREATION_DATE]?.text ?? "",
    address: columns[ACTIVE_APPLICATIONS.COLUMNS.ADDRESS]?.text ?? "",

    call1Completed: columns[ACTIVE_APPLICATIONS.COLUMNS.CALL_1_COMPLETED]?.text ?? "",
    call1Summary: columns[ACTIVE_APPLICATIONS.COLUMNS.CALL_1_SUMMARY]?.text ?? "",
    call1Sentiment: columns[ACTIVE_APPLICATIONS.COLUMNS.CALL_1_SENTIMENT]?.text ?? "",
    call2Required: columns[ACTIVE_APPLICATIONS.COLUMNS.CALL_2_REQUIRED]?.text ?? "",
    call2Summary: columns[ACTIVE_APPLICATIONS.COLUMNS.CALL_2_SUMMARY]?.text ?? "",

    videoSubmitted: columns[ACTIVE_APPLICATIONS.COLUMNS.VIDEO_SUBMITTED]?.text ?? "",
    videoReviewNotes: columns[ACTIVE_APPLICATIONS.COLUMNS.VIDEO_REVIEW_NOTES]?.text ?? "",
    videoApproved: columns[ACTIVE_APPLICATIONS.COLUMNS.VIDEO_APPROVED]?.text ?? "",

    referencesSubmitted: columns[ACTIVE_APPLICATIONS.COLUMNS.REFERENCES_SUBMITTED]?.text ?? "",
    referee1: columns[ACTIVE_APPLICATIONS.COLUMNS.REFEREE_1]?.text ?? "",
    referee2: columns[ACTIVE_APPLICATIONS.COLUMNS.REFEREE_2]?.text ?? "",
    referenceOutcome: columns[ACTIVE_APPLICATIONS.COLUMNS.REFERENCE_OUTCOME]?.text ?? "",
    referenceNotes: columns[ACTIVE_APPLICATIONS.COLUMNS.REFERENCE_NOTES]?.text ?? "",

    matchConfidence: columns[ACTIVE_APPLICATIONS.COLUMNS.MATCH_CONFIDENCE]?.text ?? "",
    teamDecision: columns[ACTIVE_APPLICATIONS.COLUMNS.TEAM_DECISION]?.text ?? "",
    decisionNotes: columns[ACTIVE_APPLICATIONS.COLUMNS.DECISION_NOTES]?.text ?? "",

    draftContractGenerated:
      columns[ACTIVE_APPLICATIONS.COLUMNS.DRAFT_CONTRACT_GENERATED]?.text ?? "",
    finalContractSent: columns[ACTIVE_APPLICATIONS.COLUMNS.FINAL_CONTRACT_SENT]?.text ?? "",
    signedContractReceived:
      columns[ACTIVE_APPLICATIONS.COLUMNS.SIGNED_CONTRACT_RECEIVED]?.text ?? "",

    paymentRequired: columns[ACTIVE_APPLICATIONS.COLUMNS.PAYMENT_REQUIRED]?.text ?? "",
    paymentStatus: columns[ACTIVE_APPLICATIONS.COLUMNS.PAYMENT_STATUS]?.text ?? "",

    internalNotes: columns[ACTIVE_APPLICATIONS.COLUMNS.INTERNAL_NOTES]?.text ?? "",
  };
}
