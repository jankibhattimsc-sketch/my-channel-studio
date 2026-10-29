const express = require('express');
const router = express.Router();
const openaiService = require('../services/openaiService');
const googleService = require('../services/googleService');

router.post('/generate', async (req, res) => {
  try {
    const { topic, category = 'general' } = req.body;
    if (!topic || !topic.trim()) {
      return res.status(400).json({ success: false, error: 'ટોપિકનું નામ દાખલ કરવું જરૂરી છે. (Topic name is required)' });
    }

    // Get channel context if connected
    const profile = await googleService.getChannelProfile();
    const channelContext = {
      channelName: profile.channel?.title,
      subscriberCount: profile.channel?.subscriberCount
    };

    const seoData = await openaiService.generateSEO(topic.trim(), category, channelContext);

    res.json({
      success: true,
      data: seoData
    });
  } catch (err) {
    console.error('[SEO Route Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
