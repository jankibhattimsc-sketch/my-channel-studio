const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('TOOL 2: TOPIC WEB RESEARCH & AUTO-SLIDE CREATOR (ZERO PDF REQUIRED) VERIFICATION', async (t) => {
  const topicResearchService = require('../server/services/topicResearchService');

  await t.test('1. Backend: Topic Web Research generates complete dossier and slide-by-slide deck', async () => {
    const topic = 'આંગણવાડી કાર્યકર અને તેડાગર નવી ભરતી ૨૦૨૬ સત્તાવાર પરિપત્ર';
    const result = await topicResearchService.performTopicWebResearch({
      topic,
      slideCount: 5
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.topic, topic);
    assert.strictEqual(result.domain, 'anganwadi');
    assert.ok(result.researchDossier, 'Must return research dossier');

    // Dossier fields
    const d = result.researchDossier;
    assert.ok(d.department.includes('મહિલા અને બાળ વિકાસ વિભાગ'), 'Must identify correct department');
    assert.ok(d.notificationRef.includes('પરિપત્ર'), 'Must include circular reference');
    assert.ok(d.eligibility.workerQualification.includes('૧૨ પાસ'), 'Must include worker qualification');
    assert.ok(d.financialBenefits.workerHonorarium.includes('માનદવેતન'), 'Must include pay details');
    assert.ok(d.requiredDocuments.length >= 4, 'Must list required documents');
    assert.ok(d.applicationProcess.length >= 3, 'Must list application process steps');

    // Slide-by-slide deck
    assert.strictEqual(result.slides.length, 5, 'Must generate exactly 5 slides');
    result.slides.forEach((slide, idx) => {
      assert.strictEqual(slide.slideNumber, idx + 1);
      assert.ok(slide.title, `Slide ${idx + 1} must have a title`);
      assert.ok(Array.isArray(slide.bulletPoints) && slide.bulletPoints.length > 0, `Slide ${idx + 1} must have bullet points`);
      assert.strictEqual(slide.bgColor, '#FFFFFF', `Slide ${idx + 1} must have 100% Pure White Background`);
      assert.strictEqual(slide.headingBoxBg, '#0F172A', `Slide ${idx + 1} must have Solid Deep Navy Heading Box`);
      assert.ok(slide.scriptText && slide.scriptText.length > 10, `Slide ${idx + 1} must have spoken Gujarati voiceover script`);
    });

    // Script sections
    assert.strictEqual(result.scriptSections.length, 5);
    assert.ok(result.fullScript.includes('નમસ્કાર મિત્રો'), 'Full script must include introductory greeting');
  });

  await t.test('2. Backend: Generates 8-slide deep-dive for DA employee topic', async () => {
    const topic = 'ગુજરાત સરકારી કર્મચારી ૫૦% DA વધારો & એરિયર્સ ૨૦૨૬';
    const result = await topicResearchService.performTopicWebResearch({
      topic,
      slideCount: 8
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.domain, 'da_employee');
    assert.strictEqual(result.slides.length, 8, 'Must expand to 8 slides');

    // Slide 1 to 8 verification
    assert.ok(result.slides[0].title.includes('સત્તાવાર જાહેરાત') || result.slides[0].title.includes('DA'));
    assert.strictEqual(result.slides[7].slideType, 'warning', 'Final slide must be warning/helpline');
    assert.ok(result.slides[7].title.includes('સત્તાવાર હેલ્પલાઇન') || result.slides[7].title.includes('ચેતવણી'));
  });

  await t.test('3. Backend: Farmer scheme topic (PM Kisan / iKhedut) detection and verification', async () => {
    const topic = 'પીએમ કિસાન ૧૯મો હપ્તો ₹૨,૦૦૦ અને ખેડૂત સહાય યોજના';
    const result = await topicResearchService.performTopicWebResearch({
      topic,
      slideCount: 5
    });

    assert.strictEqual(result.domain, 'kisan_scheme');
    assert.ok(result.researchDossier.officialPortal.includes('ikhedut'), 'Must reference ikhedut portal');
    assert.ok(result.researchDossier.eligibility.landRecords.includes('૭/૧૨'), 'Must mention 7/12 land records');
  });

  await t.test('4. Route POST /api/research/topic-web-research is registered in research.js', () => {
    const routeCode = fs.readFileSync(path.join(__dirname, '../server/routes/research.js'), 'utf8');
    assert.ok(routeCode.includes("router.post('/topic-web-research'"), 'Must register /topic-web-research endpoint');
    assert.ok(routeCode.includes('topicResearchService.performTopicWebResearch'), 'Must delegate to topicResearchService');
  });

  await t.test('5. Frontend API: api.js exposes topicWebResearch method', () => {
    const apiCode = fs.readFileSync(path.join(__dirname, '../public/js/api.js'), 'utf8');
    assert.ok(apiCode.includes("topicWebResearch: (data) => api.post('/api/research/topic-web-research', data)"), 'api.js must export topicWebResearch');
  });

  await t.test('6. Workspace Navigation: workspace.js maps Step 2 to Research Studio', () => {
    const wsCode = fs.readFileSync(path.join(__dirname, '../public/js/views/workspace.js'), 'utf8');
    assert.ok(wsCode.includes("id: 'research'"), 'Workspace PRODUCTION_SECTIONS must include research');
    assert.ok(wsCode.includes("title: '૨. Research'"), 'Must display title "૨. Research"');
    assert.ok(wsCode.includes("desc: 'Tool 2: નેટ રિસર્ચ & ઓટો સ્લાઇડ્સ'"), 'Must describe Tool 2');
    assert.ok(wsCode.includes("renderResearch(stageContainer"), 'Must mount renderResearch for Step 2');
  });

  await t.test('7. App Index: public/index.html features Tool 2: Slide Prompts in creator sidebar and Research moved to end', () => {
    const htmlCode = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    assert.ok(htmlCode.includes('id="nav-research"'), 'Must have nav-research link');
    assert.ok(htmlCode.includes('id="nav-slideprompts"'), 'Must have nav-slideprompts link');
    assert.ok(htmlCode.includes('Slide Prompts'), 'Must label Tool 2 as Slide Prompts');
    assert.ok(htmlCode.includes('Research'), 'Must keep Research link');
  });

  await t.test('8. Research View: public/js/views/research.js includes 3-stage UI with zero PDF requirement', () => {
    const viewCode = fs.readFileSync(path.join(__dirname, '../public/js/views/research.js'), 'utf8');
    assert.ok(viewCode.includes('id="btn-run-topic-research"'), 'Must have Net Research action button');
    assert.ok(viewCode.includes('id="btn-save-slides-to-project"'), 'Must have Save Slides to Project button');
    assert.ok(viewCode.includes('slide-content-card'), 'Must render slide content cards');
    assert.ok(viewCode.includes('id="btn-goto-video-editor"'), 'Must have direct transition button to Video Editor');
    assert.ok(viewCode.includes('id="btn-goto-script-studio"'), 'Must have direct transition button to Script Studio');
    assert.ok(viewCode.includes("project.slide.slides = updatedSlides"), 'Must populate project.slide.slides');
    assert.ok(viewCode.includes("bgColor: '#FFFFFF'"), 'Must enforce 100% Pure White Background');
    assert.ok(viewCode.includes("headingBoxBg: '#0F172A'"), 'Must enforce Solid Deep Navy Heading Box');
  });

  await t.test('9. Unified Master Copy Box: Backend generates unifiedMasterContent encompassing all research & slides', async () => {
    const topic = 'આંગણવાડી કાર્યકર અને તેડાગર નવી ભરતી ૨૦૨૬';
    const result = await topicResearchService.performTopicWebResearch({
      topic,
      slideCount: 5
    });

    assert.ok(result.unifiedMasterContent, 'Must generate unifiedMasterContent text');
    assert.ok(result.unifiedMasterContent.includes('🎯 વિષય (TOPIC):'), 'Must include topic header');
    assert.ok(result.unifiedMasterContent.includes('🏛️ સરકારી વિભાગ:'), 'Must include department');
    assert.ok(result.unifiedMasterContent.includes('【૧. મુખ્ય રિસર્ચ હાઇલાઇટ્સ & સત્તાવાર વિગત】'), 'Must include section 1 highlights');
    assert.ok(result.unifiedMasterContent.includes('【૨. પાત્રતા અને શૈક્ષણિક લાયકાત / વયમર્યાદા】'), 'Must include section 2 eligibility');
    assert.ok(result.unifiedMasterContent.includes('【૩. પગાર ધોરણ / સહાય રકમ & નાણાકીય લાભ (DBT)】'), 'Must include section 3 financials');
    assert.ok(result.unifiedMasterContent.includes('【૪. જરૂરી ડોક્યુમેન્ટ્સ ચેકલિસ્ટ】'), 'Must include section 4 documents');
    assert.ok(result.unifiedMasterContent.includes('【૫. ઓનલાઇન અરજી કરવાની સ્ટેપ-બાય-સ્ટેપ રીત】'), 'Must include section 5 steps');
    assert.ok(result.unifiedMasterContent.includes('🎬 ૧૬:૯ સ્લાઇડ પ્રમાણે સંપૂર્ણ કન્ટેન્ટ & સ્ક્રિપ્ટ'), 'Must include all slides content');
    assert.ok(result.unifiedMasterContent.includes('[સ્લાઇડ #1:'), 'Must include slide 1 header');
    assert.ok(result.unifiedMasterContent.includes('📌 ૧૬:૯ સ્લાઇડ બુલેટ પોઇન્ટ્સ:'), 'Must include bullet points');
    assert.ok(result.unifiedMasterContent.includes('🎙️ બોલવાની ગુજરાતી સ્ક્રિપ્ટ (Voiceover Script):'), 'Must include voiceover script');
  });

  await t.test('10. Unified Master Copy Box: research.js UI features single master copy box and 1-click copy button', () => {
    const viewCode = fs.readFileSync(path.join(__dirname, '../public/js/views/research.js'), 'utf8');
    assert.ok(viewCode.includes('id="card-unified-master-box"'), 'Must have unified master box card');
    assert.ok(viewCode.includes('id="unified-research-master-box"'), 'Must have unified master textarea');
    assert.ok(viewCode.includes('id="btn-master-copy-all"'), 'Must have 1-click copy all button');
    assert.ok(viewCode.includes('id="btn-floating-copy"'), 'Must have floating copy button');
    assert.ok(viewCode.includes('એક જ બોક્સમાં આખું રિસર્ચ & સ્લાઇડ કન્ટેન્ટ'), 'Must have clear Gujarati heading');
    assert.ok(viewCode.includes('btn-save-slides-to-project-master'), 'Must have direct save button in master box');
  });
});
