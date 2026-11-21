// A person's name as it is written into an email: on one line and no longer
// than `max` characters. The public application forms accept names of up to
// 2000 characters, and the "received" email greets the applicant with the name
// they typed, so an unlimited name would let a stranger put a long text, with
// links, into an email that comes from IBKT.
export function emailName(value, max = 60) {
  const name = String(value ?? "").replace(/\s+/g, " ").trim();

  return name.length > max ? `${name.slice(0, max - 3)}...` : name;
}
