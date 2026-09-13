import { CATS } from "../../constants/boards/cats";

export function mapCat(item) {
  const columns = Object.fromEntries(
    item.column_values.map((column) => [column.id, column]),
  );

  return {
    id: item.id,
    name: item.name,
    status: columns[CATS.COLUMNS.STATUS]?.text ?? "N/A",
    gender: columns[CATS.COLUMNS.GENDER]?.text ?? "N/A",
    breed: columns[CATS.COLUMNS.BREED]?.text ?? "N/A",
    colour: columns[CATS.COLUMNS.COLOUR]?.text ?? "N/A",
    energyLevel: columns[CATS.COLUMNS.ENERGY_LEVEL]?.text ?? "N/A",
    vaccinated: columns[CATS.COLUMNS.VACCINATED]?.text === "Yes",
    sterilized: columns[CATS.COLUMNS.NEUTERED]?.text === "Yes",
    felvFivStatus: columns[CATS.COLUMNS.FELV_FIV_STATUS]?.text ?? "N/A",
    medicationRequired:
      columns[CATS.COLUMNS.MEDICATION_REQUIRED]?.text === "Yes",
    passportComplete: getCheckboxValue(columns[CATS.COLUMNS.PASSPORT_COMPLETE]),
    microchipNumber: columns[CATS.COLUMNS.MICROCHIP_NUMBER]?.text ?? "N/A",
    adoptionReady: columns[CATS.COLUMNS.ADOPTION_READY]?.text ?? "N/A",
    age: columns[CATS.COLUMNS.AGE]?.text ?? "N/A",
    rescuer: columns[CATS.COLUMNS.LINKED_RESCUER]?.display_value ?? "N/A",
    rescuerId: columns[CATS.COLUMNS.LINKED_RESCUER]?.linked_items?.[0]?.id ?? null,
    foster: columns[CATS.COLUMNS.FOSTER_CONTACT]?.text ?? "",
    passportFile: getFileValue(columns[CATS.COLUMNS.PASSPORT_FILE]),
    medicalDocuments: getFileValue(columns[CATS.COLUMNS.MEDICAL_DOCUMENTS]),
    linkedAdopterId:
      columns[CATS.COLUMNS.LINKED_ADOPTER_2]?.linked_items?.[0]?.id ?? null,
  };
}

function getCheckboxValue(column) {
  if (!column?.value) {
    return false;
  }

  try {
    return JSON.parse(column.value).checked;
  } catch {
    return false;
  }
}

function getFileValue(column) {
  if (!column?.value) {
    return null;
  }

  try {
    const value = JSON.parse(column.value);
    const file = value.files?.[0];

    if (!file) {
      return null;
    }

    return {
      name: file.name,
      assetId: file.assetId,
      url: column.text,
    };
  } catch {
    return null;
  }
}
