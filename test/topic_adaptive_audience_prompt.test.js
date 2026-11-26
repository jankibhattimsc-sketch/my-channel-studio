const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('Topic-Adaptive Audience and NotebookLM Prompt Architecture Tests', async (t) => {
  const { deriveAudienceFromTopic, generateClientNotebookLMPrompt, classifyTopicDomain } = await import('../public/js/utils/notebooklmPromptGenerator.js');

  await t.test('1. deriveAudienceFromTopic correctly derives audience for Government Employees / DA / Pension', () => {
    const topic = 'ગુજરાત કર્મચારી પગાર અને DA મોંઘવારી ભથ્થું પરિપત્ર ૨૦૨૬';
    const audience = deriveAudienceFromTopic(topic);
    assert.ok(audience.includes('સરકારી કર્મચારીઓ') || audience.includes('પેન્શનર્સ'), `Expected audience to include govt employees, got: ${audience}`);
  });

  await t.test('2. deriveAudienceFromTopic correctly derives audience for Farmers / Agriculture', () => {
    const topic = 'પીએમ કિસાન ૨૧મો હપ્તો અને નવી ખેડૂત ખાતર સબસિડી ૨૦૨૬';
    const audience = deriveAudienceFromTopic(topic);
    assert.ok(audience.includes('ખેડૂત') || audience.includes('ધરતીપુત્રો'), `Expected audience to include farmers, got: ${audience}`);
  });

  await t.test('3. deriveAudienceFromTopic correctly derives audience for Women / Anganwadi', () => {
    const topic = 'આંગણવાડી કાર્યકર અને તેડાગર બહેનો માટે નવી જાહેરાત ૨૦૨૬';
    const audience = deriveAudienceFromTopic(topic);
    assert.ok(audience.includes('બહેનો') || audience.includes('મહિલા'), `Expected audience to include women, got: ${audience}`);
  });

  await t.test('4. deriveAudienceFromTopic correctly derives audience for Competitive Exams / Recruitment', () => {
    const topic = 'ગુજરાત પોલીસ કોન્સ્ટેબલ LRD અને PSI ૧૨૦૦૦ જગ્યાઓ ભરતી';
    const audience = deriveAudienceFromTopic(topic);
    assert.ok(audience.includes('પરીક્ષાર્થીઓ') || audience.includes('નોકરી'), `Expected audience to include job aspirants, got: ${audience}`);
  });

  await t.test('5. deriveAudienceFromTopic correctly derives audience for Students / GSEB Board', () => {
    const topic = 'ધોરણ ૧૦ અને ૧૨ બોર્ડ પરીક્ષા પરિણામ અને નવો સિલેબસ';
    const audience = deriveAudienceFromTopic(topic);
    assert.ok(audience.includes('વિદ્યાર્થીઓ'), `Expected audience to include students, got: ${audience}`);
  });

  await t.test('6. generateClientNotebookLMPrompt automatically updates audience in prompt text', () => {
    const farmerTopic = 'મુખ્યમંત્રી પાક સંરક્ષણ યોજના અને ખેડૂત સોલાર પંપ સબસિડી';
    const result = generateClientNotebookLMPrompt({ topic: farmerTopic, audience: 'auto' });

    assert.ok(result.audienceText.includes('ખેડૂત') || result.audienceText.includes('ધરતીપુત્રો'), `Expected farmer audience, got: ${result.audienceText}`);
    assert.ok(result.pptDeckPrompt.includes(result.audienceText), 'Prompt must embed the auto-derived audience');
    assert.ok(result.pptDeckPrompt.includes('શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF)'), 'Must preserve pure white background design');
  });

  await t.test('7. Workspace & Navigation visual check: 48h main at start, Idea at the end', () => {
    const html = fs.readFileSync(path.join(__dirname, '../public/index.html'), 'utf8');
    assert.ok(!html.includes('id="nav-projects"'), 'nav-projects should be removed from sidebar navigation');
    assert.ok(html.includes('id="nav-workspace"'), 'nav-workspace must be present');
    assert.ok(html.includes('id="nav-topics"'), 'nav-topics must be present');
    assert.ok(html.includes('૧. 48h YouTube AI Studio'), 'Must have 48h YouTube AI Studio as first tool');

    // Idea must be placed at the end (after Slide Prompts and tools pipeline)
    const topicsIdx = html.indexOf('id="nav-topics"');
    const slidesIdx = html.indexOf('id="nav-slideprompts"');
    assert.ok(topicsIdx > slidesIdx, 'Idea must be placed at the end, after Slide Prompts');
  });
});

