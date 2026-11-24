// The key a limit is counted on for a client address (req.ip).
//
// An IPv4 address is its own key (an IPv4-mapped IPv6 address, ::ffff:1.2.3.4,
// is that IPv4 address). An IPv6 address is reduced to its first 64 bits: a
// home or mobile connection is given a whole /64, so counting each full address
// would let one client change address on every request and never be limited.

export function clientKey(ip) {
  const address = String(ip ?? "").trim().toLowerCase().replace(/%.*$/, "");

  if (!address) return "unknown";

  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);

  if (mapped) return mapped[1];
  if (!address.includes(":")) return address;

  const [head, tail] = address.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail ? tail.split(":") : [];
  const gap = tail === undefined ? [] : Array(Math.max(0, 8 - headGroups.length - tailGroups.length)).fill("0");
  const groups = [...headGroups, ...gap, ...tailGroups].slice(0, 4);

  return `${groups.map((group) => group.replace(/^0+(?=.)/, "")).join(":")}::/64`;
}
