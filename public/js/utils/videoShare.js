// Video Sharing Utility with Direct WhatsApp, Web Share API, Android WebView bridge and modal fallback
import { showNoticeToast } from './clipboard.js';

let cachedNetworkOrigin = '';
if (typeof window !== 'undefined' && typeof fetch === 'function') {
  fetch('/api/network-info')
    .then(r => r.json())
    .then(d => {
      if (d?.networkUrl) cachedNetworkOrigin = d.networkUrl;
    })
    .catch(() => {});
}

export function getShareableVideoUrl(rawUrl) {
  if (!rawUrl) return '';
  if (rawUrl.startsWith('blob:')) {
    return rawUrl;
  }
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    if (cachedNetworkOrigin && typeof window !== 'undefined') {
      try {
        const u = new URL(rawUrl);
        if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
          return `${cachedNetworkOrigin}${u.pathname}${u.search}`;
        }
      } catch (_) {}
    }
    return rawUrl;
  }

  const base = (cachedNetworkOrigin && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? cachedNetworkOrigin
    : ((typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '');

  return `${base}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
}

export function generateVideoShareText({ topicTitle, videoTitle, fullVideoUrl, durationFormatted, createdAtFormatted }) {
  const title = videoTitle || topicTitle || 'Gyan Yatra Educational Video';
  let watchUrl = fullVideoUrl || '';
  if (watchUrl && !watchUrl.startsWith('blob:')) {
    if (watchUrl.includes('/videos/')) {
      const vidFile = watchUrl.split('/videos/')[1].split('?')[0];
      const baseOrigin = watchUrl.split('/videos/')[0];
      watchUrl = `${baseOrigin}/watch?v=${encodeURIComponent(vidFile)}&title=${encodeURIComponent(title)}`;
    }
  }

  const timeLine = createdAtFormatted ? `\n🕒 *બન્યા સમય:* ${createdAtFormatted}` : '';

  return `🎬 *વિડીયો ટાઇટલ:* ${title}
⏱️ 1080p Full HD વિડીયો (${durationFormatted || 'સંપૂર્ણ વિડીયો'})${timeLine}
📺 વિડીયો જોવા અને ડાઉનલોડ કરવા માટે સીધી લિંક:
${watchUrl}

_(Gyan Yatra AI Studio દ્વારા સંપૂર્ણ તૈયાર થયેલ વિડીયો)_`;
}

export function getWhatsAppShareUrl(shareText) {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
}

export function openDirectWhatsApp(shareText) {
  const encoded = encodeURIComponent(shareText);
  const isMobile = (typeof navigator !== 'undefined') &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // Direct mobile app scheme — opens WhatsApp native app immediately
    window.location.href = `whatsapp://send?text=${encoded}`;
    // Fallback for browsers that don't handle custom URI schemes
    setTimeout(() => {
      window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
    }, 1000);
  } else {
    // Desktop PC / Mac / Web: opens WhatsApp Web / Desktop
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
  }
}

export async function shareToWhatsApp(project, options = {}) {
  // Ensure network origin is resolved for shareable URLs across mobile and LAN
  if (!cachedNetworkOrigin && typeof fetch === 'function') {
    try {
      const nr = await fetch('/api/network-info');
      const nd = await nr.json();
      if (nd?.networkUrl) cachedNetworkOrigin = nd.networkUrl;
    } catch (_) {}
  }

  const { triggerButton, customVideoUrl, customFilename, durationFormatted } = options;

  let rawUrl = customVideoUrl ||
    project?.editing?.lastExportedVideoUrl ||
    project?.editing?.savedVideo?.videoUrl;

  const filename = customFilename || project?.editing?.lastExportedFilename || 'presentation_1080p.mp4';

  if (!rawUrl || rawUrl.startsWith('blob:')) {
    if (project?.editing?.savedVideo?.videoUrl && !project.editing.savedVideo.videoUrl.startsWith('blob:')) {
      rawUrl = project.editing.savedVideo.videoUrl;
    } else if (filename && !filename.startsWith('blob:')) {
      rawUrl = `/videos/${filename.endsWith('.mp4') ? filename : `${filename}.mp4`}`;
    } else {
      rawUrl = '/videos/latest_video.mp4';
    }
  }

  if (!rawUrl) {
    showNoticeToast('⚠️ પહેલાં વિડીયો બનાવો (Render Video), ત્યાર બાદ WhatsApp પર શેર કરી શકાશે.', 'warning');
    return false;
  }

  const topicTitle = project?.topic || project?.name || 'Gyan Yatra Educational Topic';
  const videoTitle = project?.seo?.title || project?.name || topicTitle;
  const dur = durationFormatted || '1080p Full HD';
  const fullVideoUrl = getShareableVideoUrl(rawUrl);

  const rawCreatedAt = options.createdAtFormatted || options.createdAt || project?.editing?.savedVideo?.createdAt || project?.editing?.savedAt;
  let createdAtFormatted = options.createdAtFormatted || '';
  if (!createdAtFormatted && rawCreatedAt) {
    try {
      const d = new Date(rawCreatedAt);
      if (!isNaN(d.getTime())) {
        const timeStr = d.toLocaleTimeString('gu-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
        const dateStr = d.toLocaleDateString('gu-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' });
        createdAtFormatted = `${timeStr} (${dateStr})`;
      }
    } catch (_) {}
  }

  const shareText = generateVideoShareText({
    topicTitle,
    videoTitle,
    fullVideoUrl,
    durationFormatted: dur,
    createdAtFormatted
  });

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(fullVideoUrl && !fullVideoUrl.startsWith('blob:') ? fullVideoUrl : shareText);
    }
  } catch (_) {}

  // 1. Immediately trigger the genuine MP4 video file download (Downloads folder)
  const vidFile = (rawUrl && rawUrl.includes('/videos/')) ? rawUrl.split('/videos/')[1].split('?')[0] : (filename || 'latest_video.mp4');
  const safeFilename = filename.endsWith('.mp4') ? filename : `${filename}.mp4`;
  const dlUrl = `/api/voice/download-video?file=${encodeURIComponent(vidFile)}&name=${encodeURIComponent(safeFilename)}`;

  try {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = dlUrl;
    document.body.appendChild(iframe);
    setTimeout(() => { try { iframe.remove(); } catch (_) {} }, 6000);
  } catch (_) {
    try {
      const dl = document.createElement('a');
      dl.href = dlUrl;
      dl.setAttribute('download', safeFilename);
      document.body.appendChild(dl);
      dl.click();
      setTimeout(() => { try { dl.remove(); } catch (_) {} }, 1000);
    } catch (_) {}
  }

  // 2. Open WhatsApp immediately without popup blocker interference
  const isMobile = (typeof navigator !== 'undefined') &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Mobile Web Share with video file check (only on actual mobile devices if requested)
  if (isMobile && options.preferNativeShare && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    const canShareFiles = typeof navigator.canShare === 'function';
    if (canShareFiles) {
      try {
        const fetchTarget = (rawUrl && rawUrl.startsWith('http')) ? rawUrl : (window.location.origin + (rawUrl.startsWith('/') ? '' : '/') + rawUrl);
        const vidRes = await fetch(fetchTarget);
        if (vidRes.ok) {
          const vidBlob = await vidRes.blob();
          const vidFileObj = new File([vidBlob], safeFilename, { type: 'video/mp4' });
          if (navigator.canShare({ files: [vidFileObj] })) {
            await navigator.share({
              files: [vidFileObj],
              title: videoTitle
            });
            showNoticeToast('✅ અસલી વિડીયો ફાઇલ સફળતાપૂર્વક શેર થઈ ગઈ!', 'success');
            return true;
          }
        }
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') return true;
        console.warn('[Direct file share notice]:', shareErr.message);
      }
    }
  }

  if (isMobile) {
    // On mobile: open WhatsApp app directly via custom URI scheme
    window.location.href = `whatsapp://send?text=${encodeURIComponent(shareText)}`;
    setTimeout(() => {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    }, 1200);
  } else {
    // On Desktop PC: open WhatsApp Web with pre-filled message and direct video link
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    const popup = window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    }
    showNoticeToast('📥 અસલી MP4 વિડીયો ડાઉનલોડ શરૂ થઈ ગયું છે અને WhatsApp Web ખુલી ગયું છે! 📎 (Attachment) થી વિડીયો મોકલી શકો છો.', 'success');
  }

  return true;
}

export function openVideoShareModal({
  topicTitle = 'Gyan Yatra Topic',
  videoTitle = '',
  fullVideoUrl = '',
  filename = 'presentation_1080p.mp4',
  shareText = '',
  durationFormatted = '',
  createdAtFormatted = ''
}) {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById('gy-video-share-modal');
  if (existing) existing.remove();

  const waUrl = getWhatsAppShareUrl(shareText);

  const displayTitle = videoTitle || topicTitle || 'Gyan Yatra Video';

  const modal = document.createElement('div');
  modal.id = 'gy-video-share-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(4px);
    z-index: 999999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  `;

  modal.innerHTML = `
    <div style="background: #ffffff; border-radius: 16px; max-width: 520px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 2px solid #25D366; overflow: hidden; animation: popIn 0.25s ease;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #25D366, #128C7E); color: #ffffff; padding: 18px 22px; display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 1.6rem;">📲</span>
          <div>
            <h3 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #ffffff;">વિડીયો શેર કરો (Share Video)</h3>
            <p style="margin: 2px 0 0 0; font-size: 0.8rem; color: #e6fffa; opacity: 0.95;">1080p વિડીયો WhatsApp અથવા અન્ય એપ પર મોકલો</p>
          </div>
        </div>
        <button id="btn-close-share-modal" type="button" style="background: rgba(255,255,255,0.2); border: none; color: #ffffff; width: 32px; height: 32px; border-radius: 50%; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center;">✕</button>
      </div>

      <!-- Body -->
      <div style="padding: 20px 22px;">
        <!-- Topic Box -->
        <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 16px;">
          <div style="font-size: 0.76rem; color: #64748b; font-weight: 700;">વિડીયો ટાઇટલ:</div>
          <div style="font-size: 0.95rem; color: #0f172a; font-weight: 800; margin-top: 2px;">${displayTitle}</div>
          <div style="display: flex; gap: 12px; margin-top: 6px; font-size: 0.78rem; flex-wrap: wrap;">
            <span style="color: #059669; font-weight: 700;">⏱️ ${durationFormatted || '1080p Full HD વિડીયો'}</span>
            ${createdAtFormatted ? `<span style="color: #b45309; font-weight: 700;">🕒 બન્યા સમય: ${createdAtFormatted}</span>` : ''}
          </div>
        </div>

        <!-- Share Actions -->
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <!-- Primary Direct WhatsApp Share Button -->
          <button type="button" id="btn-modal-share-wa" style="background: linear-gradient(135deg, #25D366, #128C7E); color: #ffffff; border: none; padding: 13px 20px; border-radius: 10px; font-weight: 800; font-size: 0.98rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 14px rgba(37,211,102,0.35);">
            <span style="font-size: 1.3rem;">💬</span>
            <span>WhatsApp પર સીધો વિડીયો મોકલો</span>
          </button>

          <!-- Native WebShare if available -->
          ${typeof navigator !== 'undefined' && typeof navigator.share === 'function' ? `
            <button type="button" id="btn-modal-trigger-native-share" style="background: #2563eb; color: #ffffff; border: none; padding: 12px 20px; border-radius: 10px; font-weight: 800; font-size: 0.92rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 4px 14px rgba(37,99,235,0.3);">
              <span style="font-size: 1.2rem;">📱</span>
              <span>મોબાઇલ શેર મેનુ (All Apps / Share Sheet)</span>
            </button>
          ` : ''}

          <!-- Copy Link Button -->
          <button type="button" id="btn-modal-copy-video-link" style="background: #f1f5f9; color: #0f172a; border: 1.5px solid #cbd5e1; padding: 11px 20px; border-radius: 10px; font-weight: 800; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>📋</span>
            <span id="label-copy-link">વિડીયો ડાઉનલોડ લિંક કોપી કરો</span>
          </button>

          <!-- Direct Download Button -->
          <a href="${fullVideoUrl}" download="${filename}" style="background: #ffffff; color: #059669; border: 1.5px solid #a7f3d0; text-decoration: none; padding: 11px 20px; border-radius: 10px; font-weight: 800; font-size: 0.9rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
            <span>💾</span>
            <span>MP4 વિડીયો ફાઇલ ડાઉનલોડ કરો</span>
          </a>
        </div>

        <!-- Video Link Display Box -->
        <div style="margin-top: 14px; background: #fafafa; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 8px 12px; font-size: 0.74rem; color: #475569; word-break: break-all; font-family: monospace;">
          🔗 ${fullVideoUrl}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#btn-close-share-modal')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  // Direct WhatsApp click inside modal
  modal.querySelector('#btn-modal-share-wa')?.addEventListener('click', () => {
    openDirectWhatsApp(shareText);
  });

  // Copy Link Action
  modal.querySelector('#btn-modal-copy-video-link')?.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullVideoUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = fullVideoUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      const label = modal.querySelector('#label-copy-link');
      if (label) label.textContent = '✓ લિંક કોપી થઈ ગઈ!';
      showNoticeToast('📋 વિડીયો લિંક ક્લિપબોર્ડમાં કોપી થઈ ગઈ છે!', 'success');
    } catch (_) {
      prompt('આ લિંક કોપી કરો:', fullVideoUrl);
    }
  });

  // Native Share Trigger inside modal
  modal.querySelector('#btn-modal-trigger-native-share')?.addEventListener('click', async () => {
    modal.remove();
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: videoTitle || topicTitle,
          text: shareText,
          url: fullVideoUrl
        });
        showNoticeToast('✅ વિડીયો સફળતાપૂર્વક શેર થયો!', 'success');
      } catch (sErr) {
        if (sErr.name !== 'AbortError') {
          console.warn('[Modal native share fallback]:', sErr.message);
        }
      }
    }
  });
}

export async function shareProjectVideo(project, options = {}) {
  const { triggerButton, customVideoUrl, customFilename, durationFormatted } = options;

  let rawUrl = customVideoUrl ||
    project?.editing?.lastExportedVideoUrl ||
    project?.editing?.savedVideo?.videoUrl ||
    project?.videoeditor?.lastExportedVideoUrl;

  if (rawUrl && rawUrl.startsWith('blob:') && project?.editing?.savedVideo?.videoUrl && !project.editing.savedVideo.videoUrl.startsWith('blob:')) {
    rawUrl = project.editing.savedVideo.videoUrl;
  }

  if (!rawUrl) {
    showNoticeToast('⚠️ પહેલાં વિડીયો બનાવો (Render Video), ત્યાર બાદ વિડીયો શેર કરી શકાશે.', 'warning');
    return false;
  }

  const topicTitle = project?.topic || project?.name || 'Gyan Yatra Video';
  const videoTitle = project?.seo?.title || project?.name || topicTitle;
  const filename = customFilename || project?.editing?.lastExportedFilename || 'presentation_1080p.mp4';
  const fullVideoUrl = getShareableVideoUrl(rawUrl);

  const rawCreatedAt = options.createdAtFormatted || options.createdAt || project?.editing?.savedVideo?.createdAt || project?.editing?.savedAt;
  let createdAtFormatted = options.createdAtFormatted || '';
  if (!createdAtFormatted && rawCreatedAt) {
    try {
      const d = new Date(rawCreatedAt);
      if (!isNaN(d.getTime())) {
        const timeStr = d.toLocaleTimeString('gu-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
        const dateStr = d.toLocaleDateString('gu-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' });
        createdAtFormatted = `${timeStr} (${dateStr})`;
      }
    } catch (_) {}
  }

  const shareText = generateVideoShareText({
    topicTitle,
    videoTitle,
    fullVideoUrl,
    durationFormatted,
    createdAtFormatted
  });

  const originalBtnHtml = triggerButton ? triggerButton.innerHTML : '';
  if (triggerButton) {
    triggerButton.disabled = true;
    triggerButton.innerHTML = '<span>⏳</span> <span>શેરિંગ...</span>';
  }

  try {
    // 1. Android Native App WebView Bridge support
    if (typeof window !== 'undefined' && window.StudioBridge && typeof window.StudioBridge.postMessage === 'function') {
      try {
        window.StudioBridge.postMessage(JSON.stringify({
          action: 'share',
          type: 'video',
          url: fullVideoUrl,
          title: videoTitle,
          text: shareText
        }));
        showNoticeToast('📲 એપમાં શેર ઓપ્શન ખુલી ગયું!', 'success');
        return true;
      } catch (_) {}
    }

    // 2. Mobile Browser: Try Native File Sharing via Web Share API
    const isMobile = (typeof navigator !== 'undefined') &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const canShareFiles = typeof navigator.canShare === 'function';
        if (canShareFiles) {
          const vidRes = await fetch(rawUrl);
          const vidBlob = await vidRes.blob();
          const mime = vidBlob.type && vidBlob.type.includes('video') ? vidBlob.type : 'video/mp4';
          const vidFile = new File([vidBlob], filename, { type: mime });

          if (navigator.canShare({ files: [vidFile] })) {
            await navigator.share({
              files: [vidFile],
              title: videoTitle,
              text: shareText
            });
            showNoticeToast('✅ વિડીયો સફળતાપૂર્વક શેર થયો!', 'success');
            return true;
          }
        }
      } catch (fErr) {
        if (fErr.name === 'AbortError') return true;
        console.warn('[File share fallback]:', fErr.message);
      }

      // Fallback: Share URL & Text via navigator.share on mobile
      try {
        await navigator.share({
          title: videoTitle,
          text: shareText,
          url: fullVideoUrl
        });
        showNoticeToast('✅ વિડીયો લિંક શેર થઈ ગઈ!', 'success');
        return true;
      } catch (uErr) {
        if (uErr.name === 'AbortError') return true;
        console.warn('[WebShare URL fallback]:', uErr.message);
      }
    }

    // 3. Fallback or Desktop: Open interactive Share Modal
    openVideoShareModal({
      topicTitle,
      videoTitle,
      fullVideoUrl,
      filename,
      shareText,
      durationFormatted,
      createdAtFormatted
    });
    return true;

  } catch (err) {
    console.error('[shareProjectVideo error]:', err);
    openDirectWhatsApp(shareText);
    showNoticeToast('💬 WhatsApp ખોલવામાં આવ્યું છે!', 'info');
    return true;
  } finally {
    if (triggerButton) {
      triggerButton.disabled = false;
      triggerButton.innerHTML = originalBtnHtml;
    }
  }
}
