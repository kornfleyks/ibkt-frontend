import { mondayRequest } from "./MondayService";
import { USERS } from "../constants/boards/users";

export async function getUsers() {
  const query = `
        query ($boardId: ID!) {
            boards(ids: [$boardId]) {
                items_page(limit: 500) {
                    items {
                        id
                        name
                    }
                }
            }
        }
    `;

  const data = await mondayRequest(query, {
    boardId: USERS.BOARD_ID,
  });

  return data.boards[0].items_page.items.map((item) => ({
    id: item.id,
    name: item.name,
  }));
}
