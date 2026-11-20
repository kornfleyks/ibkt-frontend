import { useEffect, useState } from 'react';
import UsersManager from '../../components/Users/UsersManager';
import AddFosterDialog from '../../components/Fosters/AddFosterDialog';
import FosterApplications from '../../components/Fosters/FosterApplications';
import { getFosterApplications, resendFosterLink } from '../../services/FosterApplicationService';
import { USERS_STATUS_OPTIONS } from '../../constants/statuses/usersStatuses';

const FOSTER_ROLE = USERS_STATUS_OPTIONS.ROLE.FOSTER;
const isFoster = (user) => user.role === FOSTER_ROLE;
const LABELS = { title: 'Fosters', singular: 'foster', add: 'Add Foster' };

// "Resend sign-in link" on a foster's row: a fresh 7-day set-password link,
// for example when the first one expired unused.
const ROW_ACTIONS = [
    {
        label: 'Resend sign-in link',
        async onClick(user, { setNotice, setError }) {
            setNotice(`Sending a new sign-in link to ${user.email}...`);

            try {
                const result = await resendFosterLink(user.id);

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

// Fosters, managed like the Users page (same component, fosters only), plus
// an Applications tab where new applications are approved or rejected
// (docs/foster-onboarding.md).
function Fosters() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Bumped to load the applications again (after an approval or rejection).
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const data = await getFosterApplications();

                if (!cancelled) {
                    setApplications(data);
                    setError(null);
                }
            } catch (err) {
                console.error('Failed to load the foster applications:', err);

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
            include={isFoster}
            roleOptions={[FOSTER_ROLE]}
            showRole={false}
            labels={LABELS}
            AddDialog={AddFosterDialog}
            rowActions={ROW_ACTIONS}
            defaultTab="applications"
            extraTab={{
                slug: 'applications',
                label: 'Applications',
                count: pending,
                subtitle: pending > 0 ? `${pending} application(s) awaiting review` : 'Manage fosters and their applications',
                content: ({ reloadUsers, setNotice }) => (
                    <FosterApplications
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

export default Fosters;
