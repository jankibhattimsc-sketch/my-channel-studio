const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('Video Sharing Functionality (Direct WhatsApp, Web Share & Modal Fallback)', async (t) => {
  const videoSharePath = path.join(__dirname, '../public/js/utils/videoShare.js');
  const videoEditorPath = path.join(__dirname, '../public/js/views/videoeditor.js');
  const workspacePath = path.join(__dirname, '../public/js/views/workspace.js');

  const videoShareCode = fs.readFileSync(videoSharePath, 'utf8');
  const videoEditorCode = fs.readFileSync(videoEditorPath, 'utf8');
  const workspaceCode = fs.readFileSync(workspacePath, 'utf8');

  await t.test('1. videoShare.js exists and exports necessary share functions', () => {
    assert.ok(fs.existsSync(videoSharePath), 'videoShare.js must exist');
    assert.ok(videoShareCode.includes('export function generateVideoShareText'), 'Must export generateVideoShareText');
    assert.ok(videoShareCode.includes('export function getWhatsAppShareUrl'), 'Must export getWhatsAppShareUrl');
    assert.ok(videoShareCode.includes('export function openDirectWhatsApp'), 'Must export openDirectWhatsApp');
    assert.ok(videoShareCode.includes('shareToWhatsApp'), 'Must export shareToWhatsApp');
    assert.ok(videoShareCode.includes('export function openVideoShareModal'), 'Must export openVideoShareModal');
    assert.ok(videoShareCode.includes('export async function shareProjectVideo'), 'Must export shareProjectVideo');
  });

  await t.test('2. Direct WhatsApp uses native app URI scheme on mobile and web on desktop', () => {
    assert.ok(videoShareCode.includes('whatsapp://send?text='), 'Must support native mobile whatsapp:// URI scheme');
    assert.ok(videoShareCode.includes('https://api.whatsapp.com/send?text='), 'Must support WhatsApp direct URL');
    assert.ok(videoShareCode.includes('navigator.share'), 'Must support Web Share API');
    assert.ok(videoShareCode.includes('navigator.canShare'), 'Must support File sharing capability check');
    assert.ok(videoShareCode.includes('StudioBridge'), 'Must support Android WebView Bridge');
  });

  await t.test('3. videoeditor.js has dedicated WhatsApp and share buttons', () => {
    assert.ok(videoEditorCode.includes('id="btn-direct-whatsapp-saved-video"'), 'Must have btn-direct-whatsapp-saved-video under preview');
    assert.ok(videoEditorCode.includes('id="btn-share-saved-video"'), 'Must have btn-share-saved-video under 16:9 preview');
    assert.ok(videoEditorCode.includes('id="btn-share-saved-video-card"'), 'Must have btn-share-saved-video-card in saved section');
    assert.ok(videoEditorCode.includes('id="btn-quick-share-saved-video"'), 'Must have btn-quick-share-saved-video in tab header');
    assert.ok(videoEditorCode.includes('shareToWhatsApp'), 'Must import and invoke shareToWhatsApp');
    assert.ok(videoEditorCode.includes('shareProjectVideo'), 'Must import and invoke shareProjectVideo');
  });

  await t.test('4. workspace.js has video share buttons integrated in overview and final publish', () => {
    assert.ok(workspaceCode.includes('id="ws-btn-quick-share-video"'), 'Must have ws-btn-quick-share-video in asset strip');
    assert.ok(workspaceCode.includes('id="ws-btn-pub-share-video"'), 'Must have ws-btn-pub-share-video in publish confirmation');
    assert.ok(workspaceCode.includes('shareToWhatsApp'), 'Must import and invoke shareToWhatsApp');
  });

  await t.test('5. Video Share Modal UI contains WhatsApp, copy link and direct download', () => {
    assert.ok(videoShareCode.includes("modal.id = 'gy-video-share-modal'"), 'Modal must have container id');
    assert.ok(videoShareCode.includes('id="btn-modal-share-wa"'), 'Modal must have WhatsApp share link');
    assert.ok(videoShareCode.includes('id="btn-modal-copy-video-link"'), 'Modal must have copy video link button');
    assert.ok(videoShareCode.includes('clipboard.writeText'), 'Must support clipboard copying');
  });
});
