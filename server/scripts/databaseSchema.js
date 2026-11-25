// Creates / updates the database tables that hold the Monday boards: one
// table per board, one column per Monday column plus companion columns for
// detail Monday needs back (see database/mondaySchema.js), the options of
// status/dropdown columns, and the outbox of changes waiting for Monday.
//
// Monday's column list is read once (1 call) and saved to server/.cache,
// so re-running - e.g. after a database error - costs no Monday call. Pass
// --refresh to read Monday again (after adding or renaming Monday columns).
// Safe to re-run: existing tables and column names are kept.
//
//   node scripts/databaseSchema.js [--refresh]
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mondayDirectRequest } from "../mondayClient.js";
import { ident, transaction, closeDatabase } from "../database/db.js";
import {
  MIRRORED_BOARDS,
  EXCLUDED_COLUMN_IDS,
  SYSTEM_COLUMNS,
  OPTION_TYPES,
  columnNameFor,
  specFor,
  parseColumnOptions,
  DB_ID_COLUMN_TITLE,
} from "../database/mondaySchema.js";

const CACHE_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".cache", "monday-columns.json");

async function mondayColumns() {
  if (!process.argv.includes("--refresh") && fs.existsSync(CACHE_FILE)) {
    console.log(`Using Monday's column list saved at ${path.relative(process.cwd(), CACHE_FILE)} (no Monday call).`);
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  }

  const data = await mondayDirectRequest(
    `query ($ids: [ID!]) { boards(ids: $ids) { id name columns { id title type settings_str } } }`,
    { ids: MIRRORED_BOARDS.map((board) => board.boardId) },
  );

  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data.boards, null, 2));
  console.log("Read Monday's column list (1 Monday call) and saved it for re-runs.");

  return data.boards;
}

function settingsOf(settingsStr) {
  try {
    return settingsStr ? JSON.parse(settingsStr) : null;
  } catch {
    return null;
  }
}

// How an existing column is converted when its type changes.
function usingClause(column, fromType, toSql) {
  if (fromType === "timestamp with time zone" && toSql === "date") {
    return `(${ident(column)} at time zone 'UTC')::date`;
  }

  return `${ident(column)}::${toSql}`;
}

const SQL_TYPE_NAMES = {
  text: "text",
  "text[]": "ARRAY",
  "bigint[]": "ARRAY",
  date: "date",
  time: "time without time zone",
  timestamptz: "timestamp with time zone",
  numeric: "numeric",
  boolean: "boolean",
  bigint: "bigint",
  jsonb: "jsonb",
};

const boards = await mondayColumns();
const boardsById = Object.fromEntries(boards.map((board) => [String(board.id), board]));
const summary = [];

await transaction(async (run) => {
  await run(`create table if not exists monday_columns (
    board_id text not null,
    column_id text not null,
    table_name text not null,
    column_name text not null,
    monday_type text not null,
    sql_type text not null,
    primary key (board_id, column_id)
  )`);
  await run("alter table monday_columns add column if not exists extra_column text");
  // Monday's column settings (e.g. whether a link column allows several items).
  await run("alter table monday_columns add column if not exists settings jsonb");

  await run(`create table if not exists column_options (
    board_id text not null,
    column_id text not null,
    option_key text not null,
    label text not null,
    color text,
    position integer,
    primary key (board_id, column_id, option_key)
  )`);

  // Changes waiting to be sent to Monday (the nightly sync, Phase 2).
  // Written in the same transaction as the change itself.
  await run(`create table if not exists monday_outbox (
    id bigserial primary key,
    created_at timestamptz not null default now(),
    board_id text not null,
    monday_item_id bigint,
    action text not null check (action in ('create', 'update', 'delete', 'create_update')),
    changes jsonb not null default '{}'::jsonb,
    status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
    attempts integer not null default 0,
    last_error text,
    sent_at timestamptz
  )`);
  await run("create index if not exists monday_outbox_pending on monday_outbox (status, id)");
  // 'sending': a Monday item being created by the sync (database-first
  // records, Phase 3) - if the run is cut off, the next one looks the item
  // up by its DB ID before trying again, so it's never made twice.
  await run("alter table monday_outbox drop constraint if exists monday_outbox_status_check");
  await run("alter table monday_outbox add constraint monday_outbox_status_check check (status in ('pending', 'sending', 'sent', 'failed'))");

  // Records made in the database before their Monday item exists get a
  // temporary negative id from here, replaced by the Monday id at the sync.
  await run("create sequence if not exists local_item_ids");

  // Nightly sync bookkeeping (Phase 2, database/sync.js).
  await run(`create table if not exists sync_runs (
    id bigserial primary key,
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    reason text,
    status text not null default 'running' check (status in ('running', 'done', 'partial', 'failed')),
    sent integer not null default 0,
    failed integer not null default 0,
    monday_calls integer not null default 0,
    error text
  )`);

  // One sync at a time across servers (local and Render share this database).
  await run(`create table if not exists sync_lock (
    id integer primary key default 1 check (id = 1),
    holder text,
    expires_at timestamptz not null default now()
  )`);

  // Records being created: noted before their Monday item exists, so a
  // crash between "created in Monday" and "saved here" can be recovered
  // (the item is found by its DB ID) instead of creating a duplicate.
  await run(`create table if not exists pending_creations (
    key uuid primary key,
    board_id text not null,
    table_name text not null,
    name text not null,
    fields jsonb not null default '{}'::jsonb,
    monday_item_id bigint,
    status text not null default 'pending' check (status in ('pending', 'done', 'abandoned')),
    created_at timestamptz not null default now()
  )`);

  // Each board's "DB ID" Monday column (added by scripts/createDbIdColumns.js).
  await run(`create table if not exists monday_sync_columns (
    board_id text primary key,
    db_id_column text not null
  )`);

  await run(`create table if not exists communications (
    monday_update_id bigint primary key,
    board_id text not null,
    monday_item_id bigint not null,
    author text,
    role text,
    body text,
    monday_created_at timestamptz,
    mirrored_at timestamptz not null default now()
  )`);
  await run("create index if not exists communications_item on communications (monday_item_id)");

  // Who uploaded a file through the app, and what it is. Monday only knows
  // the shared service account as uploader; the file itself stays on
  // Monday (asset_id is its Monday asset).
  await run(`create table if not exists file_uploads (
    asset_id bigint primary key,
    board_id text not null,
    monday_item_id bigint not null,
    column_id text not null,
    file_name text not null,
    size_bytes bigint,
    mime_type text,
    document_type text,
    note text,
    uploaded_by_id text,
    uploaded_by_name text,
    uploaded_by_role text,
    uploaded_at timestamptz not null default now()
  )`);
  await run("create index if not exists file_uploads_item on file_uploads (board_id, monday_item_id, column_id)");

  // Call transcripts pasted as text on an application's Screening tab
  // (uploaded transcript files go to the Call 1 / Call 2 Transcript columns
  // on Monday instead). App-only: never sent to Monday.
  await run(`create table if not exists call_transcripts (
    id bigserial primary key,
    monday_item_id bigint not null,
    call_number smallint not null check (call_number >= 1),
    body text not null,
    created_by_id text,
    created_by_name text,
    created_by_role text,
    created_at timestamptz not null default now()
  )`);
  // Calls 3 and above (application_calls below) have transcripts too: the
  // table first accepted only calls 1 and 2.
  await run("alter table call_transcripts drop constraint if exists call_transcripts_call_number_check");
  await run("alter table call_transcripts add constraint call_transcripts_call_number_check check (call_number >= 1)");
  await run("create index if not exists call_transcripts_item on call_transcripts (monday_item_id, call_number)");

  // The post-adoption reminders (postAdoption/reminders.js,
  // docs/post-adoption-reminders.md): for each check-in of a post-adoption
  // record that is waiting, how many times it was chased and reminded. A row
  // exists while the check-in is Sent or due and not sent, and is removed
  // when its status changes to anything else. App-only: never sent to Monday.
  await run(`create table if not exists post_adoption_chase (
    record_id bigint not null,
    check_in_key text not null,
    attempts integer not null default 0,
    last_sent_on date,
    reminders integer not null default 0,
    last_reminded_on date,
    escalated_at timestamptz,
    primary key (record_id, check_in_key)
  )`);

  // Testimonial requests (postAdoption/testimonial*.js, docs/testimonial-requests.md):
  // one row per post-adoption record that has a request, with its state, the
  // attempts and the testimonial text. A record with no row is Not requested.
  // App-only: never sent to Monday.
  await run(`create table if not exists post_adoption_testimonial (
    record_id bigint primary key,
    status text not null,
    attempts integer not null default 0,
    requested_on date,
    last_requested_on date,
    last_reminded_on date,
    received_on date,
    testimonial text not null default '',
    may_publish boolean not null default false,
    updated_at timestamptz not null default now(),
    updated_by text
  )`);

  // Kitty Profiles sent by fosters (fosterPortal/, docs/foster-onboarding.md): one row
  // per submission, with the answers and the list of files sent, until staff apply or
  // reject it. The files wait on Monday (the cat's Foster Uploads (pending) column).
  // A cat has at most one Pending profile (the unique index). App-only: never sent to Monday.
  await run(`create table if not exists foster_cat_profiles (
    id bigserial primary key,
    cat_id bigint not null,
    user_id bigint not null,
    foster_id bigint not null,
    status text not null default 'Pending',
    answers jsonb not null,
    files jsonb not null default '[]'::jsonb,
    wording_version text not null,
    submitted_at timestamptz not null default now(),
    reviewed_by_id text,
    reviewed_by_name text,
    reviewed_at timestamptz,
    reject_reason text
  )`);
  // Set while an Apply or a Reject is running, so two clicks cannot both act; and the cat fields an Apply changed.
  await run("alter table foster_cat_profiles add column if not exists processing_at timestamptz");
  await run("alter table foster_cat_profiles add column if not exists applied_fields jsonb");
  await run("create unique index if not exists foster_cat_profiles_open on foster_cat_profiles (cat_id) where status = 'Pending'");
  await run("create index if not exists foster_cat_profiles_cat on foster_cat_profiles (cat_id, submitted_at desc)");
  await run("create index if not exists foster_cat_profiles_user on foster_cat_profiles (user_id)");

  // The update check for cats waiting for a home (catUpdates/,
  // docs/cat-update-check.md): one row per Adoption Ready cat, from the day it
  // became ready, with the last update received and the request state.
  // App-only: never sent to Monday (the Update Requested flag on the cat is).
  await run(`create table if not exists cat_update_clock (
    cat_id bigint primary key,
    ready_since timestamptz not null default now(),
    last_received_at timestamptz,
    last_received_note text,
    last_received_by text,
    requested_at timestamptz,
    overdue_at timestamptz
  )`);

  // The extra screening calls of an application, from Call 3 on (Calls 1 and
  // 2 have their own columns on the Applications board): date and summary,
  // with the transcripts in call_transcripts and in the "Additional Call
  // Transcripts" file column (docs/screening-extra-calls.md). App-only: never
  // sent to Monday.
  await run(`create table if not exists application_calls (
    id bigserial primary key,
    monday_item_id bigint not null,
    call_number smallint not null check (call_number >= 3),
    call_date date,
    summary text,
    created_by_id text,
    created_by_name text,
    created_by_role text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (monday_item_id, call_number)
  )`);

  // AI reviews of an application (server/aiReview/): each run keeps its
  // input and the AI's output. A draft becomes the application's values
  // only when someone accepts it; a newer run supersedes an open draft.
  await run(`create table if not exists ai_runs (
    id bigserial primary key,
    board_id text not null,
    monday_item_id bigint not null,
    kind text not null check (kind = 'form_review' or kind ~ '^call_[0-9]+_review$'),
    provider text not null,
    model text,
    input jsonb not null,
    output jsonb not null,
    status text not null default 'draft' check (status in ('draft', 'accepted', 'discarded', 'superseded')),
    created_by_id text,
    created_by_name text,
    created_by_role text,
    created_at timestamptz not null default now(),
    decided_by_id text,
    decided_by_name text,
    decided_at timestamptz
  )`);
  // The kinds first were form_review, call_1_review and call_2_review; any
  // call number is allowed now (extra screening calls).
  await run("alter table ai_runs drop constraint if exists ai_runs_kind_check");
  await run("alter table ai_runs add constraint ai_runs_kind_check check (kind = 'form_review' or kind ~ '^call_[0-9]+_review$')");
  await run("create index if not exists ai_runs_item on ai_runs (board_id, monday_item_id, created_at desc)");

  // Jotform submissions received by the server (server/jotform/): full
  // answers and what was done with them (see jotform/submissionsStore.js
  // for the statuses). App-only: never sent to Monday.
  await run(`create table if not exists jotform_submissions (
    submission_id text primary key,
    form_id text not null,
    form_kind text not null,
    status text not null default 'received'
      check (status in ('received', 'processing', 'processed', 'unmatched', 'failed', 'log_only')),
    answers jsonb not null,
    jotform_created_at text,
    jotform_updated_at text,
    application_id bigint,
    error text,
    attempts integer not null default 0,
    received_via text not null,
    receive_count integer not null default 1,
    first_received_at timestamptz not null default now(),
    last_received_at timestamptz not null default now(),
    processed_at timestamptz
  )`);
  // The exact answers an application was created with in the app (Add
  // Application: the Pre-Adoption Form copy), for the application page's
  // Preview. One row per application and form. App-only: never sent to
  // Monday (the answers also sit in the application's own columns).
  await run(`create table if not exists application_form_answers (
    application_id bigint not null,
    form_id text not null,
    answers jsonb not null,
    created_by bigint,
    created_at timestamptz not null default now(),
    primary key (application_id, form_id)
  )`);

  // Each time the Adoption Form link was sent to an applicant ("Send
  // Adoption Form", server/adoptionForm/). App-only: never sent to Monday.
  await run(`create table if not exists adoption_form_invites (
    id bigserial primary key,
    application_id bigint not null,
    form_key text not null,
    form_id text not null,
    method text not null,
    link text not null,
    sent_by_id text,
    sent_by_name text,
    sent_at timestamptz not null default now()
  )`);
  await run("create index if not exists adoption_form_invites_application on adoption_form_invites (application_id, sent_at desc)");

  // Rescuer onboarding applications (server/rescuerOnboarding/, docs/
  // rescuer-onboarding.md): what the public form saved, and how an Admin
  // decided. rescuer_id / user_id are the Rescuers and Users items made on
  // approval. App-only: never sent to Monday. At most one Pending or
  // Approved application per email (the unique index); a Rejected one
  // doesn't block a new application.
  await run(`create table if not exists rescuer_applications (
    id bigserial primary key,
    status text not null default 'Pending',
    first_name text not null,
    last_name text not null,
    email text not null,
    answers jsonb not null,
    wording_version text not null,
    ip_hash text,
    submitted_at timestamptz not null default now(),
    reviewed_by_id text,
    reviewed_by_name text,
    reviewed_at timestamptz,
    reject_reason text,
    rescuer_id bigint,
    user_id bigint
  )`);
  // Set while an approval is running, so two clicks can't both approve.
  await run("alter table rescuer_applications add column if not exists processing_at timestamptz");
  await run(
    "create unique index if not exists rescuer_applications_open_email on rescuer_applications (lower(email)) where status in ('Pending', 'Approved')",
  );
  await run("create index if not exists rescuer_applications_status on rescuer_applications (status, submitted_at desc)");
  await run("create index if not exists rescuer_applications_ip on rescuer_applications (ip_hash, submitted_at desc)");

  // Public foster applications (fosterOnboarding/, docs/foster-onboarding.md): one row per
  // application, with every answer, until an Admin approves or rejects it. foster_id /
  // user_id are the Fosters and Users items made on approval. App-only: never sent to
  // Monday. At most one Pending or Approved application per email; a Rejected one does
  // not block a new application.
  await run(`create table if not exists foster_applications (
    id bigserial primary key,
    status text not null default 'Pending',
    first_name text not null,
    last_name text not null,
    email text not null,
    answers jsonb not null,
    wording_version text not null,
    ip_hash text,
    submitted_at timestamptz not null default now(),
    reviewed_by_id text,
    reviewed_by_name text,
    reviewed_at timestamptz,
    reject_reason text,
    foster_id bigint,
    user_id bigint
  )`);
  // Set while an approval is running, so two clicks cannot both approve.
  await run("alter table foster_applications add column if not exists processing_at timestamptz");
  await run(
    "create unique index if not exists foster_applications_open_email on foster_applications (lower(email)) where status in ('Pending', 'Approved')",
  );
  await run("create index if not exists foster_applications_status on foster_applications (status, submitted_at desc)");
  await run("create index if not exists foster_applications_ip on foster_applications (ip_hash, submitted_at desc)");

  // Every email mail/accountEmails.js sent through Mailgun, and the latest
  // delivery event Mailgun's webhooks reported for it (mail/webhookRoutes.js
  // updates the row by message_id as events arrive) - Mailgun's own
  // dashboard only keeps its logs for a day. App-only: never sent to Monday.
  await run(`create table if not exists email_log (
    id bigserial primary key,
    message_id text unique,
    user_id bigint,
    to_address text not null,
    subject text not null,
    kind text not null,
    status text not null default 'sent',
    error text,
    last_event jsonb,
    sent_by_id text,
    sent_by_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await run("create index if not exists email_log_user on email_log (user_id, created_at desc)");
  // A standing punch-list for client calls: questions to put to the client,
  // things to flag to them, and internal to-dos, with a place to record the
  // answer (reviewItems/, src/pages/ReviewItems). App-only, visible to one
  // developer account (routes.js, AppRoutes.jsx); never sent to Monday.
  await run(`create table if not exists review_items (
    id bigserial primary key,
    category text not null check (category in ('request', 'question', 'flag', 'internal')),
    title text not null,
    detail text,
    status text not null default 'open' check (status in ('open', 'answered', 'resolved')),
    answer text,
    answered_by_name text,
    answered_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`);
  await run("create index if not exists review_items_category on review_items (category, created_at)");
  // The "request" category (client change requests) was added after the
  // table was created, so the inline category check is replaced.
  await run("alter table review_items drop constraint if exists review_items_category_check");
  await run("alter table review_items add constraint review_items_category_check check (category in ('request', 'question', 'flag', 'internal'))");
  // Optional: null means no priority set.
  await run("alter table review_items add column if not exists priority text check (priority in ('high', 'medium', 'low'))");

  // Single-use links for the shareable Add Cat form (catShareLinks/). Only a
  // hash of each link's code is kept. App-only: never sent to Monday.
  await run(`create table if not exists cat_share_links (
    id bigserial primary key,
    token_hash text not null unique,
    created_by_id text not null,
    created_by_name text not null,
    rescuer_id bigint,
    expires_at timestamptz not null,
    used_at timestamptz,
    cat_id bigint,
    created_at timestamptz not null default now()
  )`);
  await run("create index if not exists cat_share_links_creator on cat_share_links (created_by_id, created_at)");
  // Set when the link was emailed as an invitation (who it was sent to).
  await run("alter table cat_share_links add column if not exists invitee_name text");
  await run("alter table cat_share_links add column if not exists invitee_email text");
  // Who the link is for: a foster (asked who they are) or a rescuer.
  await run("alter table cat_share_links add column if not exists audience text not null default 'rescuer' check (audience in ('foster', 'rescuer'))");

  // What the Wix rescuer form sends on submission (wixRescuerForm/), kept as
  // columns plus the form's own answers. `payload` holds the whole body only
  // when it could not be read as expected. App-only: never sent to Monday.
  await run(`create table if not exists wix_rescuer_submissions (
    id bigserial primary key,
    delivery_key text not null unique,
    received_at timestamptz not null default now()
  )`);
  for (const column of [
    "wix_submission_id text",
    "wix_contact_id text",
    "collection_id text",
    "full_name text",
    "form_id text",
    "form_name text",
    "submitted_at timestamptz",
    "first_name text",
    "last_name text",
    "email text",
    "phone text",
    "rescue_location text",
    "cats_to_rehome text",
    "answers jsonb",
    "payload jsonb",
  ]) {
    await run(`alter table wix_rescuer_submissions add column if not exists ${column}`);
  }
  // The first version of the table required the whole payload.
  await run("alter table wix_rescuer_submissions alter column payload drop not null");
  await run("create index if not exists wix_rescuer_submissions_received on wix_rescuer_submissions (received_at desc)");

  // Each referee's "Reference Check - IBKT" answers about an application
  // (jotform/referenceCheck/handler.js, referenceChecks/). App-only: never
  // sent to Monday.
  await run(`create table if not exists reference_checks (
    id bigserial primary key,
    submission_id text not null unique,
    application_id bigint not null,
    referee_slot smallint check (referee_slot in (1, 2, 3)),
    referee_name text,
    referee_email text,
    referee_phone text,
    candidate_name text,
    criminal_history text,
    answers jsonb not null,
    signature_url text,
    signed_on text,
    submitted_at text,
    received_at timestamptz not null default now()
  )`);
  await run("create index if not exists reference_checks_application on reference_checks (application_id, received_at)");

  await run("create index if not exists jotform_submissions_status on jotform_submissions (status)");
  await run("create index if not exists jotform_submissions_form on jotform_submissions (form_id, first_received_at desc)");

  // Every request that reached the Jotform webhook with the right secret,
  // stored as it arrived and before anything else, with its outcome
  // (jotform/webhookEventsStore.js). App-only: never sent to Monday.
  await run(`create table if not exists jotform_webhook_events (
    id bigserial primary key,
    received_at timestamptz not null default now(),
    form_id text,
    submission_id text,
    payload jsonb not null,
    status text not null default 'received' check (status in ('received', 'saved', 'ignored', 'failed')),
    error text,
    finished_at timestamptz
  )`);
  await run("create index if not exists jotform_webhook_events_received on jotform_webhook_events (received_at desc)");
  await run("create index if not exists jotform_webhook_events_submission on jotform_webhook_events (submission_id)");

  const existing = (await run("select board_id, column_id, column_name, extra_column from monday_columns")).rows;
  const existingTypes = new Map(
    (await run(`select table_name, column_name, data_type from information_schema.columns where table_schema = 'public'`)).rows.map(
      (row) => [`${row.table_name}.${row.column_name}`, row.data_type],
    ),
  );

  for (const { boardId, table } of MIRRORED_BOARDS) {
    const board = boardsById[boardId];

    if (!board) {
      console.warn(`Board ${boardId} (${table}) not found on Monday - skipped.`);
      continue;
    }

    await run(`create table if not exists ${ident(table)} (
      monday_item_id bigint primary key,
      name text,
      monday_created_at timestamptz,
      updated_at timestamptz not null default now(),
      mirrored_at timestamptz
    )`);
    // The key given to records created through the app (pending_creations,
    // Monday's "DB ID" column); empty for items that came from Monday.
    await run(`alter table ${ident(table)} add column if not exists record_uid uuid`);

    const known = new Map(existing.filter((row) => row.board_id === boardId).map((row) => [row.column_id, row]));
    const used = new Set([...SYSTEM_COLUMNS, ...[...known.values()].flatMap((row) => [row.column_name, row.extra_column]).filter(Boolean)]);
    const uniqueName = (base) => {
      let name = base;

      for (let n = 2; used.has(name); n += 1) {
        name = `${base}_${n}`;
      }

      used.add(name);
      return name;
    };

    let added = 0;
    let converted = 0;
    let options = 0;

    for (const column of board.columns) {
      const spec = specFor(column.type);

      // "DB ID" is the sync's own bookkeeping column on Monday, not data.
      if (column.id === "name" || !spec.sql || EXCLUDED_COLUMN_IDS.has(column.id) || column.title === DB_ID_COLUMN_TITLE) {
        continue;
      }

      const previous = known.get(column.id);
      const name = previous?.column_name ?? uniqueName(columnNameFor(column.title));
      const currentType = existingTypes.get(`${table}.${name}`);

      if (!previous) added += 1;

      if (!currentType) {
        await run(`alter table ${ident(table)} add column ${ident(name)} ${spec.sql}`);
      } else if (currentType !== SQL_TYPE_NAMES[spec.sql]) {
        await run(`alter table ${ident(table)} alter column ${ident(name)} type ${spec.sql} using ${usingClause(name, currentType, spec.sql)}`);
        converted += 1;
      }

      let extraColumn = null;

      if (spec.extra) {
        extraColumn = previous?.extra_column ?? uniqueName(`${name}_${spec.extra.suffix}`);
        await run(`alter table ${ident(table)} add column if not exists ${ident(extraColumn)} ${spec.extra.sql}`);
      }

      await run(
        `insert into monday_columns (board_id, column_id, table_name, column_name, monday_type, sql_type, extra_column, settings)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (board_id, column_id) do update
           set table_name = excluded.table_name, monday_type = excluded.monday_type,
               sql_type = excluded.sql_type, extra_column = excluded.extra_column, settings = excluded.settings`,
        [boardId, column.id, table, name, column.type, spec.sql, extraColumn, settingsOf(column.settings_str)],
      );

      if (OPTION_TYPES.has(column.type)) {
        await run("delete from column_options where board_id = $1 and column_id = $2", [boardId, column.id]);

        for (const option of parseColumnOptions(column.type, column.settings_str)) {
          await run(
            `insert into column_options (board_id, column_id, option_key, label, color, position) values ($1, $2, $3, $4, $5, $6)`,
            [boardId, column.id, option.key, option.label, option.color, option.position],
          );
          options += 1;
        }
      }
    }

    summary.push(`${table.padEnd(14)} ${String(board.columns.length).padStart(3)} Monday columns, ${added} new, ${converted} converted, ${options} options`);
  }

  // Reachable only by this server's connection; Supabase's public API
  // (anon / authenticated keys) gets nothing without policies. Every app table
  // is listed here, so add a new table to this list when creating it.
  for (const table of ["monday_columns", "column_options", "monday_outbox", "sync_runs", "sync_lock", "pending_creations", "monday_sync_columns", "communications", "application_form_answers", "adoption_form_invites", "rescuer_applications", "foster_applications", "foster_cat_profiles", "reference_checks", "review_items", "cat_share_links", "wix_rescuer_submissions", "email_log", "ai_runs", "application_calls", "call_transcripts", "cat_update_clock", "file_uploads", "jotform_submissions", "jotform_webhook_events", "post_adoption_chase", "post_adoption_testimonial", ...MIRRORED_BOARDS.map((board) => board.table)]) {
    await run(`alter table if exists ${ident(table)} enable row level security`);
  }
});

console.log(summary.join("\n"));
await closeDatabase();
