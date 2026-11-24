// Checks an uploaded file by what is inside it, not by its name. The upload
// routes allow a file by extension and size, so a program or a script renamed
// .jpg or .pdf would be accepted and then opened by staff.
//
// uploadProblem(buffer, extension) answers null when the file may be kept, or a
// message to show the uploader. What it checks, by kind:
//   - the first bytes ("magic bytes") are those of the kind the name claims;
//   - Word, Excel and zip-based Office files (.docx, .xlsx) must be real Office
//     files and must not carry macros (a VBA project inside); the same for the
//     older .doc and .xls;
//   - a PDF starts with its header; a HEIC image has a HEIC brand;
//   - a .txt or .csv is text without HTML, script or PHP markers.
// It is a mitigation, not a virus scan: a file that looks right and carries
// something harmful in its content is not found. An extension with no rule is
// not checked; every extension the upload routes allow has one.

const text = (buffer, offset, value) => buffer.length >= offset + value.length && buffer.toString("latin1", offset, offset + value.length) === value;
const bytes = (buffer, values, offset = 0) => buffer.length >= offset + values.length && values.every((value, index) => buffer[offset + index] === value);
const isOle = (buffer) => bytes(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const isZip = (buffer) => text(buffer, 0, "PK\x03\x04") || text(buffer, 0, "PK\x05\x06");
const isJpeg = (buffer) => bytes(buffer, [0xff, 0xd8, 0xff]);
const isQuickTime = (buffer) => ["ftyp", "moov", "mdat", "free", "wide", "skip"].some((atom) => text(buffer, 4, atom));
const HEIC_BRANDS = ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"];
const MARKUP = /<\s*(script|html|iframe|svg|object|embed)\b|<!doctype\s+html|<\?php/i;

const hasMacros = {
  // File names inside a zip are stored uncompressed, so the VBA project is visible.
  zip: (buffer) => buffer.includes("vbaProject"),
  // Names inside an OLE file are UTF-16; every VBA project has a _VBA_PROJECT stream.
  ole: (buffer) => buffer.includes(Buffer.from("_VBA_PROJECT", "utf16le")),
};

function plainText(buffer) {
  const start = buffer.subarray(0, 4096);

  return !start.includes(0) && !MARKUP.test(start.toString("latin1"));
}

const isOoxml = (buffer) => isZip(buffer) && buffer.includes("[Content_Types].xml");

// A kind's rule answers true (fine), false (not that kind of file) or the string
// "macros" (a real Office file that carries macros).
const RULES = {
  jpg: isJpeg,
  jpeg: isJpeg,
  png: (buffer) => bytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  gif: (buffer) => text(buffer, 0, "GIF87a") || text(buffer, 0, "GIF89a"),
  webp: (buffer) => text(buffer, 0, "RIFF") && text(buffer, 8, "WEBP"),
  heic: (buffer) => text(buffer, 4, "ftyp") && HEIC_BRANDS.includes(buffer.toString("latin1", 8, 12)),
  mp4: isQuickTime,
  m4v: isQuickTime,
  mov: isQuickTime,
  webm: (buffer) => bytes(buffer, [0x1a, 0x45, 0xdf, 0xa3]),
  pdf: (buffer) => buffer.subarray(0, 16).includes("%PDF-"),
  doc: (buffer) => (!isOle(buffer) ? false : hasMacros.ole(buffer) ? "macros" : true),
  xls: (buffer) => (!isOle(buffer) ? false : hasMacros.ole(buffer) ? "macros" : true),
  docx: (buffer) => (!isOoxml(buffer) ? false : hasMacros.zip(buffer) ? "macros" : true),
  xlsx: (buffer) => (!isOoxml(buffer) ? false : hasMacros.zip(buffer) ? "macros" : true),
  zip: isZip,
  rtf: (buffer) => text(buffer, 0, "{\\rtf"),
  avi: (buffer) => text(buffer, 0, "RIFF") && text(buffer, 8, "AVI "),
  flv: (buffer) => text(buffer, 0, "FLV"),
  mpg: (buffer) => bytes(buffer, [0x00, 0x00, 0x01, 0xba]) || bytes(buffer, [0x00, 0x00, 0x01, 0xb3]),
  mp3: (buffer) => text(buffer, 0, "ID3") || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0),
  wma: (buffer) => bytes(buffer, [0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11]),
  txt: plainText,
  csv: plainText,
};

export function uploadProblem(buffer, extension) {
  const kind = String(extension ?? "").toLowerCase();
  const rule = RULES[kind];

  if (!rule) return null;
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return `That file is empty. Choose the original .${kind} file.`;

  const result = rule(buffer);

  if (result === "macros") return `Files with macros are not accepted. Save the .${kind} file without macros and try again.`;

  return result ? null : `That file is not a real .${kind} file. Choose the original file.`;
}
