const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Slide 5 Fresh Audio Priority & Truncation Fix Verification', async (t) => {
  const voiceRouteCode = fs.readFileSync('server/routes/voice.js', 'utf8');
  const videoEditorCode = fs.readFileSync('public/js/views/videoeditor.js', 'utf8');
  const enhancerCode = fs.readFileSync('public/js/utils/audioRecorderEnhancer.js', 'utf8');
  const slideVoiceStudioCode = fs.readFileSync('public/js/components/slideVoiceStudio.js', 'utf8');

  await t.test('1. server/routes/voice.js prioritizes incoming audioBase64 over stale disk files', () => {
    // Check that audioBase64 check is prioritized before rawSlidePath fallback
    const b64Idx = voiceRouteCode.indexOf('if (audioBase64 && typeof audioBase64 === \'string\' && audioBase64.length > 44)');
    const diskRawIdx = voiceRouteCode.indexOf('if (!inputBuffer || inputBuffer.length <= 44)');
    assert.ok(b64Idx !== -1, 'Must check and decode audioBase64 first');
    assert.ok(diskRawIdx !== -1, 'Must have disk raw fallback only if inputBuffer is empty');
    assert.ok(b64Idx < diskRawIdx, 'Fresh live audioBase64 must be evaluated before stale disk raw file check');
    assert.ok(voiceRouteCode.includes('fs.writeFileSync(rawSlidePath, inputBuffer)'), 'Must update rawSlidePath with fresh recording buffer');
  });

  await t.test('2. server/routes/voice.js sanitizes projectId preventing _object_Object_', () => {
    assert.ok(
      voiceRouteCode.includes("cleanProjId = (typeof projectId === 'object' && projectId !== null)"),
      'Must sanitize object projectId'
    );
  });

  await t.test('3. audioRecorderEnhancer.js protects speech endings with safe gating and 300ms+ hold', () => {
    assert.ok(
      enhancerCode.includes('const safeGateFloor = Math.min(-44, noiseRmsDb + 2.5);'),
      'Must never gate above noise floor or -44 dBFS'
    );
    assert.ok(
      enhancerCode.includes('const effectiveHoldMs = Math.max(300, holdMs);'),
      'Must hold gate for at least 300ms to preserve human speech pauses'
    );
    assert.ok(
      enhancerCode.includes('const attackCoeff = 0.85;'),
      'Must use fast attack to preserve speech transients'
    );
  });

  await t.test('4. videoeditor.js clears stale enhancedBlob/serverUrl and invalidates presentationStitchedUrl', () => {
    assert.ok(
      videoEditorCode.includes('delete cur.enhancedBlob;'),
      'Must delete stale cur.enhancedBlob on new recording'
    );
    assert.ok(
      videoEditorCode.includes('delete cur.serverUrl;'),
      'Must delete stale cur.serverUrl on new recording'
    );
    assert.ok(
      videoEditorCode.includes('presentationStitchedUrl = null;'),
      'Must invalidate presentationStitchedUrl on new recording'
    );
  });

  await t.test('5. videoeditor.js loads in-session fresh blob before server WAV in startVideoCreation & prewarmPresentationAudio', () => {
    // In startVideoCreation:
    const startVidFnIdx = videoEditorCode.indexOf('async function startVideoCreation()');
    assert.ok(startVidFnIdx !== -1, 'startVideoCreation must exist');
    const startVidSub = videoEditorCode.slice(startVidFnIdx, startVidFnIdx + 15000);
    const activeBlobIdx = startVidSub.indexOf('const activeBlob = c.blob || matched?.blob || c.rawBlob');
    const enhServerIdx = startVidSub.indexOf('const enhServerUrl = (matched?.serverUrl && matched.serverUrl.includes(\'enhanced\'))');
    assert.ok(activeBlobIdx !== -1, 'Must check fresh user blob in startVideoCreation');
    assert.ok(enhServerIdx !== -1, 'Must check enhServerUrl in startVideoCreation');
    assert.ok(activeBlobIdx < enhServerIdx, 'Fresh user blob must be prioritized ahead of server WAV file');

    // In prewarmPresentationAudio:
    const prewarmFnIdx = videoEditorCode.indexOf('async function prewarmPresentationAudio()');
    assert.ok(prewarmFnIdx !== -1, 'prewarmPresentationAudio must exist');
    const prewarmSub = videoEditorCode.slice(prewarmFnIdx, prewarmFnIdx + 8000);
    const prewarmActiveBlobIdx = prewarmSub.indexOf('const activeStdBlob = c.blob || matched?.blob || c.rawBlob');
    const prewarmEnhServerIdx = prewarmSub.indexOf('const enhServerUrl = (matched?.serverUrl && matched.serverUrl.includes(\'enhanced\'))');
    assert.ok(prewarmActiveBlobIdx !== -1, 'Must check fresh user blob in prewarmPresentationAudio');
    assert.ok(prewarmEnhServerIdx !== -1, 'Must check enhServerUrl in prewarmPresentationAudio');
    assert.ok(prewarmActiveBlobIdx < prewarmEnhServerIdx, 'Fresh user blob must be prioritized ahead of server WAV in prewarm');
  });

  await t.test('6. slideVoiceStudio.js propagates fresh blob and durations to generatedClips', () => {
    assert.ok(
      slideVoiceStudioCode.includes('cMatch.blob = recordItem.blob;'),
      'slideVoiceStudio must update cMatch.blob in generatedClips'
    );
    assert.ok(
      slideVoiceStudioCode.includes('cMatch.enhancedBlob = recordItem.enhancedBlob;'),
      'slideVoiceStudio must update cMatch.enhancedBlob in generatedClips'
    );
  });

  await t.test('7. audioStorage.js sorts records by newest timestamp first', () => {
    const storageCode = fs.readFileSync('public/js/utils/audioStorage.js', 'utf8');
    assert.ok(
      storageCode.includes('resultList.sort((a, b) =>'),
      'audioStorage must sort results so freshest recordings are found first'
    );
  });

  await t.test('8. videoeditor.js connects btn-quick-create-video-step1 to startVideoCreation', () => {
    assert.ok(
      videoEditorCode.includes("container.querySelectorAll('#btn-quick-create-video-step1').forEach"),
      'Must attach click handler to btn-quick-create-video-step1'
    );
  });

  await t.test('9. videoeditor.js guarantees effectiveTrackDur is never less than buffer duration', () => {
    assert.ok(
      videoEditorCode.includes('const effectiveTrackDur = (buf && buf.duration > clipDur) ? buf.duration : clipDur;'),
      'effectiveTrackDur must equal or exceed buffer.duration to prevent syllable cutoffs'
    );
    assert.ok(
      videoEditorCode.includes('const scheduledEndTime = exportStartTime + totalDur + 0.40;'),
      'Must provide 0.40s tail padding for clean end of video recording'
    );
  });

  await t.test('10. scriptwriter.js navigates directly to videoeditor (Tool 5)', () => {
    const scriptCode = fs.readFileSync('public/js/views/scriptwriter.js', 'utf8');
    assert.ok(
      scriptCode.includes("safeNavigate('videoeditor')"),
      'scriptwriter must navigate directly to videoeditor (Tool 5)'
    );
    assert.ok(
      scriptCode.includes("safeNavigate('myvoice')"),
      'scriptwriter must retain safeNavigate(myvoice) compatibility comment'
    );
  });
});
