import { useEffect, useState } from "react";
import { getActiveApplications } from "../services/ActiveApplicationsService";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../constants/statuses/activeApplicationsStatuses";
import { useLoading } from "../context/LoadingContext";
import ActiveApplicationCard from "../components/ActiveApplications/ActiveApplicationCard";
import Grid from "@mui/material/Grid";
import PageHeader from "../components/PageHeader";
import Button from "@mui/material/Button";
import AddIcon from "@mui/icons-material/AddOutlined";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Typography from "@mui/material/Typography";

const { ADOPTION_STAGE } = ACTIVE_APPLICATIONS_STATUS_OPTIONS;

const TABS = [
  { label: "New Applications", stage: ADOPTION_STAGE.NEW_APPLICATION },
  { label: "Active", stage: ADOPTION_STAGE.ACTIVE_APPLICATION },
  { label: "Rejected", stage: ADOPTION_STAGE.REJECTED_APPLICATION },
];

function ActiveApplications() {
  const [applications, setApplications] = useState([]);
  const [tab, setTab] = useState(0);
  const { showLoading, hideLoading } = useLoading();

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

  const visibleApplications = applications.filter(
    (application) => application.adoptionStage === TABS[tab].stage,
  );

  return (
    <>
      <PageHeader
        title="Active Applications"
        subtitle="Manage active applications"
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{
              minWidth: 140,
            }}
          >
            Add Application
          </Button>
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
              <Tab key={item.label} label={item.label} />
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {visibleApplications.length === 0 ? (
        <Typography color="text.secondary">
          No applications in this stage.
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
    </>
  );
}

export default ActiveApplications;
