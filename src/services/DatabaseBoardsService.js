import { serverGet } from "./MondayService";

// Which boards this server keeps in the database (its DATABASE_BOARDS
// switch). Asked once per page load; a board moved while the page is open
// is picked up on reload (the server refuses Monday writes to a moved board
// with a message saying so). If the question fails, Monday is used.
let boardsPromise = null;

function databaseBoards() {
  boardsPromise ??= serverGet("/api/database-boards")
    .then((result) => new Set(result.boards ?? []))
    .catch((err) => {
      console.error("Couldn't check which boards use the database:", err);
      boardsPromise = null;
      return new Set();
    });

  return boardsPromise;
}

export async function isDatabaseBoard(table) {
  return (await databaseBoards()).has(table);
}
