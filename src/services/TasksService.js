import { mondayRequest } from "./MondayService";
import { TASKS } from "../constants/boards/tasks";
import { mapTask } from "./mappers/TaskMapper";

export async function getTasks() {
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
    boardId: TASKS.BOARD_ID,
  });

  return data.boards[0].items_page.items.map(mapTask);
}
