import { mockCats } from "../mock/cats";
import {
  mondayRequest,
  createMondayItem,
  changeMondayColumnValue,
  uploadMondayFile,
  updateColumnAssets,
  getColumnSettings,
} from "./MondayService";
import { CATS } from "../constants/boards/cats";
import { CATS_STATUS_OPTIONS } from "../constants/statuses/catsStatuses";
import { mapCat } from "./mappers/CatMapper";

// Cat fields that upload as files after the item exists, rather than as
// plain create_item column values.
const CAT_FILE_FIELDS = {
  photos: CATS.COLUMNS.PHOTOS,
  videos: CATS.COLUMNS.VIDEOS,
  medicalDocuments: CATS.COLUMNS.MEDICAL_DOCUMENTS,
  passportFile: CATS.COLUMNS.PASSPORT_FILE,
};

export async function getCatsOld() {
  // Simulate API delay

  await new Promise((resolve) => setTimeout(resolve, 500));

  return mockCats;
}

export async function getCatOld(id) {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return mockCats.find((cat) => cat.id === Number(id));
}

export async function getCats() {
  const query = `
        query ($boardId: ID!) {
            boards(ids: [$boardId]) {
                items_page(limit: 500) {
                    items {
                        id
                        name
                        column_values {
                            id
                            type
                            text
                            value
                            ... on BoardRelationValue {
                                id
                                display_value
                                linked_items {
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

  const data = await mondayRequest(query, {
    boardId: CATS.BOARD_ID,
  });

  return data.boards[0].items_page.items.map(mapCat);
}

export async function getCat(id) {
  const query = `
        query ($boardId: ID!, $itemId: ID!) {
            boards(ids: [$boardId]) {
                items_page(
                    query_params: {
                        ids: [$itemId]
                    }
                ) {
                    items {
                        id
                        name
                        column_values {
                            id
                            type
                            text
                            value
                            ... on BoardRelationValue {
                                id
                                display_value
                                linked_items {
                                    id
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

  const data = await mondayRequest(query, {
    boardId: CATS.BOARD_ID,
    itemId: id,
  });

  const item = data.boards[0].items_page.items[0];

  console.log(
    item.column_values.find(
      (column) => column.id === CATS.COLUMNS.PASSPORT_FILE,
    ),
  );

  if (!item) {
    return null;
  }

  return mapCat(item);
}

export async function getAvailableCats() {
    const cats = await getCats();

    return cats.filter(cat => !cat.linkedAdopterId);
}

// Breed/Colour are Monday "dropdown" columns - their option list lives on
// the column definition, not on any item, so it has to be fetched separately.
export async function getCatDropdownOptions() {
  const columns = await getColumnSettings(CATS.BOARD_ID, [
    CATS.COLUMNS.BREED,
    CATS.COLUMNS.COLOUR,
  ]);

  const settingsByColumn = Object.fromEntries(
    columns.map((column) => [column.id, parseDropdownLabels(column.settings_str)]),
  );

  return {
    breed: settingsByColumn[CATS.COLUMNS.BREED] ?? [],
    colour: settingsByColumn[CATS.COLUMNS.COLOUR] ?? [],
  };
}

// Rescuer isn't mandatory when a cat is added, so this also has to support
// clearing it (rescuerId === null unlinks rather than leaving it untouched).
export async function updateCatRescuer(catId, rescuerId) {
  return changeMondayColumnValue(
    CATS.BOARD_ID,
    catId,
    CATS.COLUMNS.LINKED_RESCUER,
    { item_ids: rescuerId ? [Number(rescuerId)] : [] },
  );
}

export async function updateCatStatus(catId, status) {
  return changeMondayColumnValue(CATS.BOARD_ID, catId, CATS.COLUMNS.STATUS, {
    label: status,
  });
}

export async function updateCatName(catId, name) {
  return changeMondayColumnValue(CATS.BOARD_ID, catId, CATS.COLUMNS.NAME, name);
}

export async function updateCatGender(catId, gender) {
  return changeMondayColumnValue(CATS.BOARD_ID, catId, CATS.COLUMNS.GENDER, {
    label: gender,
  });
}

export async function updateCatAge(catId, age) {
  return changeMondayColumnValue(CATS.BOARD_ID, catId, CATS.COLUMNS.AGE, String(age));
}

export async function updateCatBreed(catId, breed) {
  return changeMondayColumnValue(
    CATS.BOARD_ID,
    catId,
    CATS.COLUMNS.BREED,
    { labels: [breed] },
    { createLabelsIfMissing: true },
  );
}

export async function updateCatColour(catId, colour) {
  return changeMondayColumnValue(
    CATS.BOARD_ID,
    catId,
    CATS.COLUMNS.COLOUR,
    { labels: [colour] },
    { createLabelsIfMissing: true },
  );
}

export async function updateCatVaccinated(catId, vaccinated) {
  return changeMondayColumnValue(CATS.BOARD_ID, catId, CATS.COLUMNS.VACCINATED, {
    label: vaccinated,
  });
}

export async function updateCatNeutered(catId, neutered) {
  return changeMondayColumnValue(CATS.BOARD_ID, catId, CATS.COLUMNS.NEUTERED, {
    label: neutered,
  });
}

export async function updateCatMedicationRequired(catId, medicationRequired) {
  return changeMondayColumnValue(CATS.BOARD_ID, catId, CATS.COLUMNS.MEDICATION_REQUIRED, {
    label: medicationRequired,
  });
}

export async function updateCatPassportComplete(catId, checked) {
  return changeMondayColumnValue(CATS.BOARD_ID, catId, CATS.COLUMNS.PASSPORT_COMPLETE, {
    checked,
  });
}

export async function uploadCatPassportFile(catId, file) {
  return uploadMondayFile(catId, CATS.COLUMNS.PASSPORT_FILE, file);
}

export async function uploadCatMedicalDocument(catId, file) {
  return uploadMondayFile(catId, CATS.COLUMNS.MEDICAL_DOCUMENTS, file);
}

function toFileInputs(files) {
  return files.map((file) => ({
    assetId: file.assetId,
    fileType: "asset",
    name: file.name,
  }));
}

export async function deleteCatPassportFile(catId, remainingFiles) {
  return updateColumnAssets(
    CATS.BOARD_ID,
    catId,
    CATS.COLUMNS.PASSPORT_FILE,
    toFileInputs(remainingFiles),
  );
}

export async function deleteCatMedicalDocument(catId, remainingFiles) {
  return updateColumnAssets(
    CATS.BOARD_ID,
    catId,
    CATS.COLUMNS.MEDICAL_DOCUMENTS,
    toFileInputs(remainingFiles),
  );
}

export async function uploadCatPhoto(catId, file) {
  return uploadMondayFile(catId, CATS.COLUMNS.PHOTOS, file);
}

export async function deleteCatPhoto(catId, remainingFiles) {
  return updateColumnAssets(CATS.BOARD_ID, catId, CATS.COLUMNS.PHOTOS, toFileInputs(remainingFiles));
}

export async function uploadCatVideo(catId, file) {
  return uploadMondayFile(catId, CATS.COLUMNS.VIDEOS, file);
}

export async function deleteCatVideo(catId, remainingFiles) {
  return updateColumnAssets(CATS.BOARD_ID, catId, CATS.COLUMNS.VIDEOS, toFileInputs(remainingFiles));
}

export async function updateCatMicrochipNumber(catId, microchipNumber) {
  return changeMondayColumnValue(CATS.BOARD_ID, catId, CATS.COLUMNS.MICROCHIP_NUMBER, microchipNumber);
}

export async function updateCatFelvFivStatus(catId, felvFivStatus) {
  return changeMondayColumnValue(CATS.BOARD_ID, catId, CATS.COLUMNS.FELV_FIV_STATUS, {
    label: felvFivStatus,
  });
}

function parseDropdownLabels(settingsStr) {
  if (!settingsStr) {
    return [];
  }

  try {
    const labels = JSON.parse(settingsStr).labels;

    if (Array.isArray(labels)) {
      return labels.map((label) => (typeof label === "string" ? label : label.name));
    }

    if (labels && typeof labels === "object") {
      return Object.values(labels);
    }

    return [];
  } catch {
    return [];
  }
}

export async function createCat(input, files = {}) {
  const columnValues = {
    [CATS.COLUMNS.STATUS]: { label: CATS_STATUS_OPTIONS.STATUS.INTAKE },
  };

  const statusFields = {
    gender: CATS.COLUMNS.GENDER,
    energyLevel: CATS.COLUMNS.ENERGY_LEVEL,
    lapCat: CATS.COLUMNS.LAP_CAT,
    childFriendly: CATS.COLUMNS.CHILD_FRIENDLY,
    catFriendly: CATS.COLUMNS.CAT_FRIENDLY,
    dogFriendly: CATS.COLUMNS.DOG_FRIENDLY,
    indoorOnly: CATS.COLUMNS.INDOOR_ONLY,
    vaccinated: CATS.COLUMNS.VACCINATED,
    neutered: CATS.COLUMNS.NEUTERED,
    felvFivStatus: CATS.COLUMNS.FELV_FIV_STATUS,
    medicationRequired: CATS.COLUMNS.MEDICATION_REQUIRED,
  };

  const longTextFields = {
    personalitySummary: CATS.COLUMNS.PERSONALITY_SUMMARY,
    specialNotes: CATS.COLUMNS.SPECIAL_NOTES,
    medicalSummary: CATS.COLUMNS.MEDICAL_SUMMARY,
  };

  const dropdownFields = {
    breed: CATS.COLUMNS.BREED,
    colour: CATS.COLUMNS.COLOUR,
  };

  const textFields = {
    fosterContact: CATS.COLUMNS.FOSTER_CONTACT,
    fosterLocation: CATS.COLUMNS.FOSTER_LOCATION,
    microchipNumber: CATS.COLUMNS.MICROCHIP_NUMBER,
  };

  for (const [field, columnId] of Object.entries(statusFields)) {
    if (input[field]) {
      columnValues[columnId] = { label: input[field] };
    }
  }

  for (const [field, columnId] of Object.entries(longTextFields)) {
    if (input[field]) {
      columnValues[columnId] = { text: input[field] };
    }
  }

  for (const [field, columnId] of Object.entries(dropdownFields)) {
    if (input[field]) {
      columnValues[columnId] = { labels: [input[field]] };
    }
  }

  for (const [field, columnId] of Object.entries(textFields)) {
    if (input[field]) {
      columnValues[columnId] = input[field];
    }
  }

  if (input.age) {
    columnValues[CATS.COLUMNS.AGE] = String(input.age);
  }

  if (input.rescuerId) {
    columnValues[CATS.COLUMNS.LINKED_RESCUER] = {
      item_ids: [Number(input.rescuerId)],
    };
  }

  const itemId = await createMondayItem(CATS.BOARD_ID, input.name, columnValues, {
    createLabelsIfMissing: true,
  });

  const uploadTasks = Object.entries(CAT_FILE_FIELDS).flatMap(([field, columnId]) => {
    const value = files[field];

    if (!value) {
      return [];
    }

    const fileList = Array.isArray(value) ? value : [value];

    return fileList.map((file) => ({ field, columnId, file }));
  });

  // The cat item already exists at this point - one failed file shouldn't
  // read as "the whole thing failed", so uploads are allowed to fail
  // independently of each other and of the overall result.
  const uploadResults = await Promise.allSettled(
    uploadTasks.map((task) => uploadMondayFile(itemId, task.columnId, task.file)),
  );

  const failedUploads = uploadResults
    .map((result, index) => (result.status === "rejected" ? uploadTasks[index].field : null))
    .filter(Boolean);

  return { id: itemId, failedUploads };
}
