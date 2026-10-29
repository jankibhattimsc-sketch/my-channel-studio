/**
 * Live Audio Recorder & Web Audio DSP Enhancer
 * - Noise Removal (Highpass, Notch Hum Filter, Noise Filter)
 * - Vocal Presence & Speech Clarity Boost (3.4kHz Peaking EQ + Studio Compressor)
 * - Pitch Tuning (-6 to +6 Semitones)
 * - Volume Gain Booster
 * - Client-side Pure PCM 16-bit WAV Export
 */

export function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let interleaved;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    interleaved = new Float32Array(left.length + right.length);
    for (let src = 0, dst = 0; src < left.length; src++) {
      interleaved[dst++] = left[src];
      interleaved[dst++] = right[src];
    }
  } else {
    interleaved = buffer.getChannelData(0);
  }

  const dataLength = interleaved.length * (bitDepth / 8);
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  function writeString(v, offset, str) {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < interleaved.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

export async function enhanceAudioBuffer(originalBuffer, options = {}) {
  const {
    noiseRemoval = true,
    clarityBoost = true,
    pitchSemitones = 0,
    volume = 1.2
  } = options;

  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtxClass) {
    throw new Error('Web Audio API is not supported in this browser.');
  }

  const rate = Math.pow(2, pitchSemitones / 12);
  const sampleRate = originalBuffer.sampleRate;
  const numChannels = originalBuffer.numberOfChannels;
  const targetLength = Math.max(1, Math.ceil(originalBuffer.length / rate));
  const targetDuration = targetLength / sampleRate;

  const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
    numChannels,
    targetLength,
    sampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = originalBuffer;
  source.playbackRate.value = rate;

  let lastNode = source;

  // 1. Noise Removal (Rumble Cut + Line Hum Filter + Hiss Cut)
  if (noiseRemoval) {
    // Cut deep sub-rumble, fan noise and desk vibrations below 85Hz
    const highpass = offlineCtx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 85;
    highpass.Q.value = 0.7;

    // Notch filter 50Hz/60Hz electrical buzz
    const notch50 = offlineCtx.createBiquadFilter();
    notch50.type = 'notch';
    notch50.frequency.value = 50;
    notch50.Q.value = 6;

    const notch60 = offlineCtx.createBiquadFilter();
    notch60.type = 'notch';
    notch60.frequency.value = 60;
    notch60.Q.value = 6;

    // Lowpass filter 12.5kHz to remove mic hiss/white noise
    const lowpass = offlineCtx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 12500;
    lowpass.Q.value = 0.7;

    lastNode.connect(highpass);
    highpass.connect(notch50);
    notch50.connect(notch60);
    notch60.connect(lowpass);
    lastNode = lowpass;
  }

  // 2. Speech Clarity & Vocal Presence Boost
  if (clarityBoost) {
    // 3400Hz Peaking EQ boosts Gujarati speech intelligibility
    const presenceFilter = offlineCtx.createBiquadFilter();
    presenceFilter.type = 'peaking';
    presenceFilter.frequency.value = 3400;
    presenceFilter.Q.value = 1.1;
    presenceFilter.gain.value = 4.5; // +4.5dB presence

    // Studio broadcast compressor for consistent vocal volume
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -22;
    compressor.knee.value = 10;
    compressor.ratio.value = 3.5;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.2;

    lastNode.connect(presenceFilter);
    presenceFilter.connect(compressor);
    lastNode = compressor;
  }

  // 3. Volume Master Gain Node
  const gainNode = offlineCtx.createGain();
  gainNode.gain.value = Math.max(0.2, Math.min(3.0, volume));
  lastNode.connect(gainNode);
  gainNode.connect(offlineCtx.destination);

  source.start(0);

  const renderedBuffer = await offlineCtx.startRendering();
  const wavBlob = audioBufferToWav(renderedBuffer);
  const wavUrl = URL.createObjectURL(wavBlob);

  return {
    buffer: renderedBuffer,
    blob: wavBlob,
    url: wavUrl,
    duration: targetDuration
  };
}

export class LiveAudioRecorder {
  constructor() {
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.audioContext = null;
    this.analyser = null;
    this.isRecording = false;
    this.startTime = 0;
    this.timerInterval = null;
    this.animFrame = null;
  }

  async start(options = {}) {
    const { onLevel, onTick } = options;
    if (this.isRecording) return;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
    if (AudioCtxClass) {
      this.audioContext = new AudioCtxClass();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!this.isRecording) return;
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        if (typeof onLevel === 'function') onLevel(normalized);
        this.animFrame = requestAnimationFrame(updateLevel);
      };
      this.animFrame = requestAnimationFrame(updateLevel);
    }

    let mimeType = 'audio/webm';
    if (!MediaRecorder.isTypeSupported('audio/webm')) {
      if (MediaRecorder.isTypeSupported('audio/ogg')) mimeType = 'audio/ogg';
      else if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
      else mimeType = '';
    }

    this.audioChunks = [];
    this.mediaRecorder = mimeType ? new MediaRecorder(this.stream, { mimeType }) : new MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.audioChunks.push(e.data);
      }
    };

    this.mediaRecorder.start(100);
    this.isRecording = true;
    this.startTime = Date.now();

    if (typeof onTick === 'function') {
      this.timerInterval = setInterval(() => {
        if (!this.isRecording) return;
        const elapsedSec = Math.floor((Date.now() - this.startTime) / 1000);
        const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const secs = String(elapsedSec % 60).padStart(2, '0');
        onTick(`${mins}:${secs}`, elapsedSec);
      }, 250);
    }
  }

  async stop() {
    if (!this.isRecording && !this.mediaRecorder) return null;

    return new Promise((resolve) => {
      this.mediaRecorder.onstop = async () => {
        clearInterval(this.timerInterval);
        if (this.animFrame) cancelAnimationFrame(this.animFrame);

        if (this.stream) {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }

        const mime = (this.audioChunks[0] && this.audioChunks[0].type) || 'audio/webm';
        const rawBlob = new Blob(this.audioChunks, { type: mime });
        const rawUrl = URL.createObjectURL(rawBlob);

        // Decode into Web Audio AudioBuffer for DSP enhancement
        let audioBuffer = null;
        try {
          const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
          if (AudioCtxClass) {
            const ctx = new AudioCtxClass();
            const arrayBuffer = await rawBlob.arrayBuffer();
            audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            ctx.close();
          }
        } catch (decodeErr) {
          console.warn('[Audio Decode Warning]:', decodeErr);
        }

        this.isRecording = false;
        resolve({
          blob: rawBlob,
          url: rawUrl,
          buffer: audioBuffer,
          duration: audioBuffer ? audioBuffer.duration : 0
        });
      };

      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      } else {
        this.isRecording = false;
        resolve(null);
      }
    });
  }
}
