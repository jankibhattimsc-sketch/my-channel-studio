/**
 * Gyan Yatra AI Studio — Dedicated Saved Audios Vault (#savedaudios)
 * Separate tool dedicated exclusively to all slide-by-slide saved audios (public/audio + Browser IndexedDB).
 */

import { showNoticeToast } from '../utils/clipboard.js';
import { projectState } from '../utils/projectState.js';

export async function renderSavedAudios(container, navigateTo) {
  const project = (projectState && typeof projectState.getActiveProject === 'function')
    ? projectState.getActiveProject()
    : (projectState?.getProject ? projectState.getProject() : {});

  container.innerHTML = `
    <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(88, 28, 135, 0.45)); border: 1.5px solid #a855f7; border-radius: var(--radius-lg); padding: 18px 22px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; box-shadow: 0 10px 30px rgba(168, 85, 247, 0.22);">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #a855f7, #7c3aed); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 4px 14px rgba(168, 85, 247, 0.4);">
          🎙️
        </div>
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 900; color: #ffffff; margin: 0;">
            ૧૧. Saved Audios Vault (અલગ ઓડિયો ટૂલ)
          </h2>
          <p style="color: #e9d5ff; font-size: 0.82rem; margin: 4px 0 0 0;">
            દરેક સ્લાઇડનો ઓડિયો બને ત્યારે તરત જ સર્વર (public/audio) માં સેવ થઈને અહીં દેખાશે
          </p>
        </div>
      </div>

      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button id="sa-btn-refresh" class="btn btn-primary btn-sm" style="background: #7c3aed; border: none; font-weight: 800;">
          🔄 રિફ્રેશ ઓડિયો
        </button>
        <button id="sa-btn-goto-editor" class="btn btn-primary btn-sm" style="background: #0284c7; border: none; font-weight: 800;">
          🎥 Video Editor ખોલો ➔
        </button>
        <button id="sa-btn-goto-videos" class="btn btn-primary btn-sm" style="background: #10b981; border: none; font-weight: 800;">
          💾 Saved Videos Hub ➔
        </button>
      </div>
    </div>

    <div class="card" style="background: #0f172a; border: 1.5px solid #334155; border-radius: 14px; padding: 16px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
      <input id="sa-search-input" type="text" placeholder="🔍 સ્લાઇડ નંબર અથવા ફાઇલ નામ શોધો..." style="flex: 1; min-width: 220px; padding: 9px 14px; border-radius: 8px; border: 1.5px solid #475569; background: #020617; color: #fff; font-weight: 700; font-size: 0.88rem;">
      <span id="sa-total-badge" class="badge" style="background: rgba(168,85,247,0.22); color: #e9d5ff; border: 1px solid #a855f7; font-size: 0.82rem; font-weight: 800; padding: 6px 12px;">
        0 સેવ કરેલા ઓડિયો
      </span>
    </div>

    <div id="sa-loading" style="padding: 30px; text-align: center; color: #94a3b8; font-weight: 700;">
      ⏳ બધા સેવ કરેલા ઓડિયો લોડ થઈ રહ્યા છે...
    </div>

    <div id="sa-audios-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px;"></div>
  `;

  container.querySelector('#sa-btn-refresh')?.addEventListener('click', () => loadAudios());
  container.querySelector('#sa-btn-goto-editor')?.addEventListener('click', () => navigateTo('videoeditor'));
  container.querySelector('#sa-btn-goto-videos')?.addEventListener('click', () => navigateTo('savedhub'));

  let allAudios = [];

  function renderGrid(filter = '') {
    const grid = container.querySelector('#sa-audios-grid');
    const badge = container.querySelector('#sa-total-badge');
    if (!grid) return;

    const q = filter.trim().toLowerCase();
    const list = q
      ? allAudios.filter(a => (a.filename || '').toLowerCase().includes(q) || String(a.slideNumber || '').includes(q))
      : allAudios;

    if (badge) badge.textContent = `${list.length} સેવ કરેલા ઓડિયો`;

    if (list.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 30px; color: #94a3b8; background: #0f172a; border-radius: 12px; border: 1px solid #334155;">કોઈ ઓડિયો મળ્યો નથી.</div>`;
      return;
    }

    grid.innerHTML = '';
    list.forEach((a, idx) => {
      const url = a.audioUrl || `/audio/${a.filename}`;
      const dt = a.createdAt ? new Date(a.createdAt).toLocaleString('en-IN') : '';
      const mb = a.sizeBytes ? (a.sizeBytes / 1024).toFixed(0) + ' KB' : '';
      const card = document.createElement('div');
      card.style.cssText = 'background: #1e293b; border: 1.5px solid #334155; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px;';
      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
          <strong style="color: #e9d5ff; font-size: 0.88rem;">
            🎙️ #${idx + 1} • ${a.slideNumber ? 'સ્લાઇડ ' + a.slideNumber : 'સ્લાઇડ ઓડિયો'}
          </strong>
          <span style="font-size: 0.7rem; color: #94a3b8; font-weight: 700;">${mb}</span>
        </div>
        <audio controls src="${url}" style="width: 100%; height: 34px;"></audio>
        <div style="font-size: 0.7rem; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${a.filename}">
          📁 ${a.filename} ${dt ? '• ' + dt : ''}
        </div>
        <div style="display: flex; gap: 6px; margin-top: auto;">
          <a href="${url}" download="${a.filename}" style="flex: 1; text-align: center; background: #7c3aed; color: #fff; font-weight: 800; font-size: 0.76rem; padding: 6px 10px; border-radius: 6px; text-decoration: none;">
            ⬇️ ડાઉનલોડ WAV
          </a>
          <button class="sa-copy-url btn btn-sm" style="background: #0f172a; color: #38bdf8; border: 1px solid #38bdf8; font-weight: 800; font-size: 0.74rem; padding: 6px 10px; border-radius: 6px; cursor: pointer;">
            🔗 લિંક
          </button>
        </div>
      `;
      card.querySelector('.sa-copy-url')?.addEventListener('click', () => {
        const full = `${window.location.origin}${url}`;
        navigator.clipboard.writeText(full);
        showNoticeToast('🔗 ઓડિયો લિંક કોપી થઈ!', 'success');
      });
      grid.appendChild(card);
    });
  }

  container.querySelector('#sa-search-input')?.addEventListener('input', (e) => {
    renderGrid(e.target.value || '');
  });

  async function loadAudios() {
    const loadingEl = container.querySelector('#sa-loading');
    if (loadingEl) loadingEl.style.display = 'block';
    try {
      const pid = encodeURIComponent(project?.id || '');
      const res = await fetch(`/api/voice/slide-audios?projectId=${pid}`).then(r => r.json());
      let list = [];
      if (Array.isArray(res?.audios) && res.audios.length > 0) {
        list = res.audios;
      } else if (res?.slideAudios && typeof res.slideAudios === 'object') {
        list = Object.values(res.slideAudios);
      }
      if (list.length === 0) {
        const lib = await fetch('/api/voice/library').then(r => r.json()).catch(() => null);
        if (Array.isArray(lib?.audios)) list = lib.audios;
        else if (Array.isArray(lib?.library)) list = lib.library;
      }
      allAudios = list.map(a => {
        if (!a.slideNumber && a.filename) {
          const m = String(a.filename).match(/slide[_\s-]*(\d+)/i);
          if (m) a.slideNumber = parseInt(m[1], 10);
        }
        return a;
      }).sort((a, b) => {
        const na = Number(a.slideNumber || 9999);
        const nb = Number(b.slideNumber || 9999);
        if (na !== nb) return na - nb;
        return (b.mtime || 0) - (a.mtime || 0);
      });
      if (loadingEl) loadingEl.style.display = 'none';
      renderGrid(container.querySelector('#sa-search-input')?.value || '');
    } catch (err) {
      if (loadingEl) loadingEl.textContent = '❌ ઓડિયો લોડ કરવામાં ભૂલ: ' + err.message;
    }
  }

  await loadAudios();
}
