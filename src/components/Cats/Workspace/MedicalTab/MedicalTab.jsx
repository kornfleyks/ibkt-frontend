import {
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
} from "@mui/material";
import BooleanStatus from "../../../Common/BooleanStatus";
import SectionCard from "../../../Common/SectionCard";

function MedicalTab({ cat }) {
  return (
    <Grid container spacing={3}>
      <Grid
        size={{
          xs: 12,

          md: 6,
        }}
      >
        <SectionCard title="Medical Status">
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between">
              <Typography
                sx={{
                  width: 150,
                }}
              >
                Vaccinated
              </Typography>
              <BooleanStatus value={cat.vaccinated} />
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography
                sx={{
                  width: 150,
                }}
              >
                Sterilized
              </Typography>
              <BooleanStatus value={cat.sterilized} />
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography
                sx={{
                  width: 150,
                }}
              >
                Passport
              </Typography>
              <BooleanStatus value={cat.passportComplete} />
            </Stack>
            <Stack
                direction="row"
                justifyContent="space-between"
            >
                <Typography
                    sx={{
                        width: 150
                    }}
                >
                    Medication Required
                </Typography>

                <BooleanStatus value={cat.medicationRequired} />
            </Stack>
          </Stack>
        </SectionCard>
      </Grid>

      <Grid
        size={{
          xs: 12,

          md: 6,
        }}
      >
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Additional Information
            </Typography>

            <Typography>
              <strong>Microchip:</strong> {cat.microchipNumber || '—'}
            </Typography>

            <Typography sx={{ mt: 1 }}>
              <strong>FIV / FeLV:</strong> {cat.felvFivStatus}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default MedicalTab;
