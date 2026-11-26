const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

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

test('Tool 4 (Slide Tool): 16:9 Pure White Slides with Realistic Photographs & Slide Studio', async (t) => {
  const slidepromptsPath = path.join(__dirname, '../public/js/views/slideprompts.js');
  assert.ok(fs.existsSync(slidepromptsPath), 'slideprompts.js must exist');
  const viewCode = fs.readFileSync(slidepromptsPath, 'utf8');

  await t.test('1. Exports authentic Realistic Photo presets tailored to government/Gujarati topics', async () => {
    const { REALISTIC_PHOTO_PRESETS } = await import('../public/js/views/slideprompts.js');
    assert.ok(Array.isArray(REALISTIC_PHOTO_PRESETS), 'REALISTIC_PHOTO_PRESETS must be an array');
    assert.ok(REALISTIC_PHOTO_PRESETS.length >= 8, 'Must provide at least 8 curated realistic photo presets');

    const presetIds = REALISTIC_PHOTO_PRESETS.map(p => p.id);
    assert.ok(presetIds.includes('circular'), 'Must include official GR circular preset');
    assert.ok(presetIds.includes('sachivalaya'), 'Must include Gandhinagar Secretariat preset');
    assert.ok(presetIds.includes('portal'), 'Must include official online portal preset');
    assert.ok(presetIds.includes('beneficiary'), 'Must include authentic beneficiary preset');
    assert.ok(presetIds.includes('dates'), 'Must include official deadline/calendar preset');
    assert.ok(presetIds.includes('rules'), 'Must include eligibility checklist preset');
    assert.ok(presetIds.includes('subsidy'), 'Must include DBT subsidy/bank assistance preset');
    assert.ok(presetIds.includes('helpline'), 'Must include official toll-free helpline preset');
    assert.ok(presetIds.includes('highcourt'), 'Must include Gujarat High Court architectural preset');
    assert.ok(presetIds.includes('courtorder'), 'Must include High Court Order Sheet preset');
    assert.ok(presetIds.includes('anganwadi_meal'), 'Must include Anganwadi Center Meal preset');
    assert.ok(presetIds.includes('officer_memo'), 'Must include Officer Memorandum submission preset');
    assert.ok(presetIds.includes('phone_app'), 'Must include Mobile Order PDF Download preset');
  });

  await t.test('2. 16:9 Slide Canvas enforces 100% pure white background, navy blue heading, and realistic visual', () => {
    // 16:9 ratio and pure white background
    assert.ok(viewCode.includes('aspect-ratio: 16/9'), 'Must enforce 16:9 widescreen aspect ratio');
    assert.ok(viewCode.includes('background: #ffffff'), 'Must enforce pure white background #ffffff');

    // Navy Blue Heading box & Blue accent line
    assert.ok(viewCode.includes('background: #0f172a'), 'Must feature solid dark navy heading box');
    assert.ok(viewCode.includes('border-left: 6px solid #2563eb'), 'Must feature royal blue accent bar');

    // Realistic Visual layout
    assert.ok(viewCode.includes('renderRealisticPhotoVisual'), 'Must include realistic photo visual renderer');
    assert.ok(viewCode.includes('1080p Full HD • શુદ્ધ સફેદ સ્લાઇડ • વાસ્તવિક ફોટો'), 'Must display 1080p Full HD slide indicator');
  });

  await t.test('3. Slide Navigator includes carousel thumbnails, prev/next, add, and delete controls', () => {
    assert.ok(viewCode.includes('btn-studio-thumb-nav'), 'Must have slide thumbnail navigation buttons');
    assert.ok(viewCode.includes('btn-studio-prev-slide'), 'Must have previous slide button');
    assert.ok(viewCode.includes('btn-studio-next-slide'), 'Must have next slide button');
    assert.ok(viewCode.includes('btn-studio-add-slide'), 'Must have add new slide button');
    assert.ok(viewCode.includes('btn-studio-delete-slide'), 'Must have delete slide button');
    assert.ok(viewCode.includes('btn-regenerate-slides-from-topic'), 'Must support regenerating slides from topic');
  });

  await t.test('4. Live Slide Editor allows title, subtitle, bullets, photo preset, and custom image upload', () => {
    assert.ok(viewCode.includes('input-edit-slide-title'), 'Must have slide title input');
    assert.ok(viewCode.includes('input-edit-slide-subtitle'), 'Must have slide subtitle input');
    assert.ok(viewCode.includes('textarea-edit-slide-bullets'), 'Must have bullet points textarea');
    assert.ok(viewCode.includes('btn-preset-photo'), 'Must have photo preset selector buttons');
    assert.ok(viewCode.includes('input-slide-custom-image-file'), 'Must support custom photo file upload');
    assert.ok(viewCode.includes('btn-download-slide-png'), 'Must have 1080p slide PNG export button');
  });

  await t.test('5. Saving slides synchronizes both project slides and script sections for seamless workflow', () => {
    assert.ok(viewCode.includes('saveAllSlides'), 'Must implement saveAllSlides');
    assert.ok(viewCode.includes("curProj.slide.slides = slidesList;"), 'Must persist slides in projectState.slide.slides');
    assert.ok(viewCode.includes("saveScriptToDatabase(curProj.id"), 'Must persist generated slide script to database');
    assert.ok(viewCode.includes("navigateTo('scriptwriter')"), 'Must seamlessly transition to Tool 5 (Script)');
  });

  await t.test('6. Realistic Photo Engine (realisticSlidePhotos.js) provides zero-emoji, broadcast-grade SVG photos', async () => {
    const { REALISTIC_PHOTO_COLLECTION, getPhotoPresetDataUrl, getPhotoPresetSvg } = await import('../public/js/utils/realisticSlidePhotos.js');
    assert.ok(Array.isArray(REALISTIC_PHOTO_COLLECTION), 'Must export collection');
    assert.ok(REALISTIC_PHOTO_COLLECTION.length >= 8, 'Must have at least 8 photo visuals');

    const sachivalaya = REALISTIC_PHOTO_COLLECTION.find(p => p.id === 'sachivalaya');
    assert.ok(sachivalaya, 'Sachivalaya visual must exist');
    assert.ok(sachivalaya.svg.includes('ગાંધીનગર સ્વર્ણિમ સંકુલ - સચિવાલય'), 'Must feature architectural title');
    assert.ok(sachivalaya.svg.includes('sDome'), 'Must feature architectural dome');

    const highcourt = REALISTIC_PHOTO_COLLECTION.find(p => p.id === 'highcourt');
    assert.ok(highcourt, 'High Court visual must exist');
    assert.ok(highcourt.svg.includes('ગુજરાત વડી અદાલત • સોલા, અમદાવાદ'), 'Must feature High Court title');

    const courtorder = REALISTIC_PHOTO_COLLECTION.find(p => p.id === 'courtorder');
    assert.ok(courtorder, 'Court Order visual must exist');
    assert.ok(courtorder.svg.includes('LPA NO. 363 OF 2025') || courtorder.svg.includes('LPA 363/2025'), 'Must feature LPA case reference');

    const dataUrl = getPhotoPresetDataUrl('highcourt');
    assert.ok(dataUrl.startsWith('data:image/svg+xml'), 'Must return valid SVG data URL');
  });

  await t.test('7. 3-Card White Stack with Royal Blue Accent and Gyan Yatra branding are verified', () => {
    // 3 Cards Layout with blue accent and numbered badges
    assert.ok(viewCode.includes('border-left: 6px solid #2563eb'), 'Must have 6px Royal Blue left accent bar');
    assert.ok(viewCode.includes('Gyan Yatra'), 'Must feature Gyan Yatra brand watermark');
    assert.ok(viewCode.includes('input-slide-custom-image-url'), 'Must support direct image URL input');
    assert.ok(viewCode.includes('btn-apply-custom-image-url'), 'Must have button to apply custom image URL');
  });

  await t.test('8. Supports Rich Layout Modes: Comparison (Old vs New Salary), Formula (Equation), and Timeline', async () => {
    // HTML preview layout modes
    assert.ok(viewCode.includes("curSlide.layoutType === 'comparison'"), 'Must support comparison layout');
    assert.ok(viewCode.includes("curSlide.layoutType === 'formula'"), 'Must support formula layout');
    assert.ok(viewCode.includes("curSlide.layoutType === 'timeline'"), 'Must support timeline layout');

    // Comparison elements: strikethrough old amount & bold orange new amount
    assert.ok(viewCode.includes('text-decoration: line-through'), 'Must feature strikethrough on old salary');
    assert.ok(viewCode.includes('color: #ea580c'), 'Must feature bold orange text for new salary');

    // Layout selector controls
    assert.ok(viewCode.includes('select-slide-layout-type'), 'Must provide layout dropdown selector in slide editor');
    assert.ok(viewCode.includes('btn-toggle-layout-mode'), 'Must provide toggle layout button');

    // PNG Canvas Export for all layout modes
    assert.ok(viewCode.includes("slide.layoutType === 'comparison'"), 'Canvas export must render comparison cards');
    assert.ok(viewCode.includes("slide.layoutType === 'formula'"), 'Canvas export must render formula equation boxes');
    assert.ok(viewCode.includes("slide.layoutType === 'timeline'"), 'Canvas export must render timeline milestone steps');
  });

  await t.test('9. Built-in Anganwadi High Court Ruling 9-slide authentic template matches user uploaded PDF', async () => {
    const { ANGANWADI_NOTEBOOKLM_9SLIDES } = await import('../public/js/views/slideprompts.js');
    assert.ok(Array.isArray(ANGANWADI_NOTEBOOKLM_9SLIDES), 'Must export 9-slide template');
    assert.strictEqual(ANGANWADI_NOTEBOOKLM_9SLIDES.length, 9, 'Must provide exactly 9 complete presentation slides');

    // Slide 1: High Court ruling with highcourt visual
    assert.strictEqual(ANGANWADI_NOTEBOOKLM_9SLIDES[0].photoType, 'highcourt');
    assert.ok(ANGANWADI_NOTEBOOKLM_9SLIDES[0].title.includes('ગુજરાત હાઇકોર્ટનો ઐતિહાસિક ચુકાદો'));

    // Slide 4: Salary Comparison (₹10,000 crossed vs ₹24,800 orange)
    assert.strictEqual(ANGANWADI_NOTEBOOKLM_9SLIDES[3].layoutType, 'comparison');
    assert.strictEqual(ANGANWADI_NOTEBOOKLM_9SLIDES[3].comparison.oldAmount, '₹૧૦,૦૦૦');
    assert.strictEqual(ANGANWADI_NOTEBOOKLM_9SLIDES[3].comparison.newAmount, '₹૨૪,૮૦૦');

    // Slide 5: Formula Calculation ([10000] + [14800] = [24800])
    assert.strictEqual(ANGANWADI_NOTEBOOKLM_9SLIDES[4].layoutType, 'formula');
    assert.strictEqual(ANGANWADI_NOTEBOOKLM_9SLIDES[4].formula.block1.amount, '₹૧૦,૦૦૦');
    assert.strictEqual(ANGANWADI_NOTEBOOKLM_9SLIDES[4].formula.block2.amount, '₹૧૪,૮૦૦');
    assert.strictEqual(ANGANWADI_NOTEBOOKLM_9SLIDES[4].formula.block3.amount, '₹૨૪,૮૦૦');

    // Slide 6: Timeline Milestone
    assert.strictEqual(ANGANWADI_NOTEBOOKLM_9SLIDES[5].layoutType, 'timeline');
    assert.strictEqual(ANGANWADI_NOTEBOOKLM_9SLIDES[5].timeline.length, 3);

    // 1-click button to load template
    assert.ok(viewCode.includes('btn-load-anganwadi-sample-slides'), 'Must provide 1-click button to load Anganwadi 9-slide sample');
  });
});
