const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('GYAN YATRA AI STUDIO: TOPIC PRODUCTION PLANNER (TOOL #2)', () => {
  const rootDir = path.resolve(__dirname, '..');
  const plannerPath = path.join(rootDir, 'public', 'js', 'views', 'planner.js');
  const plannerContent = fs.readFileSync(plannerPath, 'utf8');
  const indexPath = path.join(rootDir, 'public', 'index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const appPath = path.join(rootDir, 'public', 'js', 'app.js');
  const appContent = fs.readFileSync(appPath, 'utf8');

  let db;

  before(() => {
    db = require('../server/db');
  });

  it('1. Preservation: Tool #1 (Topic Ideas) exists and is protected alongside Tool #2 (Planner)', () => {
    // Both navigation items must exist in index.html
    assert.ok(indexContent.includes('data-view="topics"'), 'index.html must have Tool #1: topics');
    assert.ok(indexContent.includes('data-view="planner"'), 'index.html must have Tool #2: planner');
    assert.ok(indexContent.includes('Tool 1'), 'index.html must identify Tool 1');
    assert.ok(indexContent.includes('Tool 2'), 'index.html must identify Tool 2');

    // Both routes handled in app.js
    assert.ok(appContent.includes("case 'topics':"), 'app.js must route topics');
    assert.ok(appContent.includes("case 'planner':"), 'app.js must route planner');
    assert.ok(appContent.includes('renderTopicProductionPlanner'), 'app.js must render Topic Production Planner');
  });

  it('2. Main Dashboard Design: Clean, minimal layout with title and Asia/Kolkata date/day', () => {
    assert.ok(plannerContent.includes('GYAN YATRA — TOPIC PRODUCTION PLANNER'), 'Must display title GYAN YATRA — TOPIC PRODUCTION PLANNER');
    assert.ok(plannerContent.includes('Asia/Kolkata'), 'Must compute and display date in Asia/Kolkata timezone');
    assert.ok(plannerContent.includes('Noto Sans Gujarati'), 'Must use authentic Gujarati typography');
    assert.ok(plannerContent.includes('#FFFFFF'), 'Must adhere to professional white background');
    assert.ok(plannerContent.includes('#102A56'), 'Must use Navy Blue #102A56 primary accent');
  });

  it('3. 6 Key Metrics & 50 Total Tasks Progress Tracking', () => {
    // Metrics display
    assert.ok(plannerContent.includes('Total Topics'), 'Must display Total Topics metric');
    assert.ok(plannerContent.includes('Verified Topics'), 'Must display Verified Topics metric');
    assert.ok(plannerContent.includes('Slides Completed'), 'Must display Slides Completed metric');
    assert.ok(plannerContent.includes('Scripts Completed'), 'Must display Scripts Completed metric');
    assert.ok(plannerContent.includes('Voice Completed'), 'Must display Voice Completed metric');
    assert.ok(plannerContent.includes('Ready to Publish'), 'Must display Ready to Publish metric');

    // Total tasks = 10 topics * 5 stages = 50 tasks
    assert.ok(plannerContent.includes('totalPossibleTasks'), 'Must compute totalPossibleTasks (50)');
    assert.ok(plannerContent.includes('totalCompletedTasks'), 'Must compute totalCompletedTasks');
    assert.ok(plannerContent.includes('progressPercent'), 'Must compute overall progress percentage');
  });

  it('4. Main Topic Table: 8 Required Columns with Independent Checkboxes', () => {
    // Columns
    assert.ok(plannerContent.includes('NO.'), 'Column 1: NO.');
    assert.ok(plannerContent.includes('VIDEO TOPIC'), 'Column 2: VIDEO TOPIC');
    assert.ok(plannerContent.includes('DATE & DAY'), 'Column 3: DATE & DAY');
    assert.ok(plannerContent.includes('TOPIC VERIFIED'), 'Column 4: TOPIC VERIFIED');
    assert.ok(plannerContent.includes('SLIDES DONE') || plannerContent.includes('SLIDES COMPLETED'), 'Column 5: SLIDES DONE');
    assert.ok(plannerContent.includes('SCRIPT DONE') || plannerContent.includes('SCRIPT COMPLETED'), 'Column 6: SCRIPT DONE');
    assert.ok(plannerContent.includes('VOICE DONE') || plannerContent.includes('VOICE COMPLETED'), 'Column 7: VOICE DONE');
    assert.ok(plannerContent.includes('FINAL PROD'), 'Column 8: FINAL PROD');

    // Independent checkboxes
    assert.ok(plannerContent.includes('chk-planner-stage'), 'Must have independent stage checkboxes');
    assert.ok(plannerContent.includes('data-stage="verified"'), 'Checkbox verified');
    assert.ok(plannerContent.includes('data-stage="slidesCompleted"'), 'Checkbox slidesCompleted');
    assert.ok(plannerContent.includes('data-stage="scriptCompleted"'), 'Checkbox scriptCompleted');
    assert.ok(plannerContent.includes('data-stage="voiceCompleted"'), 'Checkbox voiceCompleted');
    assert.ok(plannerContent.includes('data-stage="finalProduction"'), 'Checkbox finalProduction');
  });

  it('5. Topic-Wise Status: READY TO PUBLISH when 5/5 complete, else WORK IN PROGRESS', () => {
    assert.ok(plannerContent.includes('READY TO PUBLISH'), 'Must show READY TO PUBLISH when all 5 stages true');
    assert.ok(plannerContent.includes('WORK IN PROGRESS'), 'Must show WORK IN PROGRESS when incomplete');
  });

  it('6. Database Persistence: Batch initialization and topic retrieval returns 10 topics', () => {
    const batch = db.getCurrentPlannerBatch();
    assert.ok(batch, 'Batch must exist');
    assert.ok(Array.isArray(batch.topics), 'Batch must contain topics array');
    assert.strictEqual(batch.topics.length, 10, 'Default batch must contain exactly 10 topics');

    // Inspect first topic
    const t1 = batch.topics[0];
    assert.strictEqual(t1.number, 1, 'First topic must be #1');
    assert.ok(t1.topicName && t1.topicName.length > 5, 'Topic must have authentic Gujarati name');
    assert.ok(t1.suggestedPublishDate, 'Topic must have suggested publish date');
    assert.ok(t1.suggestedPublishDay, 'Topic must have suggested publish day');
    assert.ok(t1.suggestedPublishTime, 'Topic must have suggested publish time');
    assert.strictEqual(t1.sourceAnalyticsPeriod, 'Last 48 Hours', 'Source period must be Last 48 Hours');
    assert.deepStrictEqual(Object.keys(t1.stages), ['verified', 'slidesCompleted', 'scriptCompleted', 'voiceCompleted', 'finalProduction']);
  });

  it('7. Individual Checkbox Status Update and Auto-Status Calculation', () => {
    const batch = db.getCurrentPlannerBatch();
    const topicId = batch.topics[0].id;

    // Toggle stages 1 to 4 -> WORK IN PROGRESS
    const res1 = db.updatePlannerTopic(batch.id, topicId, {
      stages: {
        verified: true,
        slidesCompleted: true,
        scriptCompleted: true,
        voiceCompleted: true,
        finalProduction: false
      }
    });

    assert.ok(res1, 'Update response must exist');
    assert.strictEqual(res1.topic.stages.verified, true);
    assert.strictEqual(res1.topic.stages.finalProduction, false);
    assert.strictEqual(res1.topic.status, 'WORK IN PROGRESS', 'Status must be WORK IN PROGRESS when 4/5 complete');

    // Toggle 5th stage -> READY TO PUBLISH
    const res2 = db.updatePlannerTopic(batch.id, topicId, {
      stages: {
        verified: true,
        slidesCompleted: true,
        scriptCompleted: true,
        voiceCompleted: true,
        finalProduction: true
      }
    });

    assert.strictEqual(res2.topic.status, 'READY TO PUBLISH', 'Status must automatically advance to READY TO PUBLISH when 5/5 complete');
  });

  it('8. Sync Connection: Tool #1 transfers 10 topics to Tool #2 and preserves separate batches', () => {
    const initialBatchesCount = db.getPlannerBatches().length;
    const test10Topics = [
      'ટેસ્ટ વિષય ૧: ખેડૂત સબસિડી ૨૦૨૬',
      'ટેસ્ટ વિષય ૨: આંગણવાડી ભરતી ૨૦૨૬',
      'ટેસ્ટ વિષય ૩: સરકારી કર્મચારી મોંઘવારી ભથ્થું',
      'ટેસ્ટ વિષય ૪: એસટી નિગમ ભરતી પરિપત્ર',
      'ટેસ્ટ વિષય ૫: કુંવરબાઈ મામેરું સહાય યોજના',
      'ટેસ્ટ વિષય ૬: પોલીસ કોન્સ્ટેબલ કોલ લેટર',
      'ટેસ્ટ વિષય ૭: વિદ્યાસહાયક ટેટ મેરીટ યાદી',
      'ટેસ્ટ વિષય ૮: વિધવા પેન્શન યોજના વધારો',
      'ટેસ્ટ વિષય ૯: રેશનકાર્ડ ઈ-કેવાયસી પ્રક્રિયા',
      'ટેસ્ટ વિષય ૧૦: સાયબર ક્રાઈમ ૧૯૩૦ માહિતી'
    ];

    const newBatch = db.syncTopicsToPlanner(test10Topics, 'ટેસ્ટ બેચ #૨');
    assert.ok(newBatch, 'New batch must be created');
    assert.strictEqual(newBatch.topics.length, 10, 'New batch must have 10 topics');
    assert.strictEqual(newBatch.topics[0].topicName, 'ટેસ્ટ વિષય ૧: ખેડૂત સબસિડી ૨૦૨૬');
    assert.strictEqual(newBatch.topics[9].topicName, 'ટેસ્ટ વિષય ૧૦: સાયબર ક્રાઈમ ૧૯૩૦ માહિતી');

    // Batches count must increment without overwriting old batch data
    const updatedBatches = db.getPlannerBatches();
    assert.strictEqual(updatedBatches.length, initialBatchesCount + 1, 'Batches count must increase by 1');
  });

  it('9. Tool #1 (topics.js) and Dashboard (home.js) have direct transfer triggers to Tool #2', () => {
    const topicsPath = path.join(rootDir, 'public', 'js', 'views', 'topics.js');
    const topicsContent = fs.readFileSync(topicsPath, 'utf8');
    const homePath = path.join(rootDir, 'public', 'js', 'views', 'home.js');
    const homeContent = fs.readFileSync(homePath, 'utf8');

    // topics.js has transfer actions
    assert.ok(topicsContent.includes('btn-goto-planner-from-topics'), 'topics.js must have jump button to planner');
    assert.ok(topicsContent.includes('btn-transfer-planner-selected'), 'topics.js must have transfer selected button');

    // home.js has transfer button from 10 viral topics
    assert.ok(homeContent.includes('btn-transfer-dash-to-planner'), 'home.js must have transfer button to planner');
  });
});

