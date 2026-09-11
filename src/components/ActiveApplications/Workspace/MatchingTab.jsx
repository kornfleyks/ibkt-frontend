import { useEffect, useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
} from "@mui/material";

import { getAvailableCats } from "../../../services/CatsService";
import { useLoading } from "../../../context/LoadingContext";
import { matchCatToActiveApplication } from "../../../services/ActiveApplicationsService";

function MatchingTab({ application }) {
  const [cats, setCats] = useState([]);
  const [selectedCat, setSelectedCat] = useState(null);
  const [changingMatch, setChangingMatch] = useState(false);
  const { showLoading, hideLoading } = useLoading();

  async function loadCats() {
    showLoading("Loading cats...");

    try {
      const data = await getAvailableCats();
      setCats(data);
    } finally {
      hideLoading();
    }
  }

  useEffect(() => {
    loadCats();
  }, []);

  async function handleMatch() {
    if (!selectedCat) {
      return;
    }

    showLoading("Matching cat...");

    try {
      await matchCatToActiveApplication(application.id, selectedCat.id);

      setCats((currentCats) =>
        currentCats.filter((cat) => cat.id !== selectedCat.id),
      );

      setSelectedCat(null);
    } catch (error) {
      console.error("Failed to match cat:", error);
    } finally {
      hideLoading();
    }
  }

  if (application.linkedCatId && !changingMatch) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={600}>
            Matched Cat
          </Typography>

          <Typography sx={{ mt: 1 }}>{application.linkedCatName}</Typography>

          <Button
            variant="outlined"
            sx={{
              mt: 2,
              color: "text.primary",
              borderColor: "divider",
              "&:hover": {
                borderColor: "text.primary",
                backgroundColor: "action.hover",
              },
            }}
            onClick={() => setChangingMatch(true)}
          >
            Change Match
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Grid container spacing={2}>
      {cats.map((cat) => (
        <Grid
          key={cat.id}
          size={{
            xs: 12,
            md: 6,
            lg: 4,
          }}
        >
          <Card
            onClick={() => setSelectedCat(cat)}
            sx={{
              cursor: "pointer",
              height: "100%",
              border: selectedCat?.id === cat.id ? 2 : 1,
              borderColor:
                selectedCat?.id === cat.id ? "primary.main" : "divider",
            }}
          >
            <CardContent>
              <Typography variant="h6" fontWeight={600}>
                {cat.name}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {cat.gender} • {cat.age} years
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
                {cat.breed && <Chip label={cat.breed} size="small" />}

                {cat.adoptionReady && (
                  <Chip
                    label={`Adoption Ready: ${cat.adoptionReady}`}
                    size="small"
                  />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {selectedCat && (
        <Grid size={{ xs: 12 }}>
          <Button variant="contained" size="large" onClick={handleMatch}>
            Match {selectedCat.name} with {application.name}
          </Button>
        </Grid>
      )}
    </Grid>
  );
}

export default MatchingTab;
