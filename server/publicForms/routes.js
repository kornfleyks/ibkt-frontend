import multer from "multer";
import { basename, extname } from "node:path";
import { uploadProblem } from "../fileSignature.js";
import { clientKey } from "../clientAddress.js";
import { PUBLIC_FORMS, publicFormErrors, UPLOAD_MAX_BYTES, UPLOAD_MAX_FILES_PER_QUESTION, UPLOAD_MAX_FILES_PER_FORM, UPLOAD_EXTENSIONS } from "../../src/constants/forms/publicForms.js";
import { isVisible } from "../../src/constants/forms/preAdoptionForm.js";
import { isDatabaseEnabled } from "../database/db.js";
import { saveAppSubmission, processSubmission } from "../jotform/receive.js";
import { isUploadToken, saveUpload, uploadExists } from "./uploadStore.js";
import { toJotformAnswers } from "./toJotformAnswers.js";

// The app's own copies of the client's Jotform forms, open to anyone with the
// link (docs/public-forms.md):
//
//   POST /api/public/form-uploads        one file (multipart field "file"), answers a token
//   POST /api/public/forms/:formKey      { answers, applicationId?, website }
//
// A submission is checked against the same form definition the page draws,
// converted to a Jotform submission's shape and applied by the same handler
// Jotform's own webhook uses, so the result on the application is the same.
//
// The routes are open to anyone, so: a hidden "website" field that people
// leave empty and bots fill in, a cap per address per hour (kept in memory, so
// it starts again when the server restarts), strict length caps, a file type
// and size whitelist, and one answer for every outcome. The reply never says
// whether a person or an application exists, and a form that finds no
// application (a referee naming someone unknown) still says "ok": it goes to
// the Admins as an unmatched submission instead.

const HOUR_MS = 60 * 60 * 1000;
const MAX_SUBMISSIONS_PER_IP_PER_HOUR = 10;
const MAX_UPLOADS_PER_IP_PER_HOUR = 60;
const MAX_TEXT = 5000;
const MAX_SHORT = 300;
const MAX_CHOICES = 20;

// A cap of `max` calls per `windowMs` for each address. Answers 0 when the
// call is allowed (and counted), else how many seconds until it would be.
function makeLimiter(max, windowMs) {
  const calls = new Map();

  return (key) => {
    const now = Date.now();
    const recent = (calls.get(key) ?? []).filter((time) => now - time < windowMs);

    if (recent.length >= max) {
      calls.set(key, recent);
      return Math.ceil((windowMs - (now - recent[0])) / 1000);
    }

    recent.push(now);
    calls.set(key, recent);

    if (calls.size > 5000) {
      for (const [address, times] of calls) {
        if (times.every((time) => now - time >= windowMs)) calls.delete(address);
      }
    }

    return 0;
  };
}

const submissionLimit = makeLimiter(MAX_SUBMISSIONS_PER_IP_PER_HOUR, HOUR_MS);
const uploadLimit = makeLimiter(MAX_UPLOADS_PER_IP_PER_HOUR, HOUR_MS);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: UPLOAD_MAX_BYTES, files: 1 } });

function tooMany(res, seconds) {
  res.set("Retry-After", String(seconds));

  return res.status(429).json({ error: "Too many requests from this address. Please try again later.", retryAfterSeconds: seconds });
}

const str = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");

// One answer as plain data of the shape its question type allows; anything
// else becomes empty. Nothing from the request body is kept as sent.
function cleanValue(question, value) {
  switch (question.type) {
    case "fullName":
      return { first: str(value?.first, 200), last: str(value?.last, 200) };
    case "address":
      return {
        line1: str(value?.line1, MAX_SHORT),
        line2: str(value?.line2, MAX_SHORT),
        city: str(value?.city, MAX_SHORT),
        state: str(value?.state, MAX_SHORT),
        postal: str(value?.postal, 40),
        country: str(value?.country, 2).toUpperCase(),
      };
    case "phone":
      return { country: str(value?.country, 2).toUpperCase(), number: str(value?.number, 40) };
    case "checkbox":
      return [...new Set((Array.isArray(value) ? value : []).map((item) => str(item, MAX_SHORT)).filter(Boolean))].slice(0, MAX_CHOICES);
    case "file":
      return (Array.isArray(value) ? value : []).filter(isUploadToken).slice(0, UPLOAD_MAX_FILES_PER_QUESTION);
    case "select":
    case "radio":
      return str(value, 200);
    case "date":
      return str(value, 10);
    case "text":
    case "email":
    case "number":
      return str(value === undefined || value === null ? "" : String(value), MAX_SHORT);
    default:
      return str(value, MAX_TEXT);
  }
}

function cleanAnswers(form, body) {
  const answers = {};

  for (const question of form.questions) {
    if (question.type === "note" || question.type === "agreement") continue;

    answers[question.key] = cleanValue(question, body?.[question.key]);
  }

  return answers;
}

// { key: message } for the answers: the form's own rules, then the uploads
// (a required one is missing, or its file has expired).
async function submissionErrors(form, answers) {
  const errors = publicFormErrors(form, answers);
  let totalFiles = 0;

  for (const question of form.questions.filter((item) => item.type === "file" && isVisible(item, answers))) {
    const tokens = answers[question.key];

    totalFiles += tokens.length;

    if (question.required && tokens.length === 0) errors[question.key] = "Upload at least one file.";
    else if (!(await Promise.all(tokens.map(uploadExists))).every(Boolean)) errors[question.key] = "An upload has expired. Please choose the file again.";
  }

  if (totalFiles > UPLOAD_MAX_FILES_PER_FORM) errors.files = `Attach at most ${UPLOAD_MAX_FILES_PER_FORM} files in total.`;

  return errors;
}

export function registerPublicFormRoutes(app) {
  app.post("/api/public/form-uploads", (req, res) => {
    const wait = uploadLimit(clientKey(req.ip));

    if (wait) return tooMany(res, wait);

    upload.single("file")(req, res, async (err) => {
      if (err) {
        const message = err.code === "LIMIT_FILE_SIZE" ? `A file can be at most ${UPLOAD_MAX_BYTES / (1024 * 1024)} MB.` : "The file could not be read.";

        return res.status(400).json({ error: message });
      }

      const file = req.file;
      const name = basename(String(file?.originalname ?? "")).replace(/[^\w .()-]/g, "_").slice(0, 120);
      const extension = extname(name).slice(1).toLowerCase();

      if (!file || !name) return res.status(400).json({ error: "Choose a file to upload." });

      if (!UPLOAD_EXTENSIONS.includes(extension)) {
        return res.status(400).json({ error: `Files of type .${extension || "?"} are not accepted. Allowed: ${UPLOAD_EXTENSIONS.join(", ")}.` });
      }

      const problem = uploadProblem(file.buffer, extension);

      if (problem) return res.status(400).json({ error: problem });

      try {
        const token = await saveUpload({ buffer: file.buffer, mimetype: file.mimetype || "application/octet-stream", originalname: name });

        res.json({ token, name });
      } catch (saveError) {
        console.error("Public forms: couldn't keep an uploaded file:", saveError);
        res.status(500).json({ error: "The file could not be saved. Please try again." });
      }
    });
  });

  app.post("/api/public/forms/:formKey", async (req, res) => {
    // Only a listed form: not an inherited name such as "constructor".
    const form = Object.hasOwn(PUBLIC_FORMS, req.params.formKey) ? PUBLIC_FORMS[req.params.formKey] : undefined;

    if (!form) return res.status(404).json({ error: "Unknown form." });

    if (!isDatabaseEnabled()) return res.status(503).json({ error: "This form isn't open on this server yet." });

    // A bot filled in the hidden field: pretend it worked, save nothing.
    if (req.body?.website) return res.json({ ok: true });

    const wait = submissionLimit(clientKey(req.ip));

    if (wait) return tooMany(res, wait);

    try {
      const answers = cleanAnswers(form, req.body?.answers);
      const errors = await submissionErrors(form, answers);

      if (Object.keys(errors).length > 0) return res.status(400).json({ error: "Please check the highlighted answers.", fields: errors });

      const saved = await saveAppSubmission({
        formId: form.formId,
        answers: toJotformAnswers(form, answers, { applicationId: req.body?.applicationId }),
      });

      // The answer does not wait for the application to be written: the
      // submission is saved, so it is applied (or retried) either way.
      res.json({ ok: true });

      processSubmission(saved).catch((err) => console.error(`Public forms: handling submission ${saved.submissionId} failed.`, err));
    } catch (err) {
      console.error(`Public forms: failed to save a ${form.title} submission:`, err);
      res.status(500).json({ error: "We could not save your answers. Please try again." });
    }
  });
}
