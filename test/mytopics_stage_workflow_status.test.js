const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('Tool 3 (My Topics): Clickable Stage Workflow Status (સ્લાઇડ, સ્ક્રિપ્ટ, ઓડિયો, વિડીયો)', async (t) => {
  const mytopicsPath = path.join(__dirname, '../public/js/views/mytopics.js');
  assert.ok(fs.existsSync(mytopicsPath), 'mytopics.js must exist');
  const viewCode = fs.readFileSync(mytopicsPath, 'utf8');

  await t.test('1. Features 4 interactive, clickable stage cards for each topic', () => {
    assert.ok(viewCode.includes('સ્લાઇડ (Slide)'), 'Must display Slide stage label');
    assert.ok(viewCode.includes('સ્ક્રિપ્ટ (Script)'), 'Must display Script stage label');
    assert.ok(viewCode.includes('ઓડિયો (Audio)'), 'Must display Audio stage label');
    assert.ok(viewCode.includes('વિડીયો (Video)'), 'Must display Video stage label');
    assert.ok(viewCode.includes('સ્લાઇડ બની ગઈ'), 'Must show slide completion text');
    assert.ok(viewCode.includes('સ્ક્રિપ્ટ બની ગઈ'), 'Must show script completion text');
    assert.ok(viewCode.includes('ઓડિયો બની ગયો'), 'Must show audio completion text');
    assert.ok(viewCode.includes('વિડીયો બની ગયો'), 'Must show video completion text');
  });

  await t.test('2. Stage pills are wired with click handlers to open matching tools with topic active', () => {
    assert.ok(viewCode.includes('btn-step-jump'), 'Must have btn-step-jump class');
    assert.ok(viewCode.includes('data-target="slideprompts"'), 'Must target slideprompts');
    assert.ok(viewCode.includes('data-target="scriptwriter"'), 'Must target scriptwriter');
    assert.ok(viewCode.includes('data-target="videoeditor"'), 'Must target videoeditor');
    assert.ok(viewCode.includes('activateTopicContext'), 'Must activate topic context on stage jump');
  });

  await t.test('3. Provides toggle status buttons to mark stage as completed (બની ગઈ / બની ગયો) or pending', () => {
    assert.ok(viewCode.includes('btn-toggle-stage'), 'Must have stage toggle button class');
    assert.ok(viewCode.includes('data-stage="slide"'), 'Must support slide stage toggle');
    assert.ok(viewCode.includes('data-stage="script"'), 'Must support script stage toggle');
    assert.ok(viewCode.includes('data-stage="audio"'), 'Must support audio stage toggle');
    assert.ok(viewCode.includes('data-stage="video"'), 'Must support video stage toggle');
    assert.ok(viewCode.includes('persistTopics()'), 'Must persist updated topic stages');
  });

  await t.test('4. Displays current ongoing work description and progress bar', () => {
    assert.ok(viewCode.includes('કયું કામ ચાલુ છે:'), 'Must show current ongoing work header');
    assert.ok(viewCode.includes('currentWorkStatusText'), 'Must compute ongoing work status text');
    assert.ok(viewCode.includes('progressPercent'), 'Must calculate progress percentage');
    assert.ok(viewCode.includes('completedCount'), 'Must calculate completed stages count');
  });
});
