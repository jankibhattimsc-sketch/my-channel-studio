const express = require('express');
const router = express.Router();
const googleService = require('../services/googleService');
const db = require('../db');

// Get 48-Hour Views, Revenue, Watch Time & Analytics
router.get('/analytics', async (req, res) => {
  try {
    const { refresh } = req.query;

    // Check cache unless refresh requested
    if (!refresh) {
      const cached = db.getAnalyticsCache();
      if (cached && (Date.now() - new Date(cached.cachedAt).getTime() < 10 * 60 * 1000)) {
        return res.json({ success: true, data: cached, fromCache: true });
      }
    }

    const data = await googleService.getAnalytics();
    db.setAnalyticsCache(data);

    res.json({ success: true, data, fromCache: false });
  } catch (err) {
    console.error('[YouTube Analytics Route Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get Video list (Recent & Top)
router.get('/videos', async (req, res) => {
  try {
    const analytics = await googleService.getAnalytics();
    res.json({
      success: true,
      topVideos: analytics.topVideos || [],
      recentVideos: analytics.recentVideos || []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
