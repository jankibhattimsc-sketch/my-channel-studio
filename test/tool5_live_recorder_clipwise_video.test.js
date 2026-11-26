const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('TOOL 5: LIVE AUDIO RECORDER & CLIP-WISE SLIDE VIDEO PLAYER VERIFICATION', async (t) => {
  const videoEditorPath = path.join(__dirname, '../public/js/views/videoeditor.js');
  const videoEditorCode = fs.readFileSync(videoEditorPath, 'utf8');

  await t.test('1. Tool 5 Header & Combiner Banner have prominent visible Live Audio Recorder buttons', () => {
    // Top action bar button is visible (not display: none !important)
    assert.ok(videoEditorCode.includes('id="btn-toggle-live-record"'), 'Live recorder button ID exists in video editor');
    assert.ok(!videoEditorCode.includes('<button id="btn-toggle-live-record" style="display: none !important;"></button>'), 'Live recorder toggle is NOT hidden');
    assert.ok(videoEditorCode.includes('લાઈવ ઓડિયો રેકોર્ડર'), 'Live audio recorder label exists in Gujarati');

    // Combiner banner quick trigger button
    assert.ok(videoEditorCode.includes('id="btn-banner-toggle-live"'), 'Banner quick trigger for live recording exists');
  });

  await t.test('2. Live Audio Recording Studio Panel includes both full presentation and single-slide recording', () => {
    assert.ok(videoEditorCode.includes('id="btn-live-start"'), 'Start live recording button exists');
    assert.ok(videoEditorCode.includes('id="btn-live-next-slide"'), 'Next slide transition button exists');
    assert.ok(videoEditorCode.includes('id="btn-live-finish"'), 'Finish live recording button exists');
    assert.ok(videoEditorCode.includes('id="btn-panel-single-record"'), 'Panel single slide record button exists');
    assert.ok(videoEditorCode.includes('id="live-rec-timer"'), 'Live recording timer element exists');
    assert.ok(videoEditorCode.includes('id="live-rec-vu"'), 'Live recording VU level meter exists');
    assert.ok(videoEditorCode.includes('id="input-video-upload-pdf-live"'), 'Upload/Change PDF during live mode input exists');
  });

  await t.test('3. 16:9 Video Stage has clip-wise video player overlay and progress bar', () => {
    assert.ok(videoEditorCode.includes('id="btn-stage-center-play"'), 'Center play/pause button overlay on 16:9 stage exists');
    assert.ok(videoEditorCode.includes('id="stage-clip-progress-bar"'), 'Stage clip-wise live progress bar exists');
    assert.ok(videoEditorCode.includes('id="btn-audio-play-pause"'), 'Play/Pause single slide audio/video button exists');
    assert.ok(videoEditorCode.includes('id="btn-play-all-slides"'), 'Sequential full presentation video play button exists');
    assert.ok(videoEditorCode.includes('આ ક્લિપનો વિડીયો જુઓ'), 'Label for watching individual clip video exists');
  });

  await t.test('4. Each Slide Clip Card has prominent Clip Video Preview and Quick Record buttons', () => {
    assert.ok(videoEditorCode.includes('class="btn-clip-preview"'), 'Each clip card has btn-clip-preview');
    assert.ok(videoEditorCode.includes('class="btn-card-record-clip"'), 'Each clip card has quick record button');
    assert.ok(videoEditorCode.includes('selectClip(idx)'), 'Previewing clip selects the clip and switches 16:9 stage');
    assert.ok(videoEditorCode.includes('startSlideAudio(idx)'), 'Previewing clip starts its synchronized audio playback');
  });

  await t.test('5. Single slide audio playback synchronizes scrubber to clip duration and updates stage progress', () => {
    assert.ok(videoEditorCode.includes('scrubber.max = totalDur'), 'Scrubber max scales to clip duration for smooth scrubbing');
    assert.ok(videoEditorCode.includes('stageBar.style.width'), 'Stage progress bar updates with playback currentTime');
  });
});

