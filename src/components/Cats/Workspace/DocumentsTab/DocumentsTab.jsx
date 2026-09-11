import { Stack, Button } from "@mui/material";

import UploadIcon from "@mui/icons-material/UploadOutlined";

import SectionCard from "../../../Common/SectionCard";
import InfoRow from "../../../Common/InfoRow";
import BooleanStatus from "../../../Common/BooleanStatus";

function DocumentsTab({ cat }) {
  return (
    <SectionCard title="Documents">
      <Stack spacing={2}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <InfoRow
            label="Passport"
            value={<BooleanStatus value={Boolean(cat.passportFile)} />}
          />

          {cat.passportFile && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => window.open(cat.passportFile.url, "_blank")}
              sx={{
                color: "text.primary",
                borderColor: "divider",
                "&:hover": {
                  borderColor: "text.primary",
                  backgroundColor: "action.hover",
                },
              }}
            >
              Open
            </Button>
          )}
        </Stack>

        <Stack
    direction="row"
    justifyContent="space-between"
    alignItems="center"
>
    <InfoRow
        label="Medical Documents"
        value={
            <BooleanStatus
                value={Boolean(cat.medicalDocuments)}
            />
        }
    />

    {cat.medicalDocuments && (
        <Button
            size="small"
            variant="outlined"
            onClick={() => window.open(cat.medicalDocuments.url, '_blank')}
            sx={{
                color: 'text.primary',
                borderColor: 'divider',
                '&:hover': {
                    borderColor: 'text.primary',
                    backgroundColor: 'action.hover'
                }
            }}
        >
            Open
        </Button>
    )}
</Stack>
      </Stack>
    </SectionCard>
  );
}

export default DocumentsTab;
