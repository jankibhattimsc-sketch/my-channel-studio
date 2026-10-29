const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial DB template
const defaultData = {
  settings: {
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback',
    googleApiKey: process.env.GOOGLE_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
    creatorEmail: process.env.CREATOR_EMAIL || '',
    demoMode: process.env.DEMO_MODE !== 'false',
    theme: 'dark'
  },
  auth: {
    isConnected: false,
    tokens: null,
    activeChannelId: null,
    channels: []
  },
  topics: [],
  scripts: [],
  conversations: [
    {
      id: 'default-conv',
      title: 'સામાન્ય પ્રશ્નોત્તરી (General Creator Chat)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
  messages: [
    {
      id: 'msg-welcome',
      conversationId: 'default-conv',
      role: 'assistant',
      content: 'નમસ્તે! હું તમારો યુટ્યુબ ક્રિએટર એઆઈ આસિસ્ટન્ટ (ChatGPT AI) છું. તમે ગુજરાતીમાં કોઈ પણ પ્રશ્ન પૂછી શકો છો—જેમ કે વિડીયો આઈડિયા, વાયરલ હૂક, સંપૂર્ણ સ્ક્રિપ્ટ, એનાલિટિક્સ સુધારણા કે થંબનેલ કોન્સેપ્ટ. આજે આપણે કયા વિષય પર કામ કરવું છે?',
      createdAt: new Date().toISOString()
    }
  ],
  research: [],
  analyticsCache: null
};

class Database {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...defaultData,
          ...parsed,
          settings: { ...defaultData.settings, ...(parsed.settings || {}) }
        };
      }
    } catch (err) {
      console.error('[DB] Error loading database, initializing fresh:', err.message);
    }
    const fresh = JSON.parse(JSON.stringify(defaultData));
    this.saveDirect(fresh);
    return fresh;
  }

  save() {
    this.saveDirect(this.data);
  }

  saveDirect(data) {
    try {
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('[DB] Error saving database:', err.message);
    }
  }

  // --- Settings ---
  getSettings() {
    return { ...this.data.settings };
  }

  updateSettings(updates) {
    this.data.settings = { ...this.data.settings, ...updates };
    this.save();
    return this.data.settings;
  }

  // --- Auth & Channel Profile ---
  getAuth() {
    return this.data.auth;
  }

  updateAuth(updates) {
    this.data.auth = { ...this.data.auth, ...updates };
    this.save();
    return this.data.auth;
  }

  disconnectChannel() {
    this.data.auth = {
      isConnected: false,
      tokens: null,
      activeChannelId: null,
      channels: []
    };
    this.data.analyticsCache = null;
    this.save();
    return this.data.auth;
  }

  // --- Analytics Cache ---
  getAnalyticsCache() {
    return this.data.analyticsCache;
  }

  setAnalyticsCache(cache) {
    this.data.analyticsCache = {
      ...cache,
      cachedAt: new Date().toISOString()
    };
    this.save();
  }

  // --- Topics ---
  getTopics() {
    return this.data.topics || [];
  }

  saveTopics(newTopics) {
    this.data.topics = newTopics;
    this.save();
    return this.data.topics;
  }

  addSavedTopic(topic) {
    const existingIndex = this.data.topics.findIndex(t => t.id === topic.id);
    if (existingIndex >= 0) {
      this.data.topics[existingIndex] = { ...this.data.topics[existingIndex], ...topic, saved: true };
    } else {
      this.data.topics.unshift({ ...topic, saved: true, id: topic.id || `topic-${Date.now()}` });
    }
    this.save();
    return topic;
  }

  // --- Scripts ---
  getScripts() {
    return (this.data.scripts || []).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }

  getScriptById(id) {
    return (this.data.scripts || []).find(s => s.id === id);
  }

  saveScript(script) {
    const now = new Date().toISOString();
    const id = script.id || `script-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const index = (this.data.scripts || []).findIndex(s => s.id === id);
    
    const record = {
      ...script,
      id,
      updatedAt: now,
      createdAt: index >= 0 ? this.data.scripts[index].createdAt : now
    };

    if (index >= 0) {
      this.data.scripts[index] = record;
    } else {
      this.data.scripts.unshift(record);
    }
    this.save();
    return record;
  }

  deleteScript(id) {
    this.data.scripts = (this.data.scripts || []).filter(s => s.id !== id);
    this.save();
    return true;
  }

  // --- Conversations & Messages ---
  getConversations() {
    return (this.data.conversations || []).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  createConversation(title = 'નવી ચર્ચા (New Chat)') {
    const id = `conv-${Date.now()}`;
    const now = new Date().toISOString();
    const conv = { id, title, createdAt: now, updatedAt: now };
    this.data.conversations.unshift(conv);
    this.save();
    return conv;
  }

  deleteConversation(id) {
    this.data.conversations = (this.data.conversations || []).filter(c => c.id !== id);
    this.data.messages = (this.data.messages || []).filter(m => m.conversationId !== id);
    this.save();
    return true;
  }

  getMessages(conversationId) {
    return (this.data.messages || [])
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  addMessage({ conversationId, role, content, metadata = null }) {
    const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();
    const msg = { id, conversationId, role, content, metadata, createdAt: now };
    this.data.messages.push(msg);

    // Update conversation updatedAt & title if first user message
    const conv = (this.data.conversations || []).find(c => c.id === conversationId);
    if (conv) {
      conv.updatedAt = now;
      if (role === 'user' && conv.title === 'નવી ચર્ચા (New Chat)') {
        conv.title = content.slice(0, 35) + (content.length > 35 ? '...' : '');
      }
    }
    this.save();
    return msg;
  }

  // --- Video Research ---
  getResearchList() {
    return (this.data.research || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  saveResearch(item) {
    const record = {
      ...item,
      id: item.id || `res-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.data.research.unshift(record);
    // keep max 50 items
    if (this.data.research.length > 50) this.data.research.pop();
    this.save();
    return record;
  }
}

module.exports = new Database();
