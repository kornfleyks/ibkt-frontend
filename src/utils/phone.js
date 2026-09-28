import { COUNTRIES, dialCodeOf } from "../constants/countries";

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

function countryNameOf(code) {
  try {
    return regionNames.of(code) ?? code;
  } catch {
    return code;
  }
}

// [{ code, dialCode, name }] sorted by name, for the country picker.
export const COUNTRY_OPTIONS = COUNTRIES
  .map(([code, dialCode]) => ({ code, dialCode, name: countryNameOf(code) }))
  .sort((a, b) => a.name.localeCompare(b.name));

// A saved phone ({ number: "+306912345678", country: "GR" }) as the form's
// { number (national), country }. The server always saves "+<dial><number>";
// anything else (e.g. typed straight into Monday) is shown as it is.
export function toPhoneForm(phone) {
  const country = phone?.country ?? "";
  const number = phone?.number ?? "";
  const prefix = `+${dialCodeOf(country) ?? ""}`;

  return {
    country,
    number: country && number.startsWith(prefix) ? number.slice(prefix.length) : number,
  };
}

// "+30 6912345678" for display, or "" when there's no number.
export function formatPhone(phone) {
  const { country, number } = toPhoneForm(phone);
  const dialCode = dialCodeOf(country);

  if (!number) {
    return "";
  }

  return dialCode ? `+${dialCode} ${number}` : number;
}

// "tel:+306912345678" for a click-to-call link, or null when there's no number.
export function telHref(phone) {
  const formatted = formatPhone(phone);

  return formatted ? `tel:${formatted.replace(/[^\d+]/g, "")}` : null;
}
