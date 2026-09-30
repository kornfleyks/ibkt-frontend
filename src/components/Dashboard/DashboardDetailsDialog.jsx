import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { visibleScrollbarSx } from '../../utils/scrollbarSx';

// The items behind a dashboard number, as a table. `columns` are
// [{ key, label, value(row) }]; `rowLink(row)` is the app path a row opens
// (in a new tab, so the dialog stays), or null when it has none (or the
// user can't open that section).
function DashboardDetailsDialog({ open, title, rows, columns, rowLink, onClose }) {

    function openRow(row) {
        const to = rowLink?.(row);

        if (to) {
            // A full URL: the app runs under BASE_URL (e.g. /ibkt-frontend/).
            window.open(`${import.meta.env.BASE_URL}${to.replace(/^\//, '')}`, '_blank', 'noopener');
        }
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>

            <DialogTitle>
                {title} ({rows.length})
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0 }}>
                {/* Visible scrollbar (hidden app-wide otherwise) so a table
                    wider than the dialog is clearly scrollable sideways. */}
                <TableContainer sx={{ overflowX: 'auto', ...visibleScrollbarSx }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                {columns.map((column) => (
                                    <TableCell key={column.key} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                                        {column.label}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {rows.map((row) => {
                                const linked = Boolean(rowLink?.(row));

                                return (
                                    <TableRow
                                        key={row.id}
                                        hover={linked}
                                        onClick={linked ? () => openRow(row) : undefined}
                                        onKeyDown={linked ? (event) => event.key === 'Enter' && openRow(row) : undefined}
                                        tabIndex={linked ? 0 : undefined}
                                        role={linked ? 'link' : undefined}
                                        title={linked ? 'Opens in a new tab' : undefined}
                                        sx={linked ? { cursor: 'pointer' } : undefined}
                                    >
                                        {columns.map((column) => (
                                            <TableCell key={column.key}>
                                                {column.value(row) || '-'}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </DialogContent>

            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>

        </Dialog>
    );

}

export default DashboardDetailsDialog;
