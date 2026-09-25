// Scrollbars are hidden app-wide (theme.js MuiCssBaseline). Spread this
// into an element's `sx` to show a thin, theme-coloured one on just that
// scrolling area, where people need to see there's more to scroll to.
export const visibleScrollbarSx = {
  scrollbarWidth: "thin",
  scrollbarColor: (theme) => `${theme.palette.text.disabled} transparent`,
  "&::-webkit-scrollbar": {
    display: "block",
    width: 8,
    height: 8,
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: (theme) => theme.palette.text.disabled,
    borderRadius: 4,
  },
  "&::-webkit-scrollbar-track": {
    backgroundColor: "transparent",
  },
};
