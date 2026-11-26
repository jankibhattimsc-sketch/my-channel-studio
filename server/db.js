const fs = require('fs');
const path = require('path');
const cloudSync = require('./services/cloudSyncService');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
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
  analyticsCache: null,
  plannerBatches: [],
  centralTopics: [],
  topicProductionStages: {},
  topicResearch: {},
  topicSlides: {},
  topicScripts: {},
  topicVoices: {},
  topicVideos: {},
  topicThumbnails: {},
  topicSEO: {}
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
          settings: { ...defaultData.settings, ...(parsed.settings || {}) },
          centralTopics: Array.isArray(parsed.centralTopics) ? parsed.centralTopics : [],
          topicProductionStages: parsed.topicProductionStages || {},
          topicResearch: parsed.topicResearch || {},
          topicSlides: parsed.topicSlides || {},
          topicScripts: parsed.topicScripts || {},
          topicVoices: parsed.topicVoices || {},
          topicVideos: parsed.topicVideos || {},
          topicThumbnails: parsed.topicThumbnails || {},
          topicSEO: parsed.topicSEO || {}
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
    const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
    try {
      fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch (_) {}
      console.error('[DB] Error saving database:', err.message);
    }
    cloudSync.schedulePush(data);
  }

  async syncFromCloudOnBoot() {
    if (!cloudSync.isConfigured()) return false;
    const remote = await cloudSync.pullDatabase();
    if (!remote) return false;
    const localTopicCount = (this.data.centralTopics || []).length + (this.data.topics || []).length;
    const remoteTopicCount = (remote.centralTopics || []).length + (remote.topics || []).length;
    if (localTopicCount === 0 && remoteTopicCount > 0) {
      this.data = {
        ...defaultData,
        ...remote,
        settings: { ...defaultData.settings, ...(remote.settings || {}) }
      };
      this.saveDirect(this.data);
      console.log(`[CloudSync] Restored ${remoteTopicCount} topics from cloud backup.`);
      return true;
    }
    return false;
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
    if (!this.data.topics) this.data.topics = [];
    const id = topic.id || `topic-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const savedObj = {
      ...topic,
      id,
      saved: true,
      status: topic.status || 'Pending',
      createdAt: topic.createdAt || new Date().toISOString()
    };
    const existingIndex = this.data.topics.findIndex(t => t.id === id);
    if (existingIndex >= 0) {
      this.data.topics[existingIndex] = { ...this.data.topics[existingIndex], ...savedObj, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.topics[existingIndex];
    } else {
      this.data.topics.unshift(savedObj);
      this.save();
      return savedObj;
    }
  }

  updateTopic(id, updates) {
    if (!this.data.topics) this.data.topics = [];
    const index = this.data.topics.findIndex(t => t.id === id);
    if (index >= 0) {
      this.data.topics[index] = { ...this.data.topics[index], ...updates, updatedAt: new Date().toISOString() };
      this.save();
      return this.data.topics[index];
    }
    return null;
  }

  deleteTopic(id) {
    if (!this.data.topics) return false;
    const initialLen = this.data.topics.length;
    this.data.topics = this.data.topics.filter(t => t.id !== id);
    if (this.data.topics.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Scripts with Permanent Project Storage & Version History ---
  getScripts() {
    return (this.data.scripts || []).sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }

  getScriptById(id) {
    if (!id) return null;
    return (this.data.scripts || []).find(s => s.id === id || s.scriptId === id);
  }

  getScriptsByProjectId(projectId) {
    if (!projectId) return [];
    return (this.data.scripts || [])
      .filter(s => s.projectId === projectId)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  }

  getLatestScriptByProjectId(projectId) {
    if (!projectId) return null;
    const projectScripts = this.getScriptsByProjectId(projectId);
    return projectScripts[0] || null;
  }

  saveScript(scriptData) {
    const now = new Date().toISOString();
    const projectId = scriptData.projectId || 'proj_default';
    const rawText = (scriptData.rawText || scriptData.fullText || '').trim();
    const fullText = (scriptData.fullText || scriptData.rawText || '').trim();
    const wordCount = rawText ? rawText.split(/\s+/).filter(Boolean).length : 0;
    const charCount = rawText ? rawText.length : 0;

    // Check if a script already exists for this project
    const existing = this.getLatestScriptByProjectId(projectId);

    let versions = [];
    let versionNumber = 1;

    if (existing) {
      // Gather existing versions list
      versions = Array.isArray(existing.versions) ? [...existing.versions] : [];

      // If existing script text differs from incoming, archive the existing version so it is NEVER lost!
      const existingText = (existing.rawText || existing.fullText || '').trim();
      const hasChanged = existingText && existingText !== rawText;

      if (hasChanged) {
        // Archive previous version
        versions.unshift({
          versionNumber: existing.version || (versions.length + 1),
          scriptId: existing.scriptId || existing.id,
          savedAt: existing.updatedAt || existing.createdAt || now,
          rawText: existing.rawText || existing.fullText,
          fullText: existing.fullText || existing.rawText,
          sections: existing.sections || [],
          wordCount: existing.wordCount || (existingText ? existingText.split(/\s+/).filter(Boolean).length : 0),
          title: existing.projectName || existing.title || `Version ${existing.version || 1}`,
          source: existing.source || 'ChatGPT',
          changeSummary: scriptData.changeSummary || 'Updated Script'
        });

        versionNumber = (existing.version || versions.length) + 1;
      } else {
        versionNumber = existing.version || 1;
      }
    }

    const scriptId = scriptData.scriptId || scriptData.id || `script_${projectId}_v${versionNumber}_${Date.now()}`;

    const record = {
      ...scriptData,
      id: scriptId,
      scriptId: scriptId,
      title: scriptData.title || scriptData.projectName || 'Untitled Project',
      projectId: projectId,
      projectName: scriptData.projectName || scriptData.title || (existing?.projectName) || 'Untitled Project',
      presentationId: scriptData.presentationId || (existing?.presentationId) || null,
      pdfFilename: scriptData.pdfFilename || (existing?.pdfFilename) || null,
      slideCount: scriptData.slideCount || (Array.isArray(scriptData.sections) && scriptData.sections.length > 0 ? scriptData.sections.length : (existing?.slideCount || 9)),
      originalChatGptScript: scriptData.originalChatGptScript || (existing?.originalChatGptScript) || rawText,
      rawText: rawText,
      fullText: fullText,
      sections: Array.isArray(scriptData.sections) ? scriptData.sections : (existing?.sections || []),
      editedSections: Array.isArray(scriptData.editedSections) ? scriptData.editedSections : (scriptData.sections || existing?.editedSections || []),
      source: scriptData.source || 'ChatGPT',
      version: versionNumber,
      versions: versions.slice(0, 50), // keep up to 50 version snapshots
      wordCount: wordCount,
      charCount: charCount,
      savedInDb: true,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };

    // Remove older active entry for this project if updating, or update in place
    const existingIndex = (this.data.scripts || []).findIndex(s => s.projectId === projectId);
    if (existingIndex >= 0) {
      this.data.scripts[existingIndex] = record;
    } else {
      this.data.scripts.unshift(record);
    }

    this.save();
    return record;
  }

  restoreScriptVersion(projectId, targetScriptId) {
    if (!projectId || !targetScriptId) return null;
    const active = this.getLatestScriptByProjectId(projectId);
    if (!active) return null;

    if (active.scriptId === targetScriptId || active.id === targetScriptId) {
      return active;
    }

    const versions = Array.isArray(active.versions) ? active.versions : [];
    const targetVersion = versions.find(v => (v.scriptId === targetScriptId || v.id === targetScriptId));
    if (!targetVersion) return null;

    return this.saveScript({
      projectId,
      projectName: active.projectName,
      presentationId: active.presentationId,
      pdfFilename: active.pdfFilename,
      slideCount: targetVersion.sections ? targetVersion.sections.length : active.slideCount,
      rawText: targetVersion.rawText,
      fullText: targetVersion.fullText,
      sections: targetVersion.sections,
      source: targetVersion.source || 'ChatGPT (Restored)',
      changeSummary: `Restored Version ${targetVersion.versionNumber}`
    });
  }

  deleteScript(id) {
    this.data.scripts = (this.data.scripts || []).filter(s => s.id !== id && s.scriptId !== id);
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

  // --- Topic Production Planner ---
  getPlannerBatches() {
    if (!Array.isArray(this.data.plannerBatches)) {
      this.data.plannerBatches = [];
    }
    return this.data.plannerBatches;
  }

  getCurrentPlannerBatch() {
    const batches = this.getPlannerBatches();
    if (batches.length > 0) {
      return batches[0];
    }
    // Initialize default batch of 10 verified topics
    const initialBatch = this.createDefaultPlannerBatch('બેચ #૧ - વાયરલ વિષયો ઉત્પાદન પ્લાનર');
    return initialBatch;
  }

  createDefaultPlannerBatch(batchName = 'બેચ #૧ - ઉત્પાદન પ્લાનર', rawTopics = null) {
    const batchId = `batch_${Date.now()}`;
    const now = new Date();
    
    // Day names mapping for Asia/Kolkata
    const getGujaratiDay = (d) => {
      const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' });
      const day = formatter.format(d);
      const map = { Sun: 'રવિવાર', Mon: 'સોમવાર', Tue: 'મંગળવાર', Wed: 'બુધવાર', Thu: 'ગુરુવાર', Fri: 'શુક્રવાર', Sat: 'શનિવાર' };
      return map[day] || 'સોમવાર';
    };

    const formatDateIST = (d) => {
      const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
      return formatter.format(d);
    };

    const defaultNames = [
      'ગુજરાત કર્મચારી ૫૦% મોંઘવારી ભથ્થું (DA) અને એરિયર્સ ચૂકવણી પરિપત્ર',
      'આંગણવાડી કાર્યકર અને તેડાગર નવી ભરતી ૨૦૨૬ ઓનલાઇન અરજી પ્રક્રિયા',
      'પીએમ કિસાન યોજના ૧૯મો હપ્તો જમા તારીખ અને નવું e-KYC લિસ્ટ',
      'કુંવરબાઈનું મામેરું યોજના ૨૦૨૬ સહાય નિયમો અને ઓનલાઇન ફોર્મ',
      'ગુજરાત પોલીસ કોન્સ્ટેબલ અને PSI શારીરિક કસોટી (PET/PST) કોલલેટર અપડેટ',
      'GSRTC એસટી નિગમ નવી કંડક્ટર અને ડ્રાઈવર ભરતી મેરીટ લિસ્ટ ૨૦૨૬',
      'વિધવા સહાય (ગંગા સ્વરૂપા આર્થિક સહાય) યોજના દર મહિને પેન્શન વધારો',
      'ગુજરાત ટેટ-૧ અને ટેટ-૨ (TET) વિદ્યાસહાયક ભરતી સત્તાવાર જાહેરાત',
      'રેશનકાર્ડ e-KYC વેરિફિકેશન અને મફત અનાજ યોજના નવી માર્ગદર્શિકા',
      'સાયબર ફ્રોડ ૧૯૩૦ હેલ્પલાઇન અને ઓનલાઇન બેંકિંગ ફ્રોડથી બચવાના નિયમો'
    ];

    const topicsInput = (Array.isArray(rawTopics) && rawTopics.length > 0)
      ? rawTopics.map(t => typeof t === 'string' ? t : (t.topicName || t.title || t.topic || '')).filter(Boolean)
      : defaultNames;

    // Time schedule distribution across 3 consecutive days in Asia/Kolkata
    const scheduleSlots = [
      { dayOffset: 0, time: 'સાંજે ૦૬:૩૦ PM', priority: 'Urgent' },
      { dayOffset: 0, time: 'રાત્રે ૦૮:૦૦ PM', priority: 'High' },
      { dayOffset: 1, time: 'સવારે ૦૮:૩૦ AM', priority: 'High' },
      { dayOffset: 1, time: 'બપોરે ૦૧:૧૫ PM', priority: 'Normal' },
      { dayOffset: 1, time: 'સાંજે ૦૬:૩૦ PM', priority: 'High' },
      { dayOffset: 1, time: 'રાત્રે ૦૮:૦૦ PM', priority: 'Normal' },
      { dayOffset: 2, time: 'સવારે ૦૮:૩૦ AM', priority: 'High' },
      { dayOffset: 2, time: 'બપોરે ૦૧:૧૫ PM', priority: 'Normal' },
      { dayOffset: 2, time: 'સાંજે ૦૬:૩૦ PM', priority: 'High' },
      { dayOffset: 2, time: 'રાત્રે ૦૮:૦૦ PM', priority: 'Normal' }
    ];

    const researchDateStr = formatDateIST(now);
    const researchDayStr = getGujaratiDay(now);

    const topics = [];
    for (let i = 0; i < 10; i++) {
      const topicTitle = topicsInput[i] || defaultNames[i] || `ગુજરાત સરકારી યોજના વિડીયો વિષય #${i + 1}`;
      const slot = scheduleSlots[i] || { dayOffset: Math.floor(i / 3), time: 'સાંજે ૦૬:૩૦ PM', priority: 'Normal' };
      const pubDateObj = new Date(now.getTime() + (slot.dayOffset * 24 * 60 * 60 * 1000));
      const pubDateStr = formatDateIST(pubDateObj);
      const pubDayStr = getGujaratiDay(pubDateObj);

      topics.push({
        id: `topic-plan-${i + 1}`,
        number: i + 1,
        topicName: topicTitle,
        researchDate: researchDateStr,
        researchDay: researchDayStr,
        suggestedPublishDate: pubDateStr,
        suggestedPublishDay: pubDayStr,
        suggestedPublishTime: slot.time,
        sourceAnalyticsPeriod: 'Last 48 Hours',
        priority: slot.priority,
        stages: {
          verified: false,
          slidesCompleted: false,
          scriptCompleted: false,
          voiceCompleted: false,
          finalProduction: false
        },
        status: 'WORK IN PROGRESS',
        updatedAt: new Date().toISOString()
      });
    }

    const newBatch = {
      id: batchId,
      batchName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalTopics: topics.length,
      topics
    };

    if (!Array.isArray(this.data.plannerBatches)) {
      this.data.plannerBatches = [];
    }
    this.data.plannerBatches.unshift(newBatch);
    this.save();
    return newBatch;
  }

  updatePlannerTopic(batchId, topicId, updates = {}) {
    const batches = this.getPlannerBatches();
    const batch = batches.find(b => b.id === batchId) || batches[0];
    if (!batch || !Array.isArray(batch.topics)) return null;

    const topic = batch.topics.find(t => t.id === topicId || String(t.number) === String(topicId));
    if (!topic) return null;

    if (updates.topicName !== undefined) topic.topicName = updates.topicName;
    if (updates.suggestedPublishDate !== undefined) topic.suggestedPublishDate = updates.suggestedPublishDate;
    if (updates.suggestedPublishDay !== undefined) topic.suggestedPublishDay = updates.suggestedPublishDay;
    if (updates.suggestedPublishTime !== undefined) topic.suggestedPublishTime = updates.suggestedPublishTime;
    if (updates.priority !== undefined) topic.priority = updates.priority;

    if (updates.stages) {
      topic.stages = {
        ...topic.stages,
        ...updates.stages
      };
    }

    // Auto calculate status: READY TO PUBLISH if all 5 stages true, else WORK IN PROGRESS
    const s = topic.stages;
    const isReady = Boolean(s.verified && s.slidesCompleted && s.scriptCompleted && s.voiceCompleted && s.finalProduction);
    topic.status = isReady ? 'READY TO PUBLISH' : 'WORK IN PROGRESS';
    topic.updatedAt = new Date().toISOString();
    batch.updatedAt = new Date().toISOString();

    this.save();
    return { batch, topic };
  }

  deletePlannerTopic(batchId, topicId) {
    const batches = this.getPlannerBatches();
    const batch = batches.find(b => b.id === batchId) || batches[0];
    if (!batch || !Array.isArray(batch.topics)) return false;

    const initialLen = batch.topics.length;
    batch.topics = batch.topics.filter(t => t.id !== topicId && String(t.number) !== String(topicId));
    if (batch.topics.length !== initialLen) {
      // Re-number remaining topics 1 to N
      batch.topics.forEach((t, idx) => {
        t.number = idx + 1;
      });
      batch.totalTopics = batch.topics.length;
      batch.updatedAt = new Date().toISOString();
      this.save();
      return true;
    }
    return false;
  }

  syncTopicsToPlanner(newTopicNames = [], batchName = null) {
    if (!Array.isArray(newTopicNames) || newTopicNames.length === 0) return null;
    const name = batchName || `બેચ #${(this.getPlannerBatches().length + 1)} - ${new Date().toLocaleDateString('gu-IN')}`;
    return this.createDefaultPlannerBatch(name, newTopicNames);
  }

  // =========================================================================
  // CENTRAL TOPIC PRODUCTION REPOSITORY (Unique topicId connection)
  // =========================================================================

  generateNextTopicId() {
    const year = new Date().getFullYear();
    const prefix = `GY-${year}-`;
    const topics = this.data.centralTopics || [];
    let maxNum = 0;
    topics.forEach(t => {
      if (t.topicId && t.topicId.startsWith(prefix)) {
        const numPart = parseInt(t.topicId.replace(prefix, ''), 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });
    return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
  }

  ensureSeedCentralTopics() {
    this.data.centralTopicsInitialized = true;
  }

  getCentralTopics() {
    this.ensureSeedCentralTopics();
    const stagesMap = this.data.topicProductionStages || {};

    return (this.data.centralTopics || []).map((topic, index) => {
      const stages = stagesMap[topic.topicId] || {
        verification: false,
        slides: false,
        script: false,
        voice: false,
        videoEditing: false,
        thumbnail: false,
        seo: false,
        published: false
      };

      const completedCount = [
        stages.verification,
        stages.slides,
        stages.script,
        stages.voice,
        stages.videoEditing,
        stages.thumbnail,
        stages.seo
      ].filter(Boolean).length;

      const progress = Math.round((completedCount / 7) * 100);
      let status = 'NOT STARTED';
      if (stages.published) {
        status = 'PUBLISHED';
      } else if (completedCount === 7) {
        status = 'READY FOR PUBLISH';
      } else if (completedCount > 0) {
        status = 'IN PROGRESS';
      }

      return {
        ...topic,
        number: index + 1,
        stages,
        productionProgress: progress,
        currentStatus: status
      };
    });
  }

  getCentralTopicById(topicId) {
    if (!topicId) return null;
    const all = this.getCentralTopics();
    const topic = all.find(t => t.topicId === topicId);
    if (!topic) return null;

    return {
      topic,
      stages: (this.data.topicProductionStages && this.data.topicProductionStages[topicId]) || {},
      research: (this.data.topicResearch && this.data.topicResearch[topicId]) || null,
      slides: (this.data.topicSlides && this.data.topicSlides[topicId]) || null,
      scripts: (this.data.topicScripts && this.data.topicScripts[topicId]) || null,
      voices: (this.data.topicVoices && this.data.topicVoices[topicId]) || null,
      videos: (this.data.topicVideos && this.data.topicVideos[topicId]) || null,
      thumbnails: (this.data.topicThumbnails && this.data.topicThumbnails[topicId]) || null,
      seo: (this.data.topicSEO && this.data.topicSEO[topicId]) || null
    };
  }

  addCentralTopic(data = {}) {
    if (!Array.isArray(this.data.centralTopics)) this.data.centralTopics = [];
    if (!this.data.topicProductionStages) this.data.topicProductionStages = {};
    if (!this.data.topicResearch) this.data.topicResearch = {};
    if (!this.data.topicSlides) this.data.topicSlides = {};
    if (!this.data.topicScripts) this.data.topicScripts = {};
    if (!this.data.topicVoices) this.data.topicVoices = {};
    if (!this.data.topicVideos) this.data.topicVideos = {};
    if (!this.data.topicThumbnails) this.data.topicThumbnails = {};
    if (!this.data.topicSEO) this.data.topicSEO = {};

    const rawName = (data.topicName || data.name || data.title || '').trim();
    if (!rawName) throw new Error('Topic name is required');

    // Duplicate detection: check if topic with same normalized name exists
    const normalize = str => str.toLowerCase().replace(/[\s\-_.,/]+/g, '');
    const normNew = normalize(rawName);
    const existing = this.data.centralTopics.find(t => normalize(t.topicName) === normNew);
    if (existing) {
      return { success: false, duplicate: true, existingTopic: existing };
    }

    // Determine Asia/Kolkata date and day
    const now = new Date();
    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', weekday: 'short' });
    const dayMap = { Sun: 'રવિવાર', Mon: 'સોમવાર', Tue: 'મંગળવાર', Wed: 'બુધવાર', Thu: 'ગુરુવાર', Fri: 'શુક્રવાર', Sat: 'શનિવાર' };
    const dayName = data.dayName || dayMap[dayFormatter.format(now)] || 'સોમવાર';

    const isoFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' });
    const analyticsDate = data.analyticsDate || isoFormatter.format(now);

    const topicId = data.topicId || this.generateNextTopicId();
    const recommendedTitle = data.recommendedTitle || rawName;

    const newTopic = {
      topicId,
      topicName: rawName,
      recommendedTitle,
      analyticsDate,
      dayName,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      priority: data.priority || 'High',
      currentStatus: 'NOT STARTED',
      productionProgress: 0,
      sourceAnalyticsPeriod: data.sourceAnalyticsPeriod || 'Last 48 Hours',
      notes: data.notes || ''
    };

    this.data.centralTopics.push(newTopic);

    // Initialize 7 production stages + published
    this.data.topicProductionStages[topicId] = {
      topicId,
      verification: false,
      slides: false,
      script: false,
      voice: false,
      videoEditing: false,
      thumbnail: false,
      seo: false,
      published: false,
      updatedAt: now.toISOString(),
      ...(data.stages || {})
    };

    this.save();
    return { success: true, duplicate: false, topic: newTopic };
  }

  batchAddCentralTopics(topicsList = []) {
    const results = {
      added: [],
      duplicates: [],
      totalAdded: 0
    };

    topicsList.forEach(item => {
      const topicObj = typeof item === 'string' ? { topicName: item } : item;
      const res = this.addCentralTopic(topicObj);
      if (res.duplicate) {
        results.duplicates.push(res.existingTopic);
      } else {
        results.added.push(res.topic);
        results.totalAdded++;
      }
    });

    return results;
  }

  updateCentralTopicStage(topicId, stageName, isCompleted) {
    if (!this.data.topicProductionStages) this.data.topicProductionStages = {};
    if (!this.data.topicProductionStages[topicId]) {
      this.data.topicProductionStages[topicId] = {
        topicId,
        verification: false,
        slides: false,
        script: false,
        voice: false,
        videoEditing: false,
        thumbnail: false,
        seo: false,
        published: false
      };
    }

    this.data.topicProductionStages[topicId][stageName] = Boolean(isCompleted);
    this.data.topicProductionStages[topicId].updatedAt = new Date().toISOString();

    const topic = (this.data.centralTopics || []).find(t => t.topicId === topicId);
    if (topic) {
      topic.updatedAt = new Date().toISOString();
    }

    this.save();
    return this.getCentralTopicById(topicId);
  }

  updateCentralTopicData(topicId, moduleKey, data) {
    const validKeys = ['research', 'slides', 'scripts', 'voices', 'videos', 'thumbnails', 'seo'];
    const key = validKeys.find(k => k.toLowerCase() === moduleKey.toLowerCase()) || moduleKey;
    const mapName = `topic${key.charAt(0).toUpperCase() + key.slice(1)}`;
    if (!this.data[mapName]) {
      this.data[mapName] = {};
    }
    this.data[mapName][topicId] = {
      topicId,
      ...data,
      updatedAt: new Date().toISOString()
    };

    const topic = (this.data.centralTopics || []).find(t => t.topicId === topicId);
    if (topic) {
      topic.updatedAt = new Date().toISOString();
    }

    this.save();
    return this.data[mapName][topicId];
  }

  deleteCentralTopic(topicId) {
    if (!Array.isArray(this.data.centralTopics)) return false;
    const initialLen = this.data.centralTopics.length;
    this.data.centralTopics = this.data.centralTopics.filter(t => t.topicId !== topicId);

    if (Array.isArray(this.data.scripts)) {
      this.data.scripts = this.data.scripts.filter(s => s.projectId !== topicId);
    }
    if (Array.isArray(this.data.topics)) {
      this.data.topics = this.data.topics.filter(t => t.id !== topicId && t.topicId !== topicId);
    }

    if (this.data.topicProductionStages) delete this.data.topicProductionStages[topicId];
    if (this.data.topicResearch) delete this.data.topicResearch[topicId];
    if (this.data.topicSlides) delete this.data.topicSlides[topicId];
    if (this.data.topicScripts) delete this.data.topicScripts[topicId];
    if (this.data.topicVoices) delete this.data.topicVoices[topicId];
    if (this.data.topicVideos) delete this.data.topicVideos[topicId];
    if (this.data.topicThumbnails) delete this.data.topicThumbnails[topicId];
    if (this.data.topicSEO) delete this.data.topicSEO[topicId];

    this.save();
    return true;
  }
}

module.exports = new Database();
