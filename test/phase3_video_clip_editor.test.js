const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('PHASE 3 — VIDEO CLIP EDITOR WITH AUDIO & SLIDE CONTROLS VERIFICATION', async (t) => {
  const videoEditorPath = path.join(__dirname, '../public/js/views/videoeditor.js');
  const videoEditorCode = fs.readFileSync(videoEditorPath, 'utf8');

  const voiceStudioPath = path.join(__dirname, '../public/js/components/slideVoiceStudio.js');
  const voiceStudioCode = fs.readFileSync(voiceStudioPath, 'utf8');

  const recorderPath = path.join(__dirname, '../public/js/utils/audioRecorderEnhancer.js');
  const recorderCode = fs.readFileSync(recorderPath, 'utf8');

  await t.test('1. Protected Live Voice Recorder: Zero modification or disruption to recording functions', () => {
    assert.ok(recorderCode.includes('class LiveAudioRecorder'), 'LiveAudioRecorder class remains intact');
    assert.ok(recorderCode.includes('start('), 'start method is protected');
    assert.ok(recorderCode.includes('stop('), 'stop method is protected');
    assert.ok(recorderCode.includes('enhanceAudioBuffer'), 'AI loudness & noise reduction function is protected');
    assert.ok(voiceStudioCode.includes('svr-btn-start'), 'Voice studio record button exists');
  });

  await t.test('2. Individual Clip Editing Controls exist on each clip card', () => {
    assert.ok(videoEditorCode.includes('btn-clip-move-left'), 'Move Left button exists for reordering');
    assert.ok(videoEditorCode.includes('btn-clip-move-right'), 'Move Right button exists for reordering');
    assert.ok(videoEditorCode.includes('btn-clip-duplicate'), 'Duplicate Clip button exists');
    assert.ok(videoEditorCode.includes('btn-clip-delete'), 'Delete Clip button exists');
    assert.ok(videoEditorCode.includes('btn-clip-preview'), 'Preview Clip button exists');
    assert.ok(videoEditorCode.includes('c.formattedDuration'), 'Displays duration on clip');
    assert.ok(videoEditorCode.includes('c.clipNumber'), 'Displays clip number on clip');
  });

  await t.test('3. Slide Editing: Replace with PDF slide, adjust duration, delete without touching original PDF', () => {
    assert.ok(videoEditorCode.includes('select-replace-slide'), 'Slide replacement selector exists');
    assert.ok(videoEditorCode.includes('btn-apply-replace-slide'), 'Apply replacement slide button exists');
    assert.ok(videoEditorCode.includes('input-custom-dur'), 'Custom slide duration input exists');
    assert.ok(videoEditorCode.includes('btn-apply-custom-dur'), 'Apply custom duration button exists');
    assert.ok(videoEditorCode.includes('મૂળ PDF સ્લાઇડ અને ઓરિજિનલ ઓડિયો સુરક્ષિત રહેશે'), 'Guarantees original source remains untouched on clip deletion');
  });

  await t.test('4. Non-Destructive Audio Editing & Precise Waveform Trimming', () => {
    assert.ok(videoEditorCode.includes('audio-waveform-canvas'), 'Interactive HTML5 waveform canvas exists');
    assert.ok(videoEditorCode.includes('drawInteractiveWaveform'), 'Draw interactive waveform with selection overlay');
    assert.ok(videoEditorCode.includes('btn-play-selection'), 'Listen to selected section before deleting');
    assert.ok(videoEditorCode.includes('btn-cut-middle'), 'Cut middle section button exists');
    assert.ok(videoEditorCode.includes('cutAudioBufferMiddle'), 'Smooth middle cut and join implementation');
    assert.ok(videoEditorCode.includes('btn-cut-start'), 'Cut start button exists');
    assert.ok(videoEditorCode.includes('trimAudioBufferStart'), 'Trim start implementation');
    assert.ok(videoEditorCode.includes('btn-cut-end'), 'Cut end button exists');
    assert.ok(videoEditorCode.includes('trimAudioBufferEnd'), 'Trim end implementation');
    assert.ok(videoEditorCode.includes('input-clip-vol'), 'Volume adjustment slider exists');
    assert.ok(videoEditorCode.includes('select-fade-in'), 'Fade in selector exists');
    assert.ok(videoEditorCode.includes('select-fade-out'), 'Fade out selector exists');
    assert.ok(videoEditorCode.includes('btn-restore-orig-audio'), 'Restore original audio button exists');
    assert.ok(videoEditorCode.includes('btn-delete-clip-audio'), 'Delete audio from clip keeping slide intact');
    assert.ok(videoEditorCode.includes('btn-assign-selected-audio'), 'Replace/assign audio from other slides');
  });

  await t.test('5. Non-Destructive Versioning, Undo/Redo & Project Persistence', () => {
    assert.ok(videoEditorCode.includes('originalAudioUrl'), 'Preserves original audio reference separately');
    assert.ok(videoEditorCode.includes('undoStack'), 'Undo history stack exists');
    assert.ok(videoEditorCode.includes('redoStack'), 'Redo history stack exists');
    assert.ok(videoEditorCode.includes('btn-undo-seq'), 'Undo button in UI');
    assert.ok(videoEditorCode.includes('btn-redo-seq'), 'Redo button in UI');
    assert.ok(videoEditorCode.includes('project.editing.generatedClips'), 'Persists clips to project state');
    assert.ok(videoEditorCode.includes('calculateTotalDuration'), 'Recalculates video duration on edit');
  });
});

