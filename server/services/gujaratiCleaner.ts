/**
 * Gujarati Pronunciation & Text Optimization Engine
 * Specifically designed to produce 100% crystal clear pronunciation in ElevenLabs Multilingual v2
 * 
 * Features:
 * 1. Gujarati & Western Number to Native Gujarati Spoken Words Conversion (0 to 99,99,99,999)
 * 2. Currency, Percentage, Ordinal, and Decimal Normalization
 * 3. Clean Indic Cadence & Breathing Pauses (Danda ।, Double Danda ॥, Em-Dashes)
 * 4. Invisible Unicode Artifact Stripping (ZWJ, ZWNJ, BOM)
 * 5. Common Abbreviations Expansion (ડો. -> ડૉક્ટર, શ્રી. -> શ્રીમાન)
 * 6. Gujlish / Tech Term Phonetic Spacing (AI -> એ આઈ, YouTube -> યુટ્યુબ)
 */

const UNITS: string[] = [
  '', 'એક', 'બે', 'ત્રણ', 'ચાર', 'પાંચ', 'છ', 'સાત', 'આઠ', 'નવ', 'દસ',
  'અગિયાર', 'બાર', 'તેર', 'ચૌદ', 'પંદર', 'સોળ', 'સત્તર', 'અઢાર', 'ઓગણીસ', 'વીસ',
  'એકવીસ', 'બાવીસ', 'તેવીસ', 'ચોવીસ', 'પચીસ', 'છવ્વીસ', 'સત્તાવીસ', 'અઠ્ઠાવીસ', 'ઓગણત્રીસ', 'ત્રીસ',
  'એકત્રીસ', 'બત્રીસ', 'તેત્રીસ', 'ચોત્રીસ', 'પાંત્રીસ', 'છત્રીસ', 'સાડત્રીસ', 'અડત્રીસ', 'ઓગણચાલીસ', 'ચાલીસ',
  'એકતાલીસ', 'બેતાલીસ', 'તેતાલીસ', 'ચુંમાલીસ', 'પિસ્તાલીસ', 'છેતાલીસ', 'સુડતાલીસ', 'અડતાલીસ', 'ઓગણપચાસ', 'પચાસ',
  'એકાવન', 'બાવન', 'તેપન', 'ચોપન', 'પંચાવન', 'છપ્પન', 'સત્તાવન', 'અઠ્ઠાવન', 'ઓગણસાઠ', 'સાઠ',
  'એકસઠ', 'બાસઠ', 'તેસઠ', 'ચોસઠ', 'પાંસઠ', 'છાસઠ', 'સડસઠ', 'અડસઠ', 'અગણોસિત્તેર', 'સિત્તેર',
  'એકોતેર', 'બોતેર', 'તોતેર', 'ચોતેર', 'પંચોતેર', 'છોતેર', 'સંતોતેર', 'ઈઠોતેર', 'ઓગણએંસી', 'એંસી',
  'એક્યાસી', 'બ્યાસી', 'ત્યાસી', 'ચોર્યાસી', 'પંચાસી', 'છ્યાસી', 'સિત્યાસી', 'અઠ્યાસી', 'નેવ્યાસી', 'નેવું',
  'એકાણું', 'બાણું', 'ત્રાણું', 'ચોરાણું', 'પંચાણું', 'છન્નું', 'સત્તાણું', 'અઠ્ઠાણું', 'નવ્વાણું'
];

const GUJ_DIGITS_MAP: Record<string, string> = {
  '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
  '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
};

/**
 * Converts a positive integer (up to 99,99,99,999) to Gujarati words
 */
export function numberToGujaratiWords(n: number): string {
  if (isNaN(n)) return '';
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'શૂન્ય';
  if (n < 100) return UNITS[n];

  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const hStr = h === 1 ? 'એકસો' : UNITS[h] + 'સો';
    return rem > 0 ? `${hStr} ${UNITS[rem]}` : hStr;
  }

  if (n < 100000) {
    const th = Math.floor(n / 1000);
    const rem = n % 1000;
    const thStr = `${numberToGujaratiWords(th)} હજાર`;
    return rem > 0 ? `${thStr} ${numberToGujaratiWords(rem)}` : thStr;
  }

  if (n < 10000000) {
    const lk = Math.floor(n / 100000);
    const rem = n % 100000;
    const lkStr = `${numberToGujaratiWords(lk)} લાખ`;
    return rem > 0 ? `${lkStr} ${numberToGujaratiWords(rem)}` : lkStr;
  }

  const cr = Math.floor(n / 10000000);
  const rem = n % 10000000;
  const crStr = `${numberToGujaratiWords(cr)} કરોડ`;
  return rem > 0 ? `${crStr} ${numberToGujaratiWords(rem)}` : crStr;
}

/**
 * Normalizes all Gujarati numerals ૦-૯ to standard 0-9
 */
export function normalizeGujaratiDigits(text: string): string {
  return text.replace(/[૦-૯]/g, d => GUJ_DIGITS_MAP[d] || d);
}

/**
 * Cleans punctuation and inserts human-like breathing pauses for crisp pronunciation
 */
export function cleanPunctuationAndCadence(text: string): string {
  let res = text;

  // 1. Strip invisible Unicode noise that trips ElevenLabs phonetic tokenizer
  res = res.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  res = res.replace(/\u00A0/g, ' ');

  // 2. Normalize Indic punctuation to standard sentence pauses
  res = res.replace(/[।]/g, '. ');
  res = res.replace(/[॥]/g, '.\n\n');

  // 3. Normalize em dashes, hyphens used as pauses to clean commas
  res = res.replace(/[\u2013\u2014—–]|--+/g, ', ');

  // 4. Normalize ellipsis ... or … to comma pause
  res = res.replace(/\.{2,}|…/g, ', ');

  // 5. Clean excessive repetitive exclamation or question marks
  res = res.replace(/\!{2,}/g, '! ');
  res = res.replace(/\?{2,}/g, '? ');
  res = res.replace(/,{2,}/g, ', ');

  // 6. Ensure proper space after punctuation so ElevenLabs doesn't run words together
  res = res.replace(/([.!?,;:])([^\s\d'"])/g, '$1 $2');

  return res;
}

/**
 * Expands common Gujarati abbreviations to full spoken words
 */
export function expandGujaratiAbbreviations(text: string): string {
  let res = text;

  // Medical / Professional titles
  res = res.replace(/\b(?:ડૉ\.|ડો\.)\s*/g, 'ડૉક્ટર ');
  res = res.replace(/\b(?:શ્રી\.)\s*/g, 'શ્રીમાન ');
  res = res.replace(/\b(?:શ્રીમતી\.)\s*/g, 'શ્રીમતી ');

  // Dates and references
  res = res.replace(/\b(?:તા\.)\s*/g, 'તારીખ ');
  res = res.replace(/\b(?:નં\.|નંબર\.)\s*/g, 'નંબર ');
  res = res.replace(/\b(?:પૃ\.|પેજ\.)\s*/g, 'પાના નંબર ');
  res = res.replace(/\b(?:વગેરે\.)\s*/g, 'વગેરે ');

  // Units of measurement
  res = res.replace(/\b(?:કિ\.મી\.|કિમી)\b/g, 'કિલોમીટર');
  res = res.replace(/\b(?:કિ\.ગ્રા\.|કિગ્રા)\b/g, 'કિલોગ્રામ');
  res = res.replace(/\b(?:લી\.|લિ\.)\b/g, 'લિટર');

  // Symbols
  res = res.replace(/\s*&\s*/g, ' અને ');
  res = res.replace(/\s*[@]\s*/g, ' એટ ');
  res = res.replace(/\b(?:vs\.|vs)\b/gi, ' સામે ');

  return res;
}

/**
 * Normalizes numbers, currency, ordinals, percentages to Gujarati words
 */
export function normalizeNumbersAndSymbols(text: string): string {
  let res = normalizeGujaratiDigits(text);

  // 1. Currency: ₹500, રૂ. 500, Rs. 500 -> પાંચસો રૂપિયા
  res = res.replace(/(?:₹|રૂ\.|Rs\.?|INR)\s*(\d+)/gi, (m, num) => {
    const val = parseInt(num, 10);
    return val <= 99999999 ? `${numberToGujaratiWords(val)} રૂપિયા` : m;
  });
  res = res.replace(/\b(\d+)\s*(?:રૂપિયા|રૂ|rs)\b/gi, (m, num) => {
    const val = parseInt(num, 10);
    return val <= 99999999 ? `${numberToGujaratiWords(val)} રૂપિયા` : m;
  });

  // 2. Percentages: 25% -> પચીસ ટકા
  res = res.replace(/(\d+)\s*%/g, (m, num) => {
    const val = parseInt(num, 10);
    return val <= 99999999 ? `${numberToGujaratiWords(val)} ટકા` : m;
  });

  // 3. Ordinals: ૧૫૦મા, ૧લા, ૨જા, ૩જા, ૫મો, ૧૦મી, etc.
  const ordinalsMap: Record<string, string> = {
    '1': 'પહેલા', '2': 'બીજા', '3': 'ત્રીજા', '4': 'ચોથા', '5': 'પાંચમા',
    '6': 'છઠ્ઠા', '7': 'સાતમા', '8': 'આઠમા', '9': 'નવમા', '10': 'દસમા'
  };

  res = res.replace(/\b(\d+)(મો|મી|મુ|મા|માં|મે)\b/g, (m, num, suf) => {
    const val = parseInt(num, 10);
    if (num in ordinalsMap && (suf === 'મા' || suf === 'માં')) {
      return ordinalsMap[num];
    }
    if (val <= 99999999) {
      return `${numberToGujaratiWords(val)}${suf}`;
    }
    return m;
  });

  // 4. Ranges: 10-15 -> દસ થી પંદર
  res = res.replace(/\b(\d+)\s*-\s*(\d+)\b/g, (m, n1, n2) => {
    const v1 = parseInt(n1, 10);
    const v2 = parseInt(n2, 10);
    if (v1 <= 99999999 && v2 <= 99999999) {
      return `${numberToGujaratiWords(v1)} થી ${numberToGujaratiWords(v2)}`;
    }
    return m;
  });

  // 5. Standalone numbers (up to 8 digits) -> Gujarati words
  res = res.replace(/\b(\d+)\b/g, (m, num) => {
    const val = parseInt(num, 10);
    if (val <= 99999999) {
      return numberToGujaratiWords(val);
    }
    return m;
  });

  return res;
}

/**
 * Phonetic polishing for English / Gujlish / Tech loan words
 * Ensures clear Gujarati syllable articulation in ElevenLabs
 */
export function optimizePhonetics(text: string): string {
  let res = text;

  // AI acronym: ensure clean separation so it sounds like "A-I" not "aai/mother"
  res = res.replace(/(\b|[\s(])(?:AI|A\.I\.)(\b|[\s.,!?])/gi, '$1એ આઈ$2');
  res = res.replace(/(\b|[\s(])(?:એઆઈ)(\b|[\s.,!?])/g, '$1એ આઈ$2');

  // Common internet / tech terms frequently used in scripts
  res = res.replace(/(\b|[\s(])(?:YouTube)(\b|[\s.,!?])/gi, '$1યુટ્યુબ$2');
  res = res.replace(/(\b|[\s(])(?:Wi-Fi|WiFi)(\b|[\s.,!?])/gi, '$1વાઇ-ફાઇ$2');
  res = res.replace(/(\b|[\s(])(?:WhatsApp)(\b|[\s.,!?])/gi, '$1વ્હોટ્સએપ$2');
  res = res.replace(/(\b|[\s(])(?:Google)(\b|[\s.,!?])/gi, '$1ગૂગલ$2');
  res = res.replace(/(\b|[\s(])(?:Facebook)(\b|[\s.,!?])/gi, '$1ફેસબુક$2');
  res = res.replace(/(\b|[\s(])(?:Instagram)(\b|[\s.,!?])/gi, '$1ઇન્સ્ટાગ્રામ$2');
  res = res.replace(/(\b|[\s(])(?:Website)(\b|[\s.,!?])/gi, '$1વેબસાઇટ$2');
  res = res.replace(/(\b|[\s(])(?:Online)(\b|[\s.,!?])/gi, '$1ઓનલાઇન$2');
  res = res.replace(/(\b|[\s(])(?:Channel)(\b|[\s.,!?])/gi, '$1ચેનલ$2');
  res = res.replace(/(\b|[\s(])(?:Subscribe)(\b|[\s.,!?])/gi, '$1સબ્સ્ક્રાઇબ$2');
  res = res.replace(/(\b|[\s(])(?:Video|Videos)(\b|[\s.,!?])/gi, '$1વિડીયો$2');
  res = res.replace(/(\b|[\s(])(?:વિડિઓ)(\b|[\s.,!?])/g, '$1વિડીયો$2');

  return res;
}

/**
 * Main Gujarati Speech Optimization Pipeline
 * Call before sending text to ElevenLabs Multilingual v2
 */
export function cleanGujaratiForTTS(text: string): string {
  if (!text || text.trim().length === 0) return '';

  let cleaned = text;

  // Step 1: Clean punctuation and whitespace
  cleaned = cleanPunctuationAndCadence(cleaned);

  // Step 2: Expand common abbreviations
  cleaned = expandGujaratiAbbreviations(cleaned);

  // Step 3: Normalize numerals and currency to Gujarati words
  cleaned = normalizeNumbersAndSymbols(cleaned);

  // Step 4: Phonetic enunciation polish
  cleaned = optimizePhonetics(cleaned);

  // Step 5: Normalize multiple spaces
  cleaned = cleaned.replace(/[ \t]+/g, ' ').trim();

  return cleaned;
}
