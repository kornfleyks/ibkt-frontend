import { useEffect, useState } from "react";
import { Alert, CircularProgress, Stack } from "@mui/material";
import StartPostAdoption from "./StartPostAdoption";
import PostAdoptionSummary from "./PostAdoptionSummary";
import CheckInTimeline from "./CheckInTimeline";
import UpdatesSection from "./UpdatesSection";
import PhotosSection from "./PhotosSection";
import AiSection from "./AiSection";
import { getApplicationPostAdoption, updatePostAdoption } from "../../../../services/PostAdoptionService";

// The application's post-adoption record: summary, check-ins, updates and
// escalation, photos and videos, and the AI review. Every change goes to
// the server, which applies the check-in rules and answers the saved
// record - so the tab always shows what was actually stored.
function PostAdoptionTab({ application }) {
  const [record, setRecord] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await getApplicationPostAdoption(application.id);

        if (!cancelled) {
          setRecord(data.record);
          setPhotos(data.photos);
        }
      } catch (err) {
        console.error("Failed to load post-adoption:", err);

        if (!cancelled) setError(err?.message || "Failed to load the post-adoption record.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [application.id]);

  // Throws on failure so the field being edited can show it too.
  async function save(changes) {
    setError(null);

    try {
      setRecord(await updatePostAdoption(application.id, record.id, changes));
    } catch (err) {
      console.error("Failed to save post-adoption:", err);
      setError(err?.message || "Something went wrong while saving.");
      throw err;
    }
  }

  if (loading) {
    return (
      <Stack sx={{ alignItems: "center", py: 4 }}>
        <CircularProgress size={28} sx={{ color: "text.secondary" }} />
      </Stack>
    );
  }

  if (!record) {
    return error ? (
      <Alert severity="error">{error}</Alert>
    ) : (
      <StartPostAdoption
        applicationId={application.id}
        onStarted={(data) => {
          setRecord(data.record);
          setPhotos(data.photos);
        }}
      />
    );
  }

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}

      <PostAdoptionSummary applicationId={application.id} linkedCats={application.linkedCats ?? []} record={record} save={save} />
      <CheckInTimeline record={record} save={save} />
      <UpdatesSection record={record} save={save} />
      <PhotosSection applicationId={application.id} recordId={record.id} photos={photos} onPhotosChange={setPhotos} />
      <AiSection record={record} />
    </Stack>
  );
}

export default PostAdoptionTab;
