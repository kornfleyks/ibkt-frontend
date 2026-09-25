import { USERS_STATUS_OPTIONS } from '../../constants/statuses/usersStatuses';

const { ACCOUNT_STATUS } = USERS_STATUS_OPTIONS;

// Status changes that take someone out of action - the server hands their
// open cases and tasks to the Admin confirming this.
export const HANDOVER_STATUSES = [ACCOUNT_STATUS.SUSPENDED, ACCOUNT_STATUS.ARCHIVED];

// Each action the Users page offers; `restore` lets the Admin pick the
// target status in the dialog.
export const USER_STATUS_ACTIONS = {
    approve: { label: 'Approve', status: ACCOUNT_STATUS.ACTIVE, title: 'Approve this account?', color: 'success' },
    reject: { label: 'Reject', status: ACCOUNT_STATUS.ARCHIVED, title: 'Reject this account?', color: 'error' },
    suspend: { label: 'Suspend', status: ACCOUNT_STATUS.SUSPENDED, title: 'Suspend this account?', color: 'error' },
    reactivate: { label: 'Reactivate', status: ACCOUNT_STATUS.ACTIVE, title: 'Reactivate this account?', color: 'success' },
    archive: { label: 'Archive', status: ACCOUNT_STATUS.ARCHIVED, title: 'Archive this account?', color: 'error' },
    restore: { label: 'Restore', status: null, title: 'Restore this account?', color: 'success' },
};

// Which actions each account status offers, in button order.
export const ACTIONS_BY_STATUS = {
    [ACCOUNT_STATUS.PENDING]: ['approve', 'reject'],
    [ACCOUNT_STATUS.ACTIVE]: ['suspend', 'archive'],
    [ACCOUNT_STATUS.SUSPENDED]: ['reactivate', 'archive'],
    [ACCOUNT_STATUS.ARCHIVED]: ['restore'],
};
