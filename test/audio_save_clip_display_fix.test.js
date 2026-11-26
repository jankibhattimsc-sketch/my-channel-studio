const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('Audio Save and Clip Display Fix Verification', async (t) => {
  const audioStorageCode = fs.readFileSync('public/js/utils/audioStorage.js', 'utf8');
  const slideAudioConnectorCode = fs.readFileSync('public/js/utils/slideAudioConnector.js', 'utf8');
  const slideVoiceStudioCode = fs.readFileSync('public/js/components/slideVoiceStudio.js', 'utf8');
  const videoEditorCode = fs.readFileSync('public/js/views/videoeditor.js', 'utf8');

  await t.test('1. audioStorage.js handles ArrayBuffer/Uint8Array and never discards in-session blob URLs', () => {
    // Check getSlideAudioRecord
    assert.ok(
      audioStorageCode.includes('res.blob instanceof ArrayBuffer') || audioStorageCode.includes('res.blob.buffer'),
      'audioStorage must convert ArrayBuffer/buffer blobs to playable object URLs'
    );
    assert.ok(
      !audioStorageCode.includes("!res.url.startsWith('blob:')"),
      'audioStorage must not reject blob: URLs for freshly recorded slide audio'
    );
  });

  await t.test('2. slideAudioConnector.js accepts blob URLs and converts ArrayBuffer blobs', () => {
    assert.ok(
      !slideAudioConnectorCode.includes("!matchedRecord.url.startsWith('blob:')"),
      'slideAudioConnector must not reject blob URLs'
    );
    assert.ok(
      slideAudioConnectorCode.includes('matchedRecord.blob instanceof ArrayBuffer') || slideAudioConnectorCode.includes('matchedRecord.blob.buffer'),
      'slideAudioConnector must handle ArrayBuffer blobs'
    );
  });

  await t.test('3. slideVoiceStudio.js declares largeModal and largeAudio at the top of attachEvents', () => {
    const attachIdx = slideVoiceStudioCode.indexOf('function attachEvents()');
    const modalDeclIdx = slideVoiceStudioCode.indexOf('const largeModal =');
    const legacyCompatIdx = slideVoiceStudioCode.indexOf('Legacy test compatibility');

    assert.ok(attachIdx > -1, 'attachEvents must exist');
    assert.ok(modalDeclIdx > attachIdx, 'largeModal must be declared inside attachEvents');
    assert.ok(modalDeclIdx < legacyCompatIdx, 'largeModal must be declared before legacy compatibility block');
  });

  await t.test('4. slideVoiceStudio.js resolves audioUrl reliably from storage state for recorded slides', () => {
    assert.ok(
      slideVoiceStudioCode.includes('const sRec = slideAudioState[sId]'),
      'slideVoiceStudio must check sRec when mapping recordedSlides'
    );
    assert.ok(
      slideVoiceStudioCode.includes('cur.hasAudio = true'),
      'autoSaveSlideRecording must mark cur.hasAudio = true'
    );
    assert.ok(
      slideVoiceStudioCode.includes('sMatch.hasAudio = true'),
      'autoSaveSlideRecording must mark sMatch.hasAudio = true'
    );
  });

  await t.test('5. videoeditor.js updates storedSlideAudios and checks stored audios for clip card sound badge', () => {
    // When saving quick single slide record
    assert.ok(
      videoEditorCode.includes('storedSlideAudios.push(singleAudioItem)'),
      'videoeditor.js must add new single slide recording to storedSlideAudios'
    );
    // When saving live recorder slices
    assert.ok(
      videoEditorCode.includes('storedSlideAudios.push(slideAudioItem)'),
      'videoeditor.js must add multi-slide slice recording to storedSlideAudios'
    );
    // In generatedClips card rendering
    assert.ok(
      videoEditorCode.includes('const hasSnd = Boolean((c.hasAudio && c.audioUrl) || c.audioUrl || matchedAudio?.url || matchedAudio?.blob || matchedAudio?.dataUrl);'),
      'videoeditor.js must consider matchedAudio in storedSlideAudios for hasSnd badge'
    );
  });

  await t.test('6. PWA cache version is updated across app shell and imports', () => {
    const swCode = fs.readFileSync('public/sw.js', 'utf8');
    const appCode = fs.readFileSync('public/js/app.js', 'utf8');
    const indexCode = fs.readFileSync('public/index.html', 'utf8');
    const myvoiceCode = fs.readFileSync('public/js/views/myvoice.js', 'utf8');

    assert.ok(/gyan-yatra-v9[7-9]\./.test(swCode), 'Service worker must be >= v97.0');
    assert.ok(/\/js\/app\.js\?v=9[7-9]\./.test(indexCode), 'index.html must load app.js >= v97.0');
    assert.ok(/myvoice\.js\?v=9[7-9]\./.test(appCode), 'app.js must load myvoice.js >= v97.0');
    assert.ok(/videoeditor\.js\?v=9[7-9]\./.test(appCode), 'app.js must load videoeditor.js >= v97.0');
    assert.ok(/slideVoiceStudio\.js\?v=9[7-9]\./.test(myvoiceCode), 'myvoice.js must load slideVoiceStudio.js >= v97.0');
  });

  await t.test('7. Crystal-Clear Audio Joining: broadcast limiter, double-enhancement prevention & balanced loudness', () => {
    const videoEditorCode = fs.readFileSync('public/js/views/videoeditor.js', 'utf8');
    const audioStitcherCode = fs.readFileSync('public/js/utils/audioStitcher.js', 'utf8');
    const enhancerCode = fs.readFileSync('public/js/utils/audioRecorderEnhancer.js', 'utf8');
    const voiceRouteCode = fs.readFileSync('server/routes/voice.js', 'utf8');
    const pyEnhancerCode = fs.readFileSync('server/utils/ai_spectral_enhancer.py', 'utf8');
    const slideVoiceStudioCode = fs.readFileSync('public/js/components/slideVoiceStudio.js', 'utf8');

    // 1. Broadcast brickwall limiter in startVideoCreation
    assert.ok(videoEditorCode.includes('limiter.threshold.value = -1.0'), 'Limiter threshold must be -1.0 dBFS true peak');
    assert.ok(videoEditorCode.includes('limiter.ratio.value = 20.0'), 'Limiter ratio must be 20.0 brickwall');
    assert.ok(videoEditorCode.includes('masterGain.gain.value = 1.0'), 'Master gain must be calibrated to 1.0 to prevent digital clipping');

    // 2. Double-enhancement prevention on joining
    assert.ok(videoEditorCode.includes('isAlreadyEnhanced'), 'Must detect if clip was already enhanced during recording');
    assert.ok(videoEditorCode.includes('normalizeToTargetLoudness(buf'), 'Already enhanced audio must use pure loudness normalization');

    // 3. Audio stitcher speech protection parameters
    assert.ok(audioStitcherCode.includes('thresholdDb: options.trimThresholdDb || -48'), 'Trim threshold must be -48 dB');
    assert.ok(audioStitcherCode.includes('paddingSec: options.trimPadSec || 0.18'), 'Trim padding must be 0.18s');

    // 4. Companion audio loudness balancing enabled
    assert.ok(videoEditorCode.includes('balanceSlideLoudness: true'), 'Presentation companion audio must balance slide loudness');

    // 5. Crystal noise elimination: Post-loudness gate & Python 96% spectral denoising
    assert.ok(enhancerCode.includes('attenuationDb: -52 * Math.min(1.0, Math.max(0.7, noiseReduction))'), 'Post-loudness gate suppresses amplified pause hiss');
    assert.ok(pyEnhancerCode.includes('prop_decrease=0.96'), 'Python spectral denoising set to 96%');
    assert.ok(voiceRouteCode.includes('Math.pow(10, -42 / 20)'), 'Server DSP has -42dB studio floor');

    // 6. Resilient combine: joins whatever recordings are available
    assert.ok(slideVoiceStudioCode.includes('recordedCount === 0'), 'combineAllRecordings allows combining available recorded slides');
  });
});

