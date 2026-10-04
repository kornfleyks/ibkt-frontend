import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getActiveApplications } from "../services/ActiveApplicationsService";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../constants/statuses/activeApplicationsStatuses";
import { useLoading } from "../context/LoadingContext";
import ActiveApplicationCard from "../components/ActiveApplications/ActiveApplicationCard";
import Grid from "@mui/material/Grid";
import PageHeader from "../components/PageHeader";
import Button from "@mui/material/Button";
import { AddIcon } from "../components/icons";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";
import useTabParam from "../hooks/useTabParam";
import useMyCasesFilter from "../hooks/useMyCasesFilter";
import MyCasesToggle from "../components/Common/MyCasesToggle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { searchText } from "../utils/searchText";
import AddApplicationDialog from "../components/ActiveApplications/AddApplicationDialog/AddApplicationDialog";

const { ADOPTION_STAGE } = ACTIVE_APPLICATIONS_STATUS_OPTIONS;

const TABS = [
  { label: "New Applications", slug: "new-applications", stage: ADOPTION_STAGE.NEW_APPLICATION },
  { label: "Active", slug: "active", stage: ADOPTION_STAGE.ACTIVE_APPLICATION },
  { label: "Rejected", slug: "rejected", stage: ADOPTION_STAGE.REJECTED_APPLICATION },
];

function ActiveApplications() {
  const [applications, setApplications] = useState([]);
  const [tab, setTab] = useTabParam(TABS);
  const { showLoading, hideLoading } = useLoading();
  const myCases = useMyCasesFilter("activeApplications");
  const [addOpen, setAddOpen] = useState(false);
  // Kept in the URL (?q=) so it survives a reload and can be linked to.
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";

  function setSearch(value) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);

        if (value) next.set("q", value);
        else next.delete("q");

        return next;
      },
      { replace: true },
    );
  }

  async function loadActiveApplications() {
    showLoading("Loading active applications...");

    try {
      const data = await getActiveApplications();
      setApplications(data);
    } finally {
      hideLoading();
    }
  }

  useEffect(() => {
    loadActiveApplications();
  }, []);

  const searchIndex = useMemo(() => new Map(applications.map((application) => [application.id, searchText(application)])), [applications]);
  const term = search.trim().toLowerCase();
  const matching = myCases.filter(applications).filter((application) => !term || searchIndex.get(application.id)?.includes(term));
  const visibleApplications = matching.filter((application) => application.adoptionStage === TABS[tab].stage);

  return (
    <>
      <PageHeader
        title="Active Applications"
        subtitle="Manage active applications"
        actions={
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            {myCases.canToggle && <MyCasesToggle enabled={myCases.enabled} onChange={myCases.setEnabled} />}

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddOpen(true)}
              sx={{
                minWidth: 140,
              }}
            >
              Add Application
            </Button>
          </Stack>
        }
      />

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
                key={item.label}
                label={`${item.label} (${matching.filter((application) => application.adoptionStage === item.stage).length})`}
              />
            ))}
          </Tabs>

          <TextField
            id="applications-search"
            size="small"
            label="Search applications"
            placeholder="Name, email, phone, cat, owner, answers..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ mt: 2, width: "100%", maxWidth: 420 }}
          />
        </CardContent>
      </Card>

      {visibleApplications.length === 0 ? (
        <Typography color="text.secondary">
          {term ? `No applications in this stage match "${search.trim()}".` : "No applications in this stage."}
        </Typography>
      ) : (
        <Grid container spacing={3}>
          {visibleApplications.map((application) => (
            <Grid
              key={application.id}
              size={{
                xs: 12,
                md: 6,
                lg: 4,
              }}
            >
              <ActiveApplicationCard application={application} />
            </Grid>
          ))}
        </Grid>
      )}

      <AddApplicationDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        // New applications start as New Application - show that tab.
        onCreated={() => {
          setTab(TABS.findIndex((item) => item.stage === ADOPTION_STAGE.NEW_APPLICATION));
          loadActiveApplications();
        }}
      />
    </>
  );
}

export default ActiveApplications;
