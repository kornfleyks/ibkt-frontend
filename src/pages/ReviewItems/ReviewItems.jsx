import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import PageHeader from "../../components/PageHeader";
import RecordField from "../../components/Common/RecordField";
import { AddIcon, DeleteIcon } from "../../components/icons";
import {
  getReviewItems,
  createReviewItem,
  updateReviewItem,
  deleteReviewItem,
} from "../../services/ReviewItemsService";
import useDateFormat from "../../hooks/useDateFormat";

// A standing punch-list for client calls: questions to put to the client,
// things to flag to them, and internal to-dos, with a place to record the
// answer. Visible only to one developer account (src/routes/AppRoutes.jsx),
// and Admin-only on the server (server/reviewItems/).

const SECTIONS = [
  { category: "question", title: "Questions for the client", empty: "No open questions for the client." },
  { category: "flag", title: "Things to flag to the client", empty: "Nothing to flag right now." },
  { category: "internal", title: "Internal / to do", empty: "No internal notes." },
];

const ALL_FILTER = "all";
const FILTER_LABELS = { question: "Questions", flag: "Flags", internal: "Internal" };

// Open work first, finished work last.
const STATUS_ORDER = { open: 0, answered: 1, resolved: 2 };

const SHOW_RESOLVED_KEY = "ibkt.reviewItems.showResolved";

// Storage can be unavailable (private mode, blocked site data) - the toggle
// then simply isn't remembered, it still works for the visit.
function readShowResolved() {
  try {
    return window.localStorage.getItem(SHOW_RESOLVED_KEY) === "true";
  } catch {
    return false;
  }
}

function writeShowResolved(value) {
  try {
    window.localStorage.setItem(SHOW_RESOLVED_KEY, String(value));
  } catch {
    // Not remembered - see readShowResolved.
  }
}

const PRIORITY_OPTIONS = ["high", "medium", "low"];
const PRIORITY_LABELS = { high: "High", medium: "Medium", low: "Low" };
const PRIORITY_COLORS = { high: "error", medium: "warning", low: "default" };
// The filter value for items with no priority set.
const NO_PRIORITY = "none";
// High first, unset last.
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

function priorityRank(item) {
  return PRIORITY_ORDER[item.priority] ?? PRIORITY_OPTIONS.length;
}

function PriorityField({ value, onChange, label }) {
  return (
    <TextField
      select
      size="small"
      label={label}
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value || null)}
      sx={{ minWidth: 118 }}
    >
      <MenuItem value="">
        <em>None</em>
      </MenuItem>
      {PRIORITY_OPTIONS.map((priority) => (
        <MenuItem key={priority} value={priority}>
          {PRIORITY_LABELS[priority]}
        </MenuItem>
      ))}
    </TextField>
  );
}

const STATUS_OPTIONS = ["open", "answered", "resolved"];
const STATUS_LABELS = { open: "Open", answered: "Answered", resolved: "Resolved" };
const STATUS_COLORS = { open: "warning", answered: "info", resolved: "success" };

function NewItemDialog({ category, open, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [priority, setPriority] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function close() {
    if (saving) return;

    setTitle("");
    setDetail("");
    setPriority(null);
    setError(null);
    onClose();
  }

  async function save() {
    if (!title.trim()) {
      setError("A title is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const item = await createReviewItem({ category, title, detail, priority });
      onCreated(item);
      close();
    } catch (err) {
      console.error("Failed to add the item:", err);
      setError(err?.message || "Failed to add the item.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>Add item</DialogTitle>

      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            autoFocus
            fullWidth
          />
          <TextField
            label="Detail (optional)"
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <PriorityField label="Priority" value={priority} onChange={setPriority} />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={close} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DeleteConfirm({ item, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  async function confirm() {
    setDeleting(true);

    try {
      await deleteReviewItem(item.id);
      onDeleted(item.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open onClose={() => !deleting && onClose()}>
      <DialogTitle>Delete this item?</DialogTitle>
      <DialogContent>
        <Typography>
          &quot;{item.title}&quot; will be removed. This can&apos;t be undone.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button variant="contained" color="error" onClick={confirm} disabled={deleting}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ReviewItemCard({ item, onChange, onDelete }) {
  const { formatDateTime } = useDateFormat();
  const [expanded, setExpanded] = useState(false);

  const [saveError, setSaveError] = useState(null);

  async function save(changes) {
    setSaveError(null);

    try {
      const updated = await updateReviewItem(item.id, changes);
      onChange(updated);
    } catch (err) {
      console.error("Failed to save the item:", err);
      setSaveError(err?.message || "Failed to save.");
      // RecordField awaits onSave to know whether the edit stuck.
      throw err;
    }
  }

  return (
    <Card variant="outlined">
      <CardContent sx={{ "&:last-child": { pb: 2 } }}>
        <Stack spacing={1}>
          <Stack
            direction="row"
            spacing={1.5}
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            onClick={() => setExpanded((current) => !current)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setExpanded((current) => !current);
              }
            }}
            sx={{ alignItems: "center", cursor: "pointer" }}
          >
            <Chip
              size="small"
              label={STATUS_LABELS[item.status]}
              color={STATUS_COLORS[item.status]}
              sx={{ flexShrink: 0 }}
            />
            {item.priority && (
              <Chip
                size="small"
                variant="outlined"
                label={PRIORITY_LABELS[item.priority]}
                color={PRIORITY_COLORS[item.priority]}
                sx={{ flexShrink: 0 }}
              />
            )}
            <Typography noWrap sx={{ fontWeight: 600, flexShrink: 0, maxWidth: "60%" }}>
              {item.title}
            </Typography>
            {!expanded && item.answer && (
              <Typography noWrap variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>
                {item.answer}
              </Typography>
            )}
          </Stack>

          <Collapse in={expanded} unmountOnExit>
            <Stack spacing={1} sx={{ pt: 1 }}>
              {saveError && <Alert severity="error">{saveError}</Alert>}

              {item.detail && (
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                  {item.detail}
                </Typography>
              )}

              <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
                <TextField
                  select
                  size="small"
                  value={item.status}
                  onChange={(event) => save({ status: event.target.value }).catch(() => {})}
                  sx={{ minWidth: 118 }}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status} value={status}>
                      <Chip size="small" label={STATUS_LABELS[status]} color={STATUS_COLORS[status]} />
                    </MenuItem>
                  ))}
                </TextField>

                <PriorityField
                  label="Priority"
                  value={item.priority}
                  onChange={(priority) => save({ priority }).catch(() => {})}
                />

                <Box sx={{ flex: 1 }} />

                <Tooltip title="Delete">
                  <IconButton size="small" onClick={() => onDelete(item)} aria-label={`Delete ${item.title}`}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>

              <RecordField
                label="Answer / notes"
                value={item.answer}
                kind="longText"
                onSave={(value) => save({ answer: value })}
              />

              {item.answeredAt && (
                <Typography variant="caption" color="text.secondary">
                  Last answered {formatDateTime(new Date(item.answeredAt))}
                  {item.answeredByName ? ` by ${item.answeredByName}` : ""}
                </Typography>
              )}
            </Stack>
          </Collapse>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ReviewItems() {
  // undefined while loading, null on failure.
  const [items, setItems] = useState(undefined);
  const [error, setError] = useState(null);
  const [addingFor, setAddingFor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [filter, setFilter] = useState(ALL_FILTER);
  const [priorityFilter, setPriorityFilter] = useState(ALL_FILTER);
  const [showResolved, setShowResolved] = useState(readShowResolved);

  useEffect(() => {
    let cancelled = false;

    getReviewItems()
      .then((data) => {
        if (cancelled) return;

        setItems(data);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load review items:", err);

        if (!cancelled) {
          setError(err?.message || "Failed to load.");
          setItems(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function replaceItem(updated) {
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  }

  function addItem(item) {
    setItems((current) => [...current, item]);
  }

  function removeItem(id) {
    setItems((current) => current.filter((item) => item.id !== id));
    setDeleting(null);
  }

  function updateShowResolved(value) {
    setShowResolved(value);
    writeShowResolved(value);
  }

  const allItems = items ?? [];
  const resolvedCount = allItems.filter((item) => item.status === "resolved").length;
  const shownItems = showResolved ? allItems : allItems.filter((item) => item.status !== "resolved");
  const matchesPriority = (item) =>
    priorityFilter === ALL_FILTER || (item.priority ?? NO_PRIORITY) === priorityFilter;
  // Category chip counts respect the priority filter, and priority chip
  // counts respect the category filter, so each shows what clicking yields.
  const visibleItems = shownItems.filter(matchesPriority);
  const priorityChipItems = shownItems.filter((item) => filter === ALL_FILTER || item.category === filter);

  return (
    <>
      <PageHeader
        title="Client Review"
        subtitle="Questions and flags for client calls - visible only to you"
      />

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {items === undefined ? (
        <Stack sx={{ alignItems: "center", py: 4 }}>
          <CircularProgress size={28} sx={{ color: "text.secondary" }} />
        </Stack>
      ) : (
        <Stack spacing={4}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ flexWrap: "wrap", rowGap: 1, alignItems: "center", justifyContent: "space-between" }}
          >
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
              <Chip
                label={`All (${visibleItems.length})`}
                color={filter === ALL_FILTER ? "primary" : "default"}
                variant={filter === ALL_FILTER ? "filled" : "outlined"}
                onClick={() => setFilter(ALL_FILTER)}
              />
              {SECTIONS.map((section) => {
                const count = visibleItems.filter((item) => item.category === section.category).length;
                const selected = filter === section.category;

                return (
                  <Chip
                    key={section.category}
                    label={`${FILTER_LABELS[section.category]} (${count})`}
                    color={selected ? "primary" : "default"}
                    variant={selected ? "filled" : "outlined"}
                    onClick={() => setFilter(section.category)}
                  />
                );
              })}
            </Stack>

            <FormControlLabel
              control={<Switch size="small" checked={showResolved} onChange={(event) => updateShowResolved(event.target.checked)} />}
              label={`Show resolved (${resolvedCount})`}
            />
          </Stack>

          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1, alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Priority
            </Typography>
            {[
              { value: ALL_FILTER, label: "All", count: priorityChipItems.length },
              ...PRIORITY_OPTIONS.map((priority) => ({
                value: priority,
                label: PRIORITY_LABELS[priority],
                count: priorityChipItems.filter((item) => item.priority === priority).length,
              })),
              { value: NO_PRIORITY, label: "None", count: priorityChipItems.filter((item) => !item.priority).length },
            ].map((option) => {
              const selected = priorityFilter === option.value;

              return (
                <Chip
                  key={option.value}
                  size="small"
                  label={`${option.label} (${option.count})`}
                  color={selected ? "primary" : "default"}
                  variant={selected ? "filled" : "outlined"}
                  onClick={() => setPriorityFilter(option.value)}
                />
              );
            })}
          </Stack>

          {SECTIONS.filter((section) => filter === ALL_FILTER || filter === section.category).map((section) => {
            const sectionItems = visibleItems
              .filter((item) => item.category === section.category)
              .sort(
                (a, b) =>
                  (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0) || priorityRank(a) - priorityRank(b),
              );

            return (
              <Stack key={section.category} spacing={2}>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                  <Typography variant="h6">{section.title}</Typography>
                  <Button size="small" startIcon={<AddIcon />} onClick={() => setAddingFor(section.category)}>
                    Add
                  </Button>
                </Stack>

                {sectionItems.length === 0 ? (
                  <Typography color="text.secondary">{section.empty}</Typography>
                ) : (
                  <Stack spacing={2}>
                    {sectionItems.map((item) => (
                      <ReviewItemCard key={item.id} item={item} onChange={replaceItem} onDelete={setDeleting} />
                    ))}
                  </Stack>
                )}
              </Stack>
            );
          })}
        </Stack>
      )}

      {addingFor && (
        <NewItemDialog
          category={addingFor}
          open
          onClose={() => setAddingFor(null)}
          onCreated={addItem}
        />
      )}

      {deleting && <DeleteConfirm item={deleting} onClose={() => setDeleting(null)} onDeleted={removeItem} />}
    </>
  );
}

export default ReviewItems;
