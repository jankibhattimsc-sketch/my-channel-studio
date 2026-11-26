const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('TOOL 2: PASTE TOPICS (મારા વિષયો પેસ્ટ કરો) STANDALONE TOOL GUARANTEE', () => {
  const rootDir = path.resolve(__dirname, '..');
  const pastetopicsPath = path.join(rootDir, 'public', 'js', 'views', 'pastetopics.js');
  const homePath = path.join(rootDir, 'public', 'js', 'views', 'home.js');
  const appPath = path.join(rootDir, 'public', 'js', 'app.js');
  const indexPath = path.join(rootDir, 'public', 'index.html');

  const pastetopicsContent = fs.readFileSync(pastetopicsPath, 'utf8');
  const homeContent = fs.readFileSync(homePath, 'utf8');
  const appContent = fs.readFileSync(appPath, 'utf8');
  const indexContent = fs.readFileSync(indexPath, 'utf8');

  it('1. Tool 2 View File Exists and Exports renderPasteTopics', () => {
    assert.ok(fs.existsSync(pastetopicsPath), 'pastetopics.js must exist');
    assert.ok(pastetopicsContent.includes('export async function renderPasteTopics'), 'Must export renderPasteTopics');
    assert.ok(pastetopicsContent.includes('gyan_48h_pasted_topics'), 'Must read/write to gyan_48h_pasted_topics for zero data loss');
  });

  it('2. Tool 2 Contains Custom Topic Input Box with DateTime, Clipboard & Add Controls', () => {
    assert.ok(pastetopicsContent.includes('pastetopics-datetime'), 'Must have datetime input for topics');
    assert.ok(pastetopicsContent.includes('btn-pastetopics-clipboard'), 'Must have clipboard paste button');
    assert.ok(pastetopicsContent.includes('btn-pastetopics-add'), 'Must have Add Topic button');
    assert.ok(pastetopicsContent.includes('pastetopics-textarea'), 'Must have multi-line textarea for ChatGPT topics');
    assert.ok(pastetopicsContent.includes('મારા વિષયો પેસ્ટ કરો'), 'Must have Gujarati title');
  });

  it('3. Tool 2 Removed the Bottom "MY TOPICS" Section Card Per User Request', () => {
    // Verified: User asked "2 ja number ma niche je my topic che e kadhi nakho biju badhu am j reva dyov"
    assert.ok(!pastetopicsContent.includes('pastetopics-list-box'), 'pastetopics-list-box must be removed from pastetopics.js');
    assert.ok(!pastetopicsContent.includes('pastetopics-edit-modal'), 'pastetopics-edit-modal must be removed from pastetopics.js');
    assert.ok(!pastetopicsContent.includes('btn-pastetopics-clear-all'), 'btn-pastetopics-clear-all must be removed from pastetopics.js');
  });

  it('4. Tool 3 (mytopics.js) Has the Full "MY TOPICS" Section, Direct Idea, Edit, Delete, Planner, and Workspace Controls', () => {
    const mytopicsPath = path.join(rootDir, 'public', 'js', 'views', 'mytopics.js');
    assert.ok(fs.existsSync(mytopicsPath), 'mytopics.js must exist');
    const mytopicsContent = fs.readFileSync(mytopicsPath, 'utf8');

    assert.ok(mytopicsContent.includes('MY TOPICS'), 'Must display MY TOPICS badge in Tool 3');
    assert.ok(mytopicsContent.includes('mytopics-count-badge'), 'Must display topic count badge in Tool 3');
    assert.ok(mytopicsContent.includes('btn-mytopics-transfer-idea'), 'Must have 1-Click transfer to Idea button');
    assert.ok(mytopicsContent.includes('btn-mytopics-transfer-planner'), 'Must have transfer to Production Planner button');
    assert.ok(mytopicsContent.includes('btn-mytopics-copy-all'), 'Must have Copy All button');
    assert.ok(mytopicsContent.includes('btn-mytopics-clear-all'), 'Must have Clear All button');
    assert.ok(mytopicsContent.includes('btn-mytopics-open-idea'), 'Must have 1-Click open in Idea button');
    assert.ok(mytopicsContent.includes('btn-mytopics-edit'), 'Must have edit topic & time button');
    assert.ok(mytopicsContent.includes('btn-mytopics-delete'), 'Must have delete topic button');
    assert.ok(mytopicsContent.includes('btn-mytopics-add-planner'), 'Must have Add to Planner button');
    assert.ok(mytopicsContent.includes('btn-mytopics-workspace'), 'Must have 1-Click Workspace launcher');
    assert.ok(mytopicsContent.includes('mytopics-edit-modal'), 'Must have topic edit modal');
  });

  it('5. Tool 1 (home.js) has Removed the Pasted Topic Box and Points to Tool 2 (#pastetopics)', () => {
    // Pasted topic textarea and pasted topic list are removed from Tool 1
    assert.ok(!homeContent.includes('dash-paste-topic-textarea'), 'dash-paste-topic-textarea must be removed from home.js');
    assert.ok(!homeContent.includes('dash-pasted-topics-list-box'), 'dash-pasted-topics-list-box must be removed from home.js');
    
    // Prominent callout card pointing to Tool 2 exists in Tool 1
    assert.ok(homeContent.includes('href="#pastetopics"'), 'home.js must link to #pastetopics');
    assert.ok(homeContent.includes('૨. Paste Topics'), 'home.js must display Tool 2 callout');

    // 48-Hour AI Master Prompt in Tool 1 is completely preserved
    assert.ok(homeContent.includes('dash-master-prompt-textarea'), '48-Hour Master Prompt textarea must remain in home.js');
    assert.ok(homeContent.includes('buildMasterPrompt'), 'buildMasterPrompt must remain in home.js');
  });

  it('6. app.js and index.html Route and Navigate to Tool 2 (#pastetopics)', () => {
    assert.ok(appContent.includes("case 'pastetopics':"), 'app.js must route to pastetopics');
    assert.ok(appContent.includes('renderPasteTopics'), 'app.js must call renderPasteTopics');
    assert.ok(indexContent.includes('href="#pastetopics"'), 'index.html must have #pastetopics in sidebar nav');
    assert.ok(indexContent.includes('data-view="pastetopics"'), 'index.html must have data-view="pastetopics"');
  });

  it('7. Tool 3 (mytopics.js) Exists as Dedicated Next Tool below Tool 2', () => {
    const mytopicsPath = path.join(rootDir, 'public', 'js', 'views', 'mytopics.js');
    assert.ok(fs.existsSync(mytopicsPath), 'mytopics.js must exist');
    const mytopicsContent = fs.readFileSync(mytopicsPath, 'utf8');

    assert.ok(mytopicsContent.includes('export async function renderMyTopics'), 'Must export renderMyTopics');
    assert.ok(mytopicsContent.includes('gyan_48h_pasted_topics'), 'Must read/write to gyan_48h_pasted_topics');
    assert.ok(mytopicsContent.includes('MY TOPICS'), 'Must display MY TOPICS badge');
    assert.ok(mytopicsContent.includes('btn-mytopics-transfer-idea'), 'Must have transfer to Idea button');
    assert.ok(mytopicsContent.includes('btn-mytopics-transfer-planner'), 'Must have transfer to Planner button');

    // Routing and navigation
    assert.ok(appContent.includes("case 'mytopics':"), 'app.js must route to mytopics');
    assert.ok(appContent.includes('renderMyTopics'), 'app.js must call renderMyTopics');
    assert.ok(indexContent.includes('href="#mytopics"'), 'index.html must have #mytopics in sidebar nav');
    assert.ok(indexContent.includes('data-view="mytopics"'), 'index.html must have data-view="mytopics"');
    assert.ok(pastetopicsContent.includes('href="#mytopics"'), 'pastetopics.js must link to #mytopics as next step');
  });

  it('8. 10-in-1 Workspace is Moved to the End of Navigation in Sidebar and Mobile Nav', () => {
    // In sidebar: 10-in-1 must appear AFTER SEO (Tool 7)
    const seoIndex = indexContent.indexOf('id="nav-seo"');
    const workspaceIndex = indexContent.indexOf('id="nav-workspace"');
    assert.ok(seoIndex !== -1, 'nav-seo must exist in index.html');
    assert.ok(workspaceIndex !== -1, 'nav-workspace must exist in index.html');
    assert.ok(workspaceIndex > seoIndex, 'nav-workspace (10 in 1) must be placed at the end after nav-seo');

    // In mobile nav: 10-in-1 must appear after SEO
    const mobileSeoIndex = indexContent.indexOf('data-view="seodescription"');
    const mobileWorkspaceIndex = indexContent.lastIndexOf('data-view="workspace"');
    assert.ok(mobileWorkspaceIndex > mobileSeoIndex, 'mobile 10 in 1 must be placed at the end after SEO');
  });

  it('9. Tool 3 (mytopics.js) Shows Project Name and Ongoing Work Status ("ક્યાં પ્રોજેક્ટ માં કયું કામ ચાલુ છે") with Zero Function Breakage', () => {
    const mytopicsPath = path.join(rootDir, 'public', 'js', 'views', 'mytopics.js');
    const mytopicsContent = fs.readFileSync(mytopicsPath, 'utf8');

    // Project Name & Ongoing Work indicators
    assert.ok(mytopicsContent.includes('badge-project-name'), 'Must have project name badge');
    assert.ok(mytopicsContent.includes('badge-ongoing-work'), 'Must have ongoing work badge');
    assert.ok(mytopicsContent.includes('પ્રોજેક્ટ:'), 'Must show Gujarati project indicator');
    assert.ok(mytopicsContent.includes('ચાલુ કામ:'), 'Must show Gujarati ongoing work indicator');
    assert.ok(mytopicsContent.includes('btn-open-ongoing-tool'), 'Must have button to directly open ongoing tool');
    assert.ok(mytopicsContent.includes('btn-step-jump'), 'Must have step progress buttons');

    // All existing functions preserved without regression
    assert.ok(mytopicsContent.includes('btn-mytopics-transfer-idea'), 'Transfer to Idea must be intact');
    assert.ok(mytopicsContent.includes('btn-mytopics-transfer-planner'), 'Transfer to Planner must be intact');
    assert.ok(mytopicsContent.includes('btn-mytopics-copy-all'), 'Copy all must be intact');
    assert.ok(mytopicsContent.includes('btn-mytopics-clear-all'), 'Clear all must be intact');
    assert.ok(mytopicsContent.includes('btn-mytopics-open-idea'), 'Open Idea must be intact');
    assert.ok(mytopicsContent.includes('btn-mytopics-edit'), 'Edit topic must be intact');
    assert.ok(mytopicsContent.includes('btn-mytopics-delete'), 'Delete topic must be intact');
    assert.ok(mytopicsContent.includes('btn-mytopics-add-planner'), 'Add to planner must be intact');
  });
});
