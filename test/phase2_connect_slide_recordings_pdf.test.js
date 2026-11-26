const { test, describe, it } = require('node:test');
const assert = require('node:assert');
const {
  matchSlideWithAudio,
  buildConnectedSlideSequence,
  saveConnectedSequence,
  loadConnectedSequence,
  verifySequenceFidelity
} = require('../public/js/utils/slideAudioConnector.js');

describe('PHASE 2 — CONNECT EXISTING SLIDE RECORDINGS WITH PDF SLIDES', () => {

  const mockProjectId = 'proj_anganwadi_2026';

  const mockPdfSlides = [
    {
      slideId: 'pdf_page_1',
      slideNumber: 1,
      pageNumber: 1,
      title: 'ગુજરાત આંગણવાડી ભરતી ૨૦૨૬ પરિપત્ર',
      subtitle: 'મહિલા અને બાળ વિકાસ વિભાગ',
      bulletPoints: ['૧૨,૫૦૦+ જગ્યાઓ માટે સત્તાવાર પરિપત્ર', 'e-HRMS પોર્ટલ પર ઓનલાઇન અરજી'],
      scriptText: 'નમસ્કાર મિત્રો! આજના વિડીયોમાં આપણે ગુજરાત સરકારની આંગણવાડી ભરતી વિશે વાત કરીશું.'
    },
    {
      slideId: 'pdf_page_2',
      slideNumber: 2,
      pageNumber: 2,
      title: 'શૈક્ષણિક લાયકાત અને વયમર્યાદા',
      subtitle: 'ઉંમર ૧૮ થી ૩૫ વર્ષ',
      bulletPoints: ['કાર્યકર માટે ધોરણ ૧૨ પાસ', 'તેડાગર માટે ધોરણ ૧૦ પાસ'],
      scriptText: 'આ ભરતી માટે લાયકાતમાં ૧૨ પાસ અને વયમર્યાદા ૧૮ થી ૩૫ વર્ષ નક્કી કરવામાં આવી છે.'
    },
    {
      slideId: 'pdf_page_3',
      slideNumber: 3,
      pageNumber: 3,
      title: 'પગાર ધોરણ અને માનદ વેતન',
      subtitle: 'માસિક નિયમિત વેતન',
      bulletPoints: ['કાર્યકર: ₹૧૦,૦૦૦/- પ્રતિ માસ', 'તેડાગર: ₹૫,૫૦૦/- પ્રતિ માસ'],
      scriptText: 'હવે વેતનની વાત કરીએ તો કાર્યકરને દસ હજાર અને તેડાગરને સાડા પાંચ હજાર મળશે.'
    }
  ];

  const mockSavedAudios = [
    {
      id: `${mockProjectId}_slide_pdf_page_1`,
      projectId: mockProjectId,
      slideId: 'pdf_page_1',
      slideNumber: 1,
      pageNumber: 1,
      url: '/audio/slide_1_enhanced.wav',
      enhancedDataUrl: 'data:audio/wav;base64,UklGR_ENHANCED_SLIDE_1_AUDIO',
      originalDataUrl: 'data:audio/wav;base64,UklGR_ORIGINAL_SLIDE_1_AUDIO',
      duration: 14.5,
      status: 'Enhanced'
    },
    {
      id: `${mockProjectId}_slide_pdf_page_2`,
      projectId: mockProjectId,
      slideId: 'pdf_page_2',
      slideNumber: 2,
      pageNumber: 2,
      url: '/audio/slide_2_enhanced.wav',
      enhancedDataUrl: 'data:audio/wav;base64,UklGR_ENHANCED_SLIDE_2_AUDIO',
      originalDataUrl: 'data:audio/wav;base64,UklGR_ORIGINAL_SLIDE_2_AUDIO',
      duration: 12.2,
      status: 'Enhanced'
    },
    {
      id: `${mockProjectId}_slide_pdf_page_3`,
      projectId: mockProjectId,
      slideId: 'pdf_page_3',
      slideNumber: 3,
      pageNumber: 3,
      url: '/audio/slide_3_enhanced.wav',
      enhancedDataUrl: 'data:audio/wav;base64,UklGR_ENHANCED_SLIDE_3_AUDIO',
      originalDataUrl: 'data:audio/wav;base64,UklGR_ORIGINAL_SLIDE_3_AUDIO',
      duration: 16.8,
      status: 'Enhanced'
    }
  ];

  // -------------------------------------------------------------
  // TEST 1: Strict Slide 1 -> Slide 1 Audio Connection
  // -------------------------------------------------------------
  it('1. Strict Connection: Slide 1 connects ONLY to Slide 1 audio via permanent IDs', () => {
    const audioMap = {
      pdf_page_1: mockSavedAudios[0],
      pdf_page_2: mockSavedAudios[1],
      pdf_page_3: mockSavedAudios[2]
    };

    const match1 = matchSlideWithAudio(mockPdfSlides[0], audioMap, mockProjectId);
    assert.strictEqual(match1.matched, true);
    assert.strictEqual(match1.audioRecord.slideId, 'pdf_page_1');
    assert.strictEqual(match1.audioUrl, 'data:audio/wav;base64,UklGR_ENHANCED_SLIDE_1_AUDIO');
    assert.strictEqual(match1.duration, 14.5);
    assert.strictEqual(match1.isEnhanced, true);

    const match2 = matchSlideWithAudio(mockPdfSlides[1], audioMap, mockProjectId);
    assert.strictEqual(match2.matched, true);
    assert.strictEqual(match2.audioRecord.slideId, 'pdf_page_2');
    assert.strictEqual(match2.audioUrl, 'data:audio/wav;base64,UklGR_ENHANCED_SLIDE_2_AUDIO');
    assert.strictEqual(match2.duration, 12.2);

    // Audio URLs must never be identical or cross-wired
    assert.notStrictEqual(match1.audioUrl, match2.audioUrl);
  });

  // -------------------------------------------------------------
  // TEST 2: Permanent Identifiers (Not Position or Title)
  // -------------------------------------------------------------
  it('2. Permanent Identifiers: Matches even if slides are scrambled or titles altered', () => {
    const scrambledSlide = {
      slideId: 'pdf_page_3',
      slideNumber: 3,
      pageNumber: 3,
      title: 'કોઈપણ નવું શીર્ષક (Changed Title)',
      bulletPoints: []
    };

    const audioMap = {
      'pdf_page_1': mockSavedAudios[0],
      'pdf_page_3': mockSavedAudios[2]
    };

    const match = matchSlideWithAudio(scrambledSlide, audioMap, mockProjectId);
    assert.strictEqual(match.matched, true);
    assert.strictEqual(match.audioRecord.slideId, 'pdf_page_3');
    assert.strictEqual(match.duration, 16.8);
    assert.strictEqual(match.audioUrl, 'data:audio/wav;base64,UklGR_ENHANCED_SLIDE_3_AUDIO');
  });

  // -------------------------------------------------------------
  // TEST 3: Clear Missing Audio Warning (Zero Cross-Wiring)
  // -------------------------------------------------------------
  it('3. Missing Audio: Shows clear warning and never silently substitutes another slide audio', () => {
    const slideWithoutAudio = {
      slideId: 'pdf_page_missing',
      slideNumber: 4,
      pageNumber: 4,
      title: 'અરજી કરવાની છેલ્લી તારીખ'
    };

    const audioMap = {
      'pdf_page_1': mockSavedAudios[0],
      'pdf_page_2': mockSavedAudios[1]
    };

    const match = matchSlideWithAudio(slideWithoutAudio, audioMap, mockProjectId);
    assert.strictEqual(match.matched, false);
    assert.strictEqual(match.audioUrl, '');
    assert.strictEqual(match.duration, 0);
    assert.ok(match.warning && match.warning.includes('અવાજ રેકોર્ડ થયેલ નથી'), 'Must provide clear missing audio warning');
  });

  // -------------------------------------------------------------
  // TEST 4: Full Synchronized Sequence Preparation
  // -------------------------------------------------------------
  it('4. Synchronized Sequence: Accurately computes timeline boundaries, durations, and transitions', () => {
    const mockProject = {
      id: mockProjectId,
      name: 'આંગણવાડી ભરતી વિડીયો',
      slide: {
        slides: mockPdfSlides,
        importedPresentation: {
          filename: 'anganwadi_recruitment_2026.pdf',
          fileUrl: '/api/research/presentation-file/anganwadi_recruitment_2026.pdf'
        }
      }
    };

    const sequence = buildConnectedSlideSequence(mockProject, null, mockSavedAudios);

    assert.strictEqual(sequence.totalSlides, 3);
    assert.strictEqual(sequence.connectedCount, 3);
    assert.strictEqual(sequence.missingCount, 0);
    assert.strictEqual(sequence.isFullyConnected, true);

    // Slide 1: 0.0s to 14.5s
    assert.strictEqual(sequence.slides[0].slideNumber, 1);
    assert.strictEqual(sequence.slides[0].startTime, 0.0);
    assert.strictEqual(sequence.slides[0].duration, 14.5);
    assert.strictEqual(sequence.slides[0].endTime, 14.5);
    assert.strictEqual(sequence.slides[0].transition.type, 'cut');

    // Slide 2: 14.5s to 26.7s
    assert.strictEqual(sequence.slides[1].slideNumber, 2);
    assert.strictEqual(sequence.slides[1].startTime, 14.5);
    assert.strictEqual(sequence.slides[1].duration, 12.2);
    assert.strictEqual(sequence.slides[1].endTime, 26.7);

    // Slide 3: 26.7s to 43.5s
    assert.strictEqual(sequence.slides[2].slideNumber, 3);
    assert.strictEqual(sequence.slides[2].startTime, 26.7);
    assert.strictEqual(sequence.slides[2].duration, 16.8);
    assert.strictEqual(sequence.slides[2].endTime, 43.5);

    // Total Duration: 14.5 + 12.2 + 16.8 = 43.5s
    assert.strictEqual(sequence.totalDuration, 43.5);
    assert.strictEqual(sequence.formattedDuration, '00:44');
  });

  // -------------------------------------------------------------
  // TEST 5: Sequence Fidelity Verification
  // -------------------------------------------------------------
  it('5. Fidelity Verification: Validates strict 1-to-1 audio boundaries and detects any leaks', () => {
    const mockProject = {
      id: mockProjectId,
      slide: { slides: mockPdfSlides }
    };
    const sequence = buildConnectedSlideSequence(mockProject, null, mockSavedAudios);
    const fidelity = verifySequenceFidelity(sequence, 3);

    assert.strictEqual(fidelity.isValid, true);
    assert.strictEqual(fidelity.errors.length, 0);
    assert.strictEqual(fidelity.isFullyRecorded, true);
  });

  // -------------------------------------------------------------
  // TEST 6: Preserves Enhanced Broadcast Audio (-16 LUFS)
  // -------------------------------------------------------------
  it('6. Audio Preservation: Preserves enhanced audio without re-encoding or pitch alteration', () => {
    const mockProject = {
      id: mockProjectId,
      slide: { slides: [mockPdfSlides[0]] }
    };
    const sequence = buildConnectedSlideSequence(mockProject, null, [mockSavedAudios[0]]);
    const slide1 = sequence.slides[0];

    assert.strictEqual(slide1.isEnhanced, true);
    assert.strictEqual(slide1.audioUrl, mockSavedAudios[0].enhancedDataUrl);
    assert.strictEqual(slide1.rawAudioUrl, mockSavedAudios[0].originalDataUrl);
  });

  // -------------------------------------------------------------
  // TEST 7: Sequence Persistence (Save & Load)
  // -------------------------------------------------------------
  it('7. Persistence: Sequence can be safely saved and restored without data loss', () => {
    // Mock localStorage
    const storageMap = {};
    global.localStorage = {
      setItem: (k, v) => { storageMap[k] = String(v); },
      getItem: (k) => storageMap[k] || null
    };

    const mockProject = {
      id: mockProjectId,
      slide: { slides: mockPdfSlides }
    };
    const sequence = buildConnectedSlideSequence(mockProject, null, mockSavedAudios);
    saveConnectedSequence(mockProjectId, sequence);

    const restored = loadConnectedSequence(mockProjectId);
    assert.ok(restored, 'Restored sequence must exist');
    assert.strictEqual(restored.totalSlides, 3);
    assert.strictEqual(restored.connectedCount, 3);
    assert.strictEqual(restored.slides[0].audioUrl, mockSavedAudios[0].enhancedDataUrl);
  });

});

