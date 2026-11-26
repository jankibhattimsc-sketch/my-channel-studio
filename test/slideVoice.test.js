const test = require('node:test');
const assert = require('node:assert/strict');

test('Slide & Voice Studio DSP and Pitch Calculation Tests', async (t) => {
  await t.test('1. Semitone to Playback Rate conversion verification', () => {
    // Standard formula: rate = 2^(semitones / 12)
    const normalRate = Math.pow(2, 0 / 12);
    assert.equal(normalRate, 1.0, 'Normal pitch (0 semitones) must have rate = 1.0');

    const deepRate = Math.pow(2, -2 / 12);
    assert.ok(deepRate < 1.0 && deepRate > 0.88, 'Deep radio anchor (-2 semitones) rate should be ~0.89');

    const brightRate = Math.pow(2, 1.5 / 12);
    assert.ok(brightRate > 1.0 && brightRate < 1.15, 'Bright YouTube anchor (+1.5 semitones) rate should be ~1.09');

    const sweetRate = Math.pow(2, 2.5 / 12);
    assert.ok(sweetRate > 1.12 && sweetRate < 1.2, 'Sweet tone (+2.5 semitones) rate should be ~1.155');
  });

  await t.test('2. Pitch adjustment ranges and presets validation', () => {
    const pitchPresets = [
      { name: 'ગંભીર/ઊંડો', semitones: -2 },
      { name: 'કુદરતી', semitones: 0 },
      { name: 'તેજસ્વી', semitones: 1.5 },
      { name: 'મીઠો/સુરીલો', semitones: 2.5 }
    ];

    pitchPresets.forEach(preset => {
      assert.ok(preset.semitones >= -5 && preset.semitones <= 5, `${preset.name} must be within [-5, 5] semitones range`);
    });
  });

  await t.test('3. Slide script duration estimation model', () => {
    // Spoken Gujarati rate ~130-135 words per minute
    const wordsPerMinute = 135;
    const testScript = 'નમસ્તે મિત્રો! આજના વિડીયોમાં આપણે વાત કરીશું ગુજરાત સરકારી કર્મચારીઓ અને પેન્શનર્સના મોંઘવારી ભથ્થા એટલે કે DA અને પગાર વધારાના સત્તાવાર નિર્ણય વિશે.';
    const wordCount = testScript.trim().split(/\s+/).filter(Boolean).length;
    const estimatedSeconds = Math.round((wordCount / wordsPerMinute) * 60);

    assert.ok(wordCount > 15, 'Word count must be accurate');
    assert.ok(estimatedSeconds >= 5 && estimatedSeconds <= 20, 'Duration should be ~5-20 seconds');
  });

  await t.test('4. External NotebookLM Slide and Script Parsing', async () => {
    const { parseExternalSlidesText, SAMPLE_NOTEBOOKLM_FORMAT } = await import('../public/js/utils/externalSlideParser.js');
    const slides = parseExternalSlidesText(SAMPLE_NOTEBOOKLM_FORMAT);

    assert.equal(slides.length, 3, 'NotebookLM sample must parse into 3 slides');
    assert.ok(slides[0].title.includes('ગુજરાત કર્મચારી પગાર'), 'Slide 1 title must match');
    assert.ok(slides[0].subtitle.includes('સત્તાવાર ઠરાવ'), 'Slide 1 subtitle must match');
    assert.ok(slides[0].bulletPoints.length >= 2, 'Slide 1 must have at least 2 bullets');
    assert.ok(slides[0].scriptText.includes('નમસ્તે મિત્રો!'), 'Slide 1 script must be captured');
  });

  await t.test('5. External ChatGPT Slide and Script Parsing', async () => {
    const { parseExternalSlidesText, SAMPLE_CHATGPT_FORMAT } = await import('../public/js/utils/externalSlideParser.js');
    const slides = parseExternalSlidesText(SAMPLE_CHATGPT_FORMAT);

    assert.equal(slides.length, 3, 'ChatGPT sample must parse into 3 slides');
    assert.ok(slides[0].title.includes('આંગણવાડી સુપરવાઈઝર'), 'Slide 1 title must match');
    assert.ok(slides[0].bulletPoints.length >= 2, 'Slide 1 must have bullet points');
    assert.ok(slides[0].scriptText.includes('ઉમેદવાર મિત્રો'), 'Slide 1 script must be captured');
  });

  await t.test('6. Plain paragraph text parsing fallback', async () => {
    const { parseExternalSlidesText } = await import('../public/js/utils/externalSlideParser.js');
    const plainText = `પ્રથમ પેરેગ્રાફ: ગુજરાતમાં નવી સરકારી સહાય યોજના શરૂ થઈ ગઈ છે.

બીજો પેરેગ્રાફ: પાત્ર પરિવારોને સીધા બેંક ખાતામાં નાણાં જમા થશે.`;

    const slides = parseExternalSlidesText(plainText);
    assert.equal(slides.length, 2, '2 paragraphs separated by blank lines should produce 2 slides');
    assert.ok(slides[0].scriptText.length > 10, 'Paragraph text must be in script');
  });

  await t.test('7. PPTX Extractor Safe Error Handling', () => {
    const pptxExtractor = require('../server/services/pptxExtractor');
    const res = pptxExtractor.extractPptxSlides(Buffer.from('not a real pptx'));
    assert.deepEqual(res, [], 'Invalid buffer must return empty array without crashing');
  });

  await t.test('8. CommonJS ExternalSlideParserService verification', () => {
    const srv = require('../server/services/externalSlideParserService');
    const res = srv.parseExternalSlidesText('Slide 1: ટેસ્ટ ટાઇટલ\n• મુદ્દો ૧\nScript: બોલવાની સ્ક્રિપ્ટ');
    assert.equal(res.length, 1);
    assert.ok(res[0].title.includes('ટેસ્ટ ટાઇટલ'));
    assert.ok(res[0].scriptText.includes('બોલવાની સ્ક્રિપ્ટ'));
  });
});
