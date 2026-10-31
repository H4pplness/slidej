// ============================================================
// Font lookup + text measurement for the layout engine.
//
// Text is measured with the real font file (via fontkit) when it can be
// found on this machine, otherwise with a conservative estimate. Widths are
// inflated by WIDTH_SAFETY so PowerPoint's own line breaking never needs
// more lines than we reserved space for.
// ============================================================

const fs = require('fs');
const os = require('os');
const path = require('path');
const fontkit = require('fontkit');

const WIDTH_SAFETY = 1.03;
const FALLBACK_EM_WIDTH = 0.55;      // average glyph advance / font size
const FALLBACK_LINE_HEIGHT = 1.2;    // line height / font size
const FONT_EXT = /\.(ttf|otf|ttc)$/i;
const EPSILON = 0.002;               // inches; absorbs float32 rounding from Yoga

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

function fontDirs() {
  const home = os.homedir();
  const dirs = (process.env.SLIDEJ_FONT_DIRS || '').split(path.delimiter).filter(Boolean);
  if (process.platform === 'win32') {
    dirs.push(path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts'));
    if (process.env.LOCALAPPDATA) dirs.push(path.join(process.env.LOCALAPPDATA, 'Microsoft', 'Windows', 'Fonts'));
  } else if (process.platform === 'darwin') {
    dirs.push('/System/Library/Fonts', '/System/Library/Fonts/Supplemental', '/Library/Fonts', path.join(home, 'Library/Fonts'));
  } else {
    dirs.push('/usr/share/fonts', '/usr/local/share/fonts', path.join(home, '.fonts'), path.join(home, '.local/share/fonts'));
  }
  return dirs;
}

let fileIndex = null;
function listFontFiles() {
  if (fileIndex) return fileIndex;
  fileIndex = [];
  const walk = (dir, depth) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory() && depth < 4) walk(p, depth + 1);
      else if (FONT_EXT.test(e.name)) fileIndex.push(p);
    }
  };
  for (const d of fontDirs()) walk(d, 0);
  return fileIndex;
}

function openFaces(file) {
  try {
    const f = fontkit.openSync(file);
    return f.fonts ? f.fonts : [f];
  } catch { return []; }
}

function styleOf(face) {
  const sub = norm(face.subfamilyName);
  return { bold: /bold|black|heavy/.test(sub), italic: /italic|oblique/.test(sub) };
}

class FontBook {
  constructor(explicit = {}, baseDir = process.cwd()) {
    this.explicit = {};
    for (const [family, file] of Object.entries(explicit)) this.explicit[norm(family)] = path.resolve(baseDir, file);
    this.cache = new Map();
    this.missing = new Set();
  }

  // Returns a fontkit face or null.
  face(family, bold, italic) {
    const key = `${norm(family)}|${bold ? 1 : 0}|${italic ? 1 : 0}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const face = this.lookup(family, !!bold, !!italic);
    this.cache.set(key, face);
    if (!face) this.missing.add(family);
    return face;
  }

  lookup(family, bold, italic) {
    const fam = norm(family);
    let faces = [];
    if (this.explicit[fam]) faces = openFaces(this.explicit[fam]);
    if (!faces.length) {
      // Only open files whose name looks related to the family, e.g.
      // "Segoe UI" -> segoeui.ttf / segoeuib.ttf, "Times New Roman" -> times.ttf.
      const candidates = listFontFiles().filter(f => {
        const base = norm(path.basename(f).replace(FONT_EXT, ''));
        return base.length >= 4 && (base.startsWith(fam) || fam.startsWith(base.slice(0, Math.max(4, base.length - 2))));
      });
      for (const file of candidates) faces.push(...openFaces(file));
    }
    faces = faces.filter(f => norm(f.familyName) === fam || norm(f.fullName) === fam);
    if (!faces.length) return null;
    const exact = faces.find(f => { const s = styleOf(f); return s.bold === bold && s.italic === italic; });
    const sameWeight = faces.find(f => styleOf(f).bold === bold);
    const regular = faces.find(f => { const s = styleOf(f); return !s.bold && !s.italic; });
    return exact || sameWeight || regular || faces[0];
  }
}

// Width in inches of a string in a given run style.
function textWidth(book, str, run) {
  if (!str) return 0;
  const size = run.fontSize;
  const face = book.face(run.fontFamily, run.bold, run.italic);
  let em;
  if (face) em = face.layout(str).advanceWidth / face.unitsPerEm;
  else em = [...str].length * FALLBACK_EM_WIDTH * (run.bold ? 1.06 : 1);
  const spacing = (run.letterSpacing || 0) * [...str].length; // points
  return ((em * size + spacing) / 72) * WIDTH_SAFETY;
}

function lineHeightFactor(book, run) {
  const face = book.face(run.fontFamily, run.bold, run.italic);
  if (!face) return FALLBACK_LINE_HEIGHT;
  const h = (face.ascent - face.descent + (face.lineGap || 0)) / face.unitsPerEm;
  // Never reserve less than PowerPoint's usual 1.2 × font size per line.
  return h > 0.8 && h < 2.5 ? Math.max(h, FALLBACK_LINE_HEIGHT) : FALLBACK_LINE_HEIGHT;
}

/**
 * Break paragraphs into lines and measure them.
 * @param {FontBook} book
 * @param {Array<{runs: Array<{text, fontSize, fontFamily, bold, italic, letterSpacing}>, lineSpacing}>} paragraphs
 * @param {number} maxWidth inches (Infinity for unconstrained)
 * @returns {{width: number, height: number, lines: number}}
 */
function measureParagraphs(book, paragraphs, maxWidth) {
  let width = 0;
  let height = 0;
  let lines = 0;

  for (const para of paragraphs) {
    // Hard line breaks split a paragraph into independent line groups.
    const groups = [[]];
    for (const run of para.runs) {
      String(run.text == null ? '' : run.text).split('\n').forEach((piece, i) => {
        if (i > 0) groups.push([]);
        groups[groups.length - 1].push({ ...run, text: piece });
      });
    }

    for (const group of groups) {
      // Tokens: words with their trailing spaces, each carrying its run style.
      const tokens = [];
      for (const run of group) {
        for (const t of run.text.match(/\S+\s*|\s+/g) || []) tokens.push({ text: t, run });
      }
      const baseRun = group[0] || para.runs[0];
      let cursor = 0;       // x after the last token, trailing spaces included
      let visible = 0;      // x after the last visible glyph
      let lineRun = null;   // largest run on the line (sets the line height)
      const flush = () => {
        const run = lineRun || baseRun;
        width = Math.max(width, visible);
        height += (run.fontSize * lineHeightFactor(book, run) * (para.lineSpacing || 1)) / 72;
        lines += 1;
        cursor = 0;
        visible = 0;
        lineRun = null;
      };
      const place = (run, full, trimmed) => {
        visible = cursor + trimmed;
        cursor += full;
        if (!lineRun || run.fontSize > lineRun.fontSize) lineRun = run;
      };
      for (const tok of tokens) {
        const full = textWidth(book, tok.text, tok.run);
        const word = tok.text.trimEnd();
        const trimmed = textWidth(book, word, tok.run);
        if (cursor > 0 && cursor + trimmed > maxWidth + EPSILON) flush();
        if (cursor === 0 && trimmed > maxWidth + EPSILON) {
          // A single word wider than the box: break it by characters.
          let chunk = '';
          for (const ch of word) {
            if (chunk && textWidth(book, chunk + ch, tok.run) > maxWidth + EPSILON) {
              place(tok.run, textWidth(book, chunk, tok.run), textWidth(book, chunk, tok.run));
              flush();
              chunk = '';
            }
            chunk += ch;
          }
          const w = textWidth(book, chunk, tok.run);
          place(tok.run, w + (full - trimmed), w);
        } else {
          place(tok.run, full, trimmed);
        }
      }
      flush();
    }
  }
  return { width, height, lines };
}

module.exports = { FontBook, measureParagraphs, textWidth };
