const express = require('express');
const router = express.Router();
const voiceService = require('../services/voiceService');

// Get all available voice profiles
router.get('/profiles', (req, res) => {
  try {
    const profiles = voiceService.getProfiles();
    res.json({ success: true, profiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate audio speech from Gujarati text
router.post('/generate', async (req, res) => {
  try {
    const {
      text,
      profileId,
      voiceId,
      speed,
      emotion,
      apiKey,
      customVoiceId,
      stability,
      similarity,
      style,
      modelId,
      actorMode,
      actorStyle,
      mainTopic
    } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'ઓડિયો જનરેટ કરવા માટે લખાણ આપવું જરૂરી છે.' });
    }

    const result = await voiceService.generateVoice({
      text,
      profileId: profileId || 'google-wavenet-female',
      voiceId,
      speed: parseFloat(speed) || 1.0,
      emotion: emotion || 'enthusiastic',
      apiKey: apiKey || null,
      customVoiceId: customVoiceId || null,
      stability: parseFloat(stability) || 0.55,
      similarity: parseFloat(similarity) || 0.85,
      style: parseFloat(style) || 0.15,
      modelId: modelId || null,
      actorMode: Boolean(actorMode),
      actorStyle: actorStyle || 'breaking',
      mainTopic: mainTopic || ''
    });

    res.json(result);
  } catch (err) {
    console.error('[VoiceRoute] Generation error:', err);
    res.status(500).json({ error: err.message || 'ઓડિયો જનરેટ કરવામાં સમસ્યા આવી.' });
  }
});

// Direct 1-Click PDF to Complete Narration Audio Endpoint
router.post('/pdf-to-audio', async (req, res) => {
  try {
    const { pdfBase64, filename = 'document.pdf', profileId = 'anchor-dhwani-female', speed = 1.08, emotion = 'enthusiastic' } = req.body;
    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'PDF ફાઇલ મળેલ નથી (PDF data required).' });
    }

    const commaIdx = pdfBase64.indexOf('base64,');
    const rawBase64 = commaIdx !== -1 ? pdfBase64.slice(commaIdx + 7) : pdfBase64;
    const cleanBase64 = rawBase64.replace(/\s/g, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const pdfSlideExtractor = require('../services/pdfSlideExtractor');
    const { sanitizeScriptForSpeech } = require('../services/gujaratiCleaner');

    const extracted = await pdfSlideExtractor.extractSlidesFromPdf(buffer, {
      filename,
      autoGenerate: true
    });

    let narrationText = '';
    const fullText = (extracted.fullPdfText || '').trim();

    if (fullText) {
      const cleaned = sanitizeScriptForSpeech(fullText);
      if (cleaned.length >= 25) {
        narrationText = cleaned;
      }
    }

    if (!narrationText || narrationText.length < 25) {
      const topic = extracted.overallTopic || filename.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
      const slidePoints = (extracted.slides || []).map(s => {
        const pts = (s.content || '').split('\n').filter(p => p.trim() && !p.startsWith('•')).join('. ');
        return `${s.title}: ${pts || s.content}`;
      }).join('\n\n');

      narrationText = `નમસ્તે મિત્રો! એક ખૂબ જ મહત્વના સમાચાર અને સત્તાવાર નિર્ણય સામે આવી રહ્યો છે... ${topic} બાબતે મહત્વપૂર્ણ પરિપત્ર જાહેર થયો છે.\n\n${slidePoints}\n\nઆ વિગત તમારા તમામ મિત્રો સાથે શેર કરજો અને ચેનલને સબ્સ્ક્રાઇબ કરી લેજો. જય હિન્દ, જય ભારત!`;
    }

    const voiceResult = await voiceService.generateVoice({
      text: narrationText,
      profileId: profileId || 'anchor-dhwani-female',
      speed: parseFloat(speed) || 1.08,
      emotion: emotion || 'enthusiastic',
      actorMode: true,
      mainTopic: extracted.overallTopic || filename
    });

    res.json({
      success: true,
      audioUrl: voiceResult.audioUrl,
      filename: voiceResult.filename,
      fileSize: voiceResult.fileSize,
      narrationText: narrationText,
      originalFilename: filename,
      totalPages: extracted.totalPages || 1,
      slideCount: extracted.slideCount || 1,
      topic: extracted.overallTopic || filename,
      slides: extracted.slides || [],
      fullPdfText: extracted.fullPdfText || '',
      provider: voiceResult.provider
    });
  } catch (err) {
    console.error('[VoiceRoute] PDF-to-Audio error:', err);
    res.status(500).json({ success: false, error: err.message || 'PDF માંથી ઓડિયો જનરેટ કરવામાં સમસ્યા આવી.' });
  }
});

// Upload custom user audio file (MP3 / WAV / M4A)
router.post('/upload-audio', async (req, res) => {
  try {
    const { audioBase64, filename = 'user_audio.mp3' } = req.body;
    if (!audioBase64 || typeof audioBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'ઓડિયો ડેટા મળ્યો નથી.' });
    }
    const commaIdx = audioBase64.indexOf('base64,');
    const rawBase64 = commaIdx !== -1 ? audioBase64.slice(commaIdx + 7) : audioBase64;
    const cleanBase64 = rawBase64.replace(/\s/g, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const fs = require('fs');
    const path = require('path');
    const safeName = `uploaded_${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const outDir = path.join(__dirname, '..', '..', 'public', 'audio');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    const outPath = path.join(outDir, safeName);
    fs.writeFileSync(outPath, buffer);

    res.json({
      success: true,
      audioUrl: `/audio/${safeName}`,
      filename: safeName,
      fileSize: buffer.length
    });
  } catch (err) {
    console.error('[VoiceRoute] Upload audio error:', err);
    res.status(500).json({ success: false, error: err.message || 'ઓડિયો અપલોડ કરવામાં સમસ્યા આવી.' });
  }
});

// Prepare Actor Script with Aaroh-Avroh breakdown and Master Actor Prompt
router.post('/actor-script', (req, res) => {
  try {
    const voiceActorService = require('../services/voiceActorService');
    const { text, style, mainTopic } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'સ્ક્રિપ્ટ લખાણ આપવું જરૂરી છે.' });
    }

    const result = voiceActorService.prepareActorScript(text, {
      style: style || 'breaking',
      mainTopic: mainTopic || 'ગુજરાત સરકારી યોજના અને ભરતી પરિપત્ર'
    });

    res.json(result);
  } catch (err) {
    console.error('[VoiceRoute] Actor script error:', err);
    res.status(500).json({ error: err.message || 'અભિનેતા સ્ક્રિપ્ટ તૈયાર કરવામાં સમસ્યા આવી.' });
  }
});

// Analyze script context, genre, and sentence-level prosody
router.post('/analyze-script', (req, res) => {
  try {
    const voiceActorService = require('../services/voiceActorService');
    const { text, userSpeed, userEmotion } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'સ્ક્રિપ્ટ લખાણ આપવું જરૂરી છે.' });
    }
    const result = voiceActorService.analyzeScript(text, { userSpeed, userEmotion });
    res.json(result);
  } catch (err) {
    console.error('[VoiceRoute] Analyze script error:', err);
    res.status(500).json({ error: err.message || 'સ્ક્રિપ્ટ વિશ્લેષણમાં સમસ્યા આવી.' });
  }
});

// Get all generated audio files in the library
router.get('/library', (req, res) => {
  try {
    const library = voiceService.getAudioLibrary();
    res.json({ success: true, library });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rename an audio file
router.post('/rename', (req, res) => {
  try {
    const { oldFilename, newBaseName } = req.body;
    if (!oldFilename || !newBaseName) {
      return res.status(400).json({ error: 'જૂનું અને નવું નામ બંને જરૂરી છે.' });
    }
    const result = voiceService.renameAudioFile(oldFilename, newBaseName);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete an audio file
router.delete('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const result = voiceService.deleteAudioFile(filename);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
