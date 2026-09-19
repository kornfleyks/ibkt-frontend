import { mondayRequest } from "./MondayService";
import { TRAVEL } from "../constants/boards/travel";
import { mapTravel } from "./mappers/TravelMapper";

export async function getTravel() {
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
                        }
                    }
                }
            }
        }
    `;

  const data = await mondayRequest(query, {
    boardId: TRAVEL.BOARD_ID,
  });

  return data.boards[0].items_page.items.map(mapTravel);
}
