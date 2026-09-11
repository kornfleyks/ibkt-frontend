import { useEffect, useState } from "react";
import { getAdoptions } from "../services/ActiveApplicationsService";
import { useLoading } from "../context/LoadingContext";
import AdoptionCard from "../components/Adoptions/AdoptionCard";
import Grid from "@mui/material/Grid";
import PageHeader from "../components/PageHeader";

function Adoptions() {
  const [adoptions, setAdoptions] = useState([]);
  const { showLoading, hideLoading } = useLoading();

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

  return (
    <>
      <PageHeader
        title="Adoptions"
        subtitle="Approved applications"
      />

      <Grid container spacing={3}>
        {adoptions.map((adoption) => (
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
