/**
 * Client-Side Voice Actor Aaroh-Avroh Helper
 * Provides instant parsing of Gujarati scripts with Aaroh-Avroh analysis,
 * speech synthesis modulation, and master actor prompt generation.
 */

const GUJ_UNITS = [
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

export function numberToGujaratiWords(n) {
  if (isNaN(n)) return '';
  n = Math.floor(Math.abs(n));
  if (n === 0) return 'શૂન્ય';
  if (n < 100) return GUJ_UNITS[n];
  if (n < 1000) {
    const h = Math.floor(n / 100);
    const rem = n % 100;
    const hStr = h === 1 ? 'એકસો' : GUJ_UNITS[h] + 'સો';
    return rem > 0 ? `${hStr} ${GUJ_UNITS[rem]}` : hStr;
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
 * Strips markdown headers, bullet labels, visual cues, timestamps,
 * and presentation metadata so ONLY spoken script remains.
 */
export function sanitizeScriptForSpeechClient(text) {
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

export function cleanGujaratiPhoneticsClient(text) {
  if (!text) return '';
  let res = sanitizeScriptForSpeechClient(text);

  // Digits to words
  res = res.replace(/[૦-૯]/g, d => '0123456789'['૦૧૨૩૪૫૬૭૮૯'.indexOf(d)] || d);

  // Strip commas in numbers so 52,500 isn't split into two separate numbers
  while (/(\d+),\s*(\d+)/.test(res)) {
    res = res.replace(/(\d+),\s*(\d+)/g, '$1$2');
  }

  // Land records
  res = res.replace(/\b7\/12\b/g, 'સાત બાર');
  res = res.replace(/\b8\s*[-/]?\s*[Aઅa]\b/gi, 'આઠ અ');

  // Dates
  res = res.replace(/\b([0-3]?\d)[\/\-]([0-1]?\d)[\/\-](\d{2,4})\b/g, (m, dStr, mStr, yStr) => {
    const day = parseInt(dStr, 10);
    const month = parseInt(mStr, 10);
    let year = parseInt(yStr, 10);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${numberToGujaratiWords(day)} ${GUJ_MONTHS[month]} ${numberToGujaratiWords(year)}`;
    }
    return m;
  });

  // Amounts
  res = res.replace(/(?:₹|રૂ\.|Rs\.?|INR)\s*(\d+)/gi, (_, n) => `${numberToGujaratiWords(parseInt(n, 10))} રૂપિયા`);
  res = res.replace(/\b(\d+)\s*(?:રૂપિયા|રૂ|rs)\b/gi, (_, n) => `${numberToGujaratiWords(parseInt(n, 10))} રૂપિયા`);
  res = res.replace(/(\d+)\s*%/g, (_, n) => `${numberToGujaratiWords(parseInt(n, 10))} ટકા`);

  // General numbers
  res = res.replace(/\b(\d+)\b/g, (_, n) => {
    const val = parseInt(n, 10);
    return val <= 99999999 ? numberToGujaratiWords(val) : n;
  });

  // Common exam & government abbreviations (spaced out for 100% crystal-clear articulation)
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
  res = res.replace(/(\b|[\s(])(?:DA|D\.A\.|ડીએ|ડી\.એ\.)\s*(?:એટલે\s*કે\s*મોંઘવારી\s*ભથ્થું)?(\b|[\s.,!?])/g, '$1ડીએ એટલે કે મોંઘવારી ભથ્થું$2');
  res = res.replace(/(?:એટલે\s*કે\s*મોંઘવારી\s*ભથ્થું\s*){2,}/g, 'એટલે કે મોંઘવારી ભથ્થું ');
  res = res.replace(/(\b|[\s(])(?:GR|G\.R\.)(\b|[\s.,!?])/g, '$1સરકારી ઠરાવ$2');
  res = res.replace(/(\b|[\s(])(?:PDF|P\.D\.F\.)(\b|[\s.,!?])/gi, '$1પીડીએફ$2');
  res = res.replace(/(\b|[\s(])(?:પીડીએફ|પી\.ડી\.એફ\.)(\b|[\s.,!?])/g, '$1પીડીએફ$2');
  res = res.replace(/(\b|[\s(])(?:PPT|P\.P\.T\.)(\b|[\s.,!?])/gi, '$1પીપીટી$2');
  res = res.replace(/(\b|[\s(])(?:KYC)(\b|[\s.,!?])/gi, '$1કેવાયસી$2');
  res = res.replace(/(\b|[\s(])(?:કેવાયસી)(\b|[\s.,!?])/g, '$1કેવાયસી$2');
  res = res.replace(/(\b|[\s(])(?:OTP)(\b|[\s.,!?])/gi, '$1ઓટીપી$2');
  res = res.replace(/(\b|[\s(])(?:ઓટીપી)(\b|[\s.,!?])/g, '$1ઓટીપી$2');
  res = res.replace(/(\b|[\s(])(?:જીપીએસસી)(\b|[\s.,!?])/g, '$1જીપીએસસી$2');
  res = res.replace(/(\b|[\s(])(?:જીએસએસએસબી)(\b|[\s.,!?])/g, '$1જીએસએસએસબી$2');
  res = res.replace(/(\b|[\s(])(?:ડીબીટી)(\b|[\s.,!?])/g, '$1ડીબીટી$2');
  res = res.replace(/(\b|[\s(])(?:AI|A\.I\.)(\b|[\s.,!?])/gi, '$1એઆઈ$2');
  res = res.replace(/(\b|[\s(])(?:YouTube)(\b|[\s.,!?])/gi, '$1યુટ્યુબ$2');
  res = res.replace(/(\b|[\s(])(?:Website)(\b|[\s.,!?])/gi, '$1વેબસાઇટ$2');
  res = res.replace(/(\b|[\s(])(?:Online)(\b|[\s.,!?])/gi, '$1ઓનલાઇન$2');
  res = res.replace(/(\b|[\s(])(?:Offline)(\b|[\s.,!?])/gi, '$1ઓફલાઇન$2');
  res = res.replace(/(\b|[\s(])(?:Notification)(\b|[\s.,!?])/gi, '$1નોટિફિકેશન$2');
  res = res.replace(/(\b|[\s(])(?:Official)(\b|[\s.,!?])/gi, '$1ઓફિશિયલ$2');
  res = res.replace(/(\b|[\s(])(?:Recruitment)(\b|[\s.,!?])/gi, '$1રિક્રુટમેન્ટ$2');
  res = res.replace(/(\b|[\s(])(?:Application)(\b|[\s.,!?])/gi, '$1એપ્લિકેશન$2');
  res = res.replace(/(\b|[\s(])(?:Download)(\b|[\s.,!?])/gi, '$1ડાઉનલોડ$2');
  res = res.replace(/(\b|[\s(])(?:Subscribe)(\b|[\s.,!?])/gi, '$1સબ્સ્ક્રાઇબ$2');
  res = res.replace(/(\b|[\s(])(?:Video|Videos)(\b|[\s.,!?])/gi, '$1વિડીયો$2');
  res = res.replace(/(\b|[\s(])(?:વિડિઓ)(\b|[\s.,!?])/g, '$1વિડીયો$2');

  // Collapse any pre-existing spaced acronyms
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
  return res.trim();
}

export function parseActorScriptClient(text, style = 'breaking', mainTopic = '') {
  const cleaned = cleanGujaratiPhoneticsClient(text);
  const rawSentences = cleaned
    .split(/(?<=[.!?।\n])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const actorSentences = rawSentences.map((sentence, index) => {
    const isQuestion = sentence.includes('?');
    const isHook = index === 0 || /(?:નમસ્તે|કેમ છો|મિત્રો|ખુશખબર|મોટો નિર્ણય|ધ્યાન આપો)/i.test(sentence);
    const isOfficial = /(?:પરિપત્ર|ઠરાવ|સરકાર|નાણાં વિભાગ|સત્તાવાર|નિયમ|જીઆર|GR|જાહેરનામું)/i.test(sentence);
    const isDeadline = /(?:છેલ્લી તારીખ|અરજી કરવાની|ધ્યાનમાં રાખવું|ચેતવણી|ભૂલ ના કરતા)/i.test(sentence);
    const isClosing = index >= rawSentences.length - 2 || /(?:સબ્સ્ક્રાઇબ|શેર કરો|લાઈક|જય હિન્દ|જય ભારત)/i.test(sentence);
    const hasNumbers = /(?:રૂપિયા|હજાર|લાખ|કરોડ|ટકા|તારીખ)/.test(sentence);

    let toneType = 'neutral';
    let badgeGuj = 'સામાન્ય શૈલી';
    let badgeColor = '#94a3b8';
    let pitch = 1.0; // Web Speech API pitch (0.5 to 2.0)
    let rate = 1.0;

    if (isHook) {
      toneType = 'aaroh_hook';
      badgeGuj = '↗️ આરોહ (ઉત્સાહ & હૂક)';
      badgeColor = '#f59e0b';
      pitch = 1.15;
      rate = 1.03;
    } else if (isQuestion) {
      toneType = 'aaroh_question';
      badgeGuj = '↗️ આરોહ (પ્રશ્નાર્થ)';
      badgeColor = '#ec4899';
      pitch = 1.20;
      rate = 1.02;
    } else if (isDeadline) {
      toneType = 'urgency';
      badgeGuj = '⚠️ ભારપૂર્વક (ચેતવણી/તારીખ)';
      badgeColor = '#ef4444';
      pitch = 1.08;
      rate = 0.95;
    } else if (isOfficial) {
      toneType = 'avroh_authority';
      badgeGuj = '↘️ અવરોહ (સત્તાવાર ગંભીરતા)';
      badgeColor = '#38bdf8';
      pitch = 0.92;
      rate = 0.94;
    } else if (hasNumbers) {
      toneType = 'avroh_numbers';
      badgeGuj = '⏸️ સ્પષ્ટ આંકડાકીય વિરામ';
      badgeColor = '#10b981';
      pitch = 1.02;
      rate = 0.92;
    } else if (isClosing) {
      toneType = 'warm_closing';
      badgeGuj = '🤝 ઉષ્માભર્યો ઉપસંહાર';
      badgeColor = '#8b5cf6';
      pitch = 1.05;
      rate = 0.98;
    }

    return {
      id: index + 1,
      text: sentence,
      toneType,
      badgeGuj,
      badgeColor,
      pitch,
      rate
    };
  });

  const masterActorPrompt = `# MASTER PROMPT: GYAN YATRA — PROFESSIONAL GUJARATI VOICE ACTOR & NARRATOR

## ભૂમિકા (Your Role):
તમે એક ટોચના, અનુભવી ગુજરાતી વૉઇસ ઓવર એક્ટર (Voice Actor) અને સિનિયર ન્યૂઝ એન્કર છો. નીચે આપેલી સ્ક્રિપ્ટ અથવા PDF ને સૌથી પહેલા એક સાચા અભિનેતાની જેમ સંપૂર્ણ વાંચો અને સમજો.

## વિષય (Topic):
${mainTopic || 'ગુજરાત સરકારી પરિપત્ર અને ભરતી વિગત'}

## કડક અભિનેતા સૂચનાઓ (Voice Acting Directives):
1. **પહેલા સ્ક્રિપ્ટ સમજો**: વિડીયોનો કથાપ્રવાહ અને ભાવ સમજીને બોલવું.
2. **સ્પષ્ટ ઉચ્ચારણ**: શુદ્ધ કાઠિયાવાડી/ગુજરાતી નેટિવ ઉચ્ચારણ (૧૦૦% શુદ્ધ ઉચ્ચાર).
3. **આરોહ-અવરોહ (Aaroh-Avroh)**:
   - ↗️ આરોહ: પ્રશ્નો અને ખુશખબરી વખતે ઉચ્ચ પીચ અને ઉત્સાહ.
   - ↘️ અવરોહ: પરિપત્ર અને સત્તાવાર સરકારી નિયમો વખતે ઊંડો, શાંત અને ગંભીર અવાજ.
   - ⏸️ વિરામ: રકમ કે તારીખ બોલતા પહેલાં સહજ ૩૦૦-૪૦૦ms વિરામ.
4. **માનવીય સંવાદ**: રોબોટિક નહીં, જીવંત વક્તાની જેમ બોલો.

## બોલવા માટેની સંપૂર્ણ સ્ક્રિપ્ટ (Spoken Script):
${cleaned}

ઉપરની સ્ક્રિપ્ટને શુદ્ધ ગુજરાતી ઉચ્ચારો અને આરોહ-અવરોહ સાથે બોલો.`;

  return {
    cleaned,
    actorSentences,
    masterActorPrompt
  };
}
