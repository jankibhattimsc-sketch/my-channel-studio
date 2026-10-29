const { cleanGujaratiForTTS } = require('./server/services/gujaratiCleaner');

function buildLinguisticThoughtUnits(cleanedText, context) {
  // If user provided explicit paragraphs (\n\n), honor those as natural primary boundaries
  let paragraphs = cleanedText.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

  let thoughtUnits = [];

  paragraphs.forEach((para, pIdx) => {
    // Split paragraph into genuine sentences
    const sentences = para
      .split(/(?<=[.!?।])\s+(?=[^\d])/g)
      .map(s => s.trim())
      .filter(Boolean);

    if (sentences.length <= 2) {
      // 1 or 2 sentences in paragraph: keep together as a single fluid thought unit!
      thoughtUnits.push({
        id: thoughtUnits.length + 1,
        text: sentences.join(' '),
        sentenceCount: sentences.length,
        pIdx
      });
      return;
    }

    // 3 or more sentences in paragraph: group naturally
    let current = [];
    let curWords = 0;

    sentences.forEach((s, sIdx) => {
      const words = s.split(/\s+/).length;
      const isShortGreeting = (sIdx === 0 && pIdx === 0) && /(?:નમસ્તે|કેમ છો|મિત્રો|ખુશખબર|બ્રેકિંગ)/i.test(s) && words <= 6;

      if (isShortGreeting) {
        current.push(s);
        curWords += words;
        return;
      }

      current.push(s);
      curWords += words;

      if (curWords >= 28 || sIdx === sentences.length - 1) {
        thoughtUnits.push({
          id: thoughtUnits.length + 1,
          text: current.join(' '),
          sentenceCount: current.length,
          pIdx
        });
        current = [];
        curWords = 0;
      }
    });

    if (current.length > 0) {
      if (thoughtUnits.length > 0) {
        thoughtUnits[thoughtUnits.length - 1].text += ' ' + current.join(' ');
      } else {
        thoughtUnits.push({
          id: thoughtUnits.length + 1,
          text: current.join(' '),
          sentenceCount: current.length,
          pIdx
        });
      }
    }
  });

  return thoughtUnits;
}

const tc2 = `નમસ્તે મિત્રો! ગાંધીનગર નાણાં વિભાગ તરફથી આંગણવાડી કાર્યકર અને તેડાગર બહેનોના માનદ વેતનમાં ઐતિહાસિક વધારો કરવાનો સત્તાવાર ઠરાવ બહાર પડ્યો છે.
હવેથી આંગણવાડી કાર્યકર બહેનોને માસિક પંદર હજાર પાંચસો રૂપિયા અને તેડાગર બહેનોને નવ હજાર રૂપિયા માનદ વેતન ચૂકવવામાં આવશે.
આ વધારો પહેલી એપ્રિલથી અમલી બનશે અને બાકી રહેલા તમામ એરિયર્સ આગામી મહિનાના પગાર સાથે સીધા બેંક ખાતામાં જમા કરવામાં આવશે.
સાથે જ મોંઘવારી ભથ્થામાં પણ ચાર ટકાનો વધારો મંજૂર કરાયો છે.`;

const c2 = cleanGujaratiForTTS(tc2);
const units2 = buildLinguisticThoughtUnits(c2);
console.log('--- TC2 THOUGHT UNITS ---');
units2.forEach(u => console.log(`Unit ${u.id} (${u.sentenceCount} sentences): "${u.text}"\n`));
