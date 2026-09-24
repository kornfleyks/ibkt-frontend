// Pure indexing/matching for the header's global search. Each entry is
// { key, group, label, secondary, to, haystack } - `haystack` is the
// lower-cased text a query is matched against.

export const SEARCH_GROUPS = {
  CATS: "Cats",
  APPLICATIONS: "Applications",
  TASKS: "Tasks",
  PAGES: "Pages",
};

// Order the groups appear in the dropdown.
const GROUP_ORDER = [SEARCH_GROUPS.PAGES, SEARCH_GROUPS.CATS, SEARCH_GROUPS.APPLICATIONS, SEARCH_GROUPS.TASKS];

// Mappers fill missing text fields with "N/A" - never worth matching on.
function present(value) {
  return value && value !== "N/A" ? String(value) : "";
}

function joinSecondary(...parts) {
  return parts.map(present).filter(Boolean).join(" · ");
}

function toHaystack(...parts) {
  return parts.map(present).join(" ").toLowerCase();
}

export function buildSearchIndex({ cats = [], applications = [], tasks = [], pages = [] }) {
  return [
    ...pages.map((page) => ({
      key: `page-${page.path}`,
      group: SEARCH_GROUPS.PAGES,
      label: page.title,
      secondary: "",
      to: page.path,
      haystack: toHaystack(page.title),
    })),
    ...cats.map((cat) => ({
      key: `cat-${cat.id}`,
      group: SEARCH_GROUPS.CATS,
      label: cat.name,
      secondary: joinSecondary(cat.status, cat.breed, present(cat.microchipNumber) && `Chip ${cat.microchipNumber}`),
      to: `/cats/${cat.id}`,
      haystack: toHaystack(cat.name, cat.microchipNumber, cat.breed),
    })),
    ...applications.map((application) => ({
      key: `application-${application.id}`,
      group: SEARCH_GROUPS.APPLICATIONS,
      label: application.name,
      secondary: joinSecondary(application.adoptionStage, application.city, application.email),
      to: `/active-applications/${application.id}`,
      haystack: toHaystack(application.name, application.email, application.phone, application.city),
    })),
    ...tasks.map((task) => ({
      key: `task-${task.id}`,
      group: SEARCH_GROUPS.TASKS,
      label: task.title,
      secondary: joinSecondary(task.status, task.linkedCatName),
      // No task detail page - open the Tasks list, all statuses, searched
      // for this task.
      to: `/tasks?tab=all&q=${encodeURIComponent(task.title)}`,
      haystack: toHaystack(task.title, task.linkedCatName),
    })),
  ];
}

// Every word of the query must appear somewhere in the entry. Within a
// group, labels that start with the query rank first. At most `perGroup`
// results per group, groups in GROUP_ORDER.
export function searchIndex(index, query, perGroup = 5) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return [];
  }

  const words = normalized.split(/\s+/);

  const matches = index.filter((entry) => words.every((word) => entry.haystack.includes(word)));

  return GROUP_ORDER.flatMap((group) =>
    matches
      .filter((entry) => entry.group === group)
      .sort((a, b) => {
        const aStarts = a.label.toLowerCase().startsWith(normalized) ? 0 : 1;
        const bStarts = b.label.toLowerCase().startsWith(normalized) ? 0 : 1;

        return aStarts - bStarts || a.label.localeCompare(b.label);
      })
      .slice(0, perGroup),
  );
}
