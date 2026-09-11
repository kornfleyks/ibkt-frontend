import { mondayRequest } from "./MondayService";
import { RESCUERS } from "../constants/boards/rescuers";

export async function getRescuers() {
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
    boardId: RESCUERS.BOARD_ID,
  });

  return data.boards[0].items_page.items.map((item) => ({
    id: item.id,
    name: item.name,
  }));
}
