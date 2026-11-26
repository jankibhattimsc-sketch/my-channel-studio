/**
 * Folder Banner Utility for Studio Tools
 * Allows creators to view active folder, rename folder, create new folder,
 * and save current tool content directly to their chosen folder.
 */

import { projectState } from './projectState.js';
import { showNoticeToast } from './clipboard.js';
import { openFolderNotebookModal } from './folderNotebookModal.js';

export function mountFolderBanner(container, { toolName = 'આ ટૂલ', onSave = null }) {
  if (!container) return null;

  const renderBanner = () => {
    const folders = projectState.getFolders().filter(f => f.id !== 'f_all');
    const activeProject = projectState.getActiveProject();
    const currentFolderId = activeProject?.folderId || projectState.getActiveFolderId() || 'f_default';
    const currentFolder = folders.find(f => f.id === currentFolderId) || folders[0] || { id: 'f_default', name: '📁 મુખ્ય ફોલ્ડર' };

    const bannerEl = document.createElement('div');
    bannerEl.className = 'folder-tool-banner-bar';
    bannerEl.style.cssText = `
      background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9));
      border: 1.5px solid rgba(56, 189, 248, 0.4);
      border-radius: var(--radius-lg, 12px);
      padding: 12px 18px;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    `;

    bannerEl.innerHTML = `
      <!-- Left: Folder selector & actions -->
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <span style="display: inline-flex; align-items: center; gap: 5px; font-weight: 800; font-size: 0.85rem; color: #38bdf8; background: rgba(56, 189, 248, 0.12); padding: 5px 10px; border-radius: 8px; border: 1px solid rgba(56, 189, 248, 0.3);">
          <span>📁</span> સેવ ફોલ્ડર:
        </span>

        <select id="select-active-folder-banner" class="form-select font-gu" style="font-size: 0.88rem; font-weight: 700; padding: 6px 12px; background: #07090e; color: #ffffff; border: 1.5px solid #334155; border-radius: 8px; cursor: pointer; min-width: 200px;">
          ${folders.map(f => `
            <option value="${f.id}" ${f.id === currentFolder.id ? 'selected' : ''}>
              ${f.name}
            </option>
          `).join('')}
        </select>

        <button id="btn-banner-rename-folder" class="btn btn-outline btn-sm" title="આ ફોલ્ડરનું નામ બદલો (Rename Folder)" style="font-size: 0.78rem; padding: 6px 10px; border-color: rgba(255,255,255,0.2);">
          ✏️ Rename
        </button>

        <button id="btn-banner-create-folder" class="btn btn-outline btn-sm" title="નવું ફોલ્ડર બનાવો (Create New Folder)" style="font-size: 0.78rem; padding: 6px 10px; border-color: #38bdf8; color: #38bdf8;">
          ➕ નવું ફોલ્ડર
        </button>

        <button id="btn-banner-folder-notebook" class="btn btn-outline btn-sm" title="આ ફોલ્ડરની સ્માર્ટ નોટબુક (Folder Notebook)" style="font-size: 0.78rem; padding: 6px 12px; border-color: #8b5cf6; color: #c4b5fd; font-weight: 800; display: inline-flex; align-items: center; gap: 5px;">
          <span>📝</span> ફોલ્ડર નોટબુક
        </button>
      </div>

      <!-- Right: Save to Folder Button -->
      <div style="display: flex; align-items: center; gap: 8px;">
        <button id="btn-banner-save-to-folder" class="btn btn-success btn-sm" style="font-weight: 800; padding: 8px 16px; background: linear-gradient(135deg, #10b981, #059669); border: none; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35); display: flex; align-items: center; gap: 6px;">
          <span>💾</span> આ ફોલ્ડરમાં સેવ કરો
        </button>
      </div>
    `;

    // Folder change handler
    bannerEl.querySelector('#select-active-folder-banner')?.addEventListener('change', (e) => {
      const selectedId = e.target.value;
      const targetFolder = folders.find(f => f.id === selectedId);
      if (targetFolder && activeProject) {
        projectState.moveProjectToFolder(activeProject.id, targetFolder.id);
        showNoticeToast(`📁 વિડીયો હવે "${targetFolder.name}" ફોલ્ડરમાં મૂકાયો છે! ✓`, 'success');
      }
    });

    // Rename Folder button
    bannerEl.querySelector('#btn-banner-rename-folder')?.addEventListener('click', () => {
      const activeProj = projectState.getActiveProject();
      const curFId = activeProj?.folderId || 'f_default';
      const curF = folders.find(f => f.id === curFId) || folders[0];
      const newName = prompt(`"${curF.name}" ફોલ્ડરનું નવું નામ આપો:`, curF.name);
      if (newName && newName.trim()) {
        projectState.renameFolder(curF.id, newName.trim());
        showNoticeToast(`✓ ફોલ્ડરનું નામ બદલીને "${newName.trim()}" થયું!`, 'success');
        refresh();
      }
    });

    // Create New Folder button
    bannerEl.querySelector('#btn-banner-create-folder')?.addEventListener('click', () => {
      const folderName = prompt('તમારી ઇચ્છા મુજબ નવા ફોલ્ડરનું નામ આપો:\n(દા.ત. આંગણવાડી ભરતી ૨૦૨૬, વિધવા સહાય, વગેરે)');
      if (folderName && folderName.trim()) {
        const created = projectState.createFolder(folderName.trim());
        if (created) {
          const activeProj = projectState.getActiveProject();
          if (activeProj) {
            projectState.moveProjectToFolder(activeProj.id, created.id);
          }
          showNoticeToast(`🎉 નવું ફોલ્ડર "${folderName.trim()}" સફળતાપૂર્વક બની ગયું! ✓`, 'success');
          refresh();
        }
      }
    });

    // Folder Notebook button
    bannerEl.querySelector('#btn-banner-folder-notebook')?.addEventListener('click', () => {
      const activeProj = projectState.getActiveProject();
      const curFId = activeProj?.folderId || currentFolder.id || 'f_default';
      const curF = folders.find(f => f.id === curFId) || currentFolder;
      openFolderNotebookModal({ folderId: curF.id, folderName: curF.name });
    });

    // Save to Folder button
    bannerEl.querySelector('#btn-banner-save-to-folder')?.addEventListener('click', () => {
      if (typeof onSave === 'function') {
        onSave();
      }
      const activeProj = projectState.getActiveProject();
      const fName = activeProj?.folderName || currentFolder.name;
      showNoticeToast(`✅ ${toolName} "${fName}" ફોલ્ડરમાં સફળતાપૂર્વક સેવ થઈ ગઈ છે! ✓`, 'success');
    });

    return bannerEl;
  };

  const refresh = () => {
    const existing = container.querySelector('.folder-tool-banner-bar');
    if (existing) {
      const newEl = renderBanner();
      container.replaceChild(newEl, existing);
    }
  };

  const initialEl = renderBanner();
  container.prepend(initialEl);

  window.addEventListener('foldersListUpdated', refresh);

  return {
    refresh
  };
}

