/**
 * Generates per-surah morphology data from the NoorBayan/Quranic dataset (MASAQ).
 * https://github.com/NoorBayan/Quranic — MIT License
 *
 * This uses expert-verified linguistic annotations:
 *   - 72 syntactic role tags (فاعل، مفعول به، مبتدأ، خبر، حال، تمييز…)
 *   - Real dependency relations (each word linked to its head)
 *   - Linguist-verified verb forms (وزن)
 *   - إعراب sentences built from verified syntactic data
 *
 * Input:
 *   scripts/source-data/noorbayan/Quranic.csv  (139K tokens, UTF-16LE TSV)
 *   scripts/source-data/noorbayan/pos.csv
 *   scripts/source-data/noorbayan/RelLabels.csv
 *
 * Output:
 *   assets/data/morphology/{1-114}.json
 */

const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'assets', 'data');
const SRC = path.join(__dirname, 'source-data', 'noorbayan');

// ---------------------------------------------------------------------------
// 1. Helpers
// ---------------------------------------------------------------------------

function readTSV(filePath) {
  const raw = fs.readFileSync(filePath);
  // Support both UTF-16LE (original NoorBayan) and UTF-8 (converted) encodings
  const isUTF16 = raw.length >= 2 && raw[0] === 0xFF && raw[1] === 0xFE;
  const text = (isUTF16 ? raw.toString('utf16le') : raw.toString('utf8')).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n').filter(l => l.trim());
  const headers = lines[0].split('\t').map(h => h.trim());
  return lines.slice(1).map(line => {
    const vals = line.split('\t');
    const row = {};
    for (let i = 0; i < headers.length; i++) {
      row[headers[i]] = (vals[i] || '').trim();
    }
    return row;
  });
}

// ---------------------------------------------------------------------------
// 2. Load reference tables
// ---------------------------------------------------------------------------

console.log('Loading reference tables...');

// POS tags: pos code → { ar, en }
const posRows = readTSV(path.join(SRC, 'pos.csv'));
const POS_MAP = {};
for (const r of posRows) {
  if (r.pos && r.pos !== '_') {
    POS_MAP[r.pos] = { ar: r.pos_ar, en: r.pos_en };
  }
}

// Relation labels: rel_en → { ar, nho }
const relRows = readTSV(path.join(SRC, 'RelLabels.csv'));
const REL_MAP = {};   // rel_en → { ar, nho }
const REL_AR = {};     // rel_ar → nho
for (const r of relRows) {
  if (r.rel_en && r.rel_en !== '_') {
    REL_MAP[r.rel_en] = { ar: r.rel_ar, nho: r.rel_nho };
    REL_AR[r.rel_ar] = r.rel_nho;
  }
}

// Verb form → وزن pattern (from iirab.py)
const VERB_FORM = {
  '(I)':   'فَعَلَ',
  '(II)':  'فَعَّلَ',
  '(III)': 'فَاعَلَ',
  '(IV)':  'أَفْعَلَ',
  '(V)':   'تَفَعَّلَ',
  '(VI)':  'تَفَاعَلَ',
  '(VII)': 'إِنْفَعَلَ',
  '(VIII)':'إِفْتَعَلَ',
  '(IX)':  'إِفْعَلَّ',
  '(X)':   'إِسْتَفْعَلَ',
  '(XI)':  'فَعْلَلَ',
  '(XII)': 'تَفَعْلَلَ',
};

// Prefix labels (from iirab.py)
const PREFIX_LABELS = {
  'A:EQ+':   'همزة تسوية',
  'A:INTG+': 'همزة استفهام',
  'Al+':     'ال التعريف',
  'bi+':     'باء الجر',
  'f:CAUS+': 'فاء السببية',
  'f:CONJ+': 'فاء العطف',
  'f:REM+':  'فاء الاستئناف',
  'f:RSLT+': 'فاء الشرط',
  'f:SUP+':  'فاء الزائدة',
  'ha+':     'هاء النداء',
  'ka+':     'كاف الجر',
  'l:EMPH+': 'لام التوكيد',
  'l:IMPV+': 'لام الأمر',
  'l:P+':    'لام الجر',
  'l:PRP+':  'لام التعليل',
  'sa+':     'سين المستقبل',
  'ta+':     'تاء النداء',
  'w:CIRC+': 'واو الظرفية',
  'w:COM+':  'واو المعية',
  'w:CONJ+': 'واو العطف',
  'w:P+':    'واو الجر',
  'w:REM+':  'واو الاستئناف',
  'w:SUP+':  'واو الزائدة',
  'ya+':     'ياء النداء',
};

// Suffix labels
const SUFFIX_LABELS = {
  'VOC:m':  'ميم النداء',
  'EMPH:n': 'نون التوكيد',
  'PRON':   'ضمير متصل',
  'l:P+':   'لام الجر',
};

// Case/mood/etc lookups
const CASE_AR = { NOM: 'مرفوع', ACC: 'منصوب', GEN: 'مجرور' };
const MOOD_AR = { 'MOOD:IND': 'مرفوع', 'MOOD:SUBJ': 'منصوب', 'MOOD:JUS': 'مجزوم' };
const VOICE_AR = { ACT: 'مبني للمعلوم', PASS: 'مبني للمجهول' };
const GENDER_AR = { M: 'المذكر', F: 'المؤنث' };
const NUMBER_AR = { S: 'مفرد', D: 'مثنى', P: 'جمع' };
const TENSE_AR = { PERF: 'فعل ماضي', IMPF: 'فعل مضارع', IMPV: 'فعل أمر' };
const DERIVED_AR = { ACT_PCPL: 'اسم فاعل', PASS_PCPL: 'اسم مفعول', VN: 'مصدر' };
const STATE_AR = { DEF: 'معرفة', INDEF: 'نكرة' };

// English labels
const CASE_EN = { NOM: 'Nominative', ACC: 'Accusative', GEN: 'Genitive' };
const TENSE_EN = { PERF: 'Perfect', IMPF: 'Imperfect', IMPV: 'Imperative' };
const DERIV_EN = { ACT_PCPL: 'Active participle', PASS_PCPL: 'Passive participle', VN: 'Verbal noun' };

// Syntactic role English readable names
const ROLE_EN = {
  gen: 'Genitive', Pred: 'Predicate', Adj: 'Adjective', cog: 'Cognate accusative',
  cert: 'Certainty', Pass: 'Passive subject', state: 'State', ans: 'Answer',
  neg: 'Negation', intg: 'Interrogative', sub: 'Relative clause', voc: 'Vocative',
  circ: 'Circumstantial', prp: 'Purpose', exp: 'Exceptive', sup: 'Supplementary',
  caus: 'Causative', conj: 'Conjunction', Spec: 'Specification', fut: 'Future',
  res: 'Restriction', amd: 'Amendment', link: 'Linked', impv: 'Imperative',
  exl: 'Explanation', Poss: 'Possessive', emph: 'Emphasis', ret: 'Retraction',
  Cpnd: 'Compound', eq: 'Equalization', prev: 'Preventive', sur: 'Surprise',
  Subj: 'Subject', avr: 'Aversion', rslt: 'Result', imrs: 'Imperative result',
  int: 'Interpretation', Pro: 'Prohibition', exh: 'Exhortation', inc: 'Inceptive',
  Obj: 'Object', cond: 'Conditional', App: 'Apposition',
};

// ---------------------------------------------------------------------------
// 3. Parse Quranic.csv
// ---------------------------------------------------------------------------

console.log('Loading Quranic.csv...');
const allTokens = readTSV(path.join(SRC, 'Quranic.csv'));
console.log(`  ${allTokens.length} tokens loaded`);

// Filter out elided/implied tokens (location === '_' or word_id === '0')
const tokens = allTokens.filter(t => t.location && t.location !== '_' && t.word_id !== '0');
console.log(`  ${tokens.length} real tokens (after filtering elided)`);

// ---------------------------------------------------------------------------
// 4. Group tokens by surah:verse:word
// ---------------------------------------------------------------------------

console.log('Grouping tokens into words...');

// Key: "surah:verse:word" → array of token rows
const wordGroups = new Map();

for (const t of tokens) {
  const s = parseInt(t.chapter_id, 10);
  const v = parseInt(t.verse_id, 10);
  const w = parseInt(t.word_id, 10);
  if (isNaN(s) || isNaN(v) || isNaN(w) || w === 0) continue;

  const key = `${s}:${v}:${w}`;
  if (!wordGroups.has(key)) wordGroups.set(key, []);
  wordGroups.get(key).push(t);
}

console.log(`  ${wordGroups.size} words grouped`);

// ---------------------------------------------------------------------------
// 5. Build segment label for a token
// ---------------------------------------------------------------------------

function getSegLabel(token) {
  const pos = token.pos;
  const posInfo = POS_MAP[pos];
  const segment = token.segment;

  if (segment === 'PREFIX') {
    // Use prefix label if available
    const prefixType = token.prefix;
    if (prefixType && prefixType !== '_' && PREFIX_LABELS[prefixType]) {
      return { ar: PREFIX_LABELS[prefixType], en: posInfo ? posInfo.en : pos };
    }
    if (posInfo) return { ar: posInfo.ar, en: posInfo.en };
    return { ar: pos, en: pos };
  }

  if (segment === 'SUFFIX') {
    const suffixType = token.suffix;
    if (suffixType && suffixType !== '_' && SUFFIX_LABELS[suffixType]) {
      return { ar: SUFFIX_LABELS[suffixType], en: posInfo ? posInfo.en : pos };
    }
    if (posInfo) return { ar: posInfo.ar, en: posInfo.en };
    return { ar: pos, en: pos };
  }

  // STEM
  if (!posInfo) return { ar: pos, en: pos };

  let ar = posInfo.ar;
  let en = posInfo.en;

  // Add case for nouns in stem label
  const nomCase = token.nominal_case;
  if (nomCase && nomCase !== '_' && CASE_AR[nomCase]) {
    ar += ' ' + CASE_AR[nomCase];
    en += ` (${CASE_EN[nomCase].toLowerCase().slice(0, 3)}.)`;
  }

  return { ar, en };
}

// ---------------------------------------------------------------------------
// 6. Generate real إعراب sentence from MASAQ data
// ---------------------------------------------------------------------------

function generateIrab(stemToken, allTokensInWord) {
  const parts = [];
  const pos = stemToken.pos;
  const posInfo = POS_MAP[pos] || { ar: pos, en: pos };

  // Layer A: Morphological description
  // POS
  parts.push(posInfo.ar);

  // Prefix type
  for (const t of allTokensInWord) {
    if (t.segment === 'PREFIX' && t.prefix && t.prefix !== '_') {
      const label = PREFIX_LABELS[t.prefix];
      if (label) parts.push('«' + label + '»');
    }
  }

  // Suffix type
  for (const t of allTokensInWord) {
    if (t.segment === 'SUFFIX' && t.suffix && t.suffix !== '_') {
      const label = SUFFIX_LABELS[t.suffix];
      if (label) parts.push('«' + label + '»');
    }
  }

  // Verb aspect
  const aspect = stemToken.verb_aspect;
  if (aspect && aspect !== '_' && TENSE_AR[aspect]) {
    parts[0] = TENSE_AR[aspect]; // Replace bare POS with "فعل ماضي" etc.
  }

  // Derived noun type
  const derived = stemToken.derived_nouns;
  if (derived && derived !== '_' && DERIVED_AR[derived]) {
    parts.push('«' + DERIVED_AR[derived] + '»');
  }

  // Gender + Number
  const genderNum = [];
  const num = stemToken.number;
  const gen = stemToken.gender;
  if (num && num !== '_' && gen && gen !== '_') {
    genderNum.push('لل' + NUMBER_AR[num] + ' ' + GENDER_AR[gen]);
  } else if (num && num !== '_' && NUMBER_AR[num]) {
    genderNum.push('لل' + NUMBER_AR[num]);
  } else if (gen && gen !== '_' && GENDER_AR[gen]) {
    genderNum.push(GENDER_AR[gen]);
  }
  if (genderNum.length > 0) parts.push(genderNum.join(' '));

  // Verb form / وزن
  const vf = stemToken.verb_form;
  if (vf && vf !== '_' && VERB_FORM[vf]) {
    parts.push('النمط له «' + VERB_FORM[vf] + '»');
  }

  // Voice
  const voice = stemToken.verb_voice;
  if (voice && voice !== '_' && VOICE_AR[voice]) {
    parts.push(VOICE_AR[voice]);
  }

  // Case
  const nomCase = stemToken.nominal_case;
  if (nomCase && nomCase !== '_' && CASE_AR[nomCase]) {
    parts.push(CASE_AR[nomCase]);
  }

  // Mood
  const mood = stemToken.verb_mood;
  if (mood && mood !== '_' && MOOD_AR[mood]) {
    parts.push(MOOD_AR[mood]);
  }

  // Layer B: Syntactic relation (from real dependency data)
  const relAr = stemToken.rel_label_ar;
  const relEn = stemToken.rel_label;
  const headWord = stemToken.re_uthmani;
  const headPos = stemToken.rpos;

  if (relAr && relAr !== '_' && relAr !== 'root' && relAr !== 'NonRel') {
    const nho = REL_AR[relAr]; // e.g., "مجرور ب", "فاعل لل", "مضاف الى ال"

    if (nho) {
      let syntaxPart = '. وهو ' + nho;

      // Add head word POS
      if (headPos && headPos !== '_') {
        const hposParts = headPos.split(' ');
        if (hposParts.length === 2) {
          syntaxPart += hposParts[0] + ' ال' + hposParts[1];
        } else {
          syntaxPart += headPos;
        }
      }

      // Add head word text
      if (headWord && headWord !== '_') {
        if (headWord.startsWith('(')) {
          // Elided element
          syntaxPart += ' المحذوف';
        } else {
          syntaxPart += ' ﴿' + headWord + '﴾';
        }
      }

      parts.push(syntaxPart);
    }
  } else if (relAr === 'root') {
    // Check if this is a مبتدأ (has a predicate pointing to it)
    // We handle this at word level — just note it's the root of the sentence
  }

  return parts.length > 0 ? parts.join(' ') : undefined;
}

// ---------------------------------------------------------------------------
// 7. Build WordMorphology for each word
// ---------------------------------------------------------------------------

function buildWordMorphology(tokenGroup) {
  // Find the STEM token (carries main morphological info)
  const stemToken = tokenGroup.find(t => t.segment === 'STEM') || tokenGroup[0];
  const pos = stemToken.pos;
  const posInfo = POS_MAP[pos] || { ar: pos, en: pos };

  // Build segments array
  const seg = tokenGroup.map(t => {
    const label = getSegLabel(t);
    let type;
    if (t.segment === 'PREFIX') type = 'prefix';
    else if (t.segment === 'SUFFIX') type = 'suffix';
    else type = 'stem';
    return { ar: t.uthmani_token, posAr: label.ar, posEn: label.en, type };
  });

  const result = {
    seg,
    pos: posInfo.en,
    posAr: posInfo.ar,
  };

  // Verb form / وزن
  if (stemToken.verb_form && stemToken.verb_form !== '_') {
    const pattern = VERB_FORM[stemToken.verb_form];
    if (pattern) result.pattern = pattern;
  }

  // Derivation
  if (stemToken.derived_nouns && stemToken.derived_nouns !== '_') {
    result.derivation = DERIV_EN[stemToken.derived_nouns] || stemToken.derived_nouns;
  }

  // Gender
  if (stemToken.gender && stemToken.gender !== '_') {
    result.gender = stemToken.gender.toLowerCase(); // M→m, F→f
  }

  // Number
  if (stemToken.number && stemToken.number !== '_') {
    result.number = stemToken.number.toLowerCase(); // S→s, D→d, P→p
  }

  // Person
  if (stemToken.person && stemToken.person !== '_') {
    result.person = stemToken.person;
  }

  // Case
  if (stemToken.nominal_case && stemToken.nominal_case !== '_') {
    const c = stemToken.nominal_case;
    result.case = c === 'NOM' ? 'nom' : c === 'ACC' ? 'acc' : 'gen';
    result.caseAr = CASE_AR[c];
  }

  // Mood
  if (stemToken.verb_mood && stemToken.verb_mood !== '_') {
    const m = stemToken.verb_mood;
    result.mood = m === 'MOOD:IND' ? 'ind' : m === 'MOOD:SUBJ' ? 'sub' : 'jus';
  }

  // Voice
  if (stemToken.verb_voice && stemToken.verb_voice !== '_') {
    result.voice = stemToken.verb_voice === 'ACT' ? 'act' : 'pass';
  } else if (pos === 'V') {
    result.voice = 'act';
  }

  // State
  if (stemToken.nominal_state && stemToken.nominal_state !== '_') {
    result.state = stemToken.nominal_state === 'DEF' ? 'def' : 'indef';
  } else if (tokenGroup.some(t => t.segment === 'PREFIX' && t.pos === 'DET')) {
    result.state = 'def';
  }

  // Tense
  if (stemToken.verb_aspect && stemToken.verb_aspect !== '_') {
    result.tense = TENSE_EN[stemToken.verb_aspect];
  }

  // Syntactic role (REAL from MASAQ dependency annotations)
  const relAr = stemToken.rel_label_ar;
  const relEn = stemToken.rel_label;
  if (relAr && relAr !== '_' && relAr !== 'NonRel') {
    if (relAr === 'root') {
      // Root of sentence — could be فعل or مبتدأ
      if (pos === 'V') {
        result.syntacticRole = 'فعل الجملة';
        result.syntacticRoleEn = 'Sentence verb';
      }
      // For nouns as root, check context later (مبتدأ handling below)
    } else {
      result.syntacticRole = relAr;
      result.syntacticRoleEn = ROLE_EN[relEn] || relEn;

      // For كان و أخواتها / إن و أخواتها, use the full role label
      if (relEn && relEn.includes('<<')) {
        const relInfo = REL_MAP[relEn];
        if (relInfo) {
          result.syntacticRole = relInfo.ar;
          result.syntacticRoleEn = relInfo.ar; // Keep Arabic for these specific terms
        }
      }
    }
  }

  // Generate إعراب sentence from real data
  result.irab = generateIrab(stemToken, tokenGroup);

  return result;
}

// ---------------------------------------------------------------------------
// 8. Identify مبتدأ (root nouns with predicate dependents)
// ---------------------------------------------------------------------------

// Build a token_id → row index map for checking predicates
const tokenIdMap = new Map();
for (let i = 0; i < allTokens.length; i++) {
  const t = allTokens[i];
  if (t.token_id) tokenIdMap.set(t.token_id, i);
}

// Find root nouns that have a خبر dependent → they are مبتدأ
const rootTokenIds = new Set();
for (const t of allTokens) {
  if (t.rel_label_ar === 'root' && t.pos !== 'V' && t.location !== '_') {
    rootTokenIds.add(t.token_id);
  }
}

// Check which root tokens have خبر dependents
const mobtadaTokens = new Set();
for (const t of allTokens) {
  if (t.rel_label_ar === 'خبر' && rootTokenIds.has(t.ref_token_id)) {
    mobtadaTokens.add(t.ref_token_id);
  }
}

// Also track whether the خبر is elided (location === '_')
const mobtadaWithElidedPred = new Set();
for (const t of allTokens) {
  if (t.rel_label_ar === 'خبر' && rootTokenIds.has(t.ref_token_id) && t.location === '_') {
    mobtadaWithElidedPred.add(t.ref_token_id);
  }
}

// ---------------------------------------------------------------------------
// 9. Generate per-surah files
// ---------------------------------------------------------------------------

console.log('Generating per-surah morphology files...');

const MORPH_DIR = path.join(DATA, 'morphology');
if (!fs.existsSync(MORPH_DIR)) fs.mkdirSync(MORPH_DIR, { recursive: true });

const TYPE_MAP = { prefix: 0, stem: 1, suffix: 2 };

function minify(morph) {
  const m = {};
  if (morph.seg) {
    m.s = morph.seg.map(s => [s.ar, s.posAr, s.posEn, TYPE_MAP[s.type]]);
  }
  if (morph.pos) m.p = morph.pos;
  if (morph.posAr) m.pa = morph.posAr;
  if (morph.pattern) m.pt = morph.pattern;
  if (morph.gender) m.g = morph.gender;
  if (morph.number) m.n = morph.number;
  if (morph.person) m.pe = morph.person;
  if (morph.case) m.c = morph.case;
  if (morph.caseAr) m.ca = morph.caseAr;
  if (morph.mood) m.mo = morph.mood;
  if (morph.voice) m.vo = morph.voice;
  if (morph.state) m.st = morph.state;
  if (morph.derivation) m.d = morph.derivation;
  if (morph.tense) m.te = morph.tense;
  if (morph.irab) m.i = morph.irab;
  if (morph.syntacticRole) m.sr = morph.syntacticRole;
  if (morph.syntacticRoleEn) m.sre = morph.syntacticRoleEn;
  return m;
}

// Group words by surah
const surahMap = new Map(); // surah → { "ayah:word": WordMorphology }

for (const [key, tokenGroup] of wordGroups) {
  const [surah, ayah, word] = key.split(':').map(Number);
  if (!surahMap.has(surah)) surahMap.set(surah, {});

  const morph = buildWordMorphology(tokenGroup);

  // Handle مبتدأ: root nouns with خبر dependents
  const stemToken = tokenGroup.find(t => t.segment === 'STEM') || tokenGroup[0];
  if (stemToken.rel_label_ar === 'root' && stemToken.pos !== 'V') {
    if (mobtadaTokens.has(stemToken.token_id)) {
      morph.syntacticRole = 'مبتدأ';
      morph.syntacticRoleEn = 'Subject (topic)';
      if (mobtadaWithElidedPred.has(stemToken.token_id)) {
        morph.irab = (morph.irab || '') + '. وهو مبتدأ للجملة الاسمية وخبره محذوف';
      } else {
        morph.irab = (morph.irab || '') + '. وهو مبتدأ للجملة الاسمية';
      }
    }
  }

  surahMap.get(surah)[`${ayah}:${word}`] = morph;
}

let totalSize = 0;
let surahCount = 0;

for (let s = 1; s <= 114; s++) {
  const raw = surahMap.get(s) || {};
  const data = {};
  for (const [key, val] of Object.entries(raw)) {
    data[key] = minify(val);
  }
  const filePath = path.join(MORPH_DIR, `${s}.json`);
  const json = JSON.stringify(data);
  fs.writeFileSync(filePath, json);
  const size = Buffer.byteLength(json);
  totalSize += size;
  surahCount++;
}

console.log(`  ${surahCount} surah files written`);
console.log(`  Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Words covered: ${wordGroups.size}`);
console.log('Done!');
