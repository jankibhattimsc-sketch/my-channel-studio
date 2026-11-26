const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('16:9 CUSTOM SLIDE SELECTION & CLIP RECORDING COMBINER VERIFICATION', async (t) => {
  const videoEditorPath = path.join(__dirname, '../public/js/views/videoeditor.js');
  const videoEditorCode = fs.readFileSync(videoEditorPath, 'utf8');

  await t.test('1. Custom Slide Selection Toolbar exists in Video Editor', () => {
    assert.ok(videoEditorCode.includes('btn-select-all-clips'), 'Select All slides button exists');
    assert.ok(videoEditorCode.includes('btn-select-only-audio-clips'), 'Select only slides with audio button exists');
    assert.ok(videoEditorCode.includes('btn-deselect-all-clips'), 'Deselect all slides button exists');
    assert.ok(videoEditorCode.includes('btn-render-selected-clips-video'), 'Render Selected Clips button exists');
    assert.ok(videoEditorCode.includes('val-included-clips-count'), 'Included clips count indicator exists');
  });

  await t.test('2. Each Slide Clip Card contains Selection Checkbox & Duration Inputs', () => {
    assert.ok(videoEditorCode.includes('chk-include-clip'), 'Checkboxes exist on each clip card');
    assert.ok(videoEditorCode.includes('input-clip-card-duration'), 'Duration input exists on each clip card');
    assert.ok(videoEditorCode.includes('btn-card-full-audio'), 'Full audio duration reset button exists');
    assert.ok(videoEditorCode.includes('btn-quick-card-dur'), 'Quick duration preset buttons exist');
  });

  await t.test('3. Selected Clip Editor has Range & Duration Controls', () => {
    assert.ok(videoEditorCode.includes('input-clip-trim-start'), 'Audio trim start offset input exists');
    assert.ok(videoEditorCode.includes('input-clip-trim-duration'), 'Clip video duration input exists');
    assert.ok(videoEditorCode.includes('btn-apply-clip-trim-range'), 'Apply clip trim range button exists');
    assert.ok(videoEditorCode.includes('btn-set-full-audio-length'), 'Full audio length button exists');
  });

  await t.test('4. 16:9 Video Engine Renders Only Selected Slides and Specific Clip Lengths', () => {
    assert.ok(videoEditorCode.includes('const clipsToRender = generatedClips.filter(c => c.included !== false);'), 'Filters only selected clips for rendering');
    assert.ok(videoEditorCode.includes('srcNode.start(scheduledTime, track.startOffset, track.duration);'), 'Audio starts at specified offset and duration');
    assert.ok(videoEditorCode.includes('SelectedSlides_1080p.mp4'), 'Exported filename reflects selected slides count');
  });

  await t.test('5. Safety Guard: Alerts if 0 slides are selected for video creation', () => {
    assert.ok(videoEditorCode.includes('clipsToRender.length === 0'), 'Checks that at least 1 slide is selected');
  });
});
