const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Folder Notebook with Date-Time Intelligence', async (t) => {
  const content = fs.readFileSync('public/js/utils/folderNotebookModal.js', 'utf8');

  await t.test('1. Module exports getFolderNotes, addFolderNote, deleteFolderNote, and openFolderNotebookModal', () => {
    assert.ok(content.includes('export function getFolderNotes('), 'getFolderNotes must be exported');
    assert.ok(content.includes('export function addFolderNote('), 'addFolderNote must be exported');
    assert.ok(content.includes('export function deleteFolderNote('), 'deleteFolderNote must be exported');
    assert.ok(content.includes('export function openFolderNotebookModal('), 'openFolderNotebookModal must be exported');
  });

  await t.test('2. Notes record authentic IST timestamps via dateTimeIntelligence', () => {
    assert.ok(content.includes("import { getCurrentIST } from './dateTimeIntelligence.js';"), 'Must use getCurrentIST for timestamps');
    assert.ok(content.includes('displayTime: ist.display'), 'Must record authentic display time');
    assert.ok(content.includes('createdAtIso: ist.iso'), 'Must record ISO timestamp');
  });

  await t.test('3. Folder banner integrates folder notebook button', () => {
    const bannerContent = fs.readFileSync('public/js/utils/folderBanner.js', 'utf8');
    assert.ok(bannerContent.includes('btn-banner-folder-notebook'), 'Folder banner must have notebook button');
    assert.ok(bannerContent.includes('openFolderNotebookModal'), 'Folder banner must trigger openFolderNotebookModal');
  });

  await t.test('4. Voice Studio header integrates folder notebook button', () => {
    const voiceContent = fs.readFileSync('public/js/views/myvoice.js', 'utf8');
    assert.ok(voiceContent.includes('btn-open-folder-notebook-voice'), 'Voice studio header must have notebook button');
  });

  await t.test('5. Video creation tool header integrates folder notebook button', () => {
    const videoContent = fs.readFileSync('public/js/views/videoeditor.js', 'utf8');
    assert.ok(videoContent.includes('btn-open-folder-notebook-video'), 'Video creation tool header must have notebook button');
  });
});

