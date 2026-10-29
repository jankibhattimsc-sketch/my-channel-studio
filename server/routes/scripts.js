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

// Save or Update Script
router.post('/save', (req, res) => {
  try {
    const { script } = req.body;
    if (!script || !script.title) {
      return res.status(400).json({ success: false, error: 'Script object with title is required' });
    }

    const saved = db.saveScript(script);
    res.json({
      success: true,
      message: 'સ્ક્રિપ્ટ સફળતાપૂર્વક સાચવવામાં આવી છે. (Script saved successfully)',
      script: saved
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
