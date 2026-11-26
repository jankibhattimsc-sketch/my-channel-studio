const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('48-HOUR SCREENSHOT PROMPT: HIGHEST VIEWS ➔ 5 BEST HIGH-EARNING TOPICS', () => {
  const rootDir = path.resolve(__dirname, '..');
  const homePath = path.join(rootDir, 'public', 'js', 'views', 'home.js');
  const homeContent = fs.readFileSync(homePath, 'utf8');

  it('1. Master Prompt is tailored to find videos with highest views and generate 5 best earning topics', () => {
    // 48-Hour screenshot instructions
    assert.ok(homeContent.includes('૪૮ કલાક') || homeContent.includes('48-Hour') || homeContent.includes('LAST 48 HOURS'), 'Must analyze 48-hour screenshot');
    
    // Step 1: Highest views detection
    assert.ok(homeContent.includes('સૌથી વધુ Views') || homeContent.includes('સૌથી વધારે Views') || homeContent.includes('HIGHEST VIEWS'), 'Must identify videos with highest views');

    // Step 2: 5 best earning topics
    assert.ok(homeContent.includes('૫ શ્રેષ્ઠ કમાણી') || homeContent.includes('BEST HIGH-EARNING') || homeContent.includes('High Ad RPM'), 'Must generate 5 best high-earning topics');

    // Numbered 1 to 5 output format
    assert.ok(homeContent.includes('1. [Gujarati Video Topic] (શ્રેષ્ઠ કમાણી • Highest Views ➔ High RPM)'), 'Must include 1 to 5 high earning format');
  });

  it('2. Prompt mode toggle buttons exist for 5 Best Earning (Default) and 10 Viral Topics', () => {
    assert.ok(homeContent.includes('btn-mode-earning5'), 'Must have button to select 5 Best Earning topics mode');
    assert.ok(homeContent.includes('btn-mode-viral10'), 'Must have button to select 10 Viral topics mode');
    assert.ok(homeContent.includes('activePromptMode'), 'Must track activePromptMode in home.js');
  });

  it('3. One-Click copy buttons copy the selected prompt mode', () => {
    assert.ok(homeContent.includes('btn-dash-copy-master-prompt'), 'Must have copy master prompt button');
    assert.ok(homeContent.includes('btn-dash-copy-master-prompt-shortcut'), 'Must have top shortcut copy button');
    assert.ok(homeContent.includes('btn-dash-copy-master-prompt-bottom'), 'Must have bottom copy button');
    assert.ok(homeContent.includes('buildMasterPrompt(activePromptMode)'), 'Copy must use activePromptMode');
  });

  it('4. Open ChatGPT button auto-copies the active master prompt', () => {
    assert.ok(homeContent.includes('buildMasterPrompt(activePromptMode)'), 'Auto-copy on ChatGPT link must use activePromptMode');
  });

  it('5. Server openaiService generates 5 topics when requested with mode earning5 or count 5', async () => {
    const openaiService = require('../server/services/openaiService');
    const res5 = await openaiService.generateViralTopics10({
      channelContext: { title: 'Gyan Yatra', handle: '@gyan.yatra1' },
      mode: 'earning5',
      count: 5
    });

    assert.ok(res5.success, 'Response must be successful');
    assert.strictEqual(res5.topics.length, 5, 'Must return exactly 5 topics');
    res5.topics.forEach(t => {
      assert.ok(typeof t === 'string' && t.length > 5, 'Topic must be a valid non-empty string');
    });

    // Default without count must return 10 topics for backward compatibility
    const res10 = await openaiService.generateViralTopics10({
      channelContext: { title: 'Gyan Yatra', handle: '@gyan.yatra1' }
    });
    assert.strictEqual(res10.topics.length, 10, 'Default must return 10 topics for backward compatibility');
  });
});
