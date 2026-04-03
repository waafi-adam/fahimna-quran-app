/**
 * Generates per-surah morphology data from the Quranic Arabic Corpus
 * (mustafa0x/quran-morphology) for grammar analysis features.
 *
 * Input:
 *   scripts/source-data/quran-morphology.txt
 *   scripts/source-data/morphology-terms-ar.json
 *
 * Output:
 *   assets/data/morphology/{1-114}.json
 *
 * Each file is a SurahMorphology object keyed by "ayah:word" with:
 *   - seg: word segments (prefix/stem/suffix with Arabic + English labels)
 *   - pos/posAr: part of speech
 *   - pattern, gender, number, person, case, caseAr, mood, voice, state, derivation
 *   - irab: auto-generated إعراب sentence
 *   - syntacticRole/syntacticRoleEn: syntactic function
 */

const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'assets', 'data');
const SRC = path.join(__dirname, 'source-data');

// ---------------------------------------------------------------------------
// 1. Load Arabic term mappings
// ---------------------------------------------------------------------------

const terms = JSON.parse(fs.readFileSync(path.join(SRC, 'morphology-terms-ar.json'), 'utf8'));

// POS English labels
const POS_EN = {
  N: 'Noun', PN: 'Proper noun', PRON: 'Pronoun',
  DEM: 'Demonstrative', REL: 'Relative pronoun',
  T: 'Time adverb', LOC: 'Location adverb',
  V: 'Verb', NV: 'Verbal noun (action)',
  COND: 'Conditional', INTG: 'Interrogative',
};

const PARTICLE_EN = {
  P: 'Preposition', EMPH: 'Emphatic', IMPV: 'Imperative lam',
  PRP: 'Purpose', CONJ: 'Conjunction', SUB: 'Subordinating',
  ACC: 'Accusative particle', AMD: 'Adversative', ANS: 'Answer particle',
  AVR: 'Aversion', CAUS: 'Causative', CERT: 'Certainty',
  CIRC: 'Circumstantial', COM: 'Comitative', EQ: 'Equalization',
  EXH: 'Exhortative', EXL: 'Explanation', EXP: 'Exceptive',
  FUT: 'Future', INC: 'Inceptive', INT: 'Interpretive',
  NEG: 'Negative', PREV: 'Preventive', PRO: 'Prohibition',
  REM: 'Resumptive', RES: 'Restrictive', RET: 'Retraction',
  RSLT: 'Result', SUP: 'Supplementary', SUR: 'Surprise',
  VOC: 'Vocative', ATT: 'Attention', DIST: 'Distance',
  ADDR: 'Addressee', INL: 'Disconnected letters', DET: 'Definite article',
};

const CASE_EN = { NOM: 'Nominative', ACC: 'Accusative', GEN: 'Genitive' };
const CASE_AR = { NOM: 'مرفوع', ACC: 'منصوب', GEN: 'مجرور' };
const MOOD_EN = { IND: 'Indicative', SUBJ: 'Subjunctive', JUS: 'Jussive' };
const MOOD_AR = { IND: 'مرفوع', SUBJ: 'منصوب', JUS: 'مجزوم' };
const GENDER_EN = { M: 'Masculine', F: 'Feminine' };
const GENDER_AR = { M: 'مذكر', F: 'مؤنث' };
const NUMBER_EN = { S: 'Singular', D: 'Dual', P: 'Plural' };
const NUMBER_AR = { S: 'مفرد', D: 'مثنى', P: 'جمع' };
const PERSON_EN = { '1': '1st', '2': '2nd', '3': '3rd' };
const TENSE_EN = { PERF: 'Perfect', IMPF: 'Imperfect', IMPV: 'Imperative' };
const TENSE_AR = { PERF: 'ماضٍ', IMPF: 'مضارع', IMPV: 'أمر' };
const VOICE_EN = { act: 'Active', pass: 'Passive' };
const VOICE_AR = { act: 'معلوم', pass: 'مجهول' };
const STATE_EN = { def: 'Definite', indef: 'Indefinite', const: 'Construct' };
const STATE_AR = { def: 'معرفة', indef: 'نكرة', const: 'مضاف' };
const DERIV_EN = { ACT_PCPL: 'Active participle', PASS_PCPL: 'Passive participle', VN: 'Verbal noun' };
const DERIV_AR = { ACT_PCPL: 'اسم فاعل', PASS_PCPL: 'اسم مفعول', VN: 'مصدر' };

// ---------------------------------------------------------------------------
// 2. Parse morphology file
// ---------------------------------------------------------------------------

console.log('Loading morphology data...');
const raw = fs.readFileSync(path.join(SRC, 'quran-morphology.txt'), 'utf8');
const lines = raw.split('\n').filter(l => l.trim());

// Group segments by surah:ayah:word
// Each line: surah:ayah:word:segIndex \t arabic \t mainPOS \t features
const wordData = new Map(); // "surah:ayah:word" → [{ arabic, mainPOS, features, segIndex }]

for (const line of lines) {
  const parts = line.split('\t');
  if (parts.length < 4) continue;

  const [loc, arabic, mainPOS, features] = parts;
  const locParts = loc.split(':');
  if (locParts.length !== 4) continue;

  const [surah, ayah, word, segIdx] = locParts.map(Number);
  const key = `${surah}:${ayah}:${word}`;

  if (!wordData.has(key)) wordData.set(key, []);
  wordData.get(key).push({ arabic, mainPOS, features, segIndex: segIdx });
}

console.log(`  ${wordData.size} words parsed with segments`);

// ---------------------------------------------------------------------------
// 3. Parse features string into structured data
// ---------------------------------------------------------------------------

function parseFeatures(featStr) {
  const result = {};
  if (!featStr) return result;

  for (const part of featStr.split('|')) {
    if (part.startsWith('ROOT:')) result.root = part.slice(5);
    else if (part.startsWith('LEM:')) result.lemma = part.slice(4);
    else if (part.startsWith('VF:')) result.verbForm = parseInt(part.slice(3), 10);
    else if (part.startsWith('MOOD:')) result.mood = part.slice(5);
    else if (part.startsWith('FAM:')) result.family = part.slice(4);
    else if (part === 'NOM' || part === 'ACC' || part === 'GEN') result.case = part;
    else if (part === 'IND' || part === 'SUBJ' || part === 'JUS') result.mood = part;
    else if (part === 'M' || part === 'F') result.gender = part;
    else if (part === 'MS') { result.gender = 'M'; result.number = 'S'; }
    else if (part === 'FS') { result.gender = 'F'; result.number = 'S'; }
    else if (part === 'MD') { result.gender = 'M'; result.number = 'D'; }
    else if (part === 'FD') { result.gender = 'F'; result.number = 'D'; }
    else if (part === 'MP') { result.gender = 'M'; result.number = 'P'; }
    else if (part === 'FP') { result.gender = 'F'; result.number = 'P'; }
    else if (part === 'S' || part === 'D' || part === 'P') result.number = part;
    else if (part === '1' || part === '2' || part === '3') result.person = part;
    else if (part === '1S' || part === '1D' || part === '1P') { result.person = '1'; result.number = part[1]; }
    else if (part === '2MS' || part === '2FS' || part === '2MP' || part === '2FP' || part === '2MD' || part === '2FD') {
      result.person = '2'; result.gender = part[1]; result.number = part[2];
    }
    else if (part === '3MS' || part === '3FS' || part === '3MP' || part === '3FP' || part === '3MD' || part === '3FD') {
      result.person = '3'; result.gender = part[1]; result.number = part[2];
    }
    else if (part === 'INDEF') result.state = 'indef';
    else if (part === 'ADJ') result.isAdj = true;
    else if (part === 'PASS') result.voice = 'pass';
    else if (part === 'ACT_PCPL') result.derivation = 'ACT_PCPL';
    else if (part === 'PASS_PCPL') result.derivation = 'PASS_PCPL';
    else if (part === 'VN') result.derivation = 'VN';
    else if (part === 'PERF' || part === 'IMPF' || part === 'IMPV') result.tense = part;
    else if (part === 'PREF') result.isPrefix = true;
    else if (part === 'SUFF') result.isSuffix = true;
    else if (part === 'PRON') result.isPronoun = true;
    else if (part === 'DET') result.isDet = true;
    else if (part === 'PN') result.isProperNoun = true;
    else if (part === 'REL') result.isRelative = true;
    else if (part === 'DEM') result.isDemonstrative = true;
    else if (part === 'T') result.isTime = true;
    else if (part === 'LOC') result.isLocation = true;
    else if (part === 'COND') result.isConditional = true;
    else if (part === 'INTG') result.isInterrogative = true;
    // Particle subtypes
    for (const pKey of Object.keys(PARTICLE_EN)) {
      if (part === pKey) result.particleType = pKey;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// 4. Build segment and determine segment type
// ---------------------------------------------------------------------------

function getSegmentType(mainPOS, features, segIndex, totalSegs) {
  const parsed = parseFeatures(features);
  if (parsed.isPrefix || parsed.isDet) return 'prefix';
  if (parsed.isSuffix) return 'suffix';
  if (mainPOS === 'P') return segIndex === 1 && totalSegs > 1 ? 'prefix' : 'stem';
  if (mainPOS === 'V') return 'stem';
  if (mainPOS === 'N' && parsed.isPronoun && segIndex > 1) return 'suffix';
  if (segIndex === 1 && totalSegs > 1 && mainPOS === 'P') return 'prefix';
  return 'stem';
}

function getSegmentLabel(mainPOS, features) {
  const parsed = parseFeatures(features);

  // Particles / prefixes
  if (mainPOS === 'P') {
    // Check specific particle types in features
    for (const part of (features || '').split('|')) {
      if (terms.particles[part]) return { ar: terms.particles[part], en: PARTICLE_EN[part] || part };
    }
    if (parsed.isDet) return { ar: 'ال', en: 'Definite article' };
    return { ar: 'حرف', en: 'Particle' };
  }

  // Pronouns (attached or standalone)
  if (mainPOS === 'N' && parsed.isPronoun) {
    if (parsed.isSuffix) return { ar: 'ضمير متصل', en: 'Attached pronoun' };
    return { ar: 'ضمير', en: 'Pronoun' };
  }

  // Nouns
  if (mainPOS === 'N') {
    const type = parsed.isProperNoun ? 'PN' :
                 parsed.isRelative ? 'REL' :
                 parsed.isDemonstrative ? 'DEM' :
                 parsed.isTime ? 'T' :
                 parsed.isLocation ? 'LOC' :
                 parsed.isConditional ? 'COND' :
                 parsed.isInterrogative ? 'INTG' : 'N';
    const ar = terms.types[type] || 'اسم';
    const en = POS_EN[type] || 'Noun';
    const caseStr = parsed.case ? ` ${CASE_AR[parsed.case]}` : '';
    const caseEn = parsed.case ? ` (${CASE_EN[parsed.case].toLowerCase().slice(0, 3)}.)` : '';
    return { ar: ar + caseStr, en: en + caseEn };
  }

  // Verbs
  if (mainPOS === 'V') {
    const tenseAr = parsed.tense ? TENSE_AR[parsed.tense] : '';
    const tenseEn = parsed.tense ? TENSE_EN[parsed.tense] : 'Verb';
    return { ar: `فعل ${tenseAr}`.trim(), en: `Verb (${tenseEn.toLowerCase()})` };
  }

  return { ar: mainPOS, en: mainPOS };
}

// ---------------------------------------------------------------------------
// 5. Build WordMorphology for each word
// ---------------------------------------------------------------------------

function buildWordMorphology(segments) {
  // Find the main stem segment (the one that's a noun or verb, not prefix/suffix)
  const stemSeg = segments.find(s => s.mainPOS === 'V') ||
                  segments.find(s => s.mainPOS === 'N' && !parseFeatures(s.features).isPrefix && !parseFeatures(s.features).isSuffix && !parseFeatures(s.features).isDet) ||
                  segments[segments.length > 1 ? 1 : 0];

  const feat = parseFeatures(stemSeg.features);
  const isVerb = stemSeg.mainPOS === 'V';
  const isNoun = stemSeg.mainPOS === 'N';
  const isParticle = stemSeg.mainPOS === 'P' && segments.length === 1;

  // Determine overall POS
  let pos, posAr;
  if (isVerb) {
    pos = 'Verb';
    posAr = 'فعل';
  } else if (isParticle) {
    const label = getSegmentLabel('P', stemSeg.features);
    pos = label.en;
    posAr = label.ar;
  } else if (isNoun) {
    const type = feat.isProperNoun ? 'PN' :
                 feat.isPronoun ? 'PRON' :
                 feat.isRelative ? 'REL' :
                 feat.isDemonstrative ? 'DEM' :
                 feat.isTime ? 'T' :
                 feat.isLocation ? 'LOC' :
                 feat.isConditional ? 'COND' :
                 feat.isInterrogative ? 'INTG' : 'N';
    pos = POS_EN[type] || 'Noun';
    posAr = terms.types[type] || 'اسم';
  } else {
    pos = 'Particle';
    posAr = 'حرف';
  }

  // Build segment list
  const seg = segments.map((s, i) => {
    const segType = getSegmentType(s.mainPOS, s.features, s.segIndex, segments.length);
    const label = getSegmentLabel(s.mainPOS, s.features);
    return {
      ar: s.arabic,
      posAr: label.ar,
      posEn: label.en,
      type: segType,
    };
  });

  const result = { seg, pos, posAr };

  // Pattern (وزن) for verbs
  if (isVerb && feat.verbForm != null) {
    const formList = terms.verb_forms_tri;
    if (feat.verbForm >= 1 && feat.verbForm <= formList.length) {
      result.pattern = formList[feat.verbForm - 1];
    }
  }

  // Derivation for nouns
  if (feat.derivation) {
    result.derivation = DERIV_EN[feat.derivation];
  }

  // Gender
  if (feat.gender) {
    result.gender = feat.gender === 'M' ? 'm' : 'f';
  }

  // Number
  if (feat.number) {
    result.number = feat.number === 'S' ? 's' : feat.number === 'D' ? 'd' : 'p';
  }

  // Person
  if (feat.person) {
    result.person = feat.person;
  }

  // Case (nouns)
  if (feat.case) {
    result.case = feat.case === 'NOM' ? 'nom' : feat.case === 'ACC' ? 'acc' : 'gen';
    result.caseAr = CASE_AR[feat.case];
  }

  // Mood (verbs)
  if (feat.mood) {
    result.mood = feat.mood === 'IND' ? 'ind' : feat.mood === 'SUBJ' ? 'sub' : 'jus';
  }

  // Voice
  if (feat.voice === 'pass') {
    result.voice = 'pass';
  } else if (isVerb) {
    result.voice = 'act';
  }

  // State
  if (feat.state === 'indef') {
    result.state = 'indef';
  } else if (segments.some(s => parseFeatures(s.features).isDet)) {
    result.state = 'def';
  }

  // Tense for verbs (stored on derivation-like field)
  if (isVerb && feat.tense) {
    result.tense = TENSE_EN[feat.tense];
  }

  // Auto-generate إعراب sentence
  result.irab = generateIrab(result, feat, segments);

  // Generate syntactic role hints
  const roleInfo = getSyntacticRole(result, feat, segments);
  if (roleInfo) {
    result.syntacticRole = roleInfo.ar;
    result.syntacticRoleEn = roleInfo.en;
  }

  return result;
}

// ---------------------------------------------------------------------------
// 6. Auto-generate إعراب sentence
// ---------------------------------------------------------------------------

function generateIrab(morph, feat, segments) {
  const parts = [];

  if (morph.pos === 'Verb') {
    const tenseAr = feat.tense ? TENSE_AR[feat.tense] : '';
    parts.push(`فعل ${tenseAr}`.trim());

    if (feat.voice === 'pass') parts.push('مبني للمجهول');

    if (feat.tense === 'PERF') {
      parts.push('مبني على الفتح');
    } else if (feat.tense === 'IMPF') {
      if (morph.mood === 'ind') parts.push('مرفوع');
      else if (morph.mood === 'sub') parts.push('منصوب');
      else if (morph.mood === 'jus') parts.push('مجزوم');
    } else if (feat.tense === 'IMPV') {
      parts.push('مبني على السكون');
    }
  } else if (morph.posAr === 'اسم' || morph.pos === 'Noun' || morph.pos === 'Proper noun') {
    parts.push(morph.posAr || 'اسم');
    if (morph.caseAr) {
      parts.push(morph.caseAr);
      if (morph.case === 'nom') parts.push('وعلامة رفعه الضمة');
      else if (morph.case === 'acc') parts.push('وعلامة نصبه الفتحة');
      else if (morph.case === 'gen') parts.push('وعلامة جره الكسرة');
    }
  } else {
    // Particle
    const hasPrefix = segments.some(s => {
      const f = parseFeatures(s.features);
      return f.isPrefix || s.mainPOS === 'P';
    });
    if (segments.length === 1 && segments[0].mainPOS === 'P') {
      parts.push(morph.posAr);
      parts.push('مبني لا محل له من الإعراب');
    }
  }

  return parts.length > 0 ? parts.join(' ') : undefined;
}

// ---------------------------------------------------------------------------
// 7. Infer basic syntactic roles
// ---------------------------------------------------------------------------

function getSyntacticRole(morph, feat, segments) {
  // These are basic heuristic roles — a full treebank would be more accurate
  if (morph.pos === 'Verb') {
    return { ar: 'فعل', en: 'Verb' };
  }
  if (morph.pos === 'Noun' || morph.pos === 'Proper noun') {
    if (morph.case === 'nom') return { ar: 'مرفوع', en: 'Nominative' };
    if (morph.case === 'acc') return { ar: 'منصوب', en: 'Accusative' };
    if (morph.case === 'gen') return { ar: 'مجرور', en: 'Genitive' };
  }
  if (morph.pos === 'Pronoun' || morph.posAr === 'ضمير') {
    return { ar: 'ضمير', en: 'Pronoun' };
  }
  // Particles with specific roles
  const prefixSeg = segments.find(s => s.mainPOS === 'P');
  if (prefixSeg) {
    const pf = parseFeatures(prefixSeg.features);
    if (pf.particleType === 'P') return { ar: 'جار ومجرور', en: 'Prep. phrase' };
    if (pf.particleType === 'CONJ') return { ar: 'عطف', en: 'Conjunction' };
    if (pf.particleType === 'NEG') return { ar: 'نفي', en: 'Negation' };
  }
  return null;
}

// ---------------------------------------------------------------------------
// 8. Generate per-surah files
// ---------------------------------------------------------------------------

console.log('Generating per-surah morphology files...');
let totalSize = 0;
let surahCount = 0;

// Group by surah
const surahMap = new Map(); // surah → Map<"ayah:word", WordMorphology>
for (const [key, segments] of wordData) {
  const [surah, ayah, word] = key.split(':').map(Number);
  if (!surahMap.has(surah)) surahMap.set(surah, {});
  const morphology = buildWordMorphology(segments);
  surahMap.get(surah)[`${ayah}:${word}`] = morphology;
}

const MORPH_DIR = path.join(DATA, 'morphology');
if (!fs.existsSync(MORPH_DIR)) fs.mkdirSync(MORPH_DIR, { recursive: true });

/**
 * Compact a WordMorphology into a minified format to reduce JSON size.
 * Segments become tuples: [arabic, posAr, posEn, type(0=prefix,1=stem,2=suffix)]
 * Top-level keys are abbreviated.
 */
const TYPE_MAP = { prefix: 0, stem: 1, suffix: 2 };

function minify(morph) {
  const m = {};
  // Segments as tuples: [arabic, posAr, posEn, typeInt]
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
  // Drop syntacticRole fields if they just repeat pos info
  if (m.sr === m.ca || m.sr === m.pa) { delete m.sr; delete m.sre; }
  return m;
}

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
console.log(`  Words covered: ${wordData.size}`);
console.log('Done!');
