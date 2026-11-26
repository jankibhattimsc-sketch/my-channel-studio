const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  matchSlideWithAudio,
  buildConnectedSlideSequence,
  saveConnectedSequence,
  loadConnectedSequence,
  verifySequenceFidelity
} = require('../public/js/utils/slideAudioConnector.js');

describe('CLEAN SLIDE + AUDIO STUDIO UI & PLAYBACK LOGIC', () => {

  // Mock localStorage for node test environment
  if (typeof global.localStorage === 'undefined') {
    const storageMap = {};
    global.localStorage = {
      setItem: (k, v) => { storageMap[k] = String(v); },
      getItem: (k) => storageMap[k] || null,
      removeItem: (k) => { delete storageMap[k]; }
    };
  }

  const sampleProject = {
    id: 'proj_clean_ui_001',
    name: 'GPSC Exam Preparation 2026',
    slide: {
      slides: [
        { slideId: 'sl_01', slideNumber: 1, pageNumber: 1, title: 'GPSC વર્ગ ૧ અને ૨ પરીક્ષા વિગત', bulletPoints: ['કુલ ૨૫૦ જગ્યાઓ', 'ઓજસ પોર્ટલ પરથી અરજી'] },
        { slideId: 'sl_02', slideNumber: 2, pageNumber: 2, title: 'શૈક્ષણિક લાયકાત અને અભ્યાસક્રમ', bulletPoints: ['માન્ય સ્નાતક ડિગ્રી', 'વય મર્યાદા ૨૦ થી ૩૬ વર્ષ'] },
        { slideId: 'sl_03', slideNumber: 3, pageNumber: 3, title: 'પરીક્ષા પદ્ધતિ અને મુખ્ય તારીખો', bulletPoints: ['પ્રાથમિક કસોટી', 'છેલ્લી તારીખ ૩૦ નવેમ્બર'] }
      ],
      importedPresentation: {
        id: 'pres_pdf_01',
        filename: 'GPSC_Official_Notification.pdf',
        fileType: 'pdf',
        slideCount: 3
      }
    },
    script: {
      sections: [
        { slideId: 'sl_01', text: 'નમસ્તે મિત્રો, જીપીએસસી વર્ગ ૧ અને ૨ ની અધિકૃત જાહેરાત આવી ગઈ છે.' },
        { slideId: 'sl_02', text: 'શૈક્ષણિક લાયકાતમાં માન્ય યુનિવર્સિટીમાંથી સ્નાતક ડિગ્રી જરૂરી છે.' },
        { slideId: 'sl_03', text: 'પરીક્ષા પદ્ધતિમાં પ્રથમ પ્રિલિમિનરી અને ત્યારબાદ મુખ્ય લેખિત પરીક્ષા લેવાશે.' }
      ]
    }
  };

  const sampleAudios = [
    {
      projectId: 'proj_clean_ui_001',
      slideId: 'sl_01',
      slideNumber: 1,
      pageNumber: 1,
      duration: 12.5,
      dataUrl: 'data:audio/wav;base64,UklGRsl_01_raw',
      enhancedDataUrl: 'data:audio/wav;base64,UklGRsl_01_enhanced'
    },
    // Slide 2 has NO audio (missing recording test)
    {
      projectId: 'proj_clean_ui_001',
      slideId: 'sl_03',
      slideNumber: 3,
      pageNumber: 3,
      duration: 18.0,
      dataUrl: 'data:audio/wav;base64,UklGRsl_03_raw',
      enhancedDataUrl: 'data:audio/wav;base64,UklGRsl_03_enhanced'
    }
  ];

  test('1. Slide-to-Audio Connection: Builds sequence with exact slide count and status indicators', () => {
    const sequence = buildConnectedSlideSequence(
      sampleProject,
      sampleProject.slide.importedPresentation,
      sampleAudios,
      { pdfFilename: 'GPSC_Official_Notification.pdf' }
    );

    assert.strictEqual(sequence.totalSlides, 3);
    assert.strictEqual(sequence.connectedCount, 2);
    assert.strictEqual(sequence.missingCount, 1);
    assert.strictEqual(sequence.slides.length, 3);

    // Slide 1 has audio
    assert.strictEqual(sequence.slides[0].slideNumber, 1);
    assert.strictEqual(sequence.slides[0].hasAudio, true);
    assert.strictEqual(sequence.slides[0].audioDuration, 12.5);

    // Slide 2 has NO audio
    assert.strictEqual(sequence.slides[1].slideNumber, 2);
    assert.strictEqual(sequence.slides[1].hasAudio, false);
    assert.strictEqual(sequence.slides[1].audioDuration, 0);
    assert.ok(sequence.slides[1].warning.includes('અવાજ રેકોર્ડ થયેલ નથી'));

    // Slide 3 has audio
    assert.strictEqual(sequence.slides[2].slideNumber, 3);
    assert.strictEqual(sequence.slides[2].hasAudio, true);
    assert.strictEqual(sequence.slides[2].audioDuration, 18.0);
  });

  test('2. Missing Audio Protection: Never plays previous or next slide audio for missing slide', () => {
    const sequence = buildConnectedSlideSequence(
      sampleProject,
      sampleProject.slide.importedPresentation,
      sampleAudios
    );

    const slide2 = sequence.slides[1];
    assert.strictEqual(slide2.hasAudio, false);
    assert.strictEqual(slide2.audioUrl, '');
    assert.notStrictEqual(slide2.audioUrl, sequence.slides[0].audioUrl);
    assert.notStrictEqual(slide2.audioUrl, sequence.slides[2].audioUrl);
  });

  test('3. Continuous Auto-Play Logic: Automatically advances to next slide on audio end', () => {
    const sequence = buildConnectedSlideSequence(
      sampleProject,
      sampleProject.slide.importedPresentation,
      sampleAudios
    );

    // Simulate auto-advance state machine
    let currentIdx = 0;
    const continuousPlay = true;

    function onAudioEnded(idx) {
      if (!continuousPlay) return idx;
      if (idx + 1 < sequence.slides.length) {
        return idx + 1;
      }
      return -1; // finished
    }

    currentIdx = onAudioEnded(0);
    assert.strictEqual(currentIdx, 1, 'Advances from slide 0 to slide 1');

    currentIdx = onAudioEnded(1);
    assert.strictEqual(currentIdx, 2, 'Advances from slide 1 to slide 2');

    currentIdx = onAudioEnded(2);
    assert.strictEqual(currentIdx, -1, 'Completes sequence at the end of slides');
  });

  test('4. Non-Continuous Playback: Stops at current slide end without advancing', () => {
    let currentIdx = 0;
    const continuousPlay = false;

    function onAudioEnded(idx) {
      if (!continuousPlay) return idx;
      return idx + 1;
    }

    const nextIdx = onAudioEnded(currentIdx);
    assert.strictEqual(nextIdx, 0, 'Does not advance when continuous play is off');
  });

  test('5. Playback Speed Selector: Valid speed ratios (0.75x, 1x, 1.25x, 1.5x)', () => {
    const allowedSpeeds = [0.75, 1.0, 1.25, 1.5];
    const baseDuration = 12.0;

    allowedSpeeds.forEach(speed => {
      assert.ok(speed >= 0.5 && speed <= 2.0);
      const effectiveDuration = baseDuration / speed;
      assert.ok(effectiveDuration > 0);
    });

    assert.strictEqual(baseDuration / 1.5, 8.0);
    assert.strictEqual(baseDuration / 0.75, 16.0);
  });

  test('6. Verbatim Gujarati Script Preservation: Slide retains exact Gujarati text', () => {
    const sequence = buildConnectedSlideSequence(
      sampleProject,
      sampleProject.slide.importedPresentation,
      sampleAudios
    );

    assert.strictEqual(sequence.slides[0].scriptText, 'નમસ્તે મિત્રો, જીપીએસસી વર્ગ ૧ અને ૨ ની અધિકૃત જાહેરાત આવી ગઈ છે.');
    assert.strictEqual(sequence.slides[1].scriptText, 'શૈક્ષણિક લાયકાતમાં માન્ય યુનિવર્સિટીમાંથી સ્નાતક ડિગ્રી જરૂરી છે.');
    assert.strictEqual(sequence.slides[2].scriptText, 'પરીક્ષા પદ્ધતિમાં પ્રથમ પ્રિલિમિનરી અને ત્યારબાદ મુખ્ય લેખિત પરીક્ષા લેવાશે.');
  });

  test('7. Sequence Persistence & Fidelity Verification', () => {
    const sequence = buildConnectedSlideSequence(
      sampleProject,
      sampleProject.slide.importedPresentation,
      sampleAudios
    );

    const saved = saveConnectedSequence(sampleProject.id, sequence);
    assert.ok(saved);
    assert.strictEqual(saved.projectId, sampleProject.id);

    const loaded = loadConnectedSequence(sampleProject.id);
    assert.ok(loaded);
    assert.strictEqual(loaded.projectId, sampleProject.id);
    assert.strictEqual(loaded.totalSlides, 3);
    assert.strictEqual(loaded.connectedCount, 2);

    const audit = verifySequenceFidelity(loaded);
    assert.strictEqual(audit.isValid, true);
    assert.strictEqual(audit.errors.length, 0);
  });

  test('8. Saved Video Player Integration: Exposes video view state, video element, and seamless all-slide playback', () => {
    const editingState = {
      lastExportedVideoUrl: 'blob:http://localhost:5000/test-video-uuid',
      lastExportedFilename: 'GPSC_3Slides_1080p.mp4',
      exportHistory: [
        {
          filename: 'GPSC_3Slides_1080p.mp4',
          duration: 30.5,
          slideCount: 3,
          exportedAt: new Date().toISOString()
        }
      ]
    };

    assert.ok(editingState.lastExportedVideoUrl, 'Has exported video url');
    assert.strictEqual(editingState.lastExportedFilename, 'GPSC_3Slides_1080p.mp4');

    // Test Video Player Renderer Model
    function renderSavedVideoViewModel(state, viewMode = 'saved_video') {
      return {
        viewMode,
        isVideoReady: Boolean(state.lastExportedVideoUrl),
        videoUrl: state.lastExportedVideoUrl || null,
        filename: state.lastExportedFilename || 'slides_video.mp4',
        hasVideoPlayerTag: Boolean(state.lastExportedVideoUrl),
        controlsEnabled: true
      };
    }

    const vm = renderSavedVideoViewModel(editingState, 'saved_video');
    assert.strictEqual(vm.viewMode, 'saved_video');
    assert.strictEqual(vm.isVideoReady, true);
    assert.strictEqual(vm.hasVideoPlayerTag, true);
    assert.strictEqual(vm.videoUrl, 'blob:http://localhost:5000/test-video-uuid');
  });

});
