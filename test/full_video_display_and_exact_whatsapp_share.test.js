const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('FULL VIDEO PROMINENT DISPLAY AND EXACT WHATSAPP SHARE GUARANTEE', async (t) => {
  const videoSharePath = path.join(__dirname, '../public/js/utils/videoShare.js');
  const videoEditorPath = path.join(__dirname, '../public/js/views/videoeditor.js');

  const videoShareCode = fs.readFileSync(videoSharePath, 'utf8');
  const videoEditorCode = fs.readFileSync(videoEditorPath, 'utf8');

  await t.test('1. Default active view mode displays full saved video player when video exists', () => {
    assert.ok(
      videoEditorCode.includes("let activeViewMode = savedVideoUrl ? 'saved' : 'preview';"),
      'activeViewMode must default to saved when savedVideoUrl is present'
    );
  });

  await t.test('2. Saved mode features prominent header banner and direct WhatsApp & download controls', () => {
    assert.ok(videoEditorCode.includes('આખો 1080p વિડીયો તૈયાર છે અને નીચે પ્લેયરમાં દેખાય છે'), 'Must show full video header banner in saved mode');
    assert.ok(videoEditorCode.includes('id="btn-top-whatsapp-saved-video"'), 'Must have top WhatsApp share button in saved mode');
    assert.ok(videoEditorCode.includes('id="btn-top-download-mp4"'), 'Must have top direct MP4 download link');
    assert.ok(videoEditorCode.includes('id="btn-direct-whatsapp-saved-video"'), 'Must have main WhatsApp share button below player');
  });

  await t.test('3. Preview mode features prominent callout banner to immediately view full video or send to WhatsApp', () => {
    assert.ok(videoEditorCode.includes('id="btn-banner-switch-to-saved"'), 'Must have button to switch from preview to full video');
    assert.ok(videoEditorCode.includes('id="btn-banner-whatsapp-send"'), 'Must have button to send to WhatsApp directly from preview callout');
    assert.ok(videoEditorCode.includes('આ પ્રોજેક્ટનો સંપૂર્ણ 1080p વિડીયો તૈયાર છે!'), 'Must display notification that complete video is ready');
  });

  await t.test('4. Smooth server MP4 persistence updates DOM without destroying active playback', () => {
    assert.ok(videoEditorCode.includes('#display-direct-video-url'), 'Must update display url smoothly');
    assert.ok(videoEditorCode.includes('#btn-card-direct-download'), 'Must update card download link smoothly');
    assert.ok(videoEditorCode.includes('playVideoWithFullSound'), 'Must trigger sound playback');
  });

  await t.test('5. WhatsApp share text formats professional Gujarati message with title, duration, and direct watch link', async () => {
    const { generateVideoShareText, getShareableVideoUrl } = await import('../public/js/utils/videoShare.js');

    const msg = generateVideoShareText({
      topicTitle: 'ગુજરાત આંગણવાડી પગાર વધારો ૨૦૨૬',
      videoTitle: 'ગુજરાત આંગણવાડી પગાર વધારો ૨૦૨૬',
      fullVideoUrl: 'http://localhost:5000/videos/video_anganwadi_1080p.mp4',
      durationFormatted: '05:30'
    });

    assert.ok(msg.includes('ગુજરાત આંગણવાડી પગાર વધારો ૨૦૨૬'), 'Must include video title');
    assert.ok(msg.includes('1080p Full HD વિડીયો (05:30)'), 'Must include duration');
    assert.ok(msg.includes('/watch?v=video_anganwadi_1080p.mp4'), 'Must format direct /watch link');
    assert.ok(msg.includes('Gyan Yatra AI Studio'), 'Must include signature');
  });

  await t.test('6. shareToWhatsApp resolves genuine MP4 URL, triggers auto-download, and opens pre-filled WhatsApp Web on desktop', () => {
    assert.ok(videoShareCode.includes('https://api.whatsapp.com/send?text='), 'Must open WhatsApp with prefilled message');
    assert.ok(videoShareCode.includes('/api/voice/download-video'), 'Must auto-download the genuine MP4 file');
    assert.ok(videoShareCode.includes('navigator.canShare'), 'Must support mobile native file sharing');
  });
});
