const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const openaiService = require('../services/openaiService');
const googleService = require('../services/googleService');
const notebooklmPromptService = require('../services/notebooklmPromptService');
const slideVoiceoverService = require('../services/slideVoiceoverService');
const pdfSlideExtractor = require('../services/pdfSlideExtractor');
const slideMakerService = require('../services/slideMakerService');
const db = require('../db');

// Helper to extract YouTube video ID
function extractVideoId(urlOrText) {
  if (!urlOrText) return null;
  const match = urlOrText.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match) return match[1];
  // If user passed direct 11-char ID
  if (/^[\w-]{11}$/.test(urlOrText.trim())) return urlOrText.trim();
  return null;
}

// Research public video URL
router.post('/video', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !url.trim()) {
      return res.status(400).json({ success: false, error: 'YouTube વિડીયો લિંક દાખલ કરવી જરૂરી છે. (YouTube video URL is required)' });
    }

    const videoId = extractVideoId(url.trim());
    let videoMetadata = null;

    // 1. Try fetching via authenticated client or Google API Key
    const settings = db.getSettings();
    const apiKey = settings.googleApiKey || process.env.GOOGLE_API_KEY;
    const authClient = await googleService.getAuthenticatedClient();

    if (videoId) {
      try {
        let youtube;
        if (authClient) {
          youtube = google.youtube({ version: 'v3', auth: authClient });
        } else if (apiKey) {
          youtube = google.youtube({ version: 'v3', auth: apiKey });
        }

        if (youtube) {
          const ytRes = await youtube.videos.list({
            part: ['snippet', 'statistics', 'contentDetails'],
            id: [videoId]
          });

          if (ytRes.data.items && ytRes.data.items[0]) {
            const v = ytRes.data.items[0];
            videoMetadata = {
              videoId: v.id,
              title: v.snippet.title,
              channelTitle: v.snippet.channelTitle,
              publishedAt: v.snippet.publishedAt,
              description: v.snippet.description,
              views: parseInt(v.statistics.viewCount || '0', 10),
              likes: parseInt(v.statistics.likeCount || '0', 10),
              comments: parseInt(v.statistics.commentCount || '0', 10),
              thumbnail: v.snippet.thumbnails?.high?.url || v.snippet.thumbnails?.default?.url,
              tags: v.snippet.tags || [],
              url: `https://www.youtube.com/watch?v=${v.id}`
            };
          }
        }
      } catch (ytErr) {
        console.warn('[Research] YouTube API fetch notice:', ytErr.message);
      }

      // If YouTube API not reachable or quota exhausted, fetch oEmbed info
      if (!videoMetadata) {
        try {
          const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
          if (oembedRes.ok) {
            const oembedData = await oembedRes.json();
            videoMetadata = {
              videoId,
              title: oembedData.title,
              channelTitle: oembedData.author_name,
              thumbnail: oembedData.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
              url: `https://www.youtube.com/watch?v=${videoId}`,
              description: 'જાહેર વિડીયો માહિતી (YouTube oEmbed Verified)'
            };
          }
        } catch (oembedErr) {
          console.warn('[Research] oEmbed fallback notice:', oembedErr.message);
        }
      }
    }

    // If still no metadata, build reasonable representation
    if (!videoMetadata) {
      videoMetadata = {
        videoId: videoId || 'sample-video',
        title: url.trim(),
        channelTitle: 'જાહેર YouTube વિડીયો',
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=480&auto=format&fit=crop&q=80',
        url: url.startsWith('http') ? url : `https://www.youtube.com`,
        description: 'પબ્લિક વિશ્લેષણ'
      };
    }

    // Perform AI analysis
    const analysis = await openaiService.researchCompetitorVideo(url, videoMetadata);

    const report = {
      id: `research-${Date.now()}`,
      videoMetadata,
      analysis,
      researchDate: new Date().toISOString(),
      disclaimer: 'આ વિશ્લેષણ સંપૂર્ણપણે જાહેર માહિતી અને એઆઈ અવલોકન પર આધારિત છે. ખાનગી કમાણી કે આંતરિક સ્ટુડિયો ડેટા શામેલ નથી.'
    };

    db.saveResearch(report);

    res.json({
      success: true,
      report
    });
  } catch (err) {
    console.error('[Research Route Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get previous research history
router.get('/history', (req, res) => {
  try {
    const list = db.getResearchList();
    res.json({ success: true, history: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate NotebookLM Deep Research + White PPT Prompt
router.post('/notebooklm-prompt', (req, res) => {
  try {
    const {
      topic,
      templateId = 'white-real',
      tool = 'notebooklm-slides',
      slideCount = '8-10',
      audience = 'job-seekers',
      language = 'gu',
      includeBranding = true
    } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ success: false, error: 'Topic is required' });
    }

    const result = notebooklmPromptService.generateNotebookLMPrompt({
      topic: topic.trim(),
      templateId,
      tool,
      slideCount,
      audience,
      language,
      includeBranding
    });

    res.json(result);
  } catch (err) {
    console.error('[NotebookLM Prompt Route Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/notebooklm-prompt', (req, res) => {
  try {
    const {
      topic,
      templateId = 'white-real',
      tool = 'notebooklm-slides',
      slideCount = '8-10',
      audience = 'job-seekers',
      language = 'gu',
      includeBranding = 'true'
    } = req.query;

    if (!topic || !topic.trim()) {
      return res.status(400).json({ success: false, error: 'Topic is required' });
    }

    const result = notebooklmPromptService.generateNotebookLMPrompt({
      topic: topic.trim(),
      templateId,
      tool,
      slideCount,
      audience,
      language,
      includeBranding: includeBranding !== 'false'
    });

    res.json(result);
  } catch (err) {
    console.error('[NotebookLM Prompt GET Route Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Slide-by-Slide Gujarati Voiceover Script Prompt Generator (Gyan Yatra Master Prompt)
router.post('/slide-voiceover-prompt', (req, res) => {
  try {
    const { slides, overallTopic, targetAudience, explanationDepth, language } = req.body;
    const result = slideVoiceoverService.generateMasterPromptForSlides({
      slides,
      overallTopic,
      targetAudience,
      explanationDepth,
      language
    });
    res.json(result);
  } catch (err) {
    console.error('[Slide Voiceover Route Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single slide prompt regeneration
router.post('/slide-voiceover-prompt/single', (req, res) => {
  try {
    const { slide, index, totalSlides, overallTopic, targetAudience, explanationDepth, language } = req.body;
    const promptItem = slideVoiceoverService.regenerateSingleSlidePrompt(slide, index || 0, totalSlides || 1, {
      overallTopic,
      targetAudience,
      explanationDepth,
      language
    });
    res.json({ success: true, slidePrompt: promptItem });
  } catch (err) {
    console.error('[Single Slide Voiceover Route Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Upload & Parse Full Slide PDF to extract slides and generate Section 9 script prompts
router.post('/upload-slide-pdf', async (req, res) => {
  try {
    const { pdfBase64, overallTopic, explanationDepth, language, targetAudience, autoGenerate, filename } = req.body;
    
    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'PDF ડેટા મળ્યો નથી. મહેરબાની કરીને માન્ય PDF ફાઇલ પસંદ કરો. (No valid PDF data provided)'
      });
    }

    // Strip data URL header if present (e.g. data:application/pdf;base64,... or data:application/octet-stream;base64,...)
    const commaIdx = pdfBase64.indexOf('base64,');
    const rawBase64 = commaIdx !== -1 ? pdfBase64.slice(commaIdx + 7) : pdfBase64;
    const cleanBase64 = rawBase64.replace(/\s/g, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const extracted = await pdfSlideExtractor.extractSlidesFromPdf(buffer, {
      overallTopic,
      explanationDepth,
      language,
      targetAudience,
      filename: filename || 'slides.pdf',
      autoGenerate: autoGenerate !== false
    });

    res.json({
      success: true,
      filename: filename || 'slides.pdf',
      ...extracted
    });
  } catch (err) {
    console.error('[Upload Slide PDF Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate White Slides with Heading Box and Bullet Points
router.post('/generate-white-slides', (req, res) => {
  try {
    const { topic, domain, slideCount, headingBoxStyle, accentColor } = req.body;
    const slides = slideMakerService.generateWhiteSlides({
      topic,
      domain,
      slideCount,
      headingBoxStyle,
      accentColor
    });
    res.json({
      success: true,
      topic: topic || 'ગુજરાત સરકાર સત્તાવાર પરિપત્ર',
      slideCount: slides.length,
      slides
    });
  } catch (err) {
    console.error('[Generate White Slides Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

