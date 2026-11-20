import { ADOPTION_READY_STATUS } from "../../src/constants/catReadiness.js";
import { UPDATE_FLAG } from "../../src/constants/catUpdates.js";
import { resetClock, clearClock } from "./clockStore.js";

// What a change of a cat's status does to its update clock (called by
// changeCat in cats.js, so it covers the cat page and Matching alike):
//   becomes Adoption Ready  a new clock starts today
//   leaves Adoption Ready   the clock is removed
// and in both cases the Update Requested flag goes back to Not Due.
//
// `setFlag(flag)` writes the flag (cats.js owns the cat fields, and this file
// must not import it).
export async function trackStatusChange({ catId, from, to, setFlag }) {
  if (from === to) return;

  if (to === ADOPTION_READY_STATUS) {
    await resetClock(catId);
    await setFlag(UPDATE_FLAG.NOT_DUE);
  } else if (from === ADOPTION_READY_STATUS) {
    await clearClock(catId);
    await setFlag(UPDATE_FLAG.NOT_DUE);
  }
}
