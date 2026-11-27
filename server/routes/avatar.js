const express = require('express');
const router = express.Router();
const avatarService = require('../services/avatarService');
const openaiService = require('../services/openaiService');

router.post('/analyze-director', async (req, res) => {
  try {
    const {
      speakerImageBase64 = '',
      productImagesBase64 = [],
      speechHint = '',
      answerLanguage = 'gu'
    } = req.body || {};
    const result = await openaiService.analyzeAvatarScenePrompt({
      speakerImageBase64,
      productImagesBase64,
      speechHint,
      answerLanguage
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[AvatarDirector Route Error]:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/status', (req, res) => {
  try {
    res.json({ success: true, ...avatarService.getStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/audios', (req, res) => {
  try {
    res.json({ success: true, audios: avatarService.listAvailableAudios() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/render', (req, res) => {
  try {
    const job = avatarService.createRenderJob(req.body || {});
    res.json({ success: true, jobId: job.jobId, job });
  } catch (err) {
    console.error('[AvatarRoute] Render error:', err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/job/:jobId', (req, res) => {
  const job = avatarService.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ success: false, error: 'જોબ મળ્યું નથી.' });
  }
  res.json({ success: true, job });
});

module.exports = router;
