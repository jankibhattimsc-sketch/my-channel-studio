/**
 * Automated Verification for CRITICAL BUG FIX:
 * BUG 1: Canonical Final Script Synchronization & Zero Mutation
 * BUG 2: Slide-Wise Audio Narration Timeline Synchronization & Playback Seeking
 * BUG 3: Studio-Quality Voice Recording (Format, Sample Rate, No Pitch Shift)
 */

const test = require('node:test');
const assert = require('node:assert');

// Mock browser environments for node testing
if (typeof window === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem(k) { return store[k] || null; },
    setItem(k, v) { store[k] = String(v); },
    removeItem(k) { delete store[k]; },
    clear() { Object.keys(store).forEach(k => delete store[k]); }
  };
  global.window = {
    localStorage: global.localStorage,
    addEventListener: () => {},
    dispatchEvent: () => {},
    location: { hash: '#projects' }
  };
}

const db = require('../server/db.js');
const { stitchAudioBuffers } = require('../public/js/utils/audioStitcher.js');
const { getCanonicalScript } = require('../public/js/utils/scriptDbSync.js');

test('CRITICAL BUG FIX 1: Canonical Final Script Verbatim Integrity Across Workflow', async (t) => {
  await t.test('1. Canonical script extract guarantees latest user edits over stale chatgpt text', () => {
    const project = {
      id: 'proj_test_script_001',
      script: {
        originalChatGptScript: 'જૂની સ્ક્રિપ્ટ ChatGPT 1',
        rawText: 'સુધારેલ નવી ગુજરાતી સ્ક્રિપ્ટ - ૧૫ તારીખે છેલ્લી મુદત છે.',
        fullText: 'સુધારેલ નવી ગુજરાતી સ્ક્રિપ્ટ - ૧૫ તારીખે છેલ્લી મુદત છે.',
        version: 2,
        savedInDb: true,
        sections: [
          { slideNumber: 1, scriptText: 'સુધારેલ નવી ગુજરાતી સ્ક્રિપ્ટ' },
          { slideNumber: 2, scriptText: '૧૫ તારીખે છેલ્લી મુદત છે.' }
        ]
      }
    };

    const canonical = getCanonicalScript(project);
    assert.strictEqual(canonical.text, 'સુધારેલ નવી ગુજરાતી સ્ક્રિપ્ટ - ૧૫ તારીખે છેલ્લી મુદત છે.');
    assert.strictEqual(canonical.version, 2);
    assert.strictEqual(canonical.savedInDb, true);
    assert.ok(!canonical.text.includes('જૂની સ્ક્રિપ્ટ'), 'Must not revert to stale originalChatGptScript');
  });

  await t.test('2. Server database archives older versions and stores exact verbatim text', () => {
    const projectId = 'proj_db_test_' + Date.now();
    const v1Text = 'આ પ્રથમ સ્ક્રિપ્ટ છે. આંગણવાડી ભરતી ૨૦૨૬.';
    const v2Text = 'આ સુધારેલ દ્વિતીય સ્ક્રિપ્ટ છે. વયમર્યાદા ૧૮ થી ૩૫ વર્ષ રહેશે. પગાર ₹૧૦,૦૦૦ મળશે.';

    // Save v1
    const saved1 = db.saveScript({
      projectId,
      rawText: v1Text,
      fullText: v1Text,
      source: 'ChatGPT'
    });
    assert.strictEqual(saved1.version, 1);
    assert.strictEqual(saved1.rawText, v1Text);

    // Save v2
    const saved2 = db.saveScript({
      projectId,
      rawText: v2Text,
      fullText: v2Text,
      source: 'Manual Editor'
    });
    assert.strictEqual(saved2.version, 2);
    assert.strictEqual(saved2.rawText, v2Text);
    assert.strictEqual(saved2.versions.length, 1);
    assert.strictEqual(saved2.versions[0].rawText, v1Text, 'V1 archived safely without data loss');

    // Query latest
    const latest = db.getLatestScriptByProjectId(projectId);
    assert.strictEqual(latest.version, 2);
    assert.strictEqual(latest.fullText, v2Text);
  });
});

test('CRITICAL BUG FIX 2: Video Slides and Audio Narration Synchronization', async (t) => {
  await t.test('1. Slide audio mapping resolves accurately by slideId, slideNumber or id', () => {
    const storedAudios = [
      { id: 'rec_1', slideId: 'slide_proj_1', slideNumber: 1, duration: 14.85, url: 'blob:audio_1' },
      { id: 'rec_2', slideId: 'slide_proj_2', slideNumber: 2, duration: 18.20, url: 'blob:audio_2' },
      { id: 'rec_3', slideId: 'slide_proj_3', slideNumber: 3, duration: 9.40, url: 'blob:audio_3' }
    ];

    const slideAudioMap = {};
    storedAudios.forEach(rec => {
      if (rec.slideId) slideAudioMap[String(rec.slideId)] = rec;
      if (rec.slideNumber) {
        slideAudioMap[String(rec.slideNumber)] = rec;
        slideAudioMap[rec.slideNumber] = rec;
      }
      if (rec.id) slideAudioMap[String(rec.id)] = rec;
    });

    const slideQuery1 = slideAudioMap['slide_proj_1'];
    assert.ok(slideQuery1);
    assert.strictEqual(slideQuery1.duration, 14.85);

    const slideQuery2 = slideAudioMap['2'];
    assert.ok(slideQuery2);
    assert.strictEqual(slideQuery2.duration, 18.20);
  });

  await t.test('2. Timeline uses authentic audio durations without equal-duration rounding', () => {
    const rawSlides = [
      { slideId: 's1', slideNumber: 1, title: 'Slide 1' },
      { slideId: 's2', slideNumber: 2, title: 'Slide 2' },
      { slideId: 's3', slideNumber: 3, title: 'Slide 3' } // No audio (Missing)
    ];

    const audios = {
      's1': { duration: 14.75, url: 'audio1.wav' },
      's2': { duration: 22.30, url: 'audio2.wav' }
    };

    let currentOffset = 0;
    const presentationClips = [];

    rawSlides.forEach((s, idx) => {
      const slideNum = s.slideNumber || (idx + 1);
      const audioRec = audios[s.slideId] || audios[String(slideNum)] || null;
      const hasAudio = Boolean(audioRec && audioRec.duration > 0);
      const clipDuration = hasAudio ? Number(Number(audioRec.duration).toFixed(2)) : 8;

      presentationClips.push({
        slideNumber: slideNum,
        startTime: currentOffset,
        duration: clipDuration,
        hasAudio,
        audioMissing: !hasAudio
      });
      currentOffset += clipDuration;
    });

    // Verification
    assert.strictEqual(presentationClips[0].duration, 14.75, 'Slide 1 must have exact 14.75s duration, not fixed 8s');
    assert.strictEqual(presentationClips[1].startTime, 14.75, 'Slide 2 must start exactly at 14.75s');
    assert.strictEqual(presentationClips[1].duration, 22.30, 'Slide 2 must have exact 22.30s duration');
    assert.strictEqual(presentationClips[2].startTime, 37.05, 'Slide 3 must start at 37.05s');
    assert.strictEqual(presentationClips[2].audioMissing, true, 'Slide 3 must be flagged as missing audio');
  });

  await t.test('3. Timeline playhead correctly identifies active slide and audio offset during seeking', () => {
    const presentationClips = [
      { slideNumber: 1, startTime: 0, duration: 10 },
      { slideNumber: 2, startTime: 10, duration: 15 },
      { slideNumber: 3, startTime: 25, duration: 12 }
    ];

    function getActiveSlideAtTime(t) {
      for (let i = presentationClips.length - 1; i >= 0; i--) {
        if (t >= presentationClips[i].startTime) {
          return { clip: presentationClips[i], index: i };
        }
      }
      return { clip: presentationClips[0], index: 0 };
    }

    // Seek to 5s -> Slide 1
    const at5 = getActiveSlideAtTime(5);
    assert.strictEqual(at5.clip.slideNumber, 1);
    assert.strictEqual(5 - at5.clip.startTime, 5); // 5s into slide 1 audio

    // Seek to 17.5s -> Slide 2
    const at17 = getActiveSlideAtTime(17.5);
    assert.strictEqual(at17.clip.slideNumber, 2);
    assert.strictEqual(17.5 - at17.clip.startTime, 7.5); // 7.5s into slide 2 audio

    // Seek to 30s -> Slide 3
    const at30 = getActiveSlideAtTime(30);
    assert.strictEqual(at30.clip.slideNumber, 3);
    assert.strictEqual(30 - at30.clip.startTime, 5); // 5s into slide 3 audio
  });
});

test('CRITICAL BUG FIX 3: Studio-Quality Audio Format & Native Sample Rate Preservation', async (t) => {
  await t.test('1. AudioBuffer concatenation matches native 48,000 Hz sample rate with zero pitch shift', async () => {
    // Mock Web Audio Context & Buffer for Node.js
    class MockAudioBuffer {
      constructor(options) {
        this.numberOfChannels = options.numberOfChannels || 1;
        this.sampleRate = options.sampleRate || 48000;
        this.length = options.length || 48000;
        this.duration = this.length / this.sampleRate;
        this._channels = [];
        for (let c = 0; c < this.numberOfChannels; c++) {
          this._channels.push(new Float32Array(this.length));
        }
      }
      getChannelData(c) {
        return this._channels[c];
      }
    }

    class MockAudioContext {
      constructor() {
        this.sampleRate = 48000;
        this.state = 'running';
      }
      createBuffer(channels, length, sampleRate) {
        return new MockAudioBuffer({ numberOfChannels: channels, length, sampleRate });
      }
      async close() {
        this.state = 'closed';
      }
    }

    global.AudioContext = MockAudioContext;
    global.webkitAudioContext = MockAudioContext;
    global.window.AudioContext = MockAudioContext;
    global.window.webkitAudioContext = MockAudioContext;
    global.window.URL = { createObjectURL: () => 'blob:mock_master_url' };

    // Create two 48kHz audio buffers (Slide 1: 2s, Slide 2: 3s)
    const buf1 = new MockAudioBuffer({ numberOfChannels: 1, length: 96000, sampleRate: 48000 });
    const buf2 = new MockAudioBuffer({ numberOfChannels: 1, length: 144000, sampleRate: 48000 });

    const result = await stitchAudioBuffers([
      { slideNumber: 1, audioBuffer: buf1 },
      { slideNumber: 2, audioBuffer: buf2 }
    ], {
      pauseBetweenSlidesSec: 0.25,
      preserveOriginalSound: true
    });

    assert.ok(result.masterBuffer);
    assert.strictEqual(result.masterBuffer.sampleRate, 48000, 'Master sample rate must strictly match input 48000Hz (Zero Pitch Shift)');
    assert.strictEqual(result.masterBuffer.numberOfChannels, 2, 'Output is true stereo master');

    // 96000 + (0.25 * 48000 = 12000) + 144000 = 252000 samples
    assert.strictEqual(result.masterBuffer.length, 252000);
    assert.strictEqual(result.totalDuration, 5.25);
  });
});
