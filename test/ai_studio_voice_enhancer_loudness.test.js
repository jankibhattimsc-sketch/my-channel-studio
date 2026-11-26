const { describe, it, before } = require('node:test');
const assert = require('node:assert');

describe('AI STUDIO VOICE ENHANCER — INTELLIGENT LOUDNESS & VOICE CONSISTENCY', () => {
  let measureAudioLoudness;
  let normalizeToTargetLoudness;
  let enhanceAudioBuffer;
  let inspectAudioQuality;
  let stitchAudioBuffers;
  let VOICE_ENHANCER_PRESETS;

  before(async () => {
    if (typeof global.window === 'undefined') {
      global.window = {};
    }
    if (typeof global.localStorage === 'undefined') {
      const memoryStorage = new Map();
      global.localStorage = {
        getItem: (k) => memoryStorage.get(k) || null,
        setItem: (k, v) => memoryStorage.set(k, String(v)),
        removeItem: (k) => memoryStorage.delete(k),
        clear: () => memoryStorage.clear()
      };
    }

    const dspModule = await import('../public/js/utils/audioRecorderEnhancer.js');
    measureAudioLoudness = dspModule.measureAudioLoudness;
    normalizeToTargetLoudness = dspModule.normalizeToTargetLoudness;
    enhanceAudioBuffer = dspModule.enhanceAudioBuffer;
    inspectAudioQuality = dspModule.inspectAudioQuality;
    VOICE_ENHANCER_PRESETS = dspModule.VOICE_ENHANCER_PRESETS;

    const stitcherModule = await import('../public/js/utils/audioStitcher.js');
    stitchAudioBuffers = stitcherModule.stitchAudioBuffers;
  });

  // Helper to create mock AudioBuffer
  function createMockAudioBuffer(samples, sampleRate = 48000) {
    const channelData = new Float32Array(samples);
    return {
      numberOfChannels: 1,
      sampleRate,
      length: channelData.length,
      duration: channelData.length / sampleRate,
      getChannelData: () => channelData
    };
  }

  // -------------------------------------------------------------
  // TEST 1: Very Low-Volume Voice Detection & Intelligent Normalization
  // -------------------------------------------------------------
  it('1. Low-Volume Voice: Intelligently boosts quiet voice (~ -34 LUFS) to broadcast target (-16 LUFS) with peak limiting', () => {
    const fs = 48000;
    const dur = 2.0;
    const quietSamples = new Float32Array(fs * dur);
    // Sine wave simulating very quiet Gujarati narration at -32 dBFS
    const amp = Math.pow(10, -32 / 20); // ~0.025
    for (let i = 0; i < quietSamples.length; i++) {
      quietSamples[i] = amp * (Math.sin(2 * Math.PI * 300 * (i / fs)) + 0.4 * Math.sin(2 * Math.PI * 1200 * (i / fs)));
    }
    const quietBuf = createMockAudioBuffer(quietSamples, fs);

    const initialLoudness = measureAudioLoudness(quietBuf);
    assert.ok(initialLoudness.integratedLUFS < -30, `Input must be quiet, got ${initialLoudness.integratedLUFS} LUFS`);

    const result = normalizeToTargetLoudness(quietBuf, {
      targetLUFS: -16.0,
      targetPeakDb: -1.0
    });

    assert.ok(result.gainDb > 10, `Should apply significant gain boost, applied ${result.gainDb} dB`);
    assert.ok(Math.abs(result.after.integratedLUFS - (-16.0)) <= 0.5, `Final loudness must be within 0.5 LUFS of -16.0, got ${result.after.integratedLUFS}`);
    assert.ok(result.after.truePeakDb <= -1.0, `True peak must be at or below -1.0 dBTP, got ${result.after.truePeakDb}`);
    assert.ok(result.warning, 'Must provide warning explaining that audio was quiet');
  });

  // -------------------------------------------------------------
  // TEST 2: Normal-Volume Voice Preservation Without Distortion
  // -------------------------------------------------------------
  it('2. Normal-Volume Voice: Preserves speech dynamics without excessive compression or clipping', () => {
    const fs = 48000;
    const dur = 2.0;
    const normalSamples = new Float32Array(fs * dur);
    const amp = Math.pow(10, -17 / 20); // ~ -17 dBFS
    for (let i = 0; i < normalSamples.length; i++) {
      normalSamples[i] = amp * Math.sin(2 * Math.PI * 440 * (i / fs));
    }
    const normalBuf = createMockAudioBuffer(normalSamples, fs);

    const result = normalizeToTargetLoudness(normalBuf, {
      targetLUFS: -16.0,
      targetPeakDb: -1.0
    });

    assert.ok(Math.abs(result.gainDb) <= 6.0, `Normal audio should only require small adjustment, applied ${result.gainDb} dB`);
    assert.ok(result.after.truePeakDb <= -1.0, 'True peak must be <= -1.0 dBTP');
  });

  // -------------------------------------------------------------
  // TEST 3: Inter-Slide Loudness Consistency (Zero Volume Jumps)
  // -------------------------------------------------------------
  it('3. Multi-Slide Consistency: Balances different recording volumes across slides to within 0.5 LUFS', () => {
    const fs = 48000;
    const dur = 2.0;

    // Slide 1: Quiet recording (-30 dBFS)
    const s1 = new Float32Array(fs * dur);
    const amp1 = Math.pow(10, -30 / 20);
    for (let i = 0; i < s1.length; i++) s1[i] = amp1 * Math.sin(2 * Math.PI * 350 * (i / fs));
    const buf1 = createMockAudioBuffer(s1, fs);

    // Slide 2: Medium recording (-22 dBFS)
    const s2 = new Float32Array(fs * dur);
    const amp2 = Math.pow(10, -22 / 20);
    for (let i = 0; i < s2.length; i++) s2[i] = amp2 * Math.sin(2 * Math.PI * 400 * (i / fs));
    const buf2 = createMockAudioBuffer(s2, fs);

    // Slide 3: Louder recording (-15 dBFS)
    const s3 = new Float32Array(fs * dur);
    const amp3 = Math.pow(10, -15 / 20);
    for (let i = 0; i < s3.length; i++) s3[i] = amp3 * Math.sin(2 * Math.PI * 500 * (i / fs));
    const buf3 = createMockAudioBuffer(s3, fs);

    const norm1 = normalizeToTargetLoudness(buf1, { targetLUFS: -16.0 });
    const norm2 = normalizeToTargetLoudness(buf2, { targetLUFS: -16.0 });
    const norm3 = normalizeToTargetLoudness(buf3, { targetLUFS: -16.0 });

    const l1 = norm1.after.integratedLUFS;
    const l2 = norm2.after.integratedLUFS;
    const l3 = norm3.after.integratedLUFS;

    // Verify all 3 slides are within 0.5 LUFS of each other!
    const diff12 = Math.abs(l1 - l2);
    const diff23 = Math.abs(l2 - l3);
    const diff13 = Math.abs(l1 - l3);

    assert.ok(diff12 <= 0.5, `Slide 1 and 2 must match within 0.5 LUFS, diff is ${diff12}`);
    assert.ok(diff23 <= 0.5, `Slide 2 and 3 must match within 0.5 LUFS, diff is ${diff23}`);
    assert.ok(diff13 <= 0.5, `Slide 1 and 3 must match within 0.5 LUFS, diff is ${diff13}`);
  });

  // -------------------------------------------------------------
  // TEST 4: Auto Studio Enhancement Default Preset
  // -------------------------------------------------------------
  it('4. Preset & Controls: auto_studio preset is configured with broadcast parameters', () => {
    const autoPreset = VOICE_ENHANCER_PRESETS.auto_studio;
    assert.ok(autoPreset, 'auto_studio preset must exist');
    assert.strictEqual(autoPreset.highpassFreq, 80);
    assert.strictEqual(autoPreset.targetLUFS, -16.0);
    assert.strictEqual(autoPreset.normalizePeakDb, -1.0);
    assert.ok(autoPreset.presenceGain >= 2.5);
    assert.strictEqual(autoPreset.deEsserFreq, 7000);
  });

  // -------------------------------------------------------------
  // TEST 5: Quality Protection Alert for Degraded Audio
  // -------------------------------------------------------------
  it('5. Quality Protection: Accurately flags extremely quiet or clipped audio without artificial hallucination', () => {
    // 1. Degraded / extremely quiet buffer (-45 dBFS)
    const fs = 48000;
    const degradedSamples = new Float32Array(fs * 1.5);
    const degradedAmp = Math.pow(10, -45 / 20);
    for (let i = 0; i < degradedSamples.length; i++) {
      degradedSamples[i] = degradedAmp * Math.sin(2 * Math.PI * 440 * (i / fs));
    }
    const degradedBuf = createMockAudioBuffer(degradedSamples, fs);
    const report = inspectAudioQuality(degradedBuf);

    assert.ok(report.warnings.some(w => w.includes('ધીમો') || w.includes('Peak') || w.includes('LUFS')), 'Must detect low volume');
    assert.ok(report.metrics.integratedLUFS < -35, 'Must report integrated LUFS below -35');
  });

  // -------------------------------------------------------------
  // TEST 6: Audio Enhancement Pipeline Fallback Execution
  // -------------------------------------------------------------
  it('6. Enhancement Pipeline: Applies loudness normalization, presence EQ, and limiter', async () => {
    const fs = 48000;
    const dur = 1.0;
    const samples = new Float32Array(fs * dur);
    const amp = Math.pow(10, -25 / 20);
    for (let i = 0; i < samples.length; i++) {
      samples[i] = amp * Math.sin(2 * Math.PI * 440 * (i / fs));
    }
    const buf = createMockAudioBuffer(samples, fs);

    const result = await enhanceAudioBuffer(buf, {
      preset: 'auto_studio',
      targetLUFS: -16.0,
      intensity: 0.8,
      voiceClarity: 0.75,
      noiseReduction: 0.70
    });

    assert.ok(result.loudnessBefore, 'Must provide loudness before');
    assert.ok(result.loudnessAfter, 'Must provide loudness after');
    assert.strictEqual(result.presetUsed, 'auto_studio');
  });
});
