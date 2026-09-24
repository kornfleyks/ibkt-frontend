// Groups cats into bonded groups by following their Bonded With links.
//
// linkBondedCats writes a full cross-link (every cat points at every
// groupmate), but links edited by hand on Monday may be one-sided or
// partial, so groups are built as connected components rather than by
// trusting any single cat's list. A cat with no bonds is a group of one.
// Links to cats not in `cats` are ignored.
export function buildBondedGroups(cats) {
  const catsById = new Map(cats.map((cat) => [String(cat.id), cat]));
  const neighbours = new Map(cats.map((cat) => [String(cat.id), new Set()]));

  for (const cat of cats) {
    for (const bondedId of cat.bondedWithIds ?? []) {
      const otherId = String(bondedId);

      if (catsById.has(otherId)) {
        neighbours.get(String(cat.id)).add(otherId);
        neighbours.get(otherId).add(String(cat.id));
      }
    }
  }

  const visited = new Set();
  const groups = [];

  for (const cat of cats) {
    const startId = String(cat.id);

    if (visited.has(startId)) {
      continue;
    }

    const memberIds = [];
    const stack = [startId];
    visited.add(startId);

    while (stack.length > 0) {
      const id = stack.pop();
      memberIds.push(id);

      for (const next of neighbours.get(id)) {
        if (!visited.has(next)) {
          visited.add(next);
          stack.push(next);
        }
      }
    }

    const members = memberIds
      .map((id) => catsById.get(id))
      .sort((a, b) => a.name.localeCompare(b.name));

    groups.push({
      // Stable key regardless of traversal order.
      key: members.map((member) => member.id).join("-"),
      cats: members,
    });
  }

  return groups;
}
