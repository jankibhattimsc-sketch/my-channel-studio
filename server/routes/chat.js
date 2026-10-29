const express = require('express');
const router = express.Router();
const openaiService = require('../services/openaiService');
const googleService = require('../services/googleService');
const db = require('../db');

// List conversations
router.get('/conversations', (req, res) => {
  try {
    const list = db.getConversations();
    res.json({ success: true, conversations: list });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create new conversation
router.post('/conversations', (req, res) => {
  try {
    const { title = 'નવી ચર્ચા (New Chat)' } = req.body;
    const conv = db.createConversation(title);
    res.json({ success: true, conversation: conv });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete conversation
router.delete('/conversations/:id', (req, res) => {
  try {
    db.deleteConversation(req.params.id);
    res.json({ success: true, message: 'ચર્ચા કાઢી નાખવામાં આવી છે' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get messages for a conversation
router.get('/conversations/:id/messages', (req, res) => {
  try {
    const messages = db.getMessages(req.params.id);
    res.json({ success: true, messages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send message to ChatGPT Creator Assistant
router.post('/message', async (req, res) => {
  try {
    const { conversationId, message, includeChannelContext = true } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message content is required' });
    }

    const convId = conversationId || 'default-conv';

    // Store user message
    const userMsg = db.addMessage({
      conversationId: convId,
      role: 'user',
      content: message.trim()
    });

    // Optionally attach channel context
    let channelContext = null;
    if (includeChannelContext) {
      try {
        const profile = await googleService.getChannelProfile();
        const analytics = await googleService.getAnalytics();
        channelContext = {
          channelName: profile.channel?.title,
          subscriberCount: profile.channel?.subscriberCount,
          views48h: analytics.views48h?.total,
          revenue48h: analytics.revenue48h?.amount ? `${analytics.revenue48h.amount} ${analytics.revenue48h.currency}` : 'Pending',
          topVideoTitle: analytics.topVideos?.[0]?.title
        };
      } catch (err) {
        console.warn('[Chat] Could not load channel context:', err.message);
      }
    }

    // Call OpenAI Assistant service
    const aiResponse = await openaiService.chat({
      conversationId: convId,
      userMessage: message.trim(),
      channelContext
    });

    // Store assistant response in DB
    const assistantMsg = db.addMessage({
      conversationId: convId,
      role: 'assistant',
      content: aiResponse.reply,
      metadata: {
        model: aiResponse.model,
        source: aiResponse.source
      }
    });

    res.json({
      success: true,
      message: assistantMsg,
      model: aiResponse.model,
      source: aiResponse.source,
      notice: aiResponse.notice || null,
      warning: aiResponse.warning || null
    });
  } catch (err) {
    console.error('[Chat Message Route Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
