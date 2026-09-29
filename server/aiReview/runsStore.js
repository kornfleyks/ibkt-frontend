import { query, transaction } from "../database/db.js";

// AI review runs (the ai_runs table, scripts/databaseSchema.js): drafts
// and their history. One open draft per application at most - a new run
// supersedes the previous draft.

function toRun(row, { withInput = false } = {}) {
  return {
    id: String(row.id),
    kind: row.kind,
    provider: row.provider,
    model: row.model,
    status: row.status,
    output: row.output,
    ...(withInput && { input: row.input }),
    createdBy: row.created_by_name ? { id: row.created_by_id, name: row.created_by_name, role: row.created_by_role ?? "" } : null,
    createdAt: new Date(row.created_at).toISOString(),
    decidedBy: row.decided_by_name ? { id: row.decided_by_id, name: row.decided_by_name } : null,
    decidedAt: row.decided_at ? new Date(row.decided_at).toISOString() : null,
  };
}

export async function createDraft({ boardId, applicationId, kind, provider, model, input, output, by }) {
  return transaction(async (run) => {
    await run(
      `update ai_runs set status = 'superseded', decided_at = now()
       where board_id = $1 and monday_item_id = $2 and status = 'draft'`,
      [String(boardId), Number(applicationId)],
    );

    const { rows } = await run(
      `insert into ai_runs (board_id, monday_item_id, kind, provider, model, input, output, created_by_id, created_by_name, created_by_role)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning *`,
      [String(boardId), Number(applicationId), kind, provider, model ?? null, JSON.stringify(input), JSON.stringify(output), by.id, by.name, by.role],
    );

    return toRun(rows[0], { withInput: true });
  });
}

// Newest first, without their inputs (can be long).
export async function listRuns(boardId, applicationId) {
  const { rows } = await query("select * from ai_runs where board_id = $1 and monday_item_id = $2 order by created_at desc, id desc", [
    String(boardId),
    Number(applicationId),
  ]);

  return rows.map((row) => toRun(row));
}

export async function getRun(boardId, applicationId, runId) {
  const { rows } = await query("select * from ai_runs where id = $1 and board_id = $2 and monday_item_id = $3", [
    Number(runId),
    String(boardId),
    Number(applicationId),
  ]);

  return rows[0] ? toRun(rows[0], { withInput: true }) : null;
}

// Moves a draft to accepted / discarded. Answers the run, or null when it
// isn't an open draft any more (someone else decided, or a newer run).
export async function decide({ boardId, applicationId, runId, status, by }) {
  const { rows } = await query(
    `update ai_runs set status = $4, decided_by_id = $5, decided_by_name = $6, decided_at = now()
     where id = $1 and board_id = $2 and monday_item_id = $3 and status = 'draft' returning *`,
    [Number(runId), String(boardId), Number(applicationId), status, by.id, by.name],
  );

  return rows[0] ? toRun(rows[0]) : null;
}

// Undo of an accept whose save failed: back to an open draft.
export async function reopen(runId) {
  await query("update ai_runs set status = 'draft', decided_by_id = null, decided_by_name = null, decided_at = null where id = $1 and status = 'accepted'", [
    Number(runId),
  ]);
}
