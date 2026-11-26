/**
 * Gyan Yatra AI Studio — Extra Tool: Saved Videos & Slide Audios Hub (Stage 8)
 * Automatically opens when a video finishes rendering & saving.
 * Displays:
 * 1. Latest Saved 1080p Video (Play, Download MP4, WhatsApp Share, Copy Link)
 * 2. Auto-Saved Slide-by-Slide Audios (Saved on disk in public/audio/)
 * 3. Complete Archive of All Saved Videos (public/videos/)
 */

import { copyToClipboard, showNoticeToast } from '../utils/clipboard.js';
import { projectState } from '../utils/projectState.js';

export async function renderSavedHub(container, navigateTo) {
  const project = (projectState && typeof projectState.getActiveProject === 'function')
    ? projectState.getActiveProject()
    : (projectState?.getProject ? projectState.getProject() : {});

  const lastSavedFile = (typeof localStorage !== 'undefined' ? localStorage.getItem('gyan_last_saved_video_file') : '') || '';
  const lastSavedTopic = (typeof localStorage !== 'undefined' ? localStorage.getItem('gyan_last_saved_video_topic') : '') || project?.topic || project?.name || 'તૈયાર ૧૦૮૦p વિડીયો';

  container.innerHTML = `
    <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(6, 78, 59, 0.45)); border: 1.5px solid #10b981; border-radius: var(--radius-lg); padding: 18px 22px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.2);">
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="width: 48px; height: 48px; border-radius: 12px; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; box-shadow: 0 4px 14px rgba(16,185,129,0.4);">
          💾
        </div>
        <div>
          <h2 style="font-size: 1.35rem; font-weight: 900; color: #ffffff; margin: 0;">
            ૮. Saved Videos & Slide Audios Hub (ઓટો-સેવ વોલ્ટ)
          </h2>
          <p style="color: #a7f3d0; font-size: 0.82rem; margin: 4px 0 0 0;">
            વિડીયો બને એટલે ઓટોમેટિક અહીં સેવ થઈને ખુલી જશે • દરેક સ્લાઇડનો ઓડિયો પણ તરત સેવ થાય છે
          </p>
        </div>
      </div>

      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button id="sh-btn-back-editor" class="btn btn-outline btn-sm" style="font-weight: 700; color: #cbd5e1; border-color: rgba(255,255,255,0.25);">
          ← ૪. Video Editor
        </button>
        <button id="sh-btn-refresh" class="btn btn-primary btn-sm" style="background: #0284c7; border: none; font-weight: 800;">
          🔄 રિફ્રેશ
        </button>
        <button id="sh-btn-goto-thumb" class="btn btn-primary btn-sm" style="background: #f59e0b; color: #0f172a; border: none; font-weight: 800;">
          🖼️ ૬. Thumbnail ➔
        </button>
        <button id="sh-btn-goto-seo" class="btn btn-primary btn-sm" style="background: #10b981; border: none; font-weight: 800;">
          🏷️ ૭. SEO ➔
        </button>
      </div>
    </div>

    <div id="sh-loading" style="padding: 30px; text-align: center; color: #94a3b8; font-weight: 700;">
      ⏳ સેવ થયેલા વિડીયો અને ઓડિયો લોડ થઈ રહ્યા છે...
    </div>

    <div id="sh-content" style="display: none;">
      <!-- 1. FEATURED LATEST VIDEO PLAYER -->
      <div class="card" style="background: #0f172a; border: 1.5px solid #10b981; border-radius: 14px; padding: 18px; margin-bottom: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;">
          <div>
            <span class="badge" style="background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid #10b981; font-size: 0.72rem; font-weight: 800;">
              ✓ છેલ્લો સેવ થયેલો 1080p વિડીયો
            </span>
            <h3 id="sh-featured-title" style="color: #fff; font-size: 1.1rem; font-weight: 800; margin: 6px 0 0 0;">
              ${lastSavedTopic}
            </h3>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <a id="sh-featured-download" href="#" download class="btn btn-sm" style="background: #10b981; color: #fff; font-weight: 800; text-decoration: none; padding: 8px 16px; border-radius: 8px;">
              💾 વિડીયો સેવ કરો (MP4)
            </a>
            <button id="sh-featured-wa" class="btn btn-sm" style="background: #128c7e; color: #fff; border: none; font-weight: 800; padding: 8px 16px; border-radius: 8px; cursor: pointer;">
              💬 WhatsApp શેર
            </button>
            <button id="sh-featured-copy" class="btn btn-outline btn-sm" style="border-color: #38bdf8; color: #38bdf8; font-weight: 800; padding: 8px 14px; border-radius: 8px; cursor: pointer;">
              🔗 લિંક કોપી
            </button>
          </div>
        </div>

        <div style="background: #000; border-radius: 10px; overflow: hidden; border: 1px solid #334155;">
          <video id="sh-featured-player" controls playsinline style="width: 100%; max-height: 440px; display: block;"></video>
        </div>
        <div id="sh-featured-meta" style="margin-top: 8px; font-size: 0.78rem; color: #94a3b8;"></div>
      </div>

      <!-- 2. AUTO-SAVED SLIDE AUDIOS -->
      <div class="card" style="background: #0f172a; border: 1.5px solid #7c3aed; border-radius: 14px; padding: 18px; margin-bottom: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px;">
          <div>
            <h3 style="color: #c4b5fd; font-size: 1.05rem; font-weight: 900; margin: 0;">
              🎙️ સ્લાઇડ પ્રમાણે ઓટો-સેવ થયેલા ઓડિયો (public/audio)
            </h3>
            <p style="color: #94a3b8; font-size: 0.76rem; margin: 2px 0 0 0;">
              તમે દરેક સ્લાઇડનો અવાજ રેકોર્ડ કરો ત્યારે જ તે ઓટોમેટિક અહીં કાયમી સેવ થઈ જાય છે
            </p>
          </div>
          <span id="sh-audio-count" class="badge" style="background: rgba(124,58,237,0.2); color: #ddd6fe; font-weight: 800;">0 ઓડિયો</span>
        </div>
        <div id="sh-audios-list" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;"></div>
      </div>

      <!-- 3. ALL SAVED VIDEOS ARCHIVE -->
      <div class="card" style="background: #0f172a; border: 1.5px solid #334155; border-radius: 14px; padding: 18px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <h3 style="color: #38bdf8; font-size: 1.05rem; font-weight: 900; margin: 0;">
            📁 બધા સેવ થયેલા વિડીયો (public/videos)
          </h3>
          <span id="sh-video-count" class="badge" style="background: rgba(56,189,248,0.18); color: #7dd3fc; font-weight: 800;">0 વિડીયો</span>
        </div>
        <div id="sh-videos-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px;"></div>
      </div>
    </div>
  `;

  container.querySelector('#sh-btn-back-editor')?.addEventListener('click', () => navigateTo('videoeditor'));
  container.querySelector('#sh-btn-goto-thumb')?.addEventListener('click', () => navigateTo('thumbnails'));
  container.querySelector('#sh-btn-goto-seo')?.addEventListener('click', () => navigateTo('seodescription'));
  container.querySelector('#sh-btn-refresh')?.addEventListener('click', () => loadSavedData());

  async function loadSavedData() {
    const loadingEl = container.querySelector('#sh-loading');
    const contentEl = container.querySelector('#sh-content');
    if (loadingEl) loadingEl.style.display = 'block';
    if (contentEl) contentEl.style.display = 'none';

    try {
      const [vidRes, audRes] = await Promise.all([
        fetch('/api/preview/projects').then(r => r.json()).catch(() => ({ projects: [], videoFiles: [] })),
        fetch('/api/voice/slide-audios').then(r => r.json()).catch(() => ({ audios: [] }))
      ]);

      const projVideos = (Array.isArray(vidRes?.projects) ? vidRes.projects : [])
        .filter(p => p.hasVideo && (p.videoFilename || p.videoUrl))
        .map(p => ({
          filename: p.videoFilename || (p.videoUrl ? p.videoUrl.split('/').pop() : ''),
          url: p.videoUrl || `/videos/${p.videoFilename}`,
          title: p.title || p.topic || p.videoFilename,
          sizeBytes: p.sizeBytes || 0,
          createdAt: p.updatedAt || p.createdAt || ''
        }));

      const rawVideoFiles = (Array.isArray(vidRes?.videoFiles) ? vidRes.videoFiles : []).map(f => ({
        filename: f.filename || f.name || '',
        url: f.url || `/videos/${f.filename || f.name}`,
        title: f.title || f.filename || f.name,
        sizeBytes: f.sizeBytes || f.size || 0,
        createdAt: f.mtime || f.createdAt || ''
      }));

      const seenFiles = new Set();
      const videos = [];
      [...projVideos, ...rawVideoFiles].forEach(v => {
        if (v.filename && !seenFiles.has(v.filename)) {
          seenFiles.add(v.filename);
          videos.push(v);
        }
      });

      const audios = Array.isArray(audRes?.audios) ? audRes.audios : [];

      if (loadingEl) loadingEl.style.display = 'none';
      if (contentEl) contentEl.style.display = 'block';

      // Set featured video
      let featured = videos.find(v => lastSavedFile && v.filename === lastSavedFile) || videos[0] || null;
      const player = container.querySelector('#sh-featured-player');
      const dlBtn = container.querySelector('#sh-featured-download');
      const waBtn = container.querySelector('#sh-featured-wa');
      const copyBtn = container.querySelector('#sh-featured-copy');
      const titleEl = container.querySelector('#sh-featured-title');
      const metaEl = container.querySelector('#sh-featured-meta');

      const setFeatured = (v) => {
        if (!v) return;
        const videoUrl = v.url || `/videos/${v.filename}`;
        const fullUrl = `${window.location.origin}${videoUrl}`;
        if (player) {
          player.src = videoUrl;
          player.load();
        }
        if (titleEl) titleEl.textContent = v.title || v.topic || v.filename;
        if (dlBtn) {
          dlBtn.href = `/api/voice/download-video?file=${encodeURIComponent(v.filename)}&name=${encodeURIComponent(v.filename)}`;
          dlBtn.download = v.filename;
        }
        if (metaEl) {
          const mb = v.sizeBytes ? (v.sizeBytes / (1024 * 1024)).toFixed(2) + ' MB' : '';
          const dt = v.createdAt ? new Date(v.createdAt).toLocaleString('en-IN') : '';
          metaEl.textContent = `📁 ${v.filename} ${mb ? '• ' + mb : ''} ${dt ? '• ' + dt : ''}`;
        }
        if (waBtn) {
          waBtn.onclick = () => {
            const msg = encodeURIComponent(`🎬 *${v.title || v.filename}*\n\nજુઓ સંપૂર્ણ 1080p વિડીયો:\n${fullUrl}`);
            window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
          };
        }
        if (copyBtn) {
          copyBtn.onclick = () => {
            copyToClipboard(fullUrl);
            showNoticeToast('🔗 વિડીયો લિંક કોપી થઈ!', 'success');
          };
        }
      };

      if (featured) {
        setFeatured(featured);
      }

      // Render slide audios
      const audCountEl = container.querySelector('#sh-audio-count');
      const audListEl = container.querySelector('#sh-audios-list');
      if (audCountEl) audCountEl.textContent = `${audios.length} ઓડિયો`;
      if (audListEl) {
        if (audios.length === 0) {
          audListEl.innerHTML = `<div style="color:#94a3b8; font-size:0.85rem;">હજુ સુધી કોઈ સ્લાઇડ ઓડિયો સેવ થયો નથી.</div>`;
        } else {
          audListEl.innerHTML = audios.slice(0, 30).map((a, idx) => {
            const url = a.audioUrl || `/audio/${a.filename}`;
            const dt = a.createdAt ? new Date(a.createdAt).toLocaleString('en-IN') : '';
            return `
              <div style="background:#1e293b; border:1px solid #334155; border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:6px;">
                  <strong style="color:#e9d5ff; font-size:0.8rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    #${idx + 1} • ${a.slideNumber ? 'સ્લાઇડ ' + a.slideNumber : a.filename}
                  </strong>
                  <a href="${url}" download="${a.filename}" style="background:#7c3aed; color:#fff; font-size:0.7rem; font-weight:800; padding:3px 8px; border-radius:5px; text-decoration:none;">⬇️</a>
                </div>
                <audio controls src="${url}" style="width:100%; height:32px;"></audio>
                <div style="font-size:0.68rem; color:#94a3b8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${a.filename} ${dt ? '• ' + dt : ''}</div>
              </div>
            `;
          }).join('');
        }
      }

      // Render all saved videos
      const vidCountEl = container.querySelector('#sh-video-count');
      const vidGridEl = container.querySelector('#sh-videos-grid');
      if (vidCountEl) vidCountEl.textContent = `${videos.length} વિડીયો`;
      if (vidGridEl) {
        if (videos.length === 0) {
          vidGridEl.innerHTML = `<div style="color:#94a3b8; font-size:0.85rem;">કોઈ વિડીયો મળ્યો નથી.</div>`;
        } else {
          vidGridEl.innerHTML = '';
          videos.forEach((v) => {
            const mb = v.sizeBytes ? (v.sizeBytes / (1024 * 1024)).toFixed(2) + ' MB' : '';
            const dt = v.createdAt ? new Date(v.createdAt).toLocaleString('en-IN') : '';
            const card = document.createElement('div');
            card.style.cssText = 'background:#1e293b; border:1px solid #334155; border-radius:10px; padding:12px; display:flex; flex-direction:column; gap:8px;';
            card.innerHTML = `
              <div style="font-weight:800; font-size:0.86rem; color:#fff; line-height:1.35;">${v.title || v.topic || v.filename}</div>
              <div style="font-size:0.72rem; color:#94a3b8;">${mb} ${dt ? '• ' + dt : ''}</div>
              <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:auto;">
                <button class="sh-btn-play btn btn-sm" style="background:#0284c7; color:#fff; border:none; font-weight:800; padding:5px 10px; border-radius:6px; cursor:pointer;">▶️ પ્લે</button>
                <a href="/api/voice/download-video?file=${encodeURIComponent(v.filename)}&name=${encodeURIComponent(v.filename)}" download="${v.filename}" style="background:#10b981; color:#fff; font-weight:800; font-size:0.76rem; padding:5px 10px; border-radius:6px; text-decoration:none;">💾 સેવ</a>
                <button class="sh-btn-wa btn btn-sm" style="background:#128c7e; color:#fff; border:none; font-weight:800; padding:5px 10px; border-radius:6px; cursor:pointer;">💬 શેર</button>
              </div>
            `;
            card.querySelector('.sh-btn-play')?.addEventListener('click', () => {
              setFeatured(v);
              window.scrollTo({ top: 0, behavior: 'smooth' });
              if (player) player.play().catch(() => {});
            });
            card.querySelector('.sh-btn-wa')?.addEventListener('click', () => {
              const fullUrl = `${window.location.origin}${v.url || '/videos/' + v.filename}`;
              const msg = encodeURIComponent(`🎬 *${v.title || v.filename}*\n\nજુઓ સંપૂર્ણ 1080p વિડીયો:\n${fullUrl}`);
              window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
            });
            vidGridEl.appendChild(card);
          });
        }
      }
    } catch (err) {
      if (loadingEl) loadingEl.textContent = '❌ લોડ કરવામાં ભૂલ: ' + err.message;
    }
  }

  await loadSavedData();
}
