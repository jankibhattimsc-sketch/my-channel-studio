const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('OPTION 5 VIDEO EDITOR AUDIO & SCRIPT PDF UPLOAD VERIFICATION', async (t) => {
  const videoEditorPath = path.join(__dirname, '../public/js/views/videoeditor.js');
  const scriptWriterPath = path.join(__dirname, '../public/js/views/scriptwriter.js');

  await t.test('1. videoeditor.js includes multi-tier resilient audio decoding from IndexedDB', () => {
    const code = fs.readFileSync(videoEditorPath, 'utf8');
    assert.ok(code.includes('getAllSlideAudioRecords'), 'Must call getAllSlideAudioRecords');
    assert.ok(code.includes('matched.blob.arrayBuffer'), 'Must decode from IndexedDB blob');
    assert.ok(code.includes('candidateDataUrl'), 'Must decode from base64 dataUrl');
    assert.ok(code.includes('audioCtx.decodeAudioData'), 'Must decode into AudioBuffer');
    assert.ok(code.includes('audioCtx.resume()'), 'Must resume suspended AudioContext');
  });

  await t.test('2. videoeditor.js connects audio nodes to masterGain, dest, and monitors', () => {
    const code = fs.readFileSync(videoEditorPath, 'utf8');
    assert.ok(code.includes('masterGain.connect(dest)'), 'masterGain must connect to destination for recording');
    assert.ok(code.includes('srcNode.connect(masterGain)'), 'Each slide srcNode must connect to masterGain');
    assert.ok(code.includes('srcNode.start(scheduledTime)'), 'Audio buffers must be scheduled sequentially');
  });

  await t.test('3. videoeditor.js sets up companion audio sync for saved video playback', () => {
    const code = fs.readFileSync(videoEditorPath, 'utf8');
    assert.ok(code.includes('stitchAudioBuffers'), 'Must import and use stitchAudioBuffers');
    assert.ok(code.includes('setupCompanionAudioSync'), 'Must configure companion audio sync');
    assert.ok(code.includes('playVideoWithFullSound'), 'Must have unmuted sound player helper');
    assert.ok(code.includes('main-saved-video-element'), 'Must target saved video element');
  });

  await t.test('4. scriptwriter.js has no constant reassignments during PDF upload', () => {
    const code = fs.readFileSync(scriptWriterPath, 'utf8');
    assert.ok(!code.includes('const hasPresentation = Boolean'), 'hasPresentation must not be declared as const');
    assert.ok(!code.includes('const hasImportedScript = Boolean'), 'hasImportedScript must not be declared as const');
    assert.ok(!code.includes('const importedMeta = project.slide'), 'importedMeta must not be declared as const');
    assert.ok(code.includes('let importedMeta ='), 'importedMeta must be declared with let');
    assert.ok(code.includes('checkHasPresentation()'), 'checkHasPresentation getter must be used');
  });
});
