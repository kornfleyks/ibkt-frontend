import { useEffect, useRef, useState } from "react";
import { Box, CircularProgress, Fab, IconButton, Paper, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { ArrowForwardIcon, ChatBubbleOutlineIcon, CloseIcon } from "../icons";
import { askAssistant, getAssistantStatus } from "../../services/AssistantService";

const MAX_LENGTH = 2000;

// The conversation lives here, not in the component, so it survives moving
// between pages (each page mounts the layout again). A reload clears it, and
// nothing is stored on the server.
let conversation = [];

const INTRO =
  "Hi, I am Quinnie. I can explain what Oriel can do and how to do it. I cannot see any of your cats, applications or people, so I can only answer questions about how Oriel works.";

// The chat bubble at the bottom right of the staff app. It is hidden when the
// assistant is not switched on on the server.
function AssistantBubble() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(conversation);
  const [text, setText] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    getAssistantStatus()
      .then((status) => !cancelled && setEnabled(Boolean(status?.enabled)))
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, working, open]);

  if (!enabled) return null;

  function remember(next) {
    conversation = next;
    setMessages(next);
  }

  async function send() {
    const question = text.trim();

    if (!question || working) return;

    const next = [...messages, { role: "user", content: question }];

    remember(next);
    setText("");
    setError(null);
    setWorking(true);

    try {
      const reply = await askAssistant(next);

      remember([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      console.error("The assistant could not answer:", err);
      setError(err?.message || "Quinnie could not answer.");
    } finally {
      setWorking(false);
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  function startAgain() {
    remember([]);
    setError(null);
  }

  return (
    <>
      {open && (
        <Paper
          elevation={8}
          role="dialog"
          aria-label="Quinnie, the Oriel assistant"
          sx={{
            position: "fixed",
            right: 16,
            bottom: 88,
            zIndex: (theme) => theme.zIndex.modal - 1,
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            height: 520,
            maxHeight: "calc(100vh - 120px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1, borderBottom: "1px solid", borderColor: "divider" }}>
            <Typography fontWeight={700} sx={{ flex: 1, lineHeight: "30px" }}>
              Ask Quinnie
            </Typography>

            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
              {messages.length > 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  component="button"
                  type="button"
                  onClick={startAgain}
                  disabled={working}
                  sx={{ background: "none", border: 0, cursor: "pointer", font: "inherit", textDecoration: "underline" }}
                >
                  New chat
                </Typography>
              )}

              <IconButton size="small" onClick={() => setOpen(false)} aria-label="Close Quinnie">
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          <Stack spacing={1.5} sx={{ flex: 1, overflowY: "auto", p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {INTRO}
            </Typography>

            {messages.map((message, index) => (
              <Box
                key={index}
                sx={{
                  alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  px: 1.5,
                  py: 1,
                  borderRadius: 2,
                  bgcolor: message.role === "user" ? "primary.main" : "action.hover",
                  color: message.role === "user" ? "primary.contrastText" : "text.primary",
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                  {message.content}
                </Typography>
              </Box>
            ))}

            {working && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <CircularProgress size={16} sx={{ color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  Thinking...
                </Typography>
              </Stack>
            )}

            {error && (
              <Typography variant="body2" color="error">
                {error}
              </Typography>
            )}

            <div ref={endRef} />
          </Stack>

          <Stack direction="row" alignItems="flex-end" spacing={1} sx={{ p: 1.5, borderTop: "1px solid", borderColor: "divider" }}>
            <TextField
              multiline
              maxRows={4}
              fullWidth
              size="small"
              placeholder="Ask how something works"
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={handleKeyDown}
              slotProps={{ htmlInput: { maxLength: MAX_LENGTH } }}
            />

            <IconButton color="primary" onClick={send} disabled={working || !text.trim()} aria-label="Send">
              <ArrowForwardIcon />
            </IconButton>
          </Stack>
        </Paper>
      )}

      <Tooltip title={open ? "" : "Ask Quinnie how Oriel works"} placement="left">
        <Fab
          color="primary"
          aria-label={open ? "Close Quinnie" : "Open Quinnie"}
          onClick={() => setOpen((value) => !value)}
          sx={{ position: "fixed", right: 16, bottom: 16, zIndex: (theme) => theme.zIndex.modal - 1 }}
        >
          {open ? <CloseIcon /> : <ChatBubbleOutlineIcon />}
        </Fab>
      </Tooltip>
    </>
  );
}

export default AssistantBubble;
