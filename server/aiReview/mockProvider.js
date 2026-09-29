// A stand-in for a real AI while the provider is being chosen: it makes
// predictable, clearly marked sample values from the inputs with simple
// rules, so the whole flow (drafts, accept, history) can be tried. Nothing
// is sent anywhere. Every text starts with "[Mock AI]".

export const name = "mock";

const MARK = "[Mock AI]";

const FORM_QUESTIONS = {
  whyAdopt: { label: "why they want to adopt", question: "What made you decide to adopt a cat now?" },
  previousCatExperience: { label: "previous cat experience", question: "Have you looked after a cat before, and for how long?" },
  householdInformation: { label: "household", question: "Who lives in your home, and how do they feel about a cat?" },
  existingPets: { label: "existing pets", question: "Do you have other pets, and how would you introduce them?" },
  workSchedule: { label: "work schedule", question: "How many hours a day would the cat be alone?" },
  adoptionMotivation: { label: "motivation", question: "What are you hoping a cat will bring to your home?" },
};

const WORRY_WORDS = ["concern", "worried", "not sure", "landlord", "allergy", "allergic", "moving", "unsure", "rent"];

function excerpt(text, length = 160) {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();

  return clean.length > length ? `${clean.slice(0, length).trimEnd()}...` : clean;
}

function missingAnswers(application) {
  return Object.keys(FORM_QUESTIONS).filter((key) => !String(application[key] ?? "").trim());
}

function worries(text) {
  const lower = (text ?? "").toLowerCase();

  return WORRY_WORDS.filter((word) => lower.includes(word));
}

function recommendationFor(score, options) {
  const [needsReview, proceed, highRisk] = ["Needs Review", "Proceed", "High Risk"].map((label) => (options.includes(label) ? label : options[0]));

  return score < 35 ? proceed : score < 65 ? needsReview : highRisk;
}

function transcriptText(transcripts) {
  return transcripts
    .filter((entry) => entry.source === "text")
    .map((entry) => entry.text)
    .join("\n\n");
}

function transcriptNote(transcripts) {
  const files = transcripts.filter((entry) => entry.source === "file");

  return files.length ? ` The mock doesn't open files; ${files.length} uploaded file(s) not read: ${files.map((file) => file.name).join(", ")}.` : "";
}

export async function review({ kind, fields, inputs }) {
  const { application, transcripts = [] } = inputs;
  const missing = missingAnswers(application);
  const text = transcriptText(transcripts);
  const found = worries(`${text} ${Object.keys(FORM_QUESTIONS).map((key) => application[key] ?? "").join(" ")}`);
  const score = Math.max(0, Math.min(100, 15 + missing.length * 12 + found.length * 10 + (kind !== "form_review" && !text ? 10 : 0)));
  const byType = Object.fromEntries(fields.map((field) => [field.key, field]));
  const values = {
    aiSummary: `${MARK} Applicant ${application.name || ""} says: "${excerpt(application.whyAdopt) || "no reason given"}". Household: ${excerpt(application.householdInformation, 80) || "not given"}.`,
    aiConcerns: found.length
      ? `${MARK} Mentions to follow up: ${found.join(", ")}.`
      : `${MARK} No concerns found by the mock's word check.`,
    aiMissingInformation: missing.length
      ? `${MARK} Not answered: ${missing.map((key) => FORM_QUESTIONS[key].label).join(", ")}.`
      : `${MARK} All form questions answered.`,
    suggestedQuestions: `${MARK}\n${(missing.length ? missing : Object.keys(FORM_QUESTIONS).slice(0, 3))
      .map((key, index) => `${index + 1}. ${FORM_QUESTIONS[key].question}`)
      .join("\n")}`,
    aiReview: `${MARK} Based on the form and ${text ? `a ${text.split(/\s+/).length}-word transcript` : "no pasted transcript"}, the risk score is ${score}/100.${transcriptNote(transcripts)}`,
    suggestedNextAction: `${MARK} ${score < 35 ? "Request the home video." : score < 65 ? "Clarify the open points before the next step." : "Discuss with the team before continuing."}`,
    call1Summary: `${MARK} ${text ? `Call notes start: "${excerpt(text, 220)}"` : "No pasted transcript to summarise."}${transcriptNote(transcripts)}`,
    call2Summary: `${MARK} ${text ? `Call notes start: "${excerpt(text, 220)}"` : "No pasted transcript to summarise."}${transcriptNote(transcripts)}`,
  };

  const output = {};

  for (const field of fields) {
    if (field.type === "score") output[field.key] = score;
    else if (field.key === "aiRecommendation") output[field.key] = recommendationFor(score, byType.aiRecommendation.options);
    else if (field.key === "call1Sentiment") output[field.key] = found.length ? "Concern" : text ? "Positive" : "Neutral";
    else if (field.key === "call2Required") output[field.key] = score >= 50 ? "Yes" : "No";
    else output[field.key] = values[field.key] ?? `${MARK} ${field.label}`;
  }

  return { model: "mock-1", output };
}
