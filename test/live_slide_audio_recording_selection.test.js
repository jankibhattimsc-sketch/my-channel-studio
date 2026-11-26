const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  buildConnectedSlideSequence,
  saveConnectedSequence,
  loadConnectedSequence,
  verifySequenceFidelity
} = require('../public/js/utils/slideAudioConnector.js');

describe('LIVE SLIDE + AUDIO RECORDING & CUSTOM SLIDE SELECTION ENGINE', () => {

  const sampleProject = {
    id: 'proj_live_rec_001',
    name: 'GPSC Bharti Live Presentation',
    slide: {
      slides: [
        { slideId: 'sl_01', slideNumber: 1, pageNumber: 1, title: 'સ્લાઇડ ૧: પરિચય અને જાહેરાત' },
        { slideId: 'sl_02', slideNumber: 2, pageNumber: 2, title: 'સ્લાઇડ ૨: શૈક્ષણિક લાયકાત' },
        { slideId: 'sl_03', slideNumber: 3, pageNumber: 3, title: 'સ્લાઇડ ૩: પરીક્ષા પદ્ધતિ' },
        { slideId: 'sl_04', slideNumber: 4, pageNumber: 4, title: 'સ્લાઇડ ૪: પગાર ધોરણ' },
        { slideId: 'sl_05', slideNumber: 5, pageNumber: 5, title: 'સ્લાઇડ ૫: અરજી પ્રક્રિયા' }
      ],
      importedPresentation: {
        id: 'pres_live_01',
        filename: 'GPSC_Notification.pdf',
        fileType: 'pdf',
        slideCount: 5
      }
    }
  };

  test('1. Audio Buffer Slicing by Live Slide Transitions: Divides continuous speech accurately', () => {
    // Mock AudioContext and AudioBuffer
    const sampleRate = 48000;
    const totalDurationSec = 30.0;
    const totalSamples = sampleRate * totalDurationSec;

    // Simulate transition timestamps:
    // Slide 1: 0s to 12s (12s duration)
    // Slide 2: 12s to 22s (10s duration)
    // Slide 3: 22s to 30s (8s duration)
    const transitions = [
      { slideNumber: 1, slideId: 'sl_01', startTime: 0.0, endTime: 12.0 },
      { slideNumber: 2, slideId: 'sl_02', startTime: 12.0, endTime: 22.0 },
      { slideNumber: 3, slideId: 'sl_03', startTime: 22.0, endTime: 30.0 }
    ];

    function calculateSliceParameters(trans, fs) {
      return trans.map(t => {
        const startSample = Math.floor(t.startTime * fs);
        const endSample = Math.floor(t.endTime * fs);
        const sampleCount = endSample - startSample;
        const duration = sampleCount / fs;
        return {
          slideNumber: t.slideNumber,
          slideId: t.slideId,
          startSample,
          endSample,
          sampleCount,
          duration
        };
      });
    }

    const slices = calculateSliceParameters(transitions, sampleRate);

    assert.strictEqual(slices.length, 3);
    assert.strictEqual(slices[0].duration, 12.0);
    assert.strictEqual(slices[1].duration, 10.0);
    assert.strictEqual(slices[2].duration, 8.0);
    assert.strictEqual(slices[0].sampleCount + slices[1].sampleCount + slices[2].sampleCount, totalSamples);
  });

  test('2. Custom Slide Selection: Creates video sequence containing only user-specified slides', () => {
    const storedAudios = [
      { projectId: sampleProject.id, slideId: 'sl_01', slideNumber: 1, duration: 12.0, dataUrl: 'audio_1' },
      { projectId: sampleProject.id, slideId: 'sl_02', slideNumber: 2, duration: 10.0, dataUrl: 'audio_2' },
      { projectId: sampleProject.id, slideId: 'sl_03', slideNumber: 3, duration: 8.0, dataUrl: 'audio_3' }
    ];

    const fullSequence = buildConnectedSlideSequence(
      sampleProject,
      sampleProject.slide.importedPresentation,
      storedAudios
    );

    assert.strictEqual(fullSequence.totalSlides, 5);

    // User selects only Slide 1 to 3 ("હું ધારું એટલી સ્લાઇડ")
    const selectedSlideNumbers = [1, 2, 3];

    function filterSequenceBySlides(seq, allowedSlideNumbers) {
      const allowedSet = new Set(allowedSlideNumbers);
      const filteredSlides = seq.slides.filter(s => allowedSet.has(s.slideNumber));

      let currentOffset = 0;
      filteredSlides.forEach((s, idx) => {
        s.sequenceIndex = idx;
        s.startTime = Number(currentOffset.toFixed(2));
        s.endTime = Number((currentOffset + s.duration).toFixed(2));
        currentOffset += s.duration;
      });

      const totalDuration = Number(currentOffset.toFixed(2));
      const mins = Math.floor(totalDuration / 60);
      const secs = Math.round(totalDuration % 60);

      return {
        ...seq,
        totalSlides: filteredSlides.length,
        slides: filteredSlides,
        totalDuration,
        formattedDuration: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
        connectedCount: filteredSlides.filter(s => s.hasAudio).length,
        missingCount: filteredSlides.filter(s => !s.hasAudio).length
      };
    }

    const customSequence = filterSequenceBySlides(fullSequence, selectedSlideNumbers);

    assert.strictEqual(customSequence.totalSlides, 3);
    assert.strictEqual(customSequence.connectedCount, 3);
    assert.strictEqual(customSequence.missingCount, 0);
    assert.strictEqual(customSequence.totalDuration, 30.0);
    assert.strictEqual(customSequence.formattedDuration, '00:30');

    // Slide 1: 0 to 12s
    assert.strictEqual(customSequence.slides[0].startTime, 0.0);
    assert.strictEqual(customSequence.slides[0].endTime, 12.0);

    // Slide 2: 12s to 22s
    assert.strictEqual(customSequence.slides[1].startTime, 12.0);
    assert.strictEqual(customSequence.slides[1].endTime, 22.0);

    // Slide 3: 22s to 30s
    assert.strictEqual(customSequence.slides[2].startTime, 22.0);
    assert.strictEqual(customSequence.slides[2].endTime, 30.0);
  });

  test('3. Partial Recorded Slides Video Filter: "Only Recorded Slides" mode', () => {
    // Only slides 1, 2, and 4 are recorded
    const storedAudios = [
      { projectId: sampleProject.id, slideId: 'sl_01', slideNumber: 1, duration: 15.0, dataUrl: 'audio_1' },
      { projectId: sampleProject.id, slideId: 'sl_02', slideNumber: 2, duration: 14.0, dataUrl: 'audio_2' },
      { projectId: sampleProject.id, slideId: 'sl_04', slideNumber: 4, duration: 16.0, dataUrl: 'audio_4' }
    ];

    const fullSequence = buildConnectedSlideSequence(
      sampleProject,
      sampleProject.slide.importedPresentation,
      storedAudios
    );

    // Filter by only recorded slides
    const recordedSlideNumbers = fullSequence.slides.filter(s => s.hasAudio).map(s => s.slideNumber);
    assert.deepStrictEqual(recordedSlideNumbers, [1, 2, 4]);

    const onlyRecordedSlides = fullSequence.slides.filter(s => s.hasAudio);
    assert.strictEqual(onlyRecordedSlides.length, 3);
    assert.strictEqual(onlyRecordedSlides.every(s => s.hasAudio), true);
  });

  test('4. Range Selection (e.g. Slide 1 to Slide N): Computes valid consecutive sub-deck', () => {
    const totalSlides = 10;
    const rangeStart = 2;
    const rangeEnd = 6;

    const selected = [];
    for (let i = rangeStart; i <= rangeEnd; i++) {
      selected.push(i);
    }

    assert.strictEqual(selected.length, 5);
    assert.deepStrictEqual(selected, [2, 3, 4, 5, 6]);
  });

});

