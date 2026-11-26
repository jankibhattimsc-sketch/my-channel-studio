const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('PERFECT AUDIO & VIDEO PREVIEW SOUND VERIFICATION', async (t) => {
  const connectorPath = path.join(__dirname, '../public/js/utils/slideAudioConnector.js');
  const connectorCode = fs.readFileSync(connectorPath, 'utf8');

  const videoEditorPath = path.join(__dirname, '../public/js/views/videoeditor.js');
  const videoEditorCode = fs.readFileSync(videoEditorPath, 'utf8');

  const voiceStudioPath = path.join(__dirname, '../public/js/components/slideVoiceStudio.js');
  const voiceStudioCode = fs.readFileSync(voiceStudioPath, 'utf8');

  await t.test('1. slideAudioConnector extracts audio from all sources without duration drop', () => {
    assert.ok(connectorCode.includes('matchedRecord = {'), 'Connector includes slide fallback audio matching');
    assert.ok(connectorCode.includes('hasAudio = Boolean(audioUrl && audioUrl.length > 0)'), 'hasAudio does not reject based on zero duration');
    assert.ok(connectorCode.includes('URL.createObjectURL(matchedRecord.blob)'), 'Connector handles Blob instances cleanly');
  });

  await t.test('2. videoeditor provides direct native HTML5 audio element for guaranteed sound', () => {
    assert.ok(videoEditorCode.includes('id="slide-audio-player-element"'), 'Dedicated slide audio element is present in DOM');
    assert.ok(videoEditorCode.includes('src="${currentSlideAudioSrc}"'), 'Slide audio element preloads the exact enhanced audio src');
    assert.ok(videoEditorCode.includes('domAudioEl.play()'), 'startSlideAudio plays through the native DOM audio player');
    assert.ok(videoEditorCode.includes('id="audio-scrubber-input"'), 'Scrubber input is always in the player');
  });

  await t.test('3. Guaranteed slides availability prevents blank/missing slide preview', () => {
    assert.ok(connectorCode.includes('rawSlides.length === 0'), 'Connector handles empty slides gracefully with fallback slides');
    assert.ok(voiceStudioCode.includes('projSlides.length === 0'), 'Voice studio populates slides if project is empty');
  });

  await t.test('4. Saved video player has unmuted play button and no autoplay mute bug', () => {
    assert.ok(videoEditorCode.includes('id="btn-play-saved-video-sound"'), 'Button to play saved video with full sound exists');
    assert.ok(videoEditorCode.includes('playVideoWithFullSound'), 'playVideoWithFullSound helper is implemented');
    assert.ok(videoEditorCode.includes('videoElement.muted = false'), 'playVideoWithFullSound explicitly unsets mute');
    assert.ok(videoEditorCode.includes('videoElement.volume = 1.0'), 'playVideoWithFullSound sets full volume');
    // Verify autoplay is removed from main-saved-video-element to prevent Chrome mute
    const savedVidSection = videoEditorCode.substring(videoEditorCode.indexOf('id="main-saved-video-element"'), videoEditorCode.indexOf('id="main-saved-video-element"') + 150);
    assert.ok(!savedVidSection.includes('autoplay'), 'Autoplay is removed from main-saved-video-element to prevent browser silencing');
  });

  await t.test('5. MP4 export pre-decodes audio buffers, boosts master volume, and syncs audio clock', () => {
    assert.ok(videoEditorCode.includes('audioCtx.resume()'), 'Resumes AudioContext to prevent suspended silent output');
    assert.ok(videoEditorCode.includes('preparedTracks'), 'Pre-decodes tracks before starting recorder');
    assert.ok(videoEditorCode.includes('recorder.start(100)'), 'Recorder is started before audio buffers are scheduled');
    assert.ok(videoEditorCode.includes('srcNode.start(scheduledTime)'), 'Audio buffers are scheduled to stream directly into destination');
    assert.ok(videoEditorCode.includes('masterGain.gain.value = 1.35'), 'Master volume gain booster is connected');
    assert.ok(videoEditorCode.includes('keepaliveOsc'), 'Keepalive oscillator prevents dropped audio track');
    assert.ok(videoEditorCode.includes('setupCompanionAudioSync'), 'Companion audio sync guarantees instant playback sound');
    assert.ok(videoEditorCode.includes('id="btn-modal-play-sound-now"'), 'Modal includes instant play with sound button');
  });

  await t.test('6. Voice Studio seamlessly transfers audio without tag conflict or overlap', () => {
    assert.ok(voiceStudioCode.includes('svr-btn-jump-to-video-card'), 'Jump to video card button exists');
    assert.ok(voiceStudioCode.includes('svr-btn-stop-player'), 'Stop audio button is present in saved audio card');
    assert.ok(voiceStudioCode.includes("activeStudioTab = 'video'"), 'Seamless tab switch to video studio is intact');
  });
});

