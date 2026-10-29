import { projectState } from '../utils/projectState.js';
import { copyToClipboard } from '../utils/clipboard.js';

export function renderCanva(container, navigateTo) {
  const p = projectState.getActiveProject();
  const canva = p.canva || {};

  let canvasHeadline = canva.headline || p.name || 'ગુજરાત કર્મચારી પગાર વધારો 2026';
  let canvasSubtitle = canva.subtitle || 'સત્તાવાર પરિપત્ર & સંપૂર્ણ વિગત | જ્ઞાન યાત્રા';
  let canvasBadge = canva.badgeText || '🔥 નવી જાહેરાત';
  let canvasTheme = 'navy-yellow'; // navy-yellow, red-gold, emerald, clean-white, dark-neon

  function updateCanvaState(partial) {
    projectState.updateTool('canva', partial);
  }

  function drawCanvas() {
    const canvas = container.querySelector('#canva-preview-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Background Themes
    if (canvasTheme === 'navy-yellow') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0a192f');
      grad.addColorStop(1, '#020c1b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Accent border
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, w - 14, h - 14);
    } else if (canvasTheme === 'red-gold') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#991b1b');
      grad.addColorStop(1, '#450a0a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, w - 14, h - 14);
    } else if (canvasTheme === 'clean-white') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, w - 14, h - 14);
    } else if (canvasTheme === 'emerald') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#064e3b');
      grad.addColorStop(1, '#022c22');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, w - 14, h - 14);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, w - 14, h - 14);
    }

    // Top Badge Pill
    if (canvasBadge) {
      ctx.save();
      ctx.fillStyle = canvasTheme === 'clean-white' ? '#dc2626' : '#f59e0b';
      const badgeW = 280;
      const badgeH = 50;
      const badgeX = 60;
      const badgeY = 60;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 10);
      ctx.fill();

      ctx.font = 'bold 24px "Noto Sans Gujarati", sans-serif';
      ctx.fillStyle = canvasTheme === 'clean-white' ? '#ffffff' : '#000000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(canvasBadge, badgeX + (badgeW / 2), badgeY + (badgeH / 2));
      ctx.restore();
    }

    // Main Headline (Word wrapped)
    ctx.save();
    ctx.font = 'bold 54px "Noto Sans Gujarati", sans-serif';
    ctx.fillStyle = canvasTheme === 'clean-white' ? '#0f172a' : (canvasTheme === 'navy-yellow' ? '#fde047' : '#ffffff');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const words = canvasHeadline.split(' ');
    let line = '';
    let startY = 140;
    const maxWidth = w - 120;
    const lineHeight = 72;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, 60, startY);
        line = words[n] + ' ';
        startY += lineHeight;
        if (startY > h - 180) break;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 60, startY);
    ctx.restore();

    // Subtitle
    ctx.save();
    ctx.font = '500 28px "Noto Sans Gujarati", sans-serif';
    ctx.fillStyle = canvasTheme === 'clean-white' ? '#475569' : '#94a3b8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(canvasSubtitle, 60, h - 50);
    ctx.restore();
  }

  container.innerHTML = `
    <!-- Top Project Header -->
    <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: var(--radius-lg); padding: 18px 22px; margin-bottom: 20px; box-shadow: 0 8px 25px rgba(0,0,0,0.35);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button id="btn-back-to-projects" class="btn btn-outline btn-sm" style="font-weight: 700; display: flex; align-items: center; gap: 6px;">
            <span>←</span> બધા પ્રોજેક્ટ્સ (Projects)
          </button>
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.3rem;">🎨</span>
              <h2 style="font-size: 1.25rem; font-weight: 800; color: #fff; margin: 0;">
                ૬. કેન્વા થંબનેલ & ગ્રાફિક્સ સ્ટુડિયો (Canva Studio)
              </h2>
            </div>
            <p style="font-size: 0.82rem; color: #38bdf8; margin: 2px 0 0 0; font-weight: 600;">
              📁 પ્રોજેક્ટ: ${p.name}
            </p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <a href="https://www.canva.com/create/youtube-thumbnails/" target="_blank" rel="noopener noreferrer" class="btn btn-primary" style="background: linear-gradient(135deg, #00c4cc, #7d2ae8); border: none; font-weight: 800; padding: 8px 18px; box-shadow: 0 4px 15px rgba(125,42,232,0.4); text-decoration: none; display: flex; align-items: center; gap: 8px;">
            <span>🎨</span> Canva માં નવું થંબનેલ બનાવો ↗
          </a>
          <span class="badge badge-green" style="font-size: 0.75rem; font-weight: 800;">
            ✓ Auto-Saved
          </span>
        </div>
      </div>
    </div>

    <!-- 2-Column Studio Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; margin-bottom: 24px;">
      
      <!-- Left Column: Live Canvas Preview -->
      <div class="card" style="border: 1px solid rgba(255,255,255,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="font-size: 1.1rem; font-weight: 800; color: #fff; margin: 0; display: flex; align-items: center; gap: 8px;">
            <span>🖼️</span> લાઈવ ૧૬:૯ કેન્વાસ પ્રિવ્યૂ (1280 × 720)
          </h3>
          <button id="btn-download-canvas" class="btn btn-success btn-sm" style="font-weight: 800;">
            <span>💾</span> HD PNG ડાઉનલોડ
          </button>
        </div>

        <!-- Canvas Element -->
        <div style="width: 100%; border-radius: 10px; overflow: hidden; box-shadow: 0 8px 25px rgba(0,0,0,0.5); margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.15);">
          <canvas id="canva-preview-canvas" width="1280" height="720" style="width: 100%; height: auto; display: block;"></canvas>
        </div>

        <!-- Color Themes Selector -->
        <div style="margin-bottom: 12px;">
          <label style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted); display: block; margin-bottom: 6px;">
            કલર થીમ પસંદ કરો:
          </label>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${[
              { id: 'navy-yellow', label: '👑 નેવી + યલો (High CTR)', color: '#0a192f' },
              { id: 'red-gold', label: '🔥 રેડ + ગોલ્ડ (Government)', color: '#991b1b' },
              { id: 'clean-white', label: '⚪ પ્યોર વ્હાઇટ (Official)', color: '#ffffff' },
              { id: 'emerald', label: '🌿 ઇમરાલ્ડ ગ્રીન', color: '#064e3b' }
            ].map(t => `
              <button class="btn btn-sm btn-theme-select ${canvasTheme === t.id ? 'btn-primary' : 'btn-outline'}" data-theme="${t.id}" style="font-size: 0.78rem;">
                ${t.label}
              </button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Right Column: Canvas Text Inputs & Notes -->
      <div class="card" style="border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span>✏️</span> ટેક્સ્ટ & કેન્વા સેટિંગ્સ (Auto-Saved)
          </h3>

          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #e2e8f0; margin-bottom: 4px;">
              ટોચનું બેજ (Top Badge):
            </label>
            <input type="text" id="input-canva-badge" class="form-input" value="${canvasBadge}" style="font-size: 0.9rem; padding: 8px 12px;">
          </div>

          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #e2e8f0; margin-bottom: 4px;">
              મુખ્ય હેડલાઇન (Main 4-5 Words Headline):
            </label>
            <textarea id="input-canva-headline" class="form-textarea" rows="2" style="font-size: 0.95rem; font-weight: 700; padding: 8px 12px; width: 100%;">${canvasHeadline}</textarea>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #e2e8f0; margin-bottom: 4px;">
              સબટાઇટલ / ફૂટર ટેક્સ્ટ:
            </label>
            <input type="text" id="input-canva-subtitle" class="form-input" value="${canvasSubtitle}" style="font-size: 0.88rem; padding: 8px 12px;">
          </div>

          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #e2e8f0; margin-bottom: 4px;">
              કેન્વા પ્રોજેક્ટ લિંક અથવા ડિઝાઇન નોંધ:
            </label>
            <textarea id="input-canva-notes" class="form-textarea" rows="3" placeholder="દા.ત. https://www.canva.com/design/... અથવા ફોટો લેફ્ટ સાઈડ રાખવો..." style="font-size: 0.85rem; width: 100%;">${canva.notes || ''}</textarea>
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); gap: 10px;">
          <button id="btn-prev-editing" class="btn btn-secondary btn-sm" style="font-weight: 700;">
            ← ૫. એડિટિંગ
          </button>
          <button id="btn-next-seo" class="btn btn-success" style="font-weight: 800; padding: 8px 18px;">
            ૭. SEO, ટાઈટલ & ડિસ્ક્રિપ્શન →
          </button>
        </div>
      </div>

    </div>
  `;

  // Draw initial canvas
  setTimeout(drawCanvas, 50);

  // Attach Event Handlers
  container.querySelector('#btn-back-to-projects')?.addEventListener('click', () => {
    navigateTo('projects');
  });

  // Inputs change canvas and auto-save
  container.querySelector('#input-canva-badge')?.addEventListener('input', (e) => {
    canvasBadge = e.target.value;
    updateCanvaState({ badgeText: canvasBadge });
    drawCanvas();
  });

  container.querySelector('#input-canva-headline')?.addEventListener('input', (e) => {
    canvasHeadline = e.target.value;
    updateCanvaState({ headline: canvasHeadline });
    drawCanvas();
  });

  container.querySelector('#input-canva-subtitle')?.addEventListener('input', (e) => {
    canvasSubtitle = e.target.value;
    updateCanvaState({ subtitle: canvasSubtitle });
    drawCanvas();
  });

  container.querySelector('#input-canva-notes')?.addEventListener('input', (e) => {
    updateCanvaState({ notes: e.target.value });
  });

  // Theme buttons
  container.querySelectorAll('.btn-theme-select').forEach(btn => {
    btn.addEventListener('click', () => {
      canvasTheme = btn.getAttribute('data-theme');
      container.querySelectorAll('.btn-theme-select').forEach(b => {
        b.classList.toggle('btn-primary', b === btn);
        b.classList.toggle('btn-outline', b !== btn);
      });
      drawCanvas();
    });
  });

  // Download Canvas as PNG
  container.querySelector('#btn-download-canvas')?.addEventListener('click', () => {
    const canvas = container.querySelector('#canva-preview-canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `canva_thumbnail_${p.name.slice(0, 20)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  // Navigation
  container.querySelector('#btn-prev-editing')?.addEventListener('click', () => {
    navigateTo('editing');
  });
  container.querySelector('#btn-next-seo')?.addEventListener('click', () => {
    navigateTo('seodescription');
  });
}
