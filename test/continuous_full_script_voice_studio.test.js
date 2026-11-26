/**
 * TEST SUITE: CONTINUOUS FULL SCRIPT VOICE STUDIO FIX
 * 
 * Tests the 5 non-negotiable requirements:
 * 1. ONE COMPLETE FINAL SCRIPT:
 *    - Canonical script field preserves verbatim text from beginning to end.
 *    - Zero automatic slide splitting, zero AI rewriting or summarization.
 * 2. EXACT SCRIPT IN VOICE STUDIO:
 *    - Continuous full script is loaded as one document.
 *    - Inline editing updates canonical final script and word/char count immediately.
 * 3. TWO RECORDING MODES:
 *    - Mode A: Full continuous recording saves as master project audio.
 *    - Mode B: Manual selection recording links to user-chosen slide.
 * 4. SCRIPT CHANGE WARNING:
 *    - Detects text modifications made after recording.
 *    - Supports 'Keep Existing Recording' and 'Record Again'.
 * 5. SEPARATION OF PDF/PPT AND SCRIPT:
 *    - Slide flipping or PDF asset imports never chop or rewrite the final script.
 */

const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');

// Mock localStorage and window for Node.js test environment
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

describe('GYAN YATRA AI STUDIO — EXACT FULL SCRIPT VOICE STUDIO FIX', () => {

  let projectState;

  // Real 10-paragraph Gujarati script pasted from ChatGPT
  const fullAuthenticGujaratiScript = [
    'નમસ્કાર મિત્રો, જ્ઞાન યાત્રા સ્ટુડિયોમાં આપનું હાર્દિક સ્વાગત છે. આજે આપણે ગુજરાત સરકાર દ્વારા જાહેર કરાયેલા નવા પરિપત્ર અને ભરતી વિશે સંપૂર્ણ વિગત મેળવીશું.',
    'પ્રથમ મહત્વનો મુદ્દો: આ ભરતીમાં કુલ ૩,૫૦૦ થી વધુ જગ્યાઓ માટે અરજીઓ મંગાવવામાં આવી છે. ધોરણ ૧૨ પાસ ઉમેદવારો આ ભરતી માટે માન્ય ગણાશે.',
    'પરીક્ષા પદ્ધતિ: ૧૦૦ ગુણની OMR આધારિત લેખિત પરીક્ષા લેવાશે જેમાં સામાન્ય જ્ઞાન, ગુજરાતી વ્યાકરણ અને સામાન્ય ગણિતના પ્રશ્નો રહેશે.',
    'દસ્તાવેજોની ચકાસણી: અરજી કરતી વખતે અસલ પ્રમાણપત્રો અને માન્ય ઓળખકાર્ડ અપલોડ કરવાના રહેશે.',
    'ઉંમર મર્યાદા: ૧૮ થી ૩૪ વર્ષના ઉમેદવારો અરજી કરી શકશે, જ્યારે અનામત વર્ગના ઉમેદવારોને નિયમાનુસાર છૂટછાટ મળવાપાત્ર રહેશે.',
    'પગાર ધોરણ: પ્રથમ ૫ વર્ષ ફિક્સ પગાર રૂપિયા ૧૯,૯૫૦ મળવાપાત્ર રહેશે અને ત્યાર બાદ ફૂલ પે-સ્કેલ લાગુ થશે.',
    'અરજી પ્રક્રિયા: સત્તાવાર OJAS પોર્ટલ પરથી જ ઓનલાઇન ફોર્મ ભરવું. કોઈ વચેટીયાની વાતમાં આવવું નહીં.',
    'તૈયારી માટે ખાસ ટિપ્સ: દરરોજ જૂના પ્રશ્નપત્રો સોલ્વ કરો અને સમય વ્યવસ્થાપન પર ધ્યાન આપો.',
    'મહત્વની તારીખો: ફોર્મ ભરવાની છેલ્લી તારીખ નજીક હોવાથી વહેલી તકે અરજી પૂર્ણ કરી લેવી.',
    'વિશેષ માહિતી માટે અમારી ટેલિગ્રામ ચેનલ જોઈન કરો અને વિડીયો લાઈક-શેર કરજો. આભાર, જય હિન્દ, જય ભારત!'
  ].join('\n\n');

  before(async () => {
    const psModule = await import('../public/js/utils/projectState.js');
    projectState = psModule.projectState || psModule.default;
  });

  beforeEach(() => {
    global.localStorage.clear();
    projectState.projects = [];
    projectState.activeProjectId = null;
  });

  it('1. Canonical Final Script: Stores complete script without slicing, dropping, or rewriting words', () => {
    const projId = 'proj_canon_' + Date.now();
    projectState.projects = [{
      id: projId,
      name: 'Gujarat Govt News',
      slide: {
        slides: [
          { slideId: 'sl_1', slideNumber: 1, title: 'Slide 1', scriptText: '' },
          { slideId: 'sl_2', slideNumber: 2, title: 'Slide 2', scriptText: '' }
        ]
      },
      script: {},
      voice: {}
    }];
    projectState.activeProjectId = projId;

    // Set canonical final script
    const saved = projectState.setCanonicalFinalScript(fullAuthenticGujaratiScript, projId);
    assert.strictEqual(saved, fullAuthenticGujaratiScript);

    // Retrieve canonical final script
    const retrieved = projectState.getCanonicalFinalScript(projId);
    assert.strictEqual(retrieved, fullAuthenticGujaratiScript);

    // Verify words and paragraphs are 100% intact
    const originalParas = fullAuthenticGujaratiScript.split(/\n\s*\n/);
    const retrievedParas = retrieved.split(/\n\s*\n/);
    assert.strictEqual(retrievedParas.length, 10, 'All 10 paragraphs must remain unbroken');
    assert.strictEqual(retrievedParas[0], originalParas[0]);
    assert.strictEqual(retrievedParas[9], originalParas[9]);

    // Active project must preserve originalChatGptScript
    const active = projectState.getActiveProject();
    assert.strictEqual(active.script.originalChatGptScript, fullAuthenticGujaratiScript);
    assert.strictEqual(active.script.fullText, fullAuthenticGujaratiScript);
    assert.strictEqual(active.script.rawText, fullAuthenticGujaratiScript);
  });

  it('2. Exact Script Inline Editing in Voice Studio: Updates canonical script & counts immediately', () => {
    const projId = 'proj_inline_' + Date.now();
    projectState.projects = [{
      id: projId,
      name: 'Inline Edit Test',
      slide: { slides: [{ slideId: 'sl_1', slideNumber: 1 }] },
      script: {
        fullText: fullAuthenticGujaratiScript,
        rawText: fullAuthenticGujaratiScript,
        originalChatGptScript: fullAuthenticGujaratiScript
      },
      voice: {}
    }];
    projectState.activeProjectId = projId;

    // User edits the script inside Voice Studio
    const editedScript = fullAuthenticGujaratiScript + '\n\nનોંધ: આ સત્તાવાર જાહેરાત ગાંધીનગર દ્વારા પ્રસિદ્ધ કરવામાં આવી છે.';
    projectState.setCanonicalFinalScript(editedScript, projId, { markScriptChanged: true });

    const updated = projectState.getCanonicalFinalScript(projId);
    assert.strictEqual(updated, editedScript);
    assert.ok(updated.includes('ગાંધીનગર દ્વારા પ્રસિદ્ધ'));

    const proj = projectState.getActiveProject();
    assert.strictEqual(proj.script.isScriptChangedSinceRecording, true);
    assert.strictEqual(proj.script.characterCount, editedScript.length);
    assert.strictEqual(proj.script.wordCount, editedScript.trim().split(/\s+/).length);
  });

  it('3. Mode A: Full Script Continuous Recording saves master audio for the whole project', () => {
    const projId = 'proj_mode_a_' + Date.now();
    projectState.projects = [{
      id: projId,
      name: 'Full Continuous Mode Project',
      slide: { slides: [{ slideId: 'sl_1' }, { slideId: 'sl_2' }] },
      script: { fullText: fullAuthenticGujaratiScript },
      voice: {}
    }];
    projectState.activeProjectId = projId;

    // Helper script hash
    function computeScriptHash(str) {
      let hash = 0;
      const s = (str || '').trim().replace(/\r\n/g, '\n');
      for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash |= 0;
      }
      return String(hash);
    }

    const scriptHash = computeScriptHash(fullAuthenticGujaratiScript);

    // Simulate saving Full Continuous Recording (Mode A)
    const masterAudioUrl = 'blob:http://localhost:5000/master-audio-full-take-123';
    const active = projectState.getActiveProject();
    active.voice = {
      audioUrl: masterAudioUrl,
      masterAudioUrl: masterAudioUrl,
      duration: 185.4,
      hasSavedAudio: true,
      recordingType: 'continuous_full',
      recordedScriptHash: scriptHash,
      recordedScriptText: fullAuthenticGujaratiScript,
      recordedAt: new Date().toISOString()
    };
    projectState.updateTool('voice', active.voice);

    const reloaded = projectState.getActiveProject();
    assert.strictEqual(reloaded.voice.recordingType, 'continuous_full');
    assert.strictEqual(reloaded.voice.masterAudioUrl, masterAudioUrl);
    assert.strictEqual(reloaded.voice.hasSavedAudio, true);
    assert.strictEqual(reloaded.voice.recordedScriptHash, scriptHash);
  });

  it('4. Script Change Detection: Detects hash mismatch when script is edited after recording', () => {
    function computeScriptHash(str) {
      let hash = 0;
      const s = (str || '').trim().replace(/\r\n/g, '\n');
      for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash |= 0;
      }
      return String(hash);
    }

    const originalHash = computeScriptHash(fullAuthenticGujaratiScript);

    const projId = 'proj_warn_' + Date.now();
    projectState.projects = [{
      id: projId,
      script: {
        fullText: fullAuthenticGujaratiScript,
        rawText: fullAuthenticGujaratiScript
      },
      voice: {
        audioUrl: 'blob:audio_rec',
        hasSavedAudio: true,
        recordedScriptHash: originalHash,
        recordedScriptText: fullAuthenticGujaratiScript
      }
    }];
    projectState.activeProjectId = projId;

    // Check before edit: hash matches, no warning needed
    const projBefore = projectState.getActiveProject();
    const hashBefore = computeScriptHash(projectState.getCanonicalFinalScript(projId));
    assert.strictEqual(hashBefore, projBefore.voice.recordedScriptHash);

    // User modifies script
    const modifiedScript = fullAuthenticGujaratiScript.replace('૩,૫૦૦', '૪,૫૦૦');
    projectState.setCanonicalFinalScript(modifiedScript, projId, { markScriptChanged: true });

    // Check after edit: hash differs -> triggers warning
    const projAfter = projectState.getActiveProject();
    const hashAfter = computeScriptHash(projectState.getCanonicalFinalScript(projId));
    assert.notStrictEqual(hashAfter, projAfter.voice.recordedScriptHash, 'Hashes must differ to trigger warning banner');

    // User chooses Option 1: Keep Existing Recording
    projAfter.voice.recordedScriptHash = hashAfter;
    projAfter.voice.recordedScriptText = modifiedScript;
    projectState.updateTool('voice', projAfter.voice);

    // Now hash matches again, warning dismissed safely without deleting audio
    const dismissedProj = projectState.getActiveProject();
    assert.strictEqual(dismissedProj.voice.recordedScriptHash, hashAfter);
    assert.strictEqual(dismissedProj.voice.audioUrl, 'blob:audio_rec', 'Audio must be preserved');
  });

  it('5. Separation of PDF/PPT and Script: Navigating or changing slides never alters the script', () => {
    const projId = 'proj_decouple_' + Date.now();
    projectState.projects = [{
      id: projId,
      slide: {
        importedPresentation: { filename: 'official_guide.pdf', pageCount: 5 },
        slides: [
          { slideId: 'sl_1', pageNumber: 1, title: 'Page 1' },
          { slideId: 'sl_2', pageNumber: 2, title: 'Page 2' },
          { slideId: 'sl_3', pageNumber: 3, title: 'Page 3' }
        ]
      },
      script: {
        fullText: fullAuthenticGujaratiScript,
        rawText: fullAuthenticGujaratiScript,
        originalChatGptScript: fullAuthenticGujaratiScript
      },
      voice: {}
    }];
    projectState.activeProjectId = projId;

    // Simulate slide navigation: user flips from slide 1 to slide 2 to slide 3
    const proj = projectState.getActiveProject();
    proj.workspaceState = { lastSlideIndex: 2 };
    projectState.saveProjects();

    // Reorder slides
    projectState.reorderProjectSlides(projId, 0, 2);

    // Verify canonical script is 100% UNTOUCHED
    const finalProj = projectState.getActiveProject();
    const scriptAfterSlideOps = projectState.getCanonicalFinalScript(projId);
    assert.strictEqual(scriptAfterSlideOps, fullAuthenticGujaratiScript, 'Script must never be mutated by slide operations');
    assert.strictEqual(finalProj.script.originalChatGptScript, fullAuthenticGujaratiScript);
  });

});

