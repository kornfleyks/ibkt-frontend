import { useEffect, useState } from 'react';
import UsersManager from '../../components/Users/UsersManager';
import AddRescuerDialog from '../../components/Rescuers/AddRescuerDialog';
import RescuerApplications from '../../components/Rescuers/RescuerApplications';
import { getRescuerApplications, resendRescuerLink } from '../../services/RescuerApplicationService';
import { USERS_STATUS_OPTIONS } from '../../constants/statuses/usersStatuses';

const RESCUER_ROLE = USERS_STATUS_OPTIONS.ROLE.RESCUER;
const isRescuer = (user) => user.role === RESCUER_ROLE;
const LABELS = { title: 'Rescuers', singular: 'rescuer', add: 'Add Rescuer' };

// "Resend sign-in link" on a rescuer's row: a fresh 7-day set-password link,
// for example when the first one expired unused.
const ROW_ACTIONS = [
    {
        label: 'Resend sign-in link',
        async onClick(user, { setNotice, setError }) {
            setNotice(`Sending a new sign-in link to ${user.email}...`);

            try {
                const result = await resendRescuerLink(user.id);

                setNotice(
                    result.email?.status === 'sent'
                        ? `A new sign-in link was sent to ${user.email}.`
                        : `The link was made but the email was not sent${result.email?.error ? ` (${result.email.error})` : ''}.`,
                );
            } catch (err) {
                console.error('Failed to send the link:', err);
                setNotice(null);
                setError(err.message || 'Failed to send the link.');
            }
        },
    },
];

// Rescuers, managed like the Users page (same component, rescuers only),
// plus an Applications tab where new applications are approved or rejected
// (docs/rescuer-onboarding.md).
function Rescuers() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Bumped to load the applications again (after an approval or rejection).
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const data = await getRescuerApplications();

                if (!cancelled) {
                    setApplications(data);
                    setError(null);
                }
            } catch (err) {
                console.error('Failed to load the rescuer applications:', err);

                if (!cancelled) setError('Failed to load the applications.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();

        return () => {
            cancelled = true;
        };
    }, [reloadKey]);

    const pending = applications.filter((application) => application.status === 'Pending').length;

    return (
        <UsersManager
            include={isRescuer}
            roleOptions={[RESCUER_ROLE]}
            showRole={false}
            labels={LABELS}
            AddDialog={AddRescuerDialog}
            rowActions={ROW_ACTIONS}
            defaultTab="applications"
            extraTab={{
                slug: 'applications',
                label: 'Applications',
                count: pending,
                subtitle: pending > 0 ? `${pending} application(s) awaiting review` : 'Manage rescuers and their applications',
                content: ({ reloadUsers, setNotice }) => (
                    <RescuerApplications
                        applications={applications}
                        loading={loading}
                        error={error}
                        setNotice={setNotice}
                        onChanged={() => {
                            setReloadKey((key) => key + 1);
                            reloadUsers();
                        }}
                    />
                ),
            }}
        />
    );
}

export default Rescuers;
