// A referee is stored as one line, "Name, phone, email" (the Referee 1-3
// columns; the Adoption Form import writes them this way). These turn it
// into parts for the References tab and back.

const PHONE = /^\+?[\d\s().-]{5,}$/;

// "Ann Lee, 07700 900000, ann@example.com" -> { name, phone, email }. Parts
// are recognised by shape (an @ is the email, mostly digits the phone), so
// a referee typed by hand in another order still reads right.
export function parseReferee(text) {
  const parts = String(text ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const email = parts.find((part) => part.includes("@")) ?? "";
  const phone = parts.find((part) => part !== email && PHONE.test(part)) ?? "";
  const name = parts.filter((part) => part !== email && part !== phone).join(", ");

  return { name, phone, email };
}

export function refereeText({ name, phone, email }) {
  return [name, phone, email].map((part) => String(part ?? "").trim()).filter(Boolean).join(", ");
}
