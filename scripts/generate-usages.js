/**
 * Pre-computes derived form data for root/lemma usages.
 *
 * Outputs:
 *   assets/data/root-forms.json   — { [rootId]: [[arabic, m, mi, mu, count], ...] }
 *   assets/data/lemma-forms.json  — { [lemmaId]: [[arabic, m, mi, mu, count], ...] }
 *   assets/data/exact-counts.json — { [arabicText]: count }
 */

const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'assets', 'data');
const PAGES_DIR = path.join(DATA, 'pages');

// ---------------------------------------------------------------------------
// 1. Load all pages and build word lookup: "s:v:w" → Word
// ---------------------------------------------------------------------------

console.log('Loading all 604 pages...');
const wordMap = new Map(); // "s:v:w" → Word
const exactCounts = new Map(); // arabicText → count

for (let p = 1; p <= 604; p++) {
  const page = JSON.parse(fs.readFileSync(path.join(PAGES_DIR, `${p}.json`), 'utf8'));
  for (const line of page.lines) {
    if (line.type !== 'ayah') continue;
    for (const w of line.words) {
      // Skip verse markers (no root, no lemma, empty transliteration)
      if (w.ri == null && w.li == null && w.t === '') continue;
      const key = `${w.s}:${w.v}:${w.w}`;
      wordMap.set(key, w);
      exactCounts.set(w.a, (exactCounts.get(w.a) || 0) + 1);
    }
  }
}
console.log(`  ${wordMap.size} words indexed, ${exactCounts.size} unique forms`);

// ---------------------------------------------------------------------------
// 2. Helper: group word locations by arabic text, collect unique meanings
// ---------------------------------------------------------------------------

function groupForms(wordLocations) {
  // arabicText → { count, meanings: { en: Set, id: Set, ur: Set } }
  const groups = new Map();

  for (const loc of wordLocations) {
    const w = wordMap.get(loc);
    if (!w) continue;

    let g = groups.get(w.a);
    if (!g) {
      g = { count: 0, en: new Set(), id: new Set(), ur: new Set() };
      groups.set(w.a, g);
    }
    g.count++;
    if (w.m) g.en.add(w.m);
    if (w.mi) g.id.add(w.mi);
    if (w.mu) g.ur.add(w.mu);
  }

  // Convert to sorted array of tuples: [arabic, m, mi, mu, count]
  return Array.from(groups.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .map(([arabic, g]) => [
      arabic,
      Array.from(g.en).slice(0, 5).join(', '),
      Array.from(g.id).slice(0, 5).join(', '),
      Array.from(g.ur).slice(0, 5).join(', '),
      g.count,
    ]);
}

// ---------------------------------------------------------------------------
// 3. Process roots
// ---------------------------------------------------------------------------

console.log('Processing roots...');
const roots = JSON.parse(fs.readFileSync(path.join(DATA, 'roots.json'), 'utf8'));
const rootForms = {};

for (const root of roots) {
  const forms = groupForms(root.words);
  if (forms.length > 0) {
    rootForms[root.id] = forms;
  }
}
console.log(`  ${Object.keys(rootForms).length} roots with forms`);

// ---------------------------------------------------------------------------
// 4. Process lemmas
// ---------------------------------------------------------------------------

console.log('Processing lemmas...');
const lemmas = JSON.parse(fs.readFileSync(path.join(DATA, 'lemmas.json'), 'utf8'));
const lemmaForms = {};

for (const lemma of lemmas) {
  const forms = groupForms(lemma.words);
  if (forms.length > 0) {
    lemmaForms[lemma.id] = forms;
  }
}
console.log(`  ${Object.keys(lemmaForms).length} lemmas with forms`);

// ---------------------------------------------------------------------------
// 5. Write output files
// ---------------------------------------------------------------------------

const writeJSON = (name, data) => {
  const filePath = path.join(DATA, name);
  fs.writeFileSync(filePath, JSON.stringify(data));
  const size = (fs.statSync(filePath).size / 1024).toFixed(0);
  console.log(`  ${name}: ${size} KB`);
};

console.log('Writing output files...');
writeJSON('root-forms.json', rootForms);
writeJSON('lemma-forms.json', lemmaForms);
writeJSON('exact-counts.json', Object.fromEntries(exactCounts));

console.log('Done!');
