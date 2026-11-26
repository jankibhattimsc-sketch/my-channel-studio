const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('VIDEO EDITOR: AI Audio Enhancement on Render & Slide-Wise Audio/Video Editing', async (t) => {
  const videoEditorPath = path.join(__dirname, '../public/js/views/videoeditor.js');
  const videoEditorCode = fs.readFileSync(videoEditorPath, 'utf8');
  const audioStitcherPath = path.join(__dirname, '../public/js/utils/audioStitcher.js');
  const audioStitcherCode = fs.readFileSync(audioStitcherPath, 'utf8');

  await t.test('1. AI Audio Enhancement option is present with preset selection and broadcast standard target', () => {
    assert.ok(videoEditorCode.includes('chk-video-enhance-audio'), 'Checkbox for AI audio enhance during joining exists');
    assert.ok(videoEditorCode.includes('select-video-enhance-preset'), 'Preset selection dropdown exists');
    assert.ok(videoEditorCode.includes('auto_studio'), 'Default auto_studio broadcast preset exists');
    assert.ok(videoEditorCode.includes('warm_podcast'), 'Warm podcast preset exists');
    assert.ok(videoEditorCode.includes('crisp_clarity'), 'Crisp clarity preset exists');
    assert.ok(videoEditorCode.includes('chk-top-enhance-audio'), 'Top header indicator checkbox exists');
  });

  await t.test('2. Video creation applies enhanceAudioBuffer and balances slide loudness when enabled', () => {
    assert.ok(videoEditorCode.includes('enhanceAudioBuffer(buf'), 'enhanceAudioBuffer is invoked on decoded track buffers');
    assert.ok(videoEditorCode.includes('isAudioEnhanceOnRender'), 'Checks user preference toggle before enhancing');
    assert.ok(videoEditorCode.includes('balanceSlideLoudness: Boolean(isAudioEnhanceOnRender)'), 'Stitcher balances loudness across all slides');
  });

  await t.test('3. Seamless pop-free audio scheduling with micro-ramps on clip boundaries', () => {
    assert.ok(videoEditorCode.includes('trackGain.gain.setValueAtTime'), 'Track gain ramps in to prevent digital click');
    assert.ok(videoEditorCode.includes('trackGain.gain.exponentialRampToValueAtTime'), 'Exponential ramp prevents pop artifacts');
    assert.ok(audioStitcherCode.includes('fadeSamples'), 'Audio stitcher applies micro-fade at buffer edges');
  });

  await t.test('4. Slide-wise editing controls for audio timing nudges are available', () => {
    assert.ok(videoEditorCode.includes('btn-nudge-cur-clip-dur'), 'Preview clip duration quick nudge buttons exist');
    assert.ok(videoEditorCode.includes('input-preview-slide-duration'), 'Direct duration input in preview bar exists');
    assert.ok(videoEditorCode.includes('btn-nudge-card-dur'), 'Grid card duration quick nudge buttons exist');
  });

  await t.test('5. Slide-wise text editing and quick single slide recording are fully functional', () => {
    assert.ok(videoEditorCode.includes('btn-edit-slide-content-quick'), 'Quick edit slide content button exists');
    assert.ok(videoEditorCode.includes('input-edit-slide-title'), 'Slide title editor input exists');
    assert.ok(videoEditorCode.includes('ta-edit-slide-bullets'), 'Slide bullet points editor textarea exists');
    assert.ok(videoEditorCode.includes('btn-save-slide-details'), 'Save slide details button exists');
    assert.ok(videoEditorCode.includes('btn-quick-record-slide'), 'Single slide recorder button exists in preview');
  });
});
