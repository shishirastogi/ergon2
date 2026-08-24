/**
 * Sanitization helpers for anything embedded into generated PDFs.
 *
 * pdf-lib StandardFonts use WinAnsi encoding: characters outside it throw at
 * draw time. We strip control characters and transliterate common unicode
 * punctuation/dashes to safe ASCII equivalents, then drop anything remaining
 * outside Latin-1. This also neutralizes any injection-style content coming
 * from user-entered fields before it reaches the PDF renderer.
 */

// WinAnsi (cp1252) covers Latin-1 + a few extras; we keep it conservative (Latin-1 printable range).
const LATIN1_PRINTABLE = /^[\x20-\x7E\xA0-\xFF]*$/;

const TRANSLITERATIONS = {
  '\u2018': "'",
  '\u2019': "'",
  '\u201A': ',',
  '\u201C': '"',
  '\u201D': '"',
  '\u2013': '-',
  '\u2014': '-',
  '\u2026': '...',
  '\u20B9': 'Rs.', // Indian Rupee sign — Helvetica has no glyph
  '\u20AC': 'EUR', // Euro exists in cp1252 but not in Latin-1 subset we allow; map anyway
  '\u00A0': ' ',
};

export function sanitizePdfText(input, { maxLength = 400 } = {}) {
  let text = String(input ?? '');
  for (const [from, to] of Object.entries(TRANSLITERATIONS)) {
    text = text.split(from).join(to);
  }
  // Strip control characters (incl. newlines — callers render lines explicitly)
  // and any remaining non-printable code points.
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[\x00-\x1F\x7F]/g, '');
  if (!LATIN1_PRINTABLE.test(text)) {
    text = Array.from(text)
      .filter((ch) => LATIN1_PRINTABLE.test(ch))
      .join('');
  }
  return text.slice(0, maxLength);
}

/** Truncates and sanitizes multi-line notes blocks for PDF rendering. */
export function sanitizeMultiline(input, { maxLines = 6, maxLineLength = 110 } = {}) {
  const raw = String(input ?? '')
    .split(/\r?\n/)
    .map((line) => sanitizePdfText(line, { maxLength: maxLineLength }))
    .filter((line) => line.trim().length > 0);
  return raw.slice(0, maxLines);
}
