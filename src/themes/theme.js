import { createTheme } from "@mui/material/styles";
import { BRAND_TOKENS } from "./brandTokens";

// The Oriel brand as an MUI theme (brandTokens.js): the IBKT palette, Barlow
// Condensed capitals for headings, Nunito Sans for everything else, pill
// buttons and chips, Cream pages. Only the look changes - every component is
// still MUI, so behaviour and layout are untouched.
export function buildTheme(darkMode) {

    const t = darkMode ? BRAND_TOKENS.dark : BRAND_TOKENS.light;

    // Headings are always capitals in Barlow Condensed SemiBold (the brand
    // guidelines). The face is narrow, so the sizes below are a step larger than
    // the body scale would suggest.
    const titleFont = { fontFamily: t.titleFontFamily, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.01em' };

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
                main: t.info
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

            h1: { ...titleFont, fontSize: '2.25rem', lineHeight: 1.1 },
            h2: { ...titleFont, fontSize: '1.875rem', lineHeight: 1.15 },
            h3: { ...titleFont, fontSize: '1.625rem', lineHeight: 1.15 },
            h4: { ...titleFont, fontSize: '1.375rem', lineHeight: 1.2 },
            h5: { ...titleFont, fontSize: '1.25rem', lineHeight: 1.2 },
            h6: { ...titleFont, fontSize: '1.125rem', lineHeight: 1.25 },
            subtitle1: { fontWeight: 600 },
            subtitle2: { fontWeight: 600 },
            body1: { fontSize: '0.9375rem', lineHeight: '22px' },
            body2: { fontSize: '0.875rem', lineHeight: '20px' },
            caption: { fontSize: '0.8125rem' },
            button: { textTransform: 'none', fontWeight: 700, fontSize: '0.9375rem' }

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
                        borderRadius: t.radiusPill,
                        minHeight: 40,
                        paddingInline: 20,
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

                    // Secondary buttons: a Plum outline with dark text.
                    outlined: ({ ownerState }) => ({
                        ...((ownerState.color === 'primary' || !ownerState.color) && {
                            color: t.primaryText,
                            borderColor: t.secondaryText,
                            borderWidth: 1.5,
                            '&:hover': {
                                borderColor: t.secondaryText,
                                borderWidth: 1.5,
                                backgroundColor: t.primaryBackgroundHover
                            }
                        })
                    }),

                    // Tertiary buttons: plain text, soft hover.
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
                        borderRadius: t.radiusMedium,
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
                        borderRadius: t.radiusBig,
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
                        borderRadius: t.radiusPill,
                        fontWeight: 600
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
                        '& .MuiAlert-icon': { color: t.info }
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

            // Tabs: underline in the primary colour under the selected tab.
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
                        fontWeight: 600,
                        fontSize: '0.9375rem',
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

                    // Lilac header row with small spaced capitals.
                    head: {
                        backgroundColor: t.uiBackground,
                        color: t.primaryText,
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em'
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
                            backgroundColor: 'rgba(62, 52, 71, 0.7)'
                        })
                    })
                }

            }

        }

    });

    return theme;

}
