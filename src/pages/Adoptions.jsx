import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getAdoptions } from "../services/ActiveApplicationsService";
import { useLoading } from "../context/LoadingContext";
import AdoptionCard from "../components/Adoptions/AdoptionCard";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Stack from "@mui/material/Stack";
import PageHeader from "../components/PageHeader";
import MyCasesToggle from "../components/Common/MyCasesToggle";
import useMyCasesFilter from "../hooks/useMyCasesFilter";
import { searchText } from "../utils/searchText";

function Adoptions() {
  const [adoptions, setAdoptions] = useState([]);
  const { showLoading, hideLoading } = useLoading();
  const myCases = useMyCasesFilter("adoptions");
  // Kept in the URL (?q=) so it survives a reload and can be linked to.
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";

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

  const searchIndex = useMemo(() => new Map(adoptions.map((adoption) => [adoption.id, searchText(adoption)])), [adoptions]);
  const term = search.trim().toLowerCase();
  const visibleAdoptions = myCases.filter(adoptions).filter((adoption) => !term || searchIndex.get(adoption.id)?.includes(term));

  return (
    <>
      <PageHeader
        title="Adoptions"
        subtitle="Approved applications"
        actions={myCases.canToggle && <MyCasesToggle enabled={myCases.enabled} onChange={myCases.setEnabled} />}
      />

      <Stack sx={{ mb: 3 }}>
        <TextField
          id="adoptions-search"
          size="small"
          label="Search adoptions"
          placeholder="Name, email, phone, cat, owner..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ width: "100%", maxWidth: 420 }}
        />
      </Stack>

      {visibleAdoptions.length === 0 && (
        <Typography color="text.secondary">
          {term
            ? `No adoptions match "${search.trim()}".`
            : myCases.enabled
              ? "No adoptions assigned to you."
              : "No adoptions yet."}
        </Typography>
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
