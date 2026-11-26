const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('GYAN YATRA AI STUDIO – CONNECTED WORKFLOW INTEGRATION (TOPIC ID)', () => {
  const rootDir = path.resolve(__dirname, '..');
  const plannerPath = path.join(rootDir, 'public', 'js', 'views', 'planner.js');
  const plannerContent = fs.readFileSync(plannerPath, 'utf8');
  const workspacePath = path.join(rootDir, 'public', 'js', 'views', 'workspace.js');
  const workspaceContent = fs.readFileSync(workspacePath, 'utf8');
  const topicsPath = path.join(rootDir, 'public', 'js', 'views', 'topics.js');
  const topicsContent = fs.readFileSync(topicsPath, 'utf8');
  const homePath = path.join(rootDir, 'public', 'js', 'views', 'home.js');
  const homeContent = fs.readFileSync(homePath, 'utf8');
  const projectStatePath = path.join(rootDir, 'public', 'js', 'utils', 'projectState.js');
  const projectStateContent = fs.readFileSync(projectStatePath, 'utf8');

  let db;

  before(() => {
    db = require('../server/db');
  });

  it('1. Unique Permanent topicId Generation (Never uses title as primary key)', () => {
    const nextId = db.generateNextTopicId();
    assert.ok(/^GY-\d{4}-\d{3}$/.test(nextId), `Generated topicId "${nextId}" must match GY-YYYY-NNN format`);

    // Add a central topic and verify it gets a unique topicId
    const res = db.addCentralTopic({
      topicName: 'ટેસ્ટ નવી ગુજરાત સરકારી ભરતી ૨૦૨૬ ' + Date.now(),
      recommendedTitle: 'ગુજરાત સરકારી ભરતી ૨૦૨૬ સંપૂર્ણ માહિતી',
      sourcePeriod: 'Last 48 Hours',
      priority: 'HIGH'
    });

    assert.ok(res.success, 'Creation must succeed');
    const newTopic = res.topic;
    assert.ok(newTopic.topicId, 'Topic must have a topicId');
    assert.ok(/^GY-\d{4}-\d{3}$/.test(newTopic.topicId), 'topicId must match GY-YYYY-NNN format');
    assert.ok(newTopic.topicName.includes('ટેસ્ટ નવી ગુજરાત સરકારી ભરતી ૨૦૨૬'));
    assert.ok(newTopic.analyticsDate, 'Must have analyticsDate');
    assert.ok(newTopic.dayName, 'Must have dayName in Gujarati');
    assert.strictEqual(newTopic.currentStatus, 'NOT STARTED');
    assert.strictEqual(newTopic.productionProgress, 0);
  });

  it('2. Central Repository Database Architecture with 7 Production Stages', () => {
    assert.ok(Array.isArray(db.data.centralTopics), 'Database must have centralTopics table');
    assert.ok(typeof db.data.topicProductionStages === 'object', 'Database must have topicProductionStages table');
    assert.ok(typeof db.data.topicResearch === 'object', 'Database must have topicResearch table');
    assert.ok(typeof db.data.topicSlides === 'object', 'Database must have topicSlides table');
    assert.ok(typeof db.data.topicScripts === 'object', 'Database must have topicScripts table');
    assert.ok(typeof db.data.topicVoices === 'object', 'Database must have topicVoices table');
    assert.ok(typeof db.data.topicVideos === 'object', 'Database must have topicVideos table');
    assert.ok(typeof db.data.topicThumbnails === 'object', 'Database must have topicThumbnails table');
    assert.ok(typeof db.data.topicSEO === 'object', 'Database must have topicSEO table');
  });

  it('3. Tool 1 → Tool 2 Automatic Transfer with Duplicate Prevention', () => {
    // Both topics.js and home.js must have ADD TO PLANNER actions and duplicate detection
    assert.ok(topicsContent.includes('btn-add-card-to-planner'), 'topics.js must have ADD TO PLANNER button on each card');
    assert.ok(topicsContent.includes('btn-select-all-ideas'), 'topics.js must have Select All button');
    assert.ok(topicsContent.includes('btn-transfer-planner-selected'), 'topics.js must have batch transfer button');
    assert.ok(topicsContent.includes('batchAddCentralTopics'), 'topics.js must call batchAddCentralTopics');
    assert.ok(topicsContent.includes('Already in Planner') || topicsContent.includes('In Planner'), 'topics.js must show Already in Planner indicator');

    assert.ok(homeContent.includes('btn-dash-add-single'), 'home.js must have single Add to Planner button');
    assert.ok(homeContent.includes('btn-transfer-dash-to-planner'), 'home.js must have Add All to Planner button');
    assert.ok(homeContent.includes('batchAddCentralTopics'), 'home.js must call batchAddCentralTopics');

    // Test duplicate prevention in db
    const testTitle = 'યુનિક વિષય ડુપ્લિકેટ ટેસ્ટ ' + Date.now();
    const added1 = db.addCentralTopic({ topicName: testTitle });
    assert.ok(added1.success, 'First add must succeed');
    assert.ok(added1.topic.topicId);

    const added2 = db.addCentralTopic({ topicName: testTitle });
    // Should return duplicate notice with existing topic
    assert.strictEqual(added2.duplicate, true, 'Duplicate topic creation must be flagged');
    assert.strictEqual(added2.existingTopic.topicId, added1.topic.topicId, 'Duplicate topic ID must match original');
  });

  it('4. Tool 2 Central Topic Planner: 14 Columns & Independent Stage Controls', () => {
    // 14 Columns Check
    assert.ok(plannerContent.includes('1. NO.'), 'Must have Column 1: NO.');
    assert.ok(plannerContent.includes('2. TOPIC NAME'), 'Must have Column 2: TOPIC NAME');
    assert.ok(plannerContent.includes('3. DATE'), 'Must have Column 3: DATE');
    assert.ok(plannerContent.includes('4. DAY'), 'Must have Column 4: DAY');
    assert.ok(plannerContent.includes('5. PRIORITY'), 'Must have Column 5: PRIORITY');
    assert.ok(plannerContent.includes('6. VERIFY'), 'Must have Column 6: VERIFY');
    assert.ok(plannerContent.includes('7. SLIDES'), 'Must have Column 7: SLIDES');
    assert.ok(plannerContent.includes('8. SCRIPT'), 'Must have Column 8: SCRIPT');
    assert.ok(plannerContent.includes('9. VOICE'), 'Must have Column 9: VOICE');
    assert.ok(plannerContent.includes('10. VIDEO'), 'Must have Column 10: VIDEO');
    assert.ok(plannerContent.includes('11. THUMB'), 'Must have Column 11: THUMB');
    assert.ok(plannerContent.includes('12. SEO'), 'Must have Column 12: SEO');
    assert.ok(plannerContent.includes('13. EDIT'), 'Must have Column 13: EDIT');
    assert.ok(plannerContent.includes('14. WORKSPACE'), 'Must have Column 14: WORKSPACE');

    // Summary Metrics
    assert.ok(plannerContent.includes('Total Topics'), 'Must show Total Topics');
    assert.ok(plannerContent.includes('Pending'), 'Must show Pending Topics');
    assert.ok(plannerContent.includes('In Progress'), 'Must show In Progress Topics');
    assert.ok(plannerContent.includes('Ready for Publish') || plannerContent.includes('પ્રકાશન માટે તૈયાર'), 'Must show Ready for Publish');
    assert.ok(plannerContent.includes('Overall Progress'), 'Must show Overall Progress %');
  });

  it('5. Automatic Workflow Status Calculation: NOT STARTED -> IN PROGRESS -> READY FOR PUBLISH -> PUBLISHED', () => {
    const res = db.addCentralTopic({ topicName: 'સ્ટેટસ ટેસ્ટ વિષય ' + Date.now() });
    assert.ok(res.success);
    const tId = res.topic.topicId;

    // 0 stages complete: NOT STARTED
    let current = db.getCentralTopicById(tId);
    assert.strictEqual(current.topic.currentStatus, 'NOT STARTED');
    assert.strictEqual(current.topic.productionProgress, 0);

    // 1 stage complete: IN PROGRESS
    db.updateCentralTopicStage(tId, 'verification', true);
    current = db.getCentralTopicById(tId);
    assert.strictEqual(current.topic.currentStatus, 'IN PROGRESS');
    assert.strictEqual(current.topic.productionProgress, 14);

    // 7 stages complete: READY FOR PUBLISH
    db.updateCentralTopicStage(tId, 'slides', true);
    db.updateCentralTopicStage(tId, 'script', true);
    db.updateCentralTopicStage(tId, 'voice', true);
    db.updateCentralTopicStage(tId, 'videoEditing', true);
    db.updateCentralTopicStage(tId, 'thumbnail', true);
    db.updateCentralTopicStage(tId, 'seo', true);
    current = db.getCentralTopicById(tId);
    assert.strictEqual(current.topic.currentStatus, 'READY FOR PUBLISH');
    assert.strictEqual(current.topic.productionProgress, 100);

    // Confirmed published: PUBLISHED
    db.updateCentralTopicStage(tId, 'published', true);
    current = db.getCentralTopicById(tId);
    assert.strictEqual(current.topic.currentStatus, 'PUBLISHED');
  });

  it('6. Tool 2 "Edit" and "Open Workspace" opens That EXACT Topic Context', () => {
    // planner.js must call activateTopicContext(topicId, topicName, topic)
    assert.ok(plannerContent.includes('activateTopicContext'), 'planner.js must call projectState.activateTopicContext');
    assert.ok(projectStateContent.includes('activateTopicContext(topicId'), 'projectState.js must implement activateTopicContext');
    assert.ok(projectStateContent.includes('project.topicId = topicId'), 'projectState must bind project.topicId to topicId');
    assert.ok(projectStateContent.includes('project.id = topicId'), 'projectState must bind project.id to topicId');
  });

  it('7. Workspace Connected Navigation & 7-Stage Publish View', () => {
    // workspace.js must have 9 sections sequence
    assert.ok(workspaceContent.includes("id: 'overview'"), 'Workspace must have overview section');
    assert.ok(workspaceContent.includes("id: 'ideas'"), 'Workspace must have research ideas section');
    assert.ok(workspaceContent.includes("id: 'slideprompt'"), 'Workspace must have slide prompt section');
    assert.ok(workspaceContent.includes("id: 'script'"), 'Workspace must have script section');
    assert.ok(workspaceContent.includes("id: 'voice'") || workspaceContent.includes("id: 'videoeditor'"), 'Workspace must have voice or videoeditor section');
    assert.ok(workspaceContent.includes("id: 'videoeditor'"), 'Workspace must have video editor section');
    assert.ok(workspaceContent.includes("id: 'thumbnails'"), 'Workspace must have thumbnail section');
    assert.ok(workspaceContent.includes("id: 'seo'"), 'Workspace must have SEO section');
    assert.ok(workspaceContent.includes("id: 'publish'"), 'Workspace must have final publish section');

    // Sticky Previous & Next Step Controls
    assert.ok(workspaceContent.includes('ws-btn-header-prev'), 'Workspace header must have Previous Step button');
    assert.ok(workspaceContent.includes('ws-btn-header-next'), 'Workspace header must have Next Step button');
    assert.ok(workspaceContent.includes('ws-btn-bottom-prev'), 'Workspace bottom bar must have Previous Step button');
    assert.ok(workspaceContent.includes('ws-btn-bottom-next'), 'Workspace bottom bar must have Next Step button');

    // Topic ID display in Workspace header
    assert.ok(workspaceContent.includes('activeTopicId') || workspaceContent.includes('Topic ID'), 'Workspace must display permanent topicId');

    // 7-Stage Publish Checklist & Confirmation
    assert.ok(workspaceContent.includes('renderPublishView'), 'Workspace must have renderPublishView function');
    assert.ok(workspaceContent.includes('ws-btn-confirm-published'), 'Publish view must have Mark as Published button');
    assert.ok(workspaceContent.includes('ws-btn-toggle-stage'), 'Publish view must have independent stage toggles');
  });
});
