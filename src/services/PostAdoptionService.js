import { mondayRequest } from "./MondayService";
import { POST_ADOPTION } from "../constants/boards/postAdoption";
import { mapPostAdoption } from "./mappers/PostAdoptionMapper";

export async function getPostAdoptionCases() {
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
    boardId: POST_ADOPTION.BOARD_ID,
  });

  return data.boards[0].items_page.items.map(mapPostAdoption);
}
