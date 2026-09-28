import { useEffect, useState } from "react";
import {
  Stack,
  Button,
  Chip,
  Typography,
  Alert,
  CircularProgress,
  Divider,
} from "@mui/material";
import { UploadIcon } from "../../icons";
import SectionCard from "../../Common/SectionCard";
import InfoRow from "../../Common/InfoRow";
import BooleanStatus from "../../Common/BooleanStatus";
import FileDetailsRow from "../../Common/Files/FileDetailsRow";
import UploadFilesDialog from "../../Common/Files/UploadFilesDialog";
import ConfirmDeleteFileDialog from "../../Common/Files/ConfirmDeleteFileDialog";
import { getContracts, uploadContract, deleteContract } from "../../../services/ContractsService";
import { CONTRACT_DOCUMENT_TYPES } from "../../../constants/contractDocumentTypes";

const STATUS_TYPES = Object.values(CONTRACT_DOCUMENT_TYPES).filter((type) => type.statusField);
const ALL = "ALL";

function typeLabel(documentType) {
  return CONTRACT_DOCUMENT_TYPES[documentType]?.label ?? "Not set";
}

// The application's contract statuses and files. Uploading a Draft / Final
// / Signed file sets the matching status on the server; `onApplicationChange`
// keeps the page's copy of the application in step.
function ContractsTab({ application, onApplicationChange }) {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(ALL);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadContracts() {
      setLoading(true);
      setError(null);

      try {
        const data = await getContracts(application.id);

        if (!cancelled) setContracts(data);
      } catch (err) {
        console.error("Failed to load contracts:", err);

        if (!cancelled) setError(err?.message || "Failed to load contract files.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadContracts();

    return () => {
      cancelled = true;
    };
  }, [application.id]);

  function handleUploaded({ contract, statusChanges }) {
    if (contract) {
      setContracts((current) => [contract, ...current.filter((item) => item.assetId !== contract.assetId)]);
    }

    if (statusChanges && Object.keys(statusChanges).length) {
      onApplicationChange(statusChanges);
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    setError(null);

    try {
      await deleteContract(application.id, deleteTarget.assetId);
      setContracts((current) => current.filter((item) => item.assetId !== deleteTarget.assetId));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete contract file:", err);
      setError(err?.message || "Something went wrong while deleting.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  const presentTypes = Object.keys(CONTRACT_DOCUMENT_TYPES).filter((key) => contracts.some((item) => item.documentType === key));
  const visible = filter === ALL ? contracts : contracts.filter((item) => item.documentType === filter);

  return (
    <Stack spacing={3}>
      <SectionCard title="Contract status">
        <Stack>
          {STATUS_TYPES.map((type) => (
            <InfoRow key={type.statusField} label={type.statusLabel} labelWidth={220} value={<BooleanStatus value={application[type.statusField] === "Yes"} />} />
          ))}
        </Stack>
      </SectionCard>

      <SectionCard>
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Typography variant="h6" fontWeight={600}>
              Contract files
            </Typography>

            <Button variant="contained" startIcon={<UploadIcon fontSize="small" />} onClick={() => setUploadOpen(true)}>
              Upload files
            </Button>
          </Stack>

          {presentTypes.length > 1 && (
            <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
              <Chip label={`All (${contracts.length})`} onClick={() => setFilter(ALL)} color={filter === ALL ? "primary" : "default"} />
              {presentTypes.map((key) => (
                <Chip
                  key={key}
                  label={`${typeLabel(key)} (${contracts.filter((item) => item.documentType === key).length})`}
                  onClick={() => setFilter(key)}
                  color={filter === key ? "primary" : "default"}
                />
              ))}
            </Stack>
          )}

          <Divider />

          {error && (
            <Alert severity="error" sx={{ fontSize: "0.8125rem" }}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Stack sx={{ alignItems: "center", py: 4 }}>
              <CircularProgress size={28} sx={{ color: "text.secondary" }} />
            </Stack>
          ) : visible.length === 0 ? (
            <Typography color="text.secondary">{contracts.length === 0 ? "No contract files yet." : "No files of this type."}</Typography>
          ) : (
            visible.map((contract) => (
              <FileDetailsRow key={contract.assetId} file={contract} typeLabel={typeLabel(contract.documentType)} onDelete={setDeleteTarget} />
            ))
          )}
        </Stack>
      </SectionCard>

      <UploadFilesDialog
        open={uploadOpen}
        title="Upload contract files"
        documentTypes={CONTRACT_DOCUMENT_TYPES}
        upload={(file, details) => uploadContract(application.id, file, details)}
        onClose={() => setUploadOpen(false)}
        onUploaded={handleUploaded}
      />

      <ConfirmDeleteFileDialog
        file={deleteTarget}
        consequence="from this application's contracts. Contract statuses stay as they are."
        deleting={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </Stack>
  );
}

export default ContractsTab;
