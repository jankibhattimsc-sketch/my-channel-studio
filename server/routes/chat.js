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

// --- Smart Prompt & Photo Q&A Tool Routes ---
router.get('/smart-ask/history', (req, res) => {
  try {
    res.json({ success: true, history: db.getSmartAskHistory() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/smart-ask/:id', (req, res) => {
  try {
    db.deleteSmartAskEntry(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/smart-clarify', async (req, res) => {
  try {
    const { userInput = '', images = [], answerLanguage = 'gu' } = req.body || {};
    if (!String(userInput).trim() && (!Array.isArray(images) || images.length === 0)) {
      return res.status(400).json({ success: false, error: 'કૃપા કરીને તમારો પ્રશ્ન લખો અથવા ફોટો ઉમેરો.' });
    }
    const result = await openaiService.clarifySmartPrompt({
      userInput,
      imagesBase64: images,
      answerLanguage
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Smart Clarify Route Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/smart-prompt', async (req, res) => {
  try {
    const { userInput = '', images = [], answerLanguage = 'gu', clarifications = [], extraNotes = '' } = req.body || {};
    if (!String(userInput).trim() && (!Array.isArray(images) || images.length === 0)) {
      return res.status(400).json({ success: false, error: 'કૃપા કરીને તમારો પ્રશ્ન લખો અથવા ફોટો ઉમેરો.' });
    }
    const result = await openaiService.buildSmartPrompt({
      userInput,
      imagesBase64: images,
      answerLanguage,
      clarifications,
      extraNotes
    });
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Smart Prompt Route Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/smart-answer', async (req, res) => {
  try {
    const { prompt = '', userInput = '', images = [], answerLanguage = 'gu' } = req.body || {};
    if (!String(prompt).trim() && !String(userInput).trim() && (!Array.isArray(images) || images.length === 0)) {
      return res.status(400).json({ success: false, error: 'પ્રોમ્પ્ટ અથવા ફોટો જરૂરી છે.' });
    }
    const result = await openaiService.answerSmartPrompt({
      prompt,
      userInput,
      imagesBase64: images,
      answerLanguage
    });
    const entry = db.addSmartAskEntry({
      userInput,
      generatedPrompt: prompt,
      answer: result.answer,
      answerLanguage,
      imageCount: Array.isArray(images) ? images.length : 0,
      model: result.model
    });
    res.json({ success: true, ...result, entry });
  } catch (err) {
    console.error('[Smart Answer Route Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/smart-ask-all', async (req, res) => {
  try {
    const { userInput = '', images = [], answerLanguage = 'gu' } = req.body || {};
    if (!String(userInput).trim() && (!Array.isArray(images) || images.length === 0)) {
      return res.status(400).json({ success: false, error: 'કૃપા કરીને તમારો પ્રશ્ન લખો અથવા ફોટો ઉમેરો.' });
    }
    const promptRes = await openaiService.buildSmartPrompt({
      userInput,
      imagesBase64: images,
      answerLanguage
    });
    const answerRes = await openaiService.answerSmartPrompt({
      prompt: promptRes.generatedPrompt,
      userInput,
      imagesBase64: images,
      answerLanguage
    });
    const entry = db.addSmartAskEntry({
      userInput,
      generatedPrompt: promptRes.generatedPrompt,
      answer: answerRes.answer,
      answerLanguage,
      imageCount: Array.isArray(images) ? images.length : 0,
      model: answerRes.model
    });
    res.json({
      success: true,
      generatedPrompt: promptRes.generatedPrompt,
      detectedIntent: promptRes.detectedIntent,
      promptModel: promptRes.model,
      promptSource: promptRes.source,
      answer: answerRes.answer,
      model: answerRes.model,
      source: answerRes.source,
      entry
    });
  } catch (err) {
    console.error('[Smart Ask All Route Error]:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
