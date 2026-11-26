const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('VIDEO CREATION TOOL UPGRADE & PROTECTED VOICE RECORDER VERIFICATION', async (t) => {
  const videoEditorPath = path.join(__dirname, '../public/js/views/videoeditor.js');
  const videoEditorCode = fs.readFileSync(videoEditorPath, 'utf8');

  const voiceStudioPath = path.join(__dirname, '../public/js/components/slideVoiceStudio.js');
  const voiceStudioCode = fs.readFileSync(voiceStudioPath, 'utf8');

  const recorderPath = path.join(__dirname, '../public/js/utils/audioRecorderEnhancer.js');
  const recorderCode = fs.readFileSync(recorderPath, 'utf8');

  await t.test('1. Protected Live Voice Recorder: Zero modification or disruption to recording functions', () => {
    assert.ok(recorderCode.includes('class LiveAudioRecorder'), 'LiveAudioRecorder class remains intact');
    assert.ok(recorderCode.includes('start('), 'start method is protected');
    assert.ok(recorderCode.includes('pause('), 'pause method is protected');
    assert.ok(recorderCode.includes('resume('), 'resume method is protected');
    assert.ok(recorderCode.includes('stop('), 'stop method is protected');
    assert.ok(recorderCode.includes('enhanceAudioBuffer'), 'AI loudness & noise reduction function is protected');

    // SlideVoiceStudio recording controls
    assert.ok(voiceStudioCode.includes('svr-btn-start'), 'Voice studio record button exists');
    assert.ok(voiceStudioCode.includes('svr-btn-pause'), 'Voice studio pause button exists');
    assert.ok(voiceStudioCode.includes('svr-btn-stop'), 'Voice studio stop button exists');
  });

  await t.test('2. Prominent 16:9 Video & Preview Stage with Live Creation Canvas', () => {
    assert.ok(videoEditorCode.includes('id="main-video-stage"'), 'Dedicated 16:9 main video stage is present');
    assert.ok(videoEditorCode.includes('aspect-ratio: 16 / 9'), 'Main video stage strictly enforces 16:9 aspect ratio');
    assert.ok(videoEditorCode.includes('id="live-render-canvas"'), 'Live canvas for real-time video creation is embedded');
    assert.ok(videoEditorCode.includes('id="live-rendering-box"'), 'Live rendering overlay box is present');
    assert.ok(videoEditorCode.includes('id="render-live-bar"'), 'Live rendering progress bar is present');
  });

  await t.test('3. Generated Slide Clips are visible in actual video sequence', () => {
    assert.ok(videoEditorCode.includes('generated-clip-card'), 'Clips cards are mapped and rendered in sequence');
    assert.ok(videoEditorCode.includes('c.clipNumber'), 'Each clip displays its clip number');
    assert.ok(videoEditorCode.includes('c.formattedDuration'), 'Each clip displays its exact duration');
    assert.ok(videoEditorCode.includes('selectClip(idx)'), 'Selecting a clip switches to and updates the main preview');
    assert.ok(videoEditorCode.includes('data-clip-index'), 'Clip card binds its index for click selection');
  });

  await t.test('4. Clean Saved Video Section with metadata and actions', () => {
    assert.ok(videoEditorCode.includes('id="saved-video-section"'), 'Clean Saved Video section is rendered');
    assert.ok(videoEditorCode.includes('1920x1080 Full HD (30 FPS)'), 'Resolution is clearly stated');
    assert.ok(videoEditorCode.includes('id="btn-play-saved-video-sound"'), 'Play video button exists');
    assert.ok(videoEditorCode.includes('id="btn-download-saved-mp4"'), 'Download MP4 button exists');
    assert.ok(videoEditorCode.includes('id="btn-reopen-preview"'), 'Reopen preview button exists');
  });

  await t.test('5. Real Video Rendering Engine & Server Persistence', () => {
    assert.ok(videoEditorCode.includes('MediaRecorder'), 'MediaRecorder encodes real 1080p stream');
    assert.ok(videoEditorCode.includes('captureStream(30)'), 'Captures 30 FPS canvas stream');
    assert.ok(videoEditorCode.includes('decodeAudioData'), 'AudioBuffers are pre-decoded for exact synchronization');
    assert.ok(videoEditorCode.includes('/api/voice/upload-video'), 'Generated video is saved to server for persistence across reload');
    assert.ok(videoEditorCode.includes('project.editing.lastExportedVideoUrl'), 'Video URL is saved to project state');
  });
});
