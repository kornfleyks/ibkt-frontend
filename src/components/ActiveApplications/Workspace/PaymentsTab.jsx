import { Chip, TextField, MenuItem, Stack, Typography } from "@mui/material";
import SectionCard from "../../Common/SectionCard";
import EditableInfoRow from "../../Common/EditableInfoRow";
import InfoRow from "../../Common/InfoRow";
import { ADOPTION_EDITABLE_FIELDS, updateAdoptionField } from "../../../services/ActiveApplicationsService";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../../../constants/statuses/activeApplicationsStatuses";
import useDateFormat from "../../../hooks/useDateFormat";
import { todayLocal } from "../../../utils/localDate";

const { PAYMENT_STATUS } = ACTIVE_APPLICATIONS_STATUS_OPTIONS;
const STATUS_OPTIONS = ADOPTION_EDITABLE_FIELDS.paymentStatus.options;
const LABEL_WIDTH = 160;

const STATUS_COLORS = {
  [PAYMENT_STATUS.PAID]: "success",
  [PAYMENT_STATUS.PENDING]: "warning",
  [PAYMENT_STATUS.NOT_SENT]: "default",
  [PAYMENT_STATUS.REFUNDED]: "info",
};

// Marked by hand for now. Choosing Paid fills in today's payment date when
// none is set; the date is never cleared automatically (only by hand).
// Both changes are logged like any application edit.
function PaymentsTab({ application, onApplicationChange }) {
  const { formatDateString } = useDateFormat();

  async function saveStatus(status) {
    if (status === application.paymentStatus) {
      return;
    }

    await updateAdoptionField(application.id, "paymentStatus", status);

    const changes = { paymentStatus: status };

    if (status === PAYMENT_STATUS.PAID && !application.paymentDate) {
      const date = todayLocal();

      try {
        await updateAdoptionField(application.id, "paymentDate", date);
        changes.paymentDate = date;
      } finally {
        onApplicationChange(changes);
      }

      return;
    }

    onApplicationChange(changes);
  }

  async function saveDate(date) {
    if (date === application.paymentDate) {
      return;
    }

    await updateAdoptionField(application.id, "paymentDate", date);
    onApplicationChange({ paymentDate: date });
  }

  return (
    <SectionCard title="Payment">
      <Stack spacing={0.5}>
        <EditableInfoRow
          label="Payment status"
          renderDisplay={() => (
            <InfoRow
              label="Payment status"
              labelWidth={LABEL_WIDTH}
              value={
                application.paymentStatus ? (
                  <Chip label={application.paymentStatus} size="small" color={STATUS_COLORS[application.paymentStatus] ?? "default"} />
                ) : (
                  <Typography color="text.secondary">Not set</Typography>
                )
              }
            />
          )}
          getEditValue={() => application.paymentStatus || ""}
          renderEditor={(value, setValue, saving) => (
            <TextField
              select
              fullWidth
              size="small"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              disabled={saving}
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          )}
          onSave={(value) => (value ? saveStatus(value) : Promise.reject(new Error("Pick a status.")))}
        />

        <EditableInfoRow
          label="Payment date"
          renderDisplay={() => (
            <InfoRow
              label="Payment date"
              labelWidth={LABEL_WIDTH}
              value={application.paymentDate ? formatDateString(application.paymentDate) : "Not set"}
            />
          )}
          getEditValue={() => application.paymentDate || ""}
          renderEditor={(value, setValue, saving) => (
            <TextField
              fullWidth
              size="small"
              type="date"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              disabled={saving}
              helperText="Leave empty to clear."
              sx={{ "& input": { minWidth: 130 } }}
            />
          )}
          onSave={saveDate}
        />
      </Stack>
    </SectionCard>
  );
}

export default PaymentsTab;
