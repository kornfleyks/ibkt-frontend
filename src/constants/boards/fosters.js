// Created by server/scripts/createFostersBoard.js on 2026-11-17 (docs/foster-onboarding.md).
export const FOSTERS = {
  BOARD_ID: "5108067329",
  COLUMNS: {
    NAME: "name", // Name | name
    FOSTER_ID: "pulse_id_mm96kgp1", // Foster ID | item_id
    STATUS: "color_mm96v1qt", // Status | status
    FIRST_NAME: "text_mm96bfft", // First Name | text
    LAST_NAME: "text_mm96wq2p", // Last Name | text
    EMAIL: "email_mm96g4v0", // Email | email
    PHONE: "phone_mm96zs6t", // Phone | phone
    COUNTRY: "country_mm967xy5", // Country | country
    CITY: "text_mm96c08h", // City | text
    ADDRESS: "long_text_mm96exc7", // Address | long_text
    EMERGENCY_CONTACT: "long_text_mm968tzf", // Emergency Contact | long_text
    REFERENCES: "long_text_mm9671j7", // References | long_text
    FOSTER_AGREEMENT_SIGNED: "color_mm96drxv", // Foster Agreement Signed | status
    AGREEMENT_DATE: "date_mm96jdq8", // Agreement Date | date
    NOTES: "long_text_mm96r3q0", // Notes | long_text
    LINK_TO_CATS: "board_relation_mm96mtd0", // link to Cats | board_relation
  },
  RELATIONS: {
    LINK_TO_CATS: ["5098369241"],
  },
};
