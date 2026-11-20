import { useEffect, useState } from "react";
import { Alert, CircularProgress, Stack } from "@mui/material";
import StartPostAdoption from "./StartPostAdoption";
import PostAdoptionSummary from "./PostAdoptionSummary";
import CheckInTimeline from "./CheckInTimeline";
import UpdatesSection from "./UpdatesSection";
import PhotosSection from "./PhotosSection";
import AiSection from "./AiSection";
import TestimonialSection from "./TestimonialSection";
import { getApplicationPostAdoption, updatePostAdoption, chasePostAdoption, changePostAdoptionTestimonial } from "../../../../services/PostAdoptionService";

// The application's post-adoption record: summary, check-ins, updates and
// escalation, photos and videos, and the AI review. Every change goes to
// the server, which applies the check-in rules and answers the saved
// record - so the tab always shows what was actually stored.
function PostAdoptionTab({ application }) {
  const [record, setRecord] = useState(null);
  const [photos, setPhotos] = useState([]);
  // The chase attempts of the check-ins being chased, by check-in key.
  const [chase, setChase] = useState({});
  // The testimonial request, or null when there is none.
  const [testimonial, setTestimonial] = useState(null);
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
          setChase(data.chase ?? {});
          setTestimonial(data.testimonial ?? null);
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
      const saved = await updatePostAdoption(application.id, record.id, changes);

      setRecord(saved.record);
      setChase(saved.chase ?? {});
    } catch (err) {
      console.error("Failed to save post-adoption:", err);
      setError(err?.message || "Something went wrong while saving.");
      throw err;
    }
  }

  // "Chased again" on one check-in. Throws on failure, like save.
  async function chaseAgain(checkInKey) {
    setError(null);

    try {
      const saved = await chasePostAdoption(application.id, record.id, checkInKey);

      setRecord(saved.record);
      setChase(saved.chase ?? {});
    } catch (err) {
      console.error("Failed to record the chase:", err);
      setError(err?.message || "Something went wrong while saving.");
      throw err;
    }
  }

  // One step of the testimonial request. Throws on failure, like save.
  async function changeTestimonial(body) {
    setError(null);

    try {
      const saved = await changePostAdoptionTestimonial(application.id, record.id, body);

      setTestimonial(saved.testimonial);
    } catch (err) {
      console.error("Failed to save the testimonial:", err);
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
          setChase({});
          setTestimonial(null);
        }}
      />
    );
  }

  return (
    <Stack spacing={3}>
      {error && <Alert severity="error">{error}</Alert>}

      <PostAdoptionSummary applicationId={application.id} linkedCats={application.linkedCats ?? []} record={record} save={save} />
      <CheckInTimeline record={record} save={save} chase={chase} onChaseAgain={chaseAgain} />
      <UpdatesSection record={record} save={save} />
      <TestimonialSection testimonial={testimonial} onAction={changeTestimonial} />
      <PhotosSection applicationId={application.id} recordId={record.id} photos={photos} onPhotosChange={setPhotos} />
      <AiSection record={record} />
    </Stack>
  );
}

export default PostAdoptionTab;
