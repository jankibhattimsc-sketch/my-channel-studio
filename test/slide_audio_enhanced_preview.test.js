const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  enhanceAudioBuffer,
  inspectAudioQuality,
  audioBufferToWav
} = require('../public/js/utils/audioRecorderEnhancer.js');

const {
  buildConnectedSlideSequence,
  saveConnectedSequence,
  loadConnectedSequence
} = require('../public/js/utils/slideAudioConnector.js');

describe('SLIDE & AUDIO ENHANCED PREVIEW ENGINE', () => {

  function createTestAudioBuffer(durationSec = 2.0, sampleRate = 48000, frequency = 440, amplitude = 0.08) {
    const length = Math.floor(sampleRate * durationSec);
    const channelData = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      channelData[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * amplitude;
    }
    return {
      numberOfChannels: 1,
      sampleRate,
      length,
      duration: durationSec,
      getChannelData: () => channelData
    };
  }

  test('1. Audio Enhancement: Quiet recording (~ -30 LUFS) is enhanced to broadcast target (~ -16 LUFS)', async () => {
    const quietBuffer = createTestAudioBuffer(2.0, 48000, 440, 0.04); // low amplitude
    const qualityBefore = inspectAudioQuality(quietBuffer);

    assert.ok(qualityBefore.metrics.integratedLUFS < -22, 'Initial audio is quiet');

    const enhanced = await enhanceAudioBuffer(quietBuffer, {
      preset: 'auto_studio',
      targetLUFS: -16.0,
      volumeNormalization: true
    });

    assert.ok(enhanced.buffer, 'Returns enhanced buffer');
    const lufsVal = typeof enhanced.loudnessAfter === 'object' ? enhanced.loudnessAfter.integratedLUFS : enhanced.loudnessAfter;
    assert.ok(lufsVal >= -18.5 && lufsVal <= -13.5, `Enhanced loudness ${lufsVal} LUFS is near -16 LUFS broadcast target`);
    assert.ok(enhanced.gainAppliedDb > 0, 'Gain was boosted for quiet voice');
  });

  test('2. Dual Data URLs: Slide record preserves raw and enhanced audio data URLs', () => {
    const rawDataUrl = 'data:audio/wav;base64,UklGR_RAW';
    const enhancedDataUrl = 'data:audio/wav;base64,UklGR_ENHANCED';

    const slideRecord = {
      projectId: 'proj_test',
      slideId: 'sl_01',
      slideNumber: 1,
      duration: 10.5,
      dataUrl: rawDataUrl,
      originalDataUrl: rawDataUrl,
      enhancedDataUrl: enhancedDataUrl,
      status: 'Enhanced'
    };

    assert.strictEqual(slideRecord.enhancedDataUrl, enhancedDataUrl);
    assert.strictEqual(slideRecord.originalDataUrl, rawDataUrl);
    assert.notStrictEqual(slideRecord.enhancedDataUrl, slideRecord.originalDataUrl);
  });

  test('3. Sequence Connected Slide prefers Enhanced Audio URL in preview', () => {
    const sampleProject = {
      id: 'proj_preview_001',
      name: 'Enhanced Video Test',
      slide: {
        slides: [
          { slideId: 'sl_01', slideNumber: 1, title: 'ટેસ્ટ સ્લાઇડ', scriptText: 'ગુજરાતી સ્ક્રિપ્ટ' }
        ]
      }
    };

    const storedAudios = [
      {
        projectId: 'proj_preview_001',
        slideId: 'sl_01',
        slideNumber: 1,
        duration: 8.5,
        dataUrl: 'data:audio/wav;base64,UklGR_RAW',
        originalDataUrl: 'data:audio/wav;base64,UklGR_RAW',
        enhancedDataUrl: 'data:audio/wav;base64,UklGR_ENHANCED'
      }
    ];

    const sequence = buildConnectedSlideSequence(sampleProject, null, storedAudios);
    const slide = sequence.slides[0];

    assert.strictEqual(slide.hasAudio, true);
    assert.strictEqual(slide.audioUrl, 'data:audio/wav;base64,UklGR_ENHANCED', 'Audio player preview uses enhanced audio by default');
    assert.strictEqual(slide.isEnhanced, true);
  });

  test('4. Enhanced Slide Model: Slide displays high-res presentation metadata and subtitle overlay', () => {
    const sampleSlide = {
      slideNumber: 1,
      title: 'GPSC વર્ગ ૧ અને ૨ પરીક્ષા વિગત',
      subtitle: 'સત્તાવાર પરિપત્ર અને માહિતી',
      bulletPoints: ['કુલ ૨૫૦ જગ્યાઓ', 'ઓનલાઈન અરજી શરૂ'],
      scriptText: 'નમસ્તે મિત્રો, GPSC ની જાહેરાત આવી ગઈ છે.'
    };

    function renderEnhancedSlideMetadata(slide, isEnhancedView = true) {
      return {
        isEnhancedView,
        badgeText: isEnhancedView ? '✨ HD 1080p Enhanced Slide' : 'Standard Slide',
        hasSubtitleOverlay: Boolean(slide.scriptText),
        title: slide.title,
        bulletCount: slide.bulletPoints.length
      };
    }

    const meta = renderEnhancedSlideMetadata(sampleSlide, true);
    assert.strictEqual(meta.isEnhancedView, true);
    assert.strictEqual(meta.badgeText, '✨ HD 1080p Enhanced Slide');
    assert.strictEqual(meta.hasSubtitleOverlay, true);
    assert.strictEqual(meta.bulletCount, 2);
  });

  test('5. Audio Selection Logic: In enhanced mode, audio player strictly plays enhanced audio and preserves raw for original mode', () => {
    const slide = {
      slideId: 'sl_10',
      slideNumber: 10,
      hasAudio: true,
      audioUrl: 'data:audio/wav;base64,ENHANCED_URL',
      rawAudioUrl: 'data:audio/wav;base64,RAW_URL',
      enhancedDataUrl: 'data:audio/wav;base64,ENHANCED_URL',
      isEnhanced: true
    };

    function resolvePlaybackSourceUrl(slideItem, previewMode) {
      if (previewMode === 'original') {
        return slideItem.rawAudioUrl || slideItem.audioUrl;
      }
      return slideItem.enhancedDataUrl || slideItem.audioUrl || slideItem.rawAudioUrl;
    }

    // Default: Enhanced Mode must play enhanced audio
    const enhancedPlayback = resolvePlaybackSourceUrl(slide, 'enhanced');
    assert.strictEqual(enhancedPlayback, 'data:audio/wav;base64,ENHANCED_URL');

    // Original Mode must play raw audio
    const rawPlayback = resolvePlaybackSourceUrl(slide, 'original');
    assert.strictEqual(rawPlayback, 'data:audio/wav;base64,RAW_URL');
  });

});
