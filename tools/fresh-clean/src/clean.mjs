#!/usr/bin/env node
// FRESH CLEAN — Phase F2 cleaning script (ADR-035, technical_design/41).
//
// Reads the reverse-engineered source archive READ-ONLY, cleans the observed
// entries into the three-pillar fresh schema (Gemstones / Settings / Jewellery),
// and writes them into the `fresh` schema of DATABASE_URL.
//
// Guarantees (technical_design/41 §6):
//   - unknown → NULL, never invented
//   - acceptance gate: counts + FK resolution + pair weight sums must pass
//     before any write; any failure halts with a report and writes nothing
//   - deterministic: same archive → same rows; refuse-if-loaded unless --force
//
// Usage:
//   node src/clean.mjs --check          parse + gate only, no database
//   node src/clean.mjs                  load into DATABASE_URL (refuses if loaded)
//   node src/clean.mjs --force          truncate the fresh catalogue and reload
//   node src/clean.mjs --verbose        token/tally detail

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHECK = process.argv.includes('--check');
const FORCE = process.argv.includes('--force');
const VERBOSE = process.argv.includes('--verbose') || CHECK;

const REPO = path.resolve(__dirname, '..', '..', '..');
const DATA = path.join(REPO, 'naturalgemstones', 'naturalgemstones', 'reverse_engineered', 'data');
if (!fs.existsSync(path.join(DATA, 'urls.jsonl'))) {
  console.error(`FATAL: source archive not found at ${DATA}`);
  console.error('Per AGENTS.md §5 the archive must be restored out of band; never synthesise it.');
  process.exit(2);
}

const SITE = 'https://naturalgemstones.com';

// ---------------------------------------------------------------------------
// vocabularies — deterministic, visible, derived from the observed sources
// ---------------------------------------------------------------------------

const SHAPES = new Map(Object.entries({
  oval: 'Oval', pear: 'Pear', heart: 'Heart', cushion: 'Cushion', trillion: 'Trillion',
  round: 'Round', emerald: 'Emerald Cut', marquise: 'Marquise',
  princess: 'Princess', radiant: 'Radiant', asscher: 'Asscher', fancy: 'Fancy',
  baguette: 'Baguette', cabochon: 'Cabochon', octagon: 'Octagon', square: 'Square',
  briolette: 'Briolette', trapezoid: 'Trapezoid', triangle: 'Triangle', bullet: 'Bullet',
  shield: 'Shield', hexagonal: 'Hexagonal', star: 'Star', freeform: 'Freeform',
}));

const ORIGINS = new Map(Object.entries({
  brazil: 'Brazil', brazilian: 'Brazil', namibia: 'Namibia', namibian: 'Namibia',
  madagascar: 'Madagascar', madagascan: 'Madagascar', ceylon: 'Ceylon (Sri Lanka)',
  tanzania: 'Tanzania', tanzanian: 'Tanzania', mozambique: 'Mozambique', mozambican: 'Mozambique',
  kenya: 'Kenya', kenyan: 'Kenya', colombia: 'Colombia', colombian: 'Colombia',
  ethiopia: 'Ethiopia', ethiopian: 'Ethiopia', thailand: 'Thailand', thai: 'Thailand',
  australia: 'Australia', australian: 'Australia', nepal: 'Nepal', nepalese: 'Nepal',
  burma: 'Myanmar (Burma)', myanmar: 'Myanmar (Burma)',
  cambodia: 'Cambodia', cambodian: 'Cambodia', nigeria: 'Nigeria', nigerian: 'Nigeria',
  pakistan: 'Pakistan', pakistani: 'Pakistan', siberia: 'Siberia', russia: 'Russia', russian: 'Russia',
  montana: 'Montana', arizona: 'Arizona', vietnam: 'Vietnam', vietnamese: 'Vietnam',
  mali: 'Mali', india: 'India', indian: 'India', china: 'China', chinese: 'China',
  mexico: 'Mexico', mexican: 'Mexico', african: 'Africa', italian: 'Italy',
  afghan: 'Afghanistan', bolivian: 'Bolivia', american: 'USA', iran: 'Iran',
  zimbabwean: 'Zimbabwe', japan: 'Japan', uruguayan: 'Uruguay', tajik: 'Tajikistan',
  malawian: 'Malawi', malaysian: 'Malaysia', indonesian: 'Indonesia', ukraine: 'Ukraine',
  canadian: 'Canada', morocco: 'Morocco', congo: 'Congo',
}));

// multi-token phrases, longest first (observed bigrams/trigrams)
const PHRASES = new Map(Object.entries({
  'republic-of-congo': { kind: 'origin', value: 'Republic of Congo' },
  'persia-iran': { kind: 'origin', value: 'Persia (Iran)' },
  'united-states': { kind: 'origin', value: 'USA' },
  'south-american': { kind: 'origin', value: 'South America' },
  'west-african': { kind: 'origin', value: 'West Africa' },
  'south-african': { kind: 'origin', value: 'South Africa' },
  'east-african': { kind: 'origin', value: 'East Africa' },
  'sri-lankan': { kind: 'origin', value: 'Ceylon (Sri Lanka)' },
  'sri-lanka': { kind: 'origin', value: 'Sri Lanka' },
  'emerald-cut': { kind: 'shape', value: 'Emerald Cut' },
  'tapered-baguette': { kind: 'shape', value: 'Tapered Baguette' },
  'bullet-tapered': { kind: 'shape', value: 'Bullet Tapered' },
  'swiss-blue': { kind: 'colour', value: 'swiss-blue' },
  'sky-blue': { kind: 'colour', value: 'sky-blue' },
  'london-blue': { kind: 'colour', value: 'london-blue' },
  'bi-color': { kind: 'colour', value: 'bi-color' },
  'multi-color': { kind: 'colour', value: 'multi-color' },
  'color-change': { kind: 'colour', value: 'color-change' },
  'angel-skin': { kind: 'colour', value: 'angel-skin' },
  'with-red-spots': { kind: 'ignore', value: 'with-red-spots' },
}));

const COLOURS = new Set([
  'blue', 'pink', 'green', 'yellow', 'purple', 'red', 'orange', 'white', 'grey',
  'gray', 'brown', 'teal', 'violet', 'black', 'champagne', 'golden', 'lime',
  'peach', 'olive', 'mauve', 'turquoise', 'aqua', 'cyan', 'lavender', 'plum',
  'burgundy', 'indicolite', 'seafoam', 'mint', 'coral', 'salmon', 'rainbow',
  'watermelon', 'madeira', 'lemon', 'smoky', 'flash', 'peacock', 'oxblood',
  'orangey', 'organish', 'silver', 'rose', 'colorless', 'colourless',
  // observed shade adjectives (kept verbatim as their own values)
  'yellowish', 'purplish', 'pinkish', 'greenish', 'orangish', 'bluish', 'reddish',
  'brownish', 'greyish', 'violetish',
]);
// shade-adjective + base colour bigrams: "yellowish-green", "reddish-orange", …
for (const adj of ['yellowish', 'purplish', 'pinkish', 'greenish', 'orangish', 'bluish', 'reddish', 'brownish', 'greyish', 'violetish', 'orangey']) {
  for (const base of ['green', 'blue', 'red', 'orange', 'yellow', 'purple', 'pink', 'brown', 'grey', 'violet', 'white', 'black']) {
    if (!PHRASES.has(`${adj}-${base}`)) PHRASES.set(`${adj}-${base}`, { kind: 'colour', value: `${adj}-${base}` });
  }
}

const IGNORE_TOKENS = new Set(['with', 'spots', 'various', 'and', 'of', 'the']);

const HELP_FIELDS = ['clarity_help', 'color_help', 'color_intensity_help', 'shape_help', 'enhancements_help', 'origin_help', 'stone_type'];

const METAL_CODES = new Map(Object.entries({
  W10: ['10K White Gold', '10k-white-gold'], Y10: ['10K Yellow Gold', '10k-yellow-gold'],
  W14: ['14K White Gold', '14k-white-gold'], Y14: ['14K Yellow Gold', '14k-yellow-gold'],
  R14: ['14K Rose Gold', '14k-rose-gold'], W18: ['18K White Gold', '18k-white-gold'],
  Y18: ['18K Yellow Gold', '18k-yellow-gold'], R18: ['18K Rose Gold', '18k-rose-gold'],
  PT: ['Platinum 950', 'platinum-950'], SL: ['Sterling Silver', 'silver'],
  YW14: ['14K Yellow-White Gold', '14k-yellow-white'], WY14: ['14K White-Yellow Gold', '14k-white-yellow'],
  YW18: ['18K Yellow-White Gold', '18k-yellow-white'], WY18: ['18K White-Yellow Gold', '18k-white-yellow'],
}));
const METAL_BY_PHRASE = new Map([...METAL_CODES.values()].map(([name, phrase]) => [phrase, name]));
const METAL_BY_NAME = new Map([...METAL_CODES.entries()].map(([, [name]]) => [name, null]));
for (const [code, [name]] of METAL_CODES) METAL_BY_NAME.set(name, code);
const METAL_PHRASES = [...METAL_BY_PHRASE.keys()].sort((a, b) => b.length - a.length);

const JEWELLERY_TYPES = [
  ['RING', 'Ring'], ['EARRING', 'Earring'], ['PENDANT', 'Pendant'],
  ['NECKLACE', 'Necklace'], ['BRACELET', 'Bracelet'], ['NOSE_RING', 'Nose ring'],
];

const DYO_TYPE_TO_JT = { ring: 'RING', earrings: 'EARRING', earring: 'EARRING', pendant: 'PENDANT', necklace: 'NECKLACE', bracelet: 'BRACELET' };
const SETTING_ROUTE_TO_JT = { 'gemstone-ring-settings': 'RING', 'gemstone-earring-settings': 'EARRING', 'gemstone-necklace-pendant-settings': 'PENDANT' };
const READY_ROUTE_TO_JT = { rings: 'RING', 'gemstone-earrings': 'EARRING', 'gemstone-bracelets-bangles': 'BRACELET', 'gemstone-necklaces-pendants': 'PENDANT' };
const JT_WORD = { RING: 'Ring', EARRING: 'Earring', PENDANT: 'Pendant', NECKLACE: 'Necklace', BRACELET: 'Bracelet' };
const SETTING_TYPE_WORD = { RING: 'ring', EARRING: 'earring', PENDANT: 'necklace' };
const JT_LETTER = { RING: 'R', EARRING: 'E', PENDANT: 'P', NECKLACE: 'N', BRACELET: 'B', NOSE_RING: 'X' };

// ---------------------------------------------------------------------------
// semantic code registry (technical_design/42 §4–§5) — variety → [family, code]
// ---------------------------------------------------------------------------
const VAR_REG = Object.assign(Object.create(null), {
  citrine: ['QUA', 'CIT'], spinel: ['SPI', 'SPN'], tourmaline: ['TOU', 'TRM'],
  amethyst: ['QUA', 'AME'], moonstone: ['FEL', 'MON'], garnet: ['GAR', 'GRN'],
  aquamarine: ['BER', 'AQU'], peridot: ['SIN', 'PER'], chrysoberyl: ['CHB', 'CBY'],
  zircon: ['SIN', 'ZIR'], 'rhodolite-garnet': ['GAR', 'RHO'], topaz: ['TOP', 'TPZ'],
  'tsavorite-garnet': ['GAR', 'TSV'], alexandrite: ['CHB', 'ALX'], coral: ['ORG', 'CRL'],
  prasiolite: ['QUA', 'PRA'], tanzanite: ['SIN', 'TAN'], 'hessonite-garnet': ['GAR', 'HES'],
  'white-opal-light-opal': ['SIN', 'WOP'], ametrine: ['QUA', 'AMT'], jade: ['SIN', 'JAD'],
  kunzite: ['SIN', 'KUN'], quartz: ['QUA', 'QRT'], 'tigers-eye': ['QUA', 'TGE'],
  'rubellite-tourmaline': ['TOU', 'RBT'], 'demantoid-garnet': ['GAR', 'DEM'],
  lapis: ['SIN', 'LAP'], 'spessartite-garnet': ['GAR', 'SPS'], turquoise: ['SIN', 'TRQ'],
  morganite: ['BER', 'MOR'], 'paraiba-tourmaline': ['TOU', 'PRB'],
  'sphene-titanite': ['SIN', 'SPH'], 'rutilated-quartz': ['QUA', 'RQU'],
  'cobalt-spinel': ['SPI', 'CSP'], agate: ['QUA', 'AGT'], 'malaya-garnet': ['GAR', 'MLG'],
  'precious-topaz': ['TOP', 'PTP'], 'crystal-opal-jelly-opal': ['SIN', 'CJO'],
  'rose-quartz': ['QUA', 'RQS'], 'black-opal-dark-opal': ['SIN', 'BOP'],
  'fire-opal-flame-opal': ['SIN', 'FOP'], 'smoky-quartz': ['QUA', 'SMQ'],
  'chrome-tourmaline': ['TOU', 'CTM'], 'almandine-garnet': ['GAR', 'ALM'],
  beryl: ['BER', 'BRL'], grandidierite: ['SIN', 'GRD'], heliodor: ['BER', 'HEL'],
  apatite: ['SIN', 'APT'], 'boulder-opal-ironstone-opal': ['SIN', 'BIP'],
  malachite: ['SIN', 'MAL'], 'grossular-garnet': ['GAR', 'GRS'], carnelian: ['QUA', 'CRN'],
  phenakite: ['SIN', 'PHE'], sinhalite: ['SIN', 'SNL'], kornerupine: ['SIN', 'KRN'],
  iolite: ['SIN', 'IOL'], 'mali-garnet': ['GAR', 'MGL'], fluorite: ['SIN', 'FLU'],
  andalusite: ['SIN', 'ADL'], scapolite: ['SIN', 'SCP'], 'chrome-diopside': ['SIN', 'CDI'],
  jeremejevite: ['SIN', 'JER'], kyanite: ['SIN', 'KYN'], 'andradite-garnet': ['GAR', 'ADG'],
  'imperial-topaz': ['TOP', 'ITP'], hauyne: ['SIN', 'HAU'], andesine: ['FEL', 'AND'],
  goshenite: ['BER', 'GSH'], rhodonite: ['SIN', 'RHN'], diopside: ['SIN', 'DIO'],
  taaffeite: ['SIN', 'TAF'], 'bloodstone-heliotrope': ['QUA', 'BLO'], pearl: ['ORG', 'PRL'],
  rhodochrosite: ['SIN', 'RDC'], onyx: ['QUA', 'ONX'], 'red-beryl': ['BER', 'RBE'],
  // owner-added varieties (doc 42 §5) — empty, vendor-ready
  ruby: ['COR', 'RUB'], sapphire: ['COR', 'SAP'], emerald: ['BER', 'EME'],
  diamond: ['SIN', 'DIA'], amber: ['ORG', 'AMB'], labradorite: ['FEL', 'LAB'],
  sunstone: ['FEL', 'SUN'], aventurine: ['QUA', 'AVN'],
  'cats-eye-chrysoberyl': ['CHB', 'CEC'], amazonite: ['FEL', 'AMZ'],
});
const OWNER_ADDED_VARIETIES = ['ruby', 'sapphire', 'emerald', 'diamond', 'amber', 'labradorite', 'sunstone', 'aventurine', 'cats-eye-chrysoberyl', 'amazonite'];
const FAMILY_NAMES = {
  QUA: 'Quartz', BER: 'Beryl', COR: 'Corundum', GAR: 'Garnet', TOU: 'Tourmaline',
  FEL: 'Feldspar', SPI: 'Spinel', CHB: 'Chrysoberyl', TOP: 'Topaz', SIN: 'Single-Species', ORG: 'Organic',
};
const FAMILY_DESCRIPTIONS = {
  QUA: 'Silica family incl. chalcedony (agate, carnelian, onyx, bloodstone).',
  BER: 'Aluminium beryllium silicates distinguished by colour.',
  COR: 'Aluminium oxide: ruby (red) and sapphire (all other colours).',
  GAR: 'Complex silicate group incl. pyralspite and ugrandite sub-groups.',
  TOU: 'Borosilicate minerals with a vast colour range.',
  FEL: 'Rock-forming tectosilicates: moonstone, labradorite, sunstone.',
  SPI: 'Oxide minerals with a wide range of vibrant colours.',
  CHB: 'Alexandrite (colour-change) and cat\u2019s-eye chrysoberyl.',
  TOP: 'Fluorine-bearing aluminium silicate.',
  SIN: 'Stands as its own group in the jewellery trade.',
  ORG: 'Produced by living or once-living organisms.',
};
const HOUSE_VENDOR = 'HQ'; // code segment for house stock (DB vendor_id stays NULL)

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function readJsonl(file, onRow) {
  return new Promise((resolve, reject) => {
    const r = readline.createInterface({ input: fs.createReadStream(file, 'utf8'), crlfDelay: Infinity });
    r.on('line', (l) => { if (l.trim()) onRow(JSON.parse(l)); });
    r.on('close', resolve);
    r.on('error', reject);
  });
}

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
const title = (s) => String(s).split(/[\s-]+/).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const collapseDouble = (v) => {
  // deterministic de-doubling of the source artefact (D9): "Pink Pink" → "Pink",
  // "Emerald Cut Emerald Cut" → "Emerald Cut", "Cushion Cushion" → "Cushion".
  // Char-level then word-level halves (iterative, whitespace-tolerant).
  if (typeof v !== 'string') return v;
  let t = v.trim();
  for (;;) {
    const half = t.length / 2;
    if (t.length % 2 === 0 && t.slice(0, half).trim() === t.slice(half).trim()) { t = t.slice(0, half).trim(); continue; }
    const words = t.split(/\s+/);
    if (words.length % 2 === 0) {
      const h = words.length / 2;
      if (words.slice(0, h).join(' ') === words.slice(h).join(' ')) { t = words.slice(0, h).join(' '); continue; }
    }
    break;
  }
  return t;
};

class SlugMinter {
  constructor() { this.used = new Set(); }
  mint(parts) {
    const base = norm(parts.filter(Boolean).join('-'));
    let slug = base; let n = 2;
    while (this.used.has(slug)) slug = `${base}-${n++}`;
    this.used.add(slug);
    return slug;
  }
}

const unknownTokens = new Map();
const notes = [];

function classifyToken(tok) {
  if (SHAPES.has(tok)) return { kind: 'shape', value: SHAPES.get(tok) };
  if (ORIGINS.has(tok)) return { kind: 'origin', value: ORIGINS.get(tok) };
  if (COLOURS.has(tok)) return { kind: 'colour', value: tok };
  return null;
}

function parseSlugBody(body, varietyTokens) {
  const tokens = body.split('-').filter(Boolean);
  let weight = null; const rest = [];
  for (const t of tokens) {
    const m = t.match(/^(\d+(?:\.\d+)?)ct$/);
    if (m && weight === null) { weight = m[1]; continue; }
    rest.push(t);
  }
  let origin = null, shape = null; const colours = [];
  const addOrigin = (v) => { if (origin !== v) origin = origin ? `${origin} ${v}` : v; };
  for (let i = 0; i < rest.length; i++) {
    if (varietyTokens.has(rest[i])) continue;
    let matched = false;
    for (const n of [3, 2]) {
      const phrase = rest.slice(i, i + n).join('-');
      const p = PHRASES.get(phrase);
      if (p) {
        if (p.kind === 'origin') addOrigin(p.value);
        else if (p.kind === 'shape') { if (!shape) shape = p.value; }
        else if (p.kind === 'colour') { if (!colours.includes(p.value)) colours.push(p.value); }
        i += n - 1; matched = true; break;
      }
    }
    if (matched) continue;
    const t = rest[i];
    if (IGNORE_TOKENS.has(t)) continue;
    const c = classifyToken(t);
    if (!c) { unknownTokens.set(t, (unknownTokens.get(t) || 0) + 1); continue; }
    if (c.kind === 'origin') addOrigin(c.value);
    else if (c.kind === 'shape') { if (!shape) shape = c.value; }
    else if (c.kind === 'colour') { if (!colours.includes(c.value)) colours.push(c.value); }
  }
  return { weight, origin, shape, colour: colours[0] ?? null };
}

const varietyTokenCache = new Map();
function varietyTokenSet(variety) {
  if (!varietyTokenCache.has(variety)) varietyTokenCache.set(variety, new Set(variety.split('-')));
  return varietyTokenCache.get(variety);
}

// ---------------------------------------------------------------------------
// pass 1 — urls.jsonl → the four URL families (+ variety vocabulary from routes)
// ---------------------------------------------------------------------------

const stoneUrls = new Map();
const pairUrls = new Map();
const settingUrls = [];
const readyUrls = [];
const dyoUrls = [];
const varietySlugs = new Set();

await readJsonl(path.join(DATA, 'urls.jsonl'), (j) => {
  const url = j.url || '';
  if (!url.startsWith(SITE)) return;
  const p = url.slice(SITE.length).split('?')[0];
  if (p.startsWith('/design-your-own')) {
    const m = p.match(/\/review\/(.+?)-((?:k|pr)\d+)\/?$/i);
    if (m) dyoUrls.push({ url, slug: m[1], ref: m[2].toUpperCase() });
    return;
  }
  let m;
  if ((m = p.match(/^\/([a-z0-9-]+)\/(.+?)-k(\d+)\/?$/i))) {
    const ref = `K${m[3]}`;
    const v = m[1].replace(/-pairs$/, '');
    if (!stoneUrls.has(ref)) stoneUrls.set(ref, []);
    stoneUrls.get(ref).push({ url, variety: v, body: m[2].replace(/-pair$/i, '') });
    varietySlugs.add(v);
    return;
  }
  if ((m = p.match(/^\/([a-z0-9-]+)\/(.+?)-pr(\d+)\/?$/i))) {
    const ref = `PR${m[3]}`;
    const v = m[1].replace(/-pairs$/, '');
    if (!pairUrls.has(ref)) pairUrls.set(ref, []);
    pairUrls.get(ref).push({ url, variety: v, body: m[2].replace(/-pair$/i, '') });
    varietySlugs.add(v);
    return;
  }
  if ((m = p.match(/-j(\d+)\/?$/i))) {
    const route = p.split('/')[1] ?? '';
    readyUrls.push({ url, route, jRef: m[1], slug: p.split('/')[2] ?? '' });
    if (route.endsWith('-rings')) varietySlugs.add(route.slice(0, -'-rings'.length));
    return;
  }
  if (/js\d+/.test(p)) {
    settingUrls.push({ url, route: p.split('/')[1] ?? '', slug: p.split('/')[2] ?? '' });
  }
});

// ---------------------------------------------------------------------------
// pass 2 — specifications.jsonl + taxonomy.json → help vocabularies
// ---------------------------------------------------------------------------

const specsByPage = new Map();
await readJsonl(path.join(DATA, 'specifications.jsonl'), (j) => {
  if (!specsByPage.has(j.page_url)) specsByPage.set(j.page_url, {});
  specsByPage.get(j.page_url)[j.field_key] = j.field_value;
});

const helpVocab = {};
for (const f of HELP_FIELDS) helpVocab[f] = new Set();
try {
  const taxonomy = JSON.parse(fs.readFileSync(path.join(DATA, 'taxonomy.json'), 'utf8'));
  for (const f of HELP_FIELDS) {
    for (const tv of taxonomy?.fields?.[f]?.top_values ?? []) {
      const v = collapseDouble(tv.value);
      if (v) helpVocab[f].add(v);
    }
  }
} catch (e) {
  notes.push(`taxonomy.json unreadable (${e.message}); help vocabularies restricted to specification values`);
}
for (const fields of specsByPage.values()) {
  for (const f of HELP_FIELDS) {
    if (fields[f] != null) {
      const v = collapseDouble(String(fields[f]));
      if (v) helpVocab[f].add(v);
    }
  }
}

// ---------------------------------------------------------------------------
// pass 3 — pages_analyzed.jsonl → DYO pages (1,024 observed of 1,245)
// ---------------------------------------------------------------------------

const dyoPages = [];
await readJsonl(path.join(DATA, 'pages_analyzed.jsonl'), (j) => {
  const rec = j?.product?.database_record;
  if (!rec) return;
  let json = j.product.json;
  if (typeof json === 'string') { try { json = JSON.parse(json); } catch { json = null; } }
  const commercial = json?.commercial ?? {};
  const sd = json?.structured_data;
  const offers = (Array.isArray(sd) ? sd : sd ? [sd] : []).filter(Boolean)
    .flatMap((o) => (Array.isArray(o?.offers) ? o.offers : o?.offers ? [o.offers] : []));
  const offer = offers.find((o) => o?.price != null);
  const price = commercial.price ?? offer?.price ?? null;
  dyoPages.push({
    url: j.url,
    sku: rec.sku ?? null,
    name: rec.name ?? null,
    price: price == null ? null : Number(price),
    currency: commercial.currency ?? offer?.priceCurrency ?? null,
    specs: specsByPage.get(j.url) ?? {},
  });
});

// ---------------------------------------------------------------------------
// clean → entities
// ---------------------------------------------------------------------------

const gemstones = new Map(); // ref → row

function ensureGemstone(ref, kind) {
  if (!gemstones.has(ref)) {
    gemstones.set(ref, {
      ref, kind, variety: null, weight: null, origin: null, shape: null, colour: null,
      clarity: null, treatment: null, pieces: kind === 'PAIR' ? 2 : 1,
      stoneRows: [], price: null, currency: null, sources: [],
    });
  }
  return gemstones.get(ref);
}

function pickCanonical(refMap, kind) {
  for (const [ref, entries] of refMap) {
    const sorted = [...entries].sort((a, b) => a.url.localeCompare(b.url));
    let chosen = null;
    for (const e of sorted) {
      const parsed = parseSlugBody(e.body, varietyTokenSet(e.variety));
      if (parsed.weight) { chosen = { ...e, parsed }; break; }
      if (!chosen) chosen = { ...e, parsed };
    }
    const g = ensureGemstone(ref, kind);
    g.variety = chosen.variety;
    g.sources.push(chosen.url);
    if (chosen.parsed.weight != null) g.weight = Number(chosen.parsed.weight);
    if (chosen.parsed.origin) g.origin = chosen.parsed.origin;
    if (chosen.parsed.shape) g.shape = chosen.parsed.shape;
    if (chosen.parsed.colour) g.colour = chosen.parsed.colour;
  }
}
pickCanonical(stoneUrls, 'SINGLE');
pickCanonical(pairUrls, 'PAIR');

// resolve a DYO slug's variety: tokens before the jewellery-type token; the
// longest suffix that matches a known variety wins; leading leftovers are
// colour candidates.
function parseDyoVariety(slug) {
  const tokens = slug.split('-').filter(Boolean);
  let typeIdx = -1;
  for (let i = 0; i < tokens.length; i++) {
    if (DYO_TYPE_TO_JT[tokens[i]] !== undefined) { typeIdx = i; break; }
  }
  if (typeIdx <= 0) return { variety: null, colour: null };
  const pre = tokens.slice(0, typeIdx);
  const known = [...varietySlugs].sort((a, b) => b.split('-').length - a.split('-').length);
  for (const v of known) {
    const vt = v.split('-');
    if (pre.length >= vt.length && pre.slice(-vt.length).join('-') === v) {
      const lead = pre.slice(0, pre.length - vt.length);
      const colour = lead.find((t) => COLOURS.has(t)) ?? null;
      return { variety: v, colour };
    }
  }
  return { variety: norm(pre.join('-')), colour: null };
}

for (const d of dyoPages) {
  if (!d.sku) continue; // the 221 failed-fetch pages: dropped (zero provenance)
  const m = d.sku.toUpperCase().match(/^JS(\d+)([A-Z]+\d*)-((?:K|PR)\d+)$/);
  if (!m) { notes.push(`DYO sku unparseable: ${d.sku}`); continue; }
  d.core = m[1]; d.metal = m[2]; d.ref = m[3];
  d.jt = DYO_TYPE_TO_JT[d.url.split('/').pop().match(/(earrings?|ring|pendant|necklace|bracelet)/)?.[1] ?? ''] ?? null;
  const kind = d.ref.startsWith('PR') ? 'PAIR' : 'SINGLE';
  const g = ensureGemstone(d.ref, kind);
  if (!g.sources.includes(d.url)) g.sources.push(d.url);

  const sp = d.specs ?? {};
  const gw = sp.weight ? collapseDouble(String(sp.weight)) : null;
  if (gw) {
    const pieces = [...gw.matchAll(/(\d+(?:\.\d+)?)\s*Ct\.?/gi)].map((x) => Number(x[1]));
    if (kind === 'PAIR' && pieces.length >= 2) {
      g.pieces = pieces.slice(0, 2);
      g.weight = Math.round((pieces[0] + pieces[1]) * 1000) / 1000;
      const dims = sp.dimensions_mm_help ? collapseDouble(String(sp.dimensions_mm_help)) : null;
      const nums = dims ? [...dims.matchAll(/(?:Length|Width|Height):\s*([\d.]+)/gi)].map((x) => Number(x[1])) : [];
      g.stoneRows = [0, 1].map((i) => ({
        position: i + 1, weight: pieces[i],
        l: nums[i * 3] ?? null, w: nums[i * 3 + 1] ?? null, h: nums[i * 3 + 2] ?? null,
      }));
    } else if (pieces.length >= 1) {
      g.weight = pieces[0];
    }
  }
  if (sp.color_help) g.colour = collapseDouble(String(sp.color_help));
  if (sp.clarity_help) g.clarity = collapseDouble(String(sp.clarity_help));
  if (sp.shape_help) g.shape = collapseDouble(String(sp.shape_help));
  if (sp.enhancements_help) g.treatment = collapseDouble(String(sp.enhancements_help));
  if (sp.origin_help) g.origin = collapseDouble(String(sp.origin_help));
  if (!g.variety) {
    const st = sp.stone_type ? collapseDouble(String(sp.stone_type)) : null;
    const parsed = parseDyoVariety(d.url.split('/').pop());
    g.variety = parsed.variety ?? (st ? norm(st.split(/\s+/)[0]) : null);
    if (!g.colour && parsed.colour) g.colour = parsed.colour;
  }
}

// settings ------------------------------------------------------------------
const settingsMap = new Map();
for (const s of settingUrls) {
  const m = s.slug.match(/-js(\d+)([a-z]+\d*)$/i);
  if (!m) { notes.push(`setting slug unparseable: ${s.slug}`); continue; }
  const core = m[1]; const metalCode = m[2].toUpperCase();
  if (!METAL_CODES.has(metalCode)) { notes.push(`unknown metal code ${metalCode} on ${s.slug}`); continue; }
  const jt = SETTING_ROUTE_TO_JT[s.route];
  if (!jt) { notes.push(`unknown settings route ${s.route}`); continue; }
  const metal = METAL_CODES.get(metalCode);
  let body = s.slug;
  body = body.slice(0, body.length - m[0].length); // strip the trailing -js… ref
  const phrase = metal[1];
  body = body.startsWith(`${phrase}-`) ? body.slice(phrase.length + 1) : body;
  const suffix = body.match(/-(ring|earring|necklace|pendant)-setting$/);
  if (!suffix) { notes.push(`setting slug missing type-setting suffix: ${s.slug}`); continue; }
  const style = body.slice(0, body.length - suffix[0].length) || null;
  const key = `JS${core}${metalCode}`;
  if (!settingsMap.has(key)) settingsMap.set(key, { key, core, metalCode, jewelleryType: jt, style, url: s.url });
}

// ready-made ----------------------------------------------------------------
const readyMap = new Map();
for (const r of readyUrls) {
  if (readyMap.has(r.jRef)) continue;
  const jt = r.route.endsWith('-rings') ? 'RING' : READY_ROUTE_TO_JT[r.route];
  if (!jt) { notes.push(`unknown ready route ${r.route}`); continue; }
  let body = r.slug;
  let metalName = null, metalCode = null;
  for (const phrase of METAL_PHRASES) {
    const idx = body.indexOf(`-${phrase}-`);
    if (idx >= 0) { metalName = METAL_BY_PHRASE.get(phrase); metalCode = METAL_BY_NAME.get(metalName); body = body.slice(0, idx); break; }
  }
  let variety = null;
  if (r.route.endsWith('-rings')) variety = r.route.slice(0, -'-rings'.length);
  const tokens = body.split('-').filter(Boolean);
  let shape = null; const stack = [];
  for (const t of tokens) {
    if (variety && variety.split('-').includes(t)) continue;
    if (['ring', 'earrings', 'pendant', 'necklace', 'bracelet', 'bangle', 'gemstone', 'ct'].includes(t)) continue;
    const c = classifyToken(t);
    if (c?.kind === 'shape') { if (!shape) shape = c.value; continue; }
    stack.push(t);
  }
  readyMap.set(r.jRef, { jRef: r.jRef, jewelleryType: jt, variety, style: stack.join('-') || null, shape, metalName, metalCode, url: r.url });
}

// configured products -------------------------------------------------------
const configured = [];
for (const d of dyoPages) {
  if (!d.sku || !d.core) continue;
  const variantKey = `JS${d.core}${d.metal}`;
  configured.push({ page: d, settingKey: variantKey });
}

// ---------------------------------------------------------------------------
// acceptance gate
// ---------------------------------------------------------------------------

const gemList = [...gemstones.values()];
const catSingles = stoneUrls.size;
const catPairs = pairUrls.size;
const dyoOnlySingles = gemList.filter((g) => g.kind === 'SINGLE' && !stoneUrls.has(g.ref)).length;
const dyoOnlyPairs = gemList.filter((g) => g.kind === 'PAIR' && !pairUrls.has(g.ref)).length;
const counts = {
  gemstoneSingles: gemList.filter((g) => g.kind === 'SINGLE').length,
  gemstonePairs: gemList.filter((g) => g.kind === 'PAIR').length,
  catalogueSingles: catSingles,
  cataloguePairs: catPairs,
  dyoOnlySingles,
  dyoOnlyPairs,
  settings: settingsMap.size,
  designCodes: new Set([...settingsMap.values()].map((s) => s.core)).size,
  readyMade: readyMap.size,
  configured: configured.length,
  priced: dyoPages.filter((d) => d.sku && d.price != null).length,
  pairsWithStoneRows: gemList.filter((g) => g.kind === 'PAIR' && g.stoneRows.length).length,
  pairStoneRows: gemList.reduce((a, g) => a + (g.kind === 'PAIR' ? g.stoneRows.length : 0), 0),
};

const fails = [];
if (catSingles !== 19665) fails.push(`A1 catalogue singles: expected 19665, got ${catSingles}`);
if (catPairs !== 3072) fails.push(`A1 catalogue pairs: expected 3072, got ${catPairs}`);
if (dyoOnlySingles > 50) fails.push(`A1 DYO-only singles exploded: ${dyoOnlySingles} (expected ≈28)`);
if (dyoOnlyPairs !== 0) fails.push(`A1 DYO-only pairs: expected 0, got ${dyoOnlyPairs}`);
if (counts.settings !== 10349) fails.push(`A2 settings: expected 10349, got ${counts.settings}`);
if (counts.designCodes !== 951) fails.push(`A2 design codes: expected 951, got ${counts.designCodes}`);
if (counts.readyMade !== 405) fails.push(`A3 ready-made: expected 405 (88 rings-family + 317 observed other routes), got ${counts.readyMade}`);
if (counts.configured !== 1024) fails.push(`A3 configured: expected 1024, got ${counts.configured}`);
if (counts.priced !== 1024) fails.push(`A4 priced: expected 1024, got ${counts.priced}`);
const observedPairRefs = new Set(dyoPages.filter((d) => d.sku && d.ref?.startsWith('PR')).map((d) => d.ref));
if (counts.pairsWithStoneRows !== observedPairRefs.size) fails.push(`A5 pairs with per-piece data: expected ${observedPairRefs.size} observed DYO pair refs, got ${counts.pairsWithStoneRows}`);
if (counts.pairStoneRows !== observedPairRefs.size * 2) fails.push(`A5 pair stone rows: expected ${observedPairRefs.size * 2}, got ${counts.pairStoneRows}`);
if (observedPairRefs.size > 59) fails.push(`A5 observed DYO pair refs exploded: ${observedPairRefs.size} (URL probe found 59 distinct)`);
if (counts.pairsWithStoneRows === 0) fails.push('A5: no pair per-piece data parsed');

let sumFails = 0;
for (const g of gemList) {
  if (g.kind !== 'PAIR' || !g.stoneRows.length) continue;
  const sum = g.stoneRows.reduce((a, s) => a + (s.weight ?? 0), 0);
  if (g.weight != null && Math.abs(sum - g.weight) > 0.005) { sumFails++; if (VERBOSE) console.error(`  pair sum ${g.ref}: ${sum} != ${g.weight}`); }
}
if (sumFails > 0) fails.push(`A5b pair weight sums failed: ${sumFails}`);

let missingWeight = 0, missingVariety = 0;
for (const g of gemList) {
  if (g.weight == null) missingWeight++;
  if (!g.variety) missingVariety++;
}
if (missingWeight > 0) fails.push(`A6 gemstones without weight: ${missingWeight}`);
if (missingVariety > 0) fails.push(`A6 gemstones without variety: ${missingVariety}`);

const unresolvedSettingFks = configured.filter((c) => !settingsMap.has(c.settingKey)).length;
if (unresolvedSettingFks > 0) fails.push(`A7 configured products with unresolved setting FK: ${unresolvedSettingFks}`);

// A8 — semantic code registry completeness (doc 42 §5): every data variety must
// have a family + unique code; code registry itself must have no duplicate codes
const unmapped = [...varietySlugs].filter((v) => !VAR_REG[v]);
if (unmapped.length > 0) fails.push(`A8 varieties missing family/code mapping: ${unmapped.join(', ')}`);
const codeCollisions = Object.entries(VAR_REG).filter(([v1, [, c1]], _, all) => all.some(([v2, [, c2]]) => v1 !== v2 && c1 === c2));
if (codeCollisions.length > 0) fails.push(`A8 duplicate variety codes in registry: ${[...new Set(codeCollisions.map(([, [, c]]) => c))].join(', ')}`);

console.log('— CLEANING REPORT —');
console.log(counts);
console.log(`varieties=${varietySlugs.size} colours=${helpVocab.color_help.size} origins=${helpVocab.origin_help.size} shapes=${helpVocab.shape_help.size} clarities=${helpVocab.clarity_help.size} treatments=${helpVocab.enhancements_help.size} metals=${METAL_CODES.size} jewelleryTypes=${JEWELLERY_TYPES.length}`);
if (unknownTokens.size) {
  const top = [...unknownTokens.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40);
  console.log('unclassified slug tokens (left NULL, never guessed):');
  for (const [t, c] of top) console.log(`   ${t} ×${c}`);
  if (unknownTokens.size > 40) console.log(`   … ${unknownTokens.size - 40} more distinct`);
} else {
  console.log('unclassified slug tokens: none');
}
if (notes.length) { console.log(`notes (${notes.length}):`); for (const n of [...new Set(notes)].slice(0, 12)) console.log('  -', n); }
if (fails.length) {
  console.error('— ACCEPTANCE GATE: FAIL —');
  for (const f of fails) console.error('  ✗', f);
  process.exit(1);
}
console.log('— ACCEPTANCE GATE: PASS —');
if (CHECK) { console.log('--check: no database writes performed.'); process.exit(0); }

// ---------------------------------------------------------------------------
// write
// ---------------------------------------------------------------------------

const { default: pg } = await import('pg');
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('FATAL: DATABASE_URL is required (local dev: postgresql://postgres:maihan_local_dev_only@127.0.0.1:5433/maihan_dev)');
  process.exit(2);
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
const q = (text, values) => client.query(text, values);
const T = (t) => `fresh.${t}`;

const { rows: pre } = await q(`SELECT count(*)::int AS n FROM ${T('gemstones')}`);
if (pre[0].n > 0 && !FORCE) {
  console.error(`FATAL: fresh schema already loaded (${pre[0].n} gemstones). Re-run with --force to truncate and reload deterministically.`);
  await client.end();
  process.exit(1);
}

await q('BEGIN');
try {
  if (FORCE) {
    await q(`TRUNCATE ${T('assets')}, ${T('price_history')}, ${T('products')}, ${T('gemstone_stones')}, ${T('setting_compatible_shapes')}, ${T('gemstones')}, ${T('settings')}, ${T('gemstone_varieties')}, ${T('gemstone_colours')}, ${T('gemstone_origins')}, ${T('shapes')}, ${T('clarities')}, ${T('treatments')}, ${T('metals')}, ${T('setting_styles')}, ${T('jewellery_types')} CASCADE`);
  }

  // reference rows — families first (doc 42 §4), then varieties with code+family
  for (const [code, name] of Object.entries(FAMILY_NAMES)) {
    await q(`INSERT INTO ${T('gemstone_families')} (code, name, description, sort) VALUES ($1,$2,$3,$4)
             ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description`,
      [code, name, FAMILY_DESCRIPTIONS[code] ?? null, Object.keys(FAMILY_NAMES).indexOf(code)]);
  }
  const { rows: famRows } = await q(`SELECT id, code FROM ${T('gemstone_families')}`);
  const famId = new Map(famRows.map((r) => [r.code, r.id]));

  const refRows = [
    ['gemstone_varieties', ['name', 'slug', 'species', 'family_id', 'code'], 'slug', [
      ...[...varietySlugs].sort().map((slug) => ({
        name: title(slug), slug, species: null,
        family_id: famId.get(VAR_REG[slug]?.[0]) ?? null,
        code: VAR_REG[slug]?.[1] ?? null,
      })),
      ...OWNER_ADDED_VARIETIES.filter((s) => !varietySlugs.has(s)).map((slug) => ({
        name: title(slug), slug, species: null,
        family_id: famId.get(VAR_REG[slug]?.[0]) ?? null,
        code: VAR_REG[slug]?.[1] ?? null,
      })),
    ]],
    ['gemstone_colours', ['name', 'slug'], 'slug', [...new Map([...COLOURS].map((c) => [c, { name: title(c), slug: c }]), ...[...helpVocab.color_help].map((v) => [norm(v), { name: collapseDouble(v), slug: norm(v) }]))].map(([, v]) => v).sort((a, b) => a.slug.localeCompare(b.slug))],
    ['gemstone_origins', ['name', 'slug'], 'slug', [...new Map([...ORIGINS.values(), ...helpVocab.origin_help].map((v) => [norm(v), { name: v, slug: norm(v) }]))].map(([, v]) => v).sort((a, b) => a.slug.localeCompare(b.slug))],
    ['shapes', ['name', 'slug'], 'slug', [...new Map([...SHAPES.values(), ...helpVocab.shape_help].map((v) => [norm(v), { name: v, slug: norm(v) }]))].map(([, v]) => v).sort((a, b) => a.slug.localeCompare(b.slug))],
    ['clarities', ['code', 'name'], 'code', [...helpVocab.clarity_help].map((v) => ({ code: norm(v).toUpperCase().slice(0, 12), name: v })).sort((a, b) => a.name.localeCompare(b.name))],
    ['treatments', ['code', 'name'], 'code', [...helpVocab.enhancements_help].map((v) => ({ code: norm(v).toUpperCase().slice(0, 16), name: v })).sort((a, b) => a.name.localeCompare(b.name))],
    ['metals', ['code', 'name', 'purity', 'sort'], 'code', [...METAL_CODES.entries()].map(([code, [name], ], i) => ({ code, name, purity: code.startsWith('PT') ? '950' : code.startsWith('SL') ? '925' : /^\d[K]+$/.test(code) ? code.slice(1) : null, sort: i }))],
    ['jewellery_types', ['code', 'name', 'sort'], 'code', JEWELLERY_TYPES.map(([code, name], i) => ({ code, name, sort: i }))],
    ['setting_styles', ['name', 'slug'], 'slug', [...new Set([...settingsMap.values()].map((s) => s.style).filter(Boolean), ...[...readyMap.values()].map((r) => r.style).filter(Boolean))].sort().map((s) => ({ name: title(s), slug: s }))],
  ];
  for (const [table, cols, keyCol, rowsIn] of refRows) {
    for (const r of rowsIn) {
      const vals = cols.map((c) => r[c] ?? null);
      const ph = cols.map((_, i) => `$${i + 1}`).join(',');
      const sets = cols.filter((c) => c !== keyCol).map((c) => `${c}=EXCLUDED.${c}`).join(',') || 'id=EXCLUDED.id';
      await q(`INSERT INTO ${T(table)} (${cols.join(',')}) VALUES (${ph}) ON CONFLICT (${keyCol}) DO UPDATE SET ${sets}`, vals);
    }
  }

  const idCache = {};
  // extended treatment vocabulary (doc 41 §6 / 0004 design; survives reloads)
  for (const [code, name] of Object.entries({
    DOUBLET: 'Doublet', TRIPLET: 'Triplet', COATED: 'Coated', GLASSFILL: 'Glass-Filled',
    OILFILL: 'Oil-Filled', NOIND: 'No Indication of Treatment',
  })) {
    await q(`INSERT INTO ${T('treatments')} (code, name) VALUES ($1,$2) ON CONFLICT (code) DO NOTHING`, [code, name]);
  }
  for (const [table, , keyCol] of refRows) {
    const { rows } = await q(`SELECT id, ${keyCol} AS k FROM ${T(table)}`);
    idCache[table] = new Map(rows.map((r) => [String(r.k), r.id]));
  }
  const vid = (t, k) => idCache[t].get(String(k));

  // gemstones + per-pair stone rows — semantic codes (doc 42 §2)
  const codeCounters = new Map(); // scopeKey → last allocated number
  const mintTail = (scopeKey) => {
    const n = (codeCounters.get(scopeKey) ?? 0) + 1;
    codeCounters.set(scopeKey, n);
    return String(n).padStart(5, '0');
  };
  const mintStone = new SlugMinter();
  const gemId = new Map();
  const gemTreatSample = [];
  const orderedGems = gemList.sort((a, b) => (a.kind === b.kind ? Number(a.ref.slice(2)) - Number(b.ref.slice(2)) : a.kind === 'SINGLE' ? -1 : 1));
  for (const g of orderedGems) {
    const [fam, varCode] = VAR_REG[g.variety] ?? [null, null];
    const prefix = g.kind === 'SINGLE' ? 'G' : 'P';
    const scopeKey = `${prefix}|${fam}|${varCode}|${HOUSE_VENDOR}`;
    const pubRef = `${prefix}-${fam}-${varCode}-${HOUSE_VENDOR}-${mintTail(scopeKey)}`;
    const name = [g.colour ? title(collapseDouble(g.colour)) : null, title(g.variety), g.weight != null ? `${g.weight}ct` : null, g.shape ?? null].filter(Boolean).join(' ');
    const slug = mintStone.mint([g.colour ? norm(collapseDouble(g.colour)) : null, norm(g.variety), g.shape ? norm(g.shape) : null, g.weight != null ? `${g.weight}ct` : null, g.kind === 'PAIR' ? 'pair' : null]);
    const treatmentId = g.treatment ? (vid('treatments', norm(g.treatment).toUpperCase().slice(0, 16)) ?? null) : null;
    const { rows } = await q(
      `INSERT INTO ${T('gemstones')} (ref,slug,name,variety_id,colour_id,origin_id,shape_id,clarity_id,treatment_id,kind,pieces,weight_ct,description,price_amount,currency,quantity,status,origin_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NULL,$13,$14,1,$15,'NATURAL') RETURNING id`,
      [pubRef, slug, name,
        vid('gemstone_varieties', g.variety) ?? null,
        g.colour ? (vid('gemstone_colours', norm(collapseDouble(g.colour))) ?? null) : null,
        g.origin ? (vid('gemstone_origins', norm(collapseDouble(g.origin))) ?? null) : null,
        g.shape ? (vid('shapes', norm(g.shape)) ?? null) : null,
        g.clarity ? (vid('clarities', norm(g.clarity).toUpperCase().slice(0, 12)) ?? null) : null,
        treatmentId,
        g.kind, g.kind === 'PAIR' ? 2 : 1, g.weight, g.price, g.currency ?? 'USD', g.price != null ? 'ACTIVE' : 'DRAFT'],
    );
    gemId.set(g.ref, rows[0].id);
    if (treatmentId) {
      await q(`INSERT INTO ${T('gemstone_treatments')} (gemstone_id, treatment_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [rows[0].id, treatmentId]);
      gemTreatSample.push(1);
    }
    for (const s of g.stoneRows) {
      await q(`INSERT INTO ${T('gemstone_stones')} (gemstone_id,position,weight_ct,length_mm,width_mm,depth_mm) VALUES ($1,$2,$3,$4,$5,$6)`,
        [rows[0].id, s.position, s.weight, s.l, s.w, s.h]);
    }
  }

  // settings — semantic code S-{JT}-{DSGN}-{MET}-{CCVV} (doc 42 §2; no seq needed)
  const mintSetting = new SlugMinter();
  const settingId = new Map();
  const orderedSettings = [...settingsMap.values()].sort((a, b) => a.key.localeCompare(b.key));
  for (const s of orderedSettings) {
    const design = `JS${s.core}`;
    const code = `S-${JT_LETTER[s.jewelleryType]}-${design}-${s.metalCode}-${HOUSE_VENDOR}`;
    const metal = METAL_CODES.get(s.metalCode);
    const name = [s.style ? title(s.style) : null, JT_WORD[s.jewelleryType], 'Setting', metal[0]].filter(Boolean).join(' ');
    const slug = mintSetting.mint([s.style, SETTING_TYPE_WORD[s.jewelleryType], 'setting', metal[1], `js${s.core}`]);
    const { rows } = await q(
      `INSERT INTO ${T('settings')} (ref,slug,sku,name,design_code,jewellery_type_id,style_id,metal_id,description,price_amount,currency,status)
       VALUES ($1,$2,$1,$3,$4,$5,$6,$7,NULL,NULL,'USD','DRAFT') RETURNING id`,
      [code, slug, name, design,
        vid('jewellery_types', s.jewelleryType),
        s.style ? (vid('setting_styles', s.style) ?? null) : null,
        vid('metals', s.metalCode)],
    );
    settingId.set(s.key, rows[0].id);
  }

  // products — semantic codes J-{JT}-C/M-{MET}-{CCVV}-{seq} (doc 42 §2)
  const mintProduct = new SlugMinter();
  const pageProductId = new Map();
  for (const c of [...configured].sort((a, b) => a.page.url.localeCompare(b.page.url))) {
    const g = gemstones.get(c.page.ref);
    const jt = c.page.jt ?? 'RING';
    const metalCode = settingsMap.get(c.settingKey)?.metalCode ?? 'NA';
    const scopeKey = `J|${JT_LETTER[jt]}|C|${metalCode}|${HOUSE_VENDOR}`;
    const ref = `J-${JT_LETTER[jt]}-C-${metalCode}-${HOUSE_VENDOR}-${mintTail(scopeKey)}`;
    const slug = mintProduct.mint([g.colour ? norm(collapseDouble(g.colour)) : null, norm(g.variety), g.shape ? norm(g.shape) : null, g.weight != null ? `${g.weight}ct` : null, JT_WORD[jt]?.toLowerCase(), c.settingKey.toLowerCase()]);
    const { rows } = await q(
      `INSERT INTO ${T('products')} (ref,slug,name,jewellery_type_id,kind,setting_id,gemstone_id,description,price_amount,making_fee_amount,currency,status)
       VALUES ($1,$2,$3,$4,'CONFIGURED',$5,$6,NULL,$7,NULL,$8,$9) RETURNING id`,
      [ref, slug, c.page.name, vid('jewellery_types', jt),
        settingId.get(c.settingKey), gemId.get(g.ref), c.page.price, c.page.currency ?? 'USD',
        c.page.price != null ? 'ACTIVE' : 'DRAFT'],
    );
    pageProductId.set(c.page.url, rows[0].id);
    if (c.page.price != null) {
      await q(`INSERT INTO ${T('price_history')} (entity_kind,entity_id,amount,currency,reason) VALUES ('product',$1,$2,$3,'initial clean load (observed source price)')`,
        [rows[0].id, c.page.price, c.page.currency ?? 'USD']);
    }
  }
  for (const r of [...readyMap.values()].sort((a, b) => Number(a.jRef) - Number(b.jRef))) {
    const jt = r.jewelleryType;
    const metalCode = r.metalCode ?? 'NA';
    const scopeKey = `J|${JT_LETTER[jt]}|M|${metalCode}|${HOUSE_VENDOR}`;
    const ref = `J-${JT_LETTER[jt]}-M-${metalCode}-${HOUSE_VENDOR}-${mintTail(scopeKey)}`;
    const name = [r.variety ? title(r.variety) : 'Gemstone', r.style ? title(r.style) : null, JT_WORD[jt], r.shape ?? null, r.metalName ?? null].filter(Boolean).join(' ');
    const slug = mintProduct.mint([r.variety, r.style, r.shape ? norm(r.shape) : null, norm(jt), r.metalName ? norm(r.metalName) : null, `j${r.jRef}`]);
    await q(
      `INSERT INTO ${T('products')} (ref,slug,name,jewellery_type_id,kind,setting_id,gemstone_id,description,price_amount,making_fee_amount,currency,status)
       VALUES ($1,$2,$3,$4,'READY_MADE',NULL,NULL,NULL,NULL,NULL,'USD','DRAFT')`,
      [ref, slug, name, vid('jewellery_types', jt)],
    );
  }

  // seed the atomic minting registry (doc 42 §6): counters continue after the load
  for (const [scopeKey, last] of codeCounters) {
    await q(`INSERT INTO ${T('code_counters')} (scope_key, next_no) VALUES ($1,$2)
             ON CONFLICT (scope_key) DO UPDATE SET next_no = GREATEST(${T('code_counters')}.next_no, EXCLUDED.next_no)`,
      [scopeKey, last + 1]);
  }

  // assets — TNSC product photography, deduped per configured product page
  const assetsByPage = new Map();
  await readJsonl(path.join(DATA, 'media_analyzed.jsonl'), (j) => {
    const u = j.image_url || '';
    if (!/thenaturalsapphirecompany\.com/.test(u)) return;
    if (!assetsByPage.has(j.page_url)) assetsByPage.set(j.page_url, new Map());
    const m = assetsByPage.get(j.page_url);
    if (!m.has(u)) m.set(u, j.position ?? 0);
  });
  let assetRows = 0, assetOrphans = 0, assetTrimmed = 0;
  for (const [pageUrl, imgs] of [...assetsByPage.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const pid = pageProductId.get(pageUrl);
    if (!pid) { assetOrphans++; continue; }
    // owner media rule (doc 42 §7 / 0005): ≤10 images per item — keep best 10 by position
    const ordered = [...imgs.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
    assetTrimmed += Math.max(0, ordered.length - 10);
    let pos = 0;
    for (const [u] of ordered.slice(0, 10)) {
      await q(`INSERT INTO ${T('assets')} (owner_kind,owner_id,role,kind,url,position,alt) VALUES ('product',$1,$2,'IMAGE',$3,$4,NULL)`,
        [pid, pos === 0 ? 'PRIMARY' : 'GALLERY', u, pos]);
      pos++; assetRows++;
    }
  }

  await q('COMMIT');
  console.log(`assets inserted: ${assetRows} (trimmed over the 10-image cap: ${assetTrimmed}; orphan pages skipped: ${assetOrphans})`);
} catch (e) {
  await q('ROLLBACK');
  console.error('LOAD FAILED — rolled back:', e.message);
  await client.end();
  process.exit(1);
}

// ---------------------------------------------------------------------------
// verify
// ---------------------------------------------------------------------------

const { rows: v } = await q(`SELECT
  (SELECT count(*) FROM ${T('gemstones')}) AS gemstones,
  (SELECT count(*) FROM ${T('gemstone_stones')}) AS stones,
  (SELECT count(*) FROM ${T('settings')}) AS settings,
  (SELECT count(*) FROM ${T('products')}) AS products,
  (SELECT count(*) FROM ${T('products')} WHERE price_amount IS NOT NULL) AS priced,
  (SELECT count(*) FROM ${T('assets')}) AS assets,
  (SELECT count(*) FROM ${T('price_history')}) AS price_history,
  (SELECT count(*) FROM ${T('gemstone_varieties')}) AS varieties`);
console.log('— DB VERIFY —', v[0]);
await client.end();
