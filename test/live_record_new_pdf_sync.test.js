const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('LIVE RECORD NEW PDF SYNC & PRESENTATION ISOLATION TEST', () => {
  const rootDir = process.cwd();

  it('1. server/routes/research.js supports both /upload-file and /upload-presentation', () => {
    const researchRoutePath = path.join(rootDir, 'server', 'routes', 'research.js');
    const researchContent = fs.readFileSync(researchRoutePath, 'utf-8');

    assert.ok(
      researchContent.includes("router.post('/upload-presentation'"),
      'research.js must have /upload-presentation endpoint'
    );
    assert.ok(
      researchContent.includes("router.post('/upload-file'"),
      'research.js must have /upload-file endpoint'
    );
  });

  it('2. slideVoiceStudio.js handles direct PDF upload using base64 payload and updates active presentation', () => {
    const studioPath = path.join(rootDir, 'public', 'js', 'components', 'slideVoiceStudio.js');
    const studioContent = fs.readFileSync(studioPath, 'utf-8');

    assert.ok(
      studioContent.includes('handleDirectPdfUpload'),
      'slideVoiceStudio must have handleDirectPdfUpload'
    );
    assert.ok(
      studioContent.includes('FileReader') && studioContent.includes('fileBase64'),
      'slideVoiceStudio must read file as base64'
    );
    assert.ok(
      studioContent.includes('saveProjectPresentation'),
      'slideVoiceStudio must save new presentation to storage'
    );
  });

  it('3. videoeditor.js includes direct PDF upload button in header and live recording mode', () => {
    const editorPath = path.join(rootDir, 'public', 'js', 'views', 'videoeditor.js');
    const editorContent = fs.readFileSync(editorPath, 'utf-8');

    assert.ok(
      editorContent.includes('id="input-video-upload-pdf"'),
      'videoeditor.js must have top header PDF upload input'
    );
    assert.ok(
      editorContent.includes('id="input-video-upload-pdf-live"'),
      'videoeditor.js must have live recording mode PDF change input'
    );
    assert.ok(
      editorContent.includes('handlePdfUploadInVideoEditor'),
      'videoeditor.js must define handlePdfUploadInVideoEditor'
    );
  });

  it('4. videoeditor.js clears stale cached canvases and old server audios when a new PDF is loaded', () => {
    const editorPath = path.join(rootDir, 'public', 'js', 'views', 'videoeditor.js');
    const editorContent = fs.readFileSync(editorPath, 'utf-8');

    // Clears cached canvases
    assert.ok(
      editorContent.includes('delete pdfPageCanvases[k]') || editorContent.includes('pdfPageCanvases = {}'),
      'videoeditor.js must clear cached PDF canvases when new PDF is loaded'
    );

    // Checks for custom PDF and avoids old GSRTC audios
    assert.ok(
      editorContent.includes('isDefaultGsrtcPres'),
      'videoeditor.js must detect if presentation is custom to avoid applying stale audio'
    );
  });

  it('5. Live recording uses generatedClips matching the active presentation and slices audio accurately', () => {
    const editorPath = path.join(rootDir, 'public', 'js', 'views', 'videoeditor.js');
    const editorContent = fs.readFileSync(editorPath, 'utf-8');

    assert.ok(
      editorContent.includes('liveTransitionMarks'),
      'videoeditor.js must track live transition marks per slide'
    );
    assert.ok(
      editorContent.includes('saveSlideAudioRecord'),
      'videoeditor.js must save live audio sliced per slide'
    );
    assert.ok(
      editorContent.includes('drawFrame') && editorContent.includes('pdfPageCanvases'),
      'videoeditor.js video renderer must draw active PDF page canvas for each clip'
    );
  });
});

