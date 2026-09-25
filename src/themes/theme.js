import { createTheme } from "@mui/material/styles";
import { VIBE_TOKENS } from "./vibeTokens";

// MUI theme styled after monday.com's Vibe design system: Vibe's colours
// (light, and the navy dark theme), fonts (Figtree text, Poppins titles),
// radii, shadows and component shapes. Only the look changes - every
// component is still MUI, so behaviour and layout are untouched.
export function buildTheme(darkMode) {

    const t = darkMode ? VIBE_TOKENS.dark : VIBE_TOKENS.light;

    const titleFont = { fontFamily: t.titleFontFamily, fontWeight: 500 };

    const theme = createTheme({

        palette: {

            mode: darkMode ? 'dark' : 'light',

            primary: {
                main: t.primary,
                dark: t.primaryHover,
                contrastText: t.textOnPrimary
            },

            secondary: {
                main: t.secondaryText
            },

            success: {
                main: t.positive
            },

            error: {
                main: t.negative
            },

            warning: {
                main: t.warning,
                dark: t.warningHover
            },

            info: {
                main: t.link
            },

            text: {
                primary: t.primaryText,
                secondary: t.secondaryText
            },

            divider: t.layoutBorder,

            background: {
                default: t.greyBackground,
                paper: darkMode ? t.secondaryBackground : t.primaryBackground
            },

            action: {
                hover: t.primaryBackgroundHover,
                selected: t.primarySelected,
                disabledBackground: t.disabledBackground
            }

        },

        shape: {
            borderRadius: t.radiusMedium
        },

        typography: {

            fontFamily: t.fontFamily,

            // Vibe's title scale: h1 30, h2/h3 24, h4 18, h5 16.
            h1: { ...titleFont, fontSize: '1.875rem', lineHeight: '42px' },
            h2: { ...titleFont, fontSize: '1.5rem', lineHeight: '32px' },
            h3: { ...titleFont, fontSize: '1.5rem', lineHeight: '32px' },
            h4: { ...titleFont, fontSize: '1.125rem', lineHeight: '24px' },
            h5: { ...titleFont, fontSize: '1rem', lineHeight: '22px' },
            h6: { ...titleFont, fontSize: '1rem', lineHeight: '22px' },
            subtitle1: { fontWeight: 500 },
            subtitle2: { fontWeight: 500 },
            body1: { fontSize: '0.875rem', lineHeight: '20px' },
            body2: { fontSize: '0.8125rem', lineHeight: '18px' },
            caption: { fontSize: '0.75rem' },
            button: { textTransform: 'none', fontWeight: 400, fontSize: '0.875rem' }

        },

        shadows: [
            'none',
            t.shadowXs, t.shadowXs,
            t.shadowSmall, t.shadowSmall, t.shadowSmall,
            t.shadowMedium, t.shadowMedium, t.shadowMedium, t.shadowMedium, t.shadowMedium,
            t.shadowMedium, t.shadowMedium, t.shadowMedium, t.shadowMedium, t.shadowMedium,
            t.shadowLarge, t.shadowLarge, t.shadowLarge, t.shadowLarge, t.shadowLarge,
            t.shadowLarge, t.shadowLarge, t.shadowLarge, t.shadowLarge
        ],

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

            // The sidebar: Vibe's surface colour with a hairline border,
            // like monday.com's left panel.
            MuiDrawer: {

                styleOverrides: {

                    paper: {
                        backgroundColor: t.primaryBackground,
                        color: t.primaryText,
                        borderRight: `1px solid ${t.layoutBorder}`
                    }

                }

            },

            MuiButton: {

                defaultProps: {
                    disableElevation: true
                },

                styleOverrides: {

                    root: {
                        borderRadius: t.radiusSmall,
                        minHeight: 40,
                        paddingInline: 16,
                        boxShadow: 'none',
                        '&:hover': { boxShadow: 'none' }
                    },

                    sizeSmall: {
                        minHeight: 32,
                        paddingInline: 8
                    },

                    sizeLarge: {
                        minHeight: 48,
                        paddingInline: 24,
                        fontSize: '1rem'
                    },

                    // Vibe "secondary" buttons: border in the UI border colour.
                    outlined: ({ ownerState }) => ({
                        ...((ownerState.color === 'primary' || !ownerState.color) && {
                            color: t.primaryText,
                            borderColor: t.uiBorder,
                            '&:hover': {
                                borderColor: t.uiBorder,
                                backgroundColor: t.primaryBackgroundHover
                            }
                        })
                    }),

                    // Vibe "tertiary" buttons: plain text, grey hover.
                    text: ({ ownerState }) => ({
                        ...((ownerState.color === 'primary' || !ownerState.color) && {
                            color: t.primaryText,
                            '&:hover': {
                                backgroundColor: t.primaryBackgroundHover
                            }
                        })
                    })

                }

            },

            MuiIconButton: {

                styleOverrides: {

                    root: {
                        borderRadius: t.radiusSmall,
                        color: t.icon,
                        '&:hover': {
                            backgroundColor: t.primaryBackgroundHover
                        }
                    }

                }

            },

            MuiOutlinedInput: {

                styleOverrides: {

                    root: {
                        borderRadius: t.radiusSmall,
                        backgroundColor: darkMode ? 'transparent' : t.primaryBackground,
                        '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: t.uiBorder
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: t.primaryText
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: t.primary,
                            borderWidth: 1
                        }
                    },

                    input: {
                        '&::placeholder': {
                            color: t.placeholder,
                            opacity: 1
                        }
                    }

                }

            },

            MuiInputLabel: {

                styleOverrides: {

                    root: {
                        color: t.secondaryText,
                        '&.Mui-focused': {
                            color: t.primary
                        }
                    }

                }

            },

            MuiCard: {

                styleOverrides: {

                    root: {
                        borderRadius: t.radiusMedium,
                        border: `1px solid ${t.layoutBorder}`,
                        boxShadow: 'none'
                    }

                }

            },

            MuiPaper: {

                defaultProps: {
                    elevation: 0
                },

                styleOverrides: {
                    root: {
                        backgroundImage: 'none'
                    }
                }

            },

            // Floating surfaces (menus, popovers, autocomplete lists) get
            // Vibe's medium shadow; dialogs the large one.
            MuiPopover: {

                styleOverrides: {
                    paper: {
                        borderRadius: t.radiusMedium,
                        boxShadow: t.shadowMedium
                    }
                }

            },

            MuiMenu: {

                styleOverrides: {
                    paper: {
                        borderRadius: t.radiusMedium,
                        boxShadow: t.shadowMedium
                    }
                }

            },

            MuiAutocomplete: {

                styleOverrides: {
                    paper: {
                        borderRadius: t.radiusMedium,
                        boxShadow: t.shadowMedium
                    }
                }

            },

            MuiMenuItem: {

                styleOverrides: {
                    root: {
                        borderRadius: t.radiusSmall,
                        marginInline: 8,
                        minHeight: 36,
                        '&:hover': {
                            backgroundColor: t.primaryBackgroundHover
                        },
                        '&.Mui-selected, &.Mui-selected:hover': {
                            backgroundColor: t.primarySelected
                        }
                    }
                }

            },

            MuiListItemButton: {

                styleOverrides: {
                    root: {
                        '&:hover': {
                            backgroundColor: t.primaryBackgroundHover
                        },
                        '&.Mui-selected, &.Mui-selected:hover': {
                            backgroundColor: t.primarySelected
                        }
                    }
                }

            },

            MuiDialog: {

                styleOverrides: {
                    paper: {
                        borderRadius: t.radiusMedium,
                        boxShadow: t.shadowLarge
                    }
                }

            },

            MuiDialogTitle: {

                styleOverrides: {
                    root: {
                        ...titleFont,
                        fontSize: '1.5rem',
                        lineHeight: '32px'
                    }
                }

            },

            MuiTooltip: {

                styleOverrides: {
                    tooltip: {
                        backgroundColor: t.invertedBackground,
                        color: t.invertedText,
                        borderRadius: t.radiusSmall,
                        fontSize: '0.875rem',
                        padding: '8px 16px',
                        boxShadow: t.shadowMedium
                    },
                    arrow: {
                        color: t.invertedBackground
                    }
                }

            },

            MuiRadio: {

                styleOverrides: {
                    root: {
                        color: t.uiBorder
                    }
                }

            },

            MuiCheckbox: {

                styleOverrides: {
                    root: {
                        color: t.uiBorder
                    }
                }

            },

            // Vibe Toggle: blue when on, grey track when off.
            MuiSwitch: {

                styleOverrides: {

                    switchBase: {
                        '&.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: t.primary,
                            opacity: 1
                        }
                    },

                    thumb: {
                        boxShadow: 'none'
                    },

                    track: {
                        backgroundColor: t.uiBorder,
                        opacity: 1
                    }

                }

            },

            MuiChip: {

                styleOverrides: {

                    root: {
                        borderRadius: t.radiusSmall,
                        fontWeight: 400
                    },

                    filled: ({ ownerState }) => ({
                        ...((!ownerState.color || ownerState.color === 'default') && {
                            backgroundColor: t.uiBackground,
                            color: t.primaryText
                        })
                    }),

                    outlined: ({ ownerState }) => ({
                        ...((!ownerState.color || ownerState.color === 'default') && {
                            borderColor: t.uiBorder
                        })
                    })

                }

            },

            // Vibe AttentionBox: tinted background, primary text.
            MuiAlert: {

                styleOverrides: {

                    root: {
                        borderRadius: t.radiusMedium
                    },

                    standardInfo: {
                        backgroundColor: t.primarySelected,
                        color: t.primaryText,
                        '& .MuiAlert-icon': { color: t.primary }
                    },

                    standardSuccess: {
                        backgroundColor: t.positiveSelected,
                        color: t.primaryText,
                        '& .MuiAlert-icon': { color: t.positive }
                    },

                    standardError: {
                        backgroundColor: t.negativeSelected,
                        color: t.primaryText,
                        '& .MuiAlert-icon': { color: t.negative }
                    },

                    standardWarning: {
                        backgroundColor: t.warningSelected,
                        color: t.primaryText,
                        '& .MuiAlert-icon': { color: darkMode ? t.warning : t.warningHover }
                    }

                }

            },

            MuiAvatar: {

                styleOverrides: {
                    colorDefault: {
                        backgroundColor: t.uiBackground,
                        color: t.primaryText
                    }
                }

            },

            MuiBadge: {

                styleOverrides: {
                    badge: {
                        fontWeight: 500
                    }
                }

            },

            MuiSvgIcon: {

                defaultProps: {
                    fontSize: 'small'
                }

            },

            // Vibe tabs: underline in the primary colour under the selected tab.
            MuiTabs: {

                styleOverrides: {

                    root: {
                        borderBottom: `1px solid ${t.layoutBorder}`
                    },

                    indicator: {
                        backgroundColor: t.primary,
                        height: 2
                    }

                }

            },

            MuiTab: {

                styleOverrides: {

                    root: {
                        fontWeight: 400,
                        fontSize: '0.875rem',
                        minHeight: 40,
                        color: t.secondaryText,
                        '&:hover': {
                            color: t.primaryText
                        },
                        '&.Mui-selected': {
                            color: t.primary
                        }
                    }

                }

            },

            MuiTableCell: {

                styleOverrides: {

                    root: {
                        borderColor: t.layoutBorder
                    },

                    head: {
                        color: t.secondaryText,
                        fontWeight: 500
                    }

                }

            },

            MuiDivider: {

                styleOverrides: {
                    root: {
                        borderColor: t.layoutBorder
                    }
                }

            },

            MuiLink: {

                styleOverrides: {
                    root: {
                        color: t.link
                    }
                }

            },

            MuiBackdrop: {

                styleOverrides: {
                    root: ({ ownerState }) => ({
                        ...(!ownerState.invisible && {
                            backgroundColor: 'rgba(41, 47, 76, 0.7)'
                        })
                    })
                }

            }

        }

    });

    return theme;

}
