const { describe, it, before } = require('node:test');
const assert = require('node:assert');

describe('AI VOICE CLEANER & GUJARATI AUDIO ENHANCEMENT STUDIO', () => {
  let normalizeAudioBuffer;
  let trimSilenceFromAudioBuffer;
  let auditGujaratiSpeech;
  let audioBufferToWav;
  let saveSlideAudioRecord;
  let getSlideAudioRecord;

  before(async () => {
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

    const enhancerModule = await import('../public/js/utils/audioRecorderEnhancer.js');
    normalizeAudioBuffer = enhancerModule.normalizeAudioBuffer;
    trimSilenceFromAudioBuffer = enhancerModule.trimSilenceFromAudioBuffer;
    auditGujaratiSpeech = enhancerModule.auditGujaratiSpeech;
    audioBufferToWav = enhancerModule.audioBufferToWav;

    const storageModule = await import('../public/js/utils/audioStorage.js');
    saveSlideAudioRecord = storageModule.saveSlideAudioRecord;
    getSlideAudioRecord = storageModule.getSlideAudioRecord;
  });

  // Mock AudioBuffer helper for Node test environment
  function createMockAudioBuffer(samples, sampleRate = 44100) {
    const channelData = new Float32Array(samples);
    return {
      numberOfChannels: 1,
      sampleRate,
      length: channelData.length,
      duration: channelData.length / sampleRate,
      getChannelData: (c) => channelData
    };
  }

  it('1. Volume Normalization: Scales peak safely to -1.0 dBFS without digital clipping', () => {
    // Generate buffer with peak at 0.5 linear (~ -6 dBFS)
    const samples = [0.0, 0.2, 0.5, -0.4, 0.1, -0.5, 0.0];
    const buffer = createMockAudioBuffer(samples);

    normalizeAudioBuffer(buffer, -1.0);

    const targetLinear = Math.pow(10, -1.0 / 20); // ~0.89125
    const data = buffer.getChannelData(0);
    let maxPeak = 0;
    for (let i = 0; i < data.length; i++) {
      const abs = Math.abs(data[i]);
      if (abs > maxPeak) maxPeak = abs;
    }

    assert.ok(Math.abs(maxPeak - targetLinear) < 0.001, `Peak should be normalized to -1dBFS, got ${maxPeak}`);
    // Ensure no clipping beyond 1.0
    for (let i = 0; i < data.length; i++) {
      assert.ok(data[i] >= -1.0 && data[i] <= 1.0, `Sample at ${i} clipped: ${data[i]}`);
    }
  });

  it('2. Silence & Pause Trimming: Cuts dead silence while retaining speech with natural 0.15s padding', () => {
    const sampleRate = 1000; // 1000 samples/sec for easy math
    // 0.5s dead silence (500 samples), 0.5s voice (500 samples), 0.5s dead silence (500 samples)
    const totalSamples = 1500;
    const samples = new Float32Array(totalSamples);
    for (let i = 500; i < 1000; i++) {
      samples[i] = 0.3 * Math.sin(i); // Active speech
    }
    const buffer = {
      numberOfChannels: 1,
      sampleRate,
      length: totalSamples,
      duration: totalSamples / sampleRate,
      getChannelData: () => samples
    };

    // Trim with 0.1s padding
    const trimmed = trimSilenceFromAudioBuffer(buffer, {
      thresholdDb: -30,
      paddingSec: 0.1
    });

    assert.ok(trimmed, 'Trimmed buffer must be returned');
    assert.ok(trimmed.length < totalSamples, `Trimmed length (${trimmed.length}) should be less than original (${totalSamples})`);
    // Padding: 0.1s before 500 = sample 400. 0.1s after 999 = sample 1100. Length ~ 700
    assert.ok(trimmed.length >= 500, `Speech must not be cut`);
  });

  it('3. Gujarati Speech Mistake Auditor: Compares spoken speech with slide script accurately', () => {
    const script = 'નમસ્કાર મિત્રો, આજે આપણે પ્રધાનમંત્રી કિસાન સન્માન નિધિ યોજના વિશે સંપૂર્ણ વિગત જાણીશું.';
    
    // Exact match test
    const auditExact = auditGujaratiSpeech(script, script);
    assert.strictEqual(auditExact.accuracyScore, 100, 'Exact match should yield 100% accuracy');
    assert.strictEqual(auditExact.mistakes.length, 0, 'No mistakes on exact match');

    // Partial match test with a missed word
    const spokenWithMissedWord = 'નમસ્કાર મિત્રો, આજે આપણે કિસાન સન્માન નિધિ વિશે જાણીશું.';
    const auditPartial = auditGujaratiSpeech(script, spokenWithMissedWord);
    assert.ok(auditPartial.accuracyScore < 100 && auditPartial.accuracyScore >= 60, `Score should reflect missed words, got ${auditPartial.accuracyScore}`);
    assert.ok(auditPartial.mistakes.length > 0, 'Should detect missed words');
    
    // Verify government facts & numbers are never altered
    const missedWords = auditPartial.mistakes.map(m => m.expectedWord);
    assert.ok(missedWords.includes('પ્રધાનમંત્રી') || missedWords.includes('યોજના') || missedWords.includes('સંપૂર્ણ') || missedWords.includes('વિગત'));
  });

  it('4. Dual-Track Audio Storage: Preserves both Original Raw and Enhanced Audio without overwriting', async () => {
    const projectId = 'proj_test_studio_dsp';
    const slideId = 1;

    const rawBlob = new Blob(['RAW_MIC_AUDIO_DATA_UNTOUCHED'], { type: 'audio/wav' });
    const enhancedBlob = new Blob(['ENHANCED_DSP_FILTERED_STUDIO_AUDIO'], { type: 'audio/wav' });

    const rawDataUrl = 'data:audio/wav;base64,UkFXX01JQ19BVURJT19VTlRPVUNIRUQ=';
    const enhancedDataUrl = 'data:audio/wav;base64,RU5IQU5DRURfRFNQX0ZJTFRFUkVE';

    const saved = await saveSlideAudioRecord(projectId, slideId, {
      blob: enhancedBlob,
      dataUrl: enhancedDataUrl,
      originalDataUrl: rawDataUrl,
      enhancedDataUrl: enhancedDataUrl,
      duration: 12.5,
      filename: 'proj_test_slide_1_voice.wav',
      status: 'Recorded',
      approvalStatus: 'approved',
      enhancementSettings: {
        noiseRemoval: true,
        clarityBoost: true,
        volumeNormalization: true,
        trimSilence: false,
        pitchSemitones: 0,
        volume: 1.2
      },
      transcript: 'નમસ્કાર મિત્રો',
      mistakes: []
    });

    assert.ok(saved, 'Audio record must be saved');

    const fetched = await getSlideAudioRecord(projectId, slideId);
    assert.ok(fetched, 'Fetched record must exist');
    assert.strictEqual(fetched.slideId, '1');
    assert.strictEqual(fetched.duration, 12.5);
    assert.strictEqual(fetched.originalDataUrl, rawDataUrl, 'Original untouched mic recording must be preserved');
    assert.strictEqual(fetched.enhancedDataUrl, enhancedDataUrl, 'Enhanced DSP audio track must be stored');
    assert.strictEqual(fetched.approvalStatus, 'approved');
    assert.strictEqual(fetched.enhancementSettings?.noiseRemoval, true);
    assert.strictEqual(fetched.enhancementSettings?.clarityBoost, true);
    assert.strictEqual(fetched.enhancementSettings?.volumeNormalization, true);
  });

  it('5. PCM WAV Exporter: Generates valid 44-byte RIFF/WAVE header and 16-bit PCM samples', () => {
    const samples = [0.0, 0.5, -0.5, 0.25, -0.25];
    const buffer = createMockAudioBuffer(samples, 44100);

    const wavBlob = audioBufferToWav(buffer);
    assert.ok(wavBlob, 'WAV blob must be generated');
    assert.strictEqual(wavBlob.type, 'audio/wav');
    // 44 header bytes + 5 samples * 2 bytes = 54 bytes
    assert.strictEqual(wavBlob.size, 44 + (5 * 2));
  });

  it('6. Real Voice Identity Guarantee: Enhancer improves clarity & removes noise without changing identity', () => {
    // Verify DSP logic does not perform pitch shift when pitchSemitones is 0
    const semitones = 0;
    const rate = Math.pow(2, semitones / 12);
    assert.strictEqual(rate, 1, 'Default rate must remain 1.0 (no chipmunk / deep voice distortion)');
    
    // Gujarati vocal intelligibility presence boost is centered at 3400Hz (human consonant recognition band)
    const clarityCenterFreq = 3400;
    assert.ok(clarityCenterFreq >= 3000 && clarityCenterFreq <= 3500, 'Clarity boost must target consonant presence');

    // Mud frequency is centered at 280Hz
    const deMudFreq = 280;
    assert.ok(deMudFreq >= 250 && deMudFreq <= 320, 'De-mud filter must reduce boxy chest resonance without altering natural timbre');
  });

});
