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

function ActiveApplicationCard({ application }) {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/active-applications/${application.id}`)}
      sx={{
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

          <Box flex={1}>
            <Typography variant="h6" fontWeight={600}>
              {application.name}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              {application.city}
              {application.city && application.country && " • "}
              {application.country}
            </Typography>

            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              sx={{ mt: 1 }}
            >
              {application.adoptionStage && (
                <Chip
                  label={application.adoptionStage}
                  size="small"
                  color={getAdoptionStageColor(application.adoptionStage)}
                />
              )}

              {application.priority && (
                <Chip
                  label={application.priority}
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>

            <Typography variant="body2" sx={{ mt: 1 }}>
              Case Owner: {application.caseOwner || "—"}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default ActiveApplicationCard;
