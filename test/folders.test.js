const test = require('node:test');
const assert = require('node:assert');

test('Folder & File Management Unit Tests', async (t) => {
  // Mock localStorage and window for Node environment
  const store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; }
  };
  global.window = {
    dispatchEvent: () => {},
    CustomEvent: class CustomEvent { constructor(name, detail) { this.name = name; this.detail = detail; } }
  };

  const { projectState } = await import('../public/js/utils/projectState.js');

  await t.test('1. Custom Folders Creation and Listing', () => {
    const initialFolders = projectState.getFolders();
    assert.ok(initialFolders.length >= 3, 'Should have default folders');

    const created = projectState.createFolder('આંગણવાડી સુપરવાઈઝર ૨૦૨૬');
    assert.ok(created, 'Folder should be created');
    assert.strictEqual(created.name, 'આંગણવાડી સુપરવાઈઝર ૨૦૨૬');
    assert.strictEqual(projectState.getActiveFolderId(), created.id);

    const allFolders = projectState.getFolders();
    const found = allFolders.find(f => f.id === created.id);
    assert.ok(found, 'Created folder should be found in list');
  });

  await t.test('2. Custom Folder Renaming', () => {
    const created = projectState.createFolder('ટેસ્ટ ફોલ્ડર જૂનું');
    const ok = projectState.renameFolder(created.id, 'ટેસ્ટ ફોલ્ડર નવું');
    assert.strictEqual(ok, true, 'Rename should succeed');

    const folder = projectState.getFolders().find(f => f.id === created.id);
    assert.strictEqual(folder.name, 'ટેસ્ટ ફોલ્ડર નવું');
  });

  await t.test('3. Project creation inside custom folder & default 4 asset file names', () => {
    const folder = projectState.createFolder('વિધવા સહાય ફોલ્ડર');
    const proj = projectState.createProject('વિધવા સહાય અરજી ૨૦૨૬', 'વિધવા સહાય અરજી ૨૦૨૬', 'સરકારી યોજના', folder.id);

    assert.strictEqual(proj.folderId, folder.id);
    assert.strictEqual(proj.folderName, 'વિધવા સહાય ફોલ્ડર');

    // 4 Asset files check
    assert.ok(proj.script.customName.includes('script.txt'), 'Script file name should end with .txt');
    assert.ok(proj.slide.customName.includes('slides.pptx'), 'Slide file name should end with .pptx');
    assert.ok(proj.voice.customName.includes('voice.wav'), 'Voice file name should end with .wav');
    assert.ok(proj.thumbnail.customName.includes('thumbnail.png'), 'Thumbnail file name should end with .png');
  });

  await t.test('4. Renaming individual Script, PPT, Voice, and Thumbnail files', () => {
    const proj = projectState.createProject('ફાઇલ રીનેમ ટેસ્ટ', 'ટેસ્ટ');

    projectState.renameFile(proj.id, 'script', 'maro_custom_script.txt');
    projectState.renameFile(proj.id, 'slide', 'final_slides_16x9.pptx');
    projectState.renameFile(proj.id, 'voice', 'anchor_voice_hq.wav');
    projectState.renameFile(proj.id, 'thumbnail', 'viral_thumbnail_hd.png');

    const updated = projectState.getProjects().find(p => p.id === proj.id);
    assert.strictEqual(updated.script.customName, 'maro_custom_script.txt');
    assert.strictEqual(updated.slide.customName, 'final_slides_16x9.pptx');
    assert.strictEqual(updated.voice.customName, 'anchor_voice_hq.wav');
    assert.strictEqual(updated.thumbnail.customName, 'viral_thumbnail_hd.png');
  });

  await t.test('5. Moving project to another folder', () => {
    const folderA = projectState.createFolder('ફોલ્ડર A');
    const folderB = projectState.createFolder('ફોલ્ડર B');
    const proj = projectState.createProject('મૂવ ટેસ્ટ', 'ટેસ્ટ', 'સરકારી યોજના', folderA.id);

    assert.strictEqual(proj.folderId, folderA.id);

    const moved = projectState.moveProjectToFolder(proj.id, folderB.id);
    assert.strictEqual(moved, true);

    const updated = projectState.getProjects().find(p => p.id === proj.id);
    assert.strictEqual(updated.folderId, folderB.id);
    assert.strictEqual(updated.folderName, 'ફોલ્ડર B');
  });
});

