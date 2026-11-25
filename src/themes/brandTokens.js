// The Oriel brand tokens (Oriel brand kit v1, approved by Mia Esat on 22 November
// 2026, on the IBKT Brand Guidelines 2026 palette), as plain values so the MUI
// theme can use them: MUI needs real colours, not CSS variables, to derive
// hover and alpha shades. The names are the ones the theme (theme.js) reads.
//
// The palette:
//   Midnight #3E3447   Plum #645570     Lavender #B3A7BE   Lilac #ECE6F0
//   Deep Rose #B9524F  Coral #F08482    Peach #F7B9AB      Blush #FBEDEC
//   Cream #FFF9F5 (the page, never pure white)
//   Crown Gold, Sage and Butter are for tags and labels only, so they are not here.
//
// Rules from the kit: body text is Midnight or Plum on Cream; Cream text goes on
// Midnight, Plum or Deep Rose; never white text on Coral or Peach; no gradients.
// Success, error and warning have no colours in the kit, so they stay the usual
// green, red and amber, for clarity.
//
// The dark theme uses Midnight as the page, with Coral for actions. Its two
// surface colours are blends of Midnight and Plum, because the kit has no dark theme.

const shared = {
  fontFamily: '"Nunito Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  titleFontFamily: '"Barlow Condensed", "Arial Narrow", sans-serif',
  radiusSmall: 8,
  radiusMedium: 12,
  radiusBig: 16,
  // Buttons and chips are pills.
  radiusPill: 999,
  positive: "#00854d",
  negative: "#d83a52",
  warning: "#ffcb00",
  warningHover: "#eaaa15",
};

export const BRAND_TOKENS = {
  light: {
    ...shared,
    primary: "#B9524F",
    primaryHover: "#9C4240",
    textOnPrimary: "#FFF9F5",
    primarySelected: "#ECE6F0",
    primarySelectedHover: "#E0D7E6",
    primaryHighlighted: "#FBEDEC",
    primaryText: "#3E3447",
    secondaryText: "#645570",
    primaryBackground: "#FFF9F5",
    primaryBackgroundHover: "rgba(100, 85, 112, 0.08)",
    secondaryBackground: "#FFF9F5",
    greyBackground: "#FFF9F5",
    uiBackground: "#ECE6F0",
    uiBorder: "#B3A7BE",
    layoutBorder: "rgba(179, 167, 190, 0.5)",
    disabledBackground: "#ECE6F0",
    positiveSelected: "#bbdbc9",
    negativeSelected: "#f4c3cb",
    warningSelected: "#fceba1",
    info: "#645570",
    link: "#B9524F",
    icon: "#645570",
    placeholder: "#645570",
    invertedBackground: "#3E3447",
    invertedText: "#FFF9F5",
    shadowXs: "0px 4px 6px -4px rgba(62, 52, 71, 0.12)",
    shadowSmall: "0px 4px 8px rgba(62, 52, 71, 0.16)",
    shadowMedium: "0px 6px 20px rgba(62, 52, 71, 0.18)",
    shadowLarge: "0px 15px 50px rgba(62, 52, 71, 0.28)",
  },
  dark: {
    ...shared,
    primary: "#F08482",
    primaryHover: "#F7B9AB",
    // Midnight on Coral: the kit forbids white text on Coral.
    textOnPrimary: "#3E3447",
    primarySelected: "#645570",
    primarySelectedHover: "#6E5F7B",
    primaryHighlighted: "#4F4259",
    primaryText: "#FFF9F5",
    secondaryText: "#B3A7BE",
    primaryBackground: "#3E3447",
    primaryBackgroundHover: "rgba(179, 167, 190, 0.16)",
    secondaryBackground: "#483C51",
    greyBackground: "#3E3447",
    uiBackground: "#53465E",
    uiBorder: "#8A7C96",
    layoutBorder: "rgba(179, 167, 190, 0.25)",
    disabledBackground: "#53465E",
    positiveSelected: "#025231",
    negativeSelected: "#642830",
    warningSelected: "#503e02",
    info: "#B3A7BE",
    link: "#F7B9AB",
    icon: "#B3A7BE",
    placeholder: "#B3A7BE",
    invertedBackground: "#FFF9F5",
    invertedText: "#3E3447",
    shadowXs: "0px 4px 6px -4px rgba(20, 15, 25, 0.5)",
    shadowSmall: "0px 4px 8px rgba(20, 15, 25, 0.5)",
    shadowMedium: "0px 6px 20px rgba(20, 15, 25, 0.5)",
    shadowLarge: "0px 15px 50px rgba(20, 15, 25, 0.5)",
  },
};
