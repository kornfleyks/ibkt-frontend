import { useState } from 'react';
import { updateCatStatus, notReadyDetails } from '../services/CatsService';

// Changing a cat's status for the two places that edit it (the cat page's
// header and its Overview). Setting a cat to Adoption Ready when it is not
// ready is refused by the server; `notReady` then holds { status, problems,
// canOverride } for AdoptionReadyDialog, and `override(reason)` sets it
// anyway (Admins only, the server checks).
//
//   change(status) -> true when saved, false when not (refused or failed)
function useCatStatusChange(cat, onCatUpdate) {
    const [notReady, setNotReady] = useState(null);

    async function change(status) {
        try {
            await updateCatStatus(cat.id, status);
            onCatUpdate({ status });

            return true;
        } catch (err) {
            const details = notReadyDetails(err);

            if (details) {
                setNotReady({ status, ...details });
            } else {
                console.error('Failed to update status:', err);
            }

            return false;
        }
    }

    // Throws on failure, so the dialog can show the message.
    async function override(reason) {
        await updateCatStatus(cat.id, notReady.status, { overrideReason: reason });
        onCatUpdate({ status: notReady.status });
        setNotReady(null);
    }

    return { change, notReady, override, cancel: () => setNotReady(null) };
}

export default useCatStatusChange;
