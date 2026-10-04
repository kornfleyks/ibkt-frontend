import { makeSecondStageHandler } from "../secondStage/handler.js";
import { ADOPTION_REFERENCES_FORM } from "./form.js";

// Handler for "Adoption Form and References" submissions
// (docs/jotform-adoption-form-import.md): the shared second-stage handler
// with this form's config.

const handler = makeSecondStageHandler(ADOPTION_REFERENCES_FORM);

export const handleAdoptionReferences = handler.handle;
export const adoptionFormColumnsReady = handler.columnsReady;
