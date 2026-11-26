const { test, describe } = require('node:test');
const assert = require('node:assert');

// Mock localStorage for node test environment
if (typeof global.localStorage === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

if (typeof global.window === 'undefined') {
  global.window = {
    dispatchEvent: () => true,
    CustomEvent: class CustomEvent { constructor(type, detail) { this.type = type; this.detail = detail; } }
  };
}

describe('TOPIC ISOLATION & PURGING ACROSS ALL 9 STUDIO TOOLS', async () => {
  const { isContentMatchingTopic, buildTopicProjectKit } = await import('../public/js/utils/projectState.js');

  const anganwadiTopic = 'આંગણવાડી કાર્યકર અને તેડાગર નવી ભરતી ૨૦૨૬ ઓનલાઇન અરજી પ્રક્રિયા';
  const daTopic = 'ગુજરાત કર્મચારી ૫૦% મોંઘવારી ભથ્થું (DA) અને એરિયર્સ ચૂકવણી પરિપત્ર';
  const kisanTopic = 'પીએમ કિસાન યોજના ૧૯મો હપ્તો જમા તારીખ અને નવું e-KYC લિસ્ટ';

  test('1. isContentMatchingTopic correctly detects matching and foreign content', () => {
    // Anganwadi matching
    assert.strictEqual(isContentMatchingTopic('આંગણવાડી સુપરવાઈઝર નવી ભરતી પ્રક્રિયા', anganwadiTopic), true);
    assert.strictEqual(isContentMatchingTopic('તેડાગર માનદવેતન અને ઓનલાઇન અરજી', anganwadiTopic), true);

    // Anganwadi rejects DA and Kisan
    assert.strictEqual(isContentMatchingTopic('ગુજરાત કર્મચારી ૫૦% મોંઘવારી ભથ્થું (DA) પરિપત્ર', anganwadiTopic), false);
    assert.strictEqual(isContentMatchingTopic('પીએમ કિસાન ૧૯મો હપ્તો ₹૨,૦૦૦ તારીખ પીએમ મોદી', anganwadiTopic), false);

    // DA matching
    assert.strictEqual(isContentMatchingTopic('રાજ્ય કર્મચારી ૫૦% DA મોંઘવારી ભથ્થું વધારો', daTopic), true);
    assert.strictEqual(isContentMatchingTopic('આંગણવાડી ભરતી ફોર્મ', daTopic), false);

    // Kisan matching
    assert.strictEqual(isContentMatchingTopic('પીએમ કિસાન ૧૯મો હપ્તો અને ખેડૂત e-KYC લિસ્ટ', kisanTopic), true);
    assert.strictEqual(isContentMatchingTopic('૫૦% મોંઘવારી ભથ્થું', kisanTopic), false);
  });

  test('2. buildTopicProjectKit creates 100% authentic non-empty slides & script for Anganwadi', () => {
    const kit = buildTopicProjectKit(anganwadiTopic, 'GY-2026-002');
    assert.strictEqual(kit.topic, anganwadiTopic);
    assert.ok(Array.isArray(kit.slide.slides));
    assert.ok(kit.slide.slides.length >= 8, 'Should have at least 8 slides');
    assert.ok(Array.isArray(kit.script.sections));
    assert.ok(kit.script.sections.length >= 8, 'Should have at least 8 script sections');
    assert.ok(kit.script.fullText.length > 200, 'Full script text must be rich and detailed');

    // Verify slide titles are Anganwadi related
    const slideTitlesText = kit.slide.slides.map(s => s.title + ' ' + (s.bulletPoints || []).join(' ')).join(' ');
    assert.ok(slideTitlesText.includes('આંગણવાડી') || slideTitlesText.includes('તેડાગર') || slideTitlesText.includes('અરજી'), 'Slides must be authentic to Anganwadi');

    // Verify ZERO DA or PM Modi contamination in Anganwadi kit
    assert.strictEqual(slideTitlesText.includes('મોંઘવારી ભથ્થું'), false, 'Must not leak DA');
    assert.strictEqual(slideTitlesText.includes('પીએમ મોદી'), false, 'Must not leak Modi');
  });

  test('3. buildTopicProjectKit purges foreign slides if existingProject has DA data', () => {
    // Simulate an existing project that previously held DA slides
    const fakeExistingProjectWithDa = {
      id: 'GY-2026-002',
      topicId: 'GY-2026-002',
      name: anganwadiTopic,
      topic: anganwadiTopic,
      slide: {
        slides: [
          { slideNumber: 1, title: 'ગુજરાત કર્મચારી ૫૦% મોંઘવારી ભથ્થું (DA) અને એરિયર્સ પરિપત્ર', scriptText: 'મોંઘવારી ભથ્થું ૫૦% મંજૂર' }
        ],
        importedPresentation: { filename: 'Gujarat_DA_Hike_Official.pdf' }
      },
      script: {
        title: 'DA પરિપત્ર વિશ્લેષણ',
        rawText: 'મોંઘવારી ભથ્થું વિગત',
        sections: [
          { slideNumber: 1, sectionName: 'DA વિગત', scriptText: 'મોંઘવારી ભથ્થું ૫૦% મંજૂર' }
        ]
      }
    };

    // Rebuilding kit for Anganwadi using this dirty existing project
    const cleansedKit = buildTopicProjectKit(anganwadiTopic, 'GY-2026-002', fakeExistingProjectWithDa);

    // Foreign slides and script must be PURGED!
    const allCleanSlideTitles = cleansedKit.slide.slides.map(s => s.title).join(' ');
    assert.strictEqual(allCleanSlideTitles.includes('મોંઘવારી ભથ્થું'), false, 'Foreign DA slides must be purged!');
    assert.strictEqual(cleansedKit.slide.importedPresentation, null, 'Foreign DA presentation must be cleared');
    assert.strictEqual(cleansedKit.script.rawText.includes('મોંઘવારી ભથ્થું'), false, 'Foreign DA script must be purged');
    assert.ok(cleansedKit.slide.slides.length >= 8, 'Cleansed kit must have authentic Anganwadi slide deck');
  });

  test('4. SEO and Thumbnail presets adapt dynamically to active topic without hardcoding PM Modi', () => {
    const anganwadiKit = buildTopicProjectKit(anganwadiTopic, 'GY-2026-002');
    assert.ok(anganwadiKit.seo.title.includes('આંગણવાડી'), 'SEO Title must match Anganwadi');
    assert.ok(anganwadiKit.thumbnail.title.includes('આંગણવાડી'), 'Thumbnail Title must match Anganwadi');
    assert.strictEqual(anganwadiKit.seo.title.includes('મોદી'), false);
    assert.strictEqual(anganwadiKit.seo.title.includes('મોંઘવારી'), false);
  });

  test('5. Strict exclusion: Unrelated topics NEVER match Anganwadi or DA presentation files', () => {
    const customTopic = 'ગુજરાત નવી શિષ્યવૃત્તિ સહાય યોજના ૨૦૨૬';
    const anganwadiPdf = 'pres_1793900126116_Gujarat_Anganwadi_Recruitment_2026_Guide__4_.pdf';
    const daPdf = 'pres_1793450543945_Gujarat_DA_Hike_Official.pdf';

    // Must be completely rejected
    assert.strictEqual(isContentMatchingTopic(anganwadiPdf, customTopic), false);
    assert.strictEqual(isContentMatchingTopic(daPdf, customTopic), false);
    assert.strictEqual(isContentMatchingTopic(anganwadiPdf, 'ગુજરાત પોલીસ કોન્સ્ટેબલ ભરતી ૨૦૨૬'), false);
    assert.strictEqual(isContentMatchingTopic(daPdf, 'પીએમ કિસાન યોજના ૧૯મો હપ્તો'), false);
  });

  test('6. app.js top universal dropdown has zero hardcoded topics', async () => {
    const fs = require('fs');
    const path = require('path');
    const appJsContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'app.js'), 'utf8');
    assert.strictEqual(appJsContent.includes('GY-2026-001'), false, 'app.js must not contain hardcoded GY-2026-001 demo topics');
    assert.strictEqual(appJsContent.includes('સાયબર ફ્રોડ ૧૯૩૦'), false, 'app.js must not contain hardcoded demo list');
  });
});

