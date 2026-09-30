import { canAccessPath } from '../../utils/navigationAccess';

// What each dashboard number lists when clicked (DashboardDetailsDialog):
// its columns and the page a row opens. `formatDateString` comes from
// useDateFormat; `user` decides whether rows link (only into sections the
// user's role can open). Travel and Post-Adoption items only carry their
// name and status so far.
export function dashboardDetails({ formatDateString, user }) {

    const canOpen = (path) => canAccessPath(path, user);
    const catLink = (cat) => (canOpen('/cats') ? `/cats/${cat.id}` : null);
    const applicationLink = (application) => (canOpen('/active-applications') ? `/active-applications/${application.id}` : null);
    // No task detail page - the Tasks list, searched for it.
    const taskLink = (task) => (canOpen('/tasks') ? `/tasks?tab=all&q=${encodeURIComponent(task.title)}` : null);

    const linkedCats = (application) => application.linkedCats?.map((cat) => cat.name).join(', ');

    return {
        awaitingPassport: {
            title: 'Awaiting Passport',
            rowLink: catLink,
            columns: [
                { key: 'name', label: 'Cat', value: (cat) => cat.name },
                { key: 'status', label: 'Status', value: (cat) => cat.status },
                { key: 'rescuer', label: 'Rescuer', value: (cat) => cat.rescuer },
                { key: 'foster', label: 'Foster', value: (cat) => cat.foster },
                { key: 'microchip', label: 'Microchip', value: (cat) => cat.microchipNumber },
            ],
        },

        pendingMatching: {
            title: 'Pending Matching',
            rowLink: applicationLink,
            columns: [
                { key: 'name', label: 'Applicant', value: (application) => application.name },
                { key: 'stage', label: 'Stage', value: (application) => application.adoptionStage },
                { key: 'owner', label: 'Case Owner', value: (application) => application.caseOwner },
                { key: 'priority', label: 'Priority', value: (application) => application.priority },
                { key: 'country', label: 'Country', value: (application) => application.country },
                { key: 'created', label: 'Created', value: (application) => formatDateString(application.creationDate) },
            ],
        },

        escalationsRequired: {
            title: 'Escalations Required',
            rowLink: null,
            columns: [
                { key: 'name', label: 'Case', value: (item) => item.name },
                { key: 'status', label: 'Status', value: (item) => item.status },
                { key: 'escalation', label: 'Escalation', value: (item) => item.escalationRequired },
            ],
        },

        tasksDueToday: {
            title: 'Tasks Due Today',
            rowLink: taskLink,
            columns: [
                { key: 'title', label: 'Task', value: (task) => task.title },
                { key: 'due', label: 'Due', value: (task) => formatDateString(task.dueDate) },
                { key: 'status', label: 'Status', value: (task) => task.status },
                { key: 'owner', label: 'Owner', value: (task) => task.ownerName },
                { key: 'priority', label: 'Priority', value: (task) => task.priority },
                { key: 'linked', label: 'Linked To', value: (task) => [task.linkedCatName, task.linkedApplicationName].filter(Boolean).join(' · ') },
            ],
        },

        travelPending: {
            title: 'Travel Pending',
            rowLink: null,
            columns: [
                { key: 'name', label: 'Travel', value: (item) => item.name },
                { key: 'status', label: 'Status', value: (item) => item.status },
            ],
        },

        myOpenCases: {
            title: 'My Open Cases',
            rowLink: applicationLink,
            columns: [
                { key: 'name', label: 'Applicant', value: (application) => application.name },
                { key: 'stage', label: 'Stage', value: (application) => application.adoptionStage },
                { key: 'health', label: 'Case Health', value: (application) => application.caseHealth },
                { key: 'priority', label: 'Priority', value: (application) => application.priority },
                { key: 'cats', label: 'Linked Cats', value: linkedCats },
            ],
        },
    };

}
