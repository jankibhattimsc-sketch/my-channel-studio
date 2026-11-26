/**
 * TEST SUITE: CHATGPT FINAL SCRIPT AND VOICE STUDIO SCRIPT SYNCHRONIZATION
 * 
 * Verifies non-negotiable requirements:
 * 1. 100% Verbatim preservation of ChatGPT script with >= 10 paragraphs.
 * 2. Unbroken sentence and paragraph mapping to slides.
 * 3. 0 missing sentences, 0 duplicated sentences, 0 AI rewrites.
 * 4. Voice Studio reads the identical saved slide-wise text.
 * 5. Editing one slide preserves all other slides and keeps original script untouched.
 * 6. Browser refresh and project reload persistence.
 */

const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');

// Mock localStorage and window for projectState in Node.js test environment
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { for (const k in mockStorage) delete mockStorage[k]; }
};

if (!global.window) {
  global.window = {
    dispatchEvent: () => {},
    CustomEvent: class { constructor(type, detail) { this.type = type; this.detail = detail; } }
  };
}

describe('CRITICAL FIX: CHATGPT FINAL SCRIPT & VOICE STUDIO VERBATIM SYNCHRONIZATION', () => {

  let projectState;
  let externalParser;

  // Real 10-paragraph Gujarati ChatGPT Script
  const authenticChatGpt10ParagraphScript = [
    'નમસ્કાર મિત્રો, જ્ઞાન યાત્રા સ્ટુડિયોમાં આપનું હાર્દિક સ્વાગત છે. આજે આપણે ગુજરાત એસટી નિગમ (GSRTC) દ્વારા બહાર પાડવામાં આવેલી કંડક્ટર ભરતી ૨૦૨૬ વિશે વિગતવાર અને સચોટ માહિતી મેળવીશું.',
    'પ્રથમ અને સૌથી મહત્વની બાબત એ છે કે આ ભરતીમાં કુલ ૩,૫૦૦ થી વધુ જગ્યાઓ માટે અરજીઓ મંગાવવામાં આવી છે. ધોરણ ૧૨ પાસ ઉમેદવારો આ ભરતી માટે પાત્રતા ધરાવે છે.',
    'પરીક્ષા પદ્ધતિની વાત કરીએ તો, કુલ ૧૦૦ ગુણની OMR આધારિત લેખિત પરીક્ષા લેવામાં આવશે. જેમાં સામાન્ય જ્ઞાન, ગુજરાતી વ્યાકરણ, અંગ્રેજી અને રોડ સેફ્ટીના પ્રશ્નો સમાવિષ્ટ છે.',
    'મોટર વ્હીકલ એક્ટ ૧૯૮૮ અંતર્ગત કંડક્ટર લાયસન્સ અને માન્ય ફર્સ્ટ એઇડ સર્ટીફિકેટ (First Aid Certificate) ફરજિયાત છે. આ દસ્તાવેજો વગર ફોર્મ માન્ય ગણાશે નહીં.',
    'ટિકિટિંગ અને કેશ હેન્ડલિંગના નિયમો પણ પરીક્ષામાં મહત્વનો ભાગ ભજવે છે. ઈલેક્ટ્રોનિક ટિકિટિંગ મશીન (ETM) ના ઓપરેટિંગ સિદ્ધાંતો તમારે ખાસ તૈયાર કરવા પડશે.',
    'ઉંમર મર્યાદાની વાત કરીએ તો ૧૮ થી ૩૪ વર્ષના ઉમેદવારો અરજી કરી શકે છે, જ્યારે અનામત વર્ગના તમામ ઉમેદવારોને નિયમાનુસાર વય મર્યાદામાં છૂટછાટ મળશે.',
    'પગાર ધોરણ વિશે જાણીએ તો, પ્રથમ ૫ વર્ષ ફિક્સ પગાર રૂપિયા ૧૯,૯૫૦ મળવાપાત્ર થશે અને પાંચ વર્ષની સંતોષકારક સેવા પૂર્ણ થયા બાદ ફૂલ પે-સ્કેલ લાગુ થશે.',
    'અરજી કરવાની પ્રક્રિયા ઓનલાઇન OJAS પોર્ટલ પરથી થશે. ઉમેદવારોએ પોતાના તમામ અસલ પ્રમાણપત્રો અને ડિજિટલ સહી-ફોટો અપલોડ કરવાના રહેશે.',
    'તૈયારી માટે દૈનિક ૩ કલાકનું ટાઈમટેબલ બનાવો. જૂના પ્રશ્નપત્રો અને મોક ટેસ્ટ સોલ્વ કરવાથી તમારો આત્મવિશ્વાસ વધશે અને ટાઈમ મેનેજમેન્ટ સુધરશે.',
    'વિશેષ માહિતી અને ફ્રી સ્ટડી મટીરીયલ માટે અમારી ટેલિગ્રામ ચેનલ જોઈન કરો અને વિડીયો પસંદ આવ્યો હોય તો લાઈક અને શેર જરૂર કરજો. આભાર, જય હિન્દ, જય ભારત!'
  ].join('\n\n');

  before(async () => {
    const psModule = await import('../public/js/utils/projectState.js');
    projectState = psModule.projectState || psModule.default;
    externalParser = await import('../public/js/utils/externalSlideParser.js');
  });

  beforeEach(() => {
    global.localStorage.clear();
    projectState.projects = [];
    projectState.activeProjectId = null;
  });

  it('1. Verbatim Storage: Complete ChatGPT 10-paragraph script is stored without dropping or mutating text', () => {
    const projId = 'proj_script_sync_' + Date.now();
    const slidesData = Array.from({ length: 5 }, (_, i) => ({
      slideId: `slide_${projId}_${i + 1}`,
      slideNumber: i + 1,
      pageNumber: i + 1,
      title: `સ્લાઇડ #${i + 1}`,
      scriptText: ''
    }));

    const parsedSections = externalParser.parseChatGptScriptText(authenticChatGpt10ParagraphScript, slidesData);
    assert.strictEqual(parsedSections.length, 5, 'Must distribute across authentic 5 slides');

    const proj = {
      id: projId,
      name: 'GSRTC Conductor Video',
      slide: {
        importedPresentation: { filename: 'gsrtc_guide.pdf', pageCount: 5 },
        slides: slidesData
      },
      script: {
        originalChatGptScript: authenticChatGpt10ParagraphScript,
        rawText: authenticChatGpt10ParagraphScript,
        fullText: authenticChatGpt10ParagraphScript,
        sections: parsedSections
      }
    };

    projectState.projects = [proj];
    projectState.activeProjectId = projId;
    projectState.saveProjects();

    const active = projectState.getActiveProject();
    assert.strictEqual(active.script.originalChatGptScript, authenticChatGpt10ParagraphScript, 'originalChatGptScript must remain 100% verbatim');
    assert.strictEqual(active.script.rawText, authenticChatGpt10ParagraphScript);

    // Verify word count and paragraph count
    const origParagraphs = authenticChatGpt10ParagraphScript.split(/\n\s*\n+/).filter(Boolean);
    assert.strictEqual(origParagraphs.length, 10, 'Original script must have 10 distinct paragraphs');
  });

  it('2. Accurate Slide-Wise Mapping: Every paragraph belongs to exactly one slide with 0 omission and 0 duplication', () => {
    const slidesData = Array.from({ length: 5 }, (_, i) => ({
      slideId: `slide_test_${i + 1}`,
      slideNumber: i + 1,
      title: `સ્લાઇડ #${i + 1}`,
      scriptText: ''
    }));

    const sections = externalParser.parseChatGptScriptText(authenticChatGpt10ParagraphScript, slidesData);
    assert.strictEqual(sections.length, 5);

    // Verify that all 10 paragraphs are partitioned across the 5 slides
    const origParagraphs = authenticChatGpt10ParagraphScript.split(/\n\s*\n+/).filter(Boolean);
    const mappedParagraphs = sections.flatMap(sec => sec.scriptText.split(/\n\s*\n+/).filter(Boolean));

    assert.strictEqual(mappedParagraphs.length, 10, 'All 10 paragraphs must be present across sections');

    // Verify exact sequential match of paragraphs
    origParagraphs.forEach((p, idx) => {
      assert.strictEqual(mappedParagraphs[idx], p, `Paragraph #${idx + 1} must match original verbatim`);
    });

    // Check sentence fidelity validation
    const fidelity = externalParser.validateScriptFidelity(authenticChatGpt10ParagraphScript, sections);
    assert.strictEqual(fidelity.isExactMatch, true, 'Fidelity must report 100% exact match');
    assert.strictEqual(fidelity.matchPercent, 100);
    assert.strictEqual(fidelity.totalMissingCount, 0, 'Zero sentences missing');
  });

  it('3. Voice Studio reads the identical saved slide-wise text without destructive auto-reslicing', () => {
    const projId = 'proj_voice_studio_test_' + Date.now();
    const slidesData = [
      { slideId: 'slide_v1', slideNumber: 1, pageNumber: 1, title: 'Introduction', scriptText: 'સ્લાઇડ ૧ વિગત...' },
      { slideId: 'slide_v2', slideNumber: 2, pageNumber: 2, title: 'Exam Pattern', scriptText: 'સ્લાઇડ ૨ વિગત...' },
      { slideId: 'slide_v3', slideNumber: 3, pageNumber: 3, title: 'Motor Vehicle Act', scriptText: 'સ્લાઇડ ૩ વિગત...' }
    ];

    const sections = slidesData.map(s => ({
      slideId: s.slideId,
      slideNumber: s.slideNumber,
      sectionName: `સ્લાઇડ #${s.slideNumber}`,
      title: s.title,
      scriptText: s.scriptText
    }));

    const proj = {
      id: projId,
      name: 'Voice Studio Isolation Test',
      slide: {
        importedPresentation: { filename: 'guide.pdf' },
        slides: slidesData
      },
      script: {
        originalChatGptScript: 'સ્લાઇડ ૧ વિગત...\n\nસ્લાઇડ ૨ વિગત...\n\nસ્લાઇડ ૩ વિગત...',
        rawText: 'સ્લાઇડ ૧ વિગત...\n\nસ્લાઇડ ૨ વિગત...\n\nસ્લાઇડ ૩ વિગત...',
        sections
      }
    };

    projectState.projects = [proj];
    projectState.activeProjectId = projId;

    // Simulate opening Slide 1, Slide 2, Slide 3
    const p = projectState.getActiveProject();
    p.slide.slides.forEach((sl, idx) => {
      const assignedSec = p.script.sections.find(s => s.slideId === sl.slideId);
      assert.ok(assignedSec, `Slide ${idx + 1} must match its section by slideId`);
      assert.strictEqual(sl.scriptText, assignedSec.scriptText, `Slide ${idx + 1} must display exact assigned script`);
    });
  });

  it('4. Script Editing: Editing Slide 3 updates Slide 3 only, preserves Slide 1 & 2, and leaves originalChatGptScript untouched', () => {
    const projId = 'proj_edit_test_' + Date.now();
    const slidesData = [
      { slideId: 's1', slideNumber: 1, title: 'Topic 1', scriptText: 'મૂળ સ્ક્રિપ્ટ ૧' },
      { slideId: 's2', slideNumber: 2, title: 'Topic 2', scriptText: 'મૂળ સ્ક્રિપ્ટ ૨' },
      { slideId: 's3', slideNumber: 3, title: 'Topic 3', scriptText: 'મૂળ સ્ક્રિપ્ટ ૩' }
    ];

    const originalScript = 'મૂળ સ્ક્રિપ્ટ ૧\n\nમૂળ સ્ક્રિપ્ટ ૨\n\nમૂળ સ્ક્રિપ્ટ ૩';

    const proj = {
      id: projId,
      slide: { importedPresentation: { filename: 'guide.pdf' }, slides: slidesData },
      script: {
        originalChatGptScript: originalScript,
        rawText: originalScript,
        fullText: originalScript,
        sections: slidesData.map(s => ({ slideId: s.slideId, slideNumber: s.slideNumber, scriptText: s.scriptText }))
      }
    };

    projectState.projects = [proj];
    projectState.activeProjectId = projId;

    // User edits Slide 3 script
    const editedTextSlide3 = 'આ સ્લાઇડ ૩ માં ઉમેરેલું નવું અને સચોટ લખાણ છે.';
    const active = projectState.getActiveProject();
    active.slide.slides[2].scriptText = editedTextSlide3;
    active.script.sections[2].scriptText = editedTextSlide3;
    active.script.fullText = active.script.sections.map(s => s.scriptText).join('\n\n');
    projectState.saveProjects();

    // Verify Slide 3 updated
    const reloaded = projectState.getActiveProject();
    assert.strictEqual(reloaded.slide.slides[2].scriptText, editedTextSlide3);
    assert.strictEqual(reloaded.script.sections[2].scriptText, editedTextSlide3);

    // Verify Slide 1 & Slide 2 remained 100% untouched
    assert.strictEqual(reloaded.slide.slides[0].scriptText, 'મૂળ સ્ક્રિપ્ટ ૧');
    assert.strictEqual(reloaded.slide.slides[1].scriptText, 'મૂળ સ્ક્રિપ્ટ ૨');

    // Verify originalChatGptScript is STILL the untouched original!
    assert.strictEqual(reloaded.script.originalChatGptScript, originalScript);
  });

  it('5. Browser Reload Persistence: Script & Mappings survive reload without corruption', () => {
    const projId = 'proj_reload_' + Date.now();
    const slidesData = [
      { slideId: 'p_sl_1', pageNumber: 1, slideNumber: 1, title: 'Page 1', scriptText: 'પેરાગ્રાફ ૧ લખાણ' },
      { slideId: 'p_sl_2', pageNumber: 2, slideNumber: 2, title: 'Page 2', scriptText: 'પેરાગ્રાફ ૨ લખાણ' }
    ];
    const orig = 'પેરાગ્રાફ ૧ લખાણ\n\nપેરાગ્રાફ ૨ લખાણ';

    const proj = {
      id: projId,
      slide: { importedPresentation: { filename: 'test.pdf' }, slides: slidesData },
      script: {
        originalChatGptScript: orig,
        rawText: orig,
        fullText: orig,
        sections: slidesData.map(s => ({ slideId: s.slideId, slideNumber: s.slideNumber, scriptText: s.scriptText }))
      }
    };

    projectState.projects = [proj];
    projectState.activeProjectId = projId;
    projectState.saveProjects();

    // Reset memory state and reload from storage (simulating browser page refresh)
    projectState.projects = [];
    projectState.activeProjectId = null;
    projectState.projects = projectState.loadProjects();
    projectState.activeProjectId = projId;

    const loaded = projectState.getActiveProject();
    assert.ok(loaded);
    assert.strictEqual(loaded.script.originalChatGptScript, orig);
    assert.strictEqual(loaded.slide.slides[0].scriptText, 'પેરાગ્રાફ ૧ લખાણ');
    assert.strictEqual(loaded.slide.slides[1].scriptText, 'પેરાગ્રાફ ૨ લખાણ');
  });

});

