import { makeSecondStageHandler } from "../secondStage/handler.js";
import { UAE_FORM } from "./form.js";

// Handler for "UAE Adoption Form & Agreement" submissions
// (docs/jotform-step3.md): the shared second-stage handler with this
// form's config.

const handler = makeSecondStageHandler(UAE_FORM);

export const handleUaeForm = handler.handle;
export const uaeFormColumnsReady = handler.columnsReady;
