const express = require('express');
const router = express.Router();
const openaiService = require('../services/openaiService');
const db = require('../db');

// Generate Script with Sequential Section Preservation
router.post('/generate', async (req, res) => {
  try {
    const {
      topic,
      durationMinutes = 10,
      language = 'gu',
      speakingTone = 'engaging',
      referenceSample = ''
    } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ success: false, error: 'Topic is required' });
    }

    const script = await openaiService.generateScript({
      topic: topic.trim(),
      durationMinutes: parseFloat(durationMinutes) || 10,
      language,
      speakingTone,
      referenceSample
    });

    res.json({ success: true, script });
  } catch (err) {
    console.error('[Scripts Generate Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate Exact Slide-Wise Script matching imported PDF/PPT slides
router.post('/generate-slidewise', async (req, res) => {
  try {
    const {
      projectId,
      slides,
      topic = '',
      durationMinutes = 8,
      speakingTone = 'news_conversational',
      autoSave = true
    } = req.body;

    if (!Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({ success: false, error: 'સ્લાઇડ્સ ડેટા જરૂરી છે. (Slides data is required)' });
    }

    const scriptResult = await openaiService.generateSlideWiseScript({
      slides,
      topic: topic || (projectId ? db.getProjectById?.(projectId)?.name : ''),
      durationMinutes: parseFloat(durationMinutes) || 8,
      speakingTone
    });

    let saved = null;
    if (autoSave && projectId) {
      saved = db.saveScript({
        projectId,
        title: scriptResult.title || topic,
        rawText: scriptResult.rawText,
        fullText: scriptResult.fullText,
        sections: scriptResult.sections,
        source: scriptResult.source || 'ChatGPT',
        validation: scriptResult.validation
      });
    }

    res.json({
      success: true,
      message: '✅ સ્લાઇડ-વાઇઝ ગુજરાતી સ્ક્રિપ્ટ સફળતાપૂર્વક તૈયાર થઈ ગઈ!',
      script: scriptResult,
      savedInDb: Boolean(saved)
    });
  } catch (err) {
    console.error('[Scripts Generate-SlideWise Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save or Update Script with Permanent Project Storage & Version History
router.post('/save', (req, res) => {
  try {
    const scriptData = req.body.script || req.body;
    if (!scriptData) {
      return res.status(400).json({ success: false, error: 'Script data is required' });
    }

    const raw = (scriptData.rawText || scriptData.fullText || scriptData.scriptText || '').trim();
    if (!raw && (!scriptData.sections || scriptData.sections.length === 0)) {
      return res.status(400).json({ success: false, error: 'સ્ક્રિપ્ટનું લખાણ ખાલી છે. (Script text is empty)' });
    }

    const saved = db.saveScript(scriptData);
    res.json({
      success: true,
      message: '✅ સ્ક્રિપ્ટ Database માં કાયમી રીતે સુરક્ષિત સચવાઈ ગઈ છે! (Script permanently saved in database)',
      script: saved
    });
  } catch (err) {
    console.error('[Scripts Save Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get latest script for a project
router.get('/project/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const script = db.getLatestScriptByProjectId(projectId);
    if (!script) {
      return res.json({ success: true, script: null, versions: [] });
    }
    res.json({
      success: true,
      script,
      versions: script.versions || []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get version history for a project
router.get('/project/:projectId/versions', (req, res) => {
  try {
    const { projectId } = req.params;
    const script = db.getLatestScriptByProjectId(projectId);
    res.json({
      success: true,
      versions: script?.versions || []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Restore previous script version for a project
router.post('/project/:projectId/restore/:scriptId', (req, res) => {
  try {
    const { projectId, scriptId } = req.params;
    const restored = db.restoreScriptVersion(projectId, scriptId);
    if (!restored) {
      return res.status(404).json({ success: false, error: 'રિસ્ટોર કરવા માટે જૂની સ્ક્રિપ્ટ વર્ઝન મળેલ નથી.' });
    }
    res.json({
      success: true,
      message: `✅ Version ${restored.version} સફળતાપૂર્વક Restore થઈ ગયું!`,
      script: restored
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all saved scripts
router.get('/', (req, res) => {
  try {
    const scripts = db.getScripts();
    res.json({ success: true, scripts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get script by id
router.get('/:id', (req, res) => {
  try {
    const script = db.getScriptById(req.params.id);
    if (!script) {
      return res.status(404).json({ success: false, error: 'સ્ક્રિપ્ટ મળેલ નથી' });
    }
    res.json({ success: true, script });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete script
router.delete('/:id', (req, res) => {
  try {
    db.deleteScript(req.params.id);
    res.json({ success: true, message: 'સ્ક્રિપ્ટ કાઢી નાખવામાં આવી છે' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
