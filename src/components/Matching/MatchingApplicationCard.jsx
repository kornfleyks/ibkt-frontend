import { Card, CardActionArea, CardContent, Typography, Stack, Box, Chip, Avatar } from "@mui/material";
import PersonIcon from "@mui/icons-material/PersonOutlined";
import PetsIcon from "@mui/icons-material/PetsOutlined";
import { getAdoptionStageColor } from "../../utils/adoptionStageColor";

// Unlike ActiveApplicationCard this doesn't navigate - clicking opens the
// match / unmatch dialog on the Matching page instead.
function MatchingApplicationCard({ application, onClick }) {
  const matched = application.linkedCats.length > 0;

  return (
    <Card sx={{ height: "100%" }}>
      <CardActionArea onClick={onClick} sx={{ height: "100%", alignItems: "flex-start" }}>
        <CardContent>
          <Stack direction="row" spacing={2}>
            <Avatar sx={{ width: 56, height: 56 }}>
              <PersonIcon />
            </Avatar>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" noWrap sx={{ fontWeight: 600 }}>
                {application.name}
              </Typography>

              <Typography variant="body2" color="text.secondary">
                {application.city}
                {application.city && application.country && " • "}
                {application.country}
              </Typography>

              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 1 }}>
                {application.adoptionStage && (
                  <Chip
                    label={application.adoptionStage}
                    size="small"
                    color={getAdoptionStageColor(application.adoptionStage)}
                  />
                )}

                {application.priority && (
                  <Chip label={`${application.priority} priority`} size="small" variant="outlined" />
                )}

                {matched && application.matchConfidence && (
                  <Chip
                    label={`${application.matchConfidence} confidence`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>

              {matched ? (
                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 1.5 }}>
                  {application.linkedCats.map((cat) => (
                    <Chip key={cat.id} icon={<PetsIcon />} label={cat.name} size="small" />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Case Owner: {application.caseOwner || "-"}
                </Typography>
              )}
            </Box>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default MatchingApplicationCard;
