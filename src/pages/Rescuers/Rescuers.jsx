import { useEffect, useState } from 'react';
import { Typography } from '@mui/material';
import UsersManager from '../../components/Users/UsersManager';
import AddRescuerDialog from '../../components/Rescuers/AddRescuerDialog';
import RescuerApplications from '../../components/Rescuers/RescuerApplications';
import WixRescuerRequests from '../../components/Rescuers/WixRescuerRequests';
import { getRescuerApplications, resendRescuerLink } from '../../services/RescuerApplicationService';
import { getWixRequests } from '../../services/RescuerAgreementService';
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

// Loads a list on mount and again whenever the returned `reload` is called.
// Resolves the way the page needs it: { items, loading, error, reload }.
function useList(load, failure) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            try {
                const data = await load();

                if (!cancelled) {
                    setItems(data);
                    setError(null);
                }
            } catch (err) {
                console.error(`${failure}:`, err);

                if (!cancelled) setError(failure);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        run();

        return () => {
            cancelled = true;
        };
    }, [load, failure, reloadKey]);

    return { items, loading, error, reload: () => setReloadKey((key) => key + 1) };
}

// Rescuers, in the order a person goes through (docs/rescuer-agreement.md,
// docs/rescuer-onboarding.md). Three tabs, each with at most one row of filters:
//   Wix requests  people who filled in the rescuer form on the Wix site; after
//                 the call an Admin approves them and they are sent the agreement
//   Applications  the Oriel sign-up form, after the agreement is signed
//   Rescuers      the accounts (managed like the Users page, rescuers only)
function Rescuers() {
    const applications = useList(getRescuerApplications, 'Failed to load the applications.');
    const requests = useList(getWixRequests, 'Failed to load the requests from Wix.');

    const pending = applications.items.filter((application) => application.status === 'Pending').length;
    const unapproved = requests.items.filter((request) => request.agreement.status === 'none' && request.email).length;

    const extraTabs = [
        {
            slug: 'requests',
            label: 'Wix requests',
            count: unapproved,
            subtitle: unapproved > 0 ? `${unapproved} request(s) from Wix waiting for approval` : 'Manage rescuers, their requests and applications',
            content: ({ setNotice }) => (
                <WixRescuerRequests requests={requests.items} loading={requests.loading} error={requests.error} setNotice={setNotice} onChanged={requests.reload} />
            ),
        },
        {
            slug: 'applications',
            label: 'Applications',
            count: pending,
            subtitle: pending > 0 ? `${pending} application(s) awaiting review` : 'Manage rescuers, their requests and applications',
            content: ({ reloadUsers, setNotice }) => (
                <>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Rescuers who filled in the Oriel sign-up form. They are approved automatically unless the account could not be created.
                    </Typography>

                    <RescuerApplications
                        applications={applications.items}
                        loading={applications.loading}
                        error={applications.error}
                        setNotice={setNotice}
                        onChanged={() => {
                            applications.reload();
                            reloadUsers();
                        }}
                    />
                </>
            ),
        },
    ];

    return (
        <UsersManager
            include={isRescuer}
            roleOptions={[RESCUER_ROLE]}
            showRole={false}
            labels={LABELS}
            AddDialog={AddRescuerDialog}
            rowActions={ROW_ACTIONS}
            defaultTab="requests"
            extraTabs={extraTabs}
        />
    );
}

export default Rescuers;
