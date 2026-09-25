import { useEffect, useState } from "react";
import { getAdoptions } from "../services/ActiveApplicationsService";
import { useLoading } from "../context/LoadingContext";
import AdoptionCard from "../components/Adoptions/AdoptionCard";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import PageHeader from "../components/PageHeader";
import MyCasesToggle from "../components/Common/MyCasesToggle";
import useMyCasesFilter from "../hooks/useMyCasesFilter";

function Adoptions() {
  const [adoptions, setAdoptions] = useState([]);
  const { showLoading, hideLoading } = useLoading();
  const myCases = useMyCasesFilter("adoptions");

  async function loadAdoptions() {
    showLoading("Loading adoptions...");

    try {
      const data = await getAdoptions();
      setAdoptions(data);
    } finally {
      hideLoading();
    }
  }

  useEffect(() => {
    loadAdoptions();
  }, []);

  const visibleAdoptions = myCases.filter(adoptions);

  return (
    <>
      <PageHeader
        title="Adoptions"
        subtitle="Approved applications"
        actions={myCases.canToggle && <MyCasesToggle enabled={myCases.enabled} onChange={myCases.setEnabled} />}
      />

      {myCases.enabled && visibleAdoptions.length === 0 && (
        <Typography color="text.secondary">No adoptions assigned to you.</Typography>
      )}

      <Grid container spacing={3}>
        {visibleAdoptions.map((adoption) => (
          <Grid
            key={adoption.id}
            size={{
              xs: 12,
              md: 6,
              lg: 4,
            }}
          >
            <AdoptionCard adoption={adoption} />
          </Grid>
        ))}
      </Grid>
    </>
  );
}

export default Adoptions;
