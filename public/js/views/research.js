import { api } from '../api.js';
import { copyToClipboard, showNoticeToast } from '../utils/clipboard.js';

export async function renderResearch(container, navigateTo) {
  container.innerHTML = `
    <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
      <div>
        <h2 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 10px;">
          <span>🔍</span> Competitor & Video Research (સ્પર્ધક અને વિડીયો વિશ્લેષણ)
        </h2>
        <p style="color: var(--text-secondary); font-size: 0.88rem;">
          જાહેર YouTube વિડીયો લિંક પેસ્ટ કરો • શા માટે વાયરલ થયો? થંબનેલ રણનીતિ અને 5 ઓરિજિનલ નવા એંગલ
        </p>
      </div>
    </div>

    <!-- URL Input Card -->
    <div class="card" style="margin-bottom: 24px;">
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <input type="text" id="research-url-input" class="form-input" style="flex: 1; min-width: 280px;"
               placeholder="કોઈપણ પબ્લિક YouTube વિડીયોની લિંક પેસ્ટ કરો (દા.ત. https://www.youtube.com/watch?v=...)..."
               value="https://www.youtube.com/watch?v=dQw4w9WgXcQ">
        <button id="btn-paste-clipboard" class="btn btn-secondary">
          <span>📋</span> પેસ્ટ (Paste)
        </button>
        <button id="btn-analyze-video" class="btn btn-primary">
          <span>⚡</span> વિશ્લેષણ કરો (Analyze)
        </button>
      </div>
      <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 8px;">
        નોંધ: આ વિશ્લેષણ માત્ર સત્તાવાર સાર્વજનિક માહિતી (Public Data) પર આધારિત છે. કોઈ ખાનગી સ્ટુડિયો ડેટા શામેલ નથી.
      </p>
    </div>

    <!-- Output Analysis Area -->
    <div id="research-results-area">
      <!-- Populated dynamically -->
    </div>
  `;

  const urlInput = container.querySelector('#research-url-input');
  const analyzeBtn = container.querySelector('#btn-analyze-video');
  const pasteBtn = container.querySelector('#btn-paste-clipboard');
  const resultsArea = container.querySelector('#research-results-area');

  pasteBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) urlInput.value = text.trim();
    } catch {
      showNoticeToast('ક્લિપબોર્ડ પરવાનગી ઉપલબ્ધ નથી, મેન્યુઅલી પેસ્ટ કરો.', 'warning');
    }
  });

  async function analyzeVideo() {
    const url = urlInput.value.trim();
    if (!url) {
      showNoticeToast('કૃપા કરીને વિડીયો લિંક પેસ્ટ કરો.', 'warning');
      return;
    }

    resultsArea.innerHTML = `
      <div style="text-align: center; padding: 50px;">
        <div class="pulse-indicator" style="width: 24px; height: 24px; margin-bottom: 12px;"></div>
        <p style="color: var(--text-secondary);">વિડીયો મેટાડેટા અને સ્પર્ધાત્મક વિશ્લેષણ થઈ રહ્યું છે...</p>
      </div>
    `;

    try {
      const res = await api.researchVideo(url);
      const report = res.report;
      const meta = report.videoMetadata;
      const ana = report.analysis;
      const researchDate = new Date(report.researchDate).toLocaleDateString('gu-IN', {
        day: 'numeric', month: 'long', year: 'numeric'
      });

      resultsArea.innerHTML = `
        <!-- Video Header Preview Card -->
        <div class="card" style="margin-bottom: 24px;">
          <div style="display: flex; gap: 20px; flex-wrap: wrap; align-items: center;">
            <img src="${meta.thumbnail}" alt="Thumb" style="width: 200px; aspect-ratio: 16/9; object-fit: cover; border-radius: 8px; border: 1px solid var(--bg-card-border);">
            <div style="flex: 1;">
              <span class="badge badge-blue" style="margin-bottom: 6px;">સત્તાવાર વિડીયો વિશ્લેષણ</span>
              <h3 style="font-size: 1.15rem; font-weight: 800; color: #ffffff; line-height: 1.4; margin-bottom: 6px;">
                ${meta.title}
              </h3>
              <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 8px;">
                ચેનલ: <strong>${meta.channelTitle}</strong> •
                વ્યુઝ: <strong class="font-en">${meta.views ? meta.views.toLocaleString('en-US') : 'સાર્વજનિક'}</strong> •
                તારીખ: ${researchDate}
              </p>
              <a href="${meta.url}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
                <span>🔗</span> YouTube પર ખોલો
              </a>
            </div>
          </div>
        </div>

        <!-- 4 Analysis Cards -->
        <div class="grid-2" style="margin-bottom: 24px;">
          <!-- 1. Why it worked -->
          <div class="card" style="border-left: 4px solid var(--accent-emerald);">
            <div class="card-title" style="margin-bottom: 12px;">
              <span>🧠</span> આ વિડીયો ચાલવા પાછળનું મનોવિજ્ઞાન (Why it Worked)
            </div>
            <p style="font-size: 0.9rem; line-height: 1.6; color: var(--text-primary);">
              ${ana.whyItWorked}
            </p>
          </div>

          <!-- 2. Thumbnail Breakdown -->
          <div class="card" style="border-left: 4px solid var(--accent-amber);">
            <div class="card-title" style="margin-bottom: 12px;">
              <span>🎨</span> થંબનેલ અને પ્રેઝન્ટેશન વિશ્લેષણ (Thumbnail Strategy)
            </div>
            <p style="font-size: 0.9rem; line-height: 1.6; color: var(--text-primary);">
              ${ana.thumbnailBreakdown}
            </p>
          </div>
        </div>

        <!-- Missing Gaps & Opportunities -->
        <div class="card" style="margin-bottom: 24px; background: rgba(59, 130, 246, 0.05); border-color: rgba(59, 130, 246, 0.25);">
          <div class="card-title" style="margin-bottom: 10px; color: #93c5fd;">
            <span>💡</span> આ વિડીયોમાં શું ખૂટે છે? તમારી તક (Content Gaps & Opportunity)
          </div>
          <p style="font-size: 0.92rem; line-height: 1.6;">
            ${ana.missingGaps}
          </p>
        </div>

        <!-- 5 Competitive Angles You Can Create -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">
              <span>🚀</span> ૫ ઓરિજિનલ ગુજરાતી વિડીયો એંગલ (5 Original Angles to Outperform)
            </div>
            <span class="badge badge-red font-en">Creative Angles</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
            ${(ana.competitiveAngles || []).map((ang, i) => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: rgba(255,255,255,0.03); border-radius: 8px; border: 1px solid var(--bg-card-border);">
                <span style="font-weight: 700; font-size: 0.95rem;">${ang}</span>
                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-outline btn-sm action-take-angle" data-topic="${encodeURIComponent(ang)}">
                    આના પર સ્ક્રિપ્ટ બનાવો
                  </button>
                  <button class="btn btn-secondary btn-sm copy-btn" data-copy="${ang}">
                    📋 Copy
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Suggested New Title -->
          <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 14px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
            <div>
              <span style="font-size: 0.8rem; color: #34d399; font-weight: 700;">આ વિડીયોને હરાવવા માટે તમારું નવું ટાઈટલ:</span>
              <h4 style="font-size: 1.05rem; font-weight: 800; color: #ffffff; margin-top: 4px;">"${ana.suggestedNewTitle}"</h4>
            </div>
            <button class="btn btn-success btn-sm copy-btn" data-copy="${ana.suggestedNewTitle}">
              📋 ટાઈટલ કોપી કરો
            </button>
          </div>
        </div>
      `;

      // Events
      resultsArea.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const text = e.currentTarget.getAttribute('data-copy');
          copyToClipboard(text, 'કોપી થઈ ગયું!');
        });
      });

      resultsArea.querySelectorAll('.action-take-angle').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const topic = decodeURIComponent(e.currentTarget.getAttribute('data-topic'));
          window.prefillTopic = topic;
          navigateTo('scriptwriter');
        });
      });

    } catch (err) {
      resultsArea.innerHTML = `
        <div class="alert alert-warning">
          <span>⚠️</span>
          <div>વિશ્લેષણ કરવામાં ભૂલ: ${err.message}</div>
        </div>
      `;
    }
  }

  analyzeBtn.addEventListener('click', analyzeVideo);
}
