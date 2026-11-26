const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('5-Step Automated Video Production Workflow Architecture & Implementation', async (t) => {
  const videoEditorPath = path.resolve('public/js/views/videoeditor.js');
  const code = fs.readFileSync(videoEditorPath, 'utf8');

  await t.test('1. Step Navigation & 5-Step Progress Indicator UI', () => {
    // Stepper navigation container and steps
    assert.ok(code.includes('wf-stepper-nav'), 'Must contain 5-step navigation stepper container');
    assert.ok(code.includes('wf-step-btn-1'), 'Must have Step 1 button in stepper');
    assert.ok(code.includes('wf-step-btn-2'), 'Must have Step 2 button in stepper');
    assert.ok(code.includes('wf-step-btn-3'), 'Must have Step 3 button in stepper');
    assert.ok(code.includes('wf-step-btn-4'), 'Must have Step 4 button in stepper');
    assert.ok(code.includes('wf-step-btn-5'), 'Must have Step 5 button in stepper');

    // All 5 step panels must exist in DOM
    assert.ok(code.includes('panel-wf-step-1'), 'Must contain panel for Step 1');
    assert.ok(code.includes('panel-wf-step-2'), 'Must contain panel for Step 2');
    assert.ok(code.includes('panel-wf-step-3'), 'Must contain panel for Step 3');
    assert.ok(code.includes('panel-wf-step-4'), 'Must contain panel for Step 4');
    assert.ok(code.includes('panel-wf-step-5'), 'Must contain panel for Step 5');

    // Switch step handler
    assert.ok(code.includes('switchWorkflowStep'), 'Must implement switchWorkflowStep function');
    assert.ok(code.includes('currentWorkflowStep'), 'Must maintain currentWorkflowStep state');
  });

  await t.test('2. Step 1: Slide-wise Voice Recording Features', () => {
    // Slide sequence and teleprompter
    assert.ok(code.includes('step1-slide-card-'), 'Must display cards for slide sequence');
    assert.ok(code.includes('btn-step1-start-record-'), 'Must have record trigger for each slide');
    assert.ok(code.includes('btn-step1-pause-record'), 'Must support pause recording');
    assert.ok(code.includes('btn-step1-resume-record'), 'Must support resume recording');
    assert.ok(code.includes('btn-step1-stop-record'), 'Must support stop recording');

    // Playback, re-record, delete, duration
    assert.ok(code.includes('btn-step1-play-'), 'Must provide play recorded audio button');
    assert.ok(code.includes('btn-step1-rerecord-'), 'Must provide re-record button');
    assert.ok(code.includes('btn-step1-delete-'), 'Must provide delete audio button');
    assert.ok(code.includes('step1-dur-'), 'Must display audio recording duration');
    assert.ok(code.includes('saveSlideAudioRecord'), 'Must save each slide audio separately');
  });

  await t.test('3. Step 2: Crystal Noise Removal & Before/After Comparison', () => {
    // Noise removal studio
    assert.ok(code.includes('btn-clean-all-step2'), 'Must have batch clean button');
    assert.ok(code.includes('btn-clean-single-step2-'), 'Must have individual slide clean button');
    assert.ok(code.includes('btn-play-step2-raw-'), 'Must have Before (Raw) audio preview button');
    assert.ok(code.includes('btn-play-step2-clean-'), 'Must have After (Cleaned) audio preview button');
    assert.ok(code.includes('applyCrystalNoiseReduction'), 'Must implement DSP noise reduction service');

    // Audio DSP checks (notch, bandpass, silence gating, loudness)
    assert.ok(code.includes('createBiquadFilter'), 'Must use Biquad filters for AC hum removal');
    assert.ok(code.includes('notch'), 'Must apply electrical hum notch filtering (50/60Hz)');
    assert.ok(code.includes('createDynamicsCompressor'), 'Must apply dynamics compressor for broadcast voice');
  });

  await t.test('4. Step 3: Slide + Voice Synchronization & Slide Durations', () => {
    // Slide duration matching
    assert.ok(code.includes('input-sync-duration-'), 'Must allow setting slide duration from audio');
    assert.ok(code.includes('btn-nudge-timing-'), 'Must provide timing nudge buttons');
    assert.ok(code.includes('select-sync-transition-'), 'Must allow configurable slide transitions');
    assert.ok(code.includes('btn-preview-slide-sync-'), 'Must preview individual slide + audio sync');
    assert.ok(code.includes('btn-preview-full-sync'), 'Must provide full synchronized slideshow preview');
    assert.ok(code.includes('step3-missing-badge-'), 'Must detect and flag missing audio or unmatched slides');
  });

  await t.test('5. Step 4: Complete Video Clip Generation & 1080p Rendering Pipeline', () => {
    // 16:9 YouTube & 9:16 Shorts
    assert.ok(code.includes('select-video-aspect-ratio'), 'Must allow 16:9 and 9:16 aspect ratio selection');
    assert.ok(code.includes('select-video-bgm'), 'Must provide optional background music (BGM)');
    assert.ok(code.includes('input-video-bgm-vol'), 'Must control BGM volume');
    assert.ok(code.includes('input-video-voice-vol'), 'Must control voice volume');

    // Canvas rendering, progress bar, MP4 export
    assert.ok(code.includes('live-render-canvas'), 'Must have live rendering canvas');
    assert.ok(code.includes('video-render-progress'), 'Must show rendering progress bar & percentage');
    assert.ok(code.includes('btn-create-final-video'), 'Must trigger complete video rendering');
    assert.ok(code.includes('lastExportedVideoUrl'), 'Must persist generated video to project editing state');
  });

  await t.test('6. Step 5: Final Video Editing Tool & Multi-track Timeline', () => {
    // Video player & timeline
    assert.ok(code.includes('main-saved-video-element'), 'Must provide main video preview player');
    assert.ok(code.includes('timeline'), 'Must provide editing timeline');
    assert.ok(code.includes('btn-trim-start'), 'Must allow trimming beginning');
    assert.ok(code.includes('btn-trim-end'), 'Must allow trimming ending');
    assert.ok(code.includes('btn-split-clip'), 'Must allow cut and split clips');
    assert.ok(code.includes('btn-delete-split-clip'), 'Must allow deleting unwanted sections');

    // Overlays, intro/outro, WhatsApp share
    assert.ok(code.includes('btn-add-text-overlay'), 'Must support text overlays');
    assert.ok(code.includes('btn-add-watermark'), 'Must support image/watermark overlays');
    assert.ok(code.includes('btn-share-whatsapp-direct'), 'Must support direct WhatsApp sharing');
    assert.ok(code.includes('btn-download-exported-video'), 'Must provide MP4 download button');
  });

  await t.test('7. Backward Compatibility & Test IDs Preservation', () => {
    // Ensure all critical IDs required by other tests remain intact
    assert.ok(code.includes('btn-render-selected-clips-video'), 'Must preserve legacy render button ID');
    assert.ok(code.includes('input-preview-slide-duration'), 'Must preserve preview slide duration input ID');
    assert.ok(code.includes('main-video-stage'), 'Must preserve main-video-stage ID');
    assert.ok(code.includes('audio-waveform-canvas'), 'Must preserve audio-waveform-canvas ID');
    assert.ok(code.includes('selected-clip-editor'), 'Must preserve selected-clip-editor ID');
    assert.ok(code.includes('btn-create-video-main'), 'Must preserve btn-create-video-main ID');
  });
});

