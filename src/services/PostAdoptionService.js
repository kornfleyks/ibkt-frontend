import { mondayRequest, serverGet } from "./MondayService";
import { isDatabaseBoard } from "./DatabaseBoardsService";
import { POST_ADOPTION } from "../constants/boards/postAdoption";
import { mapPostAdoption } from "./mappers/PostAdoptionMapper";

// From the database (server/readOnlyBoards.js) when the server has the
// "post_adoption" board switched on, otherwise from Monday as before.
export async function getPostAdoptionCases() {
  if (await isDatabaseBoard("post_adoption")) {
    return serverGet("/api/post-adoption");
  }

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
