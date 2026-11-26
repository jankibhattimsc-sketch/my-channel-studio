const { test, describe } = require('node:test');
const assert = require('node:assert');

if (typeof global.localStorage === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

if (typeof global.window === 'undefined') {
  global.window = {
    dispatchEvent: () => true,
    CustomEvent: class CustomEvent { constructor(type, detail) { this.type = type; this.detail = detail; } }
  };
}

describe('SLIDE PROMPT EXACT TOPIC GENERATION & ISOLATION', async () => {
  const { projectState, isContentMatchingTopic } = await import('../public/js/utils/projectState.js');
  const { generateClientNotebookLMPrompt } = await import('../public/js/utils/notebooklmPromptGenerator.js');

  const topicA = 'આંગણવાડી કાર્યકર અને તેડાગર નવી ભરતી ૨૦૨૬';
  const topicB = 'ગુજરાત પોલીસ કોન્સ્ટેબલ LRD નવી ભરતી ૨૦૨૬';

  test('1. Generated NotebookLM slide prompt embeds the exact selected topic and audience', () => {
    const resA = generateClientNotebookLMPrompt({ topic: topicA });
    assert.ok(resA.pptDeckPrompt.includes(`"${topicA}"`), 'Prompt must embed Topic A');
    assert.strictEqual(resA.topic, topicA);

    const resB = generateClientNotebookLMPrompt({ topic: topicB });
    assert.ok(resB.pptDeckPrompt.includes(`"${topicB}"`), 'Prompt must embed Topic B');
    assert.strictEqual(resB.topic, topicB);
  });

  test('2. activateTopicContext purges stale slide prompt from previous topic', async () => {
    // Activate Topic A
    await projectState.activateTopicContext('topic_A', topicA, { title: topicA });
    const projA = projectState.getActiveProject();
    assert.strictEqual(projA.topic, topicA);
    const promptTextA = typeof projA.slide.tool2Prompt === 'object' ? projA.slide.tool2Prompt.pptDeckPrompt : projA.slide.tool2Prompt;
    assert.ok(promptTextA.includes(topicA), 'Prompt must be for Topic A');

    // Now activate Topic B
    await projectState.activateTopicContext('topic_B', topicB, { title: topicB });
    const projB = projectState.getActiveProject();
    assert.strictEqual(projB.topic, topicB);
    const promptTextB = typeof projB.slide.tool2Prompt === 'object' ? projB.slide.tool2Prompt.pptDeckPrompt : projB.slide.tool2Prompt;
    assert.ok(promptTextB.includes(topicB), 'Prompt must be updated to Topic B');
    assert.strictEqual(projB.slide.tool2Prompt.topic, topicB);
  });

  test('3. setTopic adapts project slide prompt strictly to the new topic', () => {
    projectState.setTopic(topicA);
    const p1 = projectState.getActiveProject();
    assert.strictEqual(p1.topic, topicA);

    projectState.setTopic(topicB);
    const p2 = projectState.getActiveProject();
    assert.strictEqual(p2.topic, topicB);
    const promptTextB = typeof p2.slide.tool2Prompt === 'object' ? p2.slide.tool2Prompt.pptDeckPrompt : p2.slide.tool2Prompt;
    assert.ok(promptTextB.includes(topicB), 'tool2Prompt must be refreshed for Topic B');
  });

  test('4. isContentMatchingTopic correctly invalidates foreign prompt text', () => {
    const promptAnganwadi = 'Google NotebookLM "Slide Deck" માટે આંગણવાડી કાર્યકર અને તેડાગર નવી ભરતી ૨૦૨૬ ના નિયમો...';
    assert.strictEqual(isContentMatchingTopic(promptAnganwadi, topicA), true);
    assert.strictEqual(isContentMatchingTopic(promptAnganwadi, topicB), false, 'Anganwadi prompt must not match Police topic');
  });
});
