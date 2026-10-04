import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
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

const STATUS_OPTIONS = ["open", "answered", "resolved"];
const STATUS_LABELS = { open: "Open", answered: "Answered", resolved: "Resolved" };
const STATUS_COLORS = { open: "warning", answered: "info", resolved: "success" };

function NewItemDialog({ category, open, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function close() {
    if (saving) return;

    setTitle("");
    setDetail("");
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
      const item = await createReviewItem({ category, title, detail });
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

  async function save(changes) {
    const updated = await updateReviewItem(item.id, changes);
    onChange(updated);
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start", justifyContent: "space-between" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600 }}>{item.title}</Typography>
              {item.detail && (
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-wrap" }}>
                  {item.detail}
                </Typography>
              )}
            </Box>

            <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexShrink: 0 }}>
              <TextField
                select
                size="small"
                value={item.status}
                onChange={(event) => save({ status: event.target.value })}
                sx={{ minWidth: 118 }}
              >
                {STATUS_OPTIONS.map((status) => (
                  <MenuItem key={status} value={status}>
                    <Chip size="small" label={STATUS_LABELS[status]} color={STATUS_COLORS[status]} />
                  </MenuItem>
                ))}
              </TextField>

              <Tooltip title="Delete">
                <IconButton size="small" onClick={() => onDelete(item)} aria-label={`Delete ${item.title}`}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
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
          {SECTIONS.map((section) => {
            const sectionItems = (items ?? []).filter((item) => item.category === section.category);

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
