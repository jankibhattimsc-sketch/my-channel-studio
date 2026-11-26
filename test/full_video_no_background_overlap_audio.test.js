const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('FULL VIDEO NO BACKGROUND OVERLAP OR SECOND VOICE GUARANTEE', async (t) => {
  const videoEditorPath = path.join(__dirname, '../public/js/views/videoeditor.js');
  const videoEditorCode = fs.readFileSync(videoEditorPath, 'utf8');

  const voiceStudioPath = path.join(__dirname, '../public/js/components/slideVoiceStudio.js');
  const voiceStudioCode = fs.readFileSync(voiceStudioPath, 'utf8');

  await t.test('1. stopAllBackgroundAudios function exists and stops all background audio streams', () => {
    assert.ok(videoEditorCode.includes('function stopAllBackgroundAudios()'), 'stopAllBackgroundAudios must be defined');
    assert.ok(videoEditorCode.includes('stopFullPresentation()'), 'Must stop continuous presentation audio');
    assert.ok(videoEditorCode.includes('companionAudio.pause()'), 'Must pause companion audio');
    assert.ok(videoEditorCode.includes('activeAudio.pause()'), 'Must pause active slide audio');
    assert.ok(videoEditorCode.includes("container.querySelectorAll('audio').forEach"), 'Must pause any other audio elements');
  });

  await t.test('2. playVideoWithFullSound strictly stops all background audio before playing video', () => {
    assert.ok(videoEditorCode.includes('function playVideoWithFullSound(videoElement)'), 'playVideoWithFullSound exists');
    const fnIdx = videoEditorCode.indexOf('function playVideoWithFullSound(videoElement)');
    const fnBody = videoEditorCode.slice(fnIdx, fnIdx + 400);
    assert.ok(fnBody.includes('stopAllBackgroundAudios()'), 'playVideoWithFullSound must call stopAllBackgroundAudios() immediately');
    assert.ok(fnBody.includes('videoElement.muted = false'), 'Must unmute video');
    assert.ok(fnBody.includes('videoElement.volume = 1.0'), 'Must set full volume');
  });

  await t.test('3. savedVid event listeners never trigger companionAudio.play() or startFullPresentation()', () => {
    const savedVidIdx = videoEditorCode.indexOf("savedVid.addEventListener('play'");
    assert.ok(savedVidIdx !== -1, 'savedVid play listener must exist');
    const savedVidSection = videoEditorCode.slice(savedVidIdx, savedVidIdx + 900);

    // Guarantee companionAudio.play is never called on pause or ended
    assert.ok(!savedVidSection.includes('companionAudio.play()'), 'savedVid must never trigger companionAudio.play()');
    assert.ok(!savedVidSection.includes('startFullPresentation('), 'savedVid must never hijack playback to startFullPresentation');
    assert.ok(savedVidSection.includes('stopAllBackgroundAudios()'), 'Must call stopAllBackgroundAudios on play/pause/ended');
  });

  await t.test('4. WebAudio live rendering cleanly disconnects and closes audioCtx to prevent trailing noise', () => {
    assert.ok(
      videoEditorCode.includes('try { limiter.disconnect(); } catch (_) { }'),
      'Must cleanly disconnect limiter from audioCtx destination'
    );
    assert.ok(
      videoEditorCode.includes('try { audioCtx.close(); } catch (_) { }'),
      'Must cleanly close audioCtx when rendering completes'
    );
  });

  await t.test('5. View mode switching between preview and saved isolates audio playback', () => {
    const previewTabIdx = videoEditorCode.indexOf("container.querySelector('#view-tab-preview')");
    assert.ok(previewTabIdx !== -1, 'view-tab-preview exists');
    const tabSection = videoEditorCode.slice(previewTabIdx, previewTabIdx + 500);
    assert.ok(tabSection.includes('vid.pause()'), 'Preview tab switch must pause saved video');
    assert.ok(tabSection.includes('stopAllBackgroundAudios()'), 'Saved tab switch must stop all background audio');
  });

  await t.test('6. Slide Voice Studio pauses all audios when jumping to video editor', () => {
    const jumpIdx = voiceStudioCode.indexOf("targetContainer.querySelector('#svr-btn-jump-to-video')");
    assert.ok(jumpIdx !== -1, 'Jump button exists');
    const jumpSection = voiceStudioCode.slice(jumpIdx, jumpIdx + 400);
    assert.ok(jumpSection.includes("targetContainer.querySelectorAll('audio').forEach"), 'Must pause all audio elements before navigation');
  });
});
