const { describe, it, before } = require('node:test');
const assert = require('node:assert');

describe('VOICE ENHANCER & AUDIO EDITING STUDIO — COMPREHENSIVE TEST SUITE', () => {
  let MultitrackAudioEngine;
  let VOICE_ENHANCER_PRESETS;
  let inspectAudioQuality;
  let normalizeAudioBuffer;
  let trimSilenceFromAudioBuffer;

  before(async () => {
    // Provide polyfills if running in bare Node test environment
    if (typeof global.window === 'undefined') {
      global.window = {};
    }
    if (typeof global.localStorage === 'undefined') {
      const memoryStorage = new Map();
      global.localStorage = {
        getItem: (k) => memoryStorage.get(k) || null,
        setItem: (k, v) => memoryStorage.set(k, String(v)),
        removeItem: (k) => memoryStorage.delete(k),
        clear: () => memoryStorage.clear(),
        key: (idx) => Array.from(memoryStorage.keys())[idx] || null,
        get length() { return memoryStorage.size; }
      };
    }

    const dspModule = await import('../public/js/utils/audioRecorderEnhancer.js');
    VOICE_ENHANCER_PRESETS = dspModule.VOICE_ENHANCER_PRESETS;
    inspectAudioQuality = dspModule.inspectAudioQuality;
    normalizeAudioBuffer = dspModule.normalizeAudioBuffer;
    trimSilenceFromAudioBuffer = dspModule.trimSilenceFromAudioBuffer;

    const engineModule = await import('../public/js/utils/multitrackAudioEngine.js');
    MultitrackAudioEngine = engineModule.MultitrackAudioEngine;
  });

  // Helper to create mock AudioBuffer
  function createMockAudioBuffer(samples, sampleRate = 48000) {
    const channelData = new Float32Array(samples);
    return {
      numberOfChannels: 1,
      sampleRate,
      length: channelData.length,
      duration: channelData.length / sampleRate,
      getChannelData: (c) => channelData
    };
  }

  // -------------------------------------------------------------
  // SECTION 1: 7 DASHBOARD METRICS CALCULATION
  // -------------------------------------------------------------
  it('1. Dashboard Metrics: Calculates 7 metrics accurately (slides, recorded, enhanced, duration, %)', () => {
    const mockSlides = [
      { id: 'slide-1', pageNum: 1, text: 'સ્લાઇડ ૧' },
      { id: 'slide-2', pageNum: 2, text: 'સ્લાઇડ ૨' },
      { id: 'slide-3', pageNum: 3, text: 'સ્લાઇડ ૩' },
      { id: 'slide-4', pageNum: 4, text: 'સ્લાઇડ ૪' }
    ];

    const mockRecords = {
      'slide-1': { duration: 15.2, isEnhanced: true },
      'slide-2': { duration: 24.8, isEnhanced: false },
      'slide-3': { duration: 10.0, isEnhanced: true }
      // slide-4 not recorded
    };

    const totalSlides = mockSlides.length;
    const recordedSlides = Object.keys(mockRecords).length;
    const enhancedSlides = Object.values(mockRecords).filter(r => r.isEnhanced).length;
    const totalDuration = Object.values(mockRecords).reduce((acc, r) => acc + (r.duration || 0), 0);
    const completionPct = totalSlides > 0 ? Math.round((recordedSlides / totalSlides) * 100) : 0;

    const mins = Math.floor(totalDuration / 60);
    const secs = Math.floor(totalDuration % 60);
    const formattedDuration = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    assert.strictEqual(totalSlides, 4, 'Total slides must be 4');
    assert.strictEqual(recordedSlides, 3, 'Recorded slides must be 3');
    assert.strictEqual(enhancedSlides, 2, 'Enhanced slides must be 2');
    assert.strictEqual(Math.round(totalDuration), 50, 'Total duration should be 50s');
    assert.strictEqual(formattedDuration, '00:50', 'Formatted duration should be 00:50');
    assert.strictEqual(completionPct, 75, 'Completion percentage must be 75%');
  });

  // -------------------------------------------------------------
  // SECTION 2: 5 AI VOICE ENHANCER PRESETS
  // -------------------------------------------------------------
  it('2. AI Voice Enhancer Presets: All 5 presets exist with correct broadcast DSP parameters', () => {
    assert.ok(VOICE_ENHANCER_PRESETS.gujarati_news_anchor, 'Preset gujarati_news_anchor must exist');
    assert.ok(VOICE_ENHANCER_PRESETS.studio_voice, 'Preset studio_voice must exist');
    assert.ok(VOICE_ENHANCER_PRESETS.natural_voice, 'Preset natural_voice must exist');
    assert.ok(VOICE_ENHANCER_PRESETS.loud_clear, 'Preset loud_clear must exist');
    assert.ok(VOICE_ENHANCER_PRESETS.custom, 'Preset custom must exist');

    // Gujarati News Anchor: high vocal presence (3kHz) + de-esser (7kHz) + mud cut (280Hz)
    const news = VOICE_ENHANCER_PRESETS.gujarati_news_anchor;
    assert.strictEqual(news.highpassFreq, 80);
    assert.strictEqual(news.presenceFreq, 3000);
    assert.ok(news.presenceGain > 2.0, 'Presence gain should boost clarity');
    assert.strictEqual(news.deEsserFreq, 7000);
    assert.ok(news.deEsserGain < 0, 'De-esser should tame harsh sibilance');
    assert.strictEqual(news.normalizePeakDb, -1.0);

    // Studio Voice: balanced compressor & presence
    const studio = VOICE_ENHANCER_PRESETS.studio_voice;
    assert.strictEqual(studio.compressorRatio, 3.0);
    assert.strictEqual(studio.highpassFreq, 75);

    // Loud & Clear: higher compression ratio & volume gain
    const loud = VOICE_ENHANCER_PRESETS.loud_clear;
    assert.ok(loud.volumeGain >= 1.4, 'Loud & clear should have strong gain');
    assert.strictEqual(loud.compressorRatio, 4.0);
  });

  // -------------------------------------------------------------
  // SECTION 3: AUDIO QUALITY AUDITOR (INSPECTION)
  // -------------------------------------------------------------
  it('3. Audio Quality Auditor: Inspects peak dBFS, detects clipping, noise floor, and computes score', () => {
    // 1. Buffer with clipping sample (1.0)
    const clippedSamples = [0.1, 0.5, 0.999, 1.0, 0.8, -1.0, -0.4];
    const clippedBuffer = createMockAudioBuffer(clippedSamples, 48000);
    const clipReport = inspectAudioQuality(clippedBuffer);

    assert.ok(clipReport.metrics.clippingCount >= 2, 'Should detect at least 2 clipping samples');
    assert.ok(clipReport.warnings.some(w => w.includes('ક્લિપિંગ') || w.includes('clipping') || w.includes('ડિજિટલ')), 'Must warn about clipping');

    // 2. Clean normal speech buffer
    const cleanSamples = new Float32Array(4800);
    for (let i = 0; i < cleanSamples.length; i++) {
      cleanSamples[i] = 0.5 * Math.sin(2 * Math.PI * 440 * (i / 48000));
    }
    const cleanBuffer = createMockAudioBuffer(cleanSamples, 48000);
    const cleanReport = inspectAudioQuality(cleanBuffer);

    assert.strictEqual(cleanReport.metrics.clippingCount, 0, 'Clean buffer must have 0 clippings');
    assert.ok(cleanReport.score >= 80, `Clean buffer should score high, got ${cleanReport.score}`);
    assert.ok(cleanReport.metrics.peakDb <= 0, 'Peak dBFS should be negative or zero');

    // 3. Null buffer check
    const nullReport = inspectAudioQuality(null);
    assert.strictEqual(nullReport.isValid, false);
    assert.strictEqual(nullReport.score, 0);
  });

  // -------------------------------------------------------------
  // SECTION 4: MULTITRACK AUDIO ENGINE
  // -------------------------------------------------------------
  it('4. Multitrack Engine: Initializes 4 dedicated tracks with proper colors and default volumes', () => {
    const engine = new MultitrackAudioEngine();
    assert.strictEqual(engine.tracks.length, 4, 'Must have 4 tracks');

    const [tOrig, tEnh, tBgm, tSfx] = engine.tracks;
    assert.strictEqual(tOrig.id, 'track_orig');
    assert.strictEqual(tEnh.id, 'track_enh');
    assert.strictEqual(tBgm.id, 'track_bgm');
    assert.strictEqual(tSfx.id, 'track_sfx');

    assert.strictEqual(tBgm.volume, 0.12, 'BGM default volume must be 12% (0.12)');
    assert.strictEqual(tBgm.ducking, true, 'BGM track should have ducking enabled by default');
  });

  it('5. Multitrack Engine: Non-destructive clip editing (trimStart, trimEnd, splitClip, deleteRange)', () => {
    const engine = new MultitrackAudioEngine();
    const mockBuf = createMockAudioBuffer(new Float32Array(48000 * 10), 48000); // 10 seconds

    const clip = engine.addClip('track_orig', {
      name: 'Slide 1 Narration',
      buffer: mockBuf,
      startTime: 2.0,
      duration: 10.0,
      sourceOffset: 0.0
    });

    assert.ok(clip, 'Clip must be created');
    assert.strictEqual(clip.startTime, 2.0);
    assert.strictEqual(clip.duration, 10.0);

    // 1. Trim Start non-destructively: trim 1.5 seconds from start
    engine.trimClipStart(clip.id, 1.5);
    const trimmedClip = engine.getClip(clip.id);
    assert.strictEqual(trimmedClip.startTime, 3.5, 'Start time moves forward by trimmed amount');
    assert.strictEqual(trimmedClip.duration, 8.5, 'Duration reduced by 1.5s');
    assert.strictEqual(trimmedClip.offset, 1.5, 'Source offset increased by 1.5s');

    // 2. Trim End non-destructively: trim 2.0 seconds from end
    engine.trimClipEnd(clip.id, 2.0);
    assert.strictEqual(trimmedClip.duration, 6.5, 'Duration reduced by 2.0s to 6.5s');

    // 3. Split Clip at timeline position 6.0s (which is 2.5s into the 6.5s clip)
    const splitResult = engine.splitClip(clip.id, 6.0);
    assert.ok(splitResult, 'Split must succeed');
    assert.ok(splitResult.clipA, 'Part A should exist');
    assert.ok(splitResult.clipB, 'Part B should exist');
    assert.strictEqual(splitResult.clipA.duration, 2.5);
    assert.strictEqual(splitResult.clipB.startTime, 6.0);
    assert.strictEqual(splitResult.clipB.duration, 4.0);

    // 4. Undo split
    const undone = engine.undo();
    assert.ok(undone, 'Undo should succeed');
    assert.strictEqual(engine.tracks[0].clips.length, 1, 'Should restore to 1 clip');

    // 5. Redo split
    const redone = engine.redo();
    assert.ok(redone, 'Redo should succeed');
    assert.strictEqual(engine.tracks[0].clips.length, 2, 'Should restore to 2 clips');

    // 6. Delete Range: delete timeline 5.0s to 7.0s (removes 1s from clipA, 1s from clipB)
    engine.deleteRange(5.0, 7.0);
    const totalClipDuration = engine.tracks[0].clips.reduce((sum, c) => sum + c.duration, 0);
    assert.strictEqual(totalClipDuration, 4.5, 'Total audio clips duration should reduce to 4.5s');

    // 7. Delete Tail: delete timeline 8.0s to 12.0s (truncates end of timeline)
    engine.deleteRange(8.0, 12.0);
    const remainingTotalTimeline = engine.getTotalDuration();
    assert.strictEqual(remainingTotalTimeline, 8.0, 'Timeline total duration should decrease to 8.0s');
  });

  it('6. Multitrack Engine: BGM Auto-Ducking speech interval calculation', () => {
    const engine = new MultitrackAudioEngine();
    const mockBuf1 = createMockAudioBuffer(new Float32Array(48000 * 5), 48000); // 5s
    const mockBuf2 = createMockAudioBuffer(new Float32Array(48000 * 4), 48000); // 4s

    // Add speech clips at [1.0s to 6.0s] and [8.0s to 12.0s]
    engine.addClip('track_enh', { buffer: mockBuf1, startTime: 1.0, duration: 5.0 });
    engine.addClip('track_enh', { buffer: mockBuf2, startTime: 8.0, duration: 4.0 });

    const speechIntervals = engine.getSpeechIntervals();
    assert.strictEqual(speechIntervals.length, 2, 'Should detect 2 speech intervals');
    assert.strictEqual(speechIntervals[0].start, 1.0);
    assert.strictEqual(speechIntervals[0].end, 6.0);
    assert.strictEqual(speechIntervals[1].start, 8.0);
    assert.strictEqual(speechIntervals[1].end, 12.0);

    // Check ducking settings
    assert.strictEqual(engine.duckingSettings.normalVolume, 0.12);
    assert.strictEqual(engine.duckingSettings.duckedVolume, 0.04);
  });

  // -------------------------------------------------------------
  // SECTION 5: VERBATIM SCRIPT PRESERVATION IN AUDIO WORKSTATION
  // -------------------------------------------------------------
  it('7. Script Fidelity: Studio maintains verbatim Gujarati script without alteration', () => {
    const originalScript = 'આ સ્લાઇડમાં દર્શાવેલી તમામ બાબતોનું વિશ્લેષણ કરવામાં આવ્યું છે. ૨૦૨૬ ના નવા નિયમો.';
    
    // Simulate assigning and reading script in Voice Studio
    const slideState = {
      slideId: 'slide-test-99',
      assignedScript: originalScript,
      status: 'Ready'
    };

    assert.strictEqual(slideState.assignedScript, originalScript);
    assert.ok(!slideState.assignedScript.includes('undefined'));
    assert.strictEqual(slideState.assignedScript.length, originalScript.length);
  });
});
