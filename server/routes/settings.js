const express = require('express');
const router = express.Router();
const db = require('../db');
const googleService = require('../services/googleService');
const openaiService = require('../services/openaiService');

// Mask sensitive string
function maskKey(key) {
  if (!key || key.length < 8) return '';
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

// Get current settings
router.get('/', (req, res) => {
  try {
    const raw = db.getSettings();
    const isGoogleConfigured = googleService.isConfigured();
    const isOpenAIConfigured = openaiService.isConfigured();

    res.json({
      success: true,
      settings: {
        googleClientId: raw.googleClientId ? `${raw.googleClientId.slice(0, 12)}...` : '',
        googleClientIdFull: raw.googleClientId || '',
        googleClientSecretConfigured: Boolean(raw.googleClientSecret),
        googleRedirectUri: raw.googleRedirectUri,
        googleApiKeyConfigured: Boolean(raw.googleApiKey),
        openaiApiKeyConfigured: Boolean(raw.openaiApiKey),
        openaiApiKeyMasked: maskKey(raw.openaiApiKey),
        openaiModel: raw.openaiModel || 'gpt-4o',
        creatorEmail: raw.creatorEmail || '',
        demoMode: raw.demoMode,
        theme: raw.theme || 'dark'
      },
      status: {
        isGoogleConfigured,
        isOpenAIConfigured,
        activeModel: raw.openaiModel || 'gpt-4o'
      },
      setupGuides: {
        google: [
          'Google Cloud Console (console.cloud.google.com) પર જાઓ.',
          'નવો પ્રોજેક્ટ બનાવો (દા.ત. "YouTube Creator Studio").',
          'APIs & Services > Library માં જઈને "YouTube Data API v3" અને "YouTube Analytics API" બંને ENABLE કરો.',
          'OAuth Consent Screen માં External સિલેક્ટ કરો અને YouTube scopes ઉમેરો.',
          'Credentials > Create Credentials > OAuth Client ID (Web Application) બનાવો.',
          `Authorized Redirect URI માં http://localhost:5000/api/auth/google/callback ઉમેરો.`,
          'મળેલ Client ID અને Client Secret અહીં નીચે સેટિંગ્સમાં સેવ કરો.'
        ],
        openai: [
          'OpenAI પ્લેટફોર્મ (platform.openai.com/api-keys) પર જાઓ.',
          'નવી API Key (sk-...) જનરેટ કરો.',
          'નીચે બોક્સમાં કી પેસ્ટ કરી મોડેલ સિલેક્ટ કરો (gpt-4o અથવા gpt-4o-mini).'
        ]
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update settings
router.post('/', (req, res) => {
  try {
    const {
      creatorEmail,
      googleClientId,
      googleClientSecret,
      googleRedirectUri,
      googleApiKey,
      openaiApiKey,
      openaiModel,
      demoMode,
      theme
    } = req.body;

    const updates = {};
    if (creatorEmail !== undefined) updates.creatorEmail = creatorEmail.trim();
    if (googleClientId !== undefined) updates.googleClientId = googleClientId.trim();
    if (googleClientSecret !== undefined && googleClientSecret.trim() !== '') updates.googleClientSecret = googleClientSecret.trim();
    if (googleRedirectUri !== undefined) updates.googleRedirectUri = googleRedirectUri.trim();
    if (googleApiKey !== undefined && googleApiKey.trim() !== '') updates.googleApiKey = googleApiKey.trim();
    if (openaiApiKey !== undefined && openaiApiKey.trim() !== '') updates.openaiApiKey = openaiApiKey.trim();
    if (openaiModel !== undefined) updates.openaiModel = openaiModel;
    if (demoMode !== undefined) updates.demoMode = Boolean(demoMode);
    if (theme !== undefined) updates.theme = theme;

    const saved = db.updateSettings(updates);

    res.json({
      success: true,
      message: 'સેટિંગ્સ સફળતાપૂર્વક સાચવવામાં આવી છે. (Settings saved successfully)',
      settings: {
        creatorEmail: saved.creatorEmail,
        googleClientId: saved.googleClientId,
        googleRedirectUri: saved.googleRedirectUri,
        openaiModel: saved.openaiModel,
        demoMode: saved.demoMode,
        theme: saved.theme
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
