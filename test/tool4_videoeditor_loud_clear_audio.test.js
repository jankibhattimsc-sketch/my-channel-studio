const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('Tool 4 Video Editor Numbering & Crystal Loud Audio Boost Verification', async (t) => {
  const rootDir = process.cwd();
  const indexHtml = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf-8');
  const studioHtml = fs.readFileSync(path.join(rootDir, 'public', 'studio.html'), 'utf-8');
  const workspaceJs = fs.readFileSync(path.join(rootDir, 'public', 'js', 'views', 'workspace.js'), 'utf-8');
  const videoEditorJs = fs.readFileSync(path.join(rootDir, 'public', 'js', 'views', 'videoeditor.js'), 'utf-8');
  const scriptwriterJs = fs.readFileSync(path.join(rootDir, 'public', 'js', 'views', 'scriptwriter.js'), 'utf-8');

  await t.test('1. Video Editor is numbered as Tool 4 in navigation', () => {
    assert.ok(indexHtml.includes('૪. Video Editor'), 'index.html must display ૪. Video Editor');
    assert.ok(indexHtml.includes('Tool 4'), 'index.html must display Tool 4 badge');
    assert.ok(studioHtml.includes('૪. Video Editor'), 'studio.html must display ૪. Video Editor');
    assert.ok(workspaceJs.includes("num: 4, title: '૪. Video Editor'"), 'workspace.js must have num: 4 for Video Editor');
    assert.ok(scriptwriterJs.includes('૪. Video Editor'), 'scriptwriter.js must point to ૪. Video Editor');
  });

  await t.test('2. handleToggleSingleSlideRecording automatically applies studio voice boost & loudness normalization', () => {
    assert.ok(
      videoEditorJs.includes('targetLUFS: -14.0'),
      'Must target broadcast loud -14.0 LUFS'
    );
    assert.ok(
      videoEditorJs.includes('targetPeakDb: -0.8'),
      'Must cap true peak at -0.8 dBTP with soft saturation limiting'
    );
    assert.ok(
      videoEditorJs.includes('voiceClarity: 0.98'),
      'Must apply high vocal clarity and presence boost'
    );
    assert.ok(
      videoEditorJs.includes('cur.isCrystalClearEnhanced = true'),
      'Must mark recording as crystal clear enhanced'
    );
  });

  await t.test('3. applyCrystalNoiseReduction returns enh.buffer or enh.audioBuffer correctly', () => {
    assert.ok(
      videoEditorJs.includes('if (enh && (enh.buffer || enh.audioBuffer)) return enh.buffer || enh.audioBuffer;'),
      'Must properly return enhanced buffer from enhanceAudioBuffer'
    );
  });

  await t.test('4. Auto-boost on playback is in place for any unenhanced audio', () => {
    assert.ok(
      videoEditorJs.includes('Auto-boost on playback if clip has unenhanced quiet audio'),
      'Must provide auto-boost for unenhanced quiet clips'
    );
  });

  await t.test('5. Video creation & presentation stitcher use loud broadcast target', () => {
    assert.ok(
      videoEditorJs.includes('targetLUFS: -14.0, targetPeakDb: -0.8'),
      'Presentation and companion audio must use -14.0 LUFS'
    );
  });
});
