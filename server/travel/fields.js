import { TRAVEL } from "../../src/constants/boards/travel.js";

const C = TRAVEL.COLUMNS;

export const TABLE = "travel";
export const BOARD_ID = TRAVEL.BOARD_ID;
export const BOARD_NAME = "Travel";

// A travel record's fields, in the boardRecords spec format (read / write
// kinds, see database/boardRecords.js). Both storage implementations
// (databaseStore.js, mondayStore.js) read and write exactly these, so the
// rules and routes never know which one is in use. `write` marks what the
// app may change; the links are set once, when the record is created.
//
// The Travel tab shows the core fields only. The other columns of the Travel
// board (checklist, costs, contacts, collection method) stay on Monday.
export const TRAVEL_FIELDS = {
  status: { column: C.STATUS, write: "status" },
  linkedApplicationId: { column: C.LINKED_ADOPTER, read: "firstId" },
  linkedCatId: { column: C.LINKED_CAT, read: "firstId" },
  linkedCatName: { column: C.LINKED_CAT, read: "firstName" },
  travelDate: { column: C.TRAVEL_DATE, write: "date" },
  arrivalDate: { column: C.ARRIVAL_DATE, write: "date" },
  crateSize: { column: C.CRATE_SIZE, write: "status" },
  crateWeight: { column: C.CRATE_WEIGHT, write: "number" },
  weightUnit: { column: C.WEIGHT_UNIT, write: "status" },
  flightNumber: { column: C.FLIGHT_NUMBER, write: "text" },
  departureAirport: { column: C.DEPARTURE_AIRPORT, write: "text" },
  arrivalAirport: { column: C.ARRIVAL_AIRPORT, write: "text" },
  travelNotes: { column: C.TRAVEL_NOTES, write: "longText" },
};

// Set only when the record is created (the application and its cat).
export const CREATE_ONLY_FIELDS = {
  linkedApplicationIds: { column: C.LINKED_ADOPTER, write: "links" },
  linkedCatIds: { column: C.LINKED_CAT, write: "links" },
};

export function isWritable(key) {
  return Boolean(TRAVEL_FIELDS[key]?.write);
}
