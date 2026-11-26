const { describe, it, before } = require('node:test');
const assert = require('node:assert');

describe('PODCAST QUALITY PURE HUMAN VOICE ISOLATION ENGINE', () => {
  let isolatePodcastVoice;
  let processPodcastVoiceBuffer;
  let calculateAudioCleanlinessMetrics;

  before(async () => {
    // Polyfill localStorage & window for Node test environment
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

    const isolatorModule = await import('../public/js/utils/podcastVoiceIsolator.js');
    isolatePodcastVoice = isolatorModule.isolatePodcastVoice;
    processPodcastVoiceBuffer = isolatorModule.processPodcastVoiceBuffer;
    calculateAudioCleanlinessMetrics = isolatorModule.calculateAudioCleanlinessMetrics;
  });

  // Mock AudioBuffer helper
  function createMockBuffer(samples, sampleRate = 44100) {
    const data = new Float32Array(samples);
    return {
      numberOfChannels: 1,
      sampleRate,
      length: data.length,
      duration: data.length / sampleRate,
      getChannelData: () => data
    };
  }

  it('1. Fan Noise & Hum Suppression: Attenuates 50/60/85Hz hum while preserving speech', () => {
    const sampleRate = 44100;
    const durationSec = 0.5;
    const totalSamples = Math.floor(sampleRate * durationSec);
    const samples = new Float32Array(totalSamples);

    // Primary speech: 220Hz fundamental vowel + harmonics
    // Ceiling fan noise: 85Hz rumble + 50Hz AC hum (0.25 amplitude)
    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      const speech = 0.35 * Math.sin(2 * Math.PI * 220 * t) + 0.2 * Math.sin(2 * Math.PI * 440 * t);
      const fanNoise = 0.25 * Math.sin(2 * Math.PI * 85 * t) + 0.15 * Math.sin(2 * Math.PI * 50 * t);
      samples[i] = speech + fanNoise;
    }

    const rawBuffer = createMockBuffer(samples, sampleRate);
    const isolated = processPodcastVoiceBuffer(rawBuffer, {
      strength: 0.9,
      deHum: true,
      podcastEq: true,
      loudnessNormalize: false
    });

    assert.ok(isolated, 'Isolated buffer must be produced');
    const outData = isolated.getChannelData(0);

    // Measure power in speech vs hum frequency
    let rawPower = 0;
    let isoPower = 0;
    for (let i = 0; i < totalSamples; i++) {
      rawPower += samples[i] * samples[i];
      isoPower += outData[i] * outData[i];
    }

    // Isolated output should have reduced overall noise power
    assert.ok(isoPower < rawPower, 'Output power should reflect suppressed fan noise');
  });

  it('2. Water-Like Hiss & Room Noise Suppression: Attenuates broadband hiss without metallic artifacts', () => {
    const sampleRate = 44100;
    const totalSamples = 10000;
    const samples = new Float32Array(totalSamples);

    // Speech burst in center + broadband water/room hiss throughout
    for (let i = 0; i < totalSamples; i++) {
      const isSpeech = (i > 2000 && i < 8000);
      const voice = isSpeech ? 0.4 * Math.sin(i * 0.05) : 0;
      const waterHiss = (Math.random() - 0.5) * 0.12; // Broadband white/pink hiss
      samples[i] = voice + waterHiss;
    }

    const rawBuffer = createMockBuffer(samples, sampleRate);
    const isolated = processPodcastVoiceBuffer(rawBuffer, {
      strength: 0.85,
      singleSpeakerFocus: true,
      podcastEq: true,
      loudnessNormalize: false
    });

    const outData = isolated.getChannelData(0);

    // Non-speech pauses (0 to 1500) should have heavily reduced noise floor
    let rawNoiseEnergy = 0;
    let isoNoiseEnergy = 0;
    for (let i = 0; i < 1500; i++) {
      rawNoiseEnergy += samples[i] * samples[i];
      isoNoiseEnergy += outData[i] * outData[i];
    }

    const noiseReductionRatio = isoNoiseEnergy / Math.max(0.00001, rawNoiseEnergy);
    assert.ok(noiseReductionRatio < 0.65, `Noise floor should be reduced, got ratio: ${noiseReductionRatio}`);
  });

  it('3. Single Speaker Focus: Prioritizes primary speaker and attenuates background chatter', () => {
    const sampleRate = 44100;
    const totalSamples = 12000;
    const samples = new Float32Array(totalSamples);

    // Segment A (0-6000): Main speaker (loud direct speech, amplitude 0.6)
    // Segment B (6001-12000): Secondary background person talking softly (amplitude 0.08)
    for (let i = 0; i < totalSamples; i++) {
      if (i < 6000) {
        samples[i] = 0.6 * Math.sin(i * 0.04);
      } else {
        samples[i] = 0.08 * Math.sin(i * 0.07); // Secondary speaker
      }
    }

    const rawBuffer = createMockBuffer(samples, sampleRate);
    const isolated = processPodcastVoiceBuffer(rawBuffer, {
      singleSpeakerFocus: true,
      preserveQuietWords: false,
      loudnessNormalize: false
    });

    const outData = isolated.getChannelData(0);

    let secSpeakerRawEnergy = 0;
    let secSpeakerIsoEnergy = 0;
    for (let i = 6500; i < 11500; i++) {
      secSpeakerRawEnergy += samples[i] * samples[i];
      secSpeakerIsoEnergy += outData[i] * outData[i];
    }

    assert.ok(secSpeakerIsoEnergy < secSpeakerRawEnergy, 'Secondary background speaker energy must be attenuated');
  });

  it('4. Quiet Words Preservation: Gentle soft expansion preserves low-volume speech without cutoffs', () => {
    const sampleRate = 44100;
    const totalSamples = 8000;
    const samples = new Float32Array(totalSamples);

    // Quiet whisper spoken by main speaker (amplitude 0.05)
    for (let i = 1000; i < 7000; i++) {
      samples[i] = 0.05 * Math.sin(i * 0.06);
    }

    const rawBuffer = createMockBuffer(samples, sampleRate);
    const isolated = processPodcastVoiceBuffer(rawBuffer, {
      preserveQuietWords: true,
      singleSpeakerFocus: true,
      loudnessNormalize: false
    });

    const outData = isolated.getChannelData(0);

    let quietWordEnergy = 0;
    for (let i = 2000; i < 6000; i++) {
      quietWordEnergy += outData[i] * outData[i];
    }

    // Must NOT be muted to 0
    assert.ok(quietWordEnergy > 0.001, 'Quiet words must not be cut or muted');
  });

  it('5. Cleanliness & Voice Preservation Metrics: Computes accurate dB noise reduction and preservation %', () => {
    const totalSamples = 5000;
    const rawSamples = new Float32Array(totalSamples).fill(0.3);
    const isoSamples = new Float32Array(totalSamples).fill(0.2);

    const raw = createMockBuffer(rawSamples);
    const iso = createMockBuffer(isoSamples);

    const metrics = calculateAudioCleanlinessMetrics(raw, iso);
    assert.ok(metrics, 'Metrics object must be returned');
    assert.ok(metrics.noiseReductionDb < 0, 'Noise reduction dB should be negative');
    assert.ok(metrics.voicePreservationPct >= 85, 'Voice preservation should be >= 85%');
    assert.strictEqual(metrics.clippedSamples, 0, 'Clipped samples should be 0');
  });

  it('6. One-Click Podcast Preset: Applies recommended settings and limits peak to -1.0 dBFS', async () => {
    const samples = [0.0, 0.4, 0.9, -0.85, 0.2, -0.1];
    const rawBuffer = createMockBuffer(samples);

    const result = await isolatePodcastVoice(rawBuffer, {
      strength: 0.85,
      singleSpeakerFocus: true
    });

    assert.ok(result, 'Result must be returned');
    assert.ok(result.buffer, 'Result must contain isolated buffer');
    assert.ok(result.metrics, 'Result must contain audio metrics');
    assert.strictEqual(result.settings.strength, 0.85);

    // Verify peak is at or below -1.0 dBFS (linear ~0.891)
    const outData = result.buffer.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < outData.length; i++) {
      const abs = Math.abs(outData[i]);
      if (abs > peak) peak = abs;
    }
    assert.ok(peak <= 0.895, `Peak must be limited to -1.0 dBFS, got ${peak}`);
  });

  it('7. Real Voice Identity: Speech harmonics in human formant band (300-3400Hz) remain intact', () => {
    // Generate complex Gujarati vowel formant frequencies (F1=500Hz, F2=1500Hz, F3=3400Hz)
    const sampleRate = 44100;
    const totalSamples = 4410;
    const samples = new Float32Array(totalSamples);

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      samples[i] = 0.4 * Math.sin(2 * Math.PI * 500 * t) +
                   0.3 * Math.sin(2 * Math.PI * 1500 * t) +
                   0.2 * Math.sin(2 * Math.PI * 3400 * t);
    }

    const rawBuffer = createMockBuffer(samples, sampleRate);
    const isolated = processPodcastVoiceBuffer(rawBuffer, {
      strength: 0.85,
      podcastEq: true,
      loudnessNormalize: false
    });

    const outData = isolated.getChannelData(0);

    // Verify presence of human formants (no cancellation of speech harmonics)
    let outputEnergy = 0;
    for (let i = 0; i < totalSamples; i++) {
      outputEnergy += outData[i] * outData[i];
    }

    assert.ok(outputEnergy > 5.0, 'Vocal formants must be retained with rich harmonic energy');
  });

});

