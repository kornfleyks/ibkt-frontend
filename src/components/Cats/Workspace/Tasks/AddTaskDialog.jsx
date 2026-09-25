import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Grid,
  TextField,
  MenuItem,
  Autocomplete,
  Alert,
} from "@mui/material";
import { CloseIcon } from "../../../icons";

import { createCatTask, getTaskTitleOptions } from "../../../../services/TasksService";
import { getUsers } from "../../../../services/UsersService";
import { getCats } from "../../../../services/CatsService";
import { TASKS_STATUS_OPTIONS } from "../../../../constants/statuses/tasksStatuses";

const STATUS_OPTIONS = Object.values(TASKS_STATUS_OPTIONS.STATUS);
const PRIORITY_OPTIONS = Object.values(TASKS_STATUS_OPTIONS.PRIORITY);

const initialForm = {
  title: "",
  description: "",
  status: "",
  priority: "",
  dueDate: "",
  waitingReason: "",
};

function AddTaskDialog({ open, catId, onClose, onCreated }) {
  const requiresCatPicker = !catId;

  const [form, setForm] = useState(initialForm);
  const [owner, setOwner] = useState(null);
  const [selectedCat, setSelectedCat] = useState(null);
  const [titleOptions, setTitleOptions] = useState([]);
  const [users, setUsers] = useState([]);
  const [cats, setCats] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    getTaskTitleOptions()
      .then(setTitleOptions)
      .catch((err) => {
        console.error("Failed to load task title options:", err);
        setLoadError((current) => current ?? "Couldn't load task titles - you can still type one in.");
      });

    getUsers()
      .then(setUsers)
      .catch((err) => {
        console.error("Failed to load users:", err);
        setLoadError((current) => current ?? "Couldn't load the user list - try reopening this dialog.");
      });

    if (requiresCatPicker) {
      getCats()
        .then(setCats)
        .catch((err) => {
          console.error("Failed to load cats:", err);
          setLoadError((current) => current ?? "Couldn't load the cat list - try reopening this dialog.");
        });
    }
  }, [open, requiresCatPicker]);

  function setField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleClose() {
    if (saving) {
      return;
    }

    setForm(initialForm);
    setOwner(null);
    setSelectedCat(null);
    setError(null);
    setLoadError(null);
    onClose();
  }

  async function handleSubmit() {
    if (requiresCatPicker && !selectedCat) {
      setError("Cat is required.");
      return;
    }

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    if (!form.description.trim()) {
      setError("Description is required.");
      return;
    }

    if (!form.status) {
      setError("Status is required.");
      return;
    }

    if (!form.priority) {
      setError("Priority is required.");
      return;
    }

    if (form.status === TASKS_STATUS_OPTIONS.STATUS.WAITING && !form.waitingReason.trim()) {
      setError("Waiting Reason is required.");
      return;
    }

    if (!form.dueDate) {
      setError("Due Date is required.");
      return;
    }

    if (!owner) {
      setError("Owner is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const task = await createCatTask(catId ?? selectedCat.id, {
        title: form.title,
        description: form.description,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || null,
        ownerId: owner?.id ?? null,
        waitingReason: form.waitingReason,
      });

      onCreated?.(task);
      handleClose();
    } catch (err) {
      console.error("Failed to create task:", err);
      setError("Something went wrong while saving this task. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: "1.1rem" }}>
        Add Task
        <IconButton
          onClick={handleClose}
          disabled={saving}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ "& > * + *": { mt: 2 } }}>
        {loadError && <Alert severity="warning">{loadError}</Alert>}

        <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
          {requiresCatPicker && (
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                size="small"
                options={cats}
                getOptionLabel={(option) => option.name ?? ""}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={selectedCat}
                onChange={(event, value) => setSelectedCat(value)}
                renderInput={(params) => <TextField {...params} label="Cat" required />}
              />
            </Grid>
          )}

          <Grid size={{ xs: 12 }}>
            <Autocomplete
              freeSolo
              size="small"
              options={titleOptions}
              value={form.title}
              onInputChange={(event, value) => setField("title", value)}
              renderInput={(params) => <TextField {...params} label="Title" required />}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              label="Description"
              required
              value={form.description}
              onChange={(event) => setField("description", event.target.value)}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Status"
              required
              value={form.status}
              onChange={(event) => setField("status", event.target.value)}
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Priority"
              required
              value={form.priority}
              onChange={(event) => setField("priority", event.target.value)}
            >
              {PRIORITY_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {form.status === TASKS_STATUS_OPTIONS.STATUS.WAITING && (
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={2}
                label="Waiting Reason"
                required
                value={form.waitingReason}
                onChange={(event) => setField("waitingReason", event.target.value)}
              />
            </Grid>
          )}

          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Due Date"
              required
              slotProps={{ inputLabel: { shrink: true } }}
              value={form.dueDate}
              onChange={(event) => setField("dueDate", event.target.value)}
              sx={{ '& input': { minWidth: 130 } }}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Autocomplete
              size="small"
              options={users}
              getOptionLabel={(option) => option.name ?? ""}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={owner}
              onChange={(event, value) => setOwner(value)}
              renderInput={(params) => <TextField {...params} label="Owner" required />}
            />
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ fontSize: "0.8125rem" }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button size="small" onClick={handleClose} disabled={saving}>
          Cancel
        </Button>

        <Button size="small" variant="contained" onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving..." : "Add Task"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddTaskDialog;
