import { api } from '../api.js';
import { copyToClipboard, showNoticeToast } from '../utils/clipboard.js';
import { projectState } from '../utils/projectState.js';
import { AutoSave } from '../utils/AutoSave.js';
import { firebaseService } from '../utils/firebaseService.js';
import { 
  getCurrentIST, 
  formatDateISO, 
  formatTimeISO, 
  formatISTDisplay, 
  formatIndianDateDisplay,
  formatIndianTimeDisplay,
  formatIndianDateTimeDisplay,
  filterIdeasByDateRange,
  groupIdeasByDate,
  parseYouTubeStudioDate, 
  calculateTimeDelta, 
  normalizeIdeaTimestamps 
} from '../utils/dateTimeIntelligence.js';
import { 
  analyzeIdeaMetrics, 
  CLASSIFICATIONS, 
  CLASSIFICATION_COLORS, 
  checkDuplicateTitle 
} from '../utils/ideaAnalysisEngine.js';
import { processImageAdjustments } from '../utils/imagePreprocessor.js';
import { parsePastedIdeaText } from '../utils/textIdeaParser.js';

export async function renderTopics(container, navigateTo) {
  // Navigation & View Sub-Tabs: 'notebook' | 'ocr' | 'paste' | 'manual'
  let activeTab = 'notebook';
  let activeTopicIdeaId = null;
  let activeDiaryEntryId = null;
  let isDiaryLoadedInitially = false;
  let readingDiaryIdea = null;
  let diaryDate = formatDateISO(new Date()) || new Date().toISOString().slice(0, 10);
  let diaryTitle = '';
  let diaryNote = '';
  let uploadedScreenshots = []; // { name, size, base64, rawImage, ocrBase64 }
  let isAnalyzing = false;
  let hasAnalyzed = false;
  let hasConfirmedPrompt = false;

  // Image Adjustment & Viewport State for OCR
  let imageAdjustments = {
    rotation: 0,
    brightness: 0,
    contrast: 0,
    sharpen: false,
    zoom: 1.0,
    activeCropPreset: 'full'
  };

  let isBoxSelectMode = false;
  let invertForOcr = false;
  let activeHighlightedIdx = null;

  // Notebook Dashboard State
  let selectedIdeaIds = new Set();
  let dateFilterRange = 'all'; // 'all' | 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom'
  let customDateStart = '';
  let customDateEnd = '';
  let sourceFilter = 'all'; // 'all' | 'ocr' | 'paste' | 'manual'
  let categoryFilter = 'all'; // 'all' | 'સરકારી યોજના' | 'સરકારી ભરતી' | 'પરિપત્ર & નિયમ' | 'અન્ય'
  let searchQuery = '';
  let sortOrder = 'newest'; // 'newest' | 'oldest' | 'updated' | 'views'
  let showArchived = false;

  // Central Planner Connection State
  let plannerTopicsSet = new Set();
  async function refreshPlannerTopics() {
    try {
      const res = await api.getCentralTopics();
      if (res && Array.isArray(res.topics)) {
        plannerTopicsSet = new Set(res.topics.map(t => (t.topicName || '').trim().toLowerCase()));
      }
    } catch (err) {
      console.warn('[refreshPlannerTopics]:', err);
    }
  }
  refreshPlannerTopics();

  // Modals state
  let editingIdea = null; // object when modal is open
  let chatGptModalData = null; // { prompt: '', count: 0 }

  // Copy-Paste Form State
  let pasteRawText = '';
  let parsedPasteData = {
    title: '',
    description: '',
    originalText: '',
    detectedViews: null,
    detectedDate: null,
    detectedUrl: '',
    detectedSource: 'Copy-Paste',
    tags: []
  };

  // Direct Manual Form State
  let manualFormData = {
    title: '',
    category: 'સરકારી યોજના',
    tags: '',
    description: '',
    views48h: '',
    referenceLinks: '',
    notes: ''
  };

  // OCR Studio State
  let studioData = {
    channelTitle: '',
    customUrl: '',
    subscribers: 0,
    totalVideos: 0,
    views48h: null,
    views60m: null,
    capturedAt: null,
    sourcePublishedAt: null,
    topVideos: []
  };

  // Fetch connected channel details
  try {
    const ch = await api.getConnectedChannel();
    if (ch && ch.channelTitle) {
      studioData.channelTitle = ch.channelTitle;
      studioData.customUrl = ch.customUrl || '';
      studioData.subscribers = ch.subscriberCount || 0;
    }
  } catch (_) {}

  // AutoSave Engine
  let saveStatusText = 'બધું સાચવેલ છે';
  let saveStatusColor = '#10b981';

  const autoSave = new AutoSave({
    debounceMs: 1200,
    onSave: async () => {
      saveStatusText = 'સાચવી રહ્યું છે...';
      saveStatusColor = '#f59e0b';
      updateSaveBadge();

      try {
        const activeProj = projectState.getActiveProject();
        if (activeProj) {
          projectState.saveProjects();
        }
        saveStatusText = '✓ ક્લાઉડ સુરક્ષિત';
        saveStatusColor = '#10b981';
      } catch (err) {
        saveStatusText = 'ઓફલાઇન (સ્થાનિક સાચવેલ)';
        saveStatusColor = '#38bdf8';
      }
      updateSaveBadge();
    }
  });

  function updateSaveBadge() {
    const badge = container.querySelector('#idea-autosave-badge');
    if (badge) {
      badge.textContent = saveStatusText;
      badge.style.color = saveStatusColor;
      badge.style.borderColor = saveStatusColor;
    }
  }

  // Generate ChatGPT prompt from selected ideas with Zero Hallucination
  function generatePromptForSelectedIdeas(ideasToUse) {
    const channelName = studioData.channelTitle || 'Gyan Yatra';
    const customUrl = studioData.customUrl || '@gyan.yatra1';

    const formattedList = ideasToUse.map((idea, idx) => {
      const num = idx + 1;
      const viewsStr = (typeof idea.views48h === 'number' && idea.views48h > 0)
        ? `${Number(idea.views48h).toLocaleString('en-IN')} વાસ્તવિક વ્યુઝ (Real Views)`
        : 'વ્યુઝ: ઉપલબ્ધ નથી';
      const sourceStr = idea.inputType === 'ocr' ? 'YouTube Studio Screenshot (OCR સ્કેન)'
        : idea.inputType === 'paste' ? `Copy-Paste સોર્સ (${idea.source || 'વેબસાઇટ / ન્યૂઝ'})`
        : 'ડાયરેક્ટ નોટબુક એન્ટ્રી (Manual Entry)';
      const dateStr = idea.createdAt ? formatIndianDateTimeDisplay(idea.createdAt) : '';
      const pubDateStr = idea.sourcePublishedAt ? `\n   - સત્તાવાર પ્રકાશન તારીખ: ${formatIndianDateTimeDisplay(idea.sourcePublishedAt)}` : '';
      const urlStr = idea.sourceUrl ? `\n   - રેફરન્સ લિંક: ${idea.sourceUrl}` : '';
      const notesStr = idea.notes ? `\n   - અંગત નોંધ: ${idea.notes}` : '';
      const descStr = idea.description ? `\n   - વિગત / નોંધ:\n     "${idea.description.trim()}"` : (idea.originalText ? `\n   - મૂળ લખાણ:\n     "${idea.originalText.trim()}"` : '');

      return `[આઈડિયા #${num}]:
   - ટાઇટલ: "${idea.title}"
   - કેટેગરી: ${idea.category || 'સરકારી યોજના & ભરતી'}
   - ઇનપુટ સોર્સ: ${sourceStr}
   - નોટબુકમાં ઉમેર્યા તારીખ: ${dateStr}${pubDateStr}
   - સંખ્યા: ${viewsStr}${urlStr}${notesStr}${descStr}`;
    }).join('\n\n------------------------------------------------------------\n\n');

    return `તમે એક વરિષ્ઠ YouTube Strategy & Algorithm નિષ્ણાત છો.
મારી ચેનલનું નામ: "${channelName}" ${customUrl ? `(${customUrl})` : ''}.
વિષય / કેટેગરી: સરકારી યોજના, સરકારી ભરતી, કર્મચારી પરિપત્ર અને નિયમો (સત્તાવાર પુરાવા સાથે શુદ્ધ બોલચાલની ગુજરાતી ભાષામાં).

============================================================
📊 [મારી આઈડિયા નોટબુકમાંથી પસંદ કરેલા ૧૦૦% સાચા અને વાસ્તવિક વિષયો]
(👉 વિશેષ નોંધ: નીચેના આઈડિયા મેં મારી જ્ઞાન યાત્રા આઈડિયા નોટબુકમાંથી સિલેક્ટ કરેલા છે. તેમાં આપેલા ટાઈટલ, વાસ્તવિક વ્યુઝ, સત્તાવાર તારીખો અને નોંધ સાચી છે:)
============================================================

${formattedList}

============================================================
🎯 [તમારું ટાસ્ક: આ પસંદ કરેલા વિષયોનું વિશ્લેષણ કરીને ૩ સુપરહિટ વાયરલ વિડીયો પ્લાન આપો]
============================================================
ઉપર આપેલા સાચા ડેટાના આધારે આગામી ૨૪ થી ૪૮ કલાકમાં ચેનલ પર અપલોડ કરવા માટે ૩ શ્રેષ્ઠ ગુજરાતી વિડીયો પ્લાન તૈયાર કરો:

દરેક વિડીયો આઈડિયા માટે નીચેની વિગતો આપો:
૧. [ક્લિકેબલ હાઈ-CTR ગુજરાતી ટાઈટલ]: ૨ વૈકલ્પિક ટાઈટલ (ક્લિકબેટ મુક્ત, ૧૦૦% સાચું, અને YouTube Search માં રેન્ક થાય તેવું)
૨. [૧૬:૯ થંબનેલ પ્લાન]: 
   - બેકગ્રાઉન્ડ રંગ અને વાસ્તવિક સત્તાવાર ફોટો
   - થંબનેલ પર લખવાના મોટા બોલ્ડ ફક્ત ૩ થી ૪ ગુજરાતી શબ્દો
   - એક નાનો આકર્ષક બેજ (દા.ત. "સત્તાવાર પરિપત્ર ✓" અથવા "મોટો નિર્ણય ⚠️")
૩. [પ્રથમ ૪૫ સેકન્ડનો હૂક ડાયલોગ (Retention Hook)]: શરૂઆતનો શબ્દશઃ ગુજરાતી બોલવાનો ડાયલોગ
૪. [શ્રેષ્ઠ વિડીયો ફોર્મેટ & લંબાઈ]: લોંગ વિડીયો (Long 8-12m) કે શોર્ટ્સ (Shorts 60s)
૫. [કીવર્ડ્સ & હેશટેગ્સ]: ૫ હાઈ-વોલ્યુમ ગુજરાતી સર્ચ કીવર્ડ્સ અને ૩ વાયરલ હેશટેગ્સ
૬. [અપલોડ કરવાનો શ્રેષ્ઠ સમય]: ક્યારે પબ્લિશ કરવું

કોઈ પણ ફોટો માંગ્યા વગર સીધો જ ૩ આઈડિયાનો માસ્ટરક્લાસ ગુજરાતી પ્લાન શરૂ કરો!`;
  }

  // Filter & Sort ideas for the Notebook Tab
  function getFilteredProjectIdeas() {
    const activeProj = projectState.getActiveProject();
    if (!activeProj) return [];
    let list = projectState.getProjectIdeas(activeProj.id) || [];

    // Archive filter
    if (!showArchived) {
      list = list.filter(i => !i.isArchived);
    }

    // Source Filter
    if (sourceFilter !== 'all') {
      list = list.filter(i => (i.inputType || 'manual') === sourceFilter);
    }

    // Category Filter
    if (categoryFilter !== 'all') {
      list = list.filter(i => (i.category || 'સરકારી યોજના') === categoryFilter);
    }

    // Date Range Filter
    list = filterIdeasByDateRange(list, dateFilterRange, customDateStart, customDateEnd);

    // Search Query
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(i => 
        (i.title || '').toLowerCase().includes(q) ||
        (i.description || '').toLowerCase().includes(q) ||
        (i.originalText || '').toLowerCase().includes(q) ||
        (i.notes || '').toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      } else if (sortOrder === 'oldest') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      } else if (sortOrder === 'updated') {
        return new Date(b.updatedAt || b.clientUpdatedAt || 0).getTime() - new Date(a.updatedAt || a.clientUpdatedAt || 0).getTime();
      } else if (sortOrder === 'views') {
        return (Number(b.views48h) || 0) - (Number(a.views48h) || 0);
      }
      return 0;
    });

    return list;
  }

  // --- RENDER MAIN VIEW ---
  function render() {
    const activeProj = projectState.getActiveProject() || { name: 'મુખ્ય પ્રોજેક્ટ', folderName: 'મુખ્ય ફોલ્ડર', id: 'default' };
    let allIdeas = projectState.getProjectIdeas(activeProj.id) || [];

    // Fallback Consolidation: If active project has 0 ideas, merge any ideas from other projects so user never loses their writing!
    if (allIdeas.length === 0 && Array.isArray(projectState.projects)) {
      for (const p of projectState.projects) {
        if (p.id !== activeProj.id && Array.isArray(p.ideas) && p.ideas.length > 0) {
          activeProj.ideas = [...(activeProj.ideas || []), ...p.ideas];
          projectState.saveProjects();
          allIdeas = activeProj.ideas;
          break;
        }
      }
    }

    // Auto-sync 48-Hour YouTube Studio Topics directly into Idea
    try {
      const raw48h = localStorage.getItem('gyan_48h_pasted_topics');
      if (raw48h) {
        const parsed48h = JSON.parse(raw48h);
        if (Array.isArray(parsed48h) && parsed48h.length > 0) {
          let hasNewSync = false;
          for (const item of parsed48h) {
            const cleanTitle = (item.title || '').replace(/^\d+[\.\-\)]\s*/, '').trim();
            if (!cleanTitle) continue;
            const alreadyExists = allIdeas.some(i => (i.title || '').trim().toLowerCase() === cleanTitle.toLowerCase());
            if (!alreadyExists) {
              const newIdeaRecord = {
                id: item.id || ('idea_48h_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
                title: cleanTitle,
                category: 'સરકારી યોજના',
                inputType: 'paste',
                source: '48h YouTube Studio',
                description: item.description || `૪૮ કલાક સ્ટુડિયો પરથી ઉમેરેલો વિષય: ${cleanTitle}`,
                notes: item.notes || '',
                createdAt: item.timestamp || new Date().toISOString(),
                updatedAt: item.timestamp || new Date().toISOString()
              };
              if (typeof projectState.saveProjectIdea === 'function') {
                projectState.saveProjectIdea(newIdeaRecord, activeProj.id);
              } else {
                if (!Array.isArray(activeProj.ideas)) activeProj.ideas = [];
                activeProj.ideas.push(newIdeaRecord);
              }
              hasNewSync = true;
            }
          }
          if (hasNewSync) {
            allIdeas = projectState.getProjectIdeas(activeProj.id) || [];
          }
        }
      }
    } catch (e) {
      console.warn('[Auto-sync 48h to Idea]:', e);
    }
    const filteredIdeas = getFilteredProjectIdeas();
    const groupedDateSections = groupIdeasByDate(filteredIdeas);

    // Resolve active topic idea from current project or list
    if (!activeTopicIdeaId || !allIdeas.some(i => i.id === activeTopicIdeaId)) {
      if (activeProj.topicId && allIdeas.some(i => i.id === activeProj.topicId)) {
        activeTopicIdeaId = activeProj.topicId;
      } else if (activeProj.id && allIdeas.some(i => i.id === activeProj.id)) {
        activeTopicIdeaId = activeProj.id;
      } else if (activeProj.topic && allIdeas.some(i => (i.title || '').trim() === (activeProj.topic || '').trim())) {
        activeTopicIdeaId = allIdeas.find(i => (i.title || '').trim() === (activeProj.topic || '').trim()).id;
      } else if (activeProj.name && allIdeas.some(i => (i.title || '').trim() === (activeProj.name || '').trim())) {
        activeTopicIdeaId = allIdeas.find(i => (i.title || '').trim() === (activeProj.name || '').trim()).id;
      } else if (allIdeas.length > 0) {
        activeTopicIdeaId = allIdeas[0].id;
      } else {
        activeTopicIdeaId = null;
      }
    }
    const activeTopicIdea = allIdeas.find(i => i.id === activeTopicIdeaId) || (allIdeas.length > 0 ? allIdeas[0] : null);

    // Auto-load diary content on initial open so writing is immediately visible
    if (!isDiaryLoadedInitially && allIdeas.length > 0) {
      isDiaryLoadedInitially = true;
      const todayISO = formatDateISO(new Date()) || new Date().toISOString().slice(0, 10);
      const todayEntry = allIdeas.find(i => formatDateISO(i.createdAt) === todayISO);
      const initialEntry = todayEntry || activeTopicIdea || allIdeas[0];
      if (initialEntry) {
        activeDiaryEntryId = initialEntry.id;
        diaryDate = formatDateISO(initialEntry.createdAt) || todayISO;
        diaryTitle = initialEntry.title || '';
        diaryNote = initialEntry.description || initialEntry.notes || initialEntry.originalText || '';
      }
    }

    container.innerHTML = `
      <div style="max-width: 1240px; margin: 0 auto; padding-bottom: 40px;">
        
        <!-- Top Project Context Header -->
        <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: var(--radius-lg); padding: 14px 20px; margin-bottom: 18px; box-shadow: 0 8px 25px rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <button id="btn-back-to-projects-banner" class="btn btn-outline btn-sm" style="font-weight: 700; display: flex; align-items: center; gap: 6px;">
              <span>←</span> બધા ફોલ્ડર્સ
            </button>
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.25rem;">💡</span>
                <h2 style="font-size: 1.18rem; font-weight: 800; color: #fff; margin: 0;">
                  Idea (આઇડિયા બ્રેઇનસ્ટોર્મિંગ)
                </h2>
              </div>
              <p style="font-size: 0.8rem; color: #38bdf8; margin: 2px 0 0 0; font-weight: 600;">
                📁 ${activeProj.folderName || 'મુખ્ય ફોલ્ડર'} • ${activeProj.name} (${allIdeas.length} સેવ થયેલા આઈડિયા)
              </p>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <div id="firebase-auth-badge-area">
              ${firebaseService.getAuthUID() ? `
                <span style="font-size: 0.72rem; color: #38bdf8; font-weight: 700; background: rgba(56,189,248,0.15); padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(56,189,248,0.3);">
                  ☁️ ${firebaseService.getCurrentUser()?.email || 'Cloud Active'}
                </span>
                <button id="btn-firebase-signout" class="btn btn-outline btn-xs" style="font-size: 0.7rem; padding: 3px 6px; border-color: rgba(255,255,255,0.2); color: #94a3b8;" title="Sign Out">🚪 Logout</button>
              ` : `
                <button id="btn-firebase-signin" class="btn btn-outline btn-xs" style="font-size: 0.72rem; padding: 4px 10px; border-color: #38bdf8; color: #38bdf8; font-weight: 800; background: rgba(56,189,248,0.1);" title="Google એકાઉન્ટ વડે સાઇન ઇન કરો">
                  🔐 Cloud Sync
                </button>
              `}
            </div>

            <span id="idea-autosave-badge" class="badge" style="font-size: 0.72rem; font-weight: 800; background: ${saveStatusColor === '#10b981' ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.2)'}; color: ${saveStatusColor}; border: 1px solid ${saveStatusColor};">
              ${saveStatusText}
            </span>

            <button id="btn-goto-planner-from-topics" class="btn btn-primary btn-sm" style="display: none !important; font-weight: 800; background: #102A56; border: 1.5px solid #38bdf8; padding: 6px 14px; margin-right: 6px;">
              📋 ૨. Production Planner →
            </button>
            <button id="btn-goto-step2-banner" class="btn btn-primary btn-sm" style="font-weight: 800; background: #8b5cf6; border: none; padding: 6px 14px; display: inline-flex; align-items: center; gap: 6px;" title="આ ટોપિક સાથે ૨. Slides માં આગળ વધો">
              ${activeTopicIdea ? `૨. સ્લાઇડ્સ: "${activeTopicIdea.title.length > 18 ? activeTopicIdea.title.slice(0, 18) + '...' : activeTopicIdea.title}" →` : `૨. સ્લાઇડ્સ (Slide) →`}
            </button>
          </div>
        </div>

        <!-- Legacy Sub-Tabs (Strictly hidden for clean Tool 1 layout) -->
        <div style="display: none !important; visibility: hidden !important; height: 0 !important; overflow: hidden !important; position: absolute !important; pointer-events: none !important;" aria-hidden="true">
          <button class="btn btn-sm sub-tab-btn ${activeTab === 'notebook' ? 'btn-primary' : 'btn-outline'}" data-tab="notebook">
            <span>📑</span> આઈડિયા નોટબુક <span class="badge">${allIdeas.length}</span>
          </button>
          <button class="btn btn-sm sub-tab-btn ${activeTab === 'ocr' ? 'btn-primary' : 'btn-outline'}" data-tab="ocr">
            <span>📸</span> ૧. સ્ક્રીનશોટ સ્કેનર (OCR Studio)
          </button>
          <button class="btn btn-sm sub-tab-btn ${activeTab === 'paste' ? 'btn-primary' : 'btn-outline'}" data-tab="paste">
            <span>📋</span> ૨. કોપી-પેસ્ટ આઈડિયા
          </button>
          <button class="btn btn-sm sub-tab-btn ${activeTab === 'manual' ? 'btn-primary' : 'btn-outline'}" data-tab="manual">
            <span>✍️</span> ૩. સીધું લખાણ (Direct Writing)
          </button>
        </div>

        <!-- Render Current Tab Body: ONLY Idea Notebook -->
        <div id="sub-tab-content-area">
          ${renderNotebookView(allIdeas, filteredIdeas, groupedDateSections, activeTopicIdea)}
        </div>

      </div>

      <!-- Edit Idea Modal -->
      ${editingIdea ? renderEditModalHtml(editingIdea) : ''}

      <!-- Reading Diary Full Modal -->
      ${readingDiaryIdea ? renderReadDiaryModalHtml(readingDiaryIdea) : ''}

      <!-- ChatGPT Master Prompt Modal -->
      ${chatGptModalData ? renderChatGptModalHtml(chatGptModalData) : ''}
    `;

    attachEvents();
  }

  // --- TAB 1: NOTEBOOK DASHBOARD VIEW ---
  function renderNotebookView(allIdeas, filteredIdeas, groupedDateSections, activeTopicIdea) {
    return `
      <!-- IDEA DIARY / DAILY NOTES BOX (તારીખ પ્રમાણે ડાયરી ટૂલ) -->
      <div class="card idea-diary-box" style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.92)); border: 1.5px solid #10b981; border-radius: var(--radius-lg); padding: 18px 22px; margin-bottom: 20px; box-shadow: 0 8px 25px rgba(16,185,129,0.25); transition: all 0.3s ease;">
        
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5rem; background: rgba(16,185,129,0.15); padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(16,185,129,0.3);">📔</span>
            <div>
              <h3 style="font-weight: 800; font-size: 1.15rem; color: #34d399; margin: 0; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span>આઈડિયા ડાયરી (Idea Diary & Daily Notes)</span>
                ${activeDiaryEntryId ? `
                  <span class="badge" style="background: rgba(16,185,129,0.25); color: #6ee7b7; border: 1px solid #10b981; font-size: 0.72rem; font-weight: 800; padding: 2px 8px;">
                    📖 ખૂલેલી નોંધ: "${(diaryTitle || 'ડાયરી નોંધ').length > 25 ? (diaryTitle || 'ડાયરી નોંધ').slice(0, 25) + '...' : (diaryTitle || 'ડાયરી નોંધ')}"
                  </span>
                ` : `
                  <span class="badge" style="background: rgba(56,189,248,0.2); color: #38bdf8; border: 1px solid rgba(56,189,248,0.4); font-size: 0.72rem; font-weight: 800; padding: 2px 8px;">
                    ✍️ નવી ડાયરી નોંધ
                  </span>
                `}
              </h3>
              <span style="font-size: 0.78rem; color: #94a3b8;">
                ${activeDiaryEntryId 
                  ? `તારીખ: <strong>${formatIndianDateDisplay(diaryDate)}</strong> ની સેવ થયેલી ડાયરી નોંધ ખૂલેલી છે. અહીંથી સીધું લખાણ વાંચી અને સુધારી શકો છો.` 
                  : `તારીખ પસંદ કરી તમારી ઈચ્છા મુજબનું લખાણ લખો, સાચવો, વાંચો અથવા ગમે ત્યારે ડીલીટ કરો.`
                }
              </span>
            </div>
          </div>

          <div style="display: flex; gap: 8px; align-items: center;">
            <button type="button" id="btn-new-diary-entry" class="btn btn-outline btn-xs" style="border-color: #38bdf8; color: #38bdf8; font-weight: 800; padding: 5px 12px; border-radius: 6px;" title="નવી કોરી નોંધ લખવા માટે બોક્સ ખાલી કરો">
              ➕ નવી નોંધ લખો
            </button>
          </div>
        </div>

        <form id="form-idea-diary" style="display: flex; flex-direction: column; gap: 12px;">
          <!-- Top Row: Date Picker & Topic Heading -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
            <!-- Date Picker -->
            <div>
              <label for="diary-entry-date" style="display: block; font-size: 0.78rem; font-weight: 800; color: #38bdf8; margin-bottom: 5px;">
                📅 તારીખ પસંદ કરો (Date):
              </label>
              <input 
                type="date" 
                id="diary-entry-date" 
                class="form-input" 
                value="${diaryDate}" 
                style="width: 100%; font-size: 0.9rem; font-weight: 700; padding: 10px 14px; background: rgba(0,0,0,0.5); border: 1.5px solid rgba(56,189,248,0.4); border-radius: 8px; color: #ffffff;"
              />
            </div>

            <!-- Title / Topic -->
            <div>
              <label for="diary-entry-title" style="display: block; font-size: 0.78rem; font-weight: 800; color: #34d399; margin-bottom: 5px;">
                📌 વિષય / ટાઇટલ (Topic / Heading):
              </label>
              <input 
                type="text" 
                id="diary-entry-title" 
                class="form-input font-gu" 
                value="${diaryTitle}" 
                placeholder="દા.ત. આજના વિડીયોનો વિચાર, પરિપત્ર કે હેડિંગ..." 
                style="width: 100%; font-size: 0.9rem; font-weight: 700; padding: 10px 14px; background: rgba(0,0,0,0.5); border: 1.5px solid rgba(16,185,129,0.4); border-radius: 8px; color: #ffffff;"
              />
            </div>
          </div>

          <!-- Notes Textarea (લખાણ) -->
          <div>
            <label for="diary-entry-note" style="display: block; font-size: 0.78rem; font-weight: 800; color: #cbd5e1; margin-bottom: 5px;">
              ✍️ તમારી ઈચ્છા મુજબનું લખાણ / નોંધ (Diary Writing / Content):
            </label>
            <textarea 
              id="diary-entry-note" 
              class="form-input font-gu" 
              rows="5" 
              placeholder="અહીં તમારી ઈચ્છા મુજબનું કોઈપણ લખાણ, વિગત, મહત્વના મુદ્દા, યુટ્યુબ સ્ક્રિપ્ટ કે નોંધ લખો..." 
              style="width: 100%; font-size: 0.92rem; line-height: 1.7; padding: 12px 14px; background: rgba(0,0,0,0.5); border: 1.5px solid rgba(255,255,255,0.18); border-radius: 8px; color: #ffffff; resize: vertical;"
            >${diaryNote}</textarea>
          </div>

          <!-- Hidden Quick Add Title Input for backward compatibility -->
          <input type="hidden" id="quick-add-idea-title-input" value="">
          <button type="button" id="btn-quick-add-idea-submit" style="display: none !important;"></button>

          <!-- Form Action Buttons -->
          <div style="display: flex; gap: 10px; justify-content: flex-end; align-items: center; flex-wrap: wrap;">
            <button type="button" id="btn-clear-diary-form" class="btn btn-outline btn-sm" style="font-weight: 700; border-color: rgba(255,255,255,0.25); color: #cbd5e1; padding: 8px 14px; border-radius: 6px;">
              ✕ સાફ કરો (Clear)
            </button>
            <button type="submit" id="btn-save-diary-entry" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #10b981, #059669); border: none; font-weight: 800; padding: 9px 22px; border-radius: 8px; font-size: 0.92rem; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 15px rgba(16,185,129,0.35);">
              <span>💾</span> ${activeDiaryEntryId ? 'ડાયરીમાં ફેરફાર સાચવો (Update Entry)' : 'ડાયરીમાં સાચવો (Save to Diary)'}
            </button>
          </div>
        </form>
      </div>

      <!-- Selected Active Topic Workflow Banner -->
      <div class="active-workflow-topic-strip" style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(15, 23, 42, 0.95)); border: 1.5px solid #10b981; border-radius: var(--radius-lg); padding: 12px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; box-shadow: 0 4px 15px rgba(16,185,129,0.25);">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span style="font-size: 1.4rem;">🎯</span>
          <div>
            <div style="font-size: 0.74rem; color: #38bdf8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">
              વર્કફ્લો માટે પસંદ કરેલ સક્રિય વિષય (Selected Topic):
            </div>
            <div style="font-size: 1.02rem; font-weight: 900; color: #ffffff; line-height: 1.3;">
              ${activeTopicIdea ? activeTopicIdea.title : '<span style="color: #94a3b8; font-weight: 600;">કોઈ વિષય પસંદ કરેલ નથી (નીચેથી કોઈપણ કાર્ડ પર ક્લિક કરીને પસંદ કરો)</span>'}
            </div>
          </div>
        </div>

        ${activeTopicIdea ? `
          <button type="button" class="btn btn-primary btn-sm btn-proceed-selected-topic" style="background: linear-gradient(135deg, #10b981, #059669); border: none; font-weight: 900; padding: 9px 18px; border-radius: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.4); display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
            <span>🎬</span> આ વિષય સાથે આગળ વધો: ૨. Slide Prompt →
          </button>
        ` : ''}
      </div>

      <!-- Filter Bar & Search Tools -->
      <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85)); border: 1.5px solid rgba(56, 189, 248, 0.3); border-radius: var(--radius-lg); padding: 16px; margin-bottom: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.35);">
        
        <!-- Search & Date Filter Pills -->
        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; justify-content: space-between; margin-bottom: 14px;">
          
          <!-- Search Box -->
          <div style="flex: 1; min-width: 260px; position: relative;">
            <input type="text" id="notebook-search-input" class="form-input font-gu" value="${searchQuery}" placeholder="🔍 ટાઇટલ, લખાણ કે નોંધમાં શોધો..." style="width: 100%; font-size: 0.86rem; padding: 8px 12px; background: rgba(0,0,0,0.4); border-color: rgba(56,189,248,0.3);">
          </div>

          <!-- Quick Add Buttons (Preserved hidden for backward compatibility) -->
          <div style="display: none !important;">
            <button id="btn-quick-add-manual" class="btn btn-outline btn-xs"></button>
            <button id="btn-quick-add-paste" class="btn btn-outline btn-xs"></button>
            <button id="btn-quick-add-ocr" class="btn btn-outline btn-xs"></button>
          </div>
        </div>

        <!-- Date Range Filter Pills -->
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px;">
          <span style="font-size: 0.74rem; color: #94a3b8; font-weight: 800;">📅 તારીખ:</span>
          ${[
            { id: 'all', label: 'બધા જ (All)' },
            { id: 'today', label: 'આજે (Today)' },
            { id: 'yesterday', label: 'ગઈકાલે (Yesterday)' },
            { id: 'last7days', label: 'છેલ્લા ૭ દિવસ' },
            { id: 'last30days', label: 'છેલ્લા ૩૦ દિવસ' },
            { id: 'custom', label: 'કસ્ટમ તારીખ' }
          ].map(df => `
            <button class="btn btn-xs date-filter-btn ${dateFilterRange === df.id ? 'btn-primary' : 'btn-outline'}" data-range="${df.id}" style="font-size: 0.72rem; padding: 4px 10px; border-radius: 6px;">
              ${df.label}
            </button>
          `).join('')}

          <button id="btn-select-all-ideas" class="btn btn-xs ${selectedIdeaIds.size > 0 && selectedIdeaIds.size === filteredIdeas.length ? 'btn-primary' : 'btn-outline'}" style="margin-left: auto; font-size: 0.72rem; padding: 4px 10px; border-radius: 6px; border-color: #38bdf8; color: ${selectedIdeaIds.size > 0 && selectedIdeaIds.size === filteredIdeas.length ? '#fff' : '#38bdf8'}; font-weight: 800;">
            ${selectedIdeaIds.size > 0 && selectedIdeaIds.size === filteredIdeas.length ? '✓ બધા પસંદ કરેલ (All Selected)' : '☑️ Select All (બધા પસંદ કરો)'}
          </button>
        </div>

        ${dateFilterRange === 'custom' ? `
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 8px;">
            <label style="font-size: 0.74rem; color: #cbd5e1;">શરૂઆત:</label>
            <input type="date" id="custom-date-start" class="form-input" value="${customDateStart}" style="padding: 4px 8px; font-size: 0.76rem;">
            <label style="font-size: 0.74rem; color: #cbd5e1;">અંત:</label>
            <input type="date" id="custom-date-end" class="form-input" value="${customDateEnd}" style="padding: 4px 8px; font-size: 0.76rem;">
            <button id="btn-apply-custom-date" class="btn btn-primary btn-xs" style="font-weight: 800;">લાગુ કરો</button>
          </div>
        ` : ''}

        <!-- Source, Category & Sorting Filters -->
        <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center; font-size: 0.76rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">
          <!-- Source -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #94a3b8; font-weight: 700;">ઇનપુટ સોર્સ:</span>
            <select id="filter-source-select" class="form-input" style="font-size: 0.74rem; padding: 4px 8px;">
              <option value="all" ${sourceFilter === 'all' ? 'selected' : ''}>બધા સોર્સ (All)</option>
              <option value="diary" ${sourceFilter === 'diary' ? 'selected' : ''}>📔 ડાયરી નોંધ</option>
              <option value="ocr" ${sourceFilter === 'ocr' ? 'selected' : ''}>📸 OCR સ્કેન</option>
              <option value="paste" ${sourceFilter === 'paste' ? 'selected' : ''}>📋 કોપી-પેસ્ટ</option>
              <option value="manual" ${sourceFilter === 'manual' ? 'selected' : ''}>✍️ ડાયરેક્ટ લખાણ</option>
            </select>
          </div>

          <!-- Category -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #94a3b8; font-weight: 700;">કેટેગરી:</span>
            <select id="filter-category-select" class="form-input font-gu" style="font-size: 0.74rem; padding: 4px 8px;">
              <option value="all" ${categoryFilter === 'all' ? 'selected' : ''}>બધી કેટેગરી</option>
              <option value="ડાયરી નોંધ" ${categoryFilter === 'ડાયરી નોંધ' ? 'selected' : ''}>📔 ડાયરી નોંધ</option>
              <option value="સરકારી યોજના" ${categoryFilter === 'સરકારી યોજના' ? 'selected' : ''}>સરકારી યોજના</option>
              <option value="સરકારી ભરતી" ${categoryFilter === 'સરકારી ભરતી' ? 'selected' : ''}>સરકારી ભરતી</option>
              <option value="પરિપત્ર & નિયમ" ${categoryFilter === 'પરિપત્ર & નિયમ' ? 'selected' : ''}>પરિપત્ર & નિયમ</option>
              <option value="અન્ય" ${categoryFilter === 'અન્ય' ? 'selected' : ''}>અન્ય વિષયો</option>
            </select>
          </div>

          <!-- Sorting -->
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="color: #94a3b8; font-weight: 700;">ગોઠવણી (Sort):</span>
            <select id="sort-order-select" class="form-input" style="font-size: 0.74rem; padding: 4px 8px;">
              <option value="newest" ${sortOrder === 'newest' ? 'selected' : ''}>નવા પ્રથમ (Newest First)</option>
              <option value="oldest" ${sortOrder === 'oldest' ? 'selected' : ''}>જૂના પ્રથમ (Oldest First)</option>
              <option value="updated" ${sortOrder === 'updated' ? 'selected' : ''}>છેલ્લે ફેરફાર (Recently Updated)</option>
              <option value="views" ${sortOrder === 'views' ? 'selected' : ''}>સૌથી વધુ વ્યુઝ (Top Views)</option>
            </select>
          </div>

          <!-- Show Archived Toggle -->
          <label style="display: flex; align-items: center; gap: 4px; color: #94a3b8; cursor: pointer; margin-left: auto;">
            <input type="checkbox" id="check-show-archived" ${showArchived ? 'checked' : ''}> આર્કાઇવ થયેલા બતાવો
          </label>
        </div>

      </div>

      <!-- Multi-Selected Ideas Action Bar -->
      ${selectedIdeaIds.size > 0 ? `
        <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(15, 23, 42, 0.95)); border: 2px solid #10b981; border-radius: var(--radius-lg); padding: 12px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; box-shadow: 0 8px 24px rgba(16,185,129,0.3);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.3rem;">✓</span>
            <strong style="color: #34d399; font-size: 0.92rem;">
              ${selectedIdeaIds.size} આઈડિયા પસંદ કરેલા છે
            </strong>
          </div>

          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="btn-transfer-planner-selected" class="btn btn-primary btn-sm" style="background: #102A56; border: 1.5px solid #38bdf8; font-weight: 800; font-size: 0.82rem; display: flex; align-items: center; gap: 6px;">
              <span>📋</span> Tool #2: Production Planner માં મોકલો
            </button>
            <button id="btn-generate-selected-chatgpt" class="btn btn-success btn-sm" style="font-weight: 800; font-size: 0.82rem; display: flex; align-items: center; gap: 6px;">
              <span>🚀</span> પસંદ કરેલા આઈડિયા → ChatGPT માસ્ટર પ્રોમ્પ્ટ
            </button>
            <button id="btn-deselect-all-ideas" class="btn btn-outline btn-xs" style="color: #cbd5e1;">
              અનસિલેક્ટ કરો
            </button>
          </div>
        </div>
      ` : ''}

      ${filteredIdeas.length > 0 ? `
        <div style="display: flex; flex-direction: column; gap: 24px;">
          ${groupedDateSections.map(group => `
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px;">
                <span style="font-size: 1.1rem;">📅</span>
                <h3 style="font-size: 0.98rem; font-weight: 800; color: #38bdf8; margin: 0;">
                  ${group.dateLabel}
                </h3>
                <span class="badge" style="font-size: 0.68rem; background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3);">
                  ${group.ideas.length} આઈડિયા
                </span>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px;">
                ${group.ideas.map(idea => renderIdeaCard(idea, activeTopicIdea)).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      ` : `
        <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85)); border: 1.5px dashed rgba(56, 189, 248, 0.35); border-radius: var(--radius-lg); padding: 48px 24px; text-align: center;">
          <div style="font-size: 2.8rem; margin-bottom: 12px; opacity: 0.8;">💡</div>
          <h3 style="font-size: 1.25rem; font-weight: 800; color: #ffffff; margin: 0 0 6px 0;">
            આ પ્રોજેક્ટમાં હજુ કોઈ આઈડિયા સેવ થયેલા નથી
          </h3>
          <p style="font-size: 0.88rem; color: #94a3b8; max-width: 480px; margin: 0 auto 20px auto; line-height: 1.5;">
            આ પ્રોજેક્ટમાં હજુ સુધી કોઈ આઈડિયા ઉમેરાયો નથી. ઉપરના બોક્સમાં તમારો વિડીયો આઈડિયા લખીને <strong>'➕ આઈડિયા ઉમેરો'</strong> બટન દબાવો.
          </p>

          <div style="display: none !important; visibility: hidden !important; height: 0 !important; overflow: hidden !important; position: absolute !important; pointer-events: none !important;" aria-hidden="true">
            <button class="btn btn-primary btn-sm sub-tab-btn" data-tab="ocr">📸 ૧. સ્ક્રીનશોટ સ્કેનર</button>
            <button class="btn btn-primary btn-sm sub-tab-btn" data-tab="paste">📋 ૨. કોપી-પેસ્ટ આઈડિયા</button>
            <button class="btn btn-primary btn-sm sub-tab-btn" data-tab="manual">✍️ ૩. સીધું લખાણ લખો</button>
          </div>
        </div>
      `}

      <!-- CONNECTED WORKFLOW STEPPER BAR (TOOLS 1 TO 7 JOODAN) -->
      <div class="card workspace-bottom-stepper" style="background: rgba(15, 23, 42, 0.95); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: 12px; padding: 14px 20px; margin-top: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.4);">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.4rem;">🔗</span>
          <div>
            <div style="font-size: 0.78rem; color: #38bdf8; font-weight: 700;">
              વિડીયો આઇડિયા ટૂલ (Idea Brainstorming)
            </div>
            <div style="font-weight: 800; font-size: 0.95rem; color: #ffffff;">
              Idea (પસંદ કરેલ વિષય: <span style="color: #34d399;">${activeTopicIdea ? activeTopicIdea.title : 'કોઈ વિષય પસંદ કરો'}</span>)
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <button id="ws-btn-bottom-next-topics" class="btn btn-primary btn-sm" style="font-weight: 900; background: linear-gradient(135deg, #10b981, #059669); border: none; padding: 10px 20px; border-radius: 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.4); display: inline-flex; align-items: center; gap: 6px; cursor: pointer;">
            ${activeTopicIdea ? `આ વિષય સાથે આગળ વધો: ૧. Slide Prompts →` : `આગળનું પગલું: ૧. Slide Prompts (સ્લાઇડ પ્રોમ્પ્ટ) →`}
          </button>
        </div>
      </div>
    `;
  }

  // --- RENDER SINGLE IDEA CARD ---
  function renderIdeaCard(idea, activeTopicIdea) {
    const isChecked = selectedIdeaIds.has(idea.id);
    const isCurrentTopic = Boolean(activeTopicIdea && activeTopicIdea.id === idea.id);
    const srcType = idea.inputType || 'manual';
    const srcBadgeColor = srcType === 'diary' ? '#10b981' : (srcType === 'ocr' ? '#38bdf8' : (srcType === 'paste' ? '#34d399' : '#a78bfa'));
    const srcBadgeBg = srcType === 'diary' ? 'rgba(16,185,129,0.15)' : (srcType === 'ocr' ? 'rgba(56,189,248,0.15)' : (srcType === 'paste' ? 'rgba(52,211,153,0.15)' : 'rgba(139,92,246,0.15)'));
    const srcLabel = srcType === 'diary' ? '📔 ડાયરી નોંધ' : (srcType === 'ocr' ? '📸 OCR સ્કેન' : (srcType === 'paste' ? '📋 કોપી-પેસ્ટ' : '✍️ સીધું લખાણ'));

    const createdDisplay = idea.createdAt ? formatIndianDateTimeDisplay(idea.createdAt) : 'તારીખ નથી';
    const isModified = idea.updatedAt && idea.createdAt && idea.updatedAt !== idea.createdAt;
    const normTitle = (idea.title || idea.topic || '').trim().toLowerCase();
    const isAlreadyInPlanner = plannerTopicsSet.has(normTitle);

    const cardBorder = isCurrentTopic ? '2px solid #10b981' : (isChecked ? '1.5px solid #38bdf8' : '1.5px solid rgba(255,255,255,0.08)');
    const cardShadow = isCurrentTopic ? '0 0 20px rgba(16, 185, 129, 0.4), 0 4px 15px rgba(0,0,0,0.4)' : '0 4px 15px rgba(0,0,0,0.3)';
    const cardBg = isCurrentTopic
      ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(15, 23, 42, 0.96))'
      : 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))';

    const diaryText = (idea.description || idea.notes || idea.originalText || '').trim();

    return `
      <div class="idea-notebook-card ${isCurrentTopic ? 'active-topic-card' : ''}" data-id="${idea.id}" style="background: ${cardBg}; border: ${cardBorder}; border-radius: 10px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: ${cardShadow}; transition: all 0.2s ease; cursor: pointer;">
        
        <div>
          <!-- Card Header: Checkbox + Badges -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; gap: 8px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;" onclick="event.stopPropagation()">
              <input type="checkbox" class="idea-select-checkbox" data-id="${idea.id}" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
              <span class="badge" style="font-size: 0.68rem; font-weight: 800; background: ${srcBadgeBg}; color: ${srcBadgeColor}; border: 1px solid ${srcBadgeColor}; padding: 2px 7px;">
                ${srcLabel}
              </span>
            </label>

            <div style="display: flex; align-items: center; gap: 6px;">
              ${isCurrentTopic ? `
                <span class="badge" style="font-size: 0.72rem; font-weight: 900; background: rgba(16,185,129,0.3); color: #34d399; border: 1.5px solid #10b981; padding: 2px 8px; border-radius: 6px;">
                  🎯 સક્રિય વિષય
                </span>
              ` : `
                <button type="button" class="btn btn-outline btn-xs btn-set-active-topic" data-id="${idea.id}" style="font-size: 0.68rem; padding: 2px 7px; border-color: rgba(56,189,248,0.4); color: #38bdf8; font-weight: 700; border-radius: 5px; cursor: pointer;" title="આ આઈડિયાને સક્રિય વિષય તરીકે પસંદ કરો" onclick="event.stopPropagation()">
                  🎯 પસંદ કરો
                </button>
              `}
              <span class="badge" style="font-size: 0.68rem; background: rgba(255,255,255,0.08); color: #cbd5e1; border: 1px solid rgba(255,255,255,0.15);">
                ${idea.category || 'સરકારી યોજના'}
              </span>
            </div>
          </div>

          <!-- Snippet Thumbnail if available -->
          ${idea.cropSnippet ? `
            <div style="margin-bottom: 8px;">
              <img src="${idea.cropSnippet}" style="max-height: 32px; max-width: 100%; object-fit: contain; border-radius: 4px; border: 1px solid rgba(56,189,248,0.4);" alt="Snippet">
            </div>
          ` : ''}

          <!-- Idea Title -->
          <h4 class="font-gu" style="font-size: 1.02rem; font-weight: 800; color: ${isCurrentTopic ? '#34d399' : '#ffffff'}; line-height: 1.4; margin: 0 0 8px 0;">
            ${idea.title}
          </h4>

          <!-- Views Badge if present -->
          ${typeof idea.views48h === 'number' && idea.views48h > 0 ? `
            <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 0.74rem; color: #34d399; font-weight: 800; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); border-radius: 6px; padding: 2px 8px; margin-bottom: 8px;">
              <span>👁️</span> ${Number(idea.views48h).toLocaleString('en-IN')} વ્યુઝ (48h)
            </div>
          ` : ''}

          <!-- Diary Writing / Content Display -->
          ${diaryText ? `
            <div class="font-gu" style="background: rgba(0, 0, 0, 0.45); border-left: 3px solid ${isCurrentTopic ? '#10b981' : '#38bdf8'}; border-radius: 6px; padding: 10px 12px; margin: 8px 0 10px 0; font-size: 0.85rem; line-height: 1.6; color: #f1f5f9; white-space: pre-wrap; word-break: break-word; max-height: 220px; overflow-y: auto;">
              ${diaryText}
            </div>
          ` : ''}

          <!-- Reference Link -->
          ${idea.sourceUrl ? `
            <div style="font-size: 0.72rem; color: #38bdf8; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              🔗 <a href="${idea.sourceUrl}" target="_blank" rel="noopener noreferrer" style="color: #38bdf8; text-decoration: underline;" onclick="event.stopPropagation()">${idea.sourceUrl}</a>
            </div>
          ` : ''}
        </div>

        <!-- Card Footer: Timestamps & Operations -->
        <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px; margin-top: 10px;" onclick="event.stopPropagation()">
          
          <div style="font-size: 0.7rem; color: #64748b; margin-bottom: 8px; line-height: 1.4;">
            <div>🕒 ઉમેર્યા તારીખ: <strong style="color: #94a3b8;">${createdDisplay}</strong></div>
            ${isModified ? `<div>✏️ છેલ્લે ફેરફાર: <span style="color: #cbd5e1;">${formatIndianDateTimeDisplay(idea.updatedAt)}</span></div>` : ''}
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center; flex-wrap: wrap;">
            <button class="btn btn-primary btn-xs btn-open-in-diary" data-id="${idea.id}" style="font-size: 0.74rem; padding: 4px 10px; background: rgba(16, 185, 129, 0.2); border: 1.5px solid #10b981; color: #34d399; font-weight: 800; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" title="આ નોંધ ઉપર ડાયરીમાં ખોલો અને સુધારો">
              <span>📖</span> ડાયરીમાં ખોલો
            </button>
            ${diaryText ? `
              <button class="btn btn-outline btn-xs btn-read-full-diary" data-id="${idea.id}" style="font-size: 0.7rem; padding: 3px 8px; border-color: rgba(56,189,248,0.5); color: #38bdf8; font-weight: 700;" title="સંપૂર્ણ લખાણ વાંચો">
                👁️ વાંચો
              </button>
              <button class="btn btn-outline btn-xs btn-copy-idea-text" data-id="${idea.id}" style="font-size: 0.7rem; padding: 3px 8px; border-color: rgba(56,189,248,0.4); color: #38bdf8; font-weight: 700;" title="લખાણ કોપી કરો">
                📋 કોપી
              </button>
            ` : ''}
            <button class="btn btn-primary btn-xs btn-start-production-idea" data-id="${idea.id}" data-title="${encodeURIComponent(idea.title)}" style="font-size: 0.76rem; padding: 5px 12px; background: ${isCurrentTopic ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)'}; border: none; color: #ffffff; font-weight: 800; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; box-shadow: 0 2px 8px ${isCurrentTopic ? 'rgba(16,185,129,0.4)' : 'rgba(139,92,246,0.35)'};" title="આ વિષય સાથે આગળ વધો: ૪. Slide Prompts">
              <span>🎬</span> ${isCurrentTopic ? 'આ વિષય સાથે આગળ વધો: ૪. Slide Prompts ➔' : '૪. Slide Prompts ➔'}
            </button>
            ${isAlreadyInPlanner ? `
              <span class="badge" style="display: none !important; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; font-size: 0.7rem; font-weight: 800; padding: 2px 7px; border-radius: 4px;">
                ✓ In Planner
              </span>
            ` : `
              <button class="btn btn-outline btn-xs btn-add-card-to-planner" data-id="${idea.id}" style="display: none !important;" title="Tool #2 Production Planner માં ઉમેરો">
                ➕ Add to Planner
              </button>
            `}
            <button class="btn btn-outline btn-xs btn-edit-idea" data-id="${idea.id}" style="font-size: 0.7rem; padding: 3px 8px; border-color: #38bdf8; color: #38bdf8; font-weight: 700;">
              ✏️ સુધારો
            </button>
            <button class="btn btn-outline btn-xs btn-duplicate-idea" data-id="${idea.id}" style="font-size: 0.7rem; padding: 3px 8px; border-color: rgba(255,255,255,0.2); color: #cbd5e1;" title="નકલ બનાવો">
              📑 નકલ
            </button>
            <button class="btn btn-outline btn-xs btn-archive-idea" data-id="${idea.id}" style="font-size: 0.7rem; padding: 3px 8px; border-color: rgba(255,255,255,0.2); color: #94a3b8;" title="${idea.isArchived ? 'અન-આર્કાઇવ કરો' : 'આર્કાઇવ કરો'}">
              ${idea.isArchived ? '📂 રીસ્ટોર' : '📦 આર્કાઇવ'}
            </button>
            <button class="btn btn-outline btn-xs btn-delete-idea" data-id="${idea.id}" style="font-size: 0.7rem; padding: 3px 8px; border-color: rgba(239,68,68,0.5); color: #ef4444; font-weight: 700;" title="ડાયરીમાંથી ડિલીટ કરો">
              🗑️ ડીલીટ
            </button>
          </div>
        </div>

      </div>
    `;
  }

  // --- TAB 2: OCR STUDIO VIEW ---
  function renderOcrStudioView() {
    const activePhoto = uploadedScreenshots[0];
    const filteredVideos = studioData.topVideos || [];

    return `
      <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85)); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: var(--radius-lg); padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.45);">
        
        <!-- Header Strip -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="font-size: 1.2rem; font-weight: 800; color: #fff; margin: 0 0 4px 0;">
              📸 YouTube Studio સ્ક્રીનશોટ સ્કેનર & વિઝ્યુઅલ બોક્સ ડિટેક્ટર
            </h3>
            <p style="font-size: 0.82rem; color: #94a3b8; margin: 0;">
              સ્ક્રીનશોટ અપલોડ કરો અથવા પેસ્ટ કરો. અસલી ફોટા પર વિઝ્યુઅલ બોક્સ હાઇલાઇટ થશે. સ્કેન થયેલા આઈડિયા ૧-ક્લિકમાં તમારી નોટબુકમાં સેવ થશે.
            </p>
          </div>

          <div style="display: flex; gap: 8px;">
            <button id="btn-upload-new-ocr-photo" class="btn btn-outline btn-xs" style="border-color: #38bdf8; color: #38bdf8; font-weight: 800;">
              + નવો ફોટો અપલોડ
            </button>
          </div>
        </div>

        ${!activePhoto ? `
          <!-- Initial Dropzone -->
          <div style="border: 2.5px dashed #38bdf8; border-radius: 12px; padding: 48px 24px; text-align: center; cursor: pointer; background: rgba(0,0,0,0.3);" id="ocr-main-dropzone">
            <input type="file" id="ocr-file-input" accept="image/*" multiple style="display: none;">
            <div style="font-size: 2.8rem; margin-bottom: 12px;">📤</div>
            <h4 style="font-size: 1.15rem; font-weight: 800; color: #fff; margin: 0 0 6px 0;">
              YouTube Studio Analytics નો ફોટો અહીં પસંદ કરો
            </h4>
            <p style="font-size: 0.84rem; color: #94a3b8; margin: 0 0 16px 0;">
              કમ્પ્યુટર કે મોબાઈલમાંથી ફોટો પસંદ કરો અથવા સીધું કીબોર્ડ પરથી <strong>Ctrl + V</strong> દબાવી પેસ્ટ કરો
            </p>
            <button type="button" id="btn-browse-ocr" class="btn btn-primary" style="font-weight: 800; background: linear-gradient(135deg, #0284c7, #38bdf8); border: none;">
              📁 ફોટો પસંદ કરો
            </button>
          </div>
        ` : `
          <!-- Analyzed Image & Table Split View -->
          <div style="display: grid; grid-template-columns: minmax(360px, 480px) 1fr; gap: 20px; align-items: start;">
            
            <!-- Left: High-Clarity Viewport -->
            <div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; align-items: center; justify-content: space-between;">
                <button id="btn-toggle-box-select" class="btn ${isBoxSelectMode ? 'btn-success' : 'btn-outline'} btn-xs" style="font-weight: 800; font-size: 0.76rem; border-color: ${isBoxSelectMode ? '#10b981' : '#38bdf8'}; color: ${isBoxSelectMode ? '#fff' : '#38bdf8'}; padding: 5px 10px;">
                  🎯 ${isBoxSelectMode ? 'સિલેક્શન મોડ ચાલુ (ફોટા પર ડ્રેગ કરો)' : 'ફોટા પર વિસ્તાર સિલેક્ટ કરો (Select Box)'}
                </button>
                <button id="btn-toggle-invert" class="btn ${invertForOcr ? 'btn-primary' : 'btn-outline'} btn-xs" style="font-weight: 800; font-size: 0.72rem; padding: 5px 10px;">
                  🌓 ${invertForOcr ? 'સામાન્ય ફોટો' : 'ડાર્ક મોડ ઇન્વર્ટ'}
                </button>
              </div>

              <!-- Viewport -->
              <div style="position: relative; border-radius: 10px; overflow: auto; border: 1.5px solid #38bdf8; background: #020617; max-height: 480px; min-height: 320px; display: flex; align-items: center; justify-content: center; padding: 10px;" id="main-screenshot-viewport">
                <div id="screenshot-container-rel" style="position: relative; display: inline-block; transform: scale(${imageAdjustments.zoom}) rotate(${imageAdjustments.rotation}deg); transform-origin: center center; transition: transform 0.2s ease;">
                  <img src="${activePhoto.base64}" id="main-screenshot-img" style="max-width: 100%; height: auto; object-fit: contain; display: block; filter: ${invertForOcr ? 'invert(1) hue-rotate(180deg) ' : ''}brightness(${100 + imageAdjustments.brightness}%) contrast(${100 + imageAdjustments.contrast}%);" alt="${activePhoto.name}">
                  <div id="screenshot-boxes-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;"></div>
                  <canvas id="screenshot-selection-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; cursor: crosshair; display: ${isBoxSelectMode ? 'block' : 'none'}; z-index: 10;"></canvas>
                </div>
              </div>

              <!-- Clarity Controls -->
              <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px; margin-top: 12px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <button id="btn-zoom-out" class="btn btn-outline btn-xs" style="padding: 2px 7px;">-</button>
                    <span id="zoom-level-text" style="font-size: 0.74rem; color: #cbd5e1;">${Math.round(imageAdjustments.zoom * 100)}%</span>
                    <button id="btn-zoom-in" class="btn btn-outline btn-xs" style="padding: 2px 7px;">+</button>
                  </div>
                  <button id="btn-rotate-90" class="btn btn-outline btn-xs" style="color: #38bdf8;">🔄 90° ફેરવો</button>
                </div>
                <button id="btn-apply-and-rescan" class="btn btn-primary btn-sm" style="width: 100%; font-size: 0.8rem; font-weight: 800; background: linear-gradient(135deg, #0284c7, #38bdf8); border: none;">
                  ⚡ આ એડજસ્ટમેન્ટ સાથે ફરી સ્કેન કરો
                </button>
              </div>
            </div>

            <!-- Right: Review Table & Save to Notebook Action -->
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                <div>
                  <h4 style="font-size: 1.05rem; font-weight: 800; color: #fff; margin: 0 0 2px 0;">
                    📋 OCR ડેટા રિવ્યૂ ટેબલ
                  </h4>
                  <span style="font-size: 0.74rem; color: #94a3b8;">અસલી ફોટા સાથે સરખાવીને ટાઇટલ અને વ્યુઝ ચકાસો</span>
                </div>

                <div style="display: flex; gap: 8px;">
                  <button id="btn-save-confirmed-to-notebook" class="btn btn-success btn-sm" style="font-weight: 800; font-size: 0.82rem; display: flex; align-items: center; gap: 6px;">
                    <span>💾</span> કન્ફર્મ થયેલા નોટબુકમાં ઉમેરો
                  </button>
                </div>
              </div>

              <!-- Table -->
              <div style="overflow-x: auto; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; background: rgba(0,0,0,0.35); margin-bottom: 14px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
                  <thead>
                    <tr style="background: rgba(15, 23, 42, 0.9); border-bottom: 1.5px solid rgba(56, 189, 248, 0.35); color: #38bdf8; font-size: 0.74rem;">
                      <th style="padding: 8px 6px; width: 55px; text-align: center;">ક્યાં છે?</th>
                      <th style="padding: 8px 10px;">વિડીયો ટાઇટલ (Video Title)</th>
                      <th style="padding: 8px 6px; width: 105px; text-align: right;">વ્યુઝ (Views)</th>
                      <th style="padding: 8px 6px; width: 90px; text-align: center;">OCR ચોકસાઈ</th>
                      <th style="padding: 8px 6px; width: 105px; text-align: center;">વેરિફિકેશન</th>
                      <th style="padding: 8px 6px; width: 32px;"></th>
                    </tr>
                  </thead>
                  <tbody id="ocr-review-table-body">
                    ${filteredVideos.length > 0 ? filteredVideos.map((vid, idx) => {
                      const conf = Number(vid.confidence) || 75;
                      const confColor = conf >= 70 ? '#10b981' : (conf >= 50 ? '#f59e0b' : '#ef4444');
                      const isConfirmed = Boolean(vid.isConfidenceVerified);
                      const isHl = activeHighlightedIdx === idx;

                      return `
                        <tr class="ocr-review-row" data-idx="${idx}" style="border-bottom: 1px solid rgba(255,255,255,0.06); background: ${isHl ? 'rgba(245,158,11,0.18)' : (isConfirmed ? 'rgba(16,185,129,0.04)' : 'rgba(245,158,11,0.04)')};">
                          <td style="padding: 8px 6px; text-align: center;">
                            <button class="btn btn-outline btn-xs btn-locate-in-photo" data-idx="${idx}" style="font-size: 0.7rem; padding: 2px 6px; border-color: ${isHl ? '#f59e0b' : '#38bdf8'}; color: ${isHl ? '#f59e0b' : '#38bdf8'}; font-weight: 800;">
                              📍 #${idx + 1}
                            </button>
                          </td>
                          <td style="padding: 8px 10px;">
                            ${vid.cropSnippet ? `
                              <div style="margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                                <img src="${vid.cropSnippet}" style="max-height: 24px; max-width: 140px; object-fit: contain; border-radius: 4px; border: 1px solid rgba(56,189,248,0.5);" alt="Snippet">
                              </div>
                            ` : ''}
                            <input type="text" class="form-input font-gu input-row-title" data-idx="${idx}" value="${vid.title || ''}" placeholder="ટાઇટલ લખો" style="width: 100%; font-size: 0.82rem; padding: 6px 8px; font-weight: 700; border-color: ${isConfirmed ? '#10b981' : '#f59e0b'};">
                          </td>
                          <td style="padding: 8px 6px;">
                            <input type="number" class="form-input input-row-views" data-idx="${idx}" value="${vid.views48h !== null && vid.views48h !== undefined ? vid.views48h : ''}" placeholder="વ્યુઝ" style="width: 100%; text-align: right; font-size: 0.82rem; padding: 6px 8px;">
                          </td>
                          <td style="padding: 8px 6px; text-align: center;">
                            <span class="badge" style="font-size: 0.66rem; font-weight: 800; color: ${confColor}; border: 1px solid ${confColor}; background: rgba(0,0,0,0.5);">
                              ${conf}%
                            </span>
                          </td>
                          <td style="padding: 8px 6px; text-align: center;">
                            <button class="btn btn-xs btn-toggle-verify" data-idx="${idx}" style="font-size: 0.7rem; padding: 3px 8px; font-weight: 800; border-radius: 6px; cursor: pointer; ${isConfirmed ? 'background: #10b981; color: #fff; border: 1px solid #10b981;' : 'background: rgba(245,158,11,0.2); color: #fbbf24; border: 1px solid #f59e0b;'}">
                              ${isConfirmed ? '✓ કન્ફર્મ' : 'કન્ફર્મ કરો'}
                            </button>
                          </td>
                          <td style="padding: 8px 6px; text-align: center;">
                            <button class="btn-remove-review-row" data-idx="${idx}" style="background: transparent; color: #ef4444; border: none; font-size: 1rem; cursor: pointer;">✕</button>
                          </td>
                        </tr>
                      `;
                    }).join('') : `
                      <tr>
                        <td colspan="6" style="text-align: center; padding: 24px; color: #94a3b8;">
                          કોઈ વિડીયો મળ્યા નથી. કૃપા કરીને ફોટા પર વિસ્તાર ડ્રેગ કરીને સિલેક્ટ કરો.
                        </td>
                      </tr>
                    `}
                  </tbody>
                </table>
              </div>

              <!-- ChatGPT Prompt Button from OCR Rows -->
              <button id="btn-generate-ocr-prompt" class="btn btn-outline btn-sm" style="border-color: #10b981; color: #34d399; font-weight: 800;">
                🚀 આ સ્કેન કરેલા વિડીયો માટે ChatGPT પ્રોમ્પ્ટ બનાવો
              </button>
            </div>

          </div>
        `}

      </div>
    `;
  }

  // --- TAB 3: COPY-PASTE IDEAS VIEW ---
  function renderPasteView() {
    return `
      <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85)); border: 1.5px solid rgba(16, 185, 129, 0.35); border-radius: var(--radius-lg); padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.45); max-width: 900px; margin: 0 auto;">
        
        <div style="margin-bottom: 18px;">
          <h3 style="font-size: 1.2rem; font-weight: 800; color: #fff; margin: 0 0 6px 0; display: flex; align-items: center; gap: 8px;">
            <span>📋</span> ૨. કોપી-પેસ્ટ આઈડિયા નોટબુક
          </h3>
          <p style="font-size: 0.84rem; color: #94a3b8; margin: 0; line-height: 1.5;">
            YouTube, Studio, સમાચાર, સરકારી પરિપત્ર કે ChatGPT માંથી કોપી કરેલું લખાણ અહીં પેસ્ટ કરો. સિસ્ટમ આપમેળે ટાઇટલ, વ્યુઝ, તારીખ અને સોર્સ ઓળખશે. મૂળ લખાણ ૧૦૦% અસલ રીતે સચવાશે.
          </p>
        </div>

        <!-- Large Comfortable Textarea -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 0.8rem; font-weight: 800; color: #38bdf8; margin-bottom: 6px;">
            કોપી કરેલું લખાણ અહીં પેસ્ટ કરો (Ctrl + V):
          </label>
          <textarea id="paste-raw-textarea" class="form-input font-gu" rows="8" placeholder="દા.ત.&#10;ગુજરાત કર્મચારી પગાર અને DA વધારો ૨૦૨૬ પરિપત્ર&#10;નાણા વિભાગ દ્વારા ૪% મોંઘવારી ભથ્થાનો સત્તાવાર આદેશ...&#10;18,450 views • 2 days ago&#10;https://youtube.com/watch?v=..." style="width: 100%; font-size: 0.88rem; line-height: 1.6; resize: vertical; padding: 12px; background: rgba(0,0,0,0.4);">${pasteRawText}</textarea>
        </div>

        <!-- Parsed Detection Preview Box (Editable) -->
        <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; margin-bottom: 18px;">
          <div style="font-size: 0.82rem; font-weight: 800; color: #34d399; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <span>✨</span> સ્માર્ટ ડિટેક્શન (તમે અહીં સુધારી શકો છો):
          </div>

          <div style="display: grid; grid-template-columns: 1fr 140px; gap: 12px; margin-bottom: 12px;">
            <div>
              <label style="display: block; font-size: 0.74rem; color: #cbd5e1; margin-bottom: 4px;">ટાઇટલ (Title):</label>
              <input type="text" id="paste-title-input" class="form-input font-gu" value="${parsedPasteData.title || ''}" placeholder="મુખ્ય શીર્ષક" style="width: 100%; font-size: 0.86rem; font-weight: 700;">
            </div>
            <div>
              <label style="display: block; font-size: 0.74rem; color: #cbd5e1; margin-bottom: 4px;">વ્યુઝ (Views):</label>
              <input type="number" id="paste-views-input" class="form-input" value="${parsedPasteData.detectedViews !== null ? parsedPasteData.detectedViews : ''}" placeholder="સંખ્યા" style="width: 100%; font-size: 0.86rem; text-align: right;">
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div>
              <label style="display: block; font-size: 0.74rem; color: #cbd5e1; margin-bottom: 4px;">કેટેગરી:</label>
              <select id="paste-category-select" class="form-input font-gu" style="width: 100%; font-size: 0.8rem; padding: 6px 10px;">
                <option value="સરકારી યોજના">સરકારી યોજના</option>
                <option value="સરકારી ભરતી">સરકારી ભરતી</option>
                <option value="પરિપત્ર & નિયમ">પરિપત્ર & નિયમ</option>
                <option value="અન્ય">અન્ય વિષયો</option>
              </select>
            </div>
            <div>
              <label style="display: block; font-size: 0.74rem; color: #cbd5e1; margin-bottom: 4px;">સોર્સ URL (જો હોય તો):</label>
              <input type="text" id="paste-url-input" class="form-input" value="${parsedPasteData.detectedUrl || ''}" placeholder="https://..." style="width: 100%; font-size: 0.8rem;">
            </div>
          </div>

          <div>
            <label style="display: block; font-size: 0.74rem; color: #cbd5e1; margin-bottom: 4px;">અંગત નોંધ (Personal Notes):</label>
            <input type="text" id="paste-notes-input" class="form-input font-gu" placeholder="આ વિષય પર વિડીયો ક્યારે બનાવવો, કયા મહત્વના મુદ્દા આવરી લેવા..." style="width: 100%; font-size: 0.82rem;">
          </div>
        </div>

        <!-- Action Button -->
        <button id="btn-save-paste-idea" class="btn btn-success" style="width: 100%; padding: 12px; font-size: 0.94rem; font-weight: 800; box-shadow: 0 4px 16px rgba(16,185,129,0.35);">
          💾 આ આઈડિયા નોટબુકમાં સાચવો (Save to Notebook)
        </button>

      </div>
    `;
  }

  // --- TAB 4: DIRECT MANUAL ENTRY VIEW ---
  function renderManualView() {
    return `
      <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85)); border: 1.5px solid rgba(139, 92, 246, 0.35); border-radius: var(--radius-lg); padding: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.45); max-width: 900px; margin: 0 auto;">
        
        <div style="margin-bottom: 18px;">
          <h3 style="font-size: 1.2rem; font-weight: 800; color: #fff; margin: 0 0 6px 0; display: flex; align-items: center; gap: 8px;">
            <span>✍️</span> ૩. સીધું નોટબુક લખાણ (Direct Notebook Entry)
          </h3>
          <p style="font-size: 0.84rem; color: #94a3b8; margin: 0; line-height: 1.5;">
            કોઈપણ ફોટો અપલોડ કર્યા વગર સીધા તમારા મનના આઈડિયા, મહત્વપૂર્ણ પોઈન્ટ્સ અને રેફરન્સ લિંક આરામથી નોટબુકમાં લખો:
          </p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 14px;">
          
          <!-- Title Input -->
          <div>
            <label style="display: block; font-size: 0.82rem; font-weight: 800; color: #38bdf8; margin-bottom: 4px;">
              આઈડિયા શીર્ષક / ટાઇટલ (Idea Title) *
            </label>
            <input type="text" id="manual-title-input" class="form-input font-gu" value="${manualFormData.title}" placeholder="દા.ત. ગુજરાત નવી આંગણવાડી ભરતી ૨૦૨૬ ફોર્મ ભરવાની પ્રક્રિયા" style="width: 100%; font-size: 0.92rem; font-weight: 700; padding: 10px 12px;">
          </div>

          <!-- Category & Tags -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">
                કેટેગરી
              </label>
              <select id="manual-category-select" class="form-input font-gu" style="width: 100%; font-size: 0.82rem; padding: 8px 10px;">
                <option value="સરકારી યોજના" ${manualFormData.category === 'સરકારી યોજના' ? 'selected' : ''}>સરકારી યોજના</option>
                <option value="સરકારી ભરતી" ${manualFormData.category === 'સરકારી ભરતી' ? 'selected' : ''}>સરકારી ભરતી</option>
                <option value="પરિપત્ર & નિયમ" ${manualFormData.category === 'પરિપત્ર & નિયમ' ? 'selected' : ''}>પરિપત્ર & નિયમ</option>
                <option value="અન્ય" ${manualFormData.category === 'અન્ય' ? 'selected' : ''}>અન્ય વિષયો</option>
              </select>
            </div>

            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">
                કીવર્ડ્સ / ટેગ્સ (Tags)
              </label>
              <input type="text" id="manual-tags-input" class="form-input font-gu" value="${manualFormData.tags}" placeholder="ભરતી, પરિપત્ર, ૨૦૨૬ (અલ્પવિરામથી અલગ કરો)" style="width: 100%; font-size: 0.82rem; padding: 8px 10px;">
            </div>
          </div>

          <!-- Description / Points -->
          <div>
            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">
              સંપૂર્ણ વિગત / મુખ્ય મુદ્દાઓ (Idea Description & Points)
            </label>
            <textarea id="manual-desc-textarea" class="form-input font-gu" rows="6" placeholder="આ વિડીયોમાં કઈ માહિતી આપવી છે, શું ખાસ વાત છે, દર્શકો શા માટે જોશે..." style="width: 100%; font-size: 0.88rem; line-height: 1.6; padding: 12px; resize: vertical;">${manualFormData.description}</textarea>
          </div>

          <!-- Reference Link & Views -->
          <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 12px;">
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">
                સત્તાવાર રેફરન્સ લિંક (જો હોય તો)
              </label>
              <input type="text" id="manual-url-input" class="form-input" value="${manualFormData.referenceLinks}" placeholder="https://ojas.gujarat.gov.in/..." style="width: 100%; font-size: 0.82rem; padding: 8px 10px;">
            </div>

            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">
                અંદાજિત વ્યુઝ (જો ખબર હોય તો)
              </label>
              <input type="number" id="manual-views-input" class="form-input" value="${manualFormData.views48h}" placeholder="દા.ત. 15000" style="width: 100%; font-size: 0.82rem; padding: 8px 10px; text-align: right;">
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">
              અંગત નોંધ (Personal Notes)
            </label>
            <textarea id="manual-notes-textarea" class="form-input font-gu" rows="2" placeholder="શુક્રવારે સાંજે ૬ વાગ્યે અપલોડ કરવો..." style="width: 100%; font-size: 0.84rem; padding: 8px 10px;">${manualFormData.notes}</textarea>
          </div>

          <!-- Submit Button -->
          <button id="btn-save-manual-idea" class="btn btn-primary" style="background: linear-gradient(135deg, #7c3aed, #8b5cf6); border: none; font-size: 0.94rem; font-weight: 800; padding: 12px; margin-top: 6px; box-shadow: 0 4px 18px rgba(139,92,246,0.4);">
            💾 આઈડિયા નોટબુકમાં સાચવો (Save to Notebook)
          </button>

        </div>

      </div>
    `;
  }

  // --- EDIT IDEA MODAL HTML ---
  function renderEditModalHtml(idea) {
    return `
      <div class="photo-lightbox-modal" style="display: flex; align-items: center; justify-content: center; z-index: 9999;">
        <div style="background: #0f172a; border: 1.5px solid #38bdf8; border-radius: 12px; padding: 24px; max-width: 650px; width: 92%; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.85);">
          
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.3rem;">✏️</span>
              <strong style="font-size: 1.1rem; color: #fff;">આઈડિયામાં ફેરફાર કરો (Edit Idea)</strong>
            </div>
            <button id="btn-close-edit-modal" style="background: transparent; border: none; color: #94a3b8; font-size: 1.3rem; cursor: pointer;">✕</button>
          </div>

          <div style="display: flex; flex-direction: column; gap: 12px;">
            <div>
              <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">ટાઇટલ *</label>
              <input type="text" id="edit-modal-title" class="form-input font-gu" value="${idea.title || ''}" style="width: 100%; font-size: 0.88rem; font-weight: 700;">
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <div>
                <label style="display: block; font-size: 0.78rem; font-weight: 700; color: #38bdf8; margin-bottom: 4px;">📅 તારીખ (Date)</label>
                <input type="date" id="edit-modal-date" class="form-input" value="${formatDateISO(idea.createdAt) || (new Date().toISOString().slice(0, 10))}" style="width: 100%; font-size: 0.82rem; padding: 6px 10px; background: rgba(0,0,0,0.5); border: 1.5px solid rgba(56,189,248,0.4); border-radius: 6px; color: #fff;">
              </div>

              <div>
                <label style="display: block; font-size: 0.76rem; color: #cbd5e1; margin-bottom: 4px;">કેટેગરી</label>
                <select id="edit-modal-category" class="form-input font-gu" style="width: 100%; font-size: 0.8rem;">
                  <option value="ડાયરી નોંધ" ${idea.category === 'ડાયરી નોંધ' ? 'selected' : ''}>📔 ડાયરી નોંધ</option>
                  <option value="સરકારી યોજના" ${idea.category === 'સરકારી યોજના' ? 'selected' : ''}>સરકારી યોજના</option>
                  <option value="સરકારી ભરતી" ${idea.category === 'સરકારી ભરતી' ? 'selected' : ''}>સરકારી ભરતી</option>
                  <option value="પરિપત્ર & નિયમ" ${idea.category === 'પરિપત્ર & નિયમ' ? 'selected' : ''}>પરિપત્ર & નિયમ</option>
                  <option value="અન્ય" ${idea.category === 'અન્ય' ? 'selected' : ''}>અન્ય વિષયો</option>
                </select>
              </div>
            </div>

            <div>
              <label style="display: block; font-size: 0.76rem; color: #cbd5e1; margin-bottom: 4px;">વ્યુઝ (Views - જો હોય તો)</label>
              <input type="number" id="edit-modal-views" class="form-input" value="${idea.views48h !== null && idea.views48h !== undefined ? idea.views48h : ''}" placeholder="સંખ્યા" style="width: 100%; font-size: 0.8rem; text-align: right;">
            </div>

            <div>
              <label style="display: block; font-size: 0.76rem; color: #cbd5e1; margin-bottom: 4px;">સંપૂર્ણ વિગત / લખાણ (Diary Writing / Description)</label>
              <textarea id="edit-modal-desc" class="form-input font-gu" rows="5" style="width: 100%; font-size: 0.84rem; line-height: 1.5;">${idea.description || idea.notes || idea.originalText || ''}</textarea>
            </div>

            <div>
              <label style="display: block; font-size: 0.76rem; color: #cbd5e1; margin-bottom: 4px;">અંગત નોંધ (Personal Notes)</label>
              <textarea id="edit-modal-notes" class="form-input font-gu" rows="2" style="width: 100%; font-size: 0.82rem;">${idea.notes || ''}</textarea>
            </div>

            <div style="font-size: 0.72rem; color: #64748b; background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 6px;">
              <div>🕒 તારીખ: <strong style="color: #94a3b8;">${formatIndianDateTimeDisplay(idea.createdAt)}</strong></div>
              <div>✏️ આ ફેરફારથી નવો Updated timestamp રેકોર્ડ થશે.</div>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px;">
              <button id="btn-cancel-edit-modal" class="btn btn-outline btn-sm">રદ કરો</button>
              <button id="btn-save-edit-modal" class="btn btn-success btn-sm" style="font-weight: 800;">💾 ફેરફાર સાચવો</button>
            </div>
          </div>

        </div>
      </div>
    `;
  }

  // --- READ DIARY FULL MODAL HTML ---
  function renderReadDiaryModalHtml(idea) {
    if (!idea) return '';
    const dateStr = idea.createdAt ? formatIndianDateDisplay(idea.createdAt) : 'તારીખ નથી';
    const content = (idea.description || idea.notes || idea.originalText || '').trim();

    return `
      <div class="photo-lightbox-modal" style="display: flex; align-items: center; justify-content: center; z-index: 9999;">
        <div style="background: #0f172a; border: 1.5px solid #10b981; border-radius: 12px; padding: 24px; max-width: 680px; width: 92%; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.85);">
          
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.4rem;">📖</span>
              <div>
                <strong style="font-size: 1.1rem; color: #fff; display: block;">${idea.title}</strong>
                <span style="font-size: 0.74rem; color: #38bdf8;">📅 તારીખ: ${dateStr}</span>
              </div>
            </div>
            <button id="btn-close-read-diary-modal" style="background: transparent; border: none; color: #94a3b8; font-size: 1.3rem; cursor: pointer;">✕</button>
          </div>

          <!-- Full Text Content -->
          <div style="background: rgba(0,0,0,0.5); border: 1px solid rgba(16,185,129,0.3); border-radius: 8px; padding: 18px; margin-bottom: 16px; max-height: 400px; overflow-y: auto;">
            <div class="font-gu" style="font-size: 0.95rem; line-height: 1.8; color: #f1f5f9; white-space: pre-wrap; word-break: break-word;">
              ${content || '<span style="color: #64748b;">(કોઈ વધારાનું લખાણ નથી)</span>'}
            </div>
          </div>

          <!-- Modal Action Buttons -->
          <div style="display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
            <button id="btn-modal-open-in-diary" class="btn btn-outline btn-sm" style="border-color: #10b981; color: #34d399; font-weight: 800;">
              ✏️ ડાયરીમાં સુધારો
            </button>
            <button id="btn-modal-copy-diary" class="btn btn-outline btn-sm" style="border-color: #38bdf8; color: #38bdf8; font-weight: 800;">
              📋 લખાણ કોપી કરો
            </button>
            <button id="btn-modal-close-read" class="btn btn-primary btn-sm" style="font-weight: 800; background: #334155;">
              બંધ કરો
            </button>
          </div>

        </div>
      </div>
    `;
  }

  // --- CHATGPT MASTER PROMPT MODAL HTML ---
  function renderChatGptModalHtml(data) {
    return `
      <div class="photo-lightbox-modal" style="display: flex; align-items: center; justify-content: center; z-index: 9999;">
        <div style="background: #0f172a; border: 1.5px solid #10b981; border-radius: 12px; padding: 24px; max-width: 720px; width: 92%; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.85);">
          
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.3rem;">🚀</span>
              <strong style="font-size: 1.1rem; color: #fff;">પસંદ કરેલા ${data.count} આઈડિયા માટે ChatGPT પ્રોમ્પ્ટ</strong>
            </div>
            <button id="btn-close-chatgpt-modal" style="background: transparent; border: none; color: #94a3b8; font-size: 1.3rem; cursor: pointer;">✕</button>
          </div>

          <p style="font-size: 0.82rem; color: #94a3b8; margin: 0 0 12px 0;">
            તમારા પસંદ કરેલા આઈડિયા, સાચા વ્યુઝ, સત્તાવાર તારીખો અને નોંધના આધારે આ પ્રોમ્પ્ટ બન્યો છે. ૧-ક્લિકમાં કોપી કરીને ChatGPT માં પેસ્ટ કરો:
          </p>

          <textarea id="modal-chatgpt-prompt-text" class="form-input font-gu" rows="12" style="width: 100%; font-size: 0.82rem; line-height: 1.6; background: #050811; color: #f1f5f9; border: 1px solid #10b981; border-radius: 8px; resize: vertical; margin-bottom: 14px;" readonly>${data.prompt}</textarea>

          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button id="btn-modal-copy-prompt" class="btn btn-success" style="flex: 1; font-weight: 800; padding: 10px;">
              <span id="modal-copy-icon">📋</span> <span id="modal-copy-label">૧-ક્લિક પ્રોમ્પ્ટ કોપી કરો</span>
            </button>
            <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" class="btn" style="background: #10a37f; color: #fff; font-weight: 800; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 6px;">
              <span>⚡</span> ChatGPT ખોલો ↗
            </a>
          </div>

        </div>
      </div>
    `;
  }

  // --- ATTACH ALL INTERACTIVE EVENTS ---
  function attachEvents() {
    // 1. Sub-Tab Switching (Preserved for legacy callers)
    container.querySelectorAll('.sub-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        if (tab) {
          activeTab = tab;
          render();
        }
      });
    });

    // Helper to activate topic and advance to Tool 2
    const proceedWithTopicIdea = async (idea) => {
      const activeProj = projectState.getActiveProject();
      const ideasList = projectState.getProjectIdeas(activeProj?.id) || [];
      const targetIdea = idea || (activeTopicIdeaId ? ideasList.find(i => i.id === activeTopicIdeaId) : null) || ideasList[0];

      if (!targetIdea) {
        showNoticeToast('કૃપા કરીને પહેલાં કોઈ વિષય ઉમેરો અથવા પસંદ કરો.', 'warning');
        return;
      }

      const topicName = (targetIdea.title || '').trim();
      activeTopicIdeaId = targetIdea.id;
      try {
        await projectState.activateTopicContext(targetIdea.id, topicName, targetIdea);
        localStorage.setItem('gyan_active_topic_id', targetIdea.id);
        localStorage.setItem('gyan_active_topic_name', topicName);
        window.prefillTopic = topicName;
      } catch (err) {
        console.warn('[proceedWithTopicIdea]:', err);
      }
      showNoticeToast(`✓ "${topicName}" વિષય સાથે આગળ વધી રહ્યા છીએ!`, 'success');
      navigateTo('slideprompts');
    };

    // Helper to open diary entry into top diary editor
    const openDiaryEntry = async (idea) => {
      if (!idea) return;
      activeDiaryEntryId = idea.id;
      activeTopicIdeaId = idea.id;
      diaryDate = formatDateISO(idea.createdAt) || getCurrentIST().dateStr;
      diaryTitle = idea.title || '';
      diaryNote = idea.description || idea.notes || idea.originalText || '';

      const topicName = (idea.title || '').trim();
      if (topicName) {
        try {
          await projectState.activateTopicContext(idea.id, topicName, idea);
          localStorage.setItem('gyan_active_topic_id', idea.id);
          localStorage.setItem('gyan_active_topic_name', topicName);
          window.prefillTopic = topicName;

          const raw = localStorage.getItem('gyan_48h_pasted_topics');
          let list = raw ? JSON.parse(raw) : [];
          if (!Array.isArray(list)) list = [];
          if (!list.some(t => t.id === idea.id || (t.title && t.title.trim().toLowerCase() === topicName.toLowerCase()))) {
            list.unshift({
              id: idea.id,
              title: topicName,
              timestamp: idea.createdAt || new Date().toISOString(),
              addedToPlanner: false,
              addedToIdea: true
            });
            localStorage.setItem('gyan_48h_pasted_topics', JSON.stringify(list));
          }
        } catch (_) {}
      }

      render();

      const diaryBox = container.querySelector('.idea-diary-box');
      if (diaryBox) {
        diaryBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        diaryBox.style.boxShadow = '0 0 25px rgba(52, 211, 153, 0.7)';
        setTimeout(() => {
          if (diaryBox) diaryBox.style.boxShadow = '0 8px 25px rgba(16,185,129,0.25)';
        }, 2200);
      }
      showNoticeToast(`✓ "${idea.title}" ડાયરીમાં ખૂલી ગયું છે!`, 'info');
    };

    // Diary Form Handlers (Save, Clear, Date change, New entry)
    const diaryForm = container.querySelector('#form-idea-diary');
    const diaryDateInput = container.querySelector('#diary-entry-date');
    const diaryTitleInput = container.querySelector('#diary-entry-title');
    const diaryNoteInput = container.querySelector('#diary-entry-note');
    const diaryClearBtn = container.querySelector('#btn-clear-diary-form');

    diaryDateInput?.addEventListener('change', (e) => {
      diaryDate = e.target.value;
      const activeProj = projectState.getActiveProject();
      const ideas = projectState.getProjectIdeas(activeProj?.id) || [];
      const match = ideas.find(i => formatDateISO(i.createdAt) === diaryDate);
      if (match) {
        openDiaryEntry(match);
      } else {
        activeDiaryEntryId = null;
        diaryTitle = '';
        diaryNote = '';
        render();
        showNoticeToast(`ℹ️ તારીખ ${formatIndianDateDisplay(diaryDate)} માટે નવી નોંધ લખો.`, 'info');
      }
    });

    container.querySelector('#btn-new-diary-entry')?.addEventListener('click', () => {
      activeDiaryEntryId = null;
      diaryTitle = '';
      diaryNote = '';
      diaryDate = getCurrentIST().dateStr;
      render();
      const titleInput = container.querySelector('#diary-entry-title');
      titleInput?.focus();
      showNoticeToast('✓ નવી ડાયરી નોંધ લખવા માટે બોક્સ તૈયાર છે.', 'info');
    });

    diaryTitleInput?.addEventListener('input', (e) => {
      diaryTitle = e.target.value;
    });
    diaryNoteInput?.addEventListener('input', (e) => {
      diaryNote = e.target.value;
    });

    diaryClearBtn?.addEventListener('click', () => {
      activeDiaryEntryId = null;
      diaryTitle = '';
      diaryNote = '';
      if (diaryTitleInput) diaryTitleInput.value = '';
      if (diaryNoteInput) diaryNoteInput.value = '';
      diaryTitleInput?.focus();
    });

    diaryForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const rawTitle = (diaryTitleInput?.value || diaryTitle || '').trim();
      const rawNote = (diaryNoteInput?.value || diaryNote || '').trim();
      const chosenDate = diaryDateInput?.value || diaryDate || getCurrentIST().dateStr;

      if (!rawTitle && !rawNote) {
        showNoticeToast('કૃપા કરીને વિષય અથવા લખાણ લખો.', 'error');
        diaryTitleInput?.focus();
        return;
      }

      const title = rawTitle || (rawNote.split('\n')[0].slice(0, 60)) || `નોંધ - ${formatIndianDateDisplay(chosenDate)}`;
      const now = new Date();
      const timeStr = now.toTimeString().slice(0, 8);
      let createdIso = now.toISOString();
      try {
        const parsed = new Date(`${chosenDate}T${timeStr}`);
        if (!isNaN(parsed.getTime())) {
          createdIso = parsed.toISOString();
        }
      } catch (_) {}

      const activeProj = projectState.getActiveProject();
      const ideas = projectState.getProjectIdeas(activeProj?.id) || [];
      const existingEntry = activeDiaryEntryId ? ideas.find(i => i.id === activeDiaryEntryId) : null;
      const entryId = existingEntry ? existingEntry.id : ('diary_' + Date.now());

      const savedEntry = {
        ...(existingEntry || {}),
        id: entryId,
        title,
        description: rawNote,
        notes: rawNote,
        originalText: rawNote,
        category: 'ડાયરી નોંધ',
        inputType: 'diary',
        createdAt: existingEntry ? existingEntry.createdAt : createdIso,
        updatedAt: now.toISOString(),
        allowDuplicate: true,
        views48h: existingEntry?.views48h || null
      };

      await projectState.saveProjectIdea(savedEntry);
      activeDiaryEntryId = entryId;
      activeTopicIdeaId = entryId;
      diaryTitle = title;
      diaryNote = rawNote;
      diaryDate = chosenDate;

      if (activeProj) {
        activeProj.topicId = entryId;
        activeProj.topic = title;
        projectState.saveProjects();
      }
      try {
        localStorage.setItem('gyan_active_topic_id', entryId);
        localStorage.setItem('gyan_active_topic_name', title);
        window.prefillTopic = title;
      } catch (_) {}

      render();
      showNoticeToast(`✓ "${title}" ડાયરીમાં સચવાઈ ગયું!`, 'success');
    });

    // Copy Idea / Diary Text Button
    container.querySelectorAll('.btn-copy-idea-text').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-id');
        const activeProj = projectState.getActiveProject();
        const ideas = projectState.getProjectIdeas(activeProj?.id) || [];
        const idea = ideas.find(i => i.id === id);
        if (idea) {
          const textToCopy = (idea.description || idea.notes || idea.originalText || idea.title || '').trim();
          if (textToCopy) {
            copyToClipboard(textToCopy, '📋 લખાણ કોપી થઈ ગયું!', e.currentTarget);
          }
        }
      });
    });

    // Open In Diary Buttons on Cards
    container.querySelectorAll('.btn-open-in-diary').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-id');
        const activeProj = projectState.getActiveProject();
        const ideas = projectState.getProjectIdeas(activeProj?.id) || [];
        const idea = ideas.find(i => i.id === id);
        if (idea) {
          openDiaryEntry(idea);
        }
      });
    });

    // Read Full Diary Modal Buttons on Cards
    container.querySelectorAll('.btn-read-full-diary').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-id');
        const activeProj = projectState.getActiveProject();
        const ideas = projectState.getProjectIdeas(activeProj?.id) || [];
        const idea = ideas.find(i => i.id === id);
        if (idea) {
          readingDiaryIdea = idea;
          render();
        }
      });
    });

    // Read Diary Modal Event Listeners
    container.querySelector('#btn-close-read-diary-modal')?.addEventListener('click', () => {
      readingDiaryIdea = null;
      render();
    });
    container.querySelector('#btn-modal-close-read')?.addEventListener('click', () => {
      readingDiaryIdea = null;
      render();
    });
    container.querySelector('#btn-modal-open-in-diary')?.addEventListener('click', () => {
      const idea = readingDiaryIdea;
      readingDiaryIdea = null;
      if (idea) openDiaryEntry(idea);
    });
    container.querySelector('#btn-modal-copy-diary')?.addEventListener('click', (e) => {
      if (readingDiaryIdea) {
        const textToCopy = (readingDiaryIdea.description || readingDiaryIdea.notes || readingDiaryIdea.originalText || readingDiaryIdea.title || '').trim();
        copyToClipboard(textToCopy, '📋 લખાણ કોપી થઈ ગયું!', e.currentTarget);
      }
    });

    // Direct Quick Add Idea Submit
    const quickAddInput = container.querySelector('#quick-add-idea-title-input');
    const quickAddBtn = container.querySelector('#btn-quick-add-idea-submit');

    const handleQuickAdd = async () => {
      const title = (quickAddInput?.value || '').trim();
      if (!title) {
        showNoticeToast('કૃપા કરીને આઈડિયાનું ટાઇટલ લખો.', 'error');
        quickAddInput?.focus();
        return;
      }

      const ist = getCurrentIST();
      const newIdea = {
        id: 'idea_' + Date.now(),
        title,
        category: 'સરકારી યોજના',
        tags: [],
        description: '',
        sourceUrl: '',
        views48h: null,
        notes: '',
        inputType: 'manual',
        capturedAt: null,
        sourcePublishedAt: null,
        createdAt: ist.iso,
        updatedAt: ist.iso
      };
      await projectState.saveProjectIdea(newIdea);
      activeTopicIdeaId = newIdea.id;
      // Automatically connect and synchronize this new topic across Tools 1 through 7
      try {
        await projectState.activateTopicContext(newIdea.id, newIdea.title, newIdea);
        localStorage.setItem('gyan_active_topic_id', newIdea.id);
        localStorage.setItem('gyan_active_topic_name', newIdea.title);
        window.prefillTopic = newIdea.title;
      } catch (_) {}

      render();
      showNoticeToast(`✓ "${newIdea.title}" આઈડિયા ઉમેરાઈ ગયો અને સક્રિય વિષય તરીકે સેટ થયો!`, 'success');
    };

    quickAddBtn?.addEventListener('click', handleQuickAdd);
    quickAddInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleQuickAdd();
      }
    });

    // Card click: open entry in diary
    container.querySelectorAll('.idea-notebook-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        const id = card.getAttribute('data-id');
        if (id) {
          const activeProj = projectState.getActiveProject();
          const ideas = projectState.getProjectIdeas(activeProj?.id) || [];
          const idea = ideas.find(i => i.id === id);
          if (idea) {
            await openDiaryEntry(idea);
          }
        }
      });
    });

    // Select button
    container.querySelectorAll('.btn-set-active-topic').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-id');
        if (id) {
          const activeProj = projectState.getActiveProject();
          const ideas = projectState.getProjectIdeas(activeProj?.id) || [];
          const idea = ideas.find(i => i.id === id);
          if (idea) {
            await openDiaryEntry(idea);
          }
        }
      });
    });

    // Proceed from active topic banner
    container.querySelector('.btn-proceed-selected-topic')?.addEventListener('click', (e) => {
      e.stopPropagation();
      proceedWithTopicIdea();
    });

    // Handle "🎬 ૨. Slides બનાવો ➔" Click on any Idea card (Connects Idea to Tool 2-7)
    container.querySelectorAll('.btn-start-production-idea').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-id');
        const activeProj = projectState.getActiveProject();
        const ideas = projectState.getProjectIdeas(activeProj?.id) || [];
        const idea = ideas.find(i => i.id === id);
        if (idea) {
          await proceedWithTopicIdea(idea);
        }
      });
    });

    // Connected Stepper Bottom Next Button
    container.querySelector('#ws-btn-bottom-next-topics')?.addEventListener('click', () => {
      proceedWithTopicIdea();
    });

    // Quick add buttons on notebook
    container.querySelector('#btn-quick-add-manual')?.addEventListener('click', () => { activeTab = 'manual'; render(); });
    container.querySelector('#btn-quick-add-paste')?.addEventListener('click', () => { activeTab = 'paste'; render(); });
    container.querySelector('#btn-quick-add-ocr')?.addEventListener('click', () => { activeTab = 'ocr'; render(); });

    // 2. Notebook Search & Filters
    const searchInput = container.querySelector('#notebook-search-input');
    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      render();
      const el = container.querySelector('#notebook-search-input');
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });

    container.querySelectorAll('.date-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        dateFilterRange = e.currentTarget.getAttribute('data-range');
        render();
      });
    });

    container.querySelector('#btn-apply-custom-date')?.addEventListener('click', () => {
      customDateStart = container.querySelector('#custom-date-start')?.value || '';
      customDateEnd = container.querySelector('#custom-date-end')?.value || '';
      render();
    });

    container.querySelector('#filter-source-select')?.addEventListener('change', (e) => {
      sourceFilter = e.target.value;
      render();
    });

    container.querySelector('#filter-category-select')?.addEventListener('change', (e) => {
      categoryFilter = e.target.value;
      render();
    });

    container.querySelector('#sort-order-select')?.addEventListener('change', (e) => {
      sortOrder = e.target.value;
      render();
    });

    container.querySelector('#check-show-archived')?.addEventListener('change', (e) => {
      showArchived = e.target.checked;
      render();
    });

    // 3. Idea Checkbox Selection
    container.querySelectorAll('.idea-select-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) {
          selectedIdeaIds.add(id);
        } else {
          selectedIdeaIds.delete(id);
        }
        render();
      });
    });

    container.querySelector('#btn-deselect-all-ideas')?.addEventListener('click', () => {
      selectedIdeaIds.clear();
      render();
    });

    // Select All Ideas Toggle
    container.querySelector('#btn-select-all-ideas')?.addEventListener('click', () => {
      if (selectedIdeaIds.size === filteredIdeas.length && filteredIdeas.length > 0) {
        selectedIdeaIds.clear();
      } else {
        filteredIdeas.forEach(i => selectedIdeaIds.add(i.id));
      }
      render();
    });

    // Top Navigation to Planner
    container.querySelector('#btn-goto-planner-from-topics')?.addEventListener('click', () => {
      safeNavigate('planner');
    });

    // Transfer selected ideas to Tool #2 Production Planner
    container.querySelector('#btn-transfer-planner-selected')?.addEventListener('click', async () => {
      const selected = allIdeas.filter(i => selectedIdeaIds.has(i.id));
      const list = (selected.length > 0 ? selected : allIdeas.slice(0, 10));
      if (list.length === 0) {
        alert('ટ્રાન્સફર કરવા માટે ઓછામાં ઓછો એક આઈડિયા હોવો જરૂરી છે.');
        return;
      }
      try {
        const btn = container.querySelector('#btn-transfer-planner-selected');
        if (btn) btn.innerHTML = '<span>⏳</span> ટ્રાન્સફર થઈ રહ્યું છે...';
        const topicsToBatch = list.map(item => ({
          topicName: item.title || item.topic || item.topicName,
          notes: item.description || '',
          sourcePeriod: 'Last 48 Hours',
          priority: 'HIGH'
        }));
        await api.batchAddCentralTopics(topicsToBatch);
        await refreshPlannerTopics();
        showNoticeToast(`🎉 સફળતાપૂર્વક ${topicsToBatch.length} વિષયો Production Planner માં મોકલાઈ ગયા!`, 'success');
        safeNavigate('planner');
      } catch (err) {
        alert('Production Planner માં ટ્રાન્સફર કરવામાં ભૂલ: ' + err.message);
      }
    });

    // Single Idea Card Add to Planner
    container.querySelectorAll('.btn-add-card-to-planner').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const activeProj = projectState.getActiveProject();
        const ideas = projectState.getProjectIdeas(activeProj.id) || [];
        const item = ideas.find(i => i.id === id);
        if (!item) return;

        try {
          btn.disabled = true;
          btn.innerText = 'ઉમેરાય છે...';
          const res = await api.addCentralTopic({
            topicName: item.title,
            notes: item.description || '',
            sourcePeriod: 'Last 48 Hours',
            priority: 'HIGH'
          });
          plannerTopicsSet.add((item.title || '').trim().toLowerCase());
          showNoticeToast(`✓ "${item.title.slice(0, 30)}..." Tool #2 Planner માં ઉમેરાયું! (ID: ${res.topic?.topicId || ''})`, 'success');
          render();
        } catch (err) {
          alert('પ્લાનરમાં ઉમેરવામાં ભૂલ: ' + err.message);
          btn.disabled = false;
        }
      });
    });
    container.querySelector('#btn-generate-selected-chatgpt')?.addEventListener('click', () => {
      const activeProj = projectState.getActiveProject();
      const ideas = projectState.getProjectIdeas(activeProj.id) || [];
      const selected = ideas.filter(i => selectedIdeaIds.has(i.id));

      if (selected.length === 0) {
        showNoticeToast('કૃપા કરીને ઓછામાં ઓછો ૧ આઈડિયા સિલેક્ટ કરો.', 'info');
        return;
      }

      const prompt = generatePromptForSelectedIdeas(selected);
      chatGptModalData = { prompt, count: selected.length };
      render();
    });

    // 4. Idea Card Operations: Edit, Duplicate, Archive, Delete
    container.querySelectorAll('.btn-edit-idea').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const activeProj = projectState.getActiveProject();
        const ideas = projectState.getProjectIdeas(activeProj.id) || [];
        editingIdea = ideas.find(i => i.id === id);
        render();
      });
    });

    container.querySelectorAll('.btn-duplicate-idea').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        await projectState.duplicateProjectIdea(id);
        render();
        showNoticeToast('✓ આઈડિયાની નકલ બની ગઈ!', 'success');
      });
    });

    container.querySelectorAll('.btn-archive-idea').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const activeProj = projectState.getActiveProject();
        const ideas = projectState.getProjectIdeas(activeProj.id) || [];
        const item = ideas.find(i => i.id === id);
        if (item) {
          await projectState.archiveProjectIdea(id, !item.isArchived);
          render();
          showNoticeToast(item.isArchived ? '✓ આઈડિયા રીસ્ટોર થયો!' : '✓ આઈડિયા આર્કાઇવ થયો!', 'info');
        }
      });
    });

    container.querySelectorAll('.btn-delete-idea').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const activeProj = projectState.getActiveProject();
        const ideas = projectState.getProjectIdeas(activeProj.id) || [];
        const item = ideas.find(i => i.id === id);
        if (!item) return;

        if (confirm(`શું તમે ખરેખર "${item.title || 'આ આઈડિયા'}" ડિલીટ કરવા માંગો છો?`)) {
          await projectState.deleteProjectIdea(id);
          selectedIdeaIds.delete(id);
          render();
          showNoticeToast('🗑️ આઈડિયા ડિલીટ કરી દેવામાં આવ્યો.', 'info');
        }
      });
    });

    // 5. Copy-Paste Tab Events
    const pasteArea = container.querySelector('#paste-raw-textarea');
    pasteArea?.addEventListener('input', (e) => {
      pasteRawText = e.target.value;
      parsedPasteData = parsePastedIdeaText(pasteRawText);

      const titleEl = container.querySelector('#paste-title-input');
      const viewsEl = container.querySelector('#paste-views-input');
      const urlEl = container.querySelector('#paste-url-input');

      if (titleEl && parsedPasteData.title) titleEl.value = parsedPasteData.title;
      if (viewsEl && parsedPasteData.detectedViews !== null) viewsEl.value = parsedPasteData.detectedViews;
      if (urlEl && parsedPasteData.detectedUrl) urlEl.value = parsedPasteData.detectedUrl;
    });

    container.querySelector('#btn-save-paste-idea')?.addEventListener('click', async () => {
      const title = (container.querySelector('#paste-title-input')?.value || parsedPasteData.title || '').trim();
      if (!title) {
        showNoticeToast('કૃપા કરીને આઈડિયાનું ટાઇટલ લખો.', 'error');
        return;
      }

      const viewsVal = container.querySelector('#paste-views-input')?.value;
      const parsedViews = viewsVal ? parseInt(viewsVal, 10) : parsedPasteData.detectedViews;
      const category = container.querySelector('#paste-category-select')?.value || 'સરકારી યોજના';
      const sourceUrl = container.querySelector('#paste-url-input')?.value || parsedPasteData.detectedUrl || '';
      const notes = container.querySelector('#paste-notes-input')?.value || '';

      const ist = getCurrentIST();
      await projectState.saveProjectIdea({
        id: 'idea_' + Date.now(),
        title,
        description: parsedPasteData.description || pasteRawText,
        originalText: pasteRawText,
        inputType: 'paste',
        category,
        views48h: isNaN(parsedViews) ? null : parsedViews,
        source: parsedPasteData.detectedSource || 'Copy-Paste',
        sourceUrl,
        notes,
        tags: parsedPasteData.tags || [],
        capturedAt: null,
        sourcePublishedAt: parsedPasteData.detectedDate || null,
        createdAt: ist.iso,
        updatedAt: ist.iso
      });

      pasteRawText = '';
      parsedPasteData = { title: '', description: '', originalText: '', detectedViews: null, detectedDate: null, detectedUrl: '', detectedSource: 'Copy-Paste', tags: [] };
      activeTab = 'notebook';
      render();
      showNoticeToast('✓ કોપી-પેસ્ટ આઈડિયા નોટબુકમાં સચવાઈ ગયો!', 'success');
    });

    // 6. Direct Manual Tab Events
    container.querySelector('#btn-save-manual-idea')?.addEventListener('click', async () => {
      const title = (container.querySelector('#manual-title-input')?.value || '').trim();
      if (!title) {
        showNoticeToast('કૃપા કરીને આઈડિયા શીર્ષક લખો.', 'error');
        return;
      }

      const category = container.querySelector('#manual-category-select')?.value || 'સરકારી યોજના';
      const tagsStr = container.querySelector('#manual-tags-input')?.value || '';
      const tags = tagsStr.split(/[,،]+/).map(t => t.trim()).filter(Boolean);
      const description = container.querySelector('#manual-desc-textarea')?.value || '';
      const refUrl = container.querySelector('#manual-url-input')?.value || '';
      const viewsVal = container.querySelector('#manual-views-input')?.value;
      const views48h = viewsVal ? parseInt(viewsVal, 10) : null;
      const notes = container.querySelector('#manual-notes-textarea')?.value || '';

      const ist = getCurrentIST();
      await projectState.saveProjectIdea({
        id: 'idea_' + Date.now(),
        title,
        category,
        tags,
        description,
        sourceUrl: refUrl,
        views48h: isNaN(views48h) ? null : views48h,
        notes,
        inputType: 'manual',
        capturedAt: null,
        sourcePublishedAt: null,
        createdAt: ist.iso,
        updatedAt: ist.iso
      });

      manualFormData = { title: '', category: 'સરકારી યોજના', tags: '', description: '', views48h: '', referenceLinks: '', notes: '' };
      activeTab = 'notebook';
      render();
      showNoticeToast('✓ નવો આઈડિયા તમારી નોટબુકમાં સચવાઈ ગયો!', 'success');
    });

    // 7. OCR Tab Events
    const dropzone = container.querySelector('#ocr-main-dropzone');
    const fileInput = container.querySelector('#ocr-file-input');
    const browseBtn = container.querySelector('#btn-browse-ocr');

    const triggerOcrPicker = () => fileInput?.click();
    browseBtn?.addEventListener('click', triggerOcrPicker);
    dropzone?.addEventListener('click', (e) => {
      if (e.target !== fileInput && !e.target.closest('#btn-browse-ocr')) triggerOcrPicker();
    });

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        processUploadedFiles(e.target.files);
        fileInput.value = '';
      }
    });

    container.querySelector('#btn-upload-new-ocr-photo')?.addEventListener('click', () => {
      uploadedScreenshots = [];
      hasAnalyzed = false;
      isAnalyzing = false;
      render();
    });

    // Save verified OCR rows to Project Idea Notebook
    container.querySelector('#btn-save-confirmed-to-notebook')?.addEventListener('click', async () => {
      const rows = studioData.topVideos || [];
      const validRows = rows.filter(r => r.title && r.title.trim());

      if (validRows.length === 0) {
        showNoticeToast('કોઈ માન્ય વિડીયો ટાઇટલ નથી.', 'error');
        return;
      }

      const ist = getCurrentIST();
      let count = 0;
      for (const row of validRows) {
        await projectState.saveProjectIdea({
          id: row.id || ('idea_' + Date.now() + '_' + count),
          title: row.title,
          views48h: row.views48h || null,
          category: 'સરકારી યોજના',
          inputType: 'ocr',
          cropSnippet: row.cropSnippet || '',
          bbox: row.bbox || null,
          confidenceScore: row.confidence || 75,
          isConfidenceVerified: true,
          capturedAt: studioData.capturedAt || ist.iso,
          sourcePublishedAt: row.sourcePublishedAt || studioData.sourcePublishedAt || null,
          createdAt: ist.iso,
          updatedAt: ist.iso
        });
        count++;
      }

      activeTab = 'notebook';
      render();
      showNoticeToast(`✓ ${count} OCR આઈડિયા તમારી નોટબુકમાં ઉમેરાઈ ગયા!`, 'success');
    });

    // OCR review table edits
    container.querySelectorAll('.input-row-title').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        if (studioData.topVideos[idx]) {
          studioData.topVideos[idx].title = e.target.value;
          autoSave.trigger();
        }
      });
    });

    container.querySelectorAll('.input-row-views').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        if (studioData.topVideos[idx]) {
          const val = e.target.value ? parseInt(e.target.value, 10) : null;
          studioData.topVideos[idx].views48h = isNaN(val) ? null : val;
          autoSave.trigger();
        }
      });
    });

    container.querySelectorAll('.btn-toggle-verify').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        if (studioData.topVideos[idx]) {
          studioData.topVideos[idx].isConfidenceVerified = !studioData.topVideos[idx].isConfidenceVerified;
          render();
          autoSave.trigger();
        }
      });
    });

    container.querySelectorAll('.btn-remove-review-row').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        if (studioData.topVideos[idx]) {
          studioData.topVideos.splice(idx, 1);
          render();
          autoSave.trigger();
        }
      });
    });

    container.querySelector('#btn-generate-ocr-prompt')?.addEventListener('click', () => {
      const valid = studioData.topVideos.filter(v => v.title);
      if (valid.length === 0) return;
      const prompt = generatePromptForSelectedIdeas(valid);
      chatGptModalData = { prompt, count: valid.length };
      render();
    });

    // Box select mode toggle & Invert toggle
    container.querySelector('#btn-toggle-box-select')?.addEventListener('click', () => {
      isBoxSelectMode = !isBoxSelectMode;
      render();
    });

    container.querySelector('#btn-toggle-invert')?.addEventListener('click', () => {
      invertForOcr = !invertForOcr;
      render();
    });

    // Zoom & Rotate in OCR View
    container.querySelector('#btn-zoom-in')?.addEventListener('click', () => {
      imageAdjustments.zoom = Math.min(2.5, Number((imageAdjustments.zoom + 0.2).toFixed(1)));
      const img = container.querySelector('#main-screenshot-img');
      const text = container.querySelector('#zoom-level-text');
      if (img) img.style.transform = `scale(${imageAdjustments.zoom}) rotate(${imageAdjustments.rotation}deg)`;
      if (text) text.textContent = `${Math.round(imageAdjustments.zoom * 100)}%`;
    });

    container.querySelector('#btn-zoom-out')?.addEventListener('click', () => {
      imageAdjustments.zoom = Math.max(0.6, Number((imageAdjustments.zoom - 0.2).toFixed(1)));
      const img = container.querySelector('#main-screenshot-img');
      const text = container.querySelector('#zoom-level-text');
      if (img) img.style.transform = `scale(${imageAdjustments.zoom}) rotate(${imageAdjustments.rotation}deg)`;
      if (text) text.textContent = `${Math.round(imageAdjustments.zoom * 100)}%`;
    });

    container.querySelector('#btn-rotate-90')?.addEventListener('click', () => {
      imageAdjustments.rotation = (imageAdjustments.rotation + 90) % 360;
      const img = container.querySelector('#main-screenshot-img');
      if (img) img.style.transform = `scale(${imageAdjustments.zoom}) rotate(${imageAdjustments.rotation}deg)`;
    });

    container.querySelector('#btn-apply-and-rescan')?.addEventListener('click', () => {
      startAnalysisProcess();
    });

    // Locate Box on Photo
    container.querySelectorAll('.btn-locate-in-photo').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.getAttribute('data-idx'), 10);
        activeHighlightedIdx = idx;
        updateBoxesOverlay();
        const boxes = container.querySelectorAll('.screenshot-detected-box');
        if (boxes && boxes[idx]) {
          boxes[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });

    // Setup OCR Canvas Overlays if in OCR tab with photo
    if (activeTab === 'ocr' && uploadedScreenshots.length > 0) {
      updateBoxesOverlay();
      if (isBoxSelectMode) {
        setupSelectionCanvas();
      }
    }

    // 8. Edit Idea Modal Events
    container.querySelector('#btn-close-edit-modal')?.addEventListener('click', () => { editingIdea = null; render(); });
    container.querySelector('#btn-cancel-edit-modal')?.addEventListener('click', () => { editingIdea = null; render(); });

    container.querySelector('#btn-save-edit-modal')?.addEventListener('click', async () => {
      if (!editingIdea) return;
      const title = (container.querySelector('#edit-modal-title')?.value || '').trim();
      if (!title) {
        showNoticeToast('ટાઇટલ ખાલી ન હોઈ શકે.', 'error');
        return;
      }

      const chosenDate = container.querySelector('#edit-modal-date')?.value;
      let updatedCreatedAt = editingIdea.createdAt;
      if (chosenDate) {
        try {
          const timePart = editingIdea.createdAt ? new Date(editingIdea.createdAt).toTimeString().slice(0, 8) : new Date().toTimeString().slice(0, 8);
          const parsed = new Date(`${chosenDate}T${timePart}`);
          if (!isNaN(parsed.getTime())) {
            updatedCreatedAt = parsed.toISOString();
          }
        } catch (_) {}
      }

      const category = container.querySelector('#edit-modal-category')?.value || 'સરકારી યોજના';
      const viewsVal = container.querySelector('#edit-modal-views')?.value;
      const views48h = viewsVal ? parseInt(viewsVal, 10) : null;
      const description = container.querySelector('#edit-modal-desc')?.value || '';
      const notes = container.querySelector('#edit-modal-notes')?.value || '';

      await projectState.saveProjectIdea({
        ...editingIdea,
        title,
        category,
        views48h: isNaN(views48h) ? null : views48h,
        description,
        notes: notes || description,
        originalText: description || editingIdea.originalText,
        createdAt: updatedCreatedAt,
        updatedAt: new Date().toISOString()
      });

      editingIdea = null;
      render();
      showNoticeToast('✓ આઈડિયામાં ફેરફાર સેવ થઈ ગયો!', 'success');
    });

    // 9. ChatGPT Modal Events
    container.querySelector('#btn-close-chatgpt-modal')?.addEventListener('click', () => { chatGptModalData = null; render(); });
    container.querySelector('#btn-modal-copy-prompt')?.addEventListener('click', (e) => {
      const text = container.querySelector('#modal-chatgpt-prompt-text')?.value || '';
      copyToClipboard(text, '📋 ChatGPT પ્રોમ્પ્ટ સફળતાપૂર્વક કોપી થયો!', e.currentTarget);
      const label = container.querySelector('#modal-copy-label');
      const icon = container.querySelector('#modal-copy-icon');
      if (label) label.textContent = '✓ કોપી થઈ ગયો!';
      if (icon) icon.textContent = '✅';
      setTimeout(() => {
        if (label) label.textContent = '૧-ક્લિક પ્રોમ્પ્ટ કોપી કરો';
        if (icon) icon.textContent = '📋';
      }, 2500);
    });

    // 10. Global & Banner Events
    container.querySelector('#btn-back-to-projects-banner')?.addEventListener('click', () => navigateTo('projects'));
    container.querySelector('#btn-goto-step2-banner')?.addEventListener('click', () => {
      proceedWithTopicIdea();
    });

    container.querySelector('#btn-firebase-signin')?.addEventListener('click', async () => {
      try {
        await firebaseService.signInWithGoogle();
        render();
      } catch (err) {
        alert('Google Sign-In Error: ' + (err.message || err));
      }
    });

    container.querySelector('#btn-firebase-signout')?.addEventListener('click', async () => {
      await firebaseService.signOutUser();
      render();
    });

    // Global Clipboard Paste Handler (Ctrl + V)
    container.onpaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) imageFiles.push(file);
        }
      }

      if (imageFiles.length > 0) {
        activeTab = 'ocr';
        processUploadedFiles(imageFiles);
      }
    };
  }

  // --- OCR FILE UPLOAD AND PROCESSING ENGINE ---
  function processUploadedFiles(files) {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(f => 
      (f.type && f.type.startsWith('image/')) || 
      /\.(jpe?g|png|webp|gif|bmp|heic|svg)$/i.test(f.name || '')
    );
    if (validFiles.length === 0) {
      alert('કૃપા કરીને સાચી ફોટો ફાઇલ પસંદ કરો (PNG, JPG, WebP વગેરે).');
      return;
    }

    let loaded = 0;
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawData = e.target.result;
        const img = new Image();
        img.onload = () => {
          uploadedScreenshots.push({
            name: file.name,
            size: (file.size / 1024).toFixed(1) + ' KB',
            base64: rawData,
            rawImage: img
          });
          loaded++;
          if (loaded === validFiles.length) {
            startAnalysisProcess();
          }
        };
        img.src = rawData;
      };
      reader.readAsDataURL(file);
    });
  }

  async function startAnalysisProcess() {
    isAnalyzing = true;
    render();

    const istNow = getCurrentIST();
    studioData.capturedAt = istNow.iso;

    try {
      let payloadImg = uploadedScreenshots[0]?.base64;
      if (uploadedScreenshots[0]?.rawImage) {
        const adjustedCanvas = processImageAdjustments(uploadedScreenshots[0].rawImage, {
          rotation: imageAdjustments.rotation,
          brightness: imageAdjustments.brightness,
          contrast: imageAdjustments.contrast,
          sharpen: imageAdjustments.sharpen,
          invertForOcr: invertForOcr
        });
        payloadImg = adjustedCanvas.toDataURL('image/jpeg', 0.92);
      }

      let res = null;
      try {
        res = await api.analyze48hScreenshot([payloadImg], 'all');
      } catch (apiErr) {
        console.warn('[Server Screenshot Analysis Notice]:', apiErr.message);
      }

      let detectedVideos = [];
      let views48h = null;
      let detectedDate = null;

      if (res && res.topVideos && Array.isArray(res.topVideos) && res.topVideos.length > 0) {
        detectedVideos = res.topVideos;
        views48h = res.detectedViews48h || null;
        if (res.detectedDate) detectedDate = res.detectedDate;
      }

      studioData.sourcePublishedAt = detectedDate;
      studioData.views48h = views48h;

      if (detectedVideos && detectedVideos.length > 0) {
        studioData.topVideos = detectedVideos.map((v, i) => {
          const title = typeof v === 'string' ? v : (v.title || '');
          const vViews = typeof v === 'object' && v.views48h ? Number(v.views48h) : null;
          const conf = (v && typeof v.confidence === 'number') ? v.confidence : 75;
          const isVerified = Boolean(v && v.isConfidenceVerified);

          return {
            id: 'idea_' + Date.now() + '_' + i,
            title,
            views48h: vViews,
            views60m: null,
            confidence: conf,
            isConfidenceVerified: isVerified,
            cropSnippet: v.cropSnippet || '',
            bbox: v.bbox || null,
            capturedAt: istNow.iso,
            sourcePublishedAt: v.sourcePublishedAt || detectedDate || null,
            createdAt: istNow.iso,
            updatedAt: istNow.iso
          };
        }).filter(v => v.title);
      } else {
        studioData.topVideos = [];
      }
    } catch (err) {
      console.warn('[Topics Analysis Error Handled]:', err.message);
      studioData.topVideos = [];
    }

    isAnalyzing = false;
    hasAnalyzed = true;
    render();
  }

  // Visual Bounding Boxes Overlay on Image Viewport
  function updateBoxesOverlay() {
    const overlay = container.querySelector('#screenshot-boxes-overlay');
    const img = container.querySelector('#main-screenshot-img');
    if (!overlay || !img) return;

    overlay.innerHTML = '';
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) {
      img.onload = () => updateBoxesOverlay();
      return;
    }

    const dw = img.clientWidth || img.offsetWidth;
    const dh = img.clientHeight || img.offsetHeight;
    const rx = dw / nw;
    const ry = dh / nh;

    (studioData.topVideos || []).forEach((vid, idx) => {
      if (!vid.bbox) return;
      const { x0, y0, x1, y1 } = vid.bbox;
      const bx = Math.round(x0 * rx);
      const by = Math.round(y0 * ry);
      const bw = Math.max(24, Math.round((x1 - x0) * rx));
      const bh = Math.max(18, Math.round((y1 - y0) * ry));

      const isHl = (activeHighlightedIdx === idx);
      const boxEl = document.createElement('div');
      boxEl.className = 'screenshot-detected-box';
      boxEl.style.cssText = `
        position: absolute;
        left: ${bx}px;
        top: ${by}px;
        width: ${bw}px;
        height: ${bh}px;
        border: 2px solid ${isHl ? '#f59e0b' : '#38bdf8'};
        background: ${isHl ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.18)'};
        border-radius: 4px;
        pointer-events: auto;
        cursor: pointer;
        box-shadow: ${isHl ? '0 0 16px rgba(245, 158, 11, 0.9)' : '0 0 6px rgba(56, 189, 248, 0.4)'};
        transition: all 0.15s ease;
        z-index: ${isHl ? 6 : 2};
      `;

      boxEl.innerHTML = `
        <span style="position: absolute; top: -18px; left: 0; background: ${isHl ? '#f59e0b' : '#0284c7'}; color: #fff; font-size: 10px; font-weight: 800; padding: 1px 5px; border-radius: 3px; white-space: nowrap; pointer-events: none;">
          #${idx + 1}
        </span>
      `;

      boxEl.title = `રો #${idx + 1}: ${vid.title || 'વિડીયો'}`;
      boxEl.addEventListener('click', (e) => {
        e.stopPropagation();
        activeHighlightedIdx = idx;
        updateBoxesOverlay();
        const row = container.querySelector(`.ocr-review-row[data-idx="${idx}"]`);
        if (row) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          row.querySelector('.input-row-title')?.focus();
        }
      });

      overlay.appendChild(boxEl);
    });
  }

  // Interactive Drag-to-Crop Canvas Setup
  function setupSelectionCanvas() {
    const canvas = container.querySelector('#screenshot-selection-canvas');
    const img = container.querySelector('#main-screenshot-img');
    if (!canvas || !img) return;

    const dw = img.clientWidth || img.offsetWidth;
    const dh = img.clientHeight || img.offsetHeight;
    if (!dw || !dh) {
      img.onload = () => setupSelectionCanvas();
      return;
    }
    canvas.width = dw;
    canvas.height = dh;

    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let startX = 0, startY = 0;
    let currX = 0, currY = 0;

    canvas.onmousedown = (e) => {
      const rect = canvas.getBoundingClientRect();
      startX = e.clientX - rect.left;
      startY = e.clientY - rect.top;
      isDrawing = true;
    };

    canvas.onmousemove = (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      currX = e.clientX - rect.left;
      currY = e.clientY - rect.top;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 3]);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
      const rx = Math.min(startX, currX);
      const ry = Math.min(startY, currY);
      const rw = Math.abs(currX - startX);
      const rh = Math.abs(currY - startY);
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeRect(rx, ry, rw, rh);
    };

    canvas.onmouseup = async (e) => {
      if (!isDrawing) return;
      isDrawing = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const rx = Math.min(startX, currX);
      const ry = Math.min(startY, currY);
      const rw = Math.abs(currX - startX);
      const rh = Math.abs(currY - startY);

      if (rw < 15 || rh < 15) return;

      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      const scaleX = nw / canvas.width;
      const scaleY = nh / canvas.height;

      const natCrop = {
        x: Math.round(rx * scaleX),
        y: Math.round(ry * scaleY),
        width: Math.round(rw * scaleX),
        height: Math.round(rh * scaleY)
      };

      const croppedCanvas = processImageAdjustments(uploadedScreenshots[0]?.rawImage || img, {
        cropRect: natCrop,
        rotation: 0,
        brightness: 20,
        contrast: 35,
        sharpen: true,
        invertForOcr: true
      });

      const croppedBase64 = croppedCanvas.toDataURL('image/jpeg', 0.95);
      showNoticeToast('⚡ સિલેક્ટ કરેલ બોક્સ સ્કેન થઈ રહ્યું છે...', 'info');

      try {
        const ocrRes = await api.analyze48hScreenshot([croppedBase64], 'all');
        let foundTitle = '';
        let foundViews = null;

        if (ocrRes && ocrRes.topVideos && ocrRes.topVideos.length > 0) {
          foundTitle = ocrRes.topVideos[0].title || '';
          foundViews = ocrRes.topVideos[0].views48h || null;
        }

        if (!foundTitle && ocrRes && ocrRes.rawText) {
          const lines = ocrRes.rawText.split('\n').map(s => s.trim()).filter(Boolean);
          foundTitle = lines.find(l => l.length > 3) || '';
        }

        const ist = getCurrentIST();
        const newIdx = studioData.topVideos.length;
        studioData.topVideos.push({
          id: 'idea_' + Date.now(),
          title: foundTitle || 'પસંદ કરેલ વિડીયો ટાઇટલ',
          views48h: foundViews,
          confidence: foundTitle ? 95 : 65,
          isConfidenceVerified: true,
          cropSnippet: croppedBase64,
          bbox: { x0: natCrop.x, y0: natCrop.y, x1: natCrop.x + natCrop.width, y1: natCrop.y + natCrop.height },
          capturedAt: ist.iso,
          sourcePublishedAt: null,
          createdAt: ist.iso,
          updatedAt: ist.iso
        });

        activeHighlightedIdx = newIdx;
        isBoxSelectMode = false;
        render();
        autoSave.trigger();
        showNoticeToast(`🎯 રો #${newIdx + 1} સફળતાપૂર્વક સ્કેન થયો!`, 'success');
      } catch (cropErr) {
        console.warn('[Crop OCR Notice]:', cropErr.message);
      }
    };
  }

  // Initial render
  render();
}
