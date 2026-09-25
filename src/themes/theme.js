import { createTheme } from "@mui/material/styles";

export function buildTheme(darkMode) {

    const theme = createTheme({

        palette: {

            mode: darkMode ? 'dark' : 'light',

            primary: {
                main: '#1E293B'
            },

            secondary: {
                main: '#334155'
            },

            success: {
                main: '#22C55E'
            },

            error: {
                main: '#EF4444'
            },

            warning: {
                main: '#F97316'
            },

            background: {

                default: darkMode
                    ? '#0F172A'
                    : '#F8FAFC',

                paper: darkMode
                    ? '#1E293B'
                    : '#FFFFFF'

            }

        },


        shape: {

            borderRadius: 14

        },

        typography: {

            fontFamily: '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif',

            h1: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
            h2: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.02em' },
            h3: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em' },
            h4: { fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.01em' },
            h5: { fontSize: '1.125rem', fontWeight: 600 },
            h6: { fontSize: '1rem', fontWeight: 600 },
            subtitle1: { fontWeight: 500 },
            subtitle2: { fontWeight: 500 },
            body1: { fontSize: '0.9375rem' },
            body2: { fontSize: '0.8125rem' },
            button: { textTransform: 'none', fontWeight: 600 }

        },


        components: {

            // Scrollbars are hidden app-wide by design choice; areas still
            // scroll with wheel, touchpad, touch and keyboard.
            // scrollbar-width covers Firefox and current Chromium/Safari,
            // ::-webkit-scrollbar older WebKit/Blink.
            MuiCssBaseline: {

                styleOverrides: {
                    '*': {
                        scrollbarWidth: 'none'
                    },
                    '*::-webkit-scrollbar': {
                        display: 'none'
                    }
                }

            },

            MuiDrawer: {

                styleOverrides: {

                    paper: ({ theme }) => ({

                        backgroundColor: theme.palette.mode === 'dark'
                            ? theme.palette.background.default
                            : theme.palette.primary.main

                    })

                }

            },

            MuiButton: {

                styleOverrides: {

                    root: ({ theme, ownerState }) => ({
                        borderRadius: 10,
                        boxShadow: 'none',
                        paddingInline: 18,
                        ...(theme.palette.mode === 'dark' &&
                            ownerState.variant === 'contained' &&
                            (ownerState.color === 'primary' || !ownerState.color) && {
                            backgroundColor: '#334155',
                            '&:hover': {
                                backgroundColor: '#3f4d63'
                            }
                        }),
                        ...(theme.palette.mode === 'dark' &&
                            ownerState.variant === 'outlined' &&
                            (ownerState.color === 'primary' || !ownerState.color) && {
                            color: theme.palette.text.primary,
                            borderColor: 'rgba(255,255,255,0.23)',
                            '&:hover': {
                                borderColor: 'rgba(255,255,255,0.4)',
                                backgroundColor: 'rgba(255,255,255,0.04)'
                            }
                        }),
                        ...(theme.palette.mode === 'dark' &&
                            ownerState.variant === 'text' &&
                            (ownerState.color === 'primary' || !ownerState.color) && {
                            color: theme.palette.text.primary,
                            '&:hover': {
                                backgroundColor: 'rgba(255,255,255,0.04)'
                            }
                        })
                    }),
                    contained: ({ theme }) => ({
                        '&:hover': {
                            boxShadow: theme.palette.mode === 'dark'
                                ? 'none'
                                : '0 4px 12px rgba(30,41,59,0.15)'
                        }
                    })

                }

            },

            MuiOutlinedInput: {

                styleOverrides: {

                    root: ({ theme }) => ({
                        ...(theme.palette.mode === 'dark' && {
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                                borderColor: theme.palette.text.primary
                            }
                        })
                    })

                }

            },

            MuiInputLabel: {

                styleOverrides: {

                    root: ({ theme }) => ({
                        ...(theme.palette.mode === 'dark' && {
                            '&.Mui-focused': {
                                color: theme.palette.text.primary
                            }
                        })
                    })

                }

            },

            MuiCard: {

                styleOverrides: {

                    root: ({ theme }) => ({
                        borderRadius: theme.shape.borderRadius,
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: theme.palette.mode === 'dark'
                            ? 'none'
                            : '0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.04)'
                    })

                }

            },

            MuiPaper: {

                defaultProps: {
                    elevation: 0
                }

            },

            // primary.main (#1E293B) is the same colour as the dark-mode
            // paper background, so checked radios/checkboxes vanish on cards
            // and dialogs - same reason Button/Tab/inputs are overridden above.
            MuiRadio: {

                styleOverrides: {

                    root: ({ theme, ownerState }) => ({
                        ...(theme.palette.mode === 'dark' &&
                            (ownerState.color === 'primary' || !ownerState.color) && {
                            '&.Mui-checked': {
                                color: theme.palette.text.primary
                            }
                        })
                    })

                }

            },

            MuiCheckbox: {

                styleOverrides: {

                    root: ({ theme, ownerState }) => ({
                        ...(theme.palette.mode === 'dark' &&
                            (ownerState.color === 'primary' || !ownerState.color) && {
                            '&.Mui-checked, &.MuiCheckbox-indeterminate': {
                                color: theme.palette.text.primary
                            }
                        })
                    })

                }

            },

            // Same primary-vs-paper clash as Radio/Checkbox above: an "on"
            // Switch's thumb and track are drawn in primary.main. In dark mode
            // ON is the success green and OFF is a dim grey thumb on a faint
            // track, so the two states can't be confused.
            MuiSwitch: {

                styleOverrides: {

                    switchBase: ({ theme, ownerState }) => ({
                        ...(theme.palette.mode === 'dark' &&
                            (ownerState.color === 'primary' || !ownerState.color) && {
                            color: theme.palette.grey[600],
                            '&.Mui-checked': {
                                color: theme.palette.success.main
                            },
                            '&.Mui-checked + .MuiSwitch-track': {
                                backgroundColor: theme.palette.success.main,
                                opacity: 0.5
                            }
                        })
                    }),

                    track: ({ theme }) => ({
                        ...(theme.palette.mode === 'dark' && {
                            backgroundColor: theme.palette.common.white,
                            opacity: 0.12
                        })
                    })

                }

            },

            MuiChip: {

                styleOverrides: {

                    root: {
                        borderRadius: 6,
                        fontWeight: 600
                    }

                }

            },

            MuiSvgIcon: {

                defaultProps: {
                    fontSize: 'small'
                }

            },

            MuiIconButton: {

                styleOverrides: {

                    root: ({ theme }) => ({
                        borderRadius: 8,
                        color: theme.palette.text.secondary
                    })

                }

            },

            MuiTabs: {

                styleOverrides: {

                    indicator: {
                        display: 'none'
                    }

                }

            },

            MuiTab: {

                styleOverrides: {

                    root: ({ theme }) => ({
                        borderRadius: 8,
                        fontWeight: 500,
                        minHeight: 40,
                        color: theme.palette.text.secondary,
                        '&.Mui-selected': {
                            fontWeight: 700,
                            color: theme.palette.mode === 'dark'
                                ? theme.palette.common.white
                                : theme.palette.primary.main,
                            backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(30,41,59,0.08)'
                        }
                    })

                }

            }

        }

    });

    return theme;

}