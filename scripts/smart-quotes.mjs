// Converts straight quotes to typographic curly quotes. Shared by the
// one-time normalize-quotes.mjs pass and import-manuscript.mjs (so every
// future import gets this automatically regardless of the source file's
// own quote style).

// Leading apostrophes that elide letters (e.g. 'til, 'tis, '80s) must come
// out as a closing curly quote (’), not an opening one (‘) — they aren't
// starting a quotation. Small curated list, same idea as SmartyPants'.
const LEADING_ELISIONS = new Set([
  "tis", "twas", "twill", "til", "tween", "cause", "em", "n",
  "bout", "round", "fore", "gainst", "cept", "spose", "kay", "sup",
  "fraid", "nother", "ere", "neath", "specially", "fessional", "ol",
]);

function isLeadingElision(rest) {
  const m = rest.match(/^([a-z]+)/i);
  if (m && LEADING_ELISIONS.has(m[1].toLowerCase())) return true;
  if (/^\d\d(0)?s\b/.test(rest)) return true; // '80s, '90s, '00s
  return false;
}

const OPENING_CONTEXT = /[\s([{\-—–"'‘“]/;

// Plain text only — no HTML awareness. Used on raw manuscript text before
// it's ever wrapped in markup.
export function smartenPlainText(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const prev = i > 0 ? text[i - 1] : "";
    const atOpeningContext = prev === "" || OPENING_CONTEXT.test(prev);
    if (ch === '"') {
      out += atOpeningContext ? "“" : "”";
    } else if (ch === "'") {
      if (atOpeningContext) {
        out += isLeadingElision(text.slice(i + 1)) ? "’" : "‘";
      } else {
        out += "’";
      }
    } else {
      out += ch;
    }
  }
  return out;
}

// HTML-aware wrapper — only smartens text between tags, never touches tag
// markup itself (e.g. a rich-text intro block's <span style="..."> — the
// attribute's own straight quotes must survive untouched or the markup
// breaks). Safe on plain `<div>text</div>` content too, which has no
// attributes to protect.
export function smartenHtml(html) {
  return html.replace(/(<[^>]*>)|([^<]+)/g, (_m, tag, text) =>
    tag ? tag : smartenPlainText(text)
  );
}
