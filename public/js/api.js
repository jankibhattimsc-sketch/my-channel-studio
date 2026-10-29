export const AUDIO_TONE_PROMPT = "Read the following Gujarati government job news in a warm, natural, conversational voice, like an experienced news presenter, not a fake TV-anchor voice. Start with an enthusiastic, clear voice to grab attention. For recruitment news: be optimistic, energetic and encouraging, with slight emphasis on number of vacancies, eligibility and last date. For salary hike/DA/allowance news: be happy, excited and reassuring, and say amounts, percentages and effective dates clearly and slightly slower. When mentioning last dates, warnings or important notices: become a little serious and urgent. End with a warm, friendly closing. Keep a medium pace with natural pauses at commas and full stops. Pronounce English words like DA, GPSC, OJAS clearly. Read only the script text below exactly as written, do not add or remove any words, and do not read these instructions aloud.";

export const api = {
  async get(url) {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  async post(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  async delete(url) {
    const res = await fetch(url, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  // Auth & Channel
  getAuthStatus: () => api.get('/api/auth/status'),
  getGoogleAuthUrl: () => api.get('/api/auth/google/url'),
  disconnectChannel: () => api.post('/api/auth/disconnect', {}),
  switchChannel: (channelId) => api.post('/api/auth/switch-channel', { channelId }),
  toggleDemoMode: () => api.post('/api/auth/demo-toggle', {}),

  // Analytics & Videos
  getAnalytics: (refresh = false) => api.get(`/api/youtube/analytics${refresh ? '?refresh=true' : ''}`),
  getVideos: () => api.get('/api/youtube/videos'),

  // Trending Topics & 48-Hour Trend Analysis
  get48hTrends: (category = 'all', q = null) => {
    let url = `/api/topics/trends-48h?category=${encodeURIComponent(category)}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    return api.get(url);
  },
  getTrendingTopics: (category = 'all', q = null) => {
    let url = `/api/topics/trending?category=${encodeURIComponent(category)}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    return api.get(url);
  },
  saveTopic: (topic) => api.post('/api/topics/save', { topic }),
  getSavedTopics: () => api.get('/api/topics/saved'),
  analyze48hScreenshot: (imagesBase64, category = 'all', ocrData = null) => api.post('/api/topics/analyze-screenshot', { imagesBase64, category, ocrData }),

  // One-Click SEO
  generateSEO: (topic, category = 'general') => api.post('/api/seo/generate', { topic, category }),

  // AI Thumbnail Studio
  generateThumbnailConcepts: (topic, category = 'general') => api.post('/api/thumbnails/concepts', { topic, category }),
  generateThumbnailImage: (prompt, conceptId = 1, topic = '') => api.post('/api/thumbnails/generate-image', { prompt, conceptId, topic }),
  smartOptimizeThumbnail: (topic, overrides = {}) => api.post('/api/thumbnails/smart-optimizer', { topic, overrides }),

  // Script Generator
  generateScript: (params) => api.post('/api/scripts/generate', params),
  saveScript: (script) => api.post('/api/scripts/save', { script }),
  getScripts: () => api.get('/api/scripts'),
  getScriptById: (id) => api.get(`/api/scripts/${id}`),
  deleteScript: (id) => api.delete(`/api/scripts/${id}`),

  // ChatGPT Creator Assistant
  getConversations: () => api.get('/api/chat/conversations'),
  createConversation: (title) => api.post('/api/chat/conversations', { title }),
  deleteConversation: (id) => api.delete(`/api/chat/conversations/${id}`),
  getMessages: (id) => api.get(`/api/chat/conversations/${id}/messages`),
  sendChatMessage: (convIdOrObj, message, includeChannelContext = true) => {
    if (typeof convIdOrObj === 'object' && convIdOrObj !== null) {
      return api.post('/api/chat/message', convIdOrObj);
    }
    return api.post('/api/chat/message', { conversationId: convIdOrObj, message, includeChannelContext });
  },

  // Competitor Video Research & NotebookLM Prompts
  researchVideo: (url) => api.post('/api/research/video', { url }),
  getResearchHistory: () => api.get('/api/research/history'),
  generateNotebookLMPrompt: (topic, options = {}) => api.post('/api/research/notebooklm-prompt', { topic, ...options }),
  generateSlideVoiceoverPrompt: (data) => api.post('/api/research/slide-voiceover-prompt', data),
  generateSingleSlideVoiceoverPrompt: (data) => api.post('/api/research/slide-voiceover-prompt/single', data),
  uploadSlidePdf: (data) => api.post('/api/research/upload-slide-pdf', data),
  generateWhiteSlides: (data) => api.post('/api/research/generate-white-slides', data),

  // Settings
  getSettings: () => api.get('/api/settings'),
  saveSettings: (settingsData) => api.post('/api/settings', settingsData),

  // Voice Studio (My Voice AI)
  getVoiceProfiles: () => api.get('/api/voice/profiles'),
  generateVoice: (params) => api.post('/api/voice/generate', params),
  pdfToAudio: (data) => api.post('/api/voice/pdf-to-audio', data),
  uploadAudio: (data) => api.post('/api/voice/upload-audio', data),
  getActorScript: (params) => api.post('/api/voice/actor-script', params),
  getAudioLibrary: () => api.get('/api/voice/library')
};
