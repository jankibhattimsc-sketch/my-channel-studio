const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('GYAN YATRA AI STUDIO: DASHBOARD & 48-HOUR SCREENSHOT TOPIC RESEARCH MASTER PROMPT', () => {
  const rootDir = path.resolve(__dirname, '..');
  const homePath = path.join(rootDir, 'public', 'js', 'views', 'home.js');
  const homeContent = fs.readFileSync(homePath, 'utf8');

  it('1. Design System: Conforms to Pure White #FFFFFF and Minimalist Styling', () => {
    assert.ok(homeContent.includes('#FFFFFF'), 'Dashboard must use Pure White #FFFFFF background');
    assert.ok(homeContent.includes('#102A56'), 'Dashboard must use Navy Blue #102A56 primary accent');
    assert.ok(homeContent.includes('#D71920'), 'Dashboard must use Crimson Red #D71920');
    assert.ok(homeContent.includes('Noto Sans Gujarati'), 'Dashboard must use clean Gujarati typography');
  });

  it('2. Removed All Analytics Cards & Removed Generate Top 5 Topics Section', () => {
    // Analytics cards removed
    assert.ok(!homeContent.includes('૪૮ કલાકના કુલ વ્યુઝ'), 'Analytics total views metric card must be removed');
    assert.ok(!homeContent.includes('hourlyViews'), 'Hourly views chart must be removed');
    assert.ok(!homeContent.includes('Top 10 Performing Videos'), 'Top 10 performing videos table must be removed');
    assert.ok(!homeContent.includes('dash-screenshot-dropzone'), 'Screenshot dropzone card must be removed from dashboard');
    
    // Top 5 section removed
    assert.ok(!homeContent.includes('sec-ai-recommended-top5'), 'Generate Top 5 Topics section must be removed');
    assert.ok(!homeContent.includes('btn-dash-generate-top5'), 'Generate Top 5 button must be removed');
  });

  it('3. Kept Only Open YouTube Studio, Open ChatGPT, One-Click Copy Master Prompt', () => {
    // Open YouTube Studio
    assert.ok(homeContent.includes('btn-dash-open-studio'), 'Must have Open YouTube Studio button');
    assert.ok(homeContent.includes('https://studio.youtube.com'), 'Must link to https://studio.youtube.com');

    // Open ChatGPT
    assert.ok(homeContent.includes('btn-dash-open-chatgpt'), 'Must have Open ChatGPT button');
    assert.ok(homeContent.includes('https://chatgpt.com'), 'Must link to https://chatgpt.com');

    // One-Click Copy Master Prompt
    assert.ok(homeContent.includes('btn-dash-copy-master-prompt'), 'Must have One-Click Copy Master Prompt button');
  });

  it('4. Permanent AI Topic Research Master Prompt Analyzes 48h Screenshots and Produces Exactly 10 Topics (No Scripts)', () => {
    assert.ok(homeContent.includes('dash-master-prompt-textarea'), 'Must have textarea for permanent master prompt');
    assert.ok(homeContent.includes('dash-custom-prompt-notes'), 'Must have creator custom notes input field');
    assert.ok(homeContent.includes('buildMasterPrompt'), 'Must have dynamic master prompt builder');

    // Master Prompt content requirements
    assert.ok(homeContent.includes('૪૮ કલાક') || homeContent.includes('48-Hour') || homeContent.includes('LAST 48 HOURS'), 'Prompt must instruct 48-hour screenshot analysis');
    assert.ok(homeContent.includes('EXACTLY 10') || homeContent.includes('શ્રેષ્ઠ ૧૦'), 'Prompt must produce exactly 10 video topics');
    assert.ok(homeContent.includes('No scripts') || homeContent.includes('NO SCRIPTS') || homeContent.includes('કોઈપણ પ્રકારની સ્ક્રિપ્ટ'), 'Prompt must strictly forbid scripts');
    assert.ok(homeContent.includes('Output ONLY topic names') || homeContent.includes('નક્કર પુરાવો'), 'Prompt must enforce topic names only');
  });

  it('5. App routes default hash to home/dashboard and navigation links are clean', () => {
    const appPath = path.join(rootDir, 'public', 'js', 'app.js');
    const appContent = fs.readFileSync(appPath, 'utf8');

    assert.ok(appContent.includes("case 'home':") && appContent.includes("case 'dashboard':"), 'app.js must handle home and dashboard routes');
    assert.ok(appContent.includes("renderHome(this.container, navCallback)"), 'app.js must call renderHome for home route');

    const indexPath = path.join(rootDir, 'public', 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    assert.ok(indexContent.includes('data-view="home"'), 'index.html must include home in navigation');
  });

  it('6. MASTER PROMPT: GYAN YATRA – AI VIRAL TOPIC FINDER & Exact 10 Topics Output', () => {
    assert.ok(homeContent.includes('MASTER PROMPT: GYAN YATRA – AI VIRAL TOPIC FINDER'), 'Prompt must use exact master prompt title');
    assert.ok(homeContent.includes('Return EXACTLY 10 topics'), 'Must instruct returning exactly 10 topics');
    assert.ok(homeContent.includes('Output ONLY topic names'), 'Must instruct outputting ONLY topic names');
    assert.ok(homeContent.includes('1. [Gujarati Video Topic]'), 'Must enforce output format [Gujarati Video Topic]');

    const openaiService = require('../server/services/openaiService');
    assert.ok(typeof openaiService.generateViralTopics10 === 'function', 'openaiService must export generateViralTopics10');
  });

  it('7. Direct Viral Topics Endpoint returns exactly 10 Gujarati topics without scripts', async () => {
    const openaiService = require('../server/services/openaiService');
    const res = await openaiService.generateViralTopics10({
      channelContext: { title: 'Gyan Yatra', handle: '@gyan.yatra1' }
    });

    assert.ok(res.success, 'Result must be successful');
    assert.strictEqual(res.topics.length, 10, 'Must contain exactly 10 topics');
    res.topics.forEach((t, i) => {
      assert.ok(typeof t === 'string' && t.length > 5, `Topic ${i + 1} must be a valid topic string`);
      assert.ok(!t.includes('Section 1:') && !t.includes('સ્ક્રિપ્ટ:'), `Topic ${i + 1} must not contain script content`);
    });
  });
});
