import { isDatabaseBoard } from "../database/switches.js";
import * as databaseStore from "./databaseStore.js";
import * as mondayStore from "./mondayStore.js";
import { TABLE } from "./fields.js";

// The storage in use: the database when "travel" is in DATABASE_BOARDS, else
// Monday. Both give
//   getRecord(id), findByApplication(applicationId),
//   createTravel({ name, values, applicationId, catId }),
//   updateTravel(id, changes) -> { before, after } | null
// with the same record shape (fields.js).
export function travelStore() {
  return isDatabaseBoard(TABLE) ? databaseStore : mondayStore;
}
