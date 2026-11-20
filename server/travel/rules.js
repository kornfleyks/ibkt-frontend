import { InputError } from "../database/boardRecords.js";
import { TRAVEL_STATUS_OPTIONS } from "../../src/constants/statuses/travelStatuses.js";

// The travel rules, as pure functions of the record before and the changes
// asked for, so they are the same in database and Monday mode:
//   - the crate weight is a number above 0, kept with its unit (kg or lb);
//   - a weight with no unit gets kg, and clearing the weight clears the unit;
//   - the arrival date cannot be before the travel date.
// A value set explicitly in the same change always wins.

const { WEIGHT_UNIT, STATUS } = TRAVEL_STATUS_OPTIONS;

export const DEFAULT_WEIGHT_UNIT = WEIGHT_UNIT.KG;

// The fields a new record starts with.
export function initialValues({ travelDate }) {
  return { status: STATUS.PLANNING, travelDate: travelDate || null };
}

function isEmpty(value) {
  return value === null || value === undefined || value === "";
}

// `changes` plus what the rules add. `before` is the stored record.
export function withRules(before, changes) {
  const out = { ...changes };
  const after = { ...before, ...changes };

  if (Object.hasOwn(changes, "crateWeight") && !isEmpty(changes.crateWeight)) {
    const weight = Number(changes.crateWeight);

    if (!Number.isFinite(weight) || weight <= 0) throw new InputError("The crate weight must be a number above 0.");

    out.crateWeight = Math.round(weight * 100) / 100;
    after.crateWeight = out.crateWeight;
  }

  if (Object.hasOwn(changes, "crateWeight") && isEmpty(changes.crateWeight)) {
    out.crateWeight = null;
    after.crateWeight = null;
  }

  if (isEmpty(after.crateWeight)) {
    // No weight: no unit to keep.
    if (!isEmpty(after.weightUnit)) out.weightUnit = null;
  } else if (isEmpty(after.weightUnit)) {
    out.weightUnit = DEFAULT_WEIGHT_UNIT;
  }

  if (after.travelDate && after.arrivalDate && after.arrivalDate < after.travelDate) {
    throw new InputError("The arrival date cannot be before the travel date.");
  }

  return out;
}
