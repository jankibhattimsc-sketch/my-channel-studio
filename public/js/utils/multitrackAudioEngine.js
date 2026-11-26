/**
 * Multi-Track Audio Engine & Timeline Workstation
 * Gyan Yatra AI Studio — Professional Audio Editing Studio
 * 
 * Features:
 * - 4 Dedicated Tracks: Original Voice, Enhanced Voice, Background Music (BGM), SFX
 * - Non-Destructive Audio Editing: Trim Start, Trim End, Split, Delete Range, Merge, Move, Fade In/Out
 * - Real-Time BGM Auto-Ducking (lowers BGM during speech)
 * - Canvas Waveform Rendering with Selection Range, Playhead Cursor, and Zoom (+/-)
 * - Undo / Redo History Stack
 * - OfflineAudioContext Multitrack Mixdown & 16-bit PCM WAV Export
 */

import { audioBufferToWav, normalizeAudioBuffer } from './audioRecorderEnhancer.js';

export class MultitrackAudioEngine {
  constructor(options = {}) {
    const { sampleRate = 48000 } = options;
    this.sampleRate = sampleRate;
    this.audioContext = null;

    this.tracks = [
      { id: 'track_orig', name: '૧. ઓરિજિનલ અવાજ (Original Voice)', color: '#38bdf8', muted: false, solo: false, volume: 1.0, clips: [] },
      { id: 'track_enh', name: '૨. એન્હાન્સ્ડ અવાજ (Enhanced Voice)', color: '#8b5cf6', muted: false, solo: false, volume: 1.0, clips: [] },
      { id: 'track_bgm', name: '૩. બેકગ્રાઉન્ડ મ્યુઝિક (Background Music)', color: '#10b981', muted: false, solo: false, volume: 0.12, ducking: true, clips: [] },
      { id: 'track_sfx', name: '૪. સાઉન્ડ ઇફેક્ટ્સ (SFX & Alerts)', color: '#f59e0b', muted: false, solo: false, volume: 0.8, clips: [] }
    ];

    this.currentTime = 0;
    this.isPlaying = false;
    this.playStartTime = 0;
    this.playbackNodes = [];
    this.animFrame = null;

    // Timeline View Controls
    this.pixelsPerSecond = 50; // Zoom level
    this.selectionRange = null; // { start, end }
    this.activeClipId = null;

    // Undo / Redo History Stack (Non-destructive)
    this.historyStack = [];
    this.redoStack = [];
    this.maxHistory = 30;

    // Background Music Auto-Ducking Settings
    this.duckingSettings = {
      enabled: true,
      normalVolume: 0.12,
      duckedVolume: 0.04,
      attackTime: 0.08,
      releaseTime: 0.35
    };
  }

  getAudioContext() {
    if (!this.audioContext) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioContext = new AudioCtxClass({ sampleRate: this.sampleRate });
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  saveSnapshot(actionName = 'Edit Timeline') {
    const snapshot = JSON.stringify({
      tracks: this.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c => ({
          id: c.id,
          trackId: c.trackId,
          slideId: c.slideId,
          slideNumber: c.slideNumber,
          startTime: c.startTime,
          duration: c.duration,
          offset: c.offset || 0,
          volume: c.volume,
          fadeIn: c.fadeIn,
          fadeOut: c.fadeOut,
          name: c.name,
          buffer: c.buffer
        }))
      })),
      duckingSettings: { ...this.duckingSettings }
    });

    this.historyStack.push({ actionName, snapshot });
    if (this.historyStack.length > this.maxHistory) {
      this.historyStack.shift();
    }
    this.redoStack = []; // Clear redo stack on new action
  }

  canUndo() {
    return this.historyStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  undo() {
    if (!this.canUndo()) return false;
    const currentSnapshot = JSON.stringify({
      tracks: this.tracks,
      duckingSettings: this.duckingSettings
    });
    this.redoStack.push({ actionName: 'Undo State', snapshot: currentSnapshot });

    const prev = this.historyStack.pop();
    if (prev) {
      this.restoreSnapshot(prev.snapshot);
      return true;
    }
    return false;
  }

  redo() {
    if (!this.canRedo()) return false;
    const next = this.redoStack.pop();
    if (next) {
      const currentSnapshot = JSON.stringify({
        tracks: this.tracks,
        duckingSettings: this.duckingSettings
      });
      this.historyStack.push({ actionName: 'Redo State', snapshot: currentSnapshot });
      this.restoreSnapshot(next.snapshot);
      return true;
    }
    return false;
  }

  restoreSnapshot(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.tracks)) {
        this.tracks.forEach((t, i) => {
          const match = data.tracks.find(dt => dt.id === t.id) || data.tracks[i];
          if (match) {
            t.volume = match.volume;
            t.muted = match.muted;
            t.solo = match.solo;
            t.clips = match.clips || [];
          }
        });
      }
      if (data.duckingSettings) {
        this.duckingSettings = { ...this.duckingSettings, ...data.duckingSettings };
      }
    } catch (e) {
      console.warn('Failed to restore multitrack snapshot:', e);
    }
  }

  getTotalDuration() {
    let max = 0;
    this.tracks.forEach(t => {
      t.clips.forEach(c => {
        const end = (c.startTime || 0) + (c.duration || 0);
        if (end > max) max = end;
      });
    });
    return max;
  }

  addClip(trackId, clipData) {
    this.saveSnapshot('Add Clip');
    const track = this.tracks.find(t => t.id === trackId);
    if (!track) return null;

    const clip = {
      id: clipData.id || `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      trackId,
      slideId: clipData.slideId || null,
      slideNumber: clipData.slideNumber || null,
      name: clipData.name || `Clip ${track.clips.length + 1}`,
      startTime: Number(clipData.startTime) || 0,
      duration: Number(clipData.duration) || (clipData.buffer ? clipData.buffer.duration : 0),
      offset: Number(clipData.offset) || 0,
      volume: clipData.volume !== undefined ? clipData.volume : 1.0,
      fadeIn: Number(clipData.fadeIn) || 0,
      fadeOut: Number(clipData.fadeOut) || 0,
      buffer: clipData.buffer || null,
      originalBuffer: clipData.originalBuffer || clipData.buffer || null,
      url: clipData.url || '',
      dataUrl: clipData.dataUrl || ''
    };

    track.clips.push(clip);
    track.clips.sort((a, b) => a.startTime - b.startTime);
    return clip;
  }

  removeClip(clipId) {
    this.saveSnapshot('Remove Clip');
    for (const track of this.tracks) {
      const idx = track.clips.findIndex(c => c.id === clipId);
      if (idx !== -1) {
        const removed = track.clips.splice(idx, 1)[0];
        return removed;
      }
    }
    return null;
  }

  getClip(clipId) {
    for (const track of this.tracks) {
      const c = track.clips.find(clip => clip.id === clipId);
      if (c) return c;
    }
    return null;
  }

  // Non-destructive Trim Start
  trimStart(clipId, trimSeconds) {
    const clip = this.getClip(clipId);
    if (!clip || trimSeconds <= 0 || trimSeconds >= clip.duration - 0.2) return false;
    this.saveSnapshot('Trim Start');

    clip.startTime += trimSeconds;
    clip.duration -= trimSeconds;
    clip.offset = (clip.offset || 0) + trimSeconds;
    return true;
  }
  trimClipStart(clipId, trimSeconds) {
    return this.trimStart(clipId, trimSeconds);
  }

  // Non-destructive Trim End
  trimEnd(clipId, trimFromEndSeconds) {
    const clip = this.getClip(clipId);
    if (!clip || trimFromEndSeconds <= 0 || trimFromEndSeconds >= clip.duration - 0.2) return false;
    this.saveSnapshot('Trim End');

    clip.duration -= trimFromEndSeconds;
    return true;
  }
  trimClipEnd(clipId, trimFromEndSeconds) {
    return this.trimEnd(clipId, trimFromEndSeconds);
  }

  getSpeechIntervals(includeTracks = ['track_orig', 'track_enh']) {
    const hasSolo = this.tracks.some(t => t.solo);
    const intervals = [];
    includeTracks.forEach(tid => {
      const t = this.tracks.find(track => track.id === tid);
      if (t && !t.muted && (!hasSolo || t.solo)) {
        t.clips.forEach(c => {
          intervals.push({ start: c.startTime, end: c.startTime + c.duration });
        });
      }
    });
    return intervals;
  }

  // Non-destructive Split at Playhead
  splitClip(clipId, splitTimeInTimeline) {
    const clip = this.getClip(clipId);
    if (!clip) return null;
    const relTime = splitTimeInTimeline - clip.startTime;
    if (relTime <= 0.2 || relTime >= clip.duration - 0.2) return null;

    this.saveSnapshot('Split Clip');
    const track = this.tracks.find(t => t.id === clip.trackId);

    const firstDuration = relTime;
    const secondDuration = clip.duration - relTime;

    clip.duration = firstDuration;

    const secondClip = {
      ...clip,
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${clip.name} (Part 2)`,
      startTime: splitTimeInTimeline,
      duration: secondDuration,
      offset: (clip.offset || 0) + firstDuration,
      fadeIn: 0.05,
      fadeOut: clip.fadeOut
    };

    clip.fadeOut = 0.05;
    track.clips.push(secondClip);
    track.clips.sort((a, b) => a.startTime - b.startTime);
    const result = [clip, secondClip];
    result.clipA = clip;
    result.clipB = secondClip;
    return result;
  }

  // Delete Selection Range across active track or all tracks
  deleteRange(trackIdOrStart = null, maybeStart = null, maybeEnd = null) {
    let trackId = null;
    let startTime = 0;
    let endTime = 0;

    if (typeof trackIdOrStart === 'number' && typeof maybeStart === 'number') {
      // Called as deleteRange(startTime, endTime)
      trackId = null;
      startTime = trackIdOrStart;
      endTime = maybeStart;
    } else {
      trackId = trackIdOrStart;
      startTime = Number(maybeStart) || 0;
      endTime = Number(maybeEnd) || 0;
    }

    if (startTime >= endTime) return false;
    this.saveSnapshot('Delete Range');

    const targetTracks = trackId ? this.tracks.filter(t => t.id === trackId) : this.tracks;

    targetTracks.forEach(track => {
      const newClips = [];
      track.clips.forEach(clip => {
        const clipEnd = clip.startTime + clip.duration;

        if (clipEnd <= startTime || clip.startTime >= endTime) {
          // Outside deletion range
          newClips.push(clip);
        } else if (clip.startTime >= startTime && clipEnd <= endTime) {
          // Fully inside deletion range - drop it
        } else if (clip.startTime < startTime && clipEnd > endTime) {
          // Range sits inside this clip - split into two
          const firstDur = startTime - clip.startTime;
          const secondStartOffset = (clip.offset || 0) + (endTime - clip.startTime);
          const secondDur = clipEnd - endTime;

          clip.duration = firstDur;
          newClips.push(clip);

          newClips.push({
            ...clip,
            id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            startTime: startTime,
            duration: secondDur,
            offset: secondStartOffset,
            fadeIn: 0.05
          });
        } else if (clip.startTime < startTime && clipEnd <= endTime) {
          // Truncate end
          clip.duration = startTime - clip.startTime;
          newClips.push(clip);
        } else if (clip.startTime >= startTime && clipEnd > endTime) {
          // Truncate start
          const cut = endTime - clip.startTime;
          clip.startTime = endTime;
          clip.duration -= cut;
          clip.offset = (clip.offset || 0) + cut;
          newClips.push(clip);
        }
      });
      track.clips = newClips.sort((a, b) => a.startTime - b.startTime);
    });

    return true;
  }

  // Move Clip to New Timeline Timestamp
  moveClip(clipId, newStartTime) {
    const clip = this.getClip(clipId);
    if (!clip || newStartTime < 0) return false;
    this.saveSnapshot('Move Clip');
    clip.startTime = Number(newStartTime.toFixed(2));
    const track = this.tracks.find(t => t.id === clip.trackId);
    if (track) track.clips.sort((a, b) => a.startTime - b.startTime);
    return true;
  }

  setClipVolume(clipId, volume) {
    const clip = this.getClip(clipId);
    if (!clip) return false;
    this.saveSnapshot('Adjust Volume');
    clip.volume = Math.max(0, Math.min(2.0, volume));
    return true;
  }

  setFade(clipId, fadeInSec = 0, fadeOutSec = 0) {
    const clip = this.getClip(clipId);
    if (!clip) return false;
    this.saveSnapshot('Adjust Fades');
    clip.fadeIn = Math.max(0, fadeInSec);
    clip.fadeOut = Math.max(0, fadeOutSec);
    return true;
  }

  // Set Background Music Track
  setBackgroundMusic(buffer, options = {}) {
    this.saveSnapshot('Set Background Music');
    const bgmTrack = this.tracks.find(t => t.id === 'track_bgm');
    if (!bgmTrack) return;

    bgmTrack.clips = [];
    const totalNarrationDur = this.getTotalDuration() || buffer.duration;

    // Loop BGM to cover full presentation duration if required
    let currentStart = 0;
    while (currentStart < totalNarrationDur) {
      const dur = Math.min(buffer.duration, totalNarrationDur - currentStart);
      bgmTrack.clips.push({
        id: `bgm_${Date.now()}_${bgmTrack.clips.length}`,
        trackId: 'track_bgm',
        name: options.name || 'Background Ambient Music',
        startTime: currentStart,
        duration: dur,
        offset: 0,
        volume: options.volume !== undefined ? options.volume : 0.12,
        fadeIn: currentStart === 0 ? 1.0 : 0,
        fadeOut: (currentStart + dur >= totalNarrationDur) ? 1.5 : 0,
        buffer,
        url: options.url || ''
      });
      currentStart += dur;
    }
  }

  // --- Real-time Playback with Automatic BGM Ducking ---
  async play(startAtTime = null) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.stop();
    this.isPlaying = true;
    this.currentTime = (startAtTime !== null) ? startAtTime : this.currentTime;
    const now = ctx.currentTime;
    this.playStartTime = now - this.currentTime;

    const hasSolo = this.tracks.some(t => t.solo);

    // Collect speech intervals for ducking: [{ start, end }]
    const speechIntervals = [];
    ['track_orig', 'track_enh'].forEach(tid => {
      const t = this.tracks.find(track => track.id === tid);
      if (t && !t.muted && (!hasSolo || t.solo)) {
        t.clips.forEach(c => {
          speechIntervals.push({ start: c.startTime, end: c.startTime + c.duration });
        });
      }
    });

    this.tracks.forEach(track => {
      if (track.muted || (hasSolo && !track.solo)) return;

      track.clips.forEach(clip => {
        if (!clip.buffer) return;
        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd <= this.currentTime) return;

        const offsetInClip = Math.max(0, this.currentTime - clip.startTime);
        const whenToStart = now + Math.max(0, clip.startTime - this.currentTime);
        const playDuration = clip.duration - offsetInClip;

        if (playDuration <= 0) return;

        const src = ctx.createBufferSource();
        src.buffer = clip.buffer;

        const gainNode = ctx.createGain();
        const baseVolume = (clip.volume !== undefined ? clip.volume : 1.0) * (track.volume !== undefined ? track.volume : 1.0);
        gainNode.gain.setValueAtTime(baseVolume, whenToStart);

        // Apply Fade In
        if (clip.fadeIn > 0 && offsetInClip < clip.fadeIn) {
          gainNode.gain.setValueAtTime(0.001, whenToStart);
          gainNode.gain.linearRampToValueAtTime(baseVolume, whenToStart + (clip.fadeIn - offsetInClip));
        }

        // Apply Fade Out
        if (clip.fadeOut > 0) {
          const fadeStart = whenToStart + playDuration - clip.fadeOut;
          if (fadeStart > whenToStart) {
            gainNode.gain.setValueAtTime(baseVolume, fadeStart);
            gainNode.gain.linearRampToValueAtTime(0.001, whenToStart + playDuration);
          }
        }

        // Apply Automatic BGM Ducking on Track 3
        if (track.id === 'track_bgm' && this.duckingSettings.enabled && speechIntervals.length > 0) {
          speechIntervals.forEach(interval => {
            const duckStart = now + Math.max(0, interval.start - this.currentTime);
            const duckEnd = now + Math.max(0, interval.end - this.currentTime);
            const duckedGain = this.duckingSettings.duckedVolume;

            if (duckEnd > whenToStart && duckStart < whenToStart + playDuration) {
              const safeDuckStart = Math.max(whenToStart, duckStart);
              const safeDuckEnd = Math.min(whenToStart + playDuration, duckEnd);
              gainNode.gain.setValueAtTime(baseVolume, safeDuckStart);
              gainNode.gain.linearRampToValueAtTime(duckedGain, safeDuckStart + this.duckingSettings.attackTime);
              gainNode.gain.setValueAtTime(duckedGain, safeDuckEnd);
              gainNode.gain.linearRampToValueAtTime(baseVolume, safeDuckEnd + this.duckingSettings.releaseTime);
            }
          });
        }

        src.connect(gainNode);
        gainNode.connect(ctx.destination);

        const actualBufferOffset = (clip.offset || 0) + offsetInClip;
        src.start(whenToStart, actualBufferOffset, playDuration);

        this.playbackNodes.push({ src, gain: gainNode });
      });
    });

    // Start UI Playhead ticker
    const totalDur = this.getTotalDuration();
    const tick = () => {
      if (!this.isPlaying) return;
      this.currentTime = ctx.currentTime - this.playStartTime;
      if (this.currentTime >= totalDur) {
        this.stop();
        this.currentTime = totalDur;
      } else {
        this.animFrame = requestAnimationFrame(tick);
      }
    };
    this.animFrame = requestAnimationFrame(tick);
  }

  pause() {
    this.stop();
  }

  stop() {
    this.isPlaying = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
    this.playbackNodes.forEach(({ src, gain }) => {
      try {
        src.stop();
        src.disconnect();
        gain.disconnect();
      } catch (_) { }
    });
    this.playbackNodes = [];
  }

  seekTo(seconds) {
    const wasPlaying = this.isPlaying;
    this.stop();
    this.currentTime = Math.max(0, Math.min(this.getTotalDuration(), seconds));
    if (wasPlaying) {
      this.play(this.currentTime);
    }
  }

  // --- Multitrack Offline Render & Export ---
  async renderMasterMixdown(options = {}) {
    const totalDuration = Math.max(1, this.getTotalDuration());
    const sampleRate = this.sampleRate;
    const numChannels = 2; // Stereo master
    const targetLength = Math.ceil(totalDuration * sampleRate);

    const offlineCtx = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(
      numChannels,
      targetLength,
      sampleRate
    );

    const hasSolo = this.tracks.some(t => t.solo);

    // Find speech intervals for ducking
    const speechIntervals = [];
    ['track_orig', 'track_enh'].forEach(tid => {
      const t = this.tracks.find(track => track.id === tid);
      if (t && !t.muted && (!hasSolo || t.solo)) {
        t.clips.forEach(c => {
          speechIntervals.push({ start: c.startTime, end: c.startTime + c.duration });
        });
      }
    });

    this.tracks.forEach(track => {
      if (track.muted || (hasSolo && !track.solo)) return;

      track.clips.forEach(clip => {
        if (!clip.buffer) return;
        const src = offlineCtx.createBufferSource();
        src.buffer = clip.buffer;

        const gainNode = offlineCtx.createGain();
        const baseVolume = (clip.volume !== undefined ? clip.volume : 1.0) * (track.volume !== undefined ? track.volume : 1.0);
        gainNode.gain.setValueAtTime(baseVolume, clip.startTime);

        // Fades
        if (clip.fadeIn > 0) {
          gainNode.gain.setValueAtTime(0.001, clip.startTime);
          gainNode.gain.linearRampToValueAtTime(baseVolume, clip.startTime + clip.fadeIn);
        }
        if (clip.fadeOut > 0) {
          const fadeStart = clip.startTime + clip.duration - clip.fadeOut;
          gainNode.gain.setValueAtTime(baseVolume, fadeStart);
          gainNode.gain.linearRampToValueAtTime(0.001, clip.startTime + clip.duration);
        }

        // BGM Ducking
        if (track.id === 'track_bgm' && this.duckingSettings.enabled && speechIntervals.length > 0) {
          speechIntervals.forEach(interval => {
            const duckStart = interval.start;
            const duckEnd = interval.end;
            const duckedGain = this.duckingSettings.duckedVolume;
            if (duckEnd > clip.startTime && duckStart < clip.startTime + clip.duration) {
              const safeStart = Math.max(clip.startTime, duckStart);
              const safeEnd = Math.min(clip.startTime + clip.duration, duckEnd);
              gainNode.gain.setValueAtTime(baseVolume, safeStart);
              gainNode.gain.linearRampToValueAtTime(duckedGain, safeStart + this.duckingSettings.attackTime);
              gainNode.gain.setValueAtTime(duckedGain, safeEnd);
              gainNode.gain.linearRampToValueAtTime(baseVolume, safeEnd + this.duckingSettings.releaseTime);
            }
          });
        }

        src.connect(gainNode);
        gainNode.connect(offlineCtx.destination);
        src.start(clip.startTime, clip.offset || 0, clip.duration);
      });
    });

    let renderedBuffer = await offlineCtx.startRendering();

    if (options.normalize !== false) {
      renderedBuffer = normalizeAudioBuffer(renderedBuffer, -1.0);
    }

    const wavBlob = audioBufferToWav(renderedBuffer);
    const wavUrl = URL.createObjectURL(wavBlob);

    return {
      buffer: renderedBuffer,
      blob: wavBlob,
      url: wavUrl,
      duration: renderedBuffer.duration
    };
  }

  // --- Interactive Canvas Rendering ---
  renderToCanvas(canvas, options = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width || 800;
    const height = canvas.height || 240;
    const trackHeight = Math.floor(height / this.tracks.length);

    ctx.fillStyle = '#121212'; // Master dark workstation background
    ctx.fillRect(0, 0, width, height);

    const totalDur = Math.max(10, this.getTotalDuration());
    const pxPerSec = Math.max(10, (width - 120) / totalDur); // adaptive zoom

    // Time Ruler at top
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(120, 0, width - 120, 18);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '10px monospace';
    ctx.fillStyle = '#a78bfa';

    for (let s = 0; s <= totalDur; s += 2) {
      const x = 120 + s * pxPerSec;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, s % 10 === 0 ? 16 : 8);
      ctx.stroke();
      if (s % 10 === 0 && x < width - 30) {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        ctx.fillText(`${mins}:${secs < 10 ? '0' : ''}${secs}`, x + 3, 12);
      }
    }

    // Render 4 Tracks
    this.tracks.forEach((track, tIdx) => {
      const y = 20 + tIdx * trackHeight;
      const tH = trackHeight - 4;

      // Track header on left (120px)
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, y, 120, tH);
      ctx.strokeStyle = '#27272a';
      ctx.strokeRect(0, y, 120, tH);

      ctx.fillStyle = track.color;
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(track.name.slice(0, 14), 6, y + 16);

      ctx.fillStyle = '#71717a';
      ctx.font = '9px monospace';
      ctx.fillText(`${(track.volume * 100).toFixed(0)}% • ${track.clips.length} clips`, 6, y + 30);

      // Track lane
      ctx.fillStyle = (tIdx % 2 === 0) ? '#141416' : '#111113';
      ctx.fillRect(120, y, width - 120, tH);
      ctx.strokeStyle = '#27272a';
      ctx.strokeRect(120, y, width - 120, tH);

      // Render clips in lane
      track.clips.forEach(clip => {
        const clipX = 120 + clip.startTime * pxPerSec;
        const clipW = Math.max(4, clip.duration * pxPerSec);

        // Clip block
        ctx.fillStyle = clip.id === this.activeClipId ? '#a855f7' : track.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(clipX, y + 2, clipW, tH - 4, 4) : ctx.rect(clipX, y + 2, clipW, tH - 4);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Clip label
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        const label = `${clip.name || 'Clip'} (${clip.duration.toFixed(1)}s)`;
        if (clipW > 40) {
          ctx.fillText(label.slice(0, Math.floor(clipW / 7)), clipX + 4, y + 14);
        }

        // Draw waveform inside clip if buffer present
        if (clip.buffer && clipW > 20) {
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 1;
          const raw = clip.buffer.getChannelData(0);
          const step = Math.ceil(raw.length / clipW);
          const midClipY = y + tH / 2;

          ctx.beginPath();
          for (let px = 0; px < clipW; px++) {
            const sampleIdx = Math.floor(px * step);
            const val = raw[sampleIdx] || 0;
            const hVal = val * (tH / 3);
            ctx.moveTo(clipX + px, midClipY - hVal);
            ctx.lineTo(clipX + px, midClipY + hVal);
          }
          ctx.stroke();
        }
      });
    });

    // Playhead Line
    const playheadX = 120 + this.currentTime * pxPerSec;
    if (playheadX <= width) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();

      // Playhead top cap
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(playheadX - 6, 0);
      ctx.lineTo(playheadX + 6, 0);
      ctx.lineTo(playheadX, 10);
      ctx.closePath();
      ctx.fill();
    }
  }
}
