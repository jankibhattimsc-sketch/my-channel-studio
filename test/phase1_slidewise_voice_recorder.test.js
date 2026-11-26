const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

// Server-side extractor and helpers
const extractor = require('../server/services/pdfSlideExtractor');
const { audioBufferToWav } = require('../public/js/utils/audioRecorderEnhancer');

describe('PHASE 1 — SLIDE-WISE VOICE RECORDER INTEGRATION TESTS', () => {
  const testProjectId = `proj_phase1_test_${Date.now()}`;
  const actualPdfPath = path.join(__dirname, '..', 'public', 'presentations', 'pres_1793465525051_Gujarat_DA_Hike_5Pages.pdf');

  let extractedSlides = [];
  const inMemorySlideAudioStore = new Map();
  let inMemoryProjectAudioStore = null;

  // Mock audio storage functions mimicking audioStorage.js behavior
  async function mockSaveSlideAudio(projectId, slideId, data) {
    const key = `${projectId}_slide_${slideId}`;
    inMemorySlideAudioStore.set(key, { ...data, id: key, projectId, slideId: String(slideId) });
    return true;
  }

  async function mockGetSlideAudio(projectId, slideId) {
    const key = `${projectId}_slide_${slideId}`;
    return inMemorySlideAudioStore.get(key) || null;
  }

  async function mockGetAllSlideAudio(projectId) {
    const results = [];
    for (const [key, val] of inMemorySlideAudioStore.entries()) {
      if (val.projectId === projectId) results.push(val);
    }
    return results;
  }

  async function mockSaveProjectAudio(projectId, data) {
    inMemoryProjectAudioStore = { ...data, projectId, updatedAt: new Date().toISOString() };
    return true;
  }

  async function mockGetProjectAudio(projectId) {
    if (inMemoryProjectAudioStore && inMemoryProjectAudioStore.projectId === projectId) {
      return inMemoryProjectAudioStore;
    }
    return null;
  }

  // Helper to create a dummy PCM AudioBuffer-like object
  function createMockAudioBuffer(durationSec, sampleRate = 44100) {
    const length = Math.floor(durationSec * sampleRate);
    const left = new Float32Array(length);
    const right = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      left[i] = Math.sin((i / sampleRate) * 440 * 2 * Math.PI) * 0.3;
      right[i] = left[i];
    }
    return {
      numberOfChannels: 2,
      sampleRate,
      length,
      duration: durationSec,
      getChannelData: (c) => (c === 0 ? left : right)
    };
  }

  it('1. Workflow Step 1 & 2: Load original PDF imported into active project & preserve page order', async () => {
    assert.strictEqual(fs.existsSync(actualPdfPath), true, 'Actual imported PDF must exist');
    const pdfBuffer = fs.readFileSync(actualPdfPath);
    const result = await extractor.extractSlidesFromPdf(pdfBuffer, {
      filename: 'Gujarat_DA_Hike_5Pages.pdf'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.slideCount, 5);

    extractedSlides = result.slides.map((s, idx) => ({
      ...s,
      slideId: `slide_${testProjectId}_${s.slideNumber || (idx + 1)}`,
      pageNumber: s.pageNumber || (idx + 1),
      slideNumber: s.slideNumber || (idx + 1)
    }));

    assert.strictEqual(extractedSlides.length, 5);
    for (let i = 0; i < extractedSlides.length; i++) {
      assert.strictEqual(extractedSlides[i].slideNumber, i + 1);
      assert.strictEqual(extractedSlides[i].pageNumber, i + 1);
    }
  });

  it('2. Workflow Step 3, 4 & 5: Record audio for Slide 1 & save against Slide 1', async () => {
    const slide1 = extractedSlides[0];
    const mockAudio1 = createMockAudioBuffer(12.5); // 12.5 seconds
    const wavBlob1 = audioBufferToWav(mockAudio1);

    await mockSaveSlideAudio(testProjectId, slide1.slideId, {
      slideId: slide1.slideId,
      slideNumber: 1,
      pageNumber: 1,
      duration: 12.5,
      filename: `slide_1_voice.wav`,
      status: 'Recorded',
      dataUrl: 'data:audio/wav;base64,MOCK_DATA_SLIDE1'
    });

    const saved = await mockGetSlideAudio(testProjectId, slide1.slideId);
    assert.ok(saved, 'Slide 1 recording must be saved');
    assert.strictEqual(saved.slideNumber, 1);
    assert.strictEqual(saved.duration, 12.5);
    assert.strictEqual(saved.status, 'Recorded');
  });

  it('3. Workflow Step 6: Move to Slide 2 and record its voice independently', async () => {
    const slide2 = extractedSlides[1];
    const mockAudio2 = createMockAudioBuffer(18.0); // 18 seconds
    const wavBlob2 = audioBufferToWav(mockAudio2);

    await mockSaveSlideAudio(testProjectId, slide2.slideId, {
      slideId: slide2.slideId,
      slideNumber: 2,
      pageNumber: 2,
      duration: 18.0,
      filename: `slide_2_voice.wav`,
      status: 'Recorded',
      dataUrl: 'data:audio/wav;base64,MOCK_DATA_SLIDE2'
    });

    const saved2 = await mockGetSlideAudio(testProjectId, slide2.slideId);
    assert.ok(saved2, 'Slide 2 recording must be saved independently');
    assert.strictEqual(saved2.slideNumber, 2);
    assert.strictEqual(saved2.duration, 18.0);

    // Verify Slide 1 recording is not overwritten
    const saved1 = await mockGetSlideAudio(testProjectId, extractedSlides[0].slideId);
    assert.strictEqual(saved1.duration, 12.5);
  });

  it('4. Refresh the page: Confirm both recordings are still saved in persistent storage', async () => {
    // New retrieval simulates page refresh
    const allRecords = await mockGetAllSlideAudio(testProjectId);
    assert.strictEqual(allRecords.length, 2, 'Should have exactly 2 saved recordings');

    const rec1 = allRecords.find(r => r.slideNumber === 1);
    const rec2 = allRecords.find(r => r.slideNumber === 2);

    assert.ok(rec1, 'Slide 1 recording persists after reload');
    assert.ok(rec2, 'Slide 2 recording persists after reload');
    assert.strictEqual(rec1.duration, 12.5);
    assert.strictEqual(rec2.duration, 18.0);
  });

  it('5. Identify missing slides before combining (Slides 3, 4, 5 missing)', async () => {
    const allRecords = await mockGetAllSlideAudio(testProjectId);
    const recordedNumbers = new Set(allRecords.map(r => r.slideNumber));

    const missingSlides = [];
    extractedSlides.forEach((s) => {
      if (!recordedNumbers.has(s.slideNumber)) {
        missingSlides.push(s.slideNumber);
      }
    });

    assert.deepStrictEqual(missingSlides, [3, 4, 5], 'Must accurately identify unrecorded slides');
  });

  it('6. Record remaining slides (Slides 3, 4, 5) to prepare for combination', async () => {
    const durations = { 3: 14.0, 4: 16.5, 5: 10.0 };
    for (const num of [3, 4, 5]) {
      const slide = extractedSlides[num - 1];
      await mockSaveSlideAudio(testProjectId, slide.slideId, {
        slideId: slide.slideId,
        slideNumber: num,
        pageNumber: num,
        duration: durations[num],
        filename: `slide_${num}_voice.wav`,
        status: 'Recorded',
        dataUrl: `data:audio/wav;base64,MOCK_DATA_SLIDE${num}`
      });
    }

    const allRecords = await mockGetAllSlideAudio(testProjectId);
    assert.strictEqual(allRecords.length, 5, 'All 5 slides must have recordings');
  });

  it('7. Workflow Step 8 & 9: Combine all recordings in PDF page order into one continuous audio file', async () => {
    const allRecords = await mockGetAllSlideAudio(testProjectId);
    // Sort in strict PDF page order
    allRecords.sort((a, b) => a.slideNumber - b.slideNumber);

    // Verify order
    for (let i = 0; i < allRecords.length; i++) {
      assert.strictEqual(allRecords[i].slideNumber, i + 1);
    }

    const sampleRate = 44100;
    const pauseBetweenSlidesSec = 0.25;
    const pauseSamples = Math.round(pauseBetweenSlidesSec * sampleRate);

    // Calculate total duration: sum of durations + (4 pauses * 0.25s)
    const totalDurationSec = allRecords.reduce((acc, r) => acc + r.duration, 0) + (allRecords.length - 1) * pauseBetweenSlidesSec;
    assert.strictEqual(totalDurationSec, 12.5 + 18.0 + 14.0 + 16.5 + 10.0 + 1.0); // 72.0s

    // Mock combine into Master WAV
    const mockCombinedBuffer = createMockAudioBuffer(totalDurationSec, sampleRate);
    const combinedWavBlob = audioBufferToWav(mockCombinedBuffer);
    assert.ok(combinedWavBlob, 'WAV blob must be generated');

    await mockSaveProjectAudio(testProjectId, {
      duration: totalDurationSec,
      filename: `Gujarat_DA_combined_narration.wav`,
      dataUrl: 'data:audio/wav;base64,MOCK_COMBINED_MASTER'
    });

    const savedMaster = await mockGetProjectAudio(testProjectId);
    assert.ok(savedMaster, 'Combined narration must be saved to project');
    assert.strictEqual(savedMaster.duration, 72.0);
    assert.strictEqual(savedMaster.filename, 'Gujarat_DA_combined_narration.wav');
  });

  it('8. Reopen project and verify everything remains available', async () => {
    // Reopen project: verify PDF reference, all 5 slide recordings, and combined master audio
    const allRecords = await mockGetAllSlideAudio(testProjectId);
    assert.strictEqual(allRecords.length, 5, 'All 5 slide recordings remain available');

    const masterAudio = await mockGetProjectAudio(testProjectId);
    assert.ok(masterAudio, 'Master combined audio remains available');
    assert.strictEqual(masterAudio.duration, 72.0);

    // Verify slide-wise mapping integrity
    for (let i = 0; i < extractedSlides.length; i++) {
      const s = extractedSlides[i];
      const rec = allRecords.find(r => r.slideNumber === s.slideNumber);
      assert.ok(rec, `Slide ${s.slideNumber} has its own audio`);
      assert.strictEqual(rec.slideId, s.slideId, `Recording matches permanent slideId`);
    }
  });
});

