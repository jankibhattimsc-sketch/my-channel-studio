const express = require('express');
const router = express.Router();
const trendsService = require('../services/trendsService');
const openaiService = require('../services/openaiService');
const ocrService = require('../services/ocrService');
const googleService = require('../services/googleService');
const db = require('../db');

function getChannelStats() {
  const authState = db.getAuth();
  const activeChannel = (authState.channels || []).find(c => c.id === authState.activeChannelId) || (authState.channels || [])[0];
  return {
    isConnected: Boolean(authState.isConnected),
    isDemo: !authState.isConnected,
    title: activeChannel?.title || 'Gyan Yatra',
    customUrl: activeChannel?.customUrl || '@gyan.yatra1',
    avatar: activeChannel?.avatar || activeChannel?.thumbnails?.high?.url || '',
    subscribers: activeChannel?.subscriberCount || 0,
    views48h: activeChannel?.views48h || 0,
    videoCount: activeChannel?.videoCount || 0
  };
}

// 48-Hour YouTube Trend Analysis — Exactly 3 Best Video Ideas with Saved Thumbnail & Script Prompts
router.get('/trends-48h', async (req, res) => {
  try {
    const { category = 'all', q = null, channelNiche = null } = req.query;
    const result = await trendsService.get48hTrendAnalysis({ category, customQuery: q, channelNiche });

    const savedList = db.getTopics();
    const savedIds = new Set(savedList.map(t => t.id));

    result.ideas.forEach(idea => {
      idea.isSaved = savedIds.has(idea.id);
    });

    const channelStats = getChannelStats();

    res.json({
      success: true,
      channelStats,
      ...result
    });
  } catch (err) {
    console.error('[Topics 48h Trends Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Trending Topics with Filters and Transparent Scores
router.get('/trending', async (req, res) => {
  try {
    const { category = 'all', q = null, channelNiche = null } = req.query;
    const result = await trendsService.getTopTopics(category, q, channelNiche);
    
    // Mark which ones are already bookmarked in DB
    const savedList = db.getTopics();
    const savedIds = new Set(savedList.map(t => t.id));

    result.topics.forEach(t => {
      t.isSaved = savedIds.has(t.id);
    });

    const channelStats = getChannelStats();

    res.json({
      success: true,
      channelStats,
      ...result
    });
  } catch (err) {
    console.error('[Topics Route Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bookmark a topic
router.post('/save', (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic || !topic.topicGujarati) {
      return res.status(400).json({ success: false, error: 'Topic object is required' });
    }

    db.addSavedTopic(topic);
    res.json({ success: true, message: 'ટોપિક સેવ થઈ ગયો છે. (Topic saved successfully)' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get user's saved topics
router.get('/saved', (req, res) => {
  try {
    const topics = db.getTopics();
    res.json({ success: true, topics });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Analyze 48-Hour YouTube Analytics Screenshots with Server OCR & GPT-4o Vision
router.post('/analyze-screenshot', async (req, res) => {
  try {
    const { imagesBase64 = [], category = 'all' } = req.body;
    let ocrData = req.body.ocrData || null;

    // Fetch recent channel video titles for 100% accurate title enrichment
    let knownChannelTitles = [];
    try {
      knownChannelTitles = await googleService.getChannelRecentVideoTitles();
      if (knownChannelTitles.length > 0) {
        console.log(`[Server OCR] Loaded ${knownChannelTitles.length} official channel video titles for exact title matching.`);
      }
    } catch (e) {
      console.warn('[Server OCR] Could not load channel video titles:', e.message);
    }

    // Run server-side OCR on all uploaded screenshots
    if ((!ocrData || !ocrData.views48h) && imagesBase64.length > 0) {
      try {
        console.log(`[Server OCR] Extracting data from ${imagesBase64.length} uploaded screenshot(s)...`);
        const serverOcr = await ocrService.extractFromMultipleImages(imagesBase64, knownChannelTitles);
        console.log('[Server OCR Result]:', {
          photoCount: imagesBase64.length,
          views48h: serverOcr.views48h,
          views60m: serverOcr.views60m,
          videos: serverOcr.topVideos.length
        });
        ocrData = serverOcr;
      } catch (ocrErr) {
        console.warn('[Server OCR Error]:', ocrErr.message);
      }
    }

    const channelStats = getChannelStats();
    const result = await openaiService.analyzeScreenshot({
      imagesBase64,
      category,
      ocrData,
      channelContext: {
        channelName: channelStats.title,
        subscriberCount: channelStats.subscribers,
        views48h: (ocrData && ocrData.views48h) ? ocrData.views48h : channelStats.views48h
      }
    });

    const detectedViews48h = (ocrData && ocrData.views48h) ? ocrData.views48h : (result.detectedViews48h || 0);
    const detectedViews60m = (ocrData && ocrData.views60m) ? ocrData.views60m : (result.detectedViews60m || 0);
    const topVideos = (ocrData && ocrData.topVideos && ocrData.topVideos.length > 0) ? ocrData.topVideos : (result.topVideos || []);

    res.json({
      success: true,
      channelStats,
      detectedViews48h,
      detectedViews60m,
      topVideos,
      rawOcrText: ocrData ? ocrData.rawText : '',
      ...result
    });
  } catch (err) {
    console.error('[Analyze Screenshot Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
