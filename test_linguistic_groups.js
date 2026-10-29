const { cleanGujaratiForTTS } = require('./server/services/gujaratiCleaner');

function buildLinguisticThoughtGroups(text) {
  // 1. Clean phonetic text & remove acronym dots
  let cleaned = cleanGujaratiForTTS(text);

  // 2. Split into genuine paragraphs first (user's explicit thought breaks)
  let rawParagraphs = cleaned.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  if (rawParagraphs.length === 1) {
    // If user provided a single monolithic block, split into sentences with intelligent boundary detection
    // DO NOT split on abbreviations or single-letter dots!
    const sentences = rawParagraphs[0]
      .split(/(?<=[.!?।])\s+(?=[^\d])/g)
      .map(s => s.trim())
      .filter(Boolean);

    // Group sentences into natural linguistic breath groups (2-3 sentences each)
    const groups = [];
    let currentGroup = [];
    let currentWordCount = 0;

    sentences.forEach((sentence, idx) => {
      const words = sentence.split(/\s+/).length;
      const isGreeting = idx === 0 && /(?:નમસ્તે|કેમ છો|મિત્રો|ખુશખબર|બ્રેકિંગ)/i.test(sentence) && words <= 6;
      
      // If first sentence is just a greeting like "નમસ્તે મિત્રો!", ALWAYS merge with next sentence!
      if (isGreeting) {
        currentGroup.push(sentence);
        currentWordCount += words;
        return;
      }

      currentGroup.push(sentence);
      currentWordCount += words;

      // Close thought group when it reaches a natural idea boundary (around 25-45 words or terminal sentence)
      if (currentWordCount >= 30 || idx === sentences.length - 1) {
        groups.push(currentGroup.join(' '));
        currentGroup = [];
        currentWordCount = 0;
      }
    });

    if (currentGroup.length > 0) {
      if (groups.length > 0) {
        groups[groups.length - 1] += ' ' + currentGroup.join(' ');
      } else {
        groups.push(currentGroup.join(' '));
      }
    }
    rawParagraphs = groups;
  }

  return rawParagraphs;
}

const test1 = `નમસ્તે ઉમેદવાર મિત્રો! ગુજરાત ગૌણ સેવા પસંદગી મંડળ એટલે કે જી.એસ.એસ.એસ.બી. દ્વારા ક્લાર્ક અને હેડ ક્લાર્કની નવી ભરતી ૨૦૨૬ માટે સત્તાવાર જાહેરાત પ્રસિદ્ધ કરવામાં આવી છે.
કુલ ખાલી જગ્યાઓની સંખ્યા ત્રણ હજાર પાંચસો પચાસ છે.
માન્ય યુનિવર્સિટીમાંથી કોઈપણ પ્રવાહમાં સ્નાતક થયેલા ઉમેદવારો આ ભરતી માટે લાયક ગણાશે, અને વય મર્યાદા વીસ થી પાંત્રીસ વર્ષ રાખવામાં આવી છે.
ઓજસ પોર્ટલ પર ઓનલાઇન ફોર્મ ભરવાની છેલ્લી તારીખ ત્રીસ એપ્રિલ બે હજાર ચોવીસ રહેશે.
સમયસર તમારી અરજી સબમિટ કરી લેવી જેથી છેલ્લી ઘડીએ સર્વરની સમસ્યા ના નડે.`;

console.log('--- TEST 1 LINGUISTIC THOUGHT GROUPS ---');
const groups1 = buildLinguisticThoughtGroups(test1);
groups1.forEach((g, i) => {
  console.log(`Group ${i + 1} (${g.split(/\s+/).length} words):`);
  console.log(`  "${g}"\n`);
});
