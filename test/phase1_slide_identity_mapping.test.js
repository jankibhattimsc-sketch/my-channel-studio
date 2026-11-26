/**
 * PHASE 1 TEST SUITE: PERMANENT SLIDE IDENTITY & REORDERING INTEGRITY
 * 
 * Verifies Phase 1 Acceptance Criteria:
 * 1. Permanent slideId Identity: Every slide has a unique persistent slideId.
 *    Original slide preview/page, script, audio, timeline clips, and metadata reference slideId,
 *    never slide array position or transient slideNumber.
 * 2. Original PDF/PPT Preservation: Original page number (pageNumber) is preserved as source of truth.
 * 3. Manual Slide Reordering Integrity: When Slide 3 is moved to Slide 1, Slide 3's script,
 *    audio recording, and original PDF page follow it via slideId.
 * 4. Add & Delete Slide Integrity: Adding or deleting slides updates sequence without detaching
 *    surviving slides' script or audio.
 * 5. Persistent State & Storage Integrity: All changes survive project reload/refresh.
 */

const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

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

describe('PHASE 1: PERMANENT SLIDE IDENTITY & REORDERING INTEGRITY', () => {

  let projectState;

  before(async () => {
    // Dynamically import projectState
    const psModule = await import('../public/js/utils/projectState.js');
    projectState = psModule.projectState || psModule.default;
  });

  beforeEach(() => {
    global.localStorage.clear();
    projectState.projects = [];
    projectState.activeProjectId = null;
  });

  it('1. Permanent slideId & Original PDF Page Preservation on Import', () => {
    // Create a 5-page PDF presentation project
    const projId = 'proj_phase1_gsrtc_' + Date.now();
    const mockPdfSlides = [
      { slideId: 'slide_gsrtc_p1', pageNumber: 1, title: 'GSRTC કંડક્ટર ભરતી ૨૦૨૬ પરિચય', scriptText: 'સ્લાઇડ ૧: જીએસઆરટીસી કંડક્ટર ભરતી ૨૦૨૬ માં આપનું હાર્દિક સ્વાગત છે.' },
      { slideId: 'slide_gsrtc_p2', pageNumber: 2, title: 'પરીક્ષા પદ્ધતિ અને સિલેબસ', scriptText: 'સ્લાઇડ ૨: આ પરીક્ષામાં સામાન્ય જ્ઞાન, ગુજરાતી વ્યાકરણ અને મોટર વ્હીકલ એક્ટ પૂછવામાં આવે છે.' },
      { slideId: 'slide_gsrtc_p3', pageNumber: 3, title: 'મોટર વ્હીકલ એક્ટ ૧૯૮૮ મહત્વના નિયમો', scriptText: 'સ્લાઇડ ૩: મોટર વ્હીકલ એક્ટ ૧૯૮૮ અંતર્ગત કંડક્ટર લાયસન્સ અને ફર્સ્ટ એઇડ સર્ટીફિકેટ ફરજિયાત છે.' },
      { slideId: 'slide_gsrtc_p4', pageNumber: 4, title: 'ટિકિટ ગણતરી અને કેશ હેન્ડલિંગ નિયમો', scriptText: 'સ્લાઇડ ૪: ટિકિટ મશીન ઓપરેટિંગ અને મુસાફરોના ભાડાની ચોક્કસ ગણતરીના નિયમો સમજો.' },
      { slideId: 'slide_gsrtc_p5', pageNumber: 5, title: 'સફળતાની ખાસ ટિપ્સ અને રિવિઝન', scriptText: 'સ્લાઇડ ૫: દૈનિક ૩ કલાકનું રિવિઝન અને મોક ટેસ્ટ આપીને તમે ઉત્તીર્ણ થઈ શકો છો.' }
    ];

    const proj = {
      id: projId,
      name: 'GSRTC Video Project',
      slide: {
        presentationType: 'pdf',
        importedPresentation: {
          filename: 'gsrtc_conductor_guide.pdf',
          fileSize: 2048500,
          originalPageCount: 5,
          viewUrl: '/uploads/gsrtc_conductor_guide.pdf'
        },
        slides: mockPdfSlides.map((s, idx) => ({
          ...s,
          slideNumber: idx + 1
        })),
        slideCount: '5 સ્લાઇડ્સ'
      },
      script: {
        rawText: mockPdfSlides.map(s => s.scriptText).join('\n\n'),
        sections: mockPdfSlides.map((s, idx) => ({
          slideId: s.slideId,
          sectionId: `sec_${s.slideId}`,
          slideNumber: idx + 1,
          sectionName: `સ્લાઇડ #${idx + 1}`,
          title: s.title,
          scriptText: s.scriptText
        }))
      }
    };

    projectState.projects = [proj];
    projectState.activeProjectId = projId;
    projectState.saveProjects();

    // Verify all slides have unique permanent slideIds and original page numbers
    const active = projectState.getActiveProject();
    assert.strictEqual(active.slide.slides.length, 5);

    active.slide.slides.forEach((sl, idx) => {
      assert.ok(sl.slideId, `Slide #${idx + 1} must have permanent slideId`);
      assert.strictEqual(sl.slideId, `slide_gsrtc_p${idx + 1}`);
      assert.strictEqual(sl.pageNumber, idx + 1, `Slide #${idx + 1} must preserve original PDF pageNumber`);
      assert.strictEqual(sl.slideNumber, idx + 1);
    });
  });

  it('2. Slide Reordering Integrity: Slide 3 moved to Slide 1 preserves slideId, script and PDF pageNumber', () => {
    const projId = 'proj_reorder_' + Date.now();
    const mockPdfSlides = [
      { slideId: 'slide_gsrtc_p1', pageNumber: 1, title: 'GSRTC કંડક્ટર ભરતી ૨૦૨૬ પરિચય', scriptText: 'સ્ક્રિપ્ટ ૧: જીએસઆરટીસી પરિચય' },
      { slideId: 'slide_gsrtc_p2', pageNumber: 2, title: 'પરીક્ષા પદ્ધતિ અને સિલેબસ', scriptText: 'સ્ક્રિપ્ટ ૨: પરીક્ષા પદ્ધતિ' },
      { slideId: 'slide_gsrtc_p3', pageNumber: 3, title: 'મોટર વ્હીકલ એક્ટ ૧૯૮૮', scriptText: 'સ્ક્રિપ્ટ ૩: મોટર વ્હીકલ એક્ટ નિયમો', audioUrl: 'blob:audio/wav/slide3_enhanced' },
      { slideId: 'slide_gsrtc_p4', pageNumber: 4, title: 'ટિકિટ ગણતરી નિયમો', scriptText: 'સ્ક્રિપ્ટ ૪: ટિકિટિંગ' },
      { slideId: 'slide_gsrtc_p5', pageNumber: 5, title: 'સફળતાની ટિપ્સ', scriptText: 'સ્ક્રિપ્ટ ૫: સફળતા' }
    ];

    const proj = {
      id: projId,
      name: 'Reorder Test Project',
      slide: {
        presentationType: 'pdf',
        importedPresentation: {
          filename: 'gsrtc_guide.pdf',
          originalPageCount: 5
        },
        slides: mockPdfSlides.map((s, idx) => ({ ...s, slideNumber: idx + 1 })),
        slideCount: '5 સ્લાઇડ્સ'
      },
      script: {
        sections: mockPdfSlides.map((s, idx) => ({
          slideId: s.slideId,
          slideNumber: idx + 1,
          sectionName: `સ્લાઇડ #${idx + 1}`,
          title: s.title,
          scriptText: s.scriptText
        }))
      }
    };

    projectState.projects = [proj];
    projectState.activeProjectId = projId;
    projectState.saveProjects();

    // Action: Move Slide 3 (index 2) to Slide 1 (index 0)
    const success = projectState.reorderProjectSlides(projId, 2, 0);
    assert.strictEqual(success, true, 'reorderProjectSlides must succeed');

    const updated = projectState.getActiveProject();
    const slides = updated.slide.slides;
    const sections = updated.script.sections;

    // Verify Slide at index 0 is now the former Slide 3
    assert.strictEqual(slides[0].slideId, 'slide_gsrtc_p3', 'Index 0 must have Slide 3 permanent slideId');
    assert.strictEqual(slides[0].pageNumber, 3, 'Index 0 must preserve original PDF Page 3');
    assert.strictEqual(slides[0].scriptText, 'સ્ક્રિપ્ટ ૩: મોટર વ્હીકલ એક્ટ નિયમો', 'Index 0 must keep Slide 3 script');
    assert.strictEqual(slides[0].audioUrl, 'blob:audio/wav/slide3_enhanced', 'Index 0 must keep Slide 3 audio');
    assert.strictEqual(slides[0].slideNumber, 1, 'Index 0 visual slideNumber must be 1');

    // Verify script section at index 0 is also synchronized
    assert.strictEqual(sections[0].slideId, 'slide_gsrtc_p3', 'Script section 0 must reference slide_gsrtc_p3');
    assert.strictEqual(sections[0].scriptText, 'સ્ક્રિપ્ટ ૩: મોટર વ્હીકલ એક્ટ નિયમો', 'Script section 0 must have Slide 3 text');
    assert.strictEqual(sections[0].slideNumber, 1);

    // Verify former Slide 1 is now at index 1
    assert.strictEqual(slides[1].slideId, 'slide_gsrtc_p1');
    assert.strictEqual(slides[1].pageNumber, 1);
    assert.strictEqual(slides[1].slideNumber, 2);

    // Verify former Slide 2 is now at index 2
    assert.strictEqual(slides[2].slideId, 'slide_gsrtc_p2');
    assert.strictEqual(slides[2].pageNumber, 2);
    assert.strictEqual(slides[2].slideNumber, 3);
  });

  it('3. Manual Slide Reordering: Move Down (▼) from Index 0 to Index 1', () => {
    const projId = 'proj_move_down_' + Date.now();
    const proj = {
      id: projId,
      name: 'Move Down Test',
      slide: {
        slides: [
          { slideId: 'sl_A', pageNumber: 1, slideNumber: 1, title: 'Topic A', scriptText: 'Script A' },
          { slideId: 'sl_B', pageNumber: 2, slideNumber: 2, title: 'Topic B', scriptText: 'Script B' },
          { slideId: 'sl_C', pageNumber: 3, slideNumber: 3, title: 'Topic C', scriptText: 'Script C' }
        ]
      },
      script: {
        sections: [
          { slideId: 'sl_A', slideNumber: 1, scriptText: 'Script A' },
          { slideId: 'sl_B', slideNumber: 2, scriptText: 'Script B' },
          { slideId: 'sl_C', slideNumber: 3, scriptText: 'Script C' }
        ]
      }
    };

    projectState.projects = [proj];
    projectState.activeProjectId = projId;

    // Move Topic A from 0 to 1
    projectState.reorderProjectSlides(projId, 0, 1);

    const updated = projectState.getActiveProject();
    assert.strictEqual(updated.slide.slides[0].slideId, 'sl_B');
    assert.strictEqual(updated.slide.slides[0].slideNumber, 1);
    assert.strictEqual(updated.slide.slides[1].slideId, 'sl_A');
    assert.strictEqual(updated.slide.slides[1].slideNumber, 2);
    assert.strictEqual(updated.slide.slides[2].slideId, 'sl_C');
    assert.strictEqual(updated.slide.slides[2].slideNumber, 3);
  });

  it('4. Add Slide & Delete Slide without Detaching Surviving Slides', () => {
    const projId = 'proj_add_del_' + Date.now();
    const proj = {
      id: projId,
      name: 'Add Delete Test',
      slide: {
        slides: [
          { slideId: 'sl_1', pageNumber: 1, slideNumber: 1, title: 'Slide 1', scriptText: 'Text 1' },
          { slideId: 'sl_2', pageNumber: 2, slideNumber: 2, title: 'Slide 2', scriptText: 'Text 2' },
          { slideId: 'sl_3', pageNumber: 3, slideNumber: 3, title: 'Slide 3', scriptText: 'Text 3' }
        ]
      },
      script: {
        sections: [
          { slideId: 'sl_1', slideNumber: 1, scriptText: 'Text 1' },
          { slideId: 'sl_2', slideNumber: 2, scriptText: 'Text 2' },
          { slideId: 'sl_3', slideNumber: 3, scriptText: 'Text 3' }
        ]
      }
    };

    projectState.projects = [proj];
    projectState.activeProjectId = projId;

    // Add slide after Slide 1 (afterIndex: 0 -> inserts at index 1)
    const newSlide = projectState.addProjectSlide(projId, 0);
    assert.ok(newSlide, 'addProjectSlide must return new slide object');
    assert.ok(newSlide.slideId, 'new slide must have slideId');

    let updated = projectState.getActiveProject();
    assert.strictEqual(updated.slide.slides.length, 4);
    assert.strictEqual(updated.slide.slides[0].slideId, 'sl_1');
    assert.strictEqual(updated.slide.slides[1].slideId, newSlide.slideId);
    assert.strictEqual(updated.slide.slides[2].slideId, 'sl_2');
    assert.strictEqual(updated.slide.slides[3].slideId, 'sl_3');

    // Delete the newly inserted slide at index 1
    const delRes = projectState.deleteProjectSlide(projId, 1);
    assert.strictEqual(delRes, true);

    updated = projectState.getActiveProject();
    assert.strictEqual(updated.slide.slides.length, 3);
    assert.strictEqual(updated.slide.slides[0].slideId, 'sl_1');
    assert.strictEqual(updated.slide.slides[1].slideId, 'sl_2');
    assert.strictEqual(updated.slide.slides[2].slideId, 'sl_3');
    assert.strictEqual(updated.slide.slides[1].scriptText, 'Text 2');
  });

  it('5. Project Reload / Refresh Persistence Verification', () => {
    const projId = 'proj_persist_' + Date.now();
    const proj = {
      id: projId,
      name: 'Refresh Persistence Test',
      slide: {
        importedPresentation: {
          filename: 'gsrtc_guide.pdf',
          fileSize: 102400
        },
        slides: [
          { slideId: 'perm_sl_1', pageNumber: 1, slideNumber: 1, title: 'Permanent 1', scriptText: 'ગુજરાતી લખાણ ૧' },
          { slideId: 'perm_sl_2', pageNumber: 2, slideNumber: 2, title: 'Permanent 2', scriptText: 'ગુજરાતી લખાણ ૨' }
        ]
      },
      script: {
        sections: [
          { slideId: 'perm_sl_1', slideNumber: 1, scriptText: 'ગુજરાતી લખાણ ૧' },
          { slideId: 'perm_sl_2', slideNumber: 2, scriptText: 'ગુજરાતી લખાણ ૨' }
        ]
      }
    };

    projectState.projects = [proj];
    projectState.activeProjectId = projId;
    projectState.saveProjects();

    // Simulate page refresh: reset projectState in memory and reload from storage
    projectState.projects = [];
    projectState.activeProjectId = null;
    projectState.projects = projectState.loadProjects();
    projectState.activeProjectId = projId;

    const loaded = projectState.getProject(projId);
    assert.ok(loaded, 'Project must load from storage');
    assert.strictEqual(loaded.slide.slides.length, 2);
    assert.strictEqual(loaded.slide.slides[0].slideId, 'perm_sl_1');
    assert.strictEqual(loaded.slide.slides[0].pageNumber, 1);
    assert.strictEqual(loaded.slide.slides[0].scriptText, 'ગુજરાતી લખાણ ૧');
    assert.strictEqual(loaded.slide.slides[1].slideId, 'perm_sl_2');
    assert.strictEqual(loaded.slide.slides[1].pageNumber, 2);
    assert.strictEqual(loaded.slide.slides[1].scriptText, 'ગુજરાતી લખાણ ૨');
  });

  it('6. Audio & Script follow slideId through Multiple Reorders & Detachment Immunity', () => {
    const projId = 'proj_multi_reorder_' + Date.now();
    const slidesData = [
      { slideId: 'slide_A', pageNumber: 1, title: 'Introduction', scriptText: 'Script A Text', audioUrl: 'blob:audio/A' },
      { slideId: 'slide_B', pageNumber: 2, title: 'Exam Pattern', scriptText: 'Script B Text', audioUrl: 'blob:audio/B' },
      { slideId: 'slide_C', pageNumber: 3, title: 'Motor Vehicle Act', scriptText: 'Script C Text', audioUrl: 'blob:audio/C' },
      { slideId: 'slide_D', pageNumber: 4, title: 'Ticket Calculation', scriptText: 'Script D Text', audioUrl: 'blob:audio/D' }
    ];

    const proj = {
      id: projId,
      name: 'Multi Reorder Project',
      slide: {
        importedPresentation: { filename: 'guide.pdf' },
        slides: slidesData.map((s, idx) => ({ ...s, slideNumber: idx + 1 }))
      },
      script: {
        sections: slidesData.map((s, idx) => ({
          slideId: s.slideId,
          slideNumber: idx + 1,
          sectionName: `સ્લાઇડ #${idx + 1}`,
          title: s.title,
          scriptText: s.scriptText
        }))
      }
    };

    projectState.projects = [proj];
    projectState.activeProjectId = projId;

    // Simulation of Audio State indexed by permanent slideId
    const slideAudioState = {
      'slide_A': { status: 'Recorded', url: 'blob:audio/A', duration: 15 },
      'slide_B': { status: 'Recorded', url: 'blob:audio/B', duration: 25 },
      'slide_C': { status: 'Recorded', url: 'blob:audio/C', duration: 35 },
      'slide_D': { status: 'Recorded', url: 'blob:audio/D', duration: 45 }
    };

    // Reorder 1: Move Slide D (index 3) to Index 0
    projectState.reorderProjectSlides(projId, 3, 0);

    // Order is now: D, A, B, C
    let p = projectState.getActiveProject();
    assert.strictEqual(p.slide.slides[0].slideId, 'slide_D');
    assert.strictEqual(p.slide.slides[0].pageNumber, 4);
    assert.strictEqual(p.slide.slides[0].scriptText, 'Script D Text');
    assert.strictEqual(slideAudioState[p.slide.slides[0].slideId].url, 'blob:audio/D');

    // Reorder 2: Move Slide B (now index 2) to Index 1
    projectState.reorderProjectSlides(projId, 2, 1);

    // Order is now: D, B, A, C
    p = projectState.getActiveProject();
    assert.strictEqual(p.slide.slides[0].slideId, 'slide_D');
    assert.strictEqual(p.slide.slides[1].slideId, 'slide_B');
    assert.strictEqual(p.slide.slides[2].slideId, 'slide_A');
    assert.strictEqual(p.slide.slides[3].slideId, 'slide_C');

    // Every slide retains its permanent slideId, original PDF page, script, and matching audio
    const expected = [
      { id: 'slide_D', page: 4, script: 'Script D Text', audio: 'blob:audio/D' },
      { id: 'slide_B', page: 2, script: 'Script B Text', audio: 'blob:audio/B' },
      { id: 'slide_A', page: 1, script: 'Script A Text', audio: 'blob:audio/A' },
      { id: 'slide_C', page: 3, script: 'Script C Text', audio: 'blob:audio/C' }
    ];

    expected.forEach((exp, idx) => {
      const sl = p.slide.slides[idx];
      assert.strictEqual(sl.slideId, exp.id, `Slide at position ${idx} must be ${exp.id}`);
      assert.strictEqual(sl.pageNumber, exp.page, `Slide at position ${idx} must retain original PDF page ${exp.page}`);
      assert.strictEqual(sl.scriptText, exp.script, `Slide at position ${idx} must retain script for ${exp.id}`);
      assert.strictEqual(slideAudioState[sl.slideId].url, exp.audio, `Slide at position ${idx} must retain audio for ${exp.id}`);
      assert.strictEqual(p.script.sections[idx].slideId, exp.id, `Script section ${idx} must point to ${exp.id}`);
      assert.strictEqual(p.script.sections[idx].scriptText, exp.script);
    });
  });

});
