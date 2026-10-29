const express = require('express');
const router = express.Router();
const googleService = require('../services/googleService');
const db = require('../db');

// Check current channel connection status
router.get('/status', async (req, res) => {
  try {
    const isGoogleConfigured = googleService.isConfigured();
    const profile = await googleService.getChannelProfile();
    const authState = db.getAuth();

    res.json({
      success: true,
      isConfigured: isGoogleConfigured,
      isConnected: authState.isConnected,
      isDemo: profile.isDemo,
      channel: profile.channel,
      channels: profile.channels,
      notice: profile.notice || null
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate Google OAuth consent URL
router.get('/google/url', (req, res) => {
  try {
    if (!googleService.isConfigured()) {
      return res.status(400).json({
        success: false,
        error: 'Google OAuth Client ID અને Client Secret સેટિંગ્સમાં દાખલ કરવા જરૂરી છે. (Google credentials not configured in Settings)'
      });
    }

    const url = googleService.getAuthUrl();
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// OAuth Callback handler from Google
router.get('/google/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`/?auth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect('/?auth_error=No_code_received');
  }

  try {
    await googleService.handleCallback(code);
    res.redirect('/?connected=true');
  } catch (err) {
    console.error('[Auth Callback Error]:', err.message);
    res.redirect(`/?auth_error=${encodeURIComponent(err.message)}`);
  }
});

// Switch active channel
router.post('/switch-channel', async (req, res) => {
  const { channelId } = req.body;
  if (!channelId) {
    return res.status(400).json({ success: false, error: 'Channel ID is required' });
  }

  try {
    const active = await googleService.switchChannel(channelId);
    res.json({ success: true, channel: active });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Disconnect YouTube Channel
router.post('/disconnect', (req, res) => {
  try {
    const fresh = db.disconnectChannel();
    res.json({
      success: true,
      message: 'ચેનલ સફળતાપૂર્વક ડિસ્કનેક્ટ થઈ ગઈ છે. (Channel disconnected successfully)',
      auth: fresh
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Toggle Demo Mode
router.post('/demo-toggle', (req, res) => {
  try {
    const settings = db.getSettings();
    const newDemoState = !settings.demoMode;
    db.updateSettings({ demoMode: newDemoState });

    res.json({
      success: true,
      demoMode: newDemoState,
      message: newDemoState ? 'ડેમો મોડ ચાલુ કર્યો છે.' : 'ડેમો મોડ બંધ કર્યો છે.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
