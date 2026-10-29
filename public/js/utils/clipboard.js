// Clipboard & Toast utilities with mobile/Android clipboard support & Gujarati feedback

export function showNoticeToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';

  const icon = type === 'error' ? '⚠️' : type === 'warning' ? '🔔' : '✓';
  const color = type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981';

  toast.innerHTML = `
    <span style="color: ${color}; font-size: 1.15rem; font-weight: 800;">${icon}</span>
    <span style="line-height: 1.4; font-weight: 600;">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Animate any copy button to show instant green visual confirmation
 */
export function animateCopyButton(btn, successText = '✓ કોપી થઈ ગયું!') {
  if (!btn) return;
  const button = (typeof btn === 'string') ? document.querySelector(btn) : btn;
  if (!button || button.tagName !== 'BUTTON') return;
  if (button.dataset.isCopyAnimating === 'true') return;
  button.dataset.isCopyAnimating = 'true';

  const origHtml = button.innerHTML;
  const origBg = button.style.background;
  const origBorder = button.style.borderColor;
  const origColor = button.style.color;

  button.innerHTML = `<span>✓</span> <strong>${successText}</strong>`;
  button.style.background = '#10b981';
  button.style.borderColor = '#059669';
  button.style.color = '#ffffff';

  setTimeout(() => {
    button.innerHTML = origHtml;
    button.style.background = origBg;
    button.style.borderColor = origBorder;
    button.style.color = origColor;
    button.dataset.isCopyAnimating = 'false';
  }, 2500);
}

/**
 * Bulletproof clipboard copy working across all desktop and mobile browsers,
 * Android WebViews, HTTP (insecure LAN IP) and HTTPS contexts.
 */
export async function copyToClipboard(text, customMessage = 'ટેક્સ્ટ કોપી થઈ ગયો છે! (Copied)', triggerOrTarget = null) {
  let targetElement = null;
  let triggerButton = null;

  if (typeof triggerOrTarget === 'string') {
    const el = document.querySelector(triggerOrTarget);
    if (el) {
      if (el.tagName === 'BUTTON') triggerButton = el;
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') targetElement = el;
    }
  } else if (triggerOrTarget && triggerOrTarget.nodeType) {
    if (triggerOrTarget.tagName === 'BUTTON') triggerButton = triggerOrTarget;
    if (triggerOrTarget.tagName === 'TEXTAREA' || triggerOrTarget.tagName === 'INPUT') targetElement = triggerOrTarget;
  }

  // If no triggerButton passed, try activeElement if user just clicked a button
  if (!triggerButton && document.activeElement && document.activeElement.tagName === 'BUTTON') {
    triggerButton = document.activeElement;
  }

  // If text is empty but targetElement has value
  if (!text && targetElement && targetElement.value) {
    text = targetElement.value;
  }

  if (!text) return false;

  let copied = false;

  // 1. Android Studio WebView Bridge
  if (window.StudioBridge && window.StudioBridge.postMessage) {
    try {
      window.StudioBridge.postMessage(JSON.stringify({ action: 'copy', text: text }));
      copied = true;
    } catch (_) {}
  }

  // 2. Modern Clipboard API (works on HTTPS or localhost)
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      copied = true;
    } catch (err) {
      // Insecure context or permission denied on LAN HTTP
      copied = false;
    }
  }

  // 3. Fallback: Direct DOM element copy or temporary visible-in-viewport element
  if (!copied) {
    copied = executeDomCopy(text, targetElement);
  }

  // Visual Confirmations
  showNoticeToast(customMessage, 'success');
  if (triggerButton) {
    animateCopyButton(triggerButton, 'કોપી થઈ ગયું! ✓');
  }

  return copied;
}

function executeDomCopy(text, targetElement) {
  // If we already have the target textarea visible in the DOM
  if (targetElement && (targetElement.tagName === 'TEXTAREA' || targetElement.tagName === 'INPUT')) {
    try {
      const active = document.activeElement;
      targetElement.focus();
      targetElement.select();
      if (typeof targetElement.setSelectionRange === 'function') {
        targetElement.setSelectionRange(0, targetElement.value.length);
      }
      const success = document.execCommand('copy');
      if (active && typeof active.focus === 'function') active.focus();
      if (success) return true;
    } catch (_) {}
  }

  // Reliable viewport-resident fallback (avoids negative offscreen coordinate issues on Android Chrome/Safari)
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '0';
  textarea.style.left = '0';
  textarea.style.width = '2em';
  textarea.style.height = '2em';
  textarea.style.padding = '0';
  textarea.style.border = 'none';
  textarea.style.outline = 'none';
  textarea.style.boxShadow = 'none';
  textarea.style.background = 'transparent';
  textarea.style.opacity = '0.01';
  textarea.style.zIndex = '-1';
  textarea.style.fontSize = '16px'; // Prevents mobile zoom

  document.body.appendChild(textarea);

  const isIOS = navigator.userAgent && navigator.userAgent.match(/ipad|ipod|iphone/i);
  if (isIOS) {
    textarea.contentEditable = 'true';
    textarea.readOnly = false;
    const range = document.createRange();
    range.selectNodeContents(textarea);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    textarea.setSelectionRange(0, 999999);
  } else {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
  }

  let successful = false;
  try {
    successful = document.execCommand('copy');
  } catch (err) {
    console.error('execCommand copy failed', err);
  }

  document.body.removeChild(textarea);
  return successful;
}
