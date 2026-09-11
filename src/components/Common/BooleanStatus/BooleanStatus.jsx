import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import CancelIcon from "@mui/icons-material/CancelOutlined";

import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

function BooleanStatus({ value }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      {value ? (
        <>
          <CheckCircleIcon
            sx={{
              color: "success.main",

              fontSize: 18,
            }}
          />

          <Typography
            sx={{
              color: "success.main",

              fontWeight: 600,
            }}
          >
            Yes
          </Typography>
        </>
      ) : (
        <>
          <CancelIcon
            sx={{
              color: "error.main",

              fontSize: 18,
            }}
          />

          <Typography
            sx={{
              color: "error.main",

              fontWeight: 600,
            }}
          >
            No
          </Typography>
        </>
      )}
    </Stack>
  );
}

export default BooleanStatus;
