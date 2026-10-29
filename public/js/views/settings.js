import { api } from '../api.js';
import { copyToClipboard } from '../utils/clipboard.js';

export async function renderSettings(container, navigateTo) {
  container.innerHTML = `
    <div style="text-align: center; padding: 40px;">
      <div class="pulse-indicator"></div>
      <p style="color: var(--text-secondary);">સેટિંગ્સ લોડ થઈ રહી છે...</p>
    </div>
  `;

  try {
    const res = await api.getSettings();
    const s = res.settings || {};
    const status = res.status || {};
    const guides = res.setupGuides || {};

    container.innerHTML = `
      <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;">
        <div>
          <h2 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 10px;">
            <span>⚙️</span> Settings & API Configuration (સેટિંગ્સ અને સેટઅપ)
          </h2>
          <p style="color: var(--text-secondary); font-size: 0.88rem;">
            Google Cloud Console OAuth, YouTube Studio Scopes, અને OpenAI ChatGPT કી સંચાલન
          </p>
        </div>

        <button id="btn-save-settings" class="btn btn-primary">
          <span>💾</span> સેટિંગ્સ સેવ કરો (Save Settings)
        </button>
      </div>

      <!-- Current Status Banners -->
      <div class="grid-2" style="margin-bottom: 24px;">
        <div class="card" style="border-left: 4px solid ${status.isGoogleConfigured ? 'var(--accent-emerald)' : 'var(--accent-amber)'};">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <h4 style="font-size: 1.05rem; font-weight: 800; color: #ffffff;">Google OAuth / YouTube API</h4>
              <p style="font-size: 0.82rem; color: var(--text-secondary);">
                ${status.isGoogleConfigured ? 'સત્તાવાર Google Credentials સક્રિય છે.' : 'Google Credentials બાકી છે (ડેમો મોડ ઉપલબ્ધ).'}
              </p>
            </div>
            <span class="badge ${status.isGoogleConfigured ? 'badge-green' : 'badge-amber'}">
              ${status.isGoogleConfigured ? '✓ Configured' : 'Needs Setup'}
            </span>
          </div>
        </div>

        <div class="card" style="border-left: 4px solid ${status.isOpenAIConfigured ? 'var(--accent-emerald)' : 'var(--accent-amber)'};">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <h4 style="font-size: 1.05rem; font-weight: 800; color: #ffffff;">OpenAI API (ChatGPT & DALL-E)</h4>
              <p style="font-size: 0.82rem; color: var(--text-secondary);">
                ${status.isOpenAIConfigured ? `મોડેલ: ${status.activeModel} સક્રિય છે.` : 'OpenAI Key બાકી છે (બિલ્ટ-ઇન લોકલ એન્જિન ઉપલબ્ધ).'}
              </p>
            </div>
            <span class="badge ${status.isOpenAIConfigured ? 'badge-green' : 'badge-amber'}">
              ${status.isOpenAIConfigured ? '✓ Configured' : 'Local Fallback'}
            </span>
          </div>
        </div>
      </div>

      <!-- Settings Form -->
      <div class="card" style="margin-bottom: 28px;">
        <h3 style="font-size: 1.2rem; font-weight: 800; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
          <span>🔑</span> API Credentials (સુરક્ષિત બેકએન્ડ સ્ટોરેજ)
        </h3>

        <div style="display: flex; flex-direction: column; gap: 18px;">
          <!-- Google Client ID -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Google OAuth 2.0 Client ID:</label>
            <input type="text" id="setting-google-id" class="form-input" placeholder="xxxxxx-xxxxxx.apps.googleusercontent.com" value="${s.googleClientIdFull || ''}">
          </div>

          <!-- Google Client Secret -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Google OAuth 2.0 Client Secret:</label>
            <input type="password" id="setting-google-secret" class="form-input" placeholder="${s.googleClientSecretConfigured ? '•••••••••••••••• (પહેલેથી સેટ કરેલ છે, બદલવા માટે નવું લખો)' : 'Client Secret પેસ્ટ કરો'}">
          </div>

          <!-- Google Redirect URI Display -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Google Cloud Console Authorized Redirect URI:</label>
            <div style="display: flex; gap: 10px;">
              <input type="text" id="setting-google-redirect" class="form-input font-en" value="${s.googleRedirectUri || 'http://localhost:5000/api/auth/google/callback'}" readonly>
              <button class="btn btn-secondary copy-btn" data-copy="${s.googleRedirectUri || 'http://localhost:5000/api/auth/google/callback'}">
                📋 Copy
              </button>
            </div>
            <span style="font-size: 0.74rem; color: var(--text-muted); margin-top: 4px; display: block;">
              આ URI ને Google Cloud Console માં "Authorized redirect URIs" માં ચોક્કસ પેસ્ટ કરો.
            </span>
          </div>

          <!-- OpenAI API Key -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">OpenAI API Key (sk-...):</label>
            <input type="password" id="setting-openai-key" class="form-input font-en" placeholder="${s.openaiApiKeyConfigured ? `${s.openaiApiKeyMasked} (પહેલેથી સેટ છે, નવું લખવા અહી ટાઈપ કરો)` : 'sk-proj-xxxxxxxxxxxxxxxxxxxx'}">
          </div>

          <!-- OpenAI Model -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">OpenAI મોડેલ સિલેક્શન (AI Model):</label>
            <select id="setting-openai-model" class="form-select">
              <option value="gpt-4o" ${s.openaiModel === 'gpt-4o' ? 'selected' : ''}>GPT-4o (સૌથી વધુ શક્તિશાળી, સ્ક્રિપ્ટ્સ & ક્રિએટિવિટી)</option>
              <option value="gpt-4o-mini" ${s.openaiModel === 'gpt-4o-mini' ? 'selected' : ''}>GPT-4o Mini (અતિ ઝડપી અને ઓછી કિંમત)</option>
              <option value="gpt-3.5-turbo" ${s.openaiModel === 'gpt-3.5-turbo' ? 'selected' : ''}>GPT-3.5 Turbo</option>
            </select>
          </div>

          <!-- Demo Mode Switch -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px solid var(--bg-card-border);">
            <div>
              <strong style="display: block; font-size: 0.95rem;">ડેમો મોડ (Demo Channel Mode)</strong>
              <span style="font-size: 0.8rem; color: var(--text-muted);">જ્યારે ગૂગલ કે ઓપનએઆઈ કી ન હોય ત્યારે પણ ગુજરાતી ક્રિએટર ડેમો ડેટા સક્રિય રહેશે.</span>
            </div>
            <input type="checkbox" id="setting-demo-mode" ${s.demoMode ? 'checked' : ''} style="width: 22px; height: 22px; accent-color: var(--yt-red); cursor: pointer;">
          </div>
        </div>
      </div>

      <!-- Step-by-Step Setup Guides -->
      <div class="grid-2">
        <!-- Google Cloud Setup Guide -->
        <div class="card">
          <div class="card-title" style="margin-bottom: 14px;">
            <span>📘</span> Google Cloud OAuth સેટઅપ ગાઈડ (YouTube APIs)
          </div>
          <ol style="padding-left: 20px; font-size: 0.86rem; line-height: 1.8; color: var(--text-secondary);">
            ${(guides.google || []).map(step => `<li>${step}</li>`).join('')}
          </ol>
        </div>

        <!-- OpenAI Setup Guide -->
        <div class="card">
          <div class="card-title" style="margin-bottom: 14px;">
            <span>📗</span> OpenAI API સેટઅપ ગાઈડ (ChatGPT & AI Studio)
          </div>
          <ol style="padding-left: 20px; font-size: 0.86rem; line-height: 1.8; color: var(--text-secondary);">
            ${(guides.openai || []).map(step => `<li>${step}</li>`).join('')}
          </ol>

          <div class="alert alert-info" style="margin-top: 16px;">
            <span>💡</span>
            <div style="font-size: 0.8rem;">
              <strong>નોંધ:</strong> ChatGPT Plus સબસ્ક્રિપ્શનમાં OpenAI API આપોઆપ શામેલ નથી હોતું. API વાપરવા માટે platform.openai.com પર અલગથી પે-એઝ-યુ-ગો ક્રેડિટ ઉમેરવી પડે છે.
            </div>
          </div>
        </div>
      </div>
    `;

    // Copy URI
    container.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const text = e.currentTarget.getAttribute('data-copy');
        copyToClipboard(text, 'લિંક કોપી થઈ ગઈ!');
      });
    });

    // Save Settings
    container.querySelector('#btn-save-settings')?.addEventListener('click', async () => {
      const gId = container.querySelector('#setting-google-id').value;
      const gSecret = container.querySelector('#setting-google-secret').value;
      const gRedirect = container.querySelector('#setting-google-redirect').value;
      const oKey = container.querySelector('#setting-openai-key').value;
      const oModel = container.querySelector('#setting-openai-model').value;
      const demoM = container.querySelector('#setting-demo-mode').checked;

      const payload = {
        googleClientId: gId,
        googleRedirectUri: gRedirect,
        openaiModel: oModel,
        demoMode: demoM
      };

      if (gSecret.trim()) payload.googleClientSecret = gSecret;
      if (oKey.trim()) payload.openaiApiKey = oKey;

      try {
        await api.saveSettings(payload);
        copyToClipboard('સેટિંગ્સ સફળતાપૂર્વક સાચવવામાં આવી છે!', 'સેટિંગ્સ સેવ થઈ ગઈ!');
        renderSettings(container, navigateTo);
      } catch (err) {
        alert('સેટિંગ્સ સાચવવામાં ભૂલ: ' + err.message);
      }
    });

  } catch (err) {
    container.innerHTML = `<div class="alert alert-warning">${err.message}</div>`;
  }
}
