import { api } from '../api.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { showOAuthConnectModal } from '../utils/modal.js';

export async function renderHome(container, navigateTo) {
  container.innerHTML = `
    <div style="text-align: center; padding: 60px 20px;">
      <div class="pulse-indicator" style="width: 24px; height: 24px; margin-bottom: 16px;"></div>
      <p style="color: var(--text-secondary); font-size: 1.1rem;">ડેટા લોડ થઈ રહ્યો છે... (Loading Dashboard)</p>
    </div>
  `;

  try {
    const [authRes, analyticsRes, topicsRes] = await Promise.all([
      api.getAuthStatus(),
      api.getAnalytics(),
      api.getTrendingTopics('all')
    ]);

    const channel = authRes.channel || {};
    const analytics = analyticsRes.data || {};
    const topTopic = (topicsRes.topics && topicsRes.topics[0]) || null;
    const isConnected = authRes.isConnected;
    const isDemo = authRes.isDemo;

    container.innerHTML = `
      <!-- Connection Hero Banner -->
      <div class="card" style="margin-bottom: 28px; background: linear-gradient(135deg, rgba(255,0,0,0.12), rgba(17,23,38,0.9)); border-color: rgba(255,0,0,0.3);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px;">
          <div style="display: flex; align-items: center; gap: 18px;">
            <img src="${channel.avatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80'}"
                 alt="Channel Avatar"
                 style="width: 64px; height: 64px; border-radius: 50%; border: 3px solid var(--yt-red); object-fit: cover; box-shadow: 0 4px 16px var(--yt-red-glow);">
            <div>
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                <h2 style="font-size: 1.4rem; font-weight: 800;">${channel.title || 'ગુજરાતી ચેનલ'}</h2>
                ${isDemo ? '<span class="badge badge-amber">ડેમો ચેનલ (Demo Mode)</span>' : '<span class="badge badge-green">✓ કનેક્ટેડ (Connected)</span>'}
              </div>
              <p style="color: var(--text-secondary); font-size: 0.88rem;">
                ${channel.customUrl || '@Creator'} • <span class="font-en">${(channel.subscriberCount || 0).toLocaleString('en-US')}</span> સબ્સ્ક્રાઇબર્સ • <span class="font-en">${channel.videoCount || 0}</span> વિડીયો
              </p>
            </div>
          </div>

          <!-- Channel Connection Actions -->
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            ${!isConnected ? `
              <button id="btn-connect-channel" class="btn btn-connect-yt">
                <span>🔴</span> Connect My YouTube Channel
              </button>
            ` : `
              ${authRes.channels && authRes.channels.length > 1 ? `
                <select id="channel-switcher" class="form-select" style="width: auto; padding: 8px 14px; font-size: 0.85rem;">
                  ${authRes.channels.map(ch => `
                    <option value="${ch.id}" ${ch.id === channel.id ? 'selected' : ''}>${ch.title}</option>
                  `).join('')}
                </select>
              ` : ''}
              <button id="btn-disconnect" class="btn btn-secondary btn-sm" title="ચેનલ ડિસ્કનેક્ટ કરો">
                <span>🔌</span> ડિસ્કનેક્ટ (Disconnect)
              </button>
              <button id="btn-reconnect" class="btn btn-outline btn-sm">
                <span>🔄</span> રીકનેક્ટ (Reconnect)
              </button>
            `}
            <button id="btn-toggle-demo" class="btn ${isDemo ? 'btn-warning' : 'btn-outline'} btn-sm" title="ડેમો / રીઅલ મોડ સ્વિચ કરો">
              <span>🎭</span> ${isDemo ? 'ડેમો મોડ સક્રિય' : 'ડેમો મોડ ચાલુ કરો'}
            </button>
          </div>
        </div>

        ${isDemo ? `
          <div class="alert alert-info" style="margin-top: 20px; margin-bottom: 0;">
            <span style="font-size: 1.2rem;">💡</span>
            <div>
              <strong>સૂચના:</strong> હાલમાં તમે વાસ્તવિક જેવો જ ડેમો ડેટા જોઈ રહ્યા છો જેથી તમે દરેક ફીચર ટેસ્ટ કરી શકો. તમારી પોતાની સત્તાવાર YouTube ચેનલ જોડવા માટે <strong>"Connect My YouTube Channel"</strong> બટન દબાવો અથવા સેટિંગ્સમાં Google Client ID દાખલ કરો.
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Priority 1: Channel Performance Overview (48-Hour Analytics) -->
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
        <h3 style="font-size: 1.15rem; font-weight: 800; display: flex; align-items: center; gap: 8px;">
          <span>📊</span> ચેનલ કામગીરી (Channel Performance Overview)
        </h3>
        <button id="btn-goto-analytics" class="btn btn-outline btn-sm">
          સંપૂર્ણ 48h એનાલિટિક્સ જુઓ →
        </button>
      </div>

      <div class="grid-4" style="margin-bottom: 32px;">
        <!-- Card 1: 48h Views -->
        <div class="stat-card" style="--accent-color: var(--yt-red);">
          <div class="stat-header">
            <span class="stat-title">છેલ્લા 48 કલાકના વ્યુઝ</span>
            <span class="stat-icon">👁️</span>
          </div>
          <div class="stat-value font-en">${(analytics.views48h?.total || 0).toLocaleString('en-US')}</div>
          <div class="stat-footer">
            <span class="delta-badge ${analytics.views48h?.percentageChange >= 0 ? 'delta-up' : 'delta-down'}">
              ${analytics.views48h?.percentageChange >= 0 ? '↑ +' : '↓ '}${Math.abs(analytics.views48h?.percentageChange || 0)}%
            </span>
            <span style="color: var(--text-muted); font-size: 0.76rem;">ગત 48 કલાકની સરખામણીએ</span>
          </div>
        </div>

        <!-- Card 2: 60 Min Views -->
        <div class="stat-card" style="--accent-color: var(--accent-amber);">
          <div class="stat-header">
            <span class="stat-title">છેલ્લી 60 મિનિટના વ્યુઝ</span>
            <span class="pulse-indicator"></span>
          </div>
          <div class="stat-value font-en">${(analytics.views60m?.total || 0).toLocaleString('en-US')}</div>
          <div class="stat-footer">
            <span class="delta-badge delta-up">
              ↑ +${analytics.views60m?.percentageChange || 9.8}%
            </span>
            <span style="color: var(--text-muted); font-size: 0.76rem;">રીઅલ-ટાઇમ પ્રવાહ</span>
          </div>
        </div>

        <!-- Card 3: 48h Revenue -->
        <div class="stat-card" style="--accent-color: var(--accent-emerald);">
          <div class="stat-header">
            <span class="stat-title">48 કલાકની અંદાજિત કમાણી</span>
            <span class="stat-icon">💰</span>
          </div>
          <div class="stat-value font-en" style="color: #34d399;">
            ${analytics.revenue48h?.isAvailable && analytics.revenue48h?.amount !== null
              ? `₹${analytics.revenue48h.amount.toLocaleString('en-IN')}`
              : '<span style="font-size: 1.1rem; color: var(--text-muted);">રિપોર્ટિંગ વિલંબ</span>'}
          </div>
          <div class="stat-footer">
            <span class="badge ${analytics.revenue48h?.isAvailable ? 'badge-green' : 'badge-amber'}" style="font-size: 0.7rem;">
              ${analytics.revenue48h?.status === 'verified' ? 'YouTube Verified' : analytics.revenue48h?.status === 'verified_simulated' ? 'ડેમો અંદાજ' : 'AdSense પેન્ડિંગ'}
            </span>
          </div>
        </div>

        <!-- Card 4: Subscribers Change -->
        <div class="stat-card" style="--accent-color: var(--accent-blue);">
          <div class="stat-header">
            <span class="stat-title">48h સબ્સ્ક્રાઇબર ફેરફાર</span>
            <span class="stat-icon">👥</span>
          </div>
          <div class="stat-value font-en" style="color: #60a5fa;">
            +${(analytics.subscribers?.netChange48h || 0).toLocaleString('en-US')}
          </div>
          <div class="stat-footer">
            <span class="delta-badge delta-up">
              ↑ +${analytics.subscribers?.percentageChange || 0}%
            </span>
            <span style="color: var(--text-muted); font-size: 0.76rem;">કુલ: ${(analytics.subscribers?.total || channel.subscriberCount || 0).toLocaleString('en-US')}</span>
          </div>
        </div>
      </div>

      <!-- Priority 2 & 3 Grid: Trending Topic of the Day & ChatGPT Assistant Direct Launch -->
      <div class="grid-2" style="margin-bottom: 32px;">
        <!-- Priority 2: Trending Topic Recommendation -->
        <div class="card" style="border-left: 4px solid var(--yt-red);">
          <div class="card-header">
            <div class="card-title">
              <span>🔥</span> આજે કયા ટોપિક પર વિડીયો બનાવવો?
            </div>
            <span class="badge badge-red font-en">${topTopic ? `${topTopic.scores.overall}/100 સ્કોર` : '96/100'}</span>
          </div>

          ${topTopic ? `
            <div style="margin-bottom: 16px;">
              <h4 style="font-size: 1.15rem; font-weight: 800; color: #ffffff; line-height: 1.4; margin-bottom: 8px;">
                ${topTopic.topicGujarati}
              </h4>
              <p style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.5; margin-bottom: 12px;">
                <strong>દર્શકો કેમ જોશે?</strong> ${topTopic.whyViewersWatch}
              </p>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <span class="badge badge-amber">${topTopic.badge || 'સુપર ટ્રેન્ડ'}</span>
                <span class="badge badge-blue">ફોર્મેટ: ${topTopic.suggestedFormat}</span>
                <span class="badge badge-purple">સ્પર્ધા: ${topTopic.competitionLevel}</span>
              </div>
            </div>

            <div style="display: flex; gap: 10px; flex-wrap: wrap; pt-2; border-top: 1px solid var(--bg-card-border); padding-top: 14px;">
              <button class="btn btn-primary btn-sm action-generate-seo" data-topic="${encodeURIComponent(topTopic.topicGujarati)}">
                🚀 SEO જનરેટ કરો
              </button>
              <button class="btn btn-secondary btn-sm action-write-script" data-topic="${encodeURIComponent(topTopic.topicGujarati)}">
                ✍️ સ્ક્રિપ્ટ લખો
              </button>
              <button class="btn btn-outline btn-sm action-make-thumb" data-topic="${encodeURIComponent(topTopic.topicGujarati)}">
                🎨 થંબનેલ બનાવો
              </button>
              <button class="btn btn-outline btn-sm action-slide-prompt" data-topic="${encodeURIComponent(topTopic.topicGujarati)}" style="border-color: #8b5cf6; color: #c4b5fd;">
                📑 સ્લાઇડ પ્રોમ્પ્ટ (NotebookLM)
              </button>
              <button id="btn-see-all-topics" class="btn btn-outline btn-sm" style="margin-left: auto;">
                બધા 10 ટોપિક જુઓ →
              </button>
            </div>
          ` : `
            <p style="color: var(--text-secondary);">ટોપિક્સ લોડ થઈ રહ્યા છે...</p>
          `}
        </div>

        <!-- Priority 3: Built-in ChatGPT Assistant Direct Card -->
        <div class="card" style="border-left: 4px solid var(--accent-emerald); background: linear-gradient(135deg, rgba(16,185,129,0.06), rgba(17,23,38,0.85));">
          <div class="card-header">
            <div class="card-title">
              <span>✨</span> ChatGPT ક્રિએટર આસિસ્ટન્ટ (Built-in)
            </div>
            <span class="badge badge-green">ઓફિશિયલ OpenAI API</span>
          </div>

          <p style="color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 16px;">
            કોઈ બીજી એપ ખોલવાની જરૂર નથી! અહીંથી સીધો ગુજરાતીમાં સવાલ પૂછો, સ્ક્રિપ્ટ સુધારો કે તમારી ચેનલનું એનાલિટિક્સ એનાલાઈઝ કરાવો:
          </p>

          <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px;">
            <button class="quick-chat-prompt btn btn-secondary btn-sm" style="text-align: left; justify-content: flex-start;" data-prompt="મારી ચેનલ માટે આજના 3 શ્રેષ્ઠ અને વાયરલ વિડીયો આઈડિયા આપો">
              💡 "મારી ચેનલ માટે આજના 3 વાયરલ આઈડિયા આપો"
            </button>
            <button class="quick-chat-prompt btn btn-secondary btn-sm" style="text-align: left; justify-content: flex-start;" data-prompt="મારા છેલ્લા 48 કલાકના વ્યુઝ અને એનાલિટિક્સનું વિશ્લેષણ કરીને ઓડિયન્સ રીટેન્શન વધારવાની સલાહ આપો">
              📊 "મારા 48 કલાકના એનાલિટિક્સનું વિશ્લેષણ કરો"
            </button>
            <button class="quick-chat-prompt btn btn-secondary btn-sm" style="text-align: left; justify-content: flex-start;" data-prompt="નવા સરકારી નિયમો પર 60 સેકન્ડના વાયરલ શોર્ટ્સ માટે દમદાર સ્ક્રિપ્ટ લખો">
              ⚡ "60 સેકન્ડ શોર્ટ્સ માટે સ્ક્રિપ્ટ લખો"
            </button>
          </div>

          <button id="btn-open-chatgpt" class="btn btn-success btn-block">
            <span>💬</span> ChatGPT આસિસ્ટન્ટ સાથે વાત કરો
          </button>
        </div>
      </div>

      <!-- Quick Actions Grid -->
      <div class="card">
        <h4 style="font-size: 1.05rem; font-weight: 800; margin-bottom: 16px;">
          ⚡ ત્વરિત સાધનો (All-In-One Studio Tools)
        </h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px;">
          <button class="btn btn-secondary tool-btn" data-target="topics" style="padding: 16px; flex-direction: column; gap: 8px;">
            <span style="font-size: 1.5rem;">🔥</span>
            <span>ટ્રેન્ડિંગ ટોપિક્સ (Topics)</span>
          </button>
          <button class="btn btn-secondary tool-btn" data-target="seo" style="padding: 16px; flex-direction: column; gap: 8px;">
            <span style="font-size: 1.5rem;">🚀</span>
            <span>SEO જનરેટર (One-Click)</span>
          </button>
          <button class="btn btn-secondary tool-btn" data-target="thumbnails" style="padding: 16px; flex-direction: column; gap: 8px;">
            <span style="font-size: 1.5rem;">🎨</span>
            <span>થંબનેલ સ્ટુડિયો (Canvas)</span>
          </button>
          <button class="btn btn-secondary tool-btn" data-target="scriptwriter" style="padding: 16px; flex-direction: column; gap: 8px;">
            <span style="font-size: 1.5rem;">✍️</span>
            <span>સ્ક્રિપ્ટ રાઇટર (Script)</span>
          </button>
          <button class="btn btn-secondary tool-btn" data-target="myvoice" style="padding: 16px; flex-direction: column; gap: 8px; border-color: rgba(236,72,153,0.4); background: rgba(236,72,153,0.05);">
            <span style="font-size: 1.5rem;">🎙️</span>
            <span>My Voice (ક્લોનિંગ)</span>
            <span class="badge" style="background: rgba(236,72,153,0.2); color: #f472b6; font-size: 0.65rem;">8tLk...</span>
          </button>
          <button class="btn btn-secondary tool-btn" data-target="slideprompts" style="padding: 16px; flex-direction: column; gap: 8px; border-color: rgba(139,92,246,0.35);">
            <span style="font-size: 1.5rem;">📑</span>
            <span>NotebookLM સ્લાઇડ્સ</span>
          </button>
          <button class="btn btn-secondary tool-btn" data-target="research" style="padding: 16px; flex-direction: column; gap: 8px;">
            <span style="font-size: 1.5rem;">🔍</span>
            <span>વિડીયો રિસર્ચ (Competitor)</span>
          </button>
          <button class="btn btn-secondary tool-btn" data-target="settings" style="padding: 16px; flex-direction: column; gap: 8px;">
            <span style="font-size: 1.5rem;">⚙️</span>
            <span>સેટિંગ્સ (API Keys)</span>
          </button>
        </div>
      </div>
    `;

    // Attach Event Handlers
    // 1. Connect Channel
    const connectBtn = container.querySelector('#btn-connect-channel');
    if (connectBtn) {
      connectBtn.addEventListener('click', async () => {
        try {
          const res = await api.getGoogleAuthUrl();
          if (res.url) {
            window.location.href = res.url;
          }
        } catch (err) {
          showOAuthConnectModal(navigateTo);
        }
      });
    }

    // 2. Disconnect & Reconnect
    const disconnectBtn = container.querySelector('#btn-disconnect');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', async () => {
        if (confirm('શું તમે ખરેખર ચેનલ ડિસ્કનેક્ટ કરવા માંગો છો?')) {
          await api.disconnectChannel();
          renderHome(container, navigateTo);
        }
      });
    }

    const reconnectBtn = container.querySelector('#btn-reconnect');
    if (reconnectBtn) {
      reconnectBtn.addEventListener('click', async () => {
        try {
          const res = await api.getGoogleAuthUrl();
          if (res.url) window.location.href = res.url;
        } catch (err) {
          showOAuthConnectModal(navigateTo);
        }
      });
    }

    // 3. Switch Channel
    const channelSwitcher = container.querySelector('#channel-switcher');
    if (channelSwitcher) {
      channelSwitcher.addEventListener('change', async (e) => {
        await api.switchChannel(e.target.value);
        renderHome(container, navigateTo);
      });
    }

    // 4. Toggle Demo Mode
    const toggleDemoBtn = container.querySelector('#btn-toggle-demo');
    if (toggleDemoBtn) {
      toggleDemoBtn.addEventListener('click', async () => {
        await api.toggleDemoMode();
        renderHome(container, navigateTo);
      });
    }

    // 5. Navigation buttons
    container.querySelector('#btn-goto-analytics')?.addEventListener('click', () => navigateTo('analytics'));
    container.querySelector('#btn-see-all-topics')?.addEventListener('click', () => navigateTo('topics'));
    container.querySelector('#btn-open-chatgpt')?.addEventListener('click', () => navigateTo('chatgpt'));

    // Quick Action prompts into ChatGPT
    container.querySelectorAll('.quick-chat-prompt').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prompt = e.currentTarget.getAttribute('data-prompt');
        window.pendingChatPrompt = prompt;
        navigateTo('chatgpt');
      });
    });

    // Topic quick actions
    container.querySelector('.action-generate-seo')?.addEventListener('click', (e) => {
      const topic = decodeURIComponent(e.currentTarget.getAttribute('data-topic'));
      window.prefillTopic = topic;
      navigateTo('seo');
    });

    container.querySelector('.action-write-script')?.addEventListener('click', (e) => {
      const topic = decodeURIComponent(e.currentTarget.getAttribute('data-topic'));
      window.prefillTopic = topic;
      navigateTo('scriptwriter');
    });

    container.querySelector('.action-make-thumb')?.addEventListener('click', (e) => {
      const topic = decodeURIComponent(e.currentTarget.getAttribute('data-topic'));
      window.prefillTopic = topic;
      navigateTo('thumbnails');
    });

    container.querySelector('.action-slide-prompt')?.addEventListener('click', (e) => {
      const topic = decodeURIComponent(e.currentTarget.getAttribute('data-topic'));
      window.prefillTopic = topic;
      navigateTo('slideprompts');
    });

    // Tool navigation buttons
    container.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        navigateTo(target);
      });
    });

  } catch (err) {
    container.innerHTML = `
      <div class="alert alert-warning">
        <span>⚠️</span>
        <div>
          <strong>ડેશબોર્ડ લોડ કરવામાં ભૂલ:</strong> ${err.message}<br>
          <button id="btn-retry-home" class="btn btn-outline btn-sm" style="margin-top: 10px;">ફરી પ્રયાસ કરો (Retry)</button>
        </div>
      </div>
    `;
    container.querySelector('#btn-retry-home')?.addEventListener('click', () => renderHome(container, navigateTo));
  }
}
