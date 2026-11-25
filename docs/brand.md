# Brand

Status: step 1 done (2026-11-25): the colours, the fonts, the logos and the icons. The screens are not redesigned yet.

Source: the Oriel brand kit v1, approved by Mia Esat on 22 November 2026, which is built on the IBKT Brand Guidelines 2026. The kit says that Oriel's marks are for the system, and that the IBKT logo stays on the website and on social.

## Colours and fonts

`src/themes/brandTokens.js` holds the palette, and `src/themes/theme.js` turns it into the MUI theme. The page is Cream, text is Midnight or Plum, and primary buttons are Deep Rose. Cream text goes on Deep Rose, and never white text on Coral or Peach. Headings are Barlow Condensed SemiBold in capitals, and everything else is Nunito Sans. Both fonts come from the packages `@fontsource/barlow-condensed` and `@fontsource/nunito-sans`, so no request goes to Google.

Success, error and warning have no colours in the kit, so they keep the usual green, red and amber. The kit has no dark theme. The dark theme uses Midnight as the page and Coral for actions, and its two surface colours are blends of Midnight and Plum.

## Marks

`src/components/Brand/BrandMark.jsx` shows a mark and picks the full-colour file on light backgrounds and the reversed file in the dark theme. The files are in `src/assets/brand/`.

| Mark | Used for | Rule |
|---|---|---|
| Logo | The header and the portal header | At least 32 px high |
| Seal | The sign-in pages and the agreement page | At least 120 px across, never in a header |
| Icon | Browser tab and phone icons | Anything under 32 px |

Never recolour a mark, stretch it, put it on a busy background, or place the logo and the seal together. The browser tab and phone icons are in `public/`, and `index.html` and `public/site.webmanifest` point to them. The tab and theme colour is Midnight.

## Names

The Rescuers page is called Rescue Partners in the app, as in the mock-ups. The Rescuer role, the code and the address `/rescuers` keep their names.

## Not done yet

The mock-ups also show a top navigation bar, the Ask Queenie assistant, a Decline button and a timeline on a partner, and a new home page for partners. These are separate tasks.
