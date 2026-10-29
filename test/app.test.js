const test = require('node:test');
const assert = require('node:assert');
const trendsService = require('../server/services/trendsService');
const openaiService = require('../server/services/openaiService');
const slideMakerService = require('../server/services/slideMakerService');
const db = require('../server/db');

test('1. Topic Scorer and Category Filters', async () => {
  const resultAll = await trendsService.getTopTopics('all');
  assert.ok(resultAll.topics.length > 0, 'Should return topics');
  assert.ok(resultAll.topics.length <= 10, 'Should not exceed 10 topics');
  
  // Verify topic schema
  const first = resultAll.topics[0];
  assert.ok(first.topicGujarati, 'Should have Gujarati topic name');
  assert.ok(first.whyViewersWatch, 'Should explain why viewers watch');
  assert.ok(first.targetAudience, 'Should specify target audience');
  assert.ok(first.trendEvidence, 'Should specify trend evidence');
  assert.ok(first.competitionLevel, 'Should specify competition level');
  assert.ok(first.suggestedFormat, 'Should specify video format');
  assert.ok(first.suggestedTitle, 'Should specify suggested title');
  assert.ok(first.searchKeywords && first.searchKeywords.length > 0, 'Should specify keywords');
  assert.ok(first.thumbnailConcept, 'Should specify thumbnail concept');
  assert.ok(first.scores && first.scores.overall >= 0 && first.scores.overall <= 100, 'Should have transparent score 0-100');

  // Test filter
  const resultTech = await trendsService.getTopTopics('tech');
  assert.ok(resultTech.topics.every(t => t.category === 'tech'), 'All topics must belong to tech');

  const resultSchemes = await trendsService.getTopTopics('schemes');
  assert.ok(resultSchemes.topics.every(t => t.category === 'schemes'), 'All topics must belong to schemes');
});

test('2. Word Count and Script Duration Calculator', async () => {
  // Test 10-minute video
  const script10 = await openaiService.generateScript({
    topic: 'ગુજરાત સરકારની નવી યોજના',
    durationMinutes: 10,
    language: 'gu'
  });

  assert.strictEqual(script10.durationMinutes, 10);
  assert.strictEqual(script10.targetWordCount, 1300); // 10 * 130
  assert.ok(script10.sections && script10.sections.length >= 4, 'Long script should have structured sections');
  assert.ok(script10.sections.some(s => s.sectionName.includes('હૂક') || s.sectionName.includes('Hook')), 'Must have Hook section');
  assert.ok(script10.sections.some(s => s.sectionName.includes('પરિચય') || s.sectionName.includes('Intro')), 'Must have Intro section');
  assert.ok(script10.sections.some(s => s.sectionName.includes('સમાપન') || s.sectionName.includes('Outro')), 'Must have Outro section');

  // Test Shorts 60s
  const scriptShorts = await openaiService.generateScript({
    topic: 'વોટ્સએપ નવો અપડેટ',
    durationMinutes: 1,
    language: 'gu'
  });
  assert.strictEqual(scriptShorts.durationMinutes, 1);
  assert.strictEqual(scriptShorts.targetWordCount, 130);
});

test('3. One-Click SEO Generator Output Quality', async () => {
  const seo = await openaiService.generateSEO('મોબાઇલથી ઓનલાઇન કમાણી 2026', 'business');

  assert.ok(Array.isArray(seo.titles), 'Titles must be an array');
  assert.strictEqual(seo.titles.length, 10, 'Must provide 10 clickable Gujarati titles');
  assert.ok(seo.abTestTitles && seo.abTestTitles.emotional, 'Must provide emotional A/B title');
  assert.ok(seo.abTestTitles.curiosity, 'Must provide curiosity A/B title');
  assert.ok(seo.abTestTitles.benefit, 'Must provide benefit A/B title');
  assert.ok(seo.description && seo.description.includes('નમસ્તે'), 'Must provide Gujarati description');
  assert.ok(seo.tags && seo.tags.length >= 8, 'Must provide tags list');
  assert.ok(seo.primaryKeywords && seo.primaryKeywords.length >= 2, 'Must provide primary keywords');
  assert.ok(seo.chapters && seo.chapters.length >= 4, 'Must provide video chapters');
  assert.ok(seo.pinnedComment, 'Must provide pinned comment');
  assert.ok(seo.callToAction, 'Must provide Call To Action');
  assert.ok(seo.suggestedFilename && seo.suggestedFilename.endsWith('.mp4'), 'Must suggest mp4 video filename');
  assert.ok(seo.thumbnailText, 'Must suggest short thumbnail text');
});

test('4. Thumbnail Concepts Structure', async () => {
  const thumbs = await openaiService.generateThumbnailConcepts('નવા સરકારી નિયમો');
  assert.ok(Array.isArray(thumbs.concepts), 'Concepts must be an array');
  assert.strictEqual(thumbs.concepts.length, 3, 'Must have exactly 3 thumbnail concepts');
  
  thumbs.concepts.forEach(c => {
    assert.ok(c.gujaratiText, 'Must have Gujarati punchline text');
    assert.ok(c.subjectPlacement, 'Must specify subject placement');
    assert.ok(c.expression, 'Must specify facial expression');
    assert.ok(c.background, 'Must specify background contrast');
    assert.ok(c.imagePrompt, 'Must include AI generation prompt');
  });
});

test('5. Database Persistence (Atomic Operations)', () => {
  // Test saving and reading a script
  const testScript = {
    title: 'ટેસ્ટ સ્ક્રિપ્ટ - GPSC તૈયારી',
    topic: 'GPSC',
    durationMinutes: 5,
    sections: [{ sectionName: 'Hook', content: 'નમસ્તે મિત્રો!' }]
  };

  const saved = db.saveScript(testScript);
  assert.ok(saved.id, 'Saved script should receive an ID');
  
  const fetched = db.getScriptById(saved.id);
  assert.strictEqual(fetched.title, testScript.title);

  // Test chat message
  const msg = db.addMessage({
    conversationId: 'default-conv',
    role: 'user',
    content: 'ટેસ્ટ ચેટ સંદેશ'
  });
  assert.ok(msg.id);
  
  const history = db.getMessages('default-conv');
  assert.ok(history.some(m => m.id === msg.id), 'Message should be in history');

  // Clean up
  db.deleteScript(saved.id);
  assert.strictEqual(db.getScriptById(saved.id), undefined);
});

test('6. 48-Hour YouTube Trend Analyzer & EXACTLY 3 Video Ideas with Recovered Prompts', async () => {
  const result = await trendsService.get48hTrendAnalysis({ category: 'schemes' });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.ideas.length, 3, 'Must return EXACTLY 3 ranked video ideas');
  assert.ok(result.dataSourcesConnected && result.dataSourcesConnected.length >= 3, 'Must specify data sources connected');
  assert.ok(result.transparencyNotice, 'Must explicitly state 48h historical view metrics transparency');

  // Verify ranking
  assert.strictEqual(result.ideas[0].rank, 1, 'First idea must be Rank #1');
  assert.strictEqual(result.ideas[1].rank, 2, 'Second idea must be Rank #2');
  assert.strictEqual(result.ideas[2].rank, 3, 'Third idea must be Rank #3');

  // Verify all 10 items for each idea
  result.ideas.forEach((idea, idx) => {
    // 1. Topic & Suggested Title
    assert.ok(idea.topicGujarati, `Idea ${idx + 1} must have Gujarati topic`);
    assert.ok(idea.suggestedTitle, `Idea ${idx + 1} must have clickable Gujarati title`);

    // 2. Selection Rationale
    assert.ok(idea.selectionRationale, `Idea ${idx + 1} must have selection rationale`);

    // 3. Trend Evidence & Source
    assert.ok(idea.trendEvidence, `Idea ${idx + 1} must have trend evidence`);
    assert.ok(idea.trendSource, `Idea ${idx + 1} must have trend source`);

    // 4. View Metrics with transparent distinction
    assert.ok(idea.viewMetrics, `Idea ${idx + 1} must have view metrics`);
    assert.ok(idea.viewMetrics.lifetimeViews, `Idea ${idx + 1} must specify lifetime views`);
    assert.ok(idea.viewMetrics.accumulated48h, `Idea ${idx + 1} must specify 48h accumulation`);
    assert.ok(idea.viewMetrics.measurementPeriod, `Idea ${idx + 1} must clearly state measurement period`);
    assert.ok(idea.viewMetrics.transparencyNote, `Idea ${idx + 1} must provide transparency note`);

    // 5. Target Audience
    assert.ok(idea.targetAudience, `Idea ${idx + 1} must have target audience`);

    // 6. Format & Duration
    assert.ok(idea.suggestedFormat, `Idea ${idx + 1} must have format`);
    assert.ok(idea.approxDuration, `Idea ${idx + 1} must have duration`);

    // 7. Opening Hook
    assert.ok(idea.openingHook && idea.openingHook.length > 10, `Idea ${idx + 1} must have strong opening hook`);

    // 8. Factuality Warning
    assert.ok(idea.factualityWarning && idea.factualityWarning.includes('⚠️'), `Idea ${idx + 1} must have factuality warning`);

    // 9. Confidence Rating (Evidence-based, no fake 200% viral claim)
    assert.ok(idea.confidenceRating, `Idea ${idx + 1} must have confidence rating`);
    assert.ok(idea.confidenceRating.score <= 100, 'Confidence score must not exceed 100%');
    assert.ok(idea.confidenceRating.explanation, 'Must explain evidence confidence');

    // 10. Selected Thumbnail & Script Prompts
    assert.ok(idea.prompts, `Idea ${idx + 1} must contain prompts`);

    // Requirement 3: Recovered Thumbnail Prompt (Pure Solid White #FFFFFF, Authentic Photo, 4-5 Bold Words, DALL-E)
    const thumbPrompt = idea.prompts.thumbnailPrompt;
    assert.ok(thumbPrompt.includes('#FFFFFF'), 'Thumbnail prompt must enforce 100% pure solid white background');
    assert.ok(thumbPrompt.includes('DALL-E 3'), 'Thumbnail prompt must include DALL-E 3 short prompt');
    assert.ok(thumbPrompt.includes('NO 3D cartoon') || thumbPrompt.includes('NO 3D'), 'Thumbnail prompt must forbid 3D/cartoon');

    // Requirement 4: Separate Script Prompt (Meta-prompt for AI; NOT completed script)
    const scriptPrompt = idea.prompts.scriptPrompt;
    assert.ok(scriptPrompt.includes('તમે એક વરિષ્ઠ'), 'Script prompt must be a meta-prompt for AI writer');
    assert.ok(scriptPrompt.includes('Spoken Gujarati'), 'Script prompt must request natural Spoken Gujarati');
    assert.ok(scriptPrompt.includes('STRICT FACT-CHECKING RULES'), 'Script prompt must mandate strict fact checking');
    assert.ok(!scriptPrompt.startsWith('{"title"'), 'Must be a prompt for an AI, not JSON or completed script');

    // Requirement 5: Slide Prompt Separation
    const slidePrompt = idea.prompts.slidePrompt;
    assert.ok(slidePrompt.includes('NotebookLM'), 'Slide prompt must specify presentation/NotebookLM structure');
    assert.notStrictEqual(slidePrompt, scriptPrompt, 'Slide prompt must be completely separate from script prompt');
    assert.notStrictEqual(slidePrompt, thumbPrompt, 'Slide prompt must be completely separate from thumbnail prompt');
  });
});

test('7. Smart Thumbnail Text & Color Contrast Optimizer Verification', () => {
  const thumbnailOptimizerService = require('../server/services/thumbnailOptimizerService');

  // Case 1: Government scheme topic (Kisan Sahay)
  const schemeResult = thumbnailOptimizerService.generateOptimizedPrompt('ગુજરાત સરકાર નવી કિસાન સહાય યોજના ૨૦૨૬');
  assert.strictEqual(schemeResult.template, 'white_minimalist');
  assert.strictEqual(schemeResult.colorPalette.background, '#FFFFFF');
  assert.strictEqual(schemeResult.colorPalette.primaryText, '#102A56');
  assert.strictEqual(schemeResult.colorPalette.accentPanel, '#D71920');
  assert.strictEqual(schemeResult.colorPalette.accentPanelText, '#FFD928');
  assert.strictEqual(schemeResult.colorPalette.supportingText, '#111111');
  assert.ok(schemeResult.textElements.element1.includes('ખેડૂત'), 'Element 1 should identify farmers/kisan');
  assert.ok(schemeResult.textElements.element2.includes('સહાય'), 'Element 2 should identify sahay');
  assert.ok(schemeResult.photoSubject.english.includes('farmer'), 'Photo should feature a dignified Gujarati farmer');
  assert.ok(schemeResult.fullMarkdownPrompt.includes('#FFFFFF'), 'Must enforce #FFFFFF background');
  assert.ok(schemeResult.dalleShortPrompt.includes('#102A56'), 'DALL-E prompt must specify Deep Navy Blue #102A56');
  assert.ok(schemeResult.dalleShortPrompt.includes('#D71920'), 'DALL-E prompt must specify Crimson Red #D71920');

  // Case 2: DA or salary-related topic (CM Bhupendra Patel photo)
  const salaryResult = thumbnailOptimizerService.generateOptimizedPrompt('ગુજરાત સરકારી કર્મચારી DA વધારો મંજૂર ૨૦૨૬');
  assert.ok(salaryResult.textElements.element1.includes('કર્મચારી'), 'Element 1 should be Gujarat Govt Employees');
  assert.ok(salaryResult.textElements.element2.includes('DA'), 'Element 2 should be DA hike');
  assert.ok(salaryResult.photoSubject.english.includes('Bhupendra Patel'), 'Photo subject must be CM Bhupendra Patel');
  assert.ok(salaryResult.fullMarkdownPrompt.includes('ભૂપેન્દ્ર પટેલ'), 'Markdown prompt must reference CM Bhupendra Patel');

  // Case 3: Recruitment topic (Police & LRD)
  const policeResult = thumbnailOptimizerService.generateOptimizedPrompt('ગુજરાત પોલીસ કોન્સ્ટેબલ અને LRD નવી ભરતી ૨૦૨૬');
  assert.ok(policeResult.textElements.element1.includes('પોલીસ'), 'Element 1 should be Police');
  assert.ok(policeResult.textElements.element2.includes('જગ્યાઓ') || policeResult.textElements.element2.includes('ભરતી'), 'Element 2 should be vacancies/bharti');
  assert.ok(policeResult.photoSubject.english.includes('khaki'), 'Photo subject must be in crisp khaki uniform');

  // Case 4: Education or exam topic (GSEB Result)
  const eduResult = thumbnailOptimizerService.generateOptimizedPrompt('GSEB ધોરણ ૧૦-૧૨ બોર્ડ રીઝલ્ટ તારીખ 2026');
  assert.ok(eduResult.textElements.element1.includes('બોર્ડ'), 'Element 1 should identify board');
  assert.ok(eduResult.textElements.element2.includes('પરિણામ') || eduResult.textElements.element2.includes('રીઝલ્ટ'), 'Element 2 should be result date');
  assert.ok(eduResult.photoSubject.english.includes('educator') || eduResult.photoSubject.english.includes('student'), 'Photo subject must be educator or student');

  // Case 5: Unverified claim / speculative topic (Never invent fake salary hikes or approvals!)
  const unverifiedResult = thumbnailOptimizerService.generateOptimizedPrompt('શું ગુજરાત કર્મચારીઓનો પગાર 50% વધી ગયો? શું છે સત્ય?');
  assert.ok(!unverifiedResult.textElements.element2.includes('મંજૂર થઈ ગયું'), 'Must NEVER invent false approval claims');
  assert.ok(!unverifiedResult.textElements.element2.includes('સરકારે મંજૂર કર્યું'), 'Must NEVER inject unverified government approvals');
  assert.ok(unverifiedResult.textElements.element2.includes('?') || unverifiedResult.textElements.element2.includes('કેટલો') || unverifiedResult.textElements.element2.includes('નિયમો'), 'Must use safe factual query phrasing');

  // Case 6: Pure Solid White Background & Negative Restrictions
  assert.ok(salaryResult.fullMarkdownPrompt.includes('૧૦૦% શુદ્ધ સફેદ (#FFFFFF)'), 'Must enforce pure solid white background in prompt');
  assert.ok(salaryResult.dalleShortPrompt.includes('NO 3D cartoon, NO neon'), 'DALL-E prompt must forbid 3D cartoon & neon');
  assert.ok(salaryResult.dalleShortPrompt.includes('NO dark gradients, NO gaming effects'), 'Must forbid dark gradients and gaming effects');

  // Case 7: User Overrides preserved in generated prompt
  const overridden = thumbnailOptimizerService.generateOptimizedPrompt('ગુજરાત નવી યોજના', {
    element1: 'સ્પેશિયલ અપડેટ',
    element2: 'મોટી રાહત જાહેર',
    element3: 'આજે જ અરજી કરો',
    element4: 'નવો GR'
  });
  assert.strictEqual(overridden.textElements.element1, 'સ્પેશિયલ અપડેટ');
  assert.strictEqual(overridden.textElements.element2, 'મોટી રાહત જાહેર');
  assert.strictEqual(overridden.textElements.element3, 'આજે જ અરજી કરો');
  assert.strictEqual(overridden.textElements.element4, 'નવો GR');
  assert.ok(overridden.fullMarkdownPrompt.includes('સ્પેશિયલ અપડેટ'), 'Prompt must use user customized Element 1');
  assert.ok(overridden.fullMarkdownPrompt.includes('મોટી રાહત જાહેર'), 'Prompt must use user customized Element 2');
});

test('8. Universal NotebookLM White-Background Slide Deck Prompt Generator Across 4 Mandatory Domains', async () => {
  const notebooklmPromptService = require('../server/services/notebooklmPromptService');

  // Test Topic 1: Gujarat Government Scheme (Kisan Sahay)
  const schemeResult = await notebooklmPromptService.generatePrompt({
    topic: 'ગુજરાત સરકાર નવી કિસાન સહાય યોજના ૨૦૨૬: સહાય રકમ, પાત્રતા અને iKhedut અરજી',
    templateId: 'white-real',
    tool: 'notebooklm-slides',
    slideCount: '8-10'
  });

  assert.strictEqual(schemeResult.domain, 'scheme');
  assert.strictEqual(schemeResult.templateId, 'white-real');
  assert.ok(schemeResult.promptText.includes('SECTION A: ઊંડું સંશોધન માર્ગદર્શિકા (DEEP RESEARCH INSTRUCTIONS)'), 'Must include Section A');
  assert.ok(schemeResult.promptText.includes('SECTION B: સ્ત્રોત ગુણવત્તા & ફેક્ટ-ચેકિંગ કડક નિયમો (SOURCE CONTROL & ACCURACY)'), 'Must include Section B');
  assert.ok(schemeResult.promptText.includes('SECTION C: વિષય-અનુકૂળ સ્લાઇડ આઉટલાઇન (TOPIC-SPECIFIC SLIDE OUTLINE)'), 'Must include Section C');
  assert.ok(schemeResult.promptText.includes('SECTION D: ફિક્સ્ડ વિઝ્યુઅલ ડિઝાઇન — શુદ્ધ સફેદ બેકગ્રાઉન્ડ (CLEAN WHITE VISUAL DESIGN)'), 'Must include Section D');
  assert.ok(schemeResult.promptText.includes('SECTION E: વાસ્તવિક અસલી ફોટોગ્રાફ્સ (AUTHENTIC REAL-WORLD PHOTOGRAPHS)'), 'Must include Section E');
  assert.ok(schemeResult.promptText.includes('SECTION F: સ્લાઇડ-બાય-સ્લાઇડ કન્ટેન્ટ & લેઆઉટ વિગત (SLIDE-BY-SLIDE CONTENT)'), 'Must include Section F');
  assert.ok(schemeResult.promptText.includes('SECTION G: ભાષા & શૈલી (LANGUAGE & AUDIENCE TONE)'), 'Must include Section G');
  assert.ok(schemeResult.promptText.includes('SECTION H: અંતિમ ગુણવત્તા ચકાસણી (QUALITY CONTROL)'), 'Must include Section H');
  assert.ok(schemeResult.promptText.includes('SECTION I: NOTEBOOKLM સ્લાઇડ ડેક જનરેશન આદેશ (FINAL GENERATION COMMAND)'), 'Must include Section I');

  // Pure White Background & Negative Restrictions
  assert.ok(schemeResult.promptText.includes('#FFFFFF'), 'Must enforce #FFFFFF background');
  assert.ok(schemeResult.promptText.includes('#0F172A') || schemeResult.promptText.includes('#102A56'), 'Must specify dark navy headings');
  assert.ok(schemeResult.promptText.includes('STRICTLY NO DARK SLIDES'), 'Must forbid dark slides');
  assert.ok(schemeResult.promptText.includes('STRICTLY NO NEON'), 'Must forbid neon colors');
  assert.ok(schemeResult.promptText.includes('STRICTLY NO 3D CARTOON'), 'Must forbid 3D cartoons');
  assert.ok(schemeResult.promptText.includes('iKhedut'), 'Scheme outline must adapt to iKhedut portal');
  assert.ok(schemeResult.previewSlides.length >= 6, 'Must generate slide preview cards');

  // Test Topic 2: Government Recruitment (Police / LRD Bharti)
  const recruitmentResult = await notebooklmPromptService.generatePrompt({
    topic: 'ગુજરાત પોલીસ કોન્સ્ટેબલ અને LRD ભરતી ૨૦૨૬: સત્તાવાર જાહેરાત, સિલેબસ અને લાયકાત',
    templateId: 'white-real'
  });
  assert.strictEqual(recruitmentResult.domain, 'recruitment');
  assert.ok(recruitmentResult.promptText.includes('OJAS'), 'Recruitment must reference OJAS portal');
  assert.ok(recruitmentResult.promptText.includes('ગાંધીનગર') || recruitmentResult.promptText.includes('સચિવાલય'), 'Must specify Gujarat Sachivalaya/authentic context');
  assert.ok(recruitmentResult.promptText.includes('#FFFFFF'), 'Recruitment must enforce pure white background');

  // Test Topic 3: Educational / Competitive Exam (TET / TAT Syllabus)
  const examResult = await notebooklmPromptService.generatePrompt({
    topic: 'TET / TAT ૨૦૨૬ નવો પરીક્ષા સિલેબસ, પેપર પેટર્ન અને પાસિંગ માર્ક્સ',
    templateId: 'white-real'
  });
  assert.strictEqual(examResult.domain, 'education');
  assert.ok(examResult.promptText.includes('GCERT') || examResult.promptText.includes('સિલેબસ'), 'Education must reference GCERT or syllabus');
  assert.ok(examResult.promptText.includes('SECTION A:'), 'Must include research instructions');

  // Test Topic 4: Technology / Business (AI & ChatGPT)
  const techResult = await notebooklmPromptService.generatePrompt({
    topic: 'આર્ટિફિશિયલ ઇન્ટેલિજન્સ (AI) અને ChatGPT થી ૨૦૨૬ માં ઓનલાઇન કમાણી',
    templateId: 'white-real'
  });
  assert.strictEqual(techResult.domain, 'technology');
  assert.ok(techResult.promptText.includes('આર્કિટેક્ચર') || techResult.promptText.includes('સિસ્ટમ'), 'Technology must adapt to tech architecture/flow');
  assert.ok(techResult.promptText.includes('#FFFFFF'), 'Must enforce #FFFFFF background');

  // Verify meta-prompt requirement: NOT a finished PPT and NOT JSON
  assert.ok(techResult.promptText.startsWith('તમે એક વરિષ્ઠ સંશોધક'), 'Must be a meta-prompt for NotebookLM');
  assert.ok(!techResult.promptText.startsWith('{'), 'Must not be a JSON response');
  assert.ok(techResult.scriptPromptText.includes('તમે એક વરિષ્ઠ શિક્ષણવિદ્'), 'Must provide companion voiceover script meta-prompt');

  // Verify Tool 1 (Content & Research Source Maker) and Tool 2 (16:9 White PPT & Best Real Photos)
  assert.ok(schemeResult.contentSourcePrompt.includes('તમે એક વરિષ્ઠ સંશોધન વિશ્લેષક'), 'Tool 1 must generate deep research source prompt');
  assert.ok(schemeResult.contentSourcePrompt.includes('STRICT ZERO FABRICATION'), 'Tool 1 must mandate strict zero fabrication');
  assert.ok(schemeResult.contentSourcePrompt.includes('NOTEBOOKLM AUDIO OVERVIEW'), 'Tool 1 must include audio overview discussion');
  assert.ok(schemeResult.pptDeckPrompt.includes('BEST REAL PHOTOS'), 'Tool 2 must mandate best real photos');
  assert.ok(schemeResult.pptDeckPrompt.includes('#FFFFFF'), 'Tool 2 must mandate pure white background');
});

test('9. Slide-by-Slide Gujarati YouTube Voiceover Script Expert Verification', () => {
  const slideVoiceoverService = require('../server/services/slideVoiceoverService');

  // Case 1: Single Slide Input (DA & Salary Hike)
  const singleSlideResult = slideVoiceoverService.generateVoiceoverMasterPrompt({
    slides: [
      {
        slideNumber: 1,
        title: 'ગુજરાત સરકાર કર્મચારી ૭મા પગારપંચ DA વધારો અને એરિયર્સ નિયમો',
        visual: 'ગાંધીનગર સચિવાલય ઠરાવ / સત્તાવાર પરિપત્ર',
        content: '• ૭મા પગારપંચ મુજબ મોંઘવારી ભથ્થામાં ૪% સીધો વધારો મંજૂર\n• પાછલી અસરથી એટલે કે જુલાઈથી અમલ થશે\n• બાકી રહેલા મહિનાઓનો રોકડ તફાવત એરિયર્સ તરીકે ખાતામાં જમા',
        timing: '00:00 - 01:30'
      }
    ],
    overallTopic: 'ગુજરાત સરકાર કર્મચારી ૭મા પગારપંચ DA વધારો અને એરિયર્સ નિયમો'
  });

  assert.strictEqual(singleSlideResult.success, true);
  assert.strictEqual(singleSlideResult.totalSlides, 1);
  assert.ok(singleSlideResult.masterPrompt.includes('GYAN YATRA — SLIDE-BY-SLIDE GUJARATI YOUTUBE VOICEOVER SCRIPT EXPERT'), 'Prompt must use Master Prompt title');
  assert.ok(singleSlideResult.masterPrompt.includes('STRICT 7-SECTION FORMAT'), 'Must mandate strict 7-section format');
  assert.ok(singleSlideResult.masterPrompt.includes('1. Slide Understanding'), 'Must require Section 1');
  assert.ok(singleSlideResult.masterPrompt.includes('2. Audience Retention Objective'), 'Must require Section 2');
  assert.ok(singleSlideResult.masterPrompt.includes('3. Word-for-Word Gujarati Voiceover Script'), 'Must require Section 3');
  assert.ok(singleSlideResult.masterPrompt.includes('4. Optional Voice Delivery Notes'), 'Must require Section 4');
  assert.ok(singleSlideResult.masterPrompt.includes('5. On-Screen Highlight Suggestions'), 'Must require Section 5');
  assert.ok(singleSlideResult.masterPrompt.includes('6. Fact-Check and Sources'), 'Must require Section 6');
  assert.ok(singleSlideResult.masterPrompt.includes('7. Transition to the Next Slide'), 'Must require Section 7');
  assert.ok(singleSlideResult.masterPrompt.includes('ZERO FABRICATION'), 'Must enforce strict zero fabrication rule');
  assert.ok(singleSlideResult.preRenderedScript.includes('Word-for-Word Gujarati Voiceover Script'), 'Pre-rendered script must have section 3');
  assert.ok(singleSlideResult.preRenderedScript.includes('Transition to the Next Slide'), 'Pre-rendered script must have section 7');

  // Case 2: Multi-Slide Input (Police / Anganwadi recruitment flow)
  const multiSlideResult = slideVoiceoverService.generateVoiceoverMasterPrompt({
    slides: [
      {
        slideNumber: 1,
        title: 'ગુજરાત પોલીસ કોન્સ્ટેબલ ૧૨,૦૦૦+ ભરતી નોટિફિકેશન',
        visual: 'LRD ભરતી બોર્ડ પરિપત્ર',
        content: '૧૨,૪૭૨ જગ્યાઓ મંજૂર\nઓજસ પોર્ટલ પર ઓનલાઇન અરજી',
        timing: '00:00 - 01:15'
      },
      {
        slideNumber: 2,
        title: 'શારીરિક કસોટી (PET/PST) અને દોડના નિયમો',
        visual: 'ગ્રાઉન્ડ ટેસ્ટ ટાઈમ ટેબલ',
        content: 'પુરુષો માટે ૫૦૦૦ મીટર દોડ\nમહિલાઓ માટે ૧૬૦૦ મીટર દોડ',
        timing: '01:15 - 02:45'
      }
    ],
    overallTopic: 'ગુજરાત પોલીસ ૧૨,૦૦૦+ ભરતી પ્રક્રિયા'
  });

  assert.strictEqual(multiSlideResult.totalSlides, 2);
  assert.ok(multiSlideResult.masterPrompt.includes('COMPLETE VIDEO FLOW REQUIRED'), 'Multi-slide must require complete video flow');
  assert.ok(multiSlideResult.masterPrompt.includes('A. ૨૦-૩૦ સેકન્ડનો દમદાર ઓપનિંગ હૂક'), 'Must mandate Opening Hook');
  assert.ok(multiSlideResult.masterPrompt.includes('Gyan Yatra App'), 'Must mandate Gyan Yatra App CTA');
  assert.ok(multiSlideResult.masterPrompt.includes('અંતિમ ફેક્ટ-ચેક ચેકલિસ્ટ'), 'Must mandate fact-check checklist');

  // Case 3: Domain Detection
  assert.strictEqual(slideVoiceoverService.detectCategory('DA પગાર વધારો'), 'salary_da');
  assert.strictEqual(slideVoiceoverService.detectCategory('કિસાન સહાય યોજના ikhedut'), 'scheme');
  assert.strictEqual(slideVoiceoverService.detectCategory('પોલીસ કોન્સ્ટેબલ ભરતી ojas'), 'recruitment');
  assert.strictEqual(slideVoiceoverService.detectCategory('TET-2 પરીક્ષા સિલેબસ'), 'education');
  assert.strictEqual(slideVoiceoverService.detectCategory('આંગણવાડી તેડાગર માનદવેતન'), 'anganwadi');
});

test('10. Slide-Wise Engaging Script Prompt Generator (Section 9 Output Format & 5 Slide Types)', () => {
  const slideVoiceoverService = require('../server/services/slideVoiceoverService');

  // Test across all 5 mandatory slide types:
  // 1. Government Scheme (Kisan Sahay)
  // 2. Recruitment & Eligibility (Police / LRD)
  // 3. Educational Concept (TET / TAT)
  // 4. Statistics & Comparison (7th Pay DA 4% & Arrears)
  // 5. Image / Chart / Diagram (Sachivalaya GR / Pay Matrix table)
  const testSlides = [
    {
      slideNumber: 1,
      title: 'મુખ્યમંત્રી કિસાન સહાય યોજના ૨૦૨૬: સહાય રકમ અને પાત્રતા',
      visual: 'કૃષિ વિભાગ ગુજરાત સરકાર સત્તાવાર પરિપત્ર અને ખેડૂત ફોટો',
      content: '• પાક નુકસાની સામે ખેડૂતોને સીધી આર્થિક સહાય\n• ૪ એકર સુધી પ્રતિ હેક્ટર સહાય રકમ નક્કી\n• iKhedut પોર્ટલ પર ઓનલાઇન અરજી',
      timing: '00:00 - 01:30'
    },
    {
      slideNumber: 2,
      title: 'ગુજરાત પોલીસ કોન્સ્ટેબલ ૧૨,૦૦૦+ ભરતી લાયકાત અને વયમર્યાદા',
      visual: 'LRD ભરતી બોર્ડ સત્તાવાર જાહેરાત અને વયમર્યાદા ચાર્ટ',
      content: '• ૧૨ પાસ અને ગ્રેજ્યુએશન શૈક્ષણિક લાયકાત\n• સામાન્ય અને અનામત વર્ગ માટે વયમર્યાદામાં છૂટછાટ\n• OJAS પોર્ટલ પર ઓનલાઇન રજીસ્ટ્રેશન',
      timing: '01:30 - 03:00'
    },
    {
      slideNumber: 3,
      title: 'TET-2 પરીક્ષા નવો ૨૦૦ ગુણનો સિલેબસ અને પેપર પેટર્ન',
      visual: 'GCERT ધોરણ ૬ થી ૮ અભ્યાસક્રમ ડાયાગ્રામ અને ગુણભાર ટેબલ',
      content: '• બાળવિકાસ અને શિક્ષણના સિદ્ધાંતો ૨૫ ગુણ\n• ગુજરાતી અને અંગ્રેજી ભાષા ૫૦ ગુણ\n• ગણિત/વિજ્ઞાન અને સામાજિક વિજ્ઞાન ૭૫ ગુણ',
      timing: '03:00 - 04:30'
    },
    {
      slideNumber: 4,
      title: '૭મા પગારપંચ DA ૪% વધારો: ગ્રેડ-પે મુજબ એરિયર્સ ગણતરી કોષ્ટક',
      visual: 'વર્ગ-૩ અને વર્ગ-૪ કર્મચારી પે-મેટ્રિક્સ ડેટા સ્ટેટિસ્ટિક્સ ટેબલ',
      content: '• મૂળ પગાર ₹૨૫,૦૦૦ થી ₹૫૫,૦૦૦ મુજબ ચોખ્ખો વધારો\n• ૪% DA મુજબ દર મહિને ₹૧,૦૦૦ થી ₹૨,૨૦૦ વધારો\n• જુલાઈથી અત્યાર સુધીનું રોકડ એરિયર્સ ખાતામાં જમા',
      timing: '04:30 - 06:00'
    },
    {
      slideNumber: 5,
      title: 'ગાંધીનગર સચિવાલય નાણાં વિભાગ સત્તાવાર પરિપત્ર (GR) વિશ્લેષણ',
      visual: 'સત્તાવાર સરકારી ઠરાવ (GR) નો હાઇ-રિઝોલ્યુશન ફોટો અને ઓનલાઈન પોર્ટલ',
      content: '• સત્તાવાર ઠરાવ ક્રમાંક અને પરિપત્ર તારીખ પુરાવો\n• ફાઇનાન્સ ડિપાર્ટમેન્ટ finance.gujarat.gov.in પોર્ટલ રેફરન્સ\n• Gyan Yatra App પરથી સત્તાવાર પીડીએફ ડાઉનલોડ કરો',
      timing: '06:00 - 07:30'
    }
  ];

  // Test detailed depth
  const detailedResult = slideVoiceoverService.generateMasterPromptForSlides({
    slides: testSlides,
    overallTopic: 'ગુજરાત સરકાર મોટા નિર્ણયો ૨૦૨૬',
    explanationDepth: 'detailed',
    language: 'gu'
  });

  assert.strictEqual(detailedResult.success, true);
  assert.strictEqual(detailedResult.slideCount, 5);
  assert.strictEqual(detailedResult.slidePrompts.length, 5);

  // Check each individual slide prompt against Section 9 format:
  detailedResult.slidePrompts.forEach((sp, idx) => {
    assert.strictEqual(sp.slideNumber, idx + 1);
    assert.ok(sp.promptText.includes(`SLIDE ${idx + 1} — SCRIPT GENERATION PROMPT`), `Slide ${idx + 1} must include Section 9 title`);
    assert.ok(sp.promptText.includes('Slide heading:'), `Slide ${idx + 1} must include Slide heading`);
    assert.ok(sp.promptText.includes('Slide information:'), `Slide ${idx + 1} must include Slide information`);
    assert.ok(sp.promptText.includes('Script-writing instructions:'), `Slide ${idx + 1} must include Script-writing instructions`);
    assert.ok(sp.promptText.includes('Language and tone:'), `Slide ${idx + 1} must include Language and tone`);
    assert.ok(sp.promptText.includes('Engagement requirements:'), `Slide ${idx + 1} must include Engagement requirements`);
    assert.ok(sp.promptText.includes('Accuracy requirements:'), `Slide ${idx + 1} must include Accuracy requirements`);
    assert.ok(sp.promptText.includes('Length requirements:'), `Slide ${idx + 1} must include Length requirements`);
    assert.ok(sp.promptText.includes('Final instruction:'), `Slide ${idx + 1} must include Final instruction`);
    assert.ok(sp.promptText.includes('Write the complete word-for-word spoken voice-over script for this slide, ready for recording.'), `Slide ${idx + 1} must end with exact final instruction`);
    assert.ok(sp.promptText.includes('STRICT ZERO FABRICATION'), `Slide ${idx + 1} must mandate zero fabrication`);
    assert.strictEqual(sp.recommendedWords, 150);
  });

  // Verify inter-slide transitions
  assert.ok(detailedResult.slidePrompts[0].promptText.includes('Opening Hook:'), 'Slide 1 must include Opening Hook');
  assert.ok(detailedResult.slidePrompts[0].promptText.includes('Transition to Next Slide:'), 'Slide 1 must include transition to next slide');
  assert.ok(detailedResult.slidePrompts[1].promptText.includes('Transition from Previous Slide:'), 'Slide 2 must transition from previous');
  assert.ok(detailedResult.slidePrompts[1].promptText.includes('DO NOT repeat the video introduction'), 'Slide 2 must forbid repeating full intro');
  assert.ok(detailedResult.slidePrompts[4].promptText.includes('Concluding wrap-up'), 'Slide 5 must include concluding wrap-up');

  // Verify Short & Extended Depth configurations
  const shortResult = slideVoiceoverService.generateMasterPromptForSlides({
    slides: [testSlides[0]],
    explanationDepth: 'short'
  });
  assert.strictEqual(shortResult.slidePrompts[0].recommendedWords, 75);
  assert.ok(shortResult.slidePrompts[0].promptText.includes('Short explanation (~60-90 words'), 'Must guide short explanation');

  const extendedResult = slideVoiceoverService.generateMasterPromptForSlides({
    slides: [testSlides[0]],
    explanationDepth: 'extended'
  });
  assert.strictEqual(extendedResult.slidePrompts[0].recommendedWords, 250);
  assert.ok(extendedResult.slidePrompts[0].promptText.includes('Extended educational explanation (~200-300 words'), 'Must guide extended explanation');

  // Verify All Prompts Text concatenation
  assert.ok(detailedResult.allPromptsText.includes('SLIDE 1 — SCRIPT GENERATION PROMPT'));
  assert.ok(detailedResult.allPromptsText.includes('SLIDE 5 — SCRIPT GENERATION PROMPT'));

  // Verify Individual Slide Regeneration
  const regeneratedSlide3 = slideVoiceoverService.regenerateSingleSlidePrompt(testSlides[2], 2, 5, {
    explanationDepth: 'extended',
    language: 'gu'
  });
  assert.strictEqual(regeneratedSlide3.slideNumber, 3);
  assert.strictEqual(regeneratedSlide3.recommendedWords, 250);
  assert.ok(regeneratedSlide3.promptText.includes('SLIDE 3 — SCRIPT GENERATION PROMPT'));
});

test('11. Full Slide PDF Extraction & Automatic Script Prompt Generation Verification', async () => {
  const pdfSlideExtractor = require('../server/services/pdfSlideExtractor');

  const samplePdf = Buffer.from(
    '%PDF-1.4\n' +
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n' +
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n' +
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n' +
    '4 0 obj << /Length 75 >> stream\n' +
    'BT /F1 12 Tf 72 712 Td (Slide 1: Gujarat Government DA Hike 2026) Tj ET\n' +
    'endstream endobj\n' +
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n' +
    'xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000370 00000 n \n' +
    'trailer << /Size 6 /Root 1 0 R >>\nstartxref\n450\n%%EOF'
  );

  const res = await pdfSlideExtractor.extractSlidesFromPdf(samplePdf, {
    explanationDepth: 'detailed',
    language: 'gu',
    autoGenerate: true
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.slideCount, 1);
  assert.ok(res.slides[0].title.includes('Gujarat Government DA Hike 2026'));
  assert.ok(res.promptResult !== null);
  assert.strictEqual(res.promptResult.slidePrompts.length, 1);

  const prompt = res.promptResult.slidePrompts[0].promptText;
  assert.ok(prompt.includes('SLIDE 1 — SCRIPT GENERATION PROMPT'));
  assert.ok(prompt.includes('Slide heading:'));
  assert.ok(prompt.includes('Slide information:'));
  assert.ok(prompt.includes('Script-writing instructions:'));
  assert.ok(prompt.includes('Language and tone:'));
  assert.ok(prompt.includes('Engagement requirements:'));
  assert.ok(prompt.includes('Accuracy requirements:'));
  assert.ok(prompt.includes('Length requirements:'));
  assert.ok(prompt.includes('Final instruction:'));
  assert.ok(prompt.includes('Write the complete word-for-word spoken voice-over script for this slide, ready for recording.'));
});

test('12. In-App Slide Maker Tool (Perfect White Background, Heading Box & Bullet Points)', () => {
  // Test generating white slides for Anganwadi
  const anganwadiDeck = slideMakerService.generateWhiteSlides({
    topic: 'ગુજરાત આંગણવાડી ભરતી અને માનદવેતન ૨૦૨૬',
    slideCount: 5,
    headingBoxStyle: 'solid'
  });

  assert.strictEqual(anganwadiDeck.length, 5, 'Should generate requested 5 slides');
  anganwadiDeck.forEach((s, idx) => {
    assert.strictEqual(s.bgColor, '#FFFFFF', 'Background MUST be 100% pure white (#FFFFFF)');
    assert.strictEqual(s.headingBoxStyle, 'solid', 'Heading box style must be set');
    assert.ok(s.title && s.title.length > 5, 'Must have a clear, descriptive title for heading box');
    assert.ok(Array.isArray(s.bulletPoints) && s.bulletPoints.length >= 3, 'Must have at least 3 bullet points');
    assert.ok(s.audioTime, 'Must have audio timing');
    assert.ok(s.accentColor, 'Must specify accent color for heading box');
  });

  // Verify Heading Box title & bullet content
  assert.ok(anganwadiDeck[0].title.includes('સત્તાવાર જાહેરાત') || anganwadiDeck[0].title.includes('આંગણવાડી'));
  assert.ok(anganwadiDeck[1].title.includes('પાત્રતા') || anganwadiDeck[1].title.includes('લાયકાત'));
  assert.ok(anganwadiDeck[2].title.includes('માનદવેતન') || anganwadiDeck[2].title.includes('પગાર'));

  // Test generating white slides with outline heading box for DA topic
  const daDeck = slideMakerService.generateWhiteSlides({
    topic: 'ગુજરાત કર્મચારી ૫૩% મોંઘવારી ભથ્થું (DA)',
    slideCount: 4,
    headingBoxStyle: 'outline'
  });

  assert.strictEqual(daDeck.length, 4, 'Should generate 4 slides');
  assert.strictEqual(daDeck[0].bgColor, '#FFFFFF');
  assert.strictEqual(daDeck[0].headingBoxStyle, 'outline');
  assert.ok(daDeck.some(s => s.bulletPoints.some(b => b.includes('DA') || b.includes('મોંઘવારી'))));
});

test('13. Domain-Specific PDF Subject-Tailored Prompt and Clean Audio Extraction Verification', () => {
  const slideVoiceoverService = require('../server/services/slideVoiceoverService');

  // Case 1: Recruitment PDF (Police / LRD)
  const recruitmentPrompt = slideVoiceoverService.generateFullPdfMasterPrompt({
    topic: 'ગુજરાત પોલીસ કોન્સ્ટેબલ અને LRD ભરતી જાહેરાત ૨૦૨૬',
    fullPdfText: 'ગુજરાત સરકાર ગૃહ વિભાગ ગાંધીનગર. જાહેરાત ક્રમાંક: LRD/2026/01. કુલ ખાલી જગ્યાઓ ૧૨,૪૭૨ મંજૂર. ઓજસ પોર્ટલ ojas.gujarat.gov.in પર ઓનલાઇન અરજી કરવાની રહેશે. શારીરિક કસોટી (દોડ) અને લેખિત પરીક્ષા ૨૦૦ ગુણ.'
  });

  assert.ok(recruitmentPrompt.includes('ગુજરાત સરકારી ભરતી'), 'Must identify recruitment domain');
  assert.ok(recruitmentPrompt.includes('ગૃહ વિભાગ'), 'Must extract Home Department');
  assert.ok(recruitmentPrompt.includes('ojas.gujarat.gov.in'), 'Must extract OJAS portal');
  assert.ok(recruitmentPrompt.includes('શારીરિક કસોટી (ગ્રાઉન્ડ) અને નવો સિલેબસ'), 'Must tailor section 4 to PET/PST & syllabus instead of DA calculation');
  assert.ok(!recruitmentPrompt.includes('નાણાકીય લાભ / પગાર / સહાય / એરિયર્સની ચોક્કસ ગણતરી'), 'Must NOT have generic DA salary calculation in recruitment prompt');

  // Case 2: Farmer Scheme PDF (Kisan Sahay)
  const kisanPrompt = slideVoiceoverService.generateFullPdfMasterPrompt({
    topic: 'મુખ્યમંત્રી કિસાન સહાય યોજના ૨૦૨૬ પરિપત્ર',
    fullPdfText: 'કૃષિ અને ખેડૂત કલ્યાણ વિભાગ સચિવાલય ગાંધીનગર. ઠરાવ ક્રમાંક: કિસાન/૧૦૨૦૨૬/સહાય. પાક નુકસાની સહાય ₹૨૦,૦૦૦ પ્રતિ હેક્ટર. iKhedut પોર્ટલ ikhedut.gujarat.gov.in પર અરજી. ૭/૧૨ અને ૮-અ નકલ જોડવી.'
  });

  assert.ok(kisanPrompt.includes('ખેડૂત સહાય & કિસાન કલ્યાણ યોજના'), 'Must identify farmer scheme domain');
  assert.ok(kisanPrompt.includes('કૃષિ, ખેડૂત કલ્યાણ'), 'Must extract Agriculture Department');
  assert.ok(kisanPrompt.includes('ikhedut.gujarat.gov.in'), 'Must extract iKhedut portal');
  assert.ok(kisanPrompt.includes('iKhedut પોર્ટલ પર ઓનલાઇન અરજી કરવાની સ્ટેપ-બાય-સ્ટેપ રીત'), 'Must tailor section 5 to iKhedut');

  // Case 3: Anganwadi Worker/Helper PDF
  const anganwadiPrompt = slideVoiceoverService.generateFullPdfMasterPrompt({
    topic: 'આંગણવાડી કાર્યકર અને તેડાગર માનદવેતન સુધારો પરિપત્ર',
    fullPdfText: 'મહિલા અને બાળ વિકાસ વિભાગ (WCD). પરિપત્ર ક્રમાંક: WCD/2026/માનદવેતન. કાર્યકર અને તેડાગર બહેનોના માનદવેતનમાં ₹૨,૫૦૦ વધારો. e-hrms.gujarat.gov.in પર ઓનલાઇન પોર્ટલ. સ્થાનિક રહેવાસી પુરાવો અનિવાર્ય.'
  });

  assert.ok(anganwadiPrompt.includes('આંગણવાડી કાર્યકર & તેડાગર'), 'Must identify anganwadi domain');
  assert.ok(anganwadiPrompt.includes('મહિલા અને બાળ વિકાસ વિભાગ'), 'Must extract WCD department');
  assert.ok(anganwadiPrompt.includes('માનદવેતન સ્લેબ અને મેરિટ ગણતરી પદ્ધતિ'), 'Must tailor section 4 to honorarium and merit calculation');

  // Case 4: Spoken Script Extraction for Audio Engine
  const sampleMarkdown = `### SLIDE 1: પરિપત્ર
**3. Word-for-Word Gujarati Voiceover Script**
> "નમસ્તે મિત્રો! આજના વિડીયોમાં આપણે વાત કરીશું નવી ભરતી વિશે."

**7. Transition to the Next Slide**
> "હવે આગળની સ્લાઇડમાં લાયકાત જોઈએ."`;

  const extractedSpoken = slideVoiceoverService.extractSpokenScript(sampleMarkdown);
  assert.ok(extractedSpoken.includes('નમસ્તે મિત્રો! આજના વિડીયોમાં આપણે વાત કરીશું નવી ભરતી વિશે.'));
  assert.ok(extractedSpoken.includes('હવે આગળની સ્લાઇડમાં લાયકાત જોઈએ.'));
  assert.ok(!extractedSpoken.includes('### SLIDE 1'), 'Must strip markdown headers');
  assert.ok(!extractedSpoken.includes('**3. Word-for-Word'), 'Must strip section titles');
});

test('14. Audio & PDF Auto-Match Engine & Timeline Validation', async () => {
  const {
    matchSlidesToAudio,
    validateTimeline,
    fixTimelineGaps,
    formatSecondsToTime
  } = await import('../public/js/utils/slideAudioSync.js');

  const sampleSlides = [
    { title: 'સ્લાઇડ ૧: સરકારી નિર્ણય', bulletPoints: ['મુખ્ય બાબત ૧', 'મુખ્ય બાબત ૨'] },
    { title: 'સ્લાઇડ ૨: પાત્રતા નિયમો', bulletPoints: ['લાયકાત વિગત', 'શરતો'] },
    { title: 'સ્લાઇડ ૩: એરિયર્સ ચૂકવણી', bulletPoints: ['ખાતામાં જમા તારીખ'] },
    { title: 'સ્લાઇડ ૪: અંતિમ વિગત & CTA', bulletPoints: ['લાઈક અને સબ્સ્ક્રાઇબ કરો'] }
  ];

  const totalAudioDuration = 160.0;
  const matched = matchSlidesToAudio(sampleSlides, totalAudioDuration, [], 'સંપૂર્ણ સરકારી પરિપત્ર અને ઓડિયો સ્ક્રિપ્ટ');

  assert.strictEqual(matched.length, 4, 'Should match all 4 slides');
  assert.strictEqual(matched[0].startTime, 0, 'First slide must start at 0');
  assert.strictEqual(matched[3].endTime, 160, 'Last slide must end at total audio duration');

  const validation = validateTimeline(matched, totalAudioDuration);
  assert.strictEqual(validation.isValid, true, 'Matched timeline must be valid');
  assert.strictEqual(validation.errors.length, 0, 'Should have zero errors');

  const fixed = fixTimelineGaps(matched, totalAudioDuration);
  assert.strictEqual(fixed[0].startTime, 0);
  assert.strictEqual(fixed[fixed.length - 1].endTime, totalAudioDuration);
});

test('15. Manual Slide & Audio Matcher Helpers (Custom Start/End, Nudge, Split)', async () => {
  const {
    setSlideStartTime,
    setSlideEndTime,
    nudgeSlideTiming,
    splitSlideAtTime
  } = await import('../public/js/utils/slideAudioSync.js');

  const deck = [
    { id: 1, title: 'સ્લાઇડ ૧', startTime: 0, endTime: 40, duration: 40, audioTime: '0:00 - 0:40', bulletPoints: ['પોઇન્ટ ૧'] },
    { id: 2, title: 'સ્લાઇડ ૨', startTime: 40, endTime: 90, duration: 50, audioTime: '0:40 - 1:30', bulletPoints: ['પોઇન્ટ ૨'] }
  ];

  // 1. Test setSlideStartTime: shifting slide 2 start to 50 should also adjust slide 1 end to 50 (no gap)
  setSlideStartTime(deck, 1, 50, 180);
  assert.strictEqual(deck[1].startTime, 50, 'Slide 2 start should be 50');
  assert.strictEqual(deck[0].endTime, 50, 'Slide 1 end should seamlessly become 50');

  // 2. Test setSlideEndTime: shifting slide 1 end to 35 should adjust slide 2 start to 35
  setSlideEndTime(deck, 0, 35, 180);
  assert.strictEqual(deck[0].endTime, 35, 'Slide 1 end should be 35');
  assert.strictEqual(deck[1].startTime, 35, 'Slide 2 start should seamlessly become 35');

  // 3. Test nudgeSlideTiming
  nudgeSlideTiming(deck, 1, 'end', 5, 180);
  assert.strictEqual(deck[1].endTime, 95, 'Slide 2 end should increase by 5s');

  // 4. Test splitSlideAtTime: split slide 1 (0 to 35) at 20s
  splitSlideAtTime(deck, 0, 20, 180);
  assert.strictEqual(deck.length, 3, 'Should now have 3 slides after split');
  assert.strictEqual(deck[0].startTime, 0);
  assert.strictEqual(deck[0].endTime, 20);
  assert.strictEqual(deck[1].startTime, 20);
  assert.strictEqual(deck[1].endTime, 35);
});

// Clean exit after tests complete
test.after(() => {
  setTimeout(() => process.exit(0), 200);
});

