import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import OverviewTab from "../../components/ActiveApplications/Workspace/OverviewTab";
import PageHeader from "../../components/PageHeader";
import { getActiveApplication } from "../../services/ActiveApplicationsService";
import { useLoading } from "../../context/LoadingContext";
import { Box, Tabs, Tab } from "@mui/material";
import { activeApplicationWorkspaceTabs } from "../../config/activeApplicationWorkspaceTabs";
import DecisionActions from "../../components/ActiveApplications/DecisionActions";
import { ACTIVE_APPLICATIONS_STATUS_OPTIONS } from "../../constants/statuses/activeApplicationsStatuses";
import useTabParam from "../../hooks/useTabParam";
import ActivityTab from "../../components/ActivityLog/ActivityTab";
import { ACTIVE_APPLICATIONS } from "../../constants/boards/activeApplications";

const { ADOPTION_STAGE } = ACTIVE_APPLICATIONS_STATUS_OPTIONS;

function ActiveApplicationWorkspace() {
  const { id } = useParams();

  const [application, setApplication] = useState(null);
  const [tab, setTab] = useTabParam(activeApplicationWorkspaceTabs);

  const { showLoading, hideLoading } = useLoading();

  async function loadActiveApplication() {
    showLoading("Loading application...");

    try {
      const data = await getActiveApplication(id);
      setApplication(data);
    } finally {
      hideLoading();
    }
  }

  useEffect(() => {
    loadActiveApplication();
  }, [id]);

  if (!application) {
    return null;
  }

  return (
    <>
      <PageHeader
        title={application.name}
        subtitle={application.adoptionStage}
        actions={
          application.adoptionStage === ADOPTION_STAGE.ACTIVE_APPLICATION && (
            <DecisionActions
              applicationId={application.id}
              applicationName={application.name}
              onDecision={(newStage) =>
                setApplication((current) => ({ ...current, adoptionStage: newStage }))
              }
            />
          )
        }
      />
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(event, newValue) => setTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {activeApplicationWorkspaceTabs.map((workspaceTab) => (
            <Tab key={workspaceTab.label} label={workspaceTab.label} />
          ))}
        </Tabs>
      </Box>
      {activeApplicationWorkspaceTabs[tab].slug === "overview" && (
        <OverviewTab application={application} />
      )}
      {activeApplicationWorkspaceTabs[tab].slug === "activity" && (
        <ActivityTab boardId={ACTIVE_APPLICATIONS.BOARD_ID} itemId={application.id} />
      )}
    </>
  );
}

export default ActiveApplicationWorkspace;
