import { query } from "./db.js";
import { mondayDirectRequest } from "../mondayClient.js";
import { isDatabaseBoard } from "./switches.js";
import { setFileCopy } from "./boardStore.js";

// Files stay on Monday; boards kept in the database hold a copy of each
// file column (names, asset ids, links). After an upload or a delete the
// column is read back from Monday (1 call) so the copy is exact.

// The board table of a file column, when that board is in the database.
async function tableOfFileColumn(columnId) {
  const { rows } = await query("select table_name from monday_columns where column_id = $1 and monday_type = 'file'", [columnId]);

  return rows.map((row) => row.table_name).find((table) => isDatabaseBoard(table)) ?? null;
}

// Never throws: the file change itself already succeeded on Monday; a
// failed refresh is logged and fixed by the next change (or a full copy).
export async function refreshFileCopy(itemId, columnId) {
  try {
    const table = await tableOfFileColumn(columnId);

    if (!table) return false;

    const data = await mondayDirectRequest(
      `query ($ids: [ID!], $columnIds: [String!]) { items(ids: $ids) { column_values(ids: $columnIds) { text value } } }`,
      { ids: [String(itemId)], columnIds: [columnId] },
    );
    const column = data.items?.[0]?.column_values?.[0];
    let value = null;

    try {
      value = column?.value ? JSON.parse(column.value) : null;
    } catch {
      value = null;
    }

    await setFileCopy(table, itemId, columnId, { text: column?.text ?? "", value });

    return true;
  } catch (err) {
    console.error(`Files: couldn't refresh the copy of ${columnId} on item ${itemId}.`, err.message);
    return false;
  }
}
