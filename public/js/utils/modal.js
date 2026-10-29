import { api } from '../api.js';
import { copyToClipboard } from './clipboard.js';

export function showOAuthConnectModal(navigateTo, onSuccess) {
  // Check if modal already open
  const existing = document.getElementById('oauth-connect-modal');
  if (existing) existing.remove();

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'oauth-connect-modal';
  modalOverlay.className = 'modal-overlay';
  modalOverlay.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div class="brand-icon" style="width: 44px; height: 44px; font-size: 22px;">▶</div>
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: #ffffff;">
              🔴 Connect My YouTube Channel
            </h3>
            <span style="font-size: 0.8rem; color: var(--text-secondary);">
              સત્તાવાર Google OAuth 2.0 કનેક્શન સેટઅપ
            </span>
          </div>
        </div>
        <button id="btn-close-modal" class="modal-close-btn" title="બંધ કરો">✕</button>
      </div>

      <div class="modal-body">
        <div class="alert alert-info" style="margin-bottom: 20px;">
          <span>🛡️</span>
          <div style="font-size: 0.84rem; line-height: 1.5;">
            <strong>સુરક્ષા પ્રથમ:</strong> આ એપ્લિકેશન તમારો ગુગલ પાસવર્ડ ક્યારેય પૂછતી નથી. YouTube Data API અને Analytics API સાથે સુરક્ષિત રીતે જોડાવા માટે તમારા પોતાના Google Cloud Project નો Client ID અને Client Secret જરૂરી છે.
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px; margin-bottom: 20px;">
          <!-- Client ID -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">૧. Google OAuth 2.0 Client ID:</label>
            <input type="text" id="modal-client-id" class="form-input font-en"
                   placeholder="xxxxxx-xxxxxx.apps.googleusercontent.com">
          </div>

          <!-- Client Secret -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">૨. Google OAuth 2.0 Client Secret:</label>
            <input type="password" id="modal-client-secret" class="form-input font-en"
                   placeholder="GOCSPX-xxxxxxxxxxxxxxxxxxxxxxxx">
          </div>

          <!-- Authorized Redirect URI -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">૩. Authorized Redirect URI (Google Cloud માં પેસ્ટ કરો):</label>
            <div style="display: flex; gap: 8px;">
              <input type="text" id="modal-redirect-uri" class="form-input font-en"
                     value="http://localhost:5000/api/auth/google/callback" readonly>
              <button id="btn-modal-copy-uri" class="btn btn-secondary btn-sm" style="flex-shrink: 0;">
                📋 Copy
              </button>
            </div>
            <span style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; display: block;">
              Google Cloud Console માં Credentials > OAuth Client ID > "Authorized redirect URIs" માં આ લિંક ઉમેરો.
            </span>
          </div>
        </div>

        <!-- 3 Simple Setup Steps -->
        <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid var(--bg-card-border); border-radius: var(--radius-md); padding: 14px; margin-bottom: 20px;">
          <strong style="font-size: 0.82rem; color: var(--accent-amber); display: block; margin-bottom: 6px;">
            ⚡ ઝડપી ૩-પગલાંની માર્ગદર્શિકા (3 Quick Steps):
          </strong>
          <ol style="padding-left: 20px; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.6;">
            <li><strong>console.cloud.google.com</strong> પર જઈ "YouTube Data API v3" અને "YouTube Analytics API" સક્રિય કરો.</li>
            <li>OAuth Consent Screen માં <code>youtube.readonly</code> સ્કોપ પસંદ કરો.</li>
            <li>Web Client ID બનાવી અહીં ઉપર પેસ્ટ કરો અને નીચેનું બટન દબાવો.</li>
          </ol>
        </div>
      </div>

      <div class="modal-footer">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 12px;">
          <button id="btn-modal-demo" class="btn btn-warning btn-sm">
            <span>🎭</span> ડેમો ચેનલ સાથે ચાલુ રાખો (Use Demo)
          </button>

          <div style="display: flex; gap: 10px;">
            <button id="btn-modal-settings" class="btn btn-outline btn-sm">
              <span>⚙️</span> સેટિંગ્સ & વિગતવાર ગાઈડ
            </button>
            <button id="btn-modal-save-connect" class="btn btn-primary btn-sm">
              <span>🚀</span> સેવ કરો અને Google સાથે કનેક્ટ કરો
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  // Close handlers
  const closeModal = () => modalOverlay.remove();
  modalOverlay.querySelector('#btn-close-modal').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Copy URI
  modalOverlay.querySelector('#btn-modal-copy-uri').addEventListener('click', () => {
    const uri = modalOverlay.querySelector('#modal-redirect-uri').value;
    copyToClipboard(uri, 'Redirect URI કોપી થઈ ગયું!');
  });

  // Demo mode
  modalOverlay.querySelector('#btn-modal-demo').addEventListener('click', () => {
    closeModal();
    copyToClipboard('ડેમો ચેનલ સક્રિય છે! તમે તમામ ફીચર્સ એક્સપ્લોર કરી શકો છો.', 'ડેમો મોડ એક્ટિવ');
  });

  // Open full settings
  modalOverlay.querySelector('#btn-modal-settings').addEventListener('click', () => {
    closeModal();
    navigateTo('settings');
  });

  // Save and launch OAuth
  modalOverlay.querySelector('#btn-modal-save-connect').addEventListener('click', async () => {
    const clientId = modalOverlay.querySelector('#modal-client-id').value.trim();
    const clientSecret = modalOverlay.querySelector('#modal-client-secret').value.trim();

    if (!clientId || !clientSecret) {
      alert('કૃપા કરીને Client ID અને Client Secret બંને દાખલ કરો.');
      return;
    }

    try {
      // 1. Save settings
      await api.saveSettings({
        googleClientId: clientId,
        googleClientSecret: clientSecret,
        googleRedirectUri: 'http://localhost:5000/api/auth/google/callback'
      });

      // 2. Fetch fresh OAuth URL
      const authRes = await api.getGoogleAuthUrl();
      if (authRes.url) {
        closeModal();
        window.location.href = authRes.url;
      }
    } catch (err) {
      alert('ભૂલ: ' + err.message);
    }
  });

  // Pre-fill existing Client ID if present
  api.getSettings().then(res => {
    if (res.settings) {
      const idInput = modalOverlay.querySelector('#modal-client-id');
      if (idInput && res.settings.googleClientIdFull) {
        idInput.value = res.settings.googleClientIdFull;
      }
    }
  }).catch(() => {});
}
