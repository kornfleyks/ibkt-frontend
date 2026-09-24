import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import PageHeader from "../components/PageHeader";
import MatchingApplicationCard from "../components/Matching/MatchingApplicationCard";
import MatchDialog from "../components/Matching/MatchDialog";
import UnmatchDialog from "../components/Matching/UnmatchDialog";
import { getActiveApplications } from "../services/ActiveApplicationsService";
import { getCats } from "../services/CatsService";
import { getMatchingStages } from "../services/AppSettingsService";
import { getMatchableGroups } from "../services/MatchingService";
import { useLoading } from "../context/LoadingContext";
import useTabParam from "../hooks/useTabParam";
import useMyCasesFilter from "../hooks/useMyCasesFilter";
import MyCasesToggle from "../components/Common/MyCasesToggle";

const TABS = [
  { label: "Needs Match", slug: "needs-match", matched: false },
  { label: "Matched", slug: "matched", matched: true },
];

function isMatched(application) {
  return application.linkedCats.length > 0;
}

function describeOutcome(action, name, failed) {
  if (failed.length === 0) {
    return { severity: "success", text: `${name} ${action}.` };
  }

  return {
    severity: "warning",
    text: `${name} ${action}, but these changes didn't save: ${failed.join("; ")}. Check the records on Monday, or unmatch and try again.`,
  };
}

function Matching() {
  const [applications, setApplications] = useState([]);
  const [cats, setCats] = useState([]);
  const [stages, setStages] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [matching, setMatching] = useState(null);
  const [unmatching, setUnmatching] = useState(null);
  const [tab, setTab] = useTabParam(TABS);
  const myCases = useMyCasesFilter("matching");
  const { showLoading, hideLoading } = useLoading();

  function loadData() {
    showLoading("Loading matching...");

    Promise.all([getActiveApplications(), getCats(), getMatchingStages()])
      .then(([applicationData, catData, stageData]) => {
        setLoadError(null);
        setApplications(applicationData);
        setCats(catData);
        setStages(stageData);
      })
      .catch((err) => {
        console.error("Failed to load matching data:", err);
        setLoadError("Failed to load applications and cats.");
      })
      .finally(hideLoading);
  }

  useEffect(() => {
    loadData();
  }, []);

  const matchableGroups = useMemo(() => getMatchableGroups(cats), [cats]);

  const eligibleApplications = myCases.filter(applications).filter((application) =>
    stages.includes(application.adoptionStage),
  );

  const visibleApplications = eligibleApplications.filter(
    (application) => isMatched(application) === TABS[tab].matched,
  );

  function handleCardClick(application) {
    setOutcome(null);

    if (isMatched(application)) {
      setUnmatching(application);
    } else {
      setMatching(application);
    }
  }

  // Always reload after a write - partial failures included - so the page
  // reflects what actually landed on Monday rather than what was intended.
  function handleMatched({ application, group, failed }) {
    const names = group.cats.map((cat) => cat.name).join(" & ");

    setMatching(null);
    setOutcome(describeOutcome(`matched with ${names}`, application.name, failed));
    loadData();
  }

  function handleUnmatched({ application, failed }) {
    setUnmatching(null);
    setOutcome(describeOutcome("unmatched", application.name, failed));
    loadData();
  }

  // Only a conflict (data changed under the dialog) needs a refresh - a
  // plain Cancel leaves everything as loaded.
  function handleMatchDialogClose({ hadConflict } = {}) {
    setMatching(null);

    if (hadConflict) {
      loadData();
    }
  }

  return (
    <>
      <PageHeader
        title="Matching"
        subtitle={`Match cats with applicants${stages.length ? ` (${stages.join(", ")})` : ""}`}
        actions={<MyCasesToggle enabled={myCases.enabled} onChange={myCases.setEnabled} />}
      />

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}

      {outcome && (
        <Alert severity={outcome.severity} sx={{ mb: 2 }} onClose={() => setOutcome(null)}>
          {outcome.text}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Tabs
            value={tab}
            onChange={(event, newValue) => setTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {TABS.map((item) => (
              <Tab
                key={item.slug}
                label={`${item.label} (${
                  eligibleApplications.filter(
                    (application) => isMatched(application) === item.matched,
                  ).length
                })`}
              />
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {visibleApplications.length === 0 ? (
        <Typography color="text.secondary">
          {TABS[tab].matched ? "No matched applications." : "No applications waiting for a match."}
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {visibleApplications.map((application) => (
            <Grid key={application.id} size={{ xs: 12, md: 6, lg: 4 }}>
              <MatchingApplicationCard
                application={application}
                onClick={() => handleCardClick(application)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {matching && (
        <MatchDialog
          key={matching.id}
          application={matching}
          groups={matchableGroups}
          onClose={handleMatchDialogClose}
          onMatched={handleMatched}
        />
      )}

      {unmatching && (
        <UnmatchDialog
          key={unmatching.id}
          application={unmatching}
          onClose={() => setUnmatching(null)}
          onUnmatched={handleUnmatched}
        />
      )}
    </>
  );
}

export default Matching;
