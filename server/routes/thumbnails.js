const express = require('express');
const router = express.Router();
const openaiService = require('../services/openaiService');
const thumbnailOptimizerService = require('../services/thumbnailOptimizerService');

// Smart Thumbnail Text & Color Contrast Optimizer
router.post('/smart-optimizer', (req, res) => {
  try {
    const { topic = '', overrides = {} } = req.body;
    const result = thumbnailOptimizerService.generateOptimizedPrompt(topic, overrides);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Thumbnail Smart Optimizer Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate 3 Thumbnail Concepts
router.post('/concepts', async (req, res) => {
  try {
    const { topic, category = 'general' } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ success: false, error: 'Topic name is required' });
    }

    const result = await openaiService.generateThumbnailConcepts(topic.trim(), category);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Thumbnails Concepts Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate AI Thumbnail Image via OpenAI DALL-E 3 or High-Speed AI Generator
router.post('/generate-image', async (req, res) => {
  try {
    const { prompt, conceptId = 1, topic = '' } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Image prompt is required' });
    }

    const openai = openaiService.getOpenAIClient();

    // 1. Try OpenAI DALL-E 3 if client configured
    if (openai) {
      try {
        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt: `${prompt}, clean 16:9 aspect ratio, high resolution YouTube thumbnail art, no illegible text, professional lighting`,
          n: 1,
          size: '1024x1024',
          quality: 'standard'
        });

        if (response.data && response.data[0]?.url) {
          return res.json({
            success: true,
            imageUrl: response.data[0].url,
            provider: 'dall-e-3'
          });
        }
      } catch (dalleErr) {
        console.warn('[DALL-E 3 notice]:', dalleErr.message, 'Falling back to high-res AI image generator.');
      }
    }

    // 2. High-speed AI Image Provider (Pollinations.ai / Unsplash 16:9 fallback)
    const cleanPrompt = encodeURIComponent(`${prompt} youtube thumbnail 16:9 4k hyperrealistic`);
    const seed = Math.floor(Math.random() * 999999);
    const fallbackUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1280&height=720&model=flux&seed=${seed}&nologo=true`;

    res.json({
      success: true,
      imageUrl: fallbackUrl,
      provider: 'ai-flux-renderer',
      notice: 'AI જનરેટ કરેલ 16:9 થંબનેલ બેકગ્રાઉન્ડ તૈયાર છે.'
    });
  } catch (err) {
    console.error('[Generate Image Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
