/**
 * Mobile Shareable Link & Offline PWA Manager
 * Gyan Yatra Studio
 * Enables 1-click sharing to mobile, QR code scanning, and 100% offline PWA caching!
 */

export function initMobileLinkAndOfflineSystem() {
  // 1. Register Service Worker for 100% Offline Capability (skip on localhost to prevent stale code)
  if ('serviceWorker' in navigator) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (const reg of regs) reg.unregister();
      });
    } else {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js?v=99.0').then((reg) => {
          reg.update();
          console.log('[PWA] Service Worker registered and updated (v99.0) scope:', reg.scope);
        }).catch((err) => {
          console.warn('[PWA] Service Worker registration notice:', err);
        });
      });
    }
  }

  // 2. Setup Online / Offline Status Indicators
  const updateNetworkStatus = () => {
    const isOnline = navigator.onLine;
    const badge = document.getElementById('top-network-status-badge');
    if (badge) {
      if (isOnline) {
        badge.innerHTML = '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981; margin-right:4px;"></span> ઓનલાઇન (Auto-Sync)';
        badge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        badge.style.color = '#34d399';
        badge.style.background = 'rgba(16, 185, 129, 0.1)';
      } else {
        badge.innerHTML = '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#f59e0b; margin-right:4px;"></span> 📴 ઑફલાઇન મોડ (Wi-Fi વગર સક્રિય)';
        badge.style.borderColor = 'rgba(245, 158, 11, 0.4)';
        badge.style.color = '#fbbf24';
        badge.style.background = 'rgba(245, 158, 11, 0.15)';
      }
    }
  };

  window.addEventListener('online', updateNetworkStatus);
  window.addEventListener('offline', updateNetworkStatus);
  setTimeout(updateNetworkStatus, 300);

  // 3. PWA Install Prompt handling
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('top-install-pwa-btn');
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
    }
  });

  document.getElementById('top-install-pwa-btn')?.addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] Install prompt outcome:', outcome);
      deferredPrompt = null;
    } else {
      alert('મોબાઇલ ક્રોમ (Chrome) બ્રાઉઝરમાં ઉપરના 3 ટપકાં (⋮) પર ક્લિક કરીને "Add to Home screen" અથવા "Install App" પસંદ કરો!');
    }
  });

  // 4. Mobile Link Share Modal Click Handler
  const shareBtn = document.getElementById('top-share-mobile-link-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', openMobileLinkModal);
  }
}

export function openMobileLinkModal() {
  let modal = document.getElementById('modal-mobile-share-link');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-mobile-share-link';
    modal.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(6px); z-index:999999; display:flex; align-items:center; justify-content:center; padding:16px;';
    document.body.appendChild(modal);
  }

  const wifiUrl = (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? `${window.location.protocol}//${window.location.host}`
    : 'http://192.168.1.11:5000';
  const cloudUrl = 'https://apparel-meetup-queen-typing.trycloudflare.com';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(cloudUrl)}`;

  modal.innerHTML = `
    <div style="background:#0f172a; border:2px solid #38bdf8; border-radius:16px; max-width:540px; width:100%; padding:24px; box-shadow:0 25px 60px rgba(0,0,0,0.9); font-family:sans-serif; color:#ffffff; position:relative;">
      <!-- Close Button -->
      <button id="btn-close-mobile-link-modal" style="position:absolute; top:16px; right:16px; background:rgba(255,255,255,0.1); border:none; color:#ffffff; font-size:18px; width:34px; height:34px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:bold;">✕</button>

      <!-- Header -->
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
        <span style="font-size:2rem;">📱</span>
        <div>
          <h3 style="margin:0; font-size:1.25rem; font-weight:800; color:#38bdf8;">મોબાઇલ માટે ઑફલાઇન & લાઇવ લિંક</h3>
          <p style="margin:2px 0 0 0; font-size:0.75rem; color:#94a3b8;">Wi-Fi/મોબાઇલ ડેટા વગર પણ કામ કરશે • ઑટો-સિંક સુવિધા</p>
        </div>
      </div>

      <!-- Links Grid -->
      <div style="display:flex; flex-direction:column; gap:14px; margin-bottom:18px;">
        <!-- Option A: Direct Local Wi-Fi / Hotspot -->
        <div style="background:rgba(56,189,248,0.06); border:1.5px solid #0284c7; border-radius:10px; padding:12px 14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:0.8rem; font-weight:800; color:#38bdf8;">⚡ ૧. સુપર-ફાસ્ટ ડાયરેક્ટ લિંક (Wi-Fi / હોટસ્પોટ):</span>
            <span style="font-size:0.68rem; background:#0284c7; color:#ffffff; padding:2px 6px; border-radius:4px; font-weight:700;">હાઇ સ્પીડ</span>
          </div>
          <div style="display:flex; gap:8px;">
            <input type="text" readonly value="${wifiUrl}" id="input-wifi-url" style="flex:1; background:#090d16; border:1px solid #334155; border-radius:6px; color:#38bdf8; padding:8px 10px; font-size:0.85rem; font-weight:700; outline:none;">
            <button onclick="navigator.clipboard.writeText('${wifiUrl}'); this.textContent='✓ કૉપી થયું!';" style="background:#0284c7; color:#fff; border:none; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.8rem;">કૉપી</button>
          </div>
          <p style="margin:4px 0 0 0; font-size:0.68rem; color:#94a3b8;">તમારા મોબાઇલને લેપટોપના Wi-Fi અથવા હોટસ્પોટ સાથે જોડીને ખોલો.</p>
        </div>

        <!-- Option B: Public Cloud Tunnel Link -->
        <div style="background:rgba(139,92,246,0.06); border:1.5px solid #8b5cf6; border-radius:10px; padding:12px 14px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:0.8rem; font-weight:800; color:#c4b5fd;">🌐 ૨. Cloudflare સુપર-ફાસ્ટ લિંક (503 વગર, ગમે ત્યાંથી ઍક્સેસ):</span>
            <span style="font-size:0.68rem; background:#8b5cf6; color:#ffffff; padding:2px 6px; border-radius:4px; font-weight:700;">Zero 503</span>
          </div>
          <div style="display:flex; gap:8px;">
            <input type="text" readonly value="${cloudUrl}" id="input-cloud-url" style="flex:1; background:#090d16; border:1px solid #334155; border-radius:6px; color:#c4b5fd; padding:8px 10px; font-size:0.85rem; font-weight:700; outline:none;">
            <button onclick="navigator.clipboard.writeText('${cloudUrl}'); this.textContent='✓ કૉપી થયું!';" style="background:#8b5cf6; color:#fff; border:none; padding:8px 12px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.8rem;">કૉપી</button>
          </div>
          <p style="margin:4px 0 0 0; font-size:0.68rem; color:#94a3b8;">કોઈપણ પાસવર્ડ વગર સીધું જ ૧ સેકન્ડમાં ખુલશે. મોબાઇલ ડેટા (4G/5G) કે Wi-Fi પર ૧૦૦% સ્પીડથી ચાલશે.</p>
        </div>
      </div>

      <!-- QR Code & Instructions -->
      <div style="display:flex; gap:16px; align-items:center; background:rgba(255,255,255,0.03); border:1px solid #1e293b; border-radius:10px; padding:12px;">
        <img src="${qrCodeUrl}" alt="Scan QR Code" style="width:110px; height:110px; border-radius:8px; border:2px solid #ffffff; background:#ffffff; padding:4px;">
        <div style="font-size:0.75rem; color:#cbd5e1; line-height:1.5;">
          <strong style="color:#10b981;">📲 ઑફલાઇન મોડ સક્રિય કરવાની રીત:</strong>
          <ol style="margin:4px 0 0 16px; padding:0;">
            <li>મોબાઇલ કેમેરાથી આ QR કોડ સ્કેન કરો અથવા લિંક ખોલો.</li>
            <li>ક્રોમમાં <strong>'Add to Home screen'</strong> અથવા <strong>'Install App'</strong> દબાવો.</li>
            <li>હવે મોબાઇલનું <strong>Wi-Fi અને ડેટા સંપૂર્ણ બંધ (Offline)</strong> હશે તો પણ આ ઍપ સીધી ચાલશે!</li>
            <li>કમ્પ્યુટરમાં જે ફેરફાર કરશો તે ઑટોમેટિક આ લિંક પર અપડેટ થઈ જશે!</li>
          </ol>
        </div>
      </div>

      <!-- Action Buttons -->
      <div style="display:flex; gap:10px; margin-top:18px;">
        <a href="https://api.whatsapp.com/send?text=${encodeURIComponent('🎯 જ્ઞાન યાત્રા AI વિડીયો સ્ટુડિયો (ગમે ત્યાંથી વિડીયો બનાવો):\n' + cloudUrl)}" target="_blank" style="flex:1; text-align:center; background:#10b981; color:#ffffff; padding:10px 14px; border-radius:8px; text-decoration:none; font-weight:bold; font-size:0.85rem; display:inline-flex; align-items:center; justify-content:center; gap:6px;">
          <span>💬</span> WhatsApp પર શેર કરો
        </a>
        <button id="btn-close-modal-bottom" style="flex:0.6; background:#334155; color:#ffffff; border:none; padding:10px 14px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:0.85rem;">
          બંધ કરો
        </button>
      </div>
    </div>
  `;

  modal.style.display = 'flex';
  modal.querySelector('#btn-close-mobile-link-modal')?.addEventListener('click', () => modal.style.display = 'none');
  modal.querySelector('#btn-close-modal-bottom')?.addEventListener('click', () => modal.style.display = 'none');
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
}

