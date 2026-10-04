import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// Shared by UserStatusDialog (Suspend/Archive) and UserDeleteDialog: what a
// hand-over of `work` ({ cases, tasks }) to the acting Admin will move.
function OpenWorkSummary({ work }) {
    const total = work.cases.length + work.tasks.length;

    if (total === 0) {
        return (
            <Typography variant="body2" color="text.secondary">
                They have no open cases or tasks.
            </Typography>
        );
    }

    return (
        <Alert severity="warning">
            They have {work.cases.length} open case(s) and {work.tasks.length} open task(s). These will be
            reassigned to <strong>you</strong>, so you can hand them to someone else afterwards.
            <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5 }}>
                {work.cases.map((item) => (
                    <li key={`case-${item.id}`}>Case: {item.name} ({item.stage})</li>
                ))}
                {work.tasks.map((item) => (
                    <li key={`task-${item.id}`}>Task: {item.name} ({item.status})</li>
                ))}
            </Box>
        </Alert>
    );
}

export default OpenWorkSummary;
