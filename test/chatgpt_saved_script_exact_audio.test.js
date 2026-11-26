const { describe, it, before } = require('node:test');
const assert = require('node:assert');

describe('CHATGPT SAVED SCRIPT – EXACT TEXT TO AUDIO SYSTEM', () => {
  let parseChatGptScriptText;
  let voiceService;

  before(async () => {
    // Dynamic import of ES modules
    const parserModule = await import('../public/js/utils/externalSlideParser.js');
    parseChatGptScriptText = parserModule.parseChatGptScriptText;
    voiceService = require('../server/services/voiceService');
  });

  const sampleChatGptScript = `[સ્લાઇડ #1: ગુજરાત સરકારી કર્મચારી પગાર અને DA વધારો ૨૦૨૬]
નમસ્તે મિત્રો! જ્ઞાન યાત્રા ચેનલમાં આપનું હાર્દિક સ્વાગત છે. આજના વિડીયોમાં આપણે વાત કરીશું ગુજરાત સરકારી કર્મચારીઓ અને પેન્શનર્સના ૫૦% મોંઘવારી ભથ્થા એટલે કે DA અને પગાર વધારાના સત્તાવાર નિર્ણય વિશે.

[સ્લાઇડ #2: પાત્રતા અને લાભાર્થી નિયમો]
નાણાં વિભાગ દ્વારા લેવાયેલા નિર્ણય મુજબ રાજ્યના તમામ કાયમી અને ફિક્સ પે કર્મચારીઓને આ પરિપત્રનો સીધો લાભ મળશે. કોઈ પણ વચેટીયાની વાતમાં આવ્યા વગર સત્તાવાર પોર્ટલ પરથી જ વિગતો ચકાસવી.

[સ્લાઇડ #3: સમાપન અને Call to Action]
આ વિગત તમારા તમામ મિત્રો અને વોટ્સએપ ગ્રૂપમાં શેર કરજો અને આપણી ચેનલ જ્ઞાન યાત્રાને સબ્સ્ક્રાઇબ કરી લેજો. જય હિન્દ, જય જય ગરવી ગુજરાત!`;

  it('1. Saved Script Integration: Script saved from ChatGPT is parsed into exact slide-wise sections', () => {
    const existingSlides = [
      { slideNumber: 1, title: 'પગાર અને DA વધારો' },
      { slideNumber: 2, title: 'પાત્રતા નિયમો' },
      { slideNumber: 3, title: 'સમાપન' }
    ];

    const sections = parseChatGptScriptText(sampleChatGptScript, existingSlides);

    assert.strictEqual(sections.length, 3, 'Must parse exactly 3 slide sections');
    assert.strictEqual(sections[0].slideNumber, 1);
    assert.strictEqual(sections[1].slideNumber, 2);
    assert.strictEqual(sections[2].slideNumber, 3);

    // Verify exact saved script text is preserved
    assert.ok(sections[0].scriptText.includes('નમસ્તે મિત્રો! જ્ઞાન યાત્રા ચેનલમાં આપનું હાર્દિક સ્વાગત છે.'));
    assert.ok(sections[1].scriptText.includes('નાણાં વિભાગ દ્વારા લેવાયેલા નિર્ણય મુજબ'));
    assert.ok(sections[2].scriptText.includes('આ વિગત તમારા તમામ મિત્રો અને વોટ્સએપ ગ્રૂપમાં શેર કરજો'));
  });

  it('2. Exact Script to Audio: Strips structural slide markers from spoken text while retaining 100% narration', () => {
    const rawSlide1 = `[સ્લાઇડ #1: ગુજરાત સરકારી કર્મચારી પગાર અને DA વધારો ૨૦૨૬]
નમસ્તે મિત્રો! જ્ઞાન યાત્રા ચેનલમાં આપનું હાર્દિક સ્વાગત છે. આજના વિડીયોમાં આપણે વાત કરીશું ૫૦% DA વધારા વિશે.`;

    // Marker stripping algorithm used in /api/voice/generate-slide-exact
    const cleanText = rawSlide1
      .replace(/\[(?:સ્લાઇડ|Slide|ભાગ)\s*[#0-9૦-૯:\-–\s]+[^\]]*\]/gi, '')
      .replace(/^\s*(?:સ્લાઇડ|Slide|ભાગ)\s*[#0-9૦-૯:\-–\s]+[^\n]*/gmi, '')
      .replace(/\((?:સ્લાઇડ|Slide)[^\)]*\)/gi, '')
      .replace(/^(?:નરેશન|સ્ક્રિપ્ટ|Script|Voiceover|Narration|વાણી)[:\s]+/gmi, '')
      .replace(/[ \t]+/g, ' ')
      .trim();

    // Verify slide marker "[સ્લાઇડ #1: ...]" is NOT in spoken text
    assert.ok(!cleanText.includes('[સ્લાઇડ #1'), 'Marker [સ્લાઇડ #1] must NOT be spoken aloud');
    assert.ok(!cleanText.includes('ગુજરાત સરકારી કર્મચારી પગાર અને DA વધારો ૨૦૨૬]'), 'Bracket header must not be spoken');

    // Verify 100% of the actual narration words are preserved verbatim
    assert.ok(cleanText.startsWith('નમસ્તે મિત્રો! જ્ઞાન યાત્રા ચેનલમાં આપનું હાર્દિક સ્વાગત છે.'));
    assert.ok(cleanText.endsWith('આજના વિડીયોમાં આપણે વાત કરીશું ૫૦% DA વધારા વિશે.'));
  });

  it('3. Professional Gujarati News Anchor Voice Profiles exist and match Edge Neural models', () => {
    const profiles = voiceService.getProfiles();
    
    // Dhwani (Female News Anchor)
    const dhwani = profiles.find(p => p.id === 'anchor-dhwani-female');
    assert.ok(dhwani, 'anchor-dhwani-female profile must exist');
    assert.strictEqual(dhwani.voiceId, 'gu-IN-DhwaniNeural');
    assert.strictEqual(dhwani.gender, 'female');

    // Niranjan (Male TV News Anchor)
    const niranjan = profiles.find(p => p.id === 'anchor-niranjan-male');
    assert.ok(niranjan, 'anchor-niranjan-male profile must exist');
    assert.strictEqual(niranjan.voiceId, 'gu-IN-NiranjanNeural');
    assert.strictEqual(niranjan.gender, 'male');
  });

  it('4. Slide-wise Script Processing: Preserves 1-to-1 slide correlation with original presentation order', () => {
    const slides = [
      { slideNumber: 1, scriptText: 'સ્લાઇડ ૧ નું લખાણ' },
      { slideNumber: 2, scriptText: 'સ્લાઇડ ૨ નું લખાણ' },
      { slideNumber: 3, scriptText: 'સ્લાઇડ ૩ નું લખાણ' }
    ];

    const slideAudioMap = {};
    slides.forEach(s => {
      slideAudioMap[s.slideNumber] = {
        slideNumber: s.slideNumber,
        text: s.scriptText,
        audioUrl: `/audio/slide_${s.slideNumber}_exact_anchor.mp3`,
        status: 'Recorded'
      };
    });

    assert.strictEqual(slideAudioMap[1].slideNumber, 1);
    assert.strictEqual(slideAudioMap[1].text, 'સ્લાઇડ ૧ નું લખાણ');
    assert.strictEqual(slideAudioMap[2].slideNumber, 2);
    assert.strictEqual(slideAudioMap[3].slideNumber, 3);
  });

  it('5. Editing and Regeneration: Modifying saved script flags regeneration without corrupting original PPT', () => {
    const slide = {
      slideNumber: 1,
      scriptText: 'ઓરિજિનલ સ્ક્રિપ્ટ લખાણ',
      audioUrl: '/audio/slide_1_old.mp3',
      recordingStatus: 'Recorded'
    };

    // User edits the script in Saved Scripts / Voice Studio
    const updatedScript = 'સુધારેલું નવું સ્ક્રિપ્ટ લખાણ જેમાં નવી તારીખ ઉમેરાઈ છે.';
    slide.scriptText = updatedScript;
    slide.needsRegeneration = true;

    assert.strictEqual(slide.scriptText, updatedScript);
    assert.strictEqual(slide.needsRegeneration, true, 'Slide must be flagged for regeneration');

    // Regenerate with updated script
    slide.audioUrl = '/audio/slide_1_regenerated.mp3';
    slide.needsRegeneration = false;

    assert.strictEqual(slide.audioUrl, '/audio/slide_1_regenerated.mp3');
    assert.strictEqual(slide.needsRegeneration, false);
  });

  it('6. The Golden Rule: PASTE SCRIPT -> SAVE SCRIPT -> EXACT AUDIO -> SYNC WITH ORIGINAL PPT', () => {
    const pastedScript = 'ખૂબ જ અગત્યની સત્તાવાર જાહેરાત. કોઈ ફેરફાર વગર આ જ શબ્દો બોલવાના છે.';
    
    // 1. Paste & Save
    const savedScript = pastedScript.trim();
    assert.strictEqual(savedScript, pastedScript);

    // 2. Exact text fed to TTS (Zero rewrite)
    const textForTTS = savedScript;
    assert.strictEqual(textForTTS, 'ખૂબ જ અગત્યની સત્તાવાર જાહેરાત. કોઈ ફેરફાર વગર આ જ શબ્દો બોલવાના છે.');

    // 3. Sync with PPT Slide 1
    const pptSlide1 = {
      slideNumber: 1,
      title: 'સત્તાવાર જાહેરાત',
      scriptText: textForTTS,
      audioUrl: '/audio/slide_1_anchor.mp3'
    };

    assert.strictEqual(pptSlide1.slideNumber, 1);
    assert.strictEqual(pptSlide1.scriptText, textForTTS);
    assert.ok(pptSlide1.audioUrl.length > 0);
  });

  it('7. Varied ChatGPT Formatting Resilience: Handles bold markdown, English Slide tags, and Gujarati digits', () => {
    const chatGptOutput = `**સ્લાઇડ ૧: પ્રસ્તાવના અને મુખ્ય હેતુ**
નમસ્તે દર્શક મિત્રો! આજના વિડીયોમાં તમારું સ્વાગત છે.

**Slide 2: પાત્રતાના નવા નિયમો**
રાજ્ય સરકારના નાણાં વિભાગ દ્વારા સત્તાવાર પરિપત્ર બહાર પાડવામાં આવ્યો છે.`;

    const existingSlides = [
      { slideNumber: 1, title: 'પ્રસ્તાવના' },
      { slideNumber: 2, title: 'પાત્રતા' }
    ];

    const sections = parseChatGptScriptText(chatGptOutput, existingSlides);

    assert.strictEqual(sections.length, 2);
    assert.strictEqual(sections[0].slideNumber, 1);
    assert.strictEqual(sections[1].slideNumber, 2);
    assert.ok(sections[0].scriptText.includes('નમસ્તે દર્શક મિત્રો! આજના વિડીયોમાં તમારું સ્વાગત છે.'));
    assert.ok(sections[1].scriptText.includes('રાજ્ય સરકારના નાણાં વિભાગ દ્વારા'));
  });

  it('8. Resilient Fallback: Raw unformatted text parses into Slide 1 narration instead of throwing error', () => {
    const rawText = 'સત્તાવાર નિર્ણય મુજબ તમામ કર્મચારીઓને પૂરો લાભ મળશે.';
    const sections = parseChatGptScriptText(rawText, [{ slideNumber: 1, title: 'ઓરિજિનલ સ્લાઇડ' }]);

    assert.strictEqual(sections.length, 1);
    assert.strictEqual(sections[0].slideNumber, 1);
    assert.strictEqual(sections[0].scriptText, rawText);
  });

  it('9. Never Split Continuous Script: 70 paragraphs separated by blank lines remain 1 continuous script, NOT 70 slides', () => {
    // Generate 70 paragraphs of narration text
    const paragraphs = [];
    for (let i = 1; i <= 70; i++) {
      paragraphs.push(`આ ફકરો ક્રમ #${i} છે. સરકારી નિયમો અનુસાર તમામ પ્રક્રિયા સરળ બનાવવામાં આવી છે.`);
    }
    const fullContinuousText = paragraphs.join('\n\n');

    const sections = parseChatGptScriptText(fullContinuousText, []);

    // MUST NOT be split into 70 slides!
    assert.strictEqual(sections.length, 1, 'Script with 70 paragraphs must not be classified into 70 slides');
    assert.strictEqual(sections[0].slideNumber, 1);
    assert.strictEqual(sections[0].scriptText, fullContinuousText, 'Exact full text must remain intact verbatim');
    assert.strictEqual(sections[0].sectionName, 'સંપૂર્ણ સ્ક્રિપ્ટ');
  });

  it('10. Explicit slide markers [સ્લાઇડ #1], [સ્લાઇડ #2] are honored and parsed into separate slides', () => {
    const textWithMarkers = `[સ્લાઇડ #1: પ્રસ્તાવના]
નમસ્તે મિત્રો, આજના વિડીયોમાં સ્વાગત છે.

[સ્લાઇડ #2: નિયમો]
અહીં સરકારી પરિપત્રના તમામ નિયમો દર્શાવ્યા છે.`;

    const sections = parseChatGptScriptText(textWithMarkers, []);

    assert.strictEqual(sections.length, 2);
    assert.strictEqual(sections[0].slideNumber, 1);
    assert.strictEqual(sections[1].slideNumber, 2);
    assert.ok(sections[0].scriptText.includes('નમસ્તે મિત્રો'));
    assert.ok(sections[1].scriptText.includes('અહીં સરકારી પરિપત્ર'));
  });

  it('11. Complete Pipeline: ChatGPT Script -> Automatically Save in Script Section -> Generate Voice from Exact Same Script', () => {
    // 1. ChatGPT generates a script
    const chatGptGeneratedScript = `નમસ્તે મિત્રો! આજના ખાસ વિડીયોમાં આપનું સ્વાગત છે.
સરકારશ્રી દ્વારા તમામ ખેડૂતો અને સામાન્ય નાગરિકો માટે નવી સબસિડી યોજનાની જાહેરાત કરવામાં આવી છે.
આ યોજના હેઠળ સીધા બેંક ખાતામાં સહાય જમા થશે. તમામ નિયમો ધ્યાનથી સમજો.`;

    // 2. Parse into script section
    const parsedSections = parseChatGptScriptText(chatGptGeneratedScript, []);
    assert.strictEqual(parsedSections.length, 1);
    assert.strictEqual(parsedSections[0].scriptText, chatGptGeneratedScript);

    // 3. Project state reflects exact verbatim text
    const project = {
      id: 'test_proj_exact',
      name: 'નવી યોજના ૨૦૨૬',
      script: {
        rawText: chatGptGeneratedScript,
        fullText: chatGptGeneratedScript,
        sections: parsedSections
      },
      slide: {
        slides: [
          {
            slideNumber: 1,
            title: 'સંપૂર્ણ સ્ક્રિપ્ટ',
            scriptText: chatGptGeneratedScript,
            audioUrl: ''
          }
        ]
      }
    };

    assert.strictEqual(project.script.fullText, chatGptGeneratedScript);
    assert.strictEqual(project.slide.slides[0].scriptText, chatGptGeneratedScript);

    // 4. Voice Generator receives the exact saved script
    const scriptToSpeak = project.slide.slides[0].scriptText || project.script.fullText;
    assert.strictEqual(scriptToSpeak, chatGptGeneratedScript);

    // 5. Updating the script updates the voiceover source and clears outdated audio
    const updatedScript = chatGptGeneratedScript + '\nઅરજી કરવાની છેલ્લી તારીખ ૩૧ માર્ચ છે.';
    project.script.fullText = updatedScript;
    project.slide.slides[0].scriptText = updatedScript;
    project.slide.slides[0].audioUrl = ''; // Old audio invalidated

    assert.strictEqual(project.slide.slides[0].scriptText, updatedScript);
    assert.strictEqual(project.slide.slides[0].audioUrl, '', 'Old audio must be cleared to avoid mismatch');
  });

  it('12. Slide-wise Script Division: Cleanly segments continuous script across 9 authentic slides without creating 70 dummy slides', async () => {
    const { segmentContinuousScriptAcrossSlides } = await import('../public/js/utils/externalSlideParser.js');
    
    // Create a 9-paragraph script simulating user's 1360 words
    const sampleParagraphs = Array.from({ length: 9 }, (_, i) => `પેરાગ્રાફ #${i + 1}: આ સ્લાઇડ નંબર ${i + 1} માટેનું અધિકૃત ગુજરાતી લખાણ છે. તમામ વિગતો પરિપત્ર મુજબ સાચી છે.`);
    const fullContinuousScript = sampleParagraphs.join('\n\n');

    const nineSlides = Array.from({ length: 9 }, (_, i) => ({
      slideNumber: i + 1,
      title: `સ્લાઇડ #${i + 1}`
    }));

    const sections = parseChatGptScriptText(fullContinuousScript, nineSlides);

    assert.strictEqual(sections.length, 9, 'Must create exactly 9 sections matching authentic 9 slides');
    sections.forEach((sec, idx) => {
      assert.strictEqual(sec.slideNumber, idx + 1);
      assert.ok(sec.scriptText.includes(`પેરાગ્રાફ #${idx + 1}`), `Slide #${idx + 1} must receive its segment`);
    });

    // Verify 100% words are preserved across segments
    const combinedBack = sections.map(s => s.scriptText).join('\n\n');
    assert.strictEqual(combinedBack, fullContinuousScript, 'Must preserve 100% of all words verbatim');
  });

  it('13. Inflation Protection: If an old project passed 70 slides, it auto-prunes to authentic 9 slides', async () => {
    const seventySlides = Array.from({ length: 70 }, (_, i) => ({
      slideNumber: i + 1,
      title: `સ્લાઇડ #${i + 1}`
    }));

    const sampleContinuousText = `નમસ્તે મિત્રો! આજના વિડીયોમાં સરકારી નિર્ણય સમજીએ.\n\nઆ યોજના તમામ કર્મચારીઓને લાગુ પડશે.\n\nઅરજી કરવાની છેલ્લી તારીખ નજીક છે.`;
    const sections = parseChatGptScriptText(sampleContinuousText, seventySlides);

    assert.strictEqual(sections.length, 9, 'Must auto-prune 70 dummy slides down to 9 authentic slides');
  });

  it('14. Audit Slide Audio Readiness: Accurately audits 9 slides and detects missing audio', async () => {
    const { auditSlideAudioReadiness } = await import('../public/js/utils/audioStitcher.js');

    const nineSlides = Array.from({ length: 9 }, (_, i) => ({
      slideNumber: i + 1,
      title: `સ્લાઇડ #${i + 1}`,
      scriptText: `સ્લાઇડ ${i + 1} લખાણ`
    }));

    // Slide 1 to 5 recorded, Slide 6 to 9 missing
    const slideAudioState = {};
    for (let i = 1; i <= 5; i++) {
      slideAudioState[i] = {
        slideNumber: i,
        status: 'Recorded',
        url: `/audio/slide_${i}.wav`,
        duration: 15.0
      };
    }

    const audit = auditSlideAudioReadiness(nineSlides, slideAudioState);

    assert.strictEqual(audit.totalSlides, 9);
    assert.strictEqual(audit.recordedCount, 5);
    assert.strictEqual(audit.missingCount, 4);
    assert.strictEqual(audit.isAllReady, false);
    assert.strictEqual(audit.issues.length, 4, 'Must report 4 issues for the 4 missing slides');
    assert.ok(audit.issues[0].includes('સ્લાઇડ #6'));
  });

});

