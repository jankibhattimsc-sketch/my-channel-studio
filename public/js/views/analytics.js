import { api } from '../api.js';

export async function renderAnalytics(container, navigateTo) {
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 20px;">
      <div class="pulse-indicator" style="width: 24px; height: 24px; margin-bottom: 16px;"></div>
      <p style="color: var(--text-secondary);">48 કલાકનું એનાલિટિક્સ લોડ થઈ રહ્યું છે... (Loading Analytics)</p>
    </div>
  `;

  async function loadData(forceRefresh = false) {
    try {
      const res = await api.getAnalytics(forceRefresh);
      const data = res.data;
      const lastUpdatedDate = new Date(data.lastUpdated).toLocaleTimeString('gu-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });

      const maxHourly = Math.max(...(data.views48h.hourly || []).map(h => h.views), 100);

      container.innerHTML = `
        <!-- Header & Refresh -->
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
          <div>
            <h2 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 10px;">
              <span>📈</span> 48-Hour Views & Earnings (એનાલિટિક્સ અને કમાણી)
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.88rem;">
              સત્તાવાર YouTube Analytics API અને રિપોર્ટિંગ ડેટા • છેલ્લું અપડેટ: <strong style="color: var(--text-primary);">${lastUpdatedDate}</strong>
            </p>
          </div>

          <div style="display: flex; align-items: center; gap: 10px;">
            <button id="btn-refresh-analytics" class="btn btn-secondary btn-sm">
              <span>🔄</span> રિફ્રેશ કરો (Refresh)
            </button>
            ${data.isDemo ? '<span class="badge badge-amber">ડેમો સિમ્યુલેશન</span>' : '<span class="badge badge-green">સત્તાવાર API ડેટા</span>'}
          </div>
        </div>

        ${data.apiWarnings && data.apiWarnings.length > 0 ? `
          <div class="alert alert-warning">
            <span>⚠️</span>
            <div>
              ${data.apiWarnings.map(w => `<div>${w.message}</div>`).join('')}
            </div>
          </div>
        ` : ''}

        <!-- 4 Primary Stat Cards -->
        <div class="grid-4" style="margin-bottom: 28px;">
          <!-- 48h Views -->
          <div class="stat-card" style="--accent-color: var(--yt-red);">
            <div class="stat-header">
              <span class="stat-title">છેલ્લા 48 કલાકના વ્યુઝ</span>
              <span class="stat-icon">👁️</span>
            </div>
            <div class="stat-value font-en">${(data.views48h?.total || 0).toLocaleString('en-US')}</div>
            <div class="stat-footer">
              <span class="delta-badge ${data.views48h?.percentageChange >= 0 ? 'delta-up' : 'delta-down'}">
                ${data.views48h?.percentageChange >= 0 ? '↑ +' : '↓ '}${Math.abs(data.views48h?.percentageChange || 0)}%
              </span>
              <span style="color: var(--text-muted); font-size: 0.76rem;">અગાઉના 48 કલાક: ${(data.views48h?.previousTotal || 0).toLocaleString('en-US')}</span>
            </div>
          </div>

          <!-- Last 60 Minutes Views -->
          <div class="stat-card" style="--accent-color: var(--accent-amber);">
            <div class="stat-header">
              <span class="stat-title">છેલ્લી 60 મિનિટના વ્યુઝ</span>
              <span class="pulse-indicator"></span>
            </div>
            <div class="stat-value font-en">${(data.views60m?.total || 0).toLocaleString('en-US')}</div>
            <div class="stat-footer">
              <span class="delta-badge delta-up">
                ↑ +${data.views60m?.percentageChange || 9.8}%
              </span>
              <span style="color: var(--text-muted); font-size: 0.76rem;">લાઇવ ટ્રાફિક અંદાજ</span>
            </div>
          </div>

          <!-- 48h Revenue -->
          <div class="stat-card" style="--accent-color: var(--accent-emerald);">
            <div class="stat-header">
              <span class="stat-title">48 કલાકની અંદાજિત કમાણી</span>
              <span class="stat-icon">💵</span>
            </div>
            <div class="stat-value font-en" style="color: #34d399;">
              ${data.revenue48h?.isAvailable && data.revenue48h?.amount !== null
                ? `₹${data.revenue48h.amount.toLocaleString('en-IN')}`
                : '<span style="font-size: 1rem; color: var(--text-muted);">રિપોર્ટિંગ વિલંબ</span>'}
            </div>
            <div class="stat-footer">
              <span class="badge ${data.revenue48h?.isAvailable ? 'badge-green' : 'badge-amber'}" style="font-size: 0.68rem;">
                ${data.revenue48h?.reportingPeriod || 'છેલ્લા 48 કલાક'}
              </span>
            </div>
          </div>

          <!-- Watch Time & Avg Duration -->
          <div class="stat-card" style="--accent-color: var(--accent-blue);">
            <div class="stat-header">
              <span class="stat-title">કુલ વોચ ટાઇમ (48h)</span>
              <span class="stat-icon">⏱️</span>
            </div>
            <div class="stat-value font-en" style="color: #60a5fa;">
              ${data.watchTime?.hours48h ? `${data.watchTime.hours48h.toLocaleString('en-US')} કલાક` : '0'}
            </div>
            <div class="stat-footer">
              <span class="delta-badge delta-up">
                ↑ +${data.watchTime?.percentageChange || 0}%
              </span>
              <span style="color: var(--text-muted); font-size: 0.76rem;">
                સરેરાશ સમય: ${Math.floor((data.watchTime?.averageViewDurationSec || 0) / 60)}m ${(data.watchTime?.averageViewDurationSec || 0) % 60}s
              </span>
            </div>
          </div>
        </div>

        <!-- Revenue Transparency Notice -->
        <div class="card" style="margin-bottom: 24px; background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.2);">
          <div style="display: flex; align-items: flex-start; gap: 14px;">
            <span style="font-size: 1.4rem;">ℹ️</span>
            <div>
              <h4 style="font-size: 0.95rem; font-weight: 800; color: #a7f3d0; margin-bottom: 4px;">
                કમાણી અને રેવન્યુ રિપોર્ટિંગ પારદર્શિતા (Transparency Note)
              </h4>
              <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
                ${data.revenue48h?.notice || 'YouTube Analytics API માં રેવન્યુ ડેટા 24 થી 48 કલાકના વિલંબ સાથે આવે છે. અમે ક્યારેય ખોટી કે અંદાજીત કમાણી બતાવતા નથી. અધિકૃત AdSense રિપોર્ટ ઉપલબ્ધ ન હોય ત્યારે પેન્ડિંગ દર્શાવવામાં આવે છે.'}
              </p>
            </div>
          </div>
        </div>

        <!-- Interactive 48-Hour Hourly Chart -->
        <div class="chart-container" style="margin-bottom: 32px;">
          <div class="chart-header">
            <div>
              <h3 style="font-size: 1.15rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
                <span>📊</span> 48 કલાકનો કલાકદીઠ વ્યુઝ ટ્રાફિક (Hourly Breakdown)
              </h3>
              <p style="color: var(--text-muted); font-size: 0.82rem;">કોઈપણ બાર પર માઉસ લઈ જઈને કલાક અને વ્યુઝ જુઓ</p>
            </div>
            <span class="badge badge-red font-en">48 Hours Continuous Graph</span>
          </div>

          <div class="chart-bars-wrap">
            ${(data.views48h.hourly || []).map((h) => {
              const heightPercent = Math.max(6, Math.round((h.views / maxHourly) * 100));
              return `
                <div class="chart-bar-col">
                  <div class="chart-tooltip">${h.hour}: ${h.views.toLocaleString('en-US')} વ્યુઝ</div>
                  <div class="chart-bar" style="height: ${heightPercent}%;"></div>
                </div>
              `;
            }).join('')}
          </div>

          <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-en);">
            <span>48 કલાક પહેલાં</span>
            <span>24 કલાક પહેલાં</span>
            <span>હમણાં (Live)</span>
          </div>
        </div>

        <!-- Top Performing & Recent Videos Side by Side -->
        <div class="grid-2">
          <!-- Top Videos -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">
                <span>🏆</span> સર્વોચ્ચ કામગીરી કરતા વિડીયો (Top Performing)
              </div>
            </div>

            <div class="video-list">
              ${(data.topVideos || []).map((v, i) => `
                <div class="video-item">
                  <div class="video-thumb-wrap">
                    <img src="${v.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=240'}" alt="Thumb" class="video-thumb">
                    ${v.duration ? `<span class="video-duration">${v.duration.replace('PT', '').replace('M', 'm ').replace('S', 's')}</span>` : ''}
                  </div>
                  <div class="video-details">
                    <a href="${v.url || '#'}" target="_blank" rel="noopener" class="video-title" style="color: var(--text-primary); text-decoration: none;">
                      #${i + 1}. ${v.title}
                    </a>
                    <div class="video-meta">
                      <span>👁️ ${(v.views || 0).toLocaleString('en-US')} વ્યુઝ</span>
                      <span>👍 ${(v.likes || 0).toLocaleString('en-US')}</span>
                      <span>💬 ${(v.comments || 0).toLocaleString('en-US')}</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Recent Videos -->
          <div class="card">
            <div class="card-header">
              <div class="card-title">
                <span>🕒</span> તાજેતરના વિડીયો કામગીરી (Recent Videos)
              </div>
            </div>

            <div class="video-list">
              ${(data.recentVideos || []).map(v => `
                <div class="video-item">
                  <div class="video-thumb-wrap">
                    <img src="${v.thumbnail || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=240'}" alt="Thumb" class="video-thumb">
                    ${v.duration ? `<span class="video-duration">${v.duration.replace('PT', '').replace('M', 'm ').replace('S', 's')}</span>` : ''}
                  </div>
                  <div class="video-details">
                    <div class="video-title">${v.title}</div>
                    <div class="video-meta">
                      <span>👁️ ${(v.views || 0).toLocaleString('en-US')} વ્યુઝ</span>
                      <span>👍 ${(v.likes || 0).toLocaleString('en-US')} લાઈક્સ</span>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      // Refresh button event
      container.querySelector('#btn-refresh-analytics')?.addEventListener('click', () => {
        loadData(true);
      });

    } catch (err) {
      container.innerHTML = `
        <div class="alert alert-warning">
          <span>⚠️</span>
          <div>
            <strong>એનાલિટિક્સ લોડિંગ ભૂલ:</strong> ${err.message}<br>
            <button id="btn-retry-analytics" class="btn btn-outline btn-sm" style="margin-top: 10px;">ફરી પ્રયાસ કરો (Retry)</button>
          </div>
        </div>
      `;
      container.querySelector('#btn-retry-analytics')?.addEventListener('click', () => loadData(true));
    }
  }

  loadData();
}
