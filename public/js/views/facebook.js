import { copyToClipboard, showNoticeToast } from '../utils/clipboard.js?v=90.0';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function renderFacebookTool(container) {
  let savedVideos = [];
  let activeVideoFilename = '';
  let uploadedVideoBase64 = '';

  container.innerHTML = `
    <div style="max-width: 980px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; padding-bottom: 40px;">
      <!-- Header -->
      <div class="card" style="background: linear-gradient(135deg, rgba(24, 119, 242, 0.2), rgba(56, 189, 248, 0.12)); border: 1.5px solid #1877f2; padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: #1877f2; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.6rem; font-weight: 900;">
              f
            </div>
            <div>
              <h2 style="margin: 0 0 4px 0; font-size: 1.35rem; color: #ffffff;">
                ૧૩. Facebook Video & SEO Tool (અલગ ફેસબુક ટૂલ)
              </h2>
              <p style="margin: 0; color: #cbd5e1; font-size: 0.88rem; line-height: 1.45;">
                આખો વિડીયો બને પછી AI તમારી સ્પીચ સાંભળીને <b>"નમસ્કાર મિત્રો સ્વાગત છે તમારી જ્ઞાન યાત્રા યુટ્યુબ ચેનલમાં"</b> જેવા YouTube શબ્દો કાઢી નાખશે અને <b>Facebook Title, Description & Tags</b> આપશે.
              </p>
            </div>
          </div>
          <button id="fb-btn-refresh-videos" class="btn btn-outline" style="font-weight: 800; border-color: #38bdf8; color: #38bdf8;">
            🔄 વિડીયો રિફ્રેશ
          </button>
        </div>
      </div>

      <!-- Step 1: Select or Upload Video -->
      <div class="card" style="padding: 20px; border: 1.5px solid rgba(56, 189, 248, 0.35);">
        <div style="font-weight: 800; color: #38bdf8; margin-bottom: 10px; font-size: 1rem;">
          ૧. તૈયાર થયેલો વિડીયો પસંદ કરો (અથવા નવો MP4 વિડીયો ઉમેરો):
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
          <select id="fb-video-select" class="input" style="flex: 2; min-width: 240px; padding: 10px 12px; border-radius: 10px; font-weight: 700;">
            <option value="">વિડીયો લોડ થઈ રહ્યા છે...</option>
          </select>

          <label style="cursor: pointer; background: rgba(56, 189, 248, 0.14); border: 1.5px solid #38bdf8; color: #7dd3fc; padding: 10px 14px; border-radius: 10px; font-weight: 800; font-size: 0.86rem;">
            📁 બીજો વિડીયો પસંદ કરો
            <input type="file" id="fb-video-file-input" accept="video/*" style="display: none;" />
          </label>
        </div>

        <div id="fb-video-preview-wrap" style="margin-top: 14px; display: none;">
          <video id="fb-source-video-player" controls style="width: 100%; max-height: 280px; border-radius: 10px; background: #000;"></video>
        </div>

        <button id="fb-btn-analyze" class="btn btn-primary" style="width: 100%; margin-top: 16px; padding: 13px 18px; font-weight: 900; font-size: 1rem; background: linear-gradient(135deg, #1877f2, #0ea5e9); border: none;">
          🎧 AI સ્પીચ સાંભળો → YouTube શબ્દો કાઢો & Facebook Title/Description/Tags બનાવો
        </button>

        <div id="fb-status" style="margin-top: 10px; font-size: 0.88rem; color: #34d399; display: none;"></div>
      </div>

      <!-- Step 2: Cut YouTube Intro from Video -->
      <div id="fb-trim-card" class="card" style="padding: 20px; border: 1.5px solid rgba(251, 191, 36, 0.5); display: none;">
        <div style="font-weight: 800; color: #fbbf24; font-size: 1.02rem; margin-bottom: 8px;">
          ✂️ ૨. વિડીયોમાંથી YouTube શબ્દો / ઇન્ટ્રો કાપો
        </div>
        <div id="fb-detected-intro-box" style="padding: 10px 14px; border-radius: 10px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.4); color: #fecaca; font-size: 0.88rem; margin-bottom: 12px;"></div>

        <div style="display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <label for="fb-cut-start" style="font-size: 0.84rem; font-weight: 700;">શરૂઆત (સેકન્ડ):</label>
            <input id="fb-cut-start" type="number" step="0.1" min="0" value="0" class="input" style="width: 86px; padding: 6px 10px; font-weight: 800;" />
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <label for="fb-cut-end" style="font-size: 0.84rem; font-weight: 700;">અંત (સેકન્ડ):</label>
            <input id="fb-cut-end" type="number" step="0.1" min="0" value="4.5" class="input" style="width: 86px; padding: 6px 10px; font-weight: 800;" />
          </div>
          <button id="fb-btn-trim-video" class="btn btn-primary" style="flex: 1; min-width: 220px; background: linear-gradient(135deg, #f59e0b, #ef4444); border: none; font-weight: 900; padding: 10px 16px;">
            ✂️ આ YouTube ભાગ કાપીને Clean Facebook વિડીયો બનાવો
          </button>
        </div>

        <div id="fb-clean-video-wrap" style="margin-top: 14px; display: none; padding: 14px; border-radius: 12px; background: rgba(16, 185, 129, 0.08); border: 1.5px solid #10b981;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
            <strong style="color: #34d399;">✅ Clean Facebook વિડીયો તૈયાર છે (YouTube ઇન્ટ્રો વગર)</strong>
            <a id="fb-clean-download" href="#" download class="btn btn-primary btn-sm" style="background: #10b981; border: none; font-weight: 800; text-decoration: none;">
              ⬇️ Facebook MP4 ડાઉનલોડ કરો
            </a>
          </div>
          <video id="fb-clean-video-player" controls style="width: 100%; max-height: 280px; border-radius: 10px; background: #000;"></video>
        </div>
      </div>

      <!-- Step 3: Clean Transcript + Facebook Title, Description & Tags -->
      <div id="fb-seo-card" class="card" style="padding: 20px; border: 1.5px solid rgba(16, 185, 129, 0.5); display: none;">
        <div style="font-weight: 800; color: #34d399; font-size: 1.05rem; margin-bottom: 14px;">
          📘 ૩. Facebook Title, Description, Tags & Clean સ્પીચ
        </div>

        <!-- Facebook Title -->
        <div style="margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label style="font-weight: 800; color: #38bdf8;">📌 Facebook Video Title:</label>
            <button id="fb-copy-title" class="btn btn-outline btn-sm" style="font-weight: 700;">📋 Title કોપી</button>
          </div>
          <input id="fb-out-title" type="text" class="input" style="width: 100%; padding: 10px 12px; font-weight: 800; font-size: 0.98rem;" />
        </div>

        <!-- Facebook Description -->
        <div style="margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label style="font-weight: 800; color: #a78bfa;">📝 Facebook Description:</label>
            <button id="fb-copy-desc" class="btn btn-outline btn-sm" style="font-weight: 700;">📋 Description કોપી</button>
          </div>
          <textarea id="fb-out-desc" class="input" rows="5" style="width: 100%; padding: 10px 12px; line-height: 1.55; font-size: 0.94rem;"></textarea>
        </div>

        <!-- Facebook Tags -->
        <div style="margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label style="font-weight: 800; color: #fbbf24;">🏷️ Facebook Tags / Hashtags:</label>
            <button id="fb-copy-tags" class="btn btn-outline btn-sm" style="font-weight: 700;">📋 Tags કોપી</button>
          </div>
          <textarea id="fb-out-tags" class="input" rows="3" style="width: 100%; padding: 10px 12px; font-size: 0.9rem;"></textarea>
        </div>

        <!-- Clean Speech Transcript -->
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label style="font-weight: 800; color: #34d399;">🎙️ સાફ કરેલી સ્પીચ (YouTube શબ્દો વગર):</label>
            <button id="fb-copy-transcript" class="btn btn-outline btn-sm" style="font-weight: 700;">📋 સ્પીચ કોપી</button>
          </div>
          <textarea id="fb-out-transcript" class="input" rows="4" style="width: 100%; padding: 10px 12px; font-size: 0.9rem; line-height: 1.55;"></textarea>
        </div>
      </div>
    </div>
  `;

  const videoSelectEl = container.querySelector('#fb-video-select');
  const fileInputEl = container.querySelector('#fb-video-file-input');
  const previewWrapEl = container.querySelector('#fb-video-preview-wrap');
  const srcPlayerEl = container.querySelector('#fb-source-video-player');
  const statusEl = container.querySelector('#fb-status');
  const trimCardEl = container.querySelector('#fb-trim-card');
  const introBoxEl = container.querySelector('#fb-detected-intro-box');
  const cutStartEl = container.querySelector('#fb-cut-start');
  const cutEndEl = container.querySelector('#fb-cut-end');
  const cleanWrapEl = container.querySelector('#fb-clean-video-wrap');
  const cleanPlayerEl = container.querySelector('#fb-clean-video-player');
  const cleanDlEl = container.querySelector('#fb-clean-download');
  const seoCardEl = container.querySelector('#fb-seo-card');
  const outTitleEl = container.querySelector('#fb-out-title');
  const outDescEl = container.querySelector('#fb-out-desc');
  const outTagsEl = container.querySelector('#fb-out-tags');
  const outTranscriptEl = container.querySelector('#fb-out-transcript');

  function setStatus(msg, isErr = false) {
    if (!msg) {
      statusEl.style.display = 'none';
      return;
    }
    statusEl.style.display = 'block';
    statusEl.style.color = isErr ? '#f87171' : '#34d399';
    statusEl.textContent = msg;
  }

  async function loadVideos() {
    try {
      const res = await fetch('/api/voice/saved-videos').then(r => r.json());
      savedVideos = Array.isArray(res?.videos) ? res.videos : [];
      if (savedVideos.length === 0) {
        videoSelectEl.innerHTML = `<option value="">કોઈ સેવ વિડીયો મળ્યો નથી — નીચેથી વિડીયો પસંદ કરો</option>`;
        return;
      }
      videoSelectEl.innerHTML = savedVideos.map(v => {
        const mb = v.sizeBytes ? ` (${(v.sizeBytes / (1024 * 1024)).toFixed(1)} MB)` : '';
        return `<option value="${escapeHtml(v.filename)}">${escapeHtml(v.filename)}${mb}</option>`;
      }).join('');
      const preferred = savedVideos.find(v => v.filename !== 'latest_video.mp4') || savedVideos[0];
      if (preferred) {
        videoSelectEl.value = preferred.filename;
        activeVideoFilename = preferred.filename;
        srcPlayerEl.src = preferred.url;
        previewWrapEl.style.display = 'block';
      }
    } catch (err) {
      videoSelectEl.innerHTML = `<option value="">લોડ કરવામાં ભૂલ: ${escapeHtml(err.message)}</option>`;
    }
  }

  videoSelectEl.addEventListener('change', () => {
    uploadedVideoBase64 = '';
    activeVideoFilename = videoSelectEl.value || '';
    const v = savedVideos.find(x => x.filename === activeVideoFilename);
    if (v) {
      srcPlayerEl.src = v.url;
      previewWrapEl.style.display = 'block';
    }
  });

  fileInputEl.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('📁 વિડીયો તૈયાર થઈ રહ્યો છે...');
    const rd = new FileReader();
    rd.onload = () => {
      uploadedVideoBase64 = rd.result || '';
      activeVideoFilename = '';
      srcPlayerEl.src = URL.createObjectURL(file);
      previewWrapEl.style.display = 'block';
      setStatus(`✅ "${file.name}" પસંદ થયો — હવે નીચેનું બટન દબાવો.`);
    };
    rd.readAsDataURL(file);
  });

  container.querySelector('#fb-btn-refresh-videos').addEventListener('click', loadVideos);

  container.querySelector('#fb-btn-analyze').addEventListener('click', async () => {
    if (!activeVideoFilename && !uploadedVideoBase64) {
      setStatus('કૃપા કરીને પહેલા વિડીયો પસંદ કરો.', true);
      return;
    }
    setStatus('🎧 AI વિડીયોમાંથી અવાજ સાંભળી રહ્યું છે, YouTube શબ્દો શોધીને Facebook Title/Description/Tags બનાવી રહ્યું છે...');
    try {
      const res = await fetch('/api/voice/facebook-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoFilename: activeVideoFilename,
          videoBase64: uploadedVideoBase64
        })
      }).then(r => r.json());

      if (!res || !res.success) {
        throw new Error(res?.error || 'વિશ્લેષણ નિષ્ફળ ગયું');
      }

      if (res.videoFilename) activeVideoFilename = res.videoFilename;
      trimCardEl.style.display = 'block';
      seoCardEl.style.display = 'block';

      introBoxEl.innerHTML = res.detectedIntroText
        ? `<b>ઓળખાયેલા YouTube શબ્દો:</b> "${escapeHtml(res.detectedIntroText)}" (${Number(res.introStartSec || 0).toFixed(1)}s થી ${Number(res.introEndSec || 0).toFixed(1)}s)`
        : `જો વિડીયોની શરૂઆતમાં YouTube ઇન્ટ્રો હોય તો નીચે સમય સેટ કરીને કાપી શકો છો.`;

      cutStartEl.value = Number(res.introStartSec || 0).toFixed(1);
      cutEndEl.value = Number(res.introEndSec > res.introStartSec ? res.introEndSec : 4.5).toFixed(1);

      outTitleEl.value = res.fbTitle || '';
      outDescEl.value = res.fbDescription || '';
      outTagsEl.value = Array.isArray(res.fbTags) ? res.fbTags.join(' ') : (res.fbTags || '');
      outTranscriptEl.value = res.cleanTranscript || res.rawTranscript || '';

      setStatus(`✅ AI વિશ્લેષણ પૂરું (${res.source === 'gemini' ? 'Google Gemini Audio' : 'Fallback'})! YouTube શબ્દો કાપવા નીચે ✂️ બટન દબાવો.`);
    } catch (err) {
      setStatus(`ભૂલ: ${err.message}`, true);
    }
  });

  container.querySelector('#fb-btn-trim-video').addEventListener('click', async () => {
    if (!activeVideoFilename) {
      setStatus('મૂળ વિડીયો પસંદ કરેલો નથી.', true);
      return;
    }
    const cutStartSec = Number(cutStartEl.value) || 0;
    const cutEndSec = Number(cutEndEl.value) || 0;
    setStatus(`✂️ વિડીયોમાંથી ${cutStartSec}s થી ${cutEndSec}s (YouTube ઇન્ટ્રો) કપાઈ રહ્યું છે...`);
    try {
      const res = await fetch('/api/voice/facebook-trim-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoFilename: activeVideoFilename,
          cutStartSec,
          cutEndSec
        })
      }).then(r => r.json());

      if (!res || !res.success) {
        throw new Error(res?.error || 'વિડીયો કાપવામાં ભૂલ આવી');
      }

      cleanPlayerEl.src = res.videoUrl;
      cleanDlEl.href = `/api/voice/download-video?file=${encodeURIComponent(res.filename)}&name=${encodeURIComponent(res.filename)}`;
      cleanDlEl.setAttribute('download', res.filename);
      cleanWrapEl.style.display = 'block';
      setStatus('✅ Clean Facebook MP4 વિડીયો તૈયાર છે! YouTube ઇન્ટ્રો સફળતાપૂર્વક નીકળી ગયો.');
      showNoticeToast('✅ Clean Facebook MP4 વિડીયો તૈયાર છે!', 'success');
    } catch (err) {
      setStatus(`ભૂલ: ${err.message}`, true);
    }
  });

  container.querySelector('#fb-copy-title').addEventListener('click', () => copyToClipboard(outTitleEl.value, 'Facebook Title કોપી થયો! ✓'));
  container.querySelector('#fb-copy-desc').addEventListener('click', () => copyToClipboard(outDescEl.value, 'Facebook Description કોપી થયું! ✓'));
  container.querySelector('#fb-copy-tags').addEventListener('click', () => copyToClipboard(outTagsEl.value, 'Facebook Tags કોપી થયા! ✓'));
  container.querySelector('#fb-copy-transcript').addEventListener('click', () => copyToClipboard(outTranscriptEl.value, 'સાફ સ્પીચ કોપી થઈ! ✓'));

  await loadVideos();
}
