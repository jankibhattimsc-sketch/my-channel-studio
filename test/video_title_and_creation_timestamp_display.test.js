const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('VIDEO TITLE AND EXACT CREATION TIMESTAMP (KETLA VAGE BNYO) DISPLAY GUARANTEE', async (t) => {
  const videoEditorPath = path.join(__dirname, '../public/js/views/videoeditor.js');
  const videoSharePath = path.join(__dirname, '../public/js/utils/videoShare.js');
  const serverAppPath = path.join(__dirname, '../server/app.js');

  const videoEditorCode = fs.readFileSync(videoEditorPath, 'utf8');
  const videoShareCode = fs.readFileSync(videoSharePath, 'utf8');
  const serverAppCode = fs.readFileSync(serverAppPath, 'utf8');

  await t.test('1. Video editor computes currentVideoTitle and formattedVideoCreationTime with IST timezone', () => {
    assert.ok(
      videoEditorCode.includes('const currentVideoTitle = project.name || project.topic || project.seo?.title'),
      'Must compute currentVideoTitle from project name, topic, or seo title'
    );
    assert.ok(
      videoEditorCode.includes("timeZone: 'Asia/Kolkata'"),
      'Must format timestamp in Indian Standard Time (Asia/Kolkata)'
    );
    assert.ok(
      videoEditorCode.includes("hour12: true"),
      'Must use 12-hour format with AM/PM (સવાર/બપોર/સાંજ/રાત) in Gujarati locale'
    );
  });

  await t.test('2. Saved mode banner displays prominent Title and Creation Time badges', () => {
    assert.ok(
      videoEditorCode.includes('id="display-saved-video-title"'),
      'Must contain display-saved-video-title element'
    );
    assert.ok(
      videoEditorCode.includes('id="display-saved-video-time"'),
      'Must contain display-saved-video-time element'
    );
    assert.ok(
      videoEditorCode.includes('📌 વિડીયો ટાઇટલ: <strong>${currentVideoTitle}</strong>'),
      'Must display current video title prominently'
    );
    assert.ok(
      videoEditorCode.includes('🕒 બન્યા સમય (કેટલા વાગે બન્યો): <strong>${formattedVideoCreationTime}</strong>'),
      'Must display exact creation time prominently'
    );
  });

  await t.test('3. Preview mode callout banner displays Title and Creation Time', () => {
    assert.ok(
      videoEditorCode.includes('📌 <strong>"${currentVideoTitle}"</strong> • 🕒 બન્યા સમય: <strong>${formattedVideoCreationTime}</strong>'),
      'Preview mode banner must show video title and creation time'
    );
  });

  await t.test('4. Saved video player box features overlaid title and creation time badge', () => {
    assert.ok(
      videoEditorCode.includes('<span>🎬 <strong>${currentVideoTitle}</strong></span>'),
      'Player box must overlay video title'
    );
    assert.ok(
      videoEditorCode.includes('<span style="color: #fde047;">• 🕒 ${formattedVideoCreationTime}</span>'),
      'Player box must overlay video creation time'
    );
  });

  await t.test('5. Direct Video Link card and Section 4 Metadata Grid display Title and Time', () => {
    assert.ok(
      videoEditorCode.includes('<span>📌 <strong>વિડીયો ટાઇટલ:</strong> ${currentVideoTitle}</span>'),
      'Direct link card must display video title'
    );
    assert.ok(
      videoEditorCode.includes('<span>🕒 <strong>બન્યા સમય (કેટલા વાગે બન્યો):</strong> ${formattedVideoCreationTime}</span>'),
      'Direct link card must display creation time'
    );
    assert.ok(
      videoEditorCode.includes('id="meta-video-title"'),
      'Metadata grid must contain meta-video-title'
    );
    assert.ok(
      videoEditorCode.includes('id="meta-video-time"'),
      'Metadata grid must contain meta-video-time'
    );
    assert.ok(
      videoEditorCode.includes('🕒 ${formattedVideoCreationTime}'),
      'Metadata grid must render formatted video creation time'
    );
  });

  await t.test('6. WhatsApp share message formats Title and exact Creation Time', async () => {
    const { generateVideoShareText } = await import('../public/js/utils/videoShare.js');

    const shareText = generateVideoShareText({
      videoTitle: 'ગુજરાત ખેડૂત યોજના ૨૦૨૬ સંપૂર્ણ માહિતી',
      fullVideoUrl: 'http://localhost:5000/videos/khedut_yojana_1080p.mp4',
      durationFormatted: '03:45',
      createdAtFormatted: '૦૩:૪૫ બપોરે (૧૭ નવેમ્બર, ૨૦૨૬)'
    });

    assert.ok(
      shareText.includes('🎬 *વિડીયો ટાઇટલ:* ગુજરાત ખેડૂત યોજના ૨૦૨૬ સંપૂર્ણ માહિતી'),
      'Share text must contain video title'
    );
    assert.ok(
      shareText.includes('🕒 *બન્યા સમય:* ૦૩:૪૫ બપોરે (૧૭ નવેમ્બર, ૨૦૨૬)'),
      'Share text must contain creation time'
    );
    assert.ok(
      shareText.includes('/watch?v=khedut_yojana_1080p.mp4'),
      'Share text must link to watch player'
    );
  });

  await t.test('7. Server /watch standalone page displays video title and file creation timestamp', () => {
    assert.ok(
      serverAppCode.includes("let fileTimeDisplay ="),
      'Server must extract and format file creation time'
    );
    assert.ok(
      serverAppCode.includes("• 🕒 બન્યા સમય:"),
      'Server /watch player must display creation time'
    );
    assert.ok(
      serverAppCode.includes("fileTimeDisplay"),
      'Server /watch template must include fileTimeDisplay'
    );
  });
});
