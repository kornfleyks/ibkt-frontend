// Whether the first bytes of an uploaded file are those of the kind its name
// claims. The upload routes allow files by extension and size only, so a
// program or a script renamed to .jpg or .pdf would be accepted and then opened
// by staff. This checks the file's own signature ("magic bytes"). An extension
// with no rule here is not checked; every extension the upload routes allow has
// a rule.

const text = (buffer, offset, value) => buffer.length >= offset + value.length && buffer.toString("latin1", offset, offset + value.length) === value;
const bytes = (buffer, values, offset = 0) => buffer.length >= offset + values.length && values.every((value, index) => buffer[offset + index] === value);
const isOle = (buffer) => bytes(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const isZip = (buffer) => text(buffer, 0, "PK\x03\x04") || text(buffer, 0, "PK\x05\x06");
const isJpeg = (buffer) => bytes(buffer, [0xff, 0xd8, 0xff]);
const isQuickTime = (buffer) => ["ftyp", "moov", "mdat", "free", "wide", "skip"].some((atom) => text(buffer, 4, atom));
const isPlainText = (buffer) => !buffer.subarray(0, 4096).includes(0);

const RULES = {
  jpg: isJpeg,
  jpeg: isJpeg,
  png: (buffer) => bytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  gif: (buffer) => text(buffer, 0, "GIF87a") || text(buffer, 0, "GIF89a"),
  webp: (buffer) => text(buffer, 0, "RIFF") && text(buffer, 8, "WEBP"),
  heic: (buffer) => text(buffer, 4, "ftyp"),
  mp4: isQuickTime,
  m4v: isQuickTime,
  mov: isQuickTime,
  webm: (buffer) => bytes(buffer, [0x1a, 0x45, 0xdf, 0xa3]),
  pdf: (buffer) => buffer.subarray(0, 1024).includes("%PDF-"),
  doc: isOle,
  xls: isOle,
  docx: isZip,
  xlsx: isZip,
  zip: isZip,
  rtf: (buffer) => text(buffer, 0, "{\\rtf"),
  avi: (buffer) => text(buffer, 0, "RIFF") && text(buffer, 8, "AVI "),
  flv: (buffer) => text(buffer, 0, "FLV"),
  mpg: (buffer) => bytes(buffer, [0x00, 0x00, 0x01, 0xba]) || bytes(buffer, [0x00, 0x00, 0x01, 0xb3]),
  mp3: (buffer) => text(buffer, 0, "ID3") || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0),
  wma: (buffer) => bytes(buffer, [0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11]),
  txt: isPlainText,
  csv: isPlainText,
};

export function contentMatchesExtension(buffer, extension) {
  const rule = RULES[String(extension ?? "").toLowerCase()];

  if (!rule) return true;

  return Buffer.isBuffer(buffer) && buffer.length > 0 && rule(buffer);
}

export function notThatKindOfFile(extension) {
  return `That file is not a real .${extension} file. Choose the original file.`;
}
