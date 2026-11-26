/**
 * Audio Stitcher & Master Voiceover Engine
 * 
 * Features:
 * 1. Takes slide-wise audio recordings in exact sequence (Slide 1..N)
 * 2. Trims leading/trailing silence with natural speech padding
 * 3. Normalizes volume across all slides to a uniform -1.0 dBFS target
 * 4. Inserts smooth, natural cross-slide pauses (0.25s) without clipping
 * 5. Generates a seamless, single-track Master Voiceover WAV blob
 * 6. Slide-by-slide readiness and error auditing
 */

import {
  audioBufferToWav,
  normalizeAudioBuffer,
  trimSilenceFromAudioBuffer,
  normalizeToTargetLoudness,
  measureAudioLoudness
} from './audioRecorderEnhancer.js';

/**
 * Audit slides readiness before final export
 */
export function auditSlideAudioReadiness(slides = [], slideAudioState = {}) {
  const auditList = [];
  let recordedCount = 0;
  let totalWords = 0;
  let totalDurationSec = 0;
  const issues = [];

  slides.forEach((sl, idx) => {
    const sNum = sl.slideNumber || (idx + 1);
    const audioRec = slideAudioState[sNum] || (sl.audioUrl ? { status: 'Recorded', url: sl.audioUrl, duration: sl.recordingDuration || 0 } : null);
    const hasAudio = Boolean(audioRec && (audioRec.url || audioRec.blob));
    const duration = (audioRec && audioRec.duration) || sl.recordingDuration || 0;
    const script = (sl.scriptText || '').trim();
    const words = script ? script.split(/\s+/).filter(Boolean).length : 0;
    totalWords += words;

    let status = 'Ready';
    if (!hasAudio) {
      status = 'Missing Audio';
      issues.push(`સ્લાઇડ #${sNum}: ઓડિયો રેકોર્ડિંગ બાકી છે.`);
    } else if (duration <= 0.5) {
      status = 'Too Short';
      issues.push(`સ્લાઇડ #${sNum}: ઓડિયો ઘણો ટૂંકો છે (${duration.toFixed(1)}s).`);
    }

    if (!script) {
      issues.push(`સ્લાઇડ #${sNum}: સ્ક્રિપ્ટ લખાણ ખાલી છે.`);
    }

    if (hasAudio) {
      recordedCount++;
      totalDurationSec += duration;
    }

    auditList.push({
      slideNumber: sNum,
      title: sl.title || `સ્લાઇડ #${sNum}`,
      scriptPreview: script ? (script.length > 80 ? script.slice(0, 80) + '...' : script) : '—',
      words,
      hasAudio,
      duration,
      status,
      audioUrl: audioRec?.url || ''
    });
  });

  const isAllReady = slides.length > 0 && recordedCount === slides.length && issues.length === 0;

  const mins = Math.floor(totalDurationSec / 60);
  const secs = Math.round(totalDurationSec % 60);
  const formattedDuration = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

  return {
    totalSlides: slides.length,
    recordedCount,
    missingCount: slides.length - recordedCount,
    isAllReady,
    totalWords,
    totalDurationSec,
    formattedDuration,
    auditList,
    issues
  };
}

/**
 * Stitches an array of AudioBuffers into one continuous Master AudioBuffer
 * with volume normalization and natural smooth pauses between slides.
 */
export async function stitchAudioBuffers(slideBuffersWithMetadata, options = {}) {
  const {
    pauseBetweenSlidesSec = 0.25,
    targetPeakDb = -1.0,
    preserveOriginalSound = true
  } = options;

  if (!Array.isArray(slideBuffersWithMetadata) || slideBuffersWithMetadata.length === 0) {
    throw new Error('જોડવા માટે કોઈ ઓડિયો બફર મળ્યા નથી (No audio buffers provided).');
  }

  const AudioCtxClass = (typeof window !== 'undefined') ? (window.AudioContext || window.webkitAudioContext) : null;
  if (!AudioCtxClass) {
    throw new Error('Web Audio API આ બ્રાઉઝરમાં સપોર્ટેડ નથી.');
  }

  const ctx = new AudioCtxClass();

  // 1. Clean, trim silence and normalize each slide audio with intelligent loudness matching
  const processedBuffers = [];
  const slideTimestamps = [];
  let currentPlaybackSec = 0;
  const targetLUFS = options.targetLUFS ?? -16.0;

  for (let i = 0; i < slideBuffersWithMetadata.length; i++) {
    const item = slideBuffersWithMetadata[i];
    let buf = item.audioBuffer;
    const sNum = item.slideNumber || (i + 1);

    if (!buf) continue;

    // 1. Dead silence & mic room noise trimming at slide boundaries (guarantees velvety studio silence between slides)
    if (options.trimSilence !== false) {
      try {
        buf = trimSilenceFromAudioBuffer(buf, {
          thresholdDb: options.trimThresholdDb || -48,
          paddingSec: options.trimPadSec || 0.18
        });
      } catch (_) {}
    }

    // Inter-slide intelligent loudness normalization: balances volume across all slides to uniform LUFS
    if (options.balanceSlideLoudness !== false) {
      const norm = normalizeToTargetLoudness(buf, { targetLUFS, targetPeakDb });
      buf = norm.buffer;
    } else if (!preserveOriginalSound) {
      // Gentle silence trimming
      buf = trimSilenceFromAudioBuffer(buf, { threshold: 0.015, minSpeechDurationSec: 0.2, padSec: 0.15 });
      buf = normalizeAudioBuffer(buf, targetPeakDb);
    }

    const dur = buf.duration;
    const startTime = currentPlaybackSec;
    const endTime = startTime + dur;

    slideTimestamps.push({
      slideNumber: sNum,
      startTime,
      endTime,
      duration: dur
    });

    processedBuffers.push(buf);
    currentPlaybackSec = endTime + pauseBetweenSlidesSec;
  }

  if (processedBuffers.length === 0) {
    try { ctx.close(); } catch(_) {}
    throw new Error('પ્રક્રિયા કરવા યોગ્ય કોઈ ઓડિયો ડેટા નથી.');
  }

  // 2. High-Fidelity Match: preserve exact input sample rate (e.g. 48000Hz or 44100Hz)
  // This completely eliminates any pitch shift or playback tempo distortion!
  const effectiveSampleRate = options.sampleRate || processedBuffers[0]?.sampleRate || ctx.sampleRate || 48000;
  const pauseSamples = Math.round(pauseBetweenSlidesSec * effectiveSampleRate);
  let totalSamples = 0;
  for (let i = 0; i < processedBuffers.length; i++) {
    totalSamples += processedBuffers[i].length;
    if (i < processedBuffers.length - 1) {
      totalSamples += pauseSamples;
    }
  }

  // 3. Create master output buffer (Stereo) with matched sample rate
  const masterBuffer = ctx.createBuffer(2, totalSamples, effectiveSampleRate);
  const leftOut = masterBuffer.getChannelData(0);
  const rightOut = masterBuffer.getChannelData(1);

  let currentOffset = 0;
  for (let bIdx = 0; bIdx < processedBuffers.length; bIdx++) {
    const buf = processedBuffers[bIdx];
    const leftIn = buf.getChannelData(0);
    const rightIn = buf.numberOfChannels > 1 ? buf.getChannelData(1) : leftIn;

    // Apply subtle 5ms micro-fade at buffer edges to eliminate digital clicks/pops at slide boundaries
    const fadeSamples = Math.min(256, Math.floor(buf.length / 4));
    for (let s = 0; s < buf.length; s++) {
      let gain = 1.0;
      if (s < fadeSamples) {
        gain = s / fadeSamples;
      } else if (s > buf.length - fadeSamples) {
        gain = Math.max(0, (buf.length - s) / fadeSamples);
      }
      leftOut[currentOffset + s] = (leftIn[s] || 0) * gain;
      rightOut[currentOffset + s] = (rightIn[s] || 0) * gain;
    }
    currentOffset += buf.length;

    // Insert natural silence pause
    if (bIdx < processedBuffers.length - 1) {
      for (let p = 0; p < pauseSamples; p++) {
        leftOut[currentOffset + p] = 0;
        rightOut[currentOffset + p] = 0;
      }
      currentOffset += pauseSamples;
    }
  }

  try { ctx.close(); } catch(_) {}

  // Final Master Loudness Normalization to guarantee -16.0 LUFS and -1.0 dBTP
  const finalMasterNorm = normalizeToTargetLoudness(masterBuffer, { targetLUFS, targetPeakDb });
  const finalMasterBuffer = finalMasterNorm.buffer;

  // 4. Encode to 16-bit PCM WAV Blob
  const wavBlob = audioBufferToWav(finalMasterBuffer);
  const dataUrl = (typeof URL !== 'undefined' && URL.createObjectURL) ? URL.createObjectURL(wavBlob) : '';

  return {
    masterBuffer: finalMasterBuffer,
    wavBlob,
    dataUrl,
    stitchedUrl: dataUrl,
    url: dataUrl,
    totalDuration: finalMasterBuffer.duration,
    measuredLoudness: finalMasterNorm.after,
    slideTimestamps
  };
}

