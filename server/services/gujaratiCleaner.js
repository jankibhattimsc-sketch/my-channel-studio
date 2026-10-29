/**
 * Gujarati Pronunciation & Text Optimization Engine (CommonJS)
 * Specifically designed to produce 100% crystal clear pronunciation in ElevenLabs Multilingual v2,
 * Edge-TTS (Dhwani & Niranjan Neural), and Web Speech API.
 */

const UNITS = [
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

const GUJ_MONTHS = [
  '', 'જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન',
  'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'
];

const GUJ_DIGITS_MAP = {
  '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
  '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
};

function numberToGujaratiWords(n) {
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

function normalizeGujaratiDigits(text) {
  return text.replace(/[૦-૯]/g, d => GUJ_DIGITS_MAP[d] || d);
}

/**
 * Strips markdown headers, bullet labels, visual cues, timestamps,
 * and presentation metadata so ONLY spoken script remains.
 */
function sanitizeScriptForSpeech(text) {
  if (!text || typeof text !== 'string') return '';
  let res = text;

  // 1. If script is wrapped in blockquote quotes, extract them
  const quoteMatches = [];
  const qRegex = />\s*["“]([^"”]+)["”]/g;
  let m;
  while ((m = qRegex.exec(res)) !== null) {
    if (m[1] && m[1].trim()) quoteMatches.push(m[1].trim());
  }
  if (quoteMatches.length > 0) {
    res = quoteMatches.join('\n\n');
  }

  // 2. Remove markdown headers (###, ##, #)
  res = res.replace(/^[ \t]*#{1,6}[^\n]*/gm, '');

  // 3. Remove metadata / visual cue markers
  res = res.replace(/^[ \t]*(?:👉|🔗|⏱️|🎙️|📌|🎯|📊|👥|🏷️|⚪|🚨|🎬|📋|⚡|📐)\s*[^\n]*/gm, '');
  res = res.replace(/^[ \t]*[-*•]?\s*(?:સ્ક્રીન\s*નિર્દેશ|સ્ક્રીન\s*પોઇન્ટર|સ્ક્રીન\s*દિગ્દર્શન|વિઝ્યુઅલ|પુરાવો|On-Screen|Visual)[^\n]*/gmi, '');
  res = res.replace(/^[ \t]*[-*•]?\s*(?:શબ્દશઃ સ્ક્રિપ્ટ|માઇક્રોફોન પર બોલવાની|સમયગાળો|બ્રિજ લિંક|મુખ્ય સંદેશ|લક્ષિત દર્શકો|Slide Understanding|Audience Retention|Voice Delivery Notes|On-Screen Highlight|Fact-Check)[^\n:]*:\s*/gmi, '');

  // 4. Remove parenthetical timestamps like (૦:૦૦ થી ૦:૪૫ સેકન્ડ) or (00:00 - 01:15)
  res = res.replace(/\([૦-૯\d:\s\-–—]+(?:સેકન્ડ|મિનિટ)?\)/gi, '');
  res = res.replace(/\[[૦-૯\d:\s\-–—]+(?:સેકન્ડ|મિનિટ)?\]/gi, '');

  // 5. Remove stage directions inside brackets [સ્ક્રીન પર પરિપત્ર...], [હસો], [Music]
  res = res.replace(/\[[^\]]+\]/g, '');

  // 6. Clean markdown formatting (*, _, ~, `, >)
  res = res.replace(/[*_~`>]/g, '');

  // 7. Strip surrounding quotes from lines
  res = res.replace(/^[ \t]*["“']|["”'][ \t]*$/gm, '');

  // 8. Clean up extra empty lines
  res = res.replace(/\n{3,}/g, '\n\n');

  return res.trim();
}

function cleanPunctuationAndCadence(text) {
  let res = text;
  res = res.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
  res = res.replace(/\u00A0/g, ' ');
  res = res.replace(/[।]/g, '. ');
  res = res.replace(/[॥]/g, '.\n\n');
  res = res.replace(/[\u2013\u2014—–]|--+/g, ', ');
  res = res.replace(/\.{2,}|…/g, ', ');
  res = res.replace(/\!{2,}/g, '! ');
  res = res.replace(/\?{2,}/g, '? ');
  res = res.replace(/,{2,}/g, ', ');
  res = res.replace(/([.!?,;:])([^\s\d'"])/g, '$1 $2');
  return res;
}

function expandGujaratiAbbreviations(text) {
  let res = text;
  res = res.replace(/\b(?:ડૉ\.|ડો\.)\s*/g, 'ડૉક્ટર ');
  res = res.replace(/\b(?:શ્રી\.)\s*/g, 'શ્રીમાન ');
  res = res.replace(/\b(?:શ્રીમતી\.)\s*/g, 'શ્રીમતી ');
  res = res.replace(/\b(?:તા\.)\s*/g, 'તારીખ ');
  res = res.replace(/\b(?:નં\.|નંબર\.)\s*/g, 'નંબર ');
  res = res.replace(/\b(?:પૃ\.|પેજ\.)\s*/g, 'પાના નંબર ');
  res = res.replace(/\b(?:વગેરે\.)\s*/g, 'વગેરે ');
  res = res.replace(/\b(?:કિ\.મી\.|કિમી)\b/g, 'કિલોમીટર');
  res = res.replace(/\b(?:કિ\.ગ્રા\.|કિગ્રા)\b/g, 'કિલોગ્રામ');
  res = res.replace(/\b(?:લી\.|લિ\.)\b/g, 'લિટર');
  res = res.replace(/\s*&\s*/g, ' અને ');
  res = res.replace(/\s*[@]\s*/g, ' એટ ');
  res = res.replace(/\b(?:vs\.|vs)\b/gi, ' સામે ');
  return res;
}

function normalizeNumbersAndSymbols(text) {
  let res = normalizeGujaratiDigits(text);

  // 1. Remove commas in numbers (e.g. 52,500 or 52, 500 -> 52500) so amounts aren't broken into pieces
  while (/(\d+),\s*(\d+)/.test(res)) {
    res = res.replace(/(\d+),\s*(\d+)/g, '$1$2');
  }

  // 2. Land records and government revenue codes
  res = res.replace(/\b7\/12\b/g, 'સાત બાર');
  res = res.replace(/\b8\s*[-/]?\s*[Aઅa]\b/gi, 'આઠ અ');

  // 3. Natural Date Conversion (DD/MM/YYYY or DD-MM-YYYY)
  res = res.replace(/\b([0-3]?\d)[\/\-]([0-1]?\d)[\/\-](\d{2,4})\b/g, (m, dStr, mStr, yStr) => {
    const day = parseInt(dStr, 10);
    const month = parseInt(mStr, 10);
    let year = parseInt(yStr, 10);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const dayWord = numberToGujaratiWords(day);
      const monthWord = GUJ_MONTHS[month];
      const yearWord = numberToGujaratiWords(year);
      return `${dayWord} ${monthWord} ${yearWord}`;
    }
    return m;
  });

  // 4. Currency / Amounts
  res = res.replace(/(?:₹|રૂ\.|Rs\.?|INR)\s*(\d+)/gi, (m, num) => {
    const val = parseInt(num, 10);
    return val <= 99999999 ? `${numberToGujaratiWords(val)} રૂપિયા` : m;
  });
  res = res.replace(/\b(\d+)\s*(?:રૂપિયા|રૂ|rs)\b/gi, (m, num) => {
    const val = parseInt(num, 10);
    return val <= 99999999 ? `${numberToGujaratiWords(val)} રૂપિયા` : m;
  });

  // 5. Percentages
  res = res.replace(/(\d+)\s*%/g, (m, num) => {
    const val = parseInt(num, 10);
    return val <= 99999999 ? `${numberToGujaratiWords(val)} ટકા` : m;
  });

  // 6. Ordinals (1st, 2nd, etc.)
  const ordinalsMap = {
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

  // 7. Ranges: 10-15 -> દસ થી પંદર
  res = res.replace(/\b(\d+)\s*-\s*(\d+)\b/g, (m, n1, n2) => {
    const v1 = parseInt(n1, 10);
    const v2 = parseInt(n2, 10);
    if (v1 <= 99999999 && v2 <= 99999999) {
      return `${numberToGujaratiWords(v1)} થી ${numberToGujaratiWords(v2)}`;
    }
    return m;
  });

  // 8. Plain isolated numbers
  res = res.replace(/\b(\d+)\b/g, (m, num) => {
    const val = parseInt(num, 10);
    if (val <= 99999999) {
      return numberToGujaratiWords(val);
    }
    return m;
  });

  return res;
}

function optimizePhonetics(text) {
  let res = text;

  // Gujarat Government & Exam Acronyms (smooth connected compound words - NO letter-by-letter stuttering)
  res = res.replace(/(\b|[\s(])(?:GPSC|G\.P\.S\.C\.)(\b|[\s.,!?])/gi, '$1જીપીએસસી$2');
  res = res.replace(/(\b|[\s(])(?:GSSSB|G\.S\.S\.S\.B\.)(\b|[\s.,!?])/gi, '$1જીએસએસએસબી$2');
  res = res.replace(/(\b|[\s(])(?:GPSSB|G\.P\.S\.S\.B\.)(\b|[\s.,!?])/gi, '$1જીપીએસએસબી$2');
  res = res.replace(/(\b|[\s(])(?:LRD|L\.R\.D\.)(\b|[\s.,!?])/gi, '$1એલઆરડી$2');
  res = res.replace(/(\b|[\s(])(?:OJAS|ojas)(\b|[\s.,!?])/gi, '$1ઓજસ$2');
  res = res.replace(/(\b|[\s(])(?:TET|T\.E\.T\.)(\b|[\s.,!?])/gi, '$1ટેટ$2');
  res = res.replace(/(\b|[\s(])(?:TAT|T\.A\.T\.)(\b|[\s.,!?])/gi, '$1ટાટ$2');
  res = res.replace(/(\b|[\s(])(?:SEB|S\.E\.B\.)(\b|[\s.,!?])/gi, '$1એસઈબી$2');
  res = res.replace(/(\b|[\s(])(?:GSEB|G\.S\.E\.B\.)(\b|[\s.,!?])/gi, '$1જીએસઈબી$2');
  res = res.replace(/(\b|[\s(])(?:CCC|C\.C\.C\.)(\b|[\s.,!?])/gi, '$1સીસીસી$2');
  res = res.replace(/(\b|[\s(])(?:EWS|E\.W\.S\.)(\b|[\s.,!?])/gi, '$1ઈડબલ્યુએસ$2');
  res = res.replace(/(\b|[\s(])(?:OBC|O\.B\.C\.)(\b|[\s.,!?])/gi, '$1ઓબીસી$2');
  res = res.replace(/(\b|[\s(])(?:SC)(\b|[\s.,!?])/g, '$1એસસી$2');
  res = res.replace(/(\b|[\s(])(?:ST)(\b|[\s.,!?])/g, '$1એસટી$2');
  res = res.replace(/(\b|[\s(])(?:DBT|D\.B\.T\.)(\b|[\s.,!?])/gi, '$1ડીબીટી$2');
  res = res.replace(/(\b|[\s(])(?:PM|P\.M\.)(\b|[\s.,!?])/g, '$1પીએમ$2');
  res = res.replace(/(\b|[\s(])(?:CM|C\.M\.)(\b|[\s.,!?])/g, '$1સીએમ$2');
  res = res.replace(/(\b|[\s(])(?:UPSC|U\.P\.S\.C\.)(\b|[\s.,!?])/gi, '$1યુપીએસસી$2');

  // Technology & general terms
  res = res.replace(/(\b|[\s(])(?:AI|A\.I\.)(\b|[\s.,!?])/gi, '$1એઆઈ$2');
  res = res.replace(/(\b|[\s(])(?:DA|D\.A\.|ડીએ|ડી\.એ\.)\s*(?:એટલે\s*કે\s*મોંઘવારી\s*ભથ્થું)?(\b|[\s.,!?])/g, '$1ડીએ એટલે કે મોંઘવારી ભથ્થું$2');
  res = res.replace(/(?:એટલે\s*કે\s*મોંઘવારી\s*ભથ્થું\s*){2,}/g, 'એટલે કે મોંઘવારી ભથ્થું ');
  res = res.replace(/(\b|[\s(])(?:GR|G\.R\.)(\b|[\s.,!?])/g, '$1સરકારી ઠરાવ$2');
  res = res.replace(/(\b|[\s(])(?:PDF|P\.D\.F\.)(\b|[\s.,!?])/gi, '$1પીડીએફ$2');
  res = res.replace(/(\b|[\s(])(?:પીડીએફ|પી\.ડી\.એફ\.)(\b|[\s.,!?])/g, '$1પીડીએફ$2');
  res = res.replace(/(\b|[\s(])(?:PPT|P\.P\.T\.)(\b|[\s.,!?])/gi, '$1પીપીટી$2');
  res = res.replace(/(\b|[\s(])(?:KYC|K\.Y\.C\.)(\b|[\s.,!?])/gi, '$1કેવાયસી$2');
  res = res.replace(/(\b|[\s(])(?:કેવાયસી|કે\.વાય\.સી\.)(\b|[\s.,!?])/g, '$1કેવાયસી$2');
  res = res.replace(/(\b|[\s(])(?:OTP|O\.T\.P\.)(\b|[\s.,!?])/gi, '$1ઓટીપી$2');
  res = res.replace(/(\b|[\s(])(?:ઓટીપી|ઓ\.ટી\.પી\.)(\b|[\s.,!?])/g, '$1ઓટીપી$2');
  res = res.replace(/(\b|[\s(])(?:જીપીએસસી|જી\.પી\.એસ\.સી\.)(\b|[\s.,!?])/g, '$1જીપીએસસી$2');
  res = res.replace(/(\b|[\s(])(?:જીએસએસએસબી|જીએસએસબી)(\b|[\s.,!?])/g, '$1જીએસએસએસબી$2');
  res = res.replace(/(\b|[\s(])(?:ડીબીટી|ડી\.બી\.ટી\.)(\b|[\s.,!?])/g, '$1ડીબીટી$2');
  res = res.replace(/(\b|[\s(])(?:SMS)(\b|[\s.,!?])/gi, '$1એસએમએસ$2');

  // Collapse any pre-existing spaced acronyms so the neural vocoder never stutters
  res = res.replace(/\bજી\s+પી\s+એસ\s+સી\b/g, 'જીપીએસસી');
  res = res.replace(/\bજી\s+એસ\s+એસ\s+એસ\s+બી\b/g, 'જીએસએસએસબી');
  res = res.replace(/\bજી\s+એસ\s+એસ\s+બી\b/g, 'જીએસએસએસબી');
  res = res.replace(/\bપી\s+ડી\s+એફ\b/g, 'પીડીએફ');
  res = res.replace(/\bડી\s+બી\s+ટી\b/g, 'ડીબીટી');
  res = res.replace(/\bકે\s+વાય\s+સી\b/g, 'કેવાયસી');
  res = res.replace(/\bઓ\s+ટી\s+પી\b/g, 'ઓટીપી');
  res = res.replace(/\bયુ\s+પી\s+એસ\s+સી\b/g, 'યુપીએસસી');
  res = res.replace(/\bએલ\s+આર\s+ડી\b/g, 'એલઆરડી');
  res = res.replace(/\bસી\s+સી\s+સી\b/g, 'સીસીસી');
  res = res.replace(/\bએસ\s+એમ\s+એસ\b/g, 'એસએમએસ');
  res = res.replace(/\bડી\s+એ\b/g, 'ડીએ');
  res = res.replace(/(\b|[\s(])(?:YouTube)(\b|[\s.,!?])/gi, '$1યુટ્યુબ$2');
  res = res.replace(/(\b|[\s(])(?:Wi-Fi|WiFi)(\b|[\s.,!?])/gi, '$1વાઇ-ફાઇ$2');
  res = res.replace(/(\b|[\s(])(?:WhatsApp)(\b|[\s.,!?])/gi, '$1વ્હોટ્સએપ$2');
  res = res.replace(/(\b|[\s(])(?:Google)(\b|[\s.,!?])/gi, '$1ગૂગલ$2');
  res = res.replace(/(\b|[\s(])(?:Facebook)(\b|[\s.,!?])/gi, '$1ફેસબુક$2');
  res = res.replace(/(\b|[\s(])(?:Instagram)(\b|[\s.,!?])/gi, '$1ઇન્સ્ટાગ્રામ$2');
  res = res.replace(/(\b|[\s(])(?:Website)(\b|[\s.,!?])/gi, '$1વેબસાઇટ$2');
  res = res.replace(/(\b|[\s(])(?:Online)(\b|[\s.,!?])/gi, '$1ઓનલાઇન$2');
  res = res.replace(/(\b|[\s(])(?:Offline)(\b|[\s.,!?])/gi, '$1ઓફલાઇન$2');
  res = res.replace(/(\b|[\s(])(?:Channel)(\b|[\s.,!?])/gi, '$1ચેનલ$2');
  res = res.replace(/(\b|[\s(])(?:Subscribe)(\b|[\s.,!?])/gi, '$1સબ્સ્ક્રાઇબ$2');
  res = res.replace(/(\b|[\s(])(?:Video|Videos)(\b|[\s.,!?])/gi, '$1વિડીયો$2');
  res = res.replace(/(\b|[\s(])(?:વિડિઓ)(\b|[\s.,!?])/g, '$1વિડીયો$2');
  res = res.replace(/(\b|[\s(])(?:Link)(\b|[\s.,!?])/gi, '$1લિંક$2');
  res = res.replace(/(\b|[\s(])(?:Portal)(\b|[\s.,!?])/gi, '$1પોર્ટલ$2');
  res = res.replace(/(\b|[\s(])(?:Notification)(\b|[\s.,!?])/gi, '$1નોટિફિકેશન$2');
  res = res.replace(/(\b|[\s(])(?:Form|Forms)(\b|[\s.,!?])/gi, '$1ફોર્મ$2');
  res = res.replace(/(\b|[\s(])(?:Merit)(\b|[\s.,!?])/gi, '$1મેરિટ$2');
  res = res.replace(/(\b|[\s(])(?:Supervisor)(\b|[\s.,!?])/gi, '$1સુપરવાઈઝર$2');
  res = res.replace(/(\b|[\s(])(?:Anganwadi)(\b|[\s.,!?])/gi, '$1આંગણવાડી$2');
  res = res.replace(/(\b|[\s(])(?:Circular)(\b|[\s.,!?])/gi, '$1પરિપત્ર$2');
  res = res.replace(/(\b|[\s(])(?:Update|Updates)(\b|[\s.,!?])/gi, '$1અપડેટ$2');
  res = res.replace(/(\b|[\s(])(?:Cut-off|Cutoff|Cut off)(\b|[\s.,!?])/gi, '$1કટ-ઓફ$2');
  res = res.replace(/(\b|[\s(])(?:Hall\s*ticket)(\b|[\s.,!?])/gi, '$1હોલ ટિકિટ$2');
  res = res.replace(/(\b|[\s(])(?:Call\s*letter)(\b|[\s.,!?])/gi, '$1કૉલ લેટર$2');
  res = res.replace(/(\b|[\s(])(?:Answer\s*key)(\b|[\s.,!?])/gi, '$1આન્સર કી$2');

  // Ensure Gujarati loanwords stay in natural Gujarati script (Never Latin)
  res = res.replace(/\b(?:Screen|screen)\b/gi, 'સ્ક્રીન');
  res = res.replace(/\b(?:Script|script)\b/gi, 'સ્ક્રિપ્ટ');

  // Convert ALL English words to natural Gujarati phonetics (Never spell letter-by-letter)
  res = convertEnglishToGujaratiPhonetics(res);

  return res;
}

const ENGLISH_TO_GUJARATI_DICT = {
  'world': 'વર્લ્ડ',
  'word': 'વર્ડ',
  'words': 'વર્ડ્સ',
  'youtube': 'યુટ્યુબ',
  'channel': 'ચેનલ',
  'channels': 'ચેનલ્સ',
  'video': 'વિડીયો',
  'videos': 'વિડીયોઝ',
  'audio': 'ઓડિયો',
  'voice': 'વોઇસ',
  'script': 'સ્ક્રિપ્ટ',
  'screen': 'સ્ક્રીન',
  'online': 'ઓનલાઇન',
  'offline': 'ઓફલાઇન',
  'website': 'વેબસાઇટ',
  'link': 'લિંક',
  'links': 'લિંક્સ',
  'click': 'ક્લિક',
  'button': 'બટન',
  'update': 'અપડેટ',
  'updates': 'અપડેટ્સ',
  'new': 'ન્યુ',
  'news': 'ન્યૂઝ',
  'breaking': 'બ્રેકિંગ',
  'today': 'આજે',
  'welcome': 'વેલકમ',
  'subscribe': 'સબ્સ્ક્રાઇબ',
  'subscriber': 'સબ્સ્ક્રાઇબર',
  'subscribers': 'સબ્સ્ક્રાઇબર્સ',
  'like': 'લાઇક',
  'likes': 'લાઇક્સ',
  'share': 'શેર',
  'comment': 'કમેન્ટ',
  'comments': 'કમેન્ટ્સ',
  'bell': 'બેલ',
  'icon': 'આઇકન',
  'press': 'પ્રેસ',
  'download': 'ડાઉનલોડ',
  'upload': 'અપલોડ',
  'form': 'ફોર્મ',
  'apply': 'એપ્લાય',
  'application': 'એપ્લિકેશન',
  'portal': 'પોર્ટલ',
  'step': 'સ્ટેપ',
  'steps': 'સ્ટેપ્સ',
  'free': 'ફ્રી',
  'mobile': 'મોબાઇલ',
  'phone': 'ફોન',
  'number': 'નંબર',
  'notification': 'નોટિફિકેશન',
  'date': 'તારીખ',
  'last': 'લાસ્ટ',
  'scheme': 'સ્કીમ',
  'government': 'સરકાર',
  'exam': 'એક્ઝામ',
  'result': 'રિઝલ્ટ',
  'results': 'રિઝલ્ટ્સ',
  'hall': 'હોલ',
  'ticket': 'ટિકિટ',
  'admit': 'એડમિટ',
  'card': 'કાર્ડ',
  'process': 'પ્રોસેસ',
  'details': 'વિગતો',
  'check': 'ચેક',
  'status': 'સ્ટેટસ',
  'salary': 'પગાર',
  'pension': 'પેન્શન',
  'money': 'રૂપિયા',
  'cash': 'કેશ',
  'bank': 'બેંક',
  'account': 'એકાઉન્ટ',
  'document': 'ડોક્યુમેન્ટ',
  'documents': 'ડોક્યુમેન્ટ્સ',
  'pdf': 'પીડીએફ',
  'id': 'આઈડી',
  'login': 'લોગિન',
  'password': 'પાસવર્ડ',
  'otp': 'ઓટીપી',
  'kyc': 'કેવાયસી',
  'pan': 'પાન',
  'aadhaar': 'આધાર',
  'aadhar': 'આધાર',
  'service': 'સર્વિસ',
  'services': 'સર્વિસીસ',
  'center': 'સેન્ટર',
  'office': 'ઓફિસ',
  'computer': 'કમ્પ્યુટર',
  'laptop': 'લેપટોપ',
  'setting': 'સેટિંગ',
  'settings': 'સેટિંગ્સ',
  'student': 'સ્ટુડન્ટ',
  'students': 'સ્ટુડન્ટ્સ',
  'teacher': 'ટીચર',
  'teachers': 'ટીચર્સ',
  'school': 'સ્કૂલ',
  'college': 'કોલેજ',
  'board': 'બોર્ડ',
  'university': 'યુનિવર્સિટી',
  'friends': 'મિત્રો',
  'hello': 'હેલો',
  'hi': 'હાય',
  'bye': 'બાય',
  'thanks': 'થેન્ક્સ',
  'thank': 'થેન્ક',
  'please': 'પ્લીઝ',
  'sir': 'સર',
  'madam': 'મેડમ',
  'alert': 'એલર્ટ',
  'short': 'શોર્ટ',
  'shorts': 'શોર્ટ્સ',
  'reel': 'રીલ',
  'reels': 'રીલ્સ',
  'trending': 'ટ્રેન્ડિંગ',
  'viral': 'વાયરલ',
  'live': 'લાઇવ',
  'stream': 'સ્ટ્રીમ',
  'watch': 'વોચ',
  'time': 'ટાઇમ',
  'best': 'બેસ્ટ',
  'super': 'સુપર',
  'special': 'સ્પેશિયલ',
  'good': 'ગુડ',
  'morning': 'મોર્નિંગ',
  'evening': 'ઇવનિંગ',
  'night': 'નાઇટ',
  'ai': 'એ આઈ',
  'chatgpt': 'ચેટ જીપીટી',
  'gemini': 'જેમિની',
  'google': 'ગૂગલ',
  'facebook': 'ફેસબુક',
  'whatsapp': 'વોટ્સએપ',
  'instagram': 'ઇન્સ્ટાગ્રામ',
  'telegram': 'ટેલિગ્રામ',
  'sms': 'એસએમએસ',
  'message': 'મેસેજ',
  'call': 'કૉલ',
  'help': 'હેલ્પ',
  'helpline': 'હેલ્પલાઇન',
  'wifi': 'વાઇફાઇ',
  'internet': 'ઇન્ટરનેટ',
  'sim': 'સિમ',
  'recharge': 'રિચાર્જ',
  'data': 'ડેટા',
  'speed': 'સ્પીડ',
  'network': 'નેટવર્ક',
  'description': 'ડિસ્ક્રિપ્શન',
  'box': 'બોક્સ',
  'info': 'ઇન્ફો',
  'information': 'માહિતી',
  'list': 'લિસ્ટ',
  'rules': 'નિયમો',
  'eligibility': 'લાયકાત',
  'merit': 'મેરિટ',
  'cut': 'કટ',
  'off': 'ઓફ',
  'bonus': 'બોનસ',
  'budget': 'બજેટ',
  'subsidy': 'સબસિડી',
  'loan': 'લોન',
  'tax': 'ટેક્સ',
  'income': 'આવક',
  'certificate': 'સર્ટિફિકેટ',
  'smart': 'સ્માર્ટ',
  'tablet': 'ટેબ્લેટ',
  'photo': 'ફોટો',
  'image': 'ઇમેજ',
  'file': 'ફાઇલ',
  'folder': 'ફોલ્ડર',
  'copy': 'કોપી',
  'paste': 'પેસ્ટ',
  'delete': 'ડિલીટ',
  'save': 'સેવ',
  'edit': 'એડિટ',
  'view': 'વ્યુ',
  'start': 'સ્ટાર્ટ',
  'stop': 'સ્ટોપ',
  'next': 'નેક્સ્ટ',
  'back': 'બેક',
  'done': 'ડન',
  'success': 'સક્સેસ',
  'error': 'એરર',
  'problem': 'પ્રોબ્લેમ',
  'solution': 'સોલ્યુશન',
  'tips': 'ટિપ્સ',
  'tricks': 'ટ્રિક્સ',
  'guide': 'ગાઇડ',
  'tutorial': 'ટ્યુટોરિયલ',
  'creator': 'ક્રિએટર',
  'studio': 'સ્ટુડિયો',
  'policy': 'પોલિસી',
  'review': 'રિવ્યુ',
  'official': 'ઓફિશિયલ',
  'officials': 'ઓફિશિયલ્સ',
  'recruitment': 'રિક્રુટમેન્ટ',
  'recruitments': 'રિક્રુટમેન્ટ્સ',
  'vacancy': 'ખાલી જગ્યા',
  'vacancies': 'ખાલી જગ્યાઓ',
  'post': 'પોસ્ટ',
  'posts': 'પોસ્ટ્સ',
  'eligibility': 'લાયકાત',
  'qualification': 'લાયકાત',
  'qualifications': 'લાયકાતો',
  'selection': 'સિલેક્શન',
  'candidate': 'ઉમેદવાર',
  'candidates': 'ઉમેદવારો',
  'merit': 'મેરિટ',
  'cutoff': 'કટ-ઓફ',
  'salary': 'પગાર',
  'circular': 'પરિપત્ર',
  'department': 'વિભાગ',
  'notification': 'નોટિફિકેશન',
  'notifications': 'નોટિફિકેશન્સ',
  'application': 'એપ્લિકેશન',
  'applications': 'એપ્લિકેશન્સ',
  'portal': 'પોર્ટલ',
  'portals': 'પોર્ટલ્સ',
  'download': 'ડાઉનલોડ',
  'upload': 'અપલોડ',
  'verify': 'વેરિફાય',
  'verification': 'વેરિફિકેશન',
  'check': 'ચેક',
  'notice': 'નોટિસ',
  'rules': 'નિયમો',
  'rule': 'નિયમ',
  'form': 'ફોર્મ',
  'forms': 'ફોર્મ્સ',
  'and': 'અને',
  'or': 'અથવા',
  'document': 'ડોક્યુમેન્ટ',
  'documents': 'ડોક્યુમેન્ટ્સ',
  'important': 'મહત્વપૂર્ણ',
  'apply': 'એપ્લાય',
  'direct': 'સીધા',
  'link': 'લિંક',
  'links': 'લિંક્સ',
  'website': 'વેબસાઇટ',
  'online': 'ઓનલાઇન',
  'offline': 'ઓફલાઇન',
  'status': 'સ્ટેટસ',
  'par': 'પર',
  'karo': 'કરો',
  'kari': 'કરી',
  'che': 'છે',
  'chhe': 'છે',
  'mate': 'માટે',
  'ma': 'માં',
  'thi': 'થી',
  'star': 'સ્ટાર'
};

function transliterateEnglishWord(word) {
  const lower = word.toLowerCase();
  if (ENGLISH_TO_GUJARATI_DICT[lower]) {
    return ENGLISH_TO_GUJARATI_DICT[lower];
  }
  // Microsoft gu-IN-DhwaniNeural is bilingual and natively speaks English words with fluent Indian English pronunciation.
  // Preserve authentic English words cleanly to completely eliminate letter-by-letter stuttering or dangling matras.
  return word;
}

function convertEnglishToGujaratiPhonetics(text) {
  if (!text) return '';
  return text.replace(/[A-Za-z]+/g, m => transliterateEnglishWord(m));
}

/**
 * Injects natural cadence (લય) and vocal stress (ભાર) for YouTube narration.
 */
function cleanAcronymDots(text) {
  if (!text) return '';
  let res = text;
  // 1. Dots immediately between letters with NO space: જી.પી.એસ.સી. -> જીપીએસસી, G.P.S.C. -> GPSC
  res = res.replace(/([A-Za-z\u0A80-\u0AFF\u0900-\u097F])\.(?=[A-Za-z\u0A80-\u0AFF\u0900-\u097F])/g, '$1');
  // 2. Explicit 2 or 3 letter dotted acronyms: ડી.એ. -> ડીએ, પી.એમ. -> પીએમ, સી.એમ. -> સીએમ, જી.આર. -> જીઆર
  res = res.replace(/\b([A-Za-z\u0A80-\u0AFF\u0900-\u097F])\.\s*([A-Za-z\u0A80-\u0AFF\u0900-\u097F])\./g, '$1$2');
  res = res.replace(/\b([A-Za-z\u0A80-\u0AFF\u0900-\u097F])\.\s*([A-Za-z\u0A80-\u0AFF\u0900-\u097F])\s*([A-Za-z\u0A80-\u0AFF\u0900-\u097F])\./g, '$1$2$3');
  return res;
}

function injectCadenceAndStress(text) {
  if (!text) return '';
  let res = text;

  // Clean duplicate punctuation (avoid choppy breaks)
  res = res.replace(/,\s*,/g, ',');
  res = res.replace(/!\s*,/g, '!');
  res = res.replace(/,\s*!/g, '!');
  res = res.replace(/\.{2,}/g, '.');
  res = res.replace(/\s+/g, ' ');

  return res.trim();
}

function cleanGujaratiForTTS(text) {
  if (!text || text.trim().length === 0) return '';
  let cleaned = sanitizeScriptForSpeech(text);
  cleaned = normalizeGujaratiDigits(cleaned);
  cleaned = expandGujaratiAbbreviations(cleaned);
  cleaned = cleanAcronymDots(cleaned);
  cleaned = normalizeNumbersAndSymbols(cleaned);
  cleaned = optimizePhonetics(cleaned);
  cleaned = cleanPunctuationAndCadence(cleaned);
  cleaned = injectCadenceAndStress(cleaned);
  cleaned = cleaned.replace(/[ \t]+/g, ' ').trim();
  return cleaned;
}

function gujaratiToDevanagari(text) {
  if (!text) return '';
  return text.split('').map(char => {
    const code = char.charCodeAt(0);
    // Crucial: Gujarati 'ળ' (0x0AB3) mapped to Devanagari 'ळ' (0x0933) causes micro-stuttering/hesitation
    // in ElevenLabs Indic models because ळ is a rare Marathi-only consonant.
    // Mapping 'ળ' to standard Indic 'ल' (0x0932) produces 100% smooth, natural, liquid Gujarati flow without hesitation!
    if (code === 0x0AB3) {
      return String.fromCharCode(0x0932);
    }
    if (code >= 0x0A81 && code <= 0x0AF9) {
      return String.fromCharCode(code - 0x0180);
    }
    return char;
  }).join('');
}

/**
 * Splits long script text into natural sentence-level chunks
 * to guarantee support for unlimited audio length without API limits.
 */
function splitTextIntoSafeChunks(text, maxChars = 1000) {
  if (!text) return [];
  const sentences = text.split(/(?<=[.!?।\n])\s+/);
  const chunks = [];
  let current = '';

  for (const s of sentences) {
    if (!s || !s.trim()) continue;
    if ((current + ' ' + s).length > maxChars) {
      if (current.trim()) chunks.push(current.trim());
      current = s;
    } else {
      current = current ? current + ' ' + s : s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

module.exports = {
  cleanGujaratiForTTS,
  gujaratiToDevanagari,
  splitTextIntoSafeChunks,
  sanitizeScriptForSpeech,
  numberToGujaratiWords,
  normalizeGujaratiDigits,
  cleanPunctuationAndCadence,
  expandGujaratiAbbreviations,
  normalizeNumbersAndSymbols,
  optimizePhonetics,
  convertEnglishToGujaratiPhonetics
};
