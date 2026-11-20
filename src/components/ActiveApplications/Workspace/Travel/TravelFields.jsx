import { Chip, Grid, Stack, Typography } from "@mui/material";
import InfoRow from "../../../Common/InfoRow";
import RecordField from "../../../Common/RecordField";
import LinkedCatChips from "../../../Common/LinkedCatChips";
import CrateWeightRow from "./CrateWeightRow";
import { TRAVEL_STATUS_OPTIONS } from "../../../../constants/statuses/travelStatuses";

const { STATUS } = TRAVEL_STATUS_OPTIONS;
const STATUS_OPTIONS = Object.values(STATUS);
const CRATE_SIZE_OPTIONS = Object.values(TRAVEL_STATUS_OPTIONS.CRATE_SIZE);
const LABEL_WIDTH = 190;

const STATUS_COLORS = {
  [STATUS.PLANNING]: "default",
  [STATUS.AWAITING_INFORMATION]: "warning",
  [STATUS.READY]: "info",
  [STATUS.IN_TRANSIT]: "info",
  [STATUS.COMPLETED]: "success",
  [STATUS.CANCELLED]: "error",
};

// The fields of a travel record, each saved as soon as it is edited through
// `save(changes)` (which throws on failure so the field can show it). Shared by
// the Travel tab of the application and the Travel tab of the cat.
// `linkedCats` adds a row with the application's cats (left out on the cat page).
function TravelFields({ record, save, linkedCats }) {
  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <RecordField
            label="Status"
            kind="select"
            options={STATUS_OPTIONS}
            value={record.status}
            onSave={(status) => (status ? save({ status }) : Promise.reject(new Error("Pick a status.")))}
            renderValue={(status) =>
              status ? <Chip label={status} size="small" color={STATUS_COLORS[status] ?? "default"} /> : <Typography color="text.secondary">Not set</Typography>
            }
          />
          {linkedCats && (
            <InfoRow
              label={linkedCats.length > 1 ? "Cats" : "Cat"}
              labelWidth={LABEL_WIDTH}
              value={<LinkedCatChips cats={linkedCats} clickable emptyText="Not matched yet" />}
            />
          )}
          <RecordField label="Travel date" kind="date" value={record.travelDate} onSave={(travelDate) => save({ travelDate })} />
          <RecordField label="Arrival date" kind="date" value={record.arrivalDate} onSave={(arrivalDate) => save({ arrivalDate })} />
          <RecordField label="Flight number" kind="text" value={record.flightNumber} onSave={(flightNumber) => save({ flightNumber })} />
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <RecordField label="Crate size" kind="select" options={CRATE_SIZE_OPTIONS} value={record.crateSize} onSave={(crateSize) => save({ crateSize })} />
          <CrateWeightRow weight={record.crateWeight} unit={record.weightUnit} onSave={save} />
          <RecordField label="Departure airport" kind="text" value={record.departureAirport} onSave={(departureAirport) => save({ departureAirport })} />
          <RecordField label="Arrival airport" kind="text" value={record.arrivalAirport} onSave={(arrivalAirport) => save({ arrivalAirport })} />
        </Grid>
      </Grid>

      <RecordField label="Travel notes" kind="longText" value={record.travelNotes} onSave={(travelNotes) => save({ travelNotes })} />
    </Stack>
  );
}

export default TravelFields;
