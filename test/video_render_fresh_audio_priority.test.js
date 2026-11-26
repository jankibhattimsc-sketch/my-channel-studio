const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('Fresh Audio Priority During Video Rendering & Export', async (t) => {
  const videoEditorPath = path.join(__dirname, '../public/js/views/videoeditor.js');
  const voiceRoutePath = path.join(__dirname, '../server/routes/voice.js');
  const projectStatePath = path.join(__dirname, '../public/js/utils/projectState.js');

  const editorCode = fs.readFileSync(videoEditorPath, 'utf8');
  const voiceRouteCode = fs.readFileSync(voiceRoutePath, 'utf8');
  const projectStateCode = fs.readFileSync(projectStatePath, 'utf8');

  await t.test('1. Video export prioritizes freshly recorded audio from IndexedDB before any server fallback', () => {
    // In render1080pVideoPresentation, Tier 1 must be IndexedDB Blob of current project
    const tier1Idx = editorCode.indexOf('Tier 1: Check IndexedDB Blob for THIS project');
    const tier3Idx = editorCode.indexOf('Tier 3: Fetch candidate URLs');
    assert.ok(tier1Idx !== -1, 'Must have Tier 1 check for IndexedDB blob');
    assert.ok(tier3Idx !== -1, 'Must have Tier 3 candidate URLs fallback');
    assert.ok(tier1Idx < tier3Idx, 'IndexedDB recording must be decoded before candidate URLs');
  });

  await t.test('2. Video export does not fetch global server audios for non-demo projects', () => {
    assert.ok(
      editorCode.includes('if (isDefaultGsrtcProject)') &&
      editorCode.includes('serverSlideAudios = {};'),
      'Must guard serverSlideAudios fetch so custom projects do not load old demo audio'
    );
  });

  await t.test('3. Clip audio source in buildGeneratedClips prioritizes freshBlobUrl and project recordings', () => {
    // Find audioSourceUrl assignment
    assert.ok(editorCode.includes('freshBlobUrl ||'), 'freshBlobUrl must be highest priority');
    assert.ok(
      editorCode.includes('isDefaultGsrtcProject && serverMatch?.audioUrl'),
      'serverMatch must only be used if isDefaultGsrtcProject is true'
    );
  });

  await t.test('4. Server /api/voice/slide-audios supports projectId filtering to prevent cross-project audio leakage', () => {
    assert.ok(voiceRouteCode.includes('requestedProjectId'), 'Must read requestedProjectId from query');
    assert.ok(voiceRouteCode.includes('isDefaultDemo'), 'Must identify if default demo project');
    assert.ok(voiceRouteCode.includes('files.filter(f => f.includes(requestedProjectId))'), 'Must filter by requestedProjectId');
  });

  await t.test('5. Project state cleanses old exported video and clips when activating different topic', () => {
    assert.ok(projectStateCode.includes('project.editing.lastExportedVideoUrl = \'\''), 'Must clear old exported video URL');
    assert.ok(projectStateCode.includes('project.editing.generatedClips = []'), 'Must reset generated clips on topic conflict');
  });

  await t.test('6. Audio storage prioritizes user Blob and dataUrl over stale serverUrl or mock audio', () => {
    const audioStoragePath = path.join(__dirname, '../public/js/utils/audioStorage.js');
    const storageCode = fs.readFileSync(audioStoragePath, 'utf8');

    // Both getSlideAudioRecord and getAllSlideAudioRecords must prioritize res.blob
    assert.ok(
      storageCode.includes('playableUrl = URL.createObjectURL(res.blob);'),
      'Must generate playableUrl from res.blob first'
    );
    assert.ok(
      storageCode.includes('!res.url.includes(\'uploaded_179359\')'),
      'Must filter out old GSRTC mock audio from playable URLs'
    );
  });

  await t.test('7. Slide voice studio invalidates old exported video when a new slide voice is recorded', () => {
    const slideVoicePath = path.join(__dirname, '../public/js/components/slideVoiceStudio.js');
    const slideVoiceCode = fs.readFileSync(slideVoicePath, 'utf8');

    assert.ok(
      slideVoiceCode.includes('activeProj.editing.lastExportedVideoUrl = \'\''),
      'Must clear lastExportedVideoUrl when recording is auto-saved'
    );
    assert.ok(
      slideVoiceCode.includes('activeProj.editing.savedVideo = null'),
      'Must clear savedVideo object'
    );
  });

  await t.test('8. Video editor includes rerender and reset controls to purge stale videos and re-generate with fresh audio', () => {
    assert.ok(editorCode.includes('btn-rerender-saved-video'), 'Must have rerender button');
    assert.ok(editorCode.includes('btn-reset-saved-video'), 'Must have reset stale video button');
    assert.ok(editorCode.includes('presentationStitchedUrl'), 'Must have dynamic presentation stitched audio variable');
    assert.ok(
      !editorCode.includes('const masterAudioUrl = \'/audio/master_presentation_audio.wav\';'),
      'Must NOT hardcode master audio URL to old GSRTC recording in startFullPresentation'
    );
  });
});

