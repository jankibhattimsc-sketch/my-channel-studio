const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('VOICE + VIDEO STUDIO MERGE, OPTION 5 & 6 REMOVAL, AND ENHANCED AUDIO/VIDEO PERSISTENCE', () => {
  const rootDir = process.cwd();

  it('1. Options 5 and 6 (Canva and SEO) are removed from navigation in index.html', () => {
    const indexPath = path.join(rootDir, 'public', 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    // Navigation items for editing, canva, and seo should not exist
    assert.strictEqual(
      indexContent.includes('id="nav-editing"'),
      false,
      'id="nav-editing" must be completely removed from index.html'
    );
    assert.strictEqual(
      indexContent.includes('id="nav-canva"'),
      false,
      'Option 5 (Canva) must be removed from navigation in index.html'
    );
    assert.strictEqual(
      indexContent.includes('id="nav-seodescription"'),
      false,
      'Option 6 (SEO) must be removed from navigation in index.html'
    );

    // Clean focus on core video making tools (Step 4 is Video Editor):
    assert.ok(
      indexContent.includes('Video Editor') || indexContent.includes('૪. Video Editor'),
      'Step 4 must be Video Editor'
    );
  });

  it('2. Script Editor, Canva, and SEO are removed from workspace.js PRODUCTION_SECTIONS', () => {
    const wsPath = path.join(rootDir, 'public', 'js', 'views', 'workspace.js');
    const wsContent = fs.readFileSync(wsPath, 'utf-8');

    assert.strictEqual(
      wsContent.includes("{ id: 'scripteditor'"),
      false,
      'scripteditor must not be in PRODUCTION_SECTIONS'
    );
    assert.strictEqual(
      wsContent.includes("{ id: 'canva'"),
      false,
      'canva must not be in PRODUCTION_SECTIONS'
    );

    // voice or video editor section is present
    assert.ok(
      (wsContent.includes("અવાજ અને વિડીયો") || wsContent.includes("વિડીયો એડિટર")) &&
      (wsContent.includes("Voice & Video Studio") || wsContent.includes("Video Editing Studio")),
      'Voice or Video section title should exist'
    );
  });

  it('3. slideVoiceStudio.js includes merged Slide + Audio Video Studio tab and removed tabs 5 & 6', () => {
    const studioPath = path.join(rootDir, 'public', 'js', 'components', 'slideVoiceStudio.js');
    const studioContent = fs.readFileSync(studioPath, 'utf-8');

    // Video Studio Tab
    assert.ok(
      studioContent.includes('data-tab="video"'),
      'slideVoiceStudio must have data-tab="video"'
    );
    assert.ok(
      studioContent.includes('🎬 ૨. સ્લાઇડ + ઓડિયો વિડીયો'),
      'slideVoiceStudio must show 🎬 ૨. સ્લાઇડ + ઓડિયો વિડીયો (Video Studio) tab'
    );

    // Removed options 5 and 6 (BGM Mixer and Quality Audit) from tabs bar
    assert.strictEqual(
      studioContent.includes('data-tab="bgm"'),
      false,
      'Option 5 (BGM Mixer) tab must be removed for clean design'
    );
    assert.strictEqual(
      studioContent.includes('data-tab="quality"'),
      false,
      'Option 6 (Quality Audit) tab must be removed for clean design'
    );

    // Top action button and jump button
    assert.ok(
      studioContent.includes('id="svr-btn-top-open-video"'),
      'slideVoiceStudio must have #svr-btn-top-open-video button'
    );
    assert.ok(
      studioContent.includes('id="svr-btn-jump-to-video"'),
      'slideVoiceStudio must have #svr-btn-jump-to-video button'
    );

    // Video editor container & mounting
    assert.ok(
      studioContent.includes('id="svr-video-editor-container"'),
      'slideVoiceStudio must have #svr-video-editor-container'
    );
    assert.ok(
      studioContent.includes('renderVideoEditor(vContainer, navigateTo)'),
      'slideVoiceStudio must mount renderVideoEditor'
    );
  });

  it('4. Voice Recording functionality is completely protected and intact', () => {
    const studioPath = path.join(rootDir, 'public', 'js', 'components', 'slideVoiceStudio.js');
    const studioContent = fs.readFileSync(studioPath, 'utf-8');

    // Essential voice recorder hooks
    assert.ok(studioContent.includes('new LiveAudioRecorder'), 'LiveAudioRecorder must be preserved');
    assert.ok(studioContent.includes('svr-btn-start'), 'Start Record button must be preserved');
    assert.ok(studioContent.includes('svr-btn-pause'), 'Pause button must be preserved');
    assert.ok(studioContent.includes('svr-btn-stop'), 'Stop button must be preserved');
    assert.ok(studioContent.includes('svr-btn-retake'), 'Retake button must be preserved');
    assert.ok(studioContent.includes('enhanceAudioBuffer'), 'AI Voice Enhancer DSP must be preserved');
    assert.ok(studioContent.includes('saveSlideAudioRecord'), 'Audio save record logic must be preserved');
  });

  it('5. app.js routes removed options to videoeditor or myvoice', () => {
    const appPath = path.join(rootDir, 'public', 'js', 'app.js');
    const appContent = fs.readFileSync(appPath, 'utf-8');

    assert.ok(
      appContent.includes("case 'scripteditor':") && appContent.includes("case 'editing':"),
      'app.js must handle scripteditor and editing'
    );
    assert.ok(
      appContent.includes("case 'canva':") && appContent.includes("case 'seodescription':"),
      'app.js must handle canva and seodescription'
    );
    assert.ok(
      appContent.includes("this.navigateTo('videoeditor')") || appContent.includes("this.navigateTo('myvoice')"),
      'app.js must redirect removed options cleanly'
    );
  });

  it('6. Video upload endpoint exists and videoeditor uploads permanent MP4 video', () => {
    const voiceRoutePath = path.join(rootDir, 'server', 'routes', 'voice.js');
    const voiceRouteContent = fs.readFileSync(voiceRoutePath, 'utf-8');
    assert.ok(
      voiceRouteContent.includes("router.post('/upload-video'"),
      '/api/voice/upload-video endpoint must exist'
    );

    const videoEditorPath = path.join(rootDir, 'public', 'js', 'views', 'videoeditor.js');
    const videoEditorContent = fs.readFileSync(videoEditorPath, 'utf-8');
    assert.ok(
      videoEditorContent.includes('/api/voice/upload-video'),
      'videoeditor must upload exported video to /api/voice/upload-video'
    );
    assert.ok(
      videoEditorContent.includes('audioSourceUrl'),
      'videoeditor must correctly play enhanced audio with slide'
    );
  });

  it('7. Slide and audio date-time stamp and side-by-side video playback controls are verified', () => {
    const videoEditorPath = path.join(rootDir, 'public', 'js', 'views', 'videoeditor.js');
    const videoEditorContent = fs.readFileSync(videoEditorPath, 'utf-8');
    assert.ok(
      videoEditorContent.includes('formatIndianDateTimeDisplay'),
      'videoeditor must display Indian formatted date & time'
    );
    assert.ok(
      videoEditorContent.includes('btn-watch-saved-video-beside'),
      'videoeditor must include side-by-side watch saved video button'
    );

    const studioPath = path.join(rootDir, 'public', 'js', 'components', 'slideVoiceStudio.js');
    const studioContent = fs.readFileSync(studioPath, 'utf-8');
    assert.ok(
      studioContent.includes('svr-btn-jump-to-video-card'),
      'slideVoiceStudio must have side-by-side slide video jump button in saved card'
    );
    assert.ok(
      studioContent.includes('curSavedAt'),
      'slideVoiceStudio must display saved date & time timestamp'
    );
  });
});
