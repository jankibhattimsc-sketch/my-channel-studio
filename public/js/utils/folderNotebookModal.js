/**
 * Folder Notebook & Timestamped Diary Modal
 * Gyan Yatra AI Studio — Professional Creator Workstation
 * 
 * Allows creators to write and store project ideas, reminders, script edits,
 * and observations with accurate IST Date & Time stamped for each specific Folder/Project.
 */

import { getCurrentIST } from './dateTimeIntelligence.js';
import { projectState } from './projectState.js';
import { copyToClipboard, showNoticeToast } from './clipboard.js';

const STORAGE_FOLDER_NOTES_KEY = 'gyan_yatra_folder_notes_v1';

/**
 * Retrieve all notes for a specific folder
 */
export function getFolderNotes(folderId = 'f_default') {
  try {
    const raw = localStorage.getItem(STORAGE_FOLDER_NOTES_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return Array.isArray(all[folderId]) ? all[folderId] : [];
  } catch (err) {
    console.warn('[FolderNotebook] Failed to load notes:', err);
    return [];
  }
}

/**
 * Save a new note into a folder with accurate IST Date & Time
 */
export function addFolderNote(folderId = 'f_default', noteText = '', title = '') {
  if (!noteText || !noteText.trim()) return null;
  const ist = getCurrentIST();
  const notes = getFolderNotes(folderId);

  const newNote = {
    id: `fnote_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    folderId,
    title: (title || '').trim(),
    text: noteText.trim(),
    createdAtIso: ist.iso,
    displayTime: ist.display, // e.g. "02 Nov 2026, 10:46 pm IST"
    dateStr: ist.dateStr,
    timeStr: ist.timeStr,
    updatedAtIso: ist.iso
  };

  notes.unshift(newNote); // newest first

  try {
    const raw = localStorage.getItem(STORAGE_FOLDER_NOTES_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[folderId] = notes;
    localStorage.setItem(STORAGE_FOLDER_NOTES_KEY, JSON.stringify(all));

    // Also sync with active project notes if matched
    const curP = projectState.getActiveProject();
    if (curP && (curP.folderId === folderId || folderId === 'f_default')) {
      curP.folderNotes = notes;
      projectState.saveCurrentProject();
    }
  } catch (err) {
    console.warn('[FolderNotebook] Failed to persist note:', err);
  }

  return newNote;
}

/**
 * Delete a note from a folder
 */
export function deleteFolderNote(folderId, noteId) {
  try {
    const raw = localStorage.getItem(STORAGE_FOLDER_NOTES_KEY);
    const all = raw ? JSON.parse(raw) : {};
    if (Array.isArray(all[folderId])) {
      all[folderId] = all[folderId].filter(n => n.id !== noteId);
      localStorage.setItem(STORAGE_FOLDER_NOTES_KEY, JSON.stringify(all));
      return true;
    }
  } catch (err) {
    console.warn('[FolderNotebook] Failed to delete note:', err);
  }
  return false;
}

/**
 * Open the interactive Folder Notebook Drawer / Modal
 */
export function openFolderNotebookModal(options = {}) {
  const activeProj = projectState.getActiveProject() || {};
  const folders = projectState.getFolders ? projectState.getFolders().filter(f => f.id !== 'f_all') : [];
  const currentFolderId = options.folderId || activeProj.folderId || 'f_default';
  const currentFolder = folders.find(f => f.id === currentFolderId) || { id: currentFolderId, name: activeProj.folderName || '📁 મુખ્ય ફોલ્ડર' };

  let activeFId = currentFolderId;
  let activeFName = currentFolder.name;

  // Remove existing modal if any
  const existing = document.getElementById('folder-notebook-modal');
  if (existing) existing.remove();

  const modalEl = document.createElement('div');
  modalEl.id = 'folder-notebook-modal';
  modalEl.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(6px);
    z-index: 999999;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 16px;
    font-family: 'Noto Sans Gujarati', sans-serif;
  `;

  function renderModalContent() {
    const notes = getFolderNotes(activeFId);
    const nowIST = getCurrentIST();

    modalEl.innerHTML = `
      <div style="background: #0f172a; border: 2px solid #38bdf8; border-radius: 16px; width: 100%; max-width: 760px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.85); color: #f8fafc;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0284c7, #0369a1); padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid rgba(255,255,255,0.15);">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.5rem;">📝</span>
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 900; margin: 0; color: #ffffff; display: flex; align-items: center; gap: 8px;">
                <span>સ્માર્ટ નોટબુક (Folder Notebook)</span>
                <span style="font-size: 0.76rem; background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 6px;">${activeFName}</span>
              </h3>
              <p style="font-size: 0.78rem; color: #e0f2fe; margin: 2px 0 0 0;">
                આ ફોલ્ડરમાં તારીખ અને સમય સાથે તમારા વિચારો, સ્ક્રિપ્ટ કે રિમાઇન્ડર સાચવો.
              </p>
            </div>
          </div>
          <button id="btn-close-fnotes" style="background: rgba(0,0,0,0.3); color: #ffffff; border: none; font-size: 1.2rem; width: 34px; height: 34px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 800;">
            ✕
          </button>
        </div>

        <!-- Body (Scrollable) -->
        <div style="padding: 20px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 18px;">
          
          <!-- Folder selector & Live Clock -->
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.08); padding: 10px 14px; border-radius: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 0.85rem; color: #94a3b8; font-weight: 700;">📁 ફોલ્ડર:</span>
              <select id="fnotes-folder-select" style="background: #020617; color: #38bdf8; border: 1px solid #334155; border-radius: 6px; padding: 4px 10px; font-weight: 800; font-size: 0.82rem; cursor: pointer;">
                ${folders.map(f => `<option value="${f.id}" ${f.id === activeFId ? 'selected' : ''}>${f.name}</option>`).join('')}
              </select>
            </div>
            <div style="font-size: 0.78rem; font-family: monospace; font-weight: 800; color: #34d399; background: rgba(16,185,129,0.12); border: 1px solid rgba(16,185,129,0.3); padding: 4px 10px; border-radius: 6px;">
              🕒 લાઈવ તારીખ & સમય: ${nowIST.display}
            </div>
          </div>

          <!-- Add Note Form Card -->
          <div style="background: rgba(15, 23, 42, 0.9); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: 12px; padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 0.88rem; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 6px;">
                <span>✍️</span> નવી નોંધ લખો (Add New Note):
              </span>
              <span style="font-size: 0.72rem; color: #94a3b8;">
                ઓટોમેટિક તારીખ અને સમય સેવ થશે ✓
              </span>
            </div>

            <input 
              type="text" 
              id="fnotes-input-title" 
              placeholder="વિષય / ટાઇટલ (ઓપ્શનલ, દા.ત. વિડીયો આઈડિયા, સુધારો, સોર્સ લિંક...)" 
              style="width: 100%; box-sizing: border-box; background: #020617; color: #ffffff; border: 1px solid #334155; border-radius: 8px; padding: 9px 12px; font-size: 0.86rem; margin-bottom: 10px; outline: none;"
            />

            <textarea 
              id="fnotes-input-text" 
              rows="4" 
              placeholder="તમે આ ફોલ્ડરમાં જે કંઈ લખવા માંગતા હોવ તે અહીં લખો... (દા.ત. સ્ક્રિપ્ટ માટે અગત્યના મુદ્દા, નવી સરકારી યોજના, વોઈસ રેકોર્ડિંગ સમયે ધ્યાન રાખવાની બાબતો વગેરે)"
              style="width: 100%; box-sizing: border-box; background: #020617; color: #ffffff; border: 1px solid #334155; border-radius: 8px; padding: 12px; font-size: 0.88rem; line-height: 1.5; resize: vertical; outline: none; margin-bottom: 12px;"
            ></textarea>

            <div style="display: flex; justify-content: flex-end;">
              <button 
                id="btn-fnotes-save-note" 
                style="background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; border: none; font-weight: 800; font-size: 0.86rem; padding: 9px 20px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(16,185,129,0.35);"
              >
                <span>💾</span> તારીખ-સમય સાથે સેવ કરો (Save Note)
              </button>
            </div>
          </div>

          <!-- Existing Notes List -->
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <span style="font-size: 0.88rem; font-weight: 800; color: #cbd5e1; display: flex; align-items: center; gap: 6px;">
                <span>📚</span> સાચવેલી નોંધો (${notes.length}):
              </span>
            </div>

            ${notes.length === 0 ? `
              <div style="background: rgba(30, 41, 59, 0.4); border: 1px dashed rgba(255,255,255,0.15); border-radius: 10px; padding: 28px; text-align: center; color: #94a3b8; font-size: 0.85rem;">
                આ ફોલ્ડરમાં હજુ કોઈ નોંધ લખેલી નથી. ઉપરથી નવી નોંધ લખીને તારીખ-સમય સાથે સેવ કરો.
              </div>
            ` : `
              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${notes.map(n => `
                  <div style="background: rgba(30, 41, 59, 0.8); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px; position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px;">
                      <span style="font-size: 0.78rem; font-family: monospace; font-weight: 800; color: #38bdf8; display: flex; align-items: center; gap: 5px;">
                        <span>🕒</span> ${n.displayTime || n.createdAtIso || 'IST'}
                      </span>
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <button class="btn-copy-fnote" data-id="${n.id}" style="background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); font-size: 0.72rem; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-weight: 700;">
                          📋 કોપી
                        </button>
                        <button class="btn-delete-fnote" data-id="${n.id}" style="background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.3); font-size: 0.72rem; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-weight: 700;">
                          🗑️ ડિલીટ
                        </button>
                      </div>
                    </div>

                    ${n.title ? `
                      <h4 style="font-size: 0.92rem; font-weight: 800; color: #ffffff; margin: 0 0 6px 0;">
                        ${n.title}
                      </h4>
                    ` : ''}

                    <div style="font-size: 0.86rem; color: #e2e8f0; line-height: 1.5; white-space: pre-wrap; word-break: break-word;">
                      ${n.text}
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>

        </div>

        <!-- Footer -->
        <div style="background: rgba(15, 23, 42, 0.95); padding: 12px 20px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; font-size: 0.76rem; color: #64748b;">
          <span>📁 ${activeFName} • Gyan Yatra AI Studio</span>
          <button id="btn-close-fnotes-bottom" style="background: #334155; color: #ffffff; border: none; font-weight: 700; font-size: 0.8rem; padding: 6px 14px; border-radius: 6px; cursor: pointer;">
            બંધ કરો (Close)
          </button>
        </div>

      </div>
    `;

    // Attach Event Listeners
    modalEl.querySelector('#btn-close-fnotes')?.addEventListener('click', () => modalEl.remove());
    modalEl.querySelector('#btn-close-fnotes-bottom')?.addEventListener('click', () => modalEl.remove());

    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) modalEl.remove();
    });

    // Folder switcher in modal
    modalEl.querySelector('#fnotes-folder-select')?.addEventListener('change', (e) => {
      activeFId = e.target.value;
      const targetF = folders.find(f => f.id === activeFId);
      activeFName = targetF ? targetF.name : '📁 ફોલ્ડર';
      renderModalContent();
    });

    // Save Note button
    modalEl.querySelector('#btn-fnotes-save-note')?.addEventListener('click', () => {
      const titleInput = modalEl.querySelector('#fnotes-input-title');
      const textInput = modalEl.querySelector('#fnotes-input-text');
      const title = titleInput ? titleInput.value : '';
      const text = textInput ? textInput.value : '';

      if (!text || !text.trim()) {
        alert('કૃપા કરીને નોંધનું લખાણ લખો.');
        return;
      }

      addFolderNote(activeFId, text, title);
      showNoticeToast('✅ નોંધ તારીખ-સમય સાથે સાચવાઈ ગઈ! ✓', 'success');
      renderModalContent();
    });

    // Copy Note buttons
    modalEl.querySelectorAll('.btn-copy-fnote').forEach(btn => {
      btn.addEventListener('click', () => {
        const nId = btn.getAttribute('data-id');
        const target = notes.find(n => n.id === nId);
        if (target) {
          copyToClipboard(target.text, 'નોંધ કોપી થઈ ગઈ! ✓', btn);
        }
      });
    });

    // Delete Note buttons
    modalEl.querySelectorAll('.btn-delete-fnote').forEach(btn => {
      btn.addEventListener('click', () => {
        const nId = btn.getAttribute('data-id');
        if (confirm('શું તમે આ નોંધ ડિલીટ કરવા માંગો છો?')) {
          deleteFolderNote(activeFId, nId);
          showNoticeToast('🗑️ નોંધ ડિલીટ થઈ ગઈ.', 'info');
          renderModalContent();
        }
      });
    });
  }

  renderModalContent();
  document.body.appendChild(modalEl);
}

