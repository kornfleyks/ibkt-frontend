import { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, CircularProgress, Link, Stack, Typography } from "@mui/material";
import { getReferenceChecks } from "../../../../services/ReferenceChecksService";
import useDateFormat from "../../../../hooks/useDateFormat";

const YES = "Yes";
// The criminal-history question (Jotform q10) is highlighted, not repeated.
const CRIMINAL_HISTORY_QID = "10";

// The referees' own answers (the "Reference Check - IBKT" Jotform form, one
// card per referee). A referee who knows of criminal history is flagged on
// the card; nobody is notified (decided 2026-10-01).
function ReferenceChecks({ applicationId }) {
  const { formatDateTime } = useDateFormat();
  // undefined while loading, null when it failed.
  const [checks, setChecks] = useState(undefined);

  useEffect(() => {
    let cancelled = false;

    getReferenceChecks(applicationId)
      .then((result) => !cancelled && setChecks(result))
      .catch((err) => {
        console.error("Failed to load the reference checks:", err);
        if (!cancelled) setChecks(null);
      });

    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  if (checks === undefined) {
    return (
      <Stack sx={{ alignItems: "center", py: 2 }}>
        <CircularProgress size={24} sx={{ color: "text.secondary" }} />
      </Stack>
    );
  }

  if (checks === null) return <Alert severity="error">Couldn&apos;t load the reference checks. Reload the page to try again.</Alert>;

  if (checks.length === 0) {
    return <Typography color="text.secondary">No referee has answered yet. Their Reference Check answers appear here as they arrive.</Typography>;
  }

  return (
    <Stack spacing={2}>
      {checks.map((check) => {
        const flagged = check.criminalHistory?.split(",").map((part) => part.trim()).includes(YES);

        return (
          <Card key={check.id} variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {check.referee.name || "Referee"}
                  </Typography>
                  {check.refereeSlot && <Chip size="small" label={`Referee ${check.refereeSlot}`} />}
                  {flagged && <Chip size="small" color="error" label="Knows of criminal history" />}
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {[check.referee.email, check.referee.phone].filter(Boolean).join(" · ")}
                  {check.submittedAt ? ` · answered ${formatDateTime(new Date(check.submittedAt.replace(" ", "T")))}` : ""}
                </Typography>

                {flagged && <Alert severity="error">This referee answered Yes to &quot;Are you aware of any criminal history of the applicant?&quot;</Alert>}

                <Box component="dl" sx={{ m: 0, display: "grid", gap: 1.25 }}>
                  {check.answers
                    .filter((entry) => entry.qid !== CRIMINAL_HISTORY_QID)
                    .map((entry) => (
                      <div key={entry.qid}>
                        <Typography component="dt" variant="body2" color="text.secondary">
                          {entry.question}
                        </Typography>
                        <Typography component="dd" sx={{ m: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                          {entry.answer}
                        </Typography>
                      </div>
                    ))}
                </Box>

                {check.signatureUrl && (
                  <Typography variant="body2">
                    <Link href={check.signatureUrl} target="_blank" rel="noopener noreferrer">
                      View signature
                    </Link>
                    {check.signedOn ? ` · signed ${check.signedOn}` : ""}
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}

export default ReferenceChecks;
