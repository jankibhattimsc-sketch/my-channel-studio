const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('Step 1: Slide-Wise Voice Recording Engine & UI Verification', async (t) => {
  const videoEditorPath = path.resolve('public/js/views/videoeditor.js');
  const code = fs.readFileSync(videoEditorPath, 'utf8');

  await t.test('1. Slide Sequence Filmstrip & Selection', () => {
    assert.ok(code.includes('step1-slide-card-'), 'Must render sequence cards for each slide');
    assert.ok(code.includes('wf-step1-slide-card'), 'Must have css class for filmstrip slide cards');
    assert.ok(code.includes('window.selectClip = selectClip'), 'Must expose selectClip globally');
    assert.ok(code.includes('step1-dur-'), 'Must display duration status on each filmstrip card');
    assert.ok(code.includes('step1-completion-badge'), 'Must display overall slide recording completion badge');
  });

  await t.test('2. Single-Slide Voice Recording Controls (Start, Pause, Resume, Stop)', () => {
    assert.ok(code.includes('btn-record-cur-slide'), 'Must provide primary record button for active slide');
    assert.ok(code.includes('btn-step1-start-record-'), 'Must provide slide-indexed record button class');
    assert.ok(code.includes('btn-step1-pause-record'), 'Must provide pause recording button');
    assert.ok(code.includes('btn-step1-resume-record'), 'Must provide resume recording button');
    assert.ok(code.includes('btn-step1-stop-record'), 'Must provide stop recording button');
    assert.ok(code.includes('handleToggleSingleSlideRecording'), 'Must implement full single slide recording engine');
    assert.ok(code.includes('singleSlideRecorder.pause()'), 'Must call LiveAudioRecorder pause method');
    assert.ok(code.includes('singleSlideRecorder.resume()'), 'Must call LiveAudioRecorder resume method');
  });

  await t.test('3. Live Timer and Microphone VU Meter', () => {
    assert.ok(code.includes('step1-rec-live-timer'), 'Must display live recording timer in Step 1');
    assert.ok(code.includes('step1-rec-live-vu'), 'Must display live VU meter level in Step 1');
    assert.ok(code.includes('onTick:'), 'Must hook onTick for live timer updates');
    assert.ok(code.includes('onLevel:'), 'Must hook onLevel for live microphone VU meter updates');
  });

  await t.test('4. Dedicated Slide Audio Playback & Scrubber', () => {
    assert.ok(code.includes('btn-step1-play-'), 'Must provide dedicated play button for recorded slide audio');
    assert.ok(code.includes('slide-audio-player-element'), 'Must provide native audio player element');
    assert.ok(code.includes('audio-scrubber-input'), 'Must provide audio scrubber range input');
    assert.ok(code.includes('audio-current-time-display'), 'Must display live playback elapsed time');
    assert.ok(code.includes('startSlideAudio'), 'Must start single slide audio playback');
    assert.ok(code.includes('stopCurrentAudio'), 'Must stop current audio cleanly');
  });

  await t.test('5. Re-record and Delete Individual Slide Recordings', () => {
    assert.ok(code.includes('btn-step1-rerecord-'), 'Must provide re-record button for individual slide');
    assert.ok(code.includes('btn-rerecord-slide'), 'Must bind re-record event listeners');
    assert.ok(code.includes('btn-step1-delete-'), 'Must provide delete recording button for individual slide');
    assert.ok(code.includes('btn-delete-slide-recording'), 'Must bind delete recording event listeners');
  });

  await t.test('6. Separate Storage & Non-Combination Guarantee', () => {
    assert.ok(code.includes('saveSlideAudioRecord'), 'Must save each slide audio separately to IndexedDB');
    assert.ok(code.includes('storedSlideAudios'), 'Must maintain in-memory slide audios array');
    assert.ok(code.includes('persistClips()'), 'Must persist clips without combining them at Step 1');
  });

  await t.test('7. Teleprompter Gujarati Script Reading & Auto-save', () => {
    assert.ok(code.includes('teleprompter-script-ta'), 'Must provide Gujarati teleprompter script textarea');
    assert.ok(code.includes('saveCurrentClipScript'), 'Must auto-save script edits to project slides and script sections');
  });
});

