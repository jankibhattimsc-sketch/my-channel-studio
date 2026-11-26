const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('CHATGPT 4-5 SUB-TOPICS SEARCH TOOL (BELOW 48H SECTION)', () => {
  const rootDir = path.resolve(__dirname, '..');
  const homePath = path.join(rootDir, 'public', 'js', 'views', 'home.js');
  const homeContent = fs.readFileSync(homePath, 'utf8');

  it('1. Placement: Tool section exists directly below the 48-Hour section', () => {
    assert.ok(homeContent.includes('id="section-topic-subtopics-search"'), 'Must have section-topic-subtopics-search');
    
    const idx48h = homeContent.indexOf('YouTube Studio 48-Hour Screenshot Analysis');
    const idxSubtopic = homeContent.indexOf('id="section-topic-subtopics-search"');
    assert.ok(idx48h !== -1, '48h section must exist');
    assert.ok(idxSubtopic !== -1, 'Subtopic section must exist');
    assert.ok(idxSubtopic > idx48h, 'Subtopic search tool must be placed BELOW 48h section');
  });

  it('2. Inputs: Topic input field and 4 or 5 count selector exist', () => {
    assert.ok(homeContent.includes('id="input-subtopic-main-topic"'), 'Must have topic input field');
    assert.ok(homeContent.includes('id="select-subtopic-count"'), 'Must have 4 or 5 count selector');
    assert.ok(homeContent.includes('૪ વિષયો (4 Topics)'), 'Must offer 4 topics option');
    assert.ok(homeContent.includes('૫ વિષયો (5 Topics'), 'Must offer 5 topics option');
  });

  it('3. Prompt Generator: Prompts ChatGPT for 4-5 sub-topics on exact input topic with no scripts', () => {
    assert.ok(homeContent.includes('id="textarea-subtopic-search-prompt"'), 'Must have prompt textarea');
    assert.ok(homeContent.includes('buildSubTopicsSearchPrompt'), 'Must have prompt builder function');
    assert.ok(homeContent.includes('LIVE WEB SEARCH &'), 'Prompt must instruct live web search');
    assert.ok(homeContent.includes('VIRAL SUB-TOPICS COMMAND'), 'Prompt must command viral sub-topics');
    assert.ok(homeContent.includes('NO SCRIPTS, NO INTRO'), 'Prompt must strictly forbid scripts');
  });

  it('4. Action Buttons: Copy Prompt, Open ChatGPT, and Direct AI Search buttons exist', () => {
    assert.ok(homeContent.includes('id="btn-copy-subtopic-prompt"'), 'Must have copy prompt button');
    assert.ok(homeContent.includes('id="btn-open-chatgpt-subtopic"'), 'Must have open ChatGPT button');
    assert.ok(homeContent.includes('https://chatgpt.com'), 'Must link to chatgpt.com');
    assert.ok(homeContent.includes('id="btn-run-subtopic-search"'), 'Must have direct search button');
  });

  it('5. Results Container: Displays 4-5 sub-topics with click-to-activate project buttons', () => {
    assert.ok(homeContent.includes('id="subtopic-results-container"'), 'Must have results container');
    assert.ok(homeContent.includes('id="subtopic-results-list"'), 'Must have subtopics list');
    assert.ok(homeContent.includes('btn-select-subtopic-project'), 'Must have select topic project button');
    assert.ok(homeContent.includes('btn-copy-single-subtopic'), 'Must have copy single topic button');
    assert.ok(homeContent.includes('આ વિષય પસંદ કરો'), 'Must clearly label select button in Gujarati');
  });

  it('6. Quick Paste Drawer: Allows pasting ChatGPT answer and parsing 4-5 topics', () => {
    assert.ok(homeContent.includes('id="textarea-paste-subtopics"'), 'Must have textarea for pasting ChatGPT topics');
    assert.ok(homeContent.includes('id="btn-parse-pasted-subtopics"'), 'Must have button to parse pasted topics');
  });

  it('7. Backend Service: openaiService.generateSubTopics returns 4 or 5 subtopics', async () => {
    const openaiService = require('../server/services/openaiService');
    assert.ok(typeof openaiService.generateSubTopics === 'function', 'openaiService must have generateSubTopics');

    const res5 = await openaiService.generateSubTopics({ topic: 'આંગણવાડી પગાર વધારો', count: 5 });
    assert.strictEqual(res5.length, 5, 'Must return exactly 5 subtopics');
    assert.ok(res5[0].includes('આંગણવાડી'), 'Subtopics must be tailored to the topic');

    const res4 = await openaiService.generateSubTopics({ topic: 'GSRTC ડ્રાઈવર ભરતી', count: 4 });
    assert.strictEqual(res4.length, 4, 'Must return exactly 4 subtopics');
    assert.ok(res4[0].includes('GSRTC'), 'Subtopics must be tailored to the topic');
  });

  it('8. API Endpoint: POST /api/topics/subtopics-search is registered in topics router', () => {
    const routerPath = path.join(rootDir, 'server', 'routes', 'topics.js');
    const routerCode = fs.readFileSync(routerPath, 'utf8');
    assert.ok(routerCode.includes("router.post('/subtopics-search'"), 'Must register /subtopics-search route');
  });

  it('9. Execution Check: renderHome executes without any runtime ReferenceError or missing variable', async () => {
    assert.ok(homeContent.includes('subtopicPromptText = buildSubTopicsSearchPrompt('), 'subtopicPromptText must be assigned with buildSubTopicsSearchPrompt()');
    assert.ok(!homeContent.includes('${subtopicPromptText}') || homeContent.includes('subtopicPromptText = buildSubTopicsSearchPrompt'), 'Must not have uninitialized subtopicPromptText');
    assert.ok(homeContent.includes('container.querySelector(\'#btn-copy-subtopic-prompt\')'), 'Must attach event listener to copy button');
    assert.ok(homeContent.includes('btnRunSubtopicSearch?.addEventListener'), 'Must attach event listener to direct search button');
  });
});
