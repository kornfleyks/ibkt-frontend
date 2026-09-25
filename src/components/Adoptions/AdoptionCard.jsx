import {
  Card,
  CardContent,
  Typography,
  Stack,
  Box,
  Chip,
} from "@mui/material";

import PersonIcon from "@mui/icons-material/PersonOutlined";
import Avatar from "@mui/material/Avatar";
import { useNavigate } from "react-router-dom";
import { getAdoptionStageColor } from "../../utils/adoptionStageColor";
import LinkedCatChips from "../Common/LinkedCatChips";

function AdoptionCard({ adoption }) {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/adoptions/${adoption.id}`)}
      sx={{
        height: "100%",
        cursor: "pointer",
        transition: ".2s",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: 4,
        },
      }}
    >
      <CardContent>
        <Stack direction="row" spacing={2}>
          <Avatar sx={{ width: 56, height: 56 }}>
            <PersonIcon />
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {adoption.name}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {adoption.city}
              {adoption.city && adoption.country && " • "}
              {adoption.country}
            </Typography>

            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 1 }}>
              {adoption.adoptionStage && (
                <Chip
                  label={adoption.adoptionStage}
                  size="small"
                  color={getAdoptionStageColor(adoption.adoptionStage)}
                />
              )}
            </Stack>

            <Typography variant="body2" sx={{ mt: 1 }}>
              Case Owner: {adoption.caseOwner || "—"}
            </Typography>

            {/* Not clickable: the whole card is already a link. Always
                rendered, so cards with and without a cat share the layout. */}
            <Box sx={{ mt: 1 }}>
              <LinkedCatChips
                cats={adoption.linkedCats}
                emptyText={
                  <Typography variant="body2" color="text.secondary">
                    No cat linked
                  </Typography>
                }
              />
            </Box>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default AdoptionCard;
