import { TRAVEL } from "../../constants/boards/travel";

export function mapTravel(item) {
  const columns = Object.fromEntries(
    item.column_values.map((column) => [column.id, column]),
  );

  return {
    id: item.id,
    name: item.name,
    status: columns[TRAVEL.COLUMNS.STATUS]?.text ?? "N/A",
  };
}
