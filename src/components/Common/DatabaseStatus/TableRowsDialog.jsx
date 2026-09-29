import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Typography,
} from "@mui/material";
import { getDatabaseTableRows } from "../../../services/DatabaseHealthService";
import { visibleScrollbarSx } from "../../../utils/scrollbarSx";

const ROWS_PER_PAGE = [25, 50, 100];
const cell = { whiteSpace: "nowrap", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", fontSize: "0.75rem", py: 0.5 };

// One database table's rows (newest first), opened from the Database card
// (Admin). Read-only; secret columns never reach the browser.
// The parent keys this dialog by table, so each table starts at page 1.
function TableRowsDialog({ table, onClose }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE[0]);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!table) return undefined;

    let cancelled = false;

    async function load() {
      setData(null);
      setError(null);

      try {
        const result = await getDatabaseTableRows(table, { limit: rowsPerPage, offset: page * rowsPerPage });

        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load the rows.");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [table, page, rowsPerPage]);

  return (
    <Dialog open={Boolean(table)} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        {table}
        {data && (
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
            {data.total.toLocaleString()} rows
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        {!data && !error && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {data?.hiddenColumns.length > 0 && (
          <Alert severity="info" sx={{ m: 1 }}>
            Not shown (secret): {data.hiddenColumns.join(", ")}
          </Alert>
        )}

        {data?.rows.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            This table is empty.
          </Typography>
        )}

        {data?.rows.length > 0 && (
          // Two scrolling boxes, because one box can't show just one of its
          // scrollbars: the outer scrolls sideways with a visible bar (hidden
          // app-wide otherwise), always at the bottom; the inner scrolls up
          // and down (wheel) with its bar still hidden, and keeps the header
          // stuck. The inner is as wide as the table, so only the outer
          // scrolls sideways.
          <TableContainer sx={{ overflowX: "auto", overflowY: "hidden", ...visibleScrollbarSx }}>
            <Box sx={{ maxHeight: "65vh", overflowY: "auto", width: "max-content", minWidth: "100%" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {data.columns.map((column) => (
                      <TableCell key={column.name} sx={{ ...cell, fontWeight: 600 }} title={column.type}>
                        {column.name}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.rows.map((row, rowIndex) => (
                    <TableRow key={rowIndex} hover>
                      {row.map((value, columnIndex) => (
                        <TableCell key={data.columns[columnIndex].name} sx={{ ...cell, color: value === null ? "text.disabled" : undefined }} title={value ?? ""}>
                          {value === null ? "null" : value}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: "space-between" }}>
        <TablePagination
          component="div"
          count={data?.total ?? 0}
          page={page}
          onPageChange={(event, next) => setPage(next)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={ROWS_PER_PAGE}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(Number(event.target.value));
            setPage(0);
          }}
        />
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default TableRowsDialog;
