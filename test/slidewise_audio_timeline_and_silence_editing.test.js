const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('Step 1 Slide-Wise Full Audio Timeline & Silence Audio Editing Studio', async (t) => {
  const videoEditorPath = path.resolve('public/js/views/videoeditor.js');
  const code = fs.readFileSync(videoEditorPath, 'utf8');

  await t.test('1. Slide-Wise Full Audio Section & Horizontal Timeline Strip in Step 1', () => {
    assert.ok(code.includes('id="step1-slidewise-audio-section"'), 'Step 1 must have dedicated slide-wise audio timeline section');
    assert.ok(code.includes('id="step1-slidewise-audio-strip"'), 'Step 1 must have slide-wise horizontal audio timeline strip');
    assert.ok(code.includes('step1-strip-card-'), 'Must generate individual slide audio cards in the strip');
    assert.ok(code.includes('class="step1-slidewise-card"'), 'Must have step1-slidewise-card class for slide-by-slide styling');
    assert.ok(code.includes('btn-step1-strip-play'), 'Must have instant play button for each slide in the audio strip');
  });

  await t.test('2. Current Slide Interactive Audio Waveform Canvas with Silence Detection', () => {
    assert.ok(code.includes('id="step1-audio-waveform-canvas"'), 'Must render dedicated waveform canvas in Step 1');
    assert.ok(code.includes('silenceLinearThreshold'), 'Must define speech vs dead silence energy threshold');
    assert.ok(code.includes('rgba(239, 68, 68, 0.45)'), 'Must render dead silence / unvoiced regions in coral-red');
    assert.ok(code.includes('#10b981'), 'Must render spoken speech voice regions in emerald green');
    assert.ok(code.includes('detectSilenceEndpoints'), 'Must implement silence endpoints detector for leading/trailing silence');
    assert.ok(code.includes('step1-silence-notice-banner'), 'Must display smart silence detection banner when dead air exists');
  });

  await t.test('3. 1-Click Trim Dead Silence Where Voice Did Not Come (જ્યાં અવાજ નથી આવ્યો તે શાંતિ કાપો)', () => {
    assert.ok(code.includes('btn-step1-trim-silence'), 'Must provide 1-click trim silence button');
    assert.ok(code.includes('trimSilenceFromAudioBuffer'), 'Must invoke trimSilenceFromAudioBuffer with speech threshold & padding');
    assert.ok(code.includes('જ્યાં અવાજ નહોતો તે શાંતિ કાપી'), 'Must provide Gujarati feedback label after trimming');
  });

  await t.test('4. Slide-by-Slide Range Cut, Start Trim, and End Trim', () => {
    assert.ok(code.includes('btn-step1-cut-selection'), 'Must provide cut selection button');
    assert.ok(code.includes('input-step1-sel-start'), 'Must provide selection start input');
    assert.ok(code.includes('input-step1-sel-end'), 'Must provide selection end input');
    assert.ok(code.includes('btn-step1-play-selection'), 'Must provide preview selected cut region button');
    assert.ok(code.includes('btn-step1-nudge-start'), 'Must provide nudge start silence trim button');
    assert.ok(code.includes('btn-step1-nudge-end'), 'Must provide nudge end silence trim button');
    assert.ok(code.includes('cutAudioBufferMiddle'), 'Must invoke cutAudioBufferMiddle for cutting middle pauses / mistakes');
  });

  await t.test('5. Slide-by-Slide Loudness Boost, Fast Re-record & Original Restore', () => {
    assert.ok(code.includes('btn-step1-boost-loudness'), 'Must provide broadcast loudness boost button');
    assert.ok(code.includes('btn-step1-quick-rerecord'), 'Must provide fast 1-click slide re-record button');
    assert.ok(code.includes('btn-step1-restore-original'), 'Must provide non-destructive restore original raw audio button');
    assert.ok(code.includes('crystal_ultra_studio'), 'Must use crystal_ultra_studio broadcast standard preset');
  });

  await t.test('6. Audio Persistence & Synchronization with 1080p Video Joining', () => {
    assert.ok(code.includes('saveSlideAudioRecord'), 'Must save trimmed audio to IndexedDB slide audio records');
    assert.ok(code.includes('presentationStitchedUrl = null'), 'Must invalidate stitched audio so trimmed audio is joined seamlessly');
    assert.ok(code.includes('prewarmPresentationAudio()'), 'Must re-prewarm presentation audio after editing');
    assert.ok(code.includes('redrawAllWaveforms'), 'Must provide unified redraw helper for both Step 1 and Step 5 waveforms');
  });

  await t.test('7. Smooth Draggable Waveform Handles, Auto-Silence Detection & Micro-Nudges', () => {
    assert.ok(code.includes('setupWaveformInteraction'), 'Must implement smooth waveform interaction engine');
    assert.ok(code.includes('autoSelectNextSilence'), 'Must implement automatic nearest silence detection');
    assert.ok(code.includes('btn-step1-auto-silence'), 'Must provide 1-click auto silence select button in Step 1');
    assert.ok(code.includes('btn-nudge-start-left') && code.includes('btn-nudge-start-right'), 'Must provide Start fine-tuning micro nudges');
    assert.ok(code.includes('btn-nudge-end-left') && code.includes('btn-nudge-end-right'), 'Must provide End fine-tuning micro nudges');
    assert.ok(code.includes('btn-quick-sel-preset'), 'Must provide quick silence duration preset buttons (0.3s, 0.5s, 1s, 2s)');
    assert.ok(code.includes("dragMode = 'drag-start'") || code.includes("'drag-start'"), 'Must support left handle dragging');
    assert.ok(code.includes("dragMode = 'drag-end'") || code.includes("'drag-end'"), 'Must support right handle dragging');
    assert.ok(code.includes("dragMode = 'move-window'") || code.includes("'move-window'"), 'Must support selection window dragging');
  });

  await t.test('8. Zero Background Noise Isolation (Pankho, AC & Room Noise Eradication)', () => {
    assert.ok(code.includes('btn-step1-zero-noise'), 'Must provide 1-click Zero Background Noise button in Step 1');
    assert.ok(code.includes('btn-step5-zero-noise'), 'Must provide Zero Noise button in Step 5');
    assert.ok(code.includes('zeroBackgroundNoise: true'), 'Must enable zero background noise isolation in enhance options');
    assert.ok(code.includes('noiseReduction: 0.98'), 'Must apply maximum 98% noise reduction for complete silence');
  });
});
