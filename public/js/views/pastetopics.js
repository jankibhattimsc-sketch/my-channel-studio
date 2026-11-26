/**
 * Tool 2: Paste Topics (મારા પેસ્ટ કરેલા વિષયો)
 * Gyan Yatra AI Studio — Production Stage 2 (Directly after 48-Hour Topic Research)
 * 
 * Features:
 * 1. Dedicated custom topic input with date & time picker
 * 2. Multi-line bulk paste from ChatGPT or notes
 * 3. Topic list management with timestamps, edit modal, delete, and duplicate prevention
 * 4. 1-Click transfer to Tool 1 (Idea) and Production Planner
 * 5. Direct 1-Click Workspace launcher for video production
 */

import { api } from '../api.js';
import { copyToClipboard, showNoticeToast } from '../utils/clipboard.js';
import { projectState } from '../utils/projectState.js';
import { 
  getCurrentIST, 
  formatIndianDateDisplay,
  formatIndianTimeDisplay,
  formatIndianDateTimeDisplay 
} from '../utils/dateTimeIntelligence.js';

export async function renderPasteTopics(container, navigateTo) {
  const PASTED_STORAGE_KEY = 'gyan_48h_pasted_topics';
  let pastedTopics = [];
  try {
    const raw = localStorage.getItem(PASTED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) pastedTopics = parsed;
    }
  } catch (e) {
    console.warn('[renderPasteTopics] Storage parse notice:', e);
  }

  // Pre-fetch Central Planner topics to show status badge
  let addedToPlannerTitles = new Set();
  try {
    const res = await api.getCentralTopics();
    if (res && Array.isArray(res.topics)) {
      res.topics.forEach(t => {
        if (t.topicName) addedToPlannerTitles.add(t.topicName.trim().toLowerCase());
      });
    }
  } catch (_) { }

  let editingTopicId = null;

  // Format timestamp for display (e.g. 18 Nov 2026 • 09:37 am (બુધવાર))
  function formatTopicDisplayDateTime(isoStr) {
    if (!isoStr) return 'સમય ઉપલબ્ધ નથી';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'સમય ઉપલબ્ધ નથી';
      const datePart = formatIndianDateDisplay(d);
      const timePart = formatIndianTimeDisplay(d);
      const days = ['રવિવાર', 'સોમવાર', 'મંગળવાર', 'બુધવાર', 'ગુરુવાર', 'શુક્રવાર', 'શનિવાર'];
      const dayName = days[d.getDay()] || '';
      return `${datePart} • ${timePart} (${dayName})`;
    } catch (_) {
      return 'સમય ઉપલબ્ધ નથી';
    }
  }

  // Current local datetime string for input element
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const defaultLocalDatetime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const activeStoredName = (typeof localStorage !== 'undefined' ? (localStorage.getItem('gyan_active_topic_name') || '') : '').trim();

  function renderView() {
    container.innerHTML = `
      <div class="view-pastetopics" style="background: #F8FAFC; min-height: 100vh; padding: 24px; font-family: 'Noto Sans Gujarati', sans-serif;">
        <div style="max-width: 1200px; margin: 0 auto;">

          <!-- Top Navigation Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 16px 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.8rem; background: #EFF6FF; padding: 8px 12px; border-radius: 10px; border: 1.5px solid #BFDBFE;">📝</span>
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <h1 style="font-size: 1.35rem; font-weight: 900; color: #102A56; margin: 0;">
                    ૨. Paste Topics (મારા વિષયો પેસ્ટ કરો)
                  </h1>
                  <span style="background: #10B981; color: white; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;">
                    Tool 2
                  </span>
                </div>
                <p style="font-size: 0.82rem; color: #64748B; margin: 3px 0 0 0;">
                  ChatGPT માંથી તૈયાર થયેલા વિષયો અથવા તમારા આઇડિયા અહીં પેસ્ટ કરો • સમય/તારીખ સાથે કાયમી સચવાશે
                </p>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <a href="#home" class="btn" style="background: #F1F5F9; color: #334155; font-size: 0.82rem; font-weight: 800; padding: 8px 14px; border-radius: 8px; border: 1px solid #CBD5E1; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                <span>📊</span> ૧. 48h Studio
              </a>
              <a href="#topics" class="btn" style="background: linear-gradient(135deg, #10B981, #059669); color: white; font-size: 0.82rem; font-weight: 800; padding: 8px 16px; border-radius: 8px; border: none; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">
                <span>💡</span> Idea ટૂલ ખોલો →
              </a>
            </div>
          </div>

          <!-- Active Topic Context Banner -->
          ${activeStoredName ? `
            <div style="background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); border: 2px solid #3B82F6; border-radius: 12px; padding: 12px 18px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.2rem;">🎯</span>
                <div>
                  <span style="font-size: 0.72rem; font-weight: 800; color: #1D4ED8; text-transform: uppercase;">સક્રિય વિષય (ACTIVE TOPIC):</span>
                  <div style="font-size: 0.95rem; font-weight: 800; color: #1E3A8A;">${activeStoredName}</div>
                </div>
              </div>
              <a href="#slideprompts" class="btn" style="background: #2563EB; color: white; font-weight: 800; font-size: 0.78rem; padding: 6px 14px; border-radius: 6px; text-decoration: none;">
                આ વિષય સાથે આગળ વધો (૪. Slide Prompts →)
              </a>
            </div>
          ` : ''}

          <!-- 1. Custom Pasted Topic Input Box -->
          <div style="background: #FFFFFF; border: 1.5px solid #CBD5E1; border-radius: 12px; padding: 20px 22px; margin-bottom: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.03);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.3rem;">✍️</span>
                <div>
                  <h3 style="font-size: 1.1rem; font-weight: 800; color: #102A56; margin: 0;">
                    મારા વિષયો પેસ્ટ કરો (Paste Custom Topics)
                  </h3>
                  <p style="font-size: 0.78rem; color: #64748B; margin: 2px 0 0 0;">
                    ChatGPT માંથી તૈયાર થયેલા વિષયો અથવા તમારા આઇડિયા અહીં પેસ્ટ કરો • સમય/તારીખ સાથે સચવાશે અને એડિટ/ડિલીટ કરી શકાશે
                  </p>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <div style="display: inline-flex; align-items: center; gap: 6px; background: #FFFFFF; border: 1px solid #CBD5E1; padding: 5px 12px; border-radius: 6px;">
                  <span style="font-size: 0.78rem; font-weight: 700; color: #475569;">🕒 સમય:</span>
                  <input type="datetime-local" id="pastetopics-datetime" value="${defaultLocalDatetime}" style="font-size: 0.8rem; border: none; padding: 2px 4px; background: transparent; outline: none; font-weight: 700; color: #1E293B;" />
                </div>
                <button type="button" id="btn-pastetopics-clipboard" style="background: #EFF6FF; color: #1D4ED8; border: 1.5px solid #BFDBFE; font-size: 0.8rem; font-weight: 800; padding: 7px 14px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px;">
                  <span>📋</span> પેસ્ટ કરો
                </button>
                <button type="button" id="btn-pastetopics-add" style="background: #102A56; color: #FFFFFF; border: none; font-size: 0.82rem; font-weight: 800; padding: 8px 18px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 6px rgba(16,42,86,0.25);">
                  <span>➕</span> વિષય ઉમેરો
                </button>
              </div>
            </div>

            <textarea
              id="pastetopics-textarea"
              rows="5"
              placeholder="અહીં તમારા વિષયો પેસ્ટ કરો (એક લાઈનમાં એક ટોપિક અથવા ChatGPT નું આખું લિસ્ટ 1 થી 10)...&#10;દા.ત.:&#10;1. આંગણવાડી સુપરવાઈઝર નવી ભરતી ૨૦૨૬ સત્તાવાર નોટિફિકેશન&#10;2. ગુજરાત કર્મચારી ૫૦% DA વધારો મંજૂર પરિપત્ર"
              style="width: 100%; border: 1.5px solid #CBD5E1; border-radius: 8px; padding: 12px 14px; font-size: 0.95rem; line-height: 1.6; font-family: 'Noto Sans Gujarati', sans-serif; resize: vertical; outline: none; background: #FFFFFF; box-sizing: border-box;"
            ></textarea>
          </div>

          <!-- Next Step Callout: Tool 3 My Topics -->
          <div style="background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%); border: 2px solid #93C5FD; border-radius: 12px; padding: 18px 22px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; box-shadow: 0 4px 14px rgba(37,99,235,0.08);">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="background: #FFFFFF; border: 1.5px solid #93C5FD; border-radius: 12px; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
                📋
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="background: #2563EB; color: white; font-size: 0.72rem; font-weight: 800; padding: 2px 8px; border-radius: 4px;">
                    Tool 3
                  </span>
                  <h4 style="font-size: 1.12rem; font-weight: 900; color: #1E40AF; margin: 0;">
                    આગળનું પગલું: ૩. My Topics (મારા સેવ કરેલા વિષયો)
                  </h4>
                </div>
                <p style="font-size: 0.82rem; color: #1D4ED8; margin: 3px 0 0 0; font-weight: 600;">
                  પેસ્ટ કરેલા બધા વિષયો જોવા, એડિટ/ડિલીટ કરવા અથવા Idea માં મોકલવા માટે અલગ Tool 3 ખોલો (${pastedTopics.length} વિષયો)
                </p>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <a href="#mytopics" class="btn" style="background: #2563EB; color: #FFFFFF; font-size: 0.9rem; font-weight: 900; padding: 10px 22px; border-radius: 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(37,99,235,0.35);">
                <span>📋</span> ૩. My Topics ખોલો →
              </a>
            </div>
          </div>

          <!-- Bottom Stepper / Quick Navigation -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 12px; padding: 14px 20px;">
            <a href="#home" style="color: #64748B; font-weight: 800; font-size: 0.85rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              <span>←</span> પાછલું પગલું: ૧. 48h YouTube AI Studio
            </a>
            <a href="#mytopics" style="color: #2563EB; font-weight: 800; font-size: 0.88rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              <span>📋</span> આગળનું પગલું: ૩. My Topics (મારા વિષયો) →
            </a>
          </div>

        </div>

      </div>
    `;

    attachListeners();
  }

  function attachListeners() {
    const pasteTopicTa = container.querySelector('#pastetopics-textarea');
    const pasteDatetimeInput = container.querySelector('#pastetopics-datetime');

    const handleAddPastedTopics = async () => {
      const raw = pasteTopicTa?.value || '';
      if (!raw.trim()) {
        showNoticeToast('કૃપા કરીને પેલા વિષયો પેસ્ટ કરો!', 'warning');
        return;
      }

      const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      let count = 0;
      const pickedTime = pasteDatetimeInput?.value ? new Date(pasteDatetimeInput.value).toISOString() : new Date().toISOString();

      let activeProj = projectState.getActiveProject();
      if (!activeProj && Array.isArray(projectState.projects) && projectState.projects.length > 0) {
        activeProj = projectState.projects[0];
      }

      for (const line of lines) {
        const cleanTitle = line.replace(/^\d+[\.\-\)]\s*/, '').trim();
        if (cleanTitle.length > 3) {
          const newTopicObj = {
            id: 'pasted_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            title: cleanTitle,
            timestamp: pickedTime,
            addedToPlanner: false,
            bucket: count === 0 ? 'selected' : 'folder'
          };
          pastedTopics.unshift(newTopicObj);
          count++;

          // Auto-sync into Tool 1 (Idea) as well
          if (activeProj && typeof projectState.saveProjectIdea === 'function') {
            await projectState.saveProjectIdea({
              id: newTopicObj.id,
              title: cleanTitle,
              category: 'સરકારી યોજના',
              inputType: 'paste',
              source: 'Tool 2 Paste Topics',
              createdAt: pickedTime,
              updatedAt: pickedTime
            }, activeProj.id);
          }
        }
      }

      localStorage.setItem(PASTED_STORAGE_KEY, JSON.stringify(pastedTopics));
      if (count > 0 && pastedTopics[0]) {
        try {
          const firstClean = pastedTopics[0].title;
          if (projectState && typeof projectState.activateTopicContext === 'function') {
            await projectState.activateTopicContext(pastedTopics[0].id, firstClean);
          }
          localStorage.setItem('gyan_active_topic_id', pastedTopics[0].id);
          localStorage.setItem('gyan_active_topic_name', firstClean);
          window.prefillTopic = firstClean;
        } catch (_) {}
      }
      if (pasteTopicTa) pasteTopicTa.value = '';
      showNoticeToast(`🎉 ${count} વિષયો સફળતાપૂર્વક ઉમેરાયા! હવે ૩. My Topics ખોલી રહ્યા છીએ...`, 'success');
      setTimeout(() => {
        if (typeof navigateTo === 'function') navigateTo('mytopics');
        else window.location.hash = '#mytopics';
      }, 600);
    };

    container.querySelector('#btn-pastetopics-add')?.addEventListener('click', handleAddPastedTopics);

    // Clipboard paste handler
    container.querySelector('#btn-pastetopics-clipboard')?.addEventListener('click', async () => {
      try {
        let text = '';
        if (navigator.clipboard && navigator.clipboard.readText) {
          text = await navigator.clipboard.readText().catch(() => '');
        }
        if (!text) {
          text = prompt('ChatGPT માંથી કોપી કરેલા વિષયો અહીં પેસ્ટ કરો (Ctrl+V):') || '';
        }
        if (text && text.trim() && pasteTopicTa) {
          pasteTopicTa.value = text.trim();
          showNoticeToast('📋 લખાણ પેસ્ટ થઈ ગયું! હવે "➕ વિષય ઉમેરો" દબાવો.', 'info');
        }
      } catch (_) {
        const text = prompt('ChatGPT માંથી કોપી કરેલા વિષયો અહીં પેસ્ટ કરો (Ctrl+V):');
        if (text && text.trim() && pasteTopicTa) {
          pasteTopicTa.value = text.trim();
        }
      }
    });
  }

  renderView();
}
