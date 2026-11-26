const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('SLIDE-WISE AUDIO & EDITED SLIDE UNIFIED DISPLAY SYSTEM', async (t) => {
  const videoEditorPath = path.join(__dirname, '../public/js/views/videoeditor.js');
  const code = fs.readFileSync(videoEditorPath, 'utf8');

  await t.test('1. Compact 16:9 Mini Slide Visual Thumbnail Renderer', () => {
    assert.ok(code.includes('function renderMiniSlideThumbnail(clip)'), 'Must implement renderMiniSlideThumbnail');
    assert.ok(code.includes('aspect-ratio: 16 / 9'), 'Must use authentic 16:9 aspect ratio');
    assert.ok(code.includes('pdfCanvas.toDataURL'), 'Must render PDF canvas if available');
    assert.ok(code.includes('clip.imageUrl'), 'Must support image-based slides');
  });

  await t.test('2. Filmstrip Cards show Slide Visual Thumbnail + Audio Status', () => {
    assert.ok(code.includes('id="step1-slide-card-'), 'Must render filmstrip cards');
    assert.ok(code.includes('renderMiniSlideThumbnail(c)'), 'Filmstrip cards must include mini slide thumbnail');
    assert.ok(code.includes('step1-dur-'), 'Filmstrip cards must preserve duration badge ID');
  });

  await t.test('3. Slide-wise Audio Strip Cards show BOTH Slide Visual AND Audio Waveform Together', () => {
    assert.ok(code.includes('id="step1-strip-card-'), 'Must render slide-wise strip cards');
    assert.ok(code.includes('class="step1-slidewise-card"'), 'Must maintain step1-slidewise-card class');
    assert.ok(code.includes('btn-step1-strip-play'), 'Must include audio listen button');
    assert.ok(code.includes('renderMiniSlideThumbnail(c)'), 'Must render slide thumbnail for each strip card');
  });

  await t.test('4. Step 1 Inline Slide Content Editor (Title, Subtitle, Bullets) with Live Update', () => {
    assert.ok(code.includes('id="step1-inline-slide-editor"'), 'Step 1 must have inline slide editor');
    assert.ok(code.includes('id="step1-input-slide-title"'), 'Step 1 must have slide title input');
    assert.ok(code.includes('id="step1-input-slide-subtitle"'), 'Step 1 must have slide subtitle input');
    assert.ok(code.includes('id="step1-ta-slide-bullets"'), 'Step 1 must have slide bullets textarea');
    assert.ok(code.includes('id="btn-save-step1-slide-details"'), 'Step 1 must have save slide details button');
    assert.ok(code.includes('isEditingSlideContentInStep1'), 'Must track Step 1 inline slide editor toggle state');
  });

  await t.test('5. Waveform Editor Displays Selected Slide Visual Thumbnail + Audio Waveform Together', () => {
    assert.ok(code.includes('id="step1-slide-audio-editor-box"'), 'Must have Step 1 audio editor box');
    assert.ok(code.includes('renderMiniSlideThumbnail(curClip)'), 'Waveform editor must display current slide visual thumbnail');
    assert.ok(code.includes('id="step1-audio-waveform-canvas"'), 'Waveform editor must include waveform canvas');
    assert.ok(code.includes('btn-waveform-jump-edit-slide'), 'Waveform editor must provide 1-click edit slide button');
  });

  await t.test('6. Slide Visual Thumbnails in Step 3, Step 4 and Step 5 for Complete Consistency', () => {
    // Step 3 Slide + Voice Sync
    assert.ok(code.includes('renderMiniSlideThumbnail(clip)'), 'Step 3 must display slide thumbnail for each row');

    // Step 4 Clips Grid & Step 1 cards
    assert.ok(code.includes('renderMiniSlideThumbnail(c)'), 'Step 4 must display slide thumbnail for each clip card');

    // Step 5 Selected Clip Editor
    assert.ok(code.includes('renderMiniSlideThumbnail(curClip)'), 'Step 5 must display slide thumbnail in editor header');
  });

  await t.test('7. Step 1 Main Stage Live Video Preview with Overlay Play Button, Progress Bar & Live Subtitles', () => {
    assert.ok(code.includes('id="step1-slide-preview-container"'), 'Step 1 must have main slide video preview container');
    assert.ok(code.includes('btn-stage-center-play'), 'Must include center play/pause overlay trigger');
    assert.ok(code.includes('stage-clip-progress-bar'), 'Must include video clip progress bar');
    assert.ok(code.includes('updateLiveStageVisual'), 'Must dynamically update Step 1 stage visual during playback');
  });

  await t.test('8. Slide-wise Audio Strip Cards Framed as Joined Clip Video Player', () => {
    assert.ok(code.includes('btn-step1-play-all-joined-clips'), 'Must have 1-click play all joined clips presentation button');
    assert.ok(code.includes('step1-card-progress-'), 'Each strip card must have live clip progress bar');
    assert.ok(code.includes('btn-step1-strip-play'), 'Each strip card thumbnail must have direct play button overlay');
    assert.ok(code.includes('જોડાયેલ'), 'Strip card must show joined status badge');
  });

  await t.test('9. Fresh Audio Priority and Live Synchronization Across Joined Presentation Playback', () => {
    assert.ok(code.includes('curClip?.enhancedBlob'), 'Must prioritize freshly enhanced audio blob');
    assert.ok(code.includes('playSequentialClips'), 'Must support continuous joined clip presentation playback');
  });
});
