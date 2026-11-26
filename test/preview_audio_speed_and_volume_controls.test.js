const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('AUDIO PREVIEW SPEED (SLOW & FAST) AND VOLUME CONTROLS IN VIDEO EDITOR', async (t) => {
  const videoEditorPath = path.join(__dirname, '../public/js/views/videoeditor.js');
  const code = fs.readFileSync(videoEditorPath, 'utf8');

  await t.test('1. Playback Speed and Volume State Variables & Functions', () => {
    assert.ok(code.includes('let previewPlaybackRate = 1.0;'), 'Must have previewPlaybackRate state initialized to 1.0');
    assert.ok(code.includes('let previewVolume = 1.0;'), 'Must have previewVolume state initialized to 1.0');
    assert.ok(code.includes('function setPreviewPlaybackRate(rate)'), 'Must have setPreviewPlaybackRate helper');
    assert.ok(code.includes('function setPreviewVolume(vol)'), 'Must have setPreviewVolume helper');
    assert.ok(code.includes('function renderPreviewSpeedAndVolumeControls'), 'Must have reusable UI renderer for speed & volume controls');
  });

  await t.test('2. Playback Speed Presets: 0.75x (Slow/ધીમો), 1.0x (Normal/સામાન્ય), 1.25x (Fast/ઝડપી), 1.5x (Faster/ફાસ્ટ)', () => {
    assert.ok(code.includes('0.75x 🐢'), 'Must include 0.75x slow speed preset');
    assert.ok(code.includes('1.0x'), 'Must include 1.0x normal speed preset');
    assert.ok(code.includes('1.25x ⚡'), 'Must include 1.25x fast speed preset');
    assert.ok(code.includes('1.5x 🚀'), 'Must include 1.5x faster speed preset');
    assert.ok(code.includes('class="btn-preview-speed"'), 'Must have btn-preview-speed class on buttons');
  });

  await t.test('3. Volume Slider and Percentage Indicator (0% to 100%)', () => {
    assert.ok(code.includes('class="preview-volume-slider"'), 'Must include volume slider element');
    assert.ok(code.includes('class="preview-volume-display"'), 'Must include volume percentage text display');
    assert.ok(code.includes('Math.round(previewVolume * 100)'), 'Must display volume as percentage');
  });

  await t.test('4. Speed and Volume Controls integrated into Step 1 Audio Action Bar', () => {
    const actionBlock = code.slice(code.indexOf('btn-audio-play-pause'), code.indexOf('btn-quick-create-video-step1'));
    assert.ok(actionBlock.includes('renderPreviewSpeedAndVolumeControls'), 'Step 1 Audio Action Bar must render speed & volume controls');
  });

  await t.test('5. Speed and Volume Controls integrated into Step 1 Slide-wise Strip Header', () => {
    const stripHeaderIdx = code.indexOf('btn-step1-play-all-joined-clips');
    assert.ok(stripHeaderIdx !== -1, 'Must have play-all-joined-clips button');
    const stripBlock = code.slice(stripHeaderIdx - 300, stripHeaderIdx + 300);
    assert.ok(stripBlock.includes('renderPreviewSpeedAndVolumeControls'), 'Slide-wise Strip Header must render speed & volume controls');
  });

  await t.test('6. Speed and Volume Controls integrated into Step 1 Waveform Editor Box', () => {
    const wfBtnIdx = code.indexOf('btn-waveform-jump-edit-slide');
    assert.ok(wfBtnIdx !== -1, 'Must have waveform edit slide button');
    const wfBlock = code.slice(wfBtnIdx - 300, wfBtnIdx + 300);
    assert.ok(wfBlock.includes('renderPreviewSpeedAndVolumeControls'), 'Waveform editor must render speed & volume controls');
  });

  await t.test('7. Speed and Volume Controls integrated into Step 5 Full Presentation Controls', () => {
    const step5PlayIdx = code.indexOf('Play Full Video •');
    assert.ok(step5PlayIdx !== -1, 'Must have Step 5 presentation play button');
    const step5Block = code.slice(step5PlayIdx - 200, step5PlayIdx + 600);
    assert.ok(step5Block.includes('renderPreviewSpeedAndVolumeControls'), 'Step 5 player must render speed & volume controls');
  });

  await t.test('8. Single Slide Audio Playback respects previewPlaybackRate and previewVolume', () => {
    assert.ok(code.includes('domAudioEl.playbackRate = previewPlaybackRate'), 'startSlideAudio must apply previewPlaybackRate');
    assert.ok(code.includes('domAudioEl.volume = previewVolume'), 'startSlideAudio must apply previewVolume');
  });

  await t.test('9. Sequential Clips & Full Presentation Playback respects previewPlaybackRate and previewVolume', () => {
    assert.ok(code.includes('activeAudio.playbackRate = previewPlaybackRate'), 'playSequentialClips must apply previewPlaybackRate to activeAudio');
    assert.ok(code.includes('activeAudio.volume = previewVolume'), 'playSequentialClips must apply previewVolume to activeAudio');
    assert.ok(code.includes('fullPresentationAudio.playbackRate = previewPlaybackRate'), 'startFullPresentation must apply previewPlaybackRate');
    assert.ok(code.includes('fullPresentationAudio.volume = previewVolume'), 'startFullPresentation must apply previewVolume');
  });

  await t.test('10. Event Listeners Wire Speed and Volume Controls Responsively', () => {
    assert.ok(code.includes("container.querySelectorAll('.btn-preview-speed')"), 'Must wire click listeners for speed buttons');
    assert.ok(code.includes("container.querySelectorAll('.preview-volume-slider"), 'Must wire input listeners for volume sliders');
  });
});
