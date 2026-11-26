const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

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

describe('TOPIC SEAMLESS WORKFLOW SYNC: IDEA TO 1-7 LINE', async () => {
  const { projectState } = await import('../public/js/utils/projectState.js');

  const customTopic = 'ગુજરાત આંગણવાડી કાર્યકર માનદવેતન વધારો ૨૦૨૬';

  test('1. Adding an idea in Idea Notebook saves and activates topic across projectState', async () => {
    const ideaRecord = {
      id: 'idea_anganwadi_101',
      title: customTopic,
      category: 'સરકારી યોજના',
      description: 'સરકાર દ્વારા માનદવેતનમાં ધરખમ વધારો'
    };

    await projectState.saveProjectIdea(ideaRecord);
    await projectState.activateTopicContext(ideaRecord.id, customTopic, ideaRecord);

    const activeProject = projectState.getActiveProject();
    assert.strictEqual(activeProject.topic, customTopic, 'Active project topic must match custom topic');
    assert.strictEqual(activeProject.name, customTopic, 'Active project name must match custom topic');
    assert.strictEqual(global.localStorage.getItem('gyan_active_topic_name'), customTopic, 'LocalStorage must hold active topic name');
  });

  test('2. My Topics (Tool 3) storage receives and retains idea added from Idea Notebook', async () => {
    const rawPasted = global.localStorage.getItem('gyan_48h_pasted_topics');
    assert.ok(rawPasted, 'Pasted topics storage must exist');
    const parsed = JSON.parse(rawPasted);
    const found = parsed.find(t => t.title === customTopic);
    assert.ok(found, 'Custom topic must be auto-synced into My Topics storage');
  });

  test('3. Codebase checks: Tools 1 through 7 and SEO strictly load and respect stored active topic', () => {
    const scriptwriterCode = fs.readFileSync(path.join(__dirname, '../public/js/views/scriptwriter.js'), 'utf8');
    const videoeditorCode = fs.readFileSync(path.join(__dirname, '../public/js/views/videoeditor.js'), 'utf8');
    const thumbnailsCode = fs.readFileSync(path.join(__dirname, '../public/js/views/thumbnails.js'), 'utf8');
    const seodescriptionCode = fs.readFileSync(path.join(__dirname, '../public/js/views/seodescription.js'), 'utf8');
    const slidepromptsCode = fs.readFileSync(path.join(__dirname, '../public/js/views/slideprompts.js'), 'utf8');
    const homeCode = fs.readFileSync(path.join(__dirname, '../public/js/views/home.js'), 'utf8');
    const mytopicsCode = fs.readFileSync(path.join(__dirname, '../public/js/views/mytopics.js'), 'utf8');

    assert.ok(homeCode.includes('gyan_active_topic_name'), 'home.js must check gyan_active_topic_name');
    assert.ok(mytopicsCode.includes('gyan_active_topic_name'), 'mytopics.js must check gyan_active_topic_name');
    assert.ok(slidepromptsCode.includes('gyan_active_topic_name'), 'slideprompts.js must check gyan_active_topic_name');
    assert.ok(scriptwriterCode.includes('gyan_active_topic_name'), 'scriptwriter.js must check gyan_active_topic_name');
    assert.ok(videoeditorCode.includes('gyan_active_topic_name'), 'videoeditor.js must check gyan_active_topic_name');
    assert.ok(thumbnailsCode.includes('gyan_active_topic_name'), 'thumbnails.js must check gyan_active_topic_name');
    assert.ok(seodescriptionCode.includes('gyan_active_topic_name'), 'seodescription.js must check gyan_active_topic_name');
  });
});
