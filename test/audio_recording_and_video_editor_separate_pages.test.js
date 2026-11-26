const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('AUDIO RECORDING SLIDE-WISE LIVE RECORDER & VIDEO/AUDIO EDITOR SEPARATE PAGES', () => {
  const rootDir = process.cwd();

  test('1. index.html defines distinct navigation items for Live Audio (#myvoice, Step 4) and Video Editor (#videoeditor, Step 5)', () => {
    const indexPath = path.join(rootDir, 'public', 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    // Live Audio item
    assert.ok(indexContent.includes('id="nav-myvoice"'), 'index.html must have id="nav-myvoice"');
    assert.ok(indexContent.includes('href="#myvoice"'), 'index.html must link to #myvoice');
    assert.ok(indexContent.includes('data-view="myvoice"'), 'index.html must have data-view="myvoice"');
    assert.ok(indexContent.includes('૪. Live Audio'), 'index.html must label Step 4 as Live Audio');

    // Video Editor item
    assert.ok(indexContent.includes('id="nav-videoeditor"'), 'index.html must have id="nav-videoeditor"');
    assert.ok(indexContent.includes('href="#videoeditor"'), 'index.html must link to #videoeditor');
    assert.ok(indexContent.includes('data-view="videoeditor"'), 'index.html must have data-view="videoeditor"');
    assert.ok(indexContent.includes('૫. Video Editor'), 'index.html must label Step 5 as Video Editor');

    // Mobile nav has both distinct items
    assert.ok(indexContent.includes('૪.Audio'), 'Mobile nav must have ૪.Audio');
    assert.ok(indexContent.includes('૫.Video'), 'Mobile nav must have ૫.Video');
  });

  test('2. studio.html defines distinct navigation items for Live Audio (Step 4) and Video Editor (Step 5)', () => {
    const studioPath = path.join(rootDir, 'public', 'studio.html');
    const studioContent = fs.readFileSync(studioPath, 'utf-8');

    assert.ok(studioContent.includes('id="nav-myvoice"'), 'studio.html must have id="nav-myvoice"');
    assert.ok(studioContent.includes('data-view="myvoice"'), 'studio.html must have data-view="myvoice"');
    assert.ok(studioContent.includes('id="nav-videoeditor"'), 'studio.html must have id="nav-videoeditor"');
    assert.ok(studioContent.includes('data-view="videoeditor"'), 'studio.html must have data-view="videoeditor"');
  });

  test('3. app.js routes myvoice/voice to renderMyVoice and videoeditor/editing to renderVideoEditor separately', () => {
    const appPath = path.join(rootDir, 'public', 'js', 'app.js');
    const appContent = fs.readFileSync(appPath, 'utf-8');

    // myvoice routing
    assert.ok(
      appContent.includes('renderMyVoice(this.container, navCallback)'),
      'app.js must render renderMyVoice directly without redirecting'
    );
    // videoeditor routing
    assert.ok(
      appContent.includes('renderVideoEditor(this.container, navCallback)'),
      'app.js must render renderVideoEditor'
    );
  });

  test('4. scriptwriter.js advances to Step 4 (myvoice) and videoeditor returns to Step 4 (myvoice)', () => {
    const scriptPath = path.join(rootDir, 'public', 'js', 'views', 'scriptwriter.js');
    const scriptContent = fs.readFileSync(scriptPath, 'utf-8');

    assert.ok(scriptContent.includes("safeNavigate('myvoice')"), 'scriptwriter must navigate to myvoice');
    assert.ok(scriptContent.includes('૪. સ્લાઇડ ઓડિયો રેકોર્ડર'), 'scriptwriter button must indicate Step 4');

    const videoeditorPath = path.join(rootDir, 'public', 'js', 'views', 'videoeditor.js');
    const videoContent = fs.readFileSync(videoeditorPath, 'utf-8');

    assert.ok(videoContent.includes("navigateTo('myvoice')"), 'videoeditor back button must navigate to myvoice');
    assert.ok(videoContent.includes('← ૪. સ્લાઇડ ઓડિયો રેકોર્ડર'), 'videoeditor back button text must point to Step 4');
    assert.ok(videoContent.includes("navigateTo('thumbnails')"), 'videoeditor next button must navigate to thumbnails');
  });

  test('5. workspace.js defines Step 4 (voice) and Step 5 (videoeditor) in PRODUCTION_SECTIONS', () => {
    const wsPath = path.join(rootDir, 'public', 'js', 'views', 'workspace.js');
    const wsContent = fs.readFileSync(wsPath, 'utf-8');

    assert.ok(wsContent.includes("id: 'voice', num: 4"), 'workspace.js must have voice as num: 4');
    assert.ok(wsContent.includes("id: 'videoeditor', num: 5"), 'workspace.js must have videoeditor as num: 5');
    assert.ok(wsContent.includes("renderMyVoice(stageContainer"), 'workspace must mount renderMyVoice for voice section');
    assert.ok(wsContent.includes("renderVideoEditor(stageContainer"), 'workspace must mount renderVideoEditor for videoeditor section');
  });

  test('6. Audio recording functions in slideVoiceStudio and myvoice remain 100% intact', () => {
    const svsPath = path.join(rootDir, 'public', 'js', 'components', 'slideVoiceStudio.js');
    const svsContent = fs.readFileSync(svsPath, 'utf-8');

    assert.ok(svsContent.includes('LiveAudioRecorder'), 'slideVoiceStudio must have LiveAudioRecorder');
    assert.ok(svsContent.includes('enhanceAudioBuffer'), 'slideVoiceStudio must have enhanceAudioBuffer');
    assert.ok(svsContent.includes('data-tab="recorder"'), 'slideVoiceStudio must have recorder tab');
    assert.ok(svsContent.includes('inspectAudioQuality'), 'slideVoiceStudio must have inspectAudioQuality');
    assert.ok(svsContent.includes('MultitrackAudioEngine'), 'slideVoiceStudio must have MultitrackAudioEngine');
  });

  test('7. Video and audio editing functions in videoeditor remain 100% intact', () => {
    const vidPath = path.join(rootDir, 'public', 'js', 'views', 'videoeditor.js');
    const vidContent = fs.readFileSync(vidPath, 'utf-8');

    assert.ok(vidContent.includes('audio-waveform-canvas'), 'videoeditor must have waveform canvas');
    assert.ok(vidContent.includes('btn-cut-start'), 'videoeditor must have trim start');
    assert.ok(vidContent.includes('btn-cut-end'), 'videoeditor must have trim end');
    assert.ok(vidContent.includes('chk-video-enhance-audio') || vidContent.includes('chk-top-enhance-audio'), 'videoeditor must have AI audio enhance');
    assert.ok(vidContent.includes('live-render-canvas'), 'videoeditor must have 1080p canvas video rendering');
    assert.ok(vidContent.includes('shareToWhatsApp'), 'videoeditor must have direct WhatsApp share');
  });
});

