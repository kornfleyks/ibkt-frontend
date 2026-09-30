import { dialCodeOf } from "../src/constants/countries.js";

// A phone { number (national, without the country code), country (ISO
// code) } -> Monday's phone value { phone, countryShortName }, or
// { error }. An empty number gives an empty value (clears the column).
// Shared by the Account page and the Add Application form.

// E.164 allows at most 15 digits including the country code.
const MAX_PHONE_DIGITS = 15;

export function toPhoneValue(phone) {
  const number = String(phone?.number ?? "").replace(/[\s\-().]/g, "");

  if (!number) {
    return { value: { phone: "", countryShortName: "" } };
  }

  const dialCode = dialCodeOf(phone?.country);

  if (!dialCode) {
    return { error: "Choose the phone number's country." };
  }

  if (!/^\d+$/.test(number) || dialCode.length + number.length > MAX_PHONE_DIGITS || number.length < 4) {
    return { error: "Enter a valid phone number (digits only, without the country code)." };
  }

  return { value: { phone: `+${dialCode}${number}`, countryShortName: phone.country } };
}
