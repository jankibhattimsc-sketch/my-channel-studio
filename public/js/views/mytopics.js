/**
 * Tool 3: Clean Topic Organizer (Selected / Folder / Bin)
 * Gyan Yatra AI Studio — Zero-Clutter Topic Management
 *
 * 3 Clean Buckets:
 * 1. 'selected' -> ⭐ પસંદ કરેલા વિષયો (Shown FIRST & Clean)
 * 2. 'folder'   -> 📁 ફોલ્ડર અંદર (All other topics tucked neatly inside)
 * 3. 'bin'      -> 🗑️ બિન (Unwanted topics moved to Bin with Restore / Empty Bin)
 */

import { copyToClipboard, showNoticeToast } from '../utils/clipboard.js';
import { projectState } from '../utils/projectState.js';
import {
  formatIndianDateDisplay,
  formatIndianTimeDisplay
} from '../utils/dateTimeIntelligence.js';

export async function renderMyTopics(container, navigateTo) {
  const PASTED_STORAGE_KEY = 'gyan_48h_pasted_topics';
  let pastedTopics = [];

  try {
    const raw = localStorage.getItem(PASTED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) pastedTopics = parsed;
    }
  } catch (e) {
    console.warn('[renderMyTopics] Storage parse notice:', e);
  }

  // Merge ideas from active project without duplicating
  try {
    const activeP = (projectState && typeof projectState.getActiveProject === 'function')
      ? projectState.getActiveProject()
      : null;
    const allIdeas = (activeP && Array.isArray(activeP.ideas)) ? activeP.ideas : [];
    allIdeas.forEach(idea => {
      const ideaTitle = (idea.title || '').trim();
      if (ideaTitle && !pastedTopics.some(t => t.id === idea.id || (t.title && t.title.trim().toLowerCase() === ideaTitle.toLowerCase()))) {
        pastedTopics.push({
          id: idea.id,
          title: ideaTitle,
          timestamp: idea.createdAt || new Date().toISOString(),
          bucket: 'folder'
        });
      }
    });
  } catch (_) {}

  // One-time clean migration: if topics don't have a bucket yet, keep newest 3 in 'selected' and tuck the rest into 'folder'
  let migrated = false;
  pastedTopics.forEach((t, idx) => {
    if (!t.bucket) {
      t.bucket = idx < 3 ? 'selected' : 'folder';
      migrated = true;
    }
  });
  if (migrated) {
    try { localStorage.setItem(PASTED_STORAGE_KEY, JSON.stringify(pastedTopics)); } catch (_) {}
  }

  let activeTab = 'selected'; // 'selected' | 'folder' | 'bin'
  let searchQuery = '';

  function persistTopics() {
    try {
      localStorage.setItem(PASTED_STORAGE_KEY, JSON.stringify(pastedTopics));
    } catch (_) {}
  }

  function formatDateTime(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '';
      return `${formatIndianDateDisplay(d)} • ${formatIndianTimeDisplay(d)}`;
    } catch (_) {
      return '';
    }
  }

  async function startWorkOnTopic(t) {
    const cleanTitle = (t.title || '').replace(/^\d+[\.\-\)]\s*/, '').trim();
    try {
      if (projectState && typeof projectState.activateTopicContext === 'function') {
        await projectState.activateTopicContext(t.id, cleanTitle);
      }
      localStorage.setItem('gyan_active_topic_id', t.id);
      localStorage.setItem('gyan_active_topic_name', cleanTitle);
      window.prefillTopic = cleanTitle;
    } catch (_) {}
    showNoticeToast(`🎯 "${cleanTitle.slice(0, 30)}..." પસંદ થયો!`, 'success');
    if (typeof navigateTo === 'function') navigateTo('slideprompts');
    else window.location.hash = '#slideprompts';
  }

  function renderView() {
    const selectedList = pastedTopics.filter(t => t.bucket === 'selected');
    const folderList = pastedTopics.filter(t => t.bucket === 'folder');
    const binList = pastedTopics.filter(t => t.bucket === 'bin');

    const activeTopicName = (localStorage.getItem('gyan_active_topic_name') || '').trim();

    let currentList = activeTab === 'selected'
      ? selectedList
      : (activeTab === 'folder' ? folderList : binList);

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      currentList = currentList.filter(t => (t.title || '').toLowerCase().includes(q));
    }

    container.innerHTML = `
      <div style="background: #F8FAFC; min-height: 100vh; padding: 20px; font-family: 'Noto Sans Gujarati', sans-serif; color: #0F172A;">
        <div style="max-width: 1050px; margin: 0 auto;">

          <!-- Clean Header -->
          <div style="background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 14px; padding: 16px 20px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <span style="font-size: 1.6rem; background: #EFF6FF; padding: 8px 12px; border-radius: 10px; border: 1px solid #BFDBFE;">📋</span>
              <div>
                <h1 style="font-size: 1.25rem; font-weight: 900; color: #0F172A; margin: 0;">
                  ૩. મારા વિષયો (Clean Topic Organizer)
                </h1>
                <p style="font-size: 0.8rem; color: #64748B; margin: 2px 0 0 0;">
                  પહેલાં ફક્ત પસંદ કરેલા જ દેખાય • બાકીના ફોલ્ડર અંદર • ના જોઈતા બિનમાં — ઝીરો કન્ફ્યુઝન!
                </p>
              </div>
            </div>

            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <a href="#pastetopics" style="background: #102A56; color: #fff; font-size: 0.82rem; font-weight: 800; padding: 8px 14px; border-radius: 8px; text-decoration: none;">
                ➕ નવા વિષયો પેસ્ટ કરો
              </a>
            </div>
          </div>

          <!-- Quick Add Single Topic Bar -->
          <div style="background: #FFFFFF; border: 1.5px solid #CBD5E1; border-radius: 12px; padding: 12px 14px; margin-bottom: 16px; display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
            <input id="mt-quick-input" type="text" placeholder="✍️ નવો વિષય અહીં લખો અથવા પેસ્ટ કરો..." style="flex: 1; min-width: 220px; padding: 9px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.88rem; font-weight: 700; outline: none;">
            <button id="mt-btn-quick-add" style="background: #10B981; color: #fff; border: none; padding: 9px 16px; border-radius: 8px; font-weight: 800; font-size: 0.84rem; cursor: pointer;">
              ⭐ પસંદ કરેલામાં ઉમેરો
            </button>
          </div>

          <!-- 3 Clean Bucket Tabs -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px;">
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              <button id="mt-tab-selected" style="padding: 9px 18px; border-radius: 10px; font-weight: 900; font-size: 0.86rem; cursor: pointer; border: 1.5px solid ${activeTab === 'selected' ? '#10B981' : '#CBD5E1'}; background: ${activeTab === 'selected' ? '#10B981' : '#FFFFFF'}; color: ${activeTab === 'selected' ? '#FFFFFF' : '#334155'};">
                ⭐ પસંદ કરેલા (${selectedList.length})
              </button>
              <button id="mt-tab-folder" style="padding: 9px 18px; border-radius: 10px; font-weight: 900; font-size: 0.86rem; cursor: pointer; border: 1.5px solid ${activeTab === 'folder' ? '#2563EB' : '#CBD5E1'}; background: ${activeTab === 'folder' ? '#2563EB' : '#FFFFFF'}; color: ${activeTab === 'folder' ? '#FFFFFF' : '#334155'};">
                📁 ફોલ્ડર અંદર (${folderList.length})
              </button>
              <button id="mt-tab-bin" style="padding: 9px 18px; border-radius: 10px; font-weight: 900; font-size: 0.86rem; cursor: pointer; border: 1.5px solid ${activeTab === 'bin' ? '#EF4444' : '#CBD5E1'}; background: ${activeTab === 'bin' ? '#EF4444' : '#FFFFFF'}; color: ${activeTab === 'bin' ? '#FFFFFF' : '#334155'};">
                🗑️ બિન (${binList.length})
              </button>
            </div>

            <div style="display: flex; gap: 8px; align-items: center;">
              <input id="mt-search-input" type="text" value="${searchQuery}" placeholder="🔍 શોધો..." style="padding: 7px 12px; border: 1px solid #CBD5E1; border-radius: 8px; font-size: 0.82rem; font-weight: 600; width: 170px;">
              ${activeTab === 'selected' && selectedList.length > 0 ? `
                <button id="mt-btn-tuck-all" title="પસંદ કરેલા બધા ફોલ્ડરમાં મૂકો" style="background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; padding: 7px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 800; cursor: pointer;">
                  📁 બધા ફોલ્ડરમાં મૂકો
                </button>
              ` : ''}
              ${activeTab === 'bin' && binList.length > 0 ? `
                <button id="mt-btn-empty-bin" style="background: #FEE2E2; color: #DC2626; border: 1px solid #FCA5A5; padding: 7px 12px; border-radius: 8px; font-size: 0.78rem; font-weight: 800; cursor: pointer;">
                  🧹 બિન ખાલી કરો
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Clean Cards List -->
          <div id="mt-cards-container" style="display: flex; flex-direction: column; gap: 10px;">
            ${currentList.length === 0 ? `
              <div style="background: #FFFFFF; border: 1.5px dashed #CBD5E1; border-radius: 14px; padding: 40px 20px; text-align: center; color: #64748B;">
                <div style="font-size: 2.2rem; margin-bottom: 8px;">
                  ${activeTab === 'selected' ? '⭐' : (activeTab === 'folder' ? '📁' : '🗑️')}
                </div>
                <div style="font-size: 1rem; font-weight: 800; color: #334155;">
                  ${activeTab === 'selected'
                    ? 'અત્યારે કોઈ પસંદ કરેલો વિષય નથી. ફોલ્ડરમાંથી પસંદ કરો અથવા ઉપર નવો વિષય ઉમેરો!'
                    : (activeTab === 'folder' ? 'ફોલ્ડર ખાલી છે.' : 'બિન ખાલી છે — કોઈ નકામો વિષય નથી!')}
                </div>
              </div>
            ` : currentList.map(t => {
              const cleanTitle = (t.title || '').replace(/^\d+[\.\-\)]\s*/, '').trim();
              const isActive = activeTopicName && activeTopicName === cleanTitle;
              return `
                <div class="mt-topic-card" data-id="${t.id}" style="background: #FFFFFF; border: 1.5px solid ${isActive ? '#10B981' : '#E2E8F0'}; border-radius: 12px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.02);">
                  <div style="flex: 1; min-width: 240px;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; flex-wrap: wrap;">
                      ${isActive ? '<span style="background:#ECFDF5; color:#059669; border:1px solid #A7F3D0; font-size:0.68rem; font-weight:800; padding:1px 6px; border-radius:4px;">🎯 સક્રિય</span>' : ''}
                      <span style="font-size: 0.72rem; color: #64748B; font-weight: 700;">🕒 ${formatDateTime(t.timestamp)}</span>
                    </div>
                    <div style="font-size: 0.98rem; font-weight: 800; color: #0F172A; line-height: 1.4;">
                      ${cleanTitle}
                    </div>
                  </div>

                  <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
                    ${activeTab === 'selected' ? `
                      <button class="mt-act-start" data-id="${t.id}" style="background: #10B981; color: #fff; border: none; padding: 7px 14px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; cursor: pointer;">
                        🎬 કામ શરૂ કરો →
                      </button>
                      <button class="mt-act-to-folder" data-id="${t.id}" style="background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; padding: 7px 10px; border-radius: 8px; font-size: 0.78rem; font-weight: 800; cursor: pointer;">
                        📁 ફોલ્ડરમાં
                      </button>
                      <button class="mt-act-to-bin" data-id="${t.id}" style="background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; padding: 7px 10px; border-radius: 8px; font-size: 0.78rem; font-weight: 800; cursor: pointer;">
                        🗑️ બિન
                      </button>
                    ` : ''}

                    ${activeTab === 'folder' ? `
                      <button class="mt-act-select" data-id="${t.id}" style="background: #10B981; color: #fff; border: none; padding: 7px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; cursor: pointer;">
                        ⭐ પસંદ કરો
                      </button>
                      <button class="mt-act-start" data-id="${t.id}" style="background: #2563EB; color: #fff; border: none; padding: 7px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; cursor: pointer;">
                        🎬 શરૂ કરો →
                      </button>
                      <button class="mt-act-to-bin" data-id="${t.id}" style="background: #FEF2F2; color: #DC2626; border: 1px solid #FECACA; padding: 7px 10px; border-radius: 8px; font-size: 0.78rem; font-weight: 800; cursor: pointer;">
                        🗑️ બિન
                      </button>
                    ` : ''}

                    ${activeTab === 'bin' ? `
                      <button class="mt-act-restore" data-id="${t.id}" style="background: #10B981; color: #fff; border: none; padding: 7px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 800; cursor: pointer;">
                        ♻️ પાછા લાવો
                      </button>
                      <button class="mt-act-delete-forever" data-id="${t.id}" style="background: #DC2626; color: #fff; border: none; padding: 7px 10px; border-radius: 8px; font-size: 0.78rem; font-weight: 800; cursor: pointer;">
                        ❌ કાયમ ડિલીટ
                      </button>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

        </div>
      </div>
    `;

    // Wire events
    container.querySelector('#mt-tab-selected')?.addEventListener('click', () => { activeTab = 'selected'; renderView(); });
    container.querySelector('#mt-tab-folder')?.addEventListener('click', () => { activeTab = 'folder'; renderView(); });
    container.querySelector('#mt-tab-bin')?.addEventListener('click', () => { activeTab = 'bin'; renderView(); });

    container.querySelector('#mt-search-input')?.addEventListener('input', (e) => {
      searchQuery = e.target.value || '';
      renderView();
      const inp = container.querySelector('#mt-search-input');
      if (inp) {
        inp.focus();
        inp.setSelectionRange(inp.value.length, inp.value.length);
      }
    });

    container.querySelector('#mt-btn-quick-add')?.addEventListener('click', () => {
      const inp = container.querySelector('#mt-quick-input');
      const val = (inp?.value || '').trim();
      if (!val) {
        showNoticeToast('કૃપા કરીને વિષય લખો!', 'warning');
        return;
      }
      pastedTopics.unshift({
        id: 'pasted_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        title: val,
        timestamp: new Date().toISOString(),
        bucket: 'selected'
      });
      persistTopics();
      activeTab = 'selected';
      showNoticeToast('⭐ નવો વિષય પસંદ કરેલામાં ઉમેરાયો!', 'success');
      renderView();
    });

    container.querySelector('#mt-btn-tuck-all')?.addEventListener('click', () => {
      pastedTopics.forEach(t => { if (t.bucket === 'selected') t.bucket = 'folder'; });
      persistTopics();
      showNoticeToast('📁 બધા વિષયો ફોલ્ડર અંદર મૂકાયા!', 'info');
      renderView();
    });

    container.querySelector('#mt-btn-empty-bin')?.addEventListener('click', () => {
      pastedTopics = pastedTopics.filter(t => t.bucket !== 'bin');
      persistTopics();
      showNoticeToast('🧹 બિન ખાલી થઈ ગયો!', 'info');
      renderView();
    });

    const moveTopic = (id, targetBucket, msg) => {
      const item = pastedTopics.find(t => String(t.id) === String(id));
      if (item) {
        item.bucket = targetBucket;
        persistTopics();
        if (msg) showNoticeToast(msg, 'info');
        renderView();
      }
    };

    container.querySelectorAll('.mt-act-select').forEach(btn => {
      btn.addEventListener('click', () => moveTopic(btn.getAttribute('data-id'), 'selected', '⭐ પસંદ કરેલામાં ઉમેરાયો!'));
    });

    container.querySelectorAll('.mt-act-to-folder').forEach(btn => {
      btn.addEventListener('click', () => moveTopic(btn.getAttribute('data-id'), 'folder', '📁 ફોલ્ડરમાં મૂકાયો!'));
    });

    container.querySelectorAll('.mt-act-to-bin').forEach(btn => {
      btn.addEventListener('click', () => moveTopic(btn.getAttribute('data-id'), 'bin', '🗑️ બિનમાં મોકલાયો!'));
    });

    container.querySelectorAll('.mt-act-restore').forEach(btn => {
      btn.addEventListener('click', () => moveTopic(btn.getAttribute('data-id'), 'selected', '♻️ વિષય પાછો પસંદ કરેલામાં આવ્યો!'));
    });

    container.querySelectorAll('.mt-act-delete-forever').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        pastedTopics = pastedTopics.filter(t => String(t.id) !== String(id));
        persistTopics();
        showNoticeToast('❌ વિષય કાયમ માટે ડિલીટ થયો!', 'info');
        renderView();
      });
    });

    container.querySelectorAll('.mt-act-start').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const item = pastedTopics.find(t => String(t.id) === String(id));
        if (item) startWorkOnTopic(item);
      });
    });
  }

  renderView();
}
