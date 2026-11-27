import { api } from '../api.js?v=103.0';
import { copyToClipboard } from '../utils/clipboard.js?v=90.0';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function readImageAsDataUrl(file, maxDim = 1500, quality = 0.9) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('ફોટો વાંચવામાં ભૂલ આવી'));
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('ઓડિયો વાંચવામાં ભૂલ આવી'));
    reader.readAsDataURL(blob);
  });
}

export async function renderTalkingAvatar(container, navCallback) {
  let speakerImageBase64 = '';
  let speechAudioBase64 = '';
  let speechAudioUrl = '';
  let productImages = [];
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordTimer = null;
  let recordSec = 0;
  let pollTimer = null;

  container.innerHTML = `
    <div style="max-width: 1020px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; padding-bottom: 48px;">
      <!-- Header -->
      <div class="card" style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.16), rgba(56, 189, 248, 0.14)); border: 1.5px solid rgba(236, 72, 153, 0.45); padding: 20px;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div>
            <h2 style="margin: 0 0 6px 0; font-size: 1.38rem; color: #f8fafc;">
              🗣️ AI Talking Avatar Studio (ફોટો + Speech → અસલી બોલતો વિડિયો)
            </h2>
            <p style="margin: 0; color: var(--text-muted); font-size: 0.92rem; line-height: 1.5;">
              વ્યક્તિનો ફોટો + તમારી Speech + વસ્તુના ફોટા ઉમેરો — RTX 3060 GPU પર <b>અસલી લિપ-સિંક, આંખો પલકતી અને ચહેરાના હાવભાવ સાથે Real MP4 વિડિયો</b> બનશે!
            </p>
          </div>
          <div id="av-engine-badge" style="padding: 8px 14px; border-radius: 12px; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(148, 163, 184, 0.35); font-size: 0.84rem; font-weight: 800; color: #fbbf24;">
            ⏳ GPU એન્જિન તપાસી રહ્યું છે...
          </div>
        </div>
      </div>

      <!-- Grid: Speaker Photo + Speech Audio -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(310px, 1fr)); gap: 16px;">
        <!-- Card 1: Speaker Photo -->
        <div class="card" style="padding: 20px; border: 1.5px solid rgba(236, 72, 153, 0.4);">
          <div style="font-weight: 800; color: #f472b6; font-size: 1rem; margin-bottom: 10px;">
            ૧. બોલનાર વ્યક્તિનો અસલી ફોટો (Speaker Photo) *
          </div>
          <div id="av-speaker-drop" style="border: 2px dashed rgba(244, 114, 182, 0.55); border-radius: 14px; padding: 18px; text-align: center; cursor: pointer; background: rgba(236, 72, 153, 0.06);">
            <input type="file" id="av-speaker-input" accept="image/*" style="display: none;" />
            <div id="av-speaker-placeholder">
              <div style="font-size: 2rem; margin-bottom: 6px;">🧑</div>
              <div style="font-weight: 700; color: #f8fafc;">વ્યક્તિનો ફોટો પસંદ કરો</div>
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px;">
                સીધો, સ્પષ્ટ ચહેરાનો ફોટો રાખો એટલે અસલી જેવો બોલતો વિડિયો બને
              </div>
            </div>
            <img id="av-speaker-preview" alt="Speaker" style="display: none; max-width: 100%; max-height: 230px; border-radius: 12px; margin: 0 auto; object-fit: contain;" />
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
            <span id="av-speaker-status" style="font-size: 0.8rem; color: var(--text-muted);">કોઈ ફોટો પસંદ કરેલ નથી</span>
            <button id="av-btn-clear-speaker" type="button" class="btn btn-outline" style="padding: 4px 10px; font-size: 0.76rem; display: none;">ફોટો બદલો</button>
          </div>
        </div>

        <!-- Card 2: Speech Audio -->
        <div class="card" style="padding: 20px; border: 1.5px solid rgba(56, 189, 248, 0.4);">
          <div style="font-weight: 800; color: #38bdf8; font-size: 1rem; margin-bottom: 10px;">
            ૨. તમારી Speech / અવાજ (Speech Audio) *
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px;">
            <!-- Option A: Mic Record -->
            <div style="padding: 12px; border-radius: 12px; background: rgba(15, 23, 42, 0.55); border: 1px solid rgba(56, 189, 248, 0.3);">
              <div style="font-size: 0.84rem; font-weight: 700; color: #e2e8f0; margin-bottom: 8px;">🎙️ વિકલ્પ A: અહીં જ તમારો અવાજ રેકોર્ડ કરો</div>
              <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <button id="av-btn-rec-start" type="button" class="btn btn-primary" style="padding: 8px 14px; font-size: 0.84rem; font-weight: 800; background: #ef4444; border: none;">
                  🔴 રેકોર્ડ શરૂ કરો
                </button>
                <button id="av-btn-rec-stop" type="button" class="btn btn-outline" style="padding: 8px 14px; font-size: 0.84rem; font-weight: 800; display: none;">
                  ⏹️ બંધ કરો
                </button>
                <span id="av-rec-timer" style="font-size: 0.84rem; font-weight: 800; color: #fca5a5;"></span>
              </div>
            </div>

            <!-- Option B: Upload Audio File -->
            <div style="padding: 12px; border-radius: 12px; background: rgba(15, 23, 42, 0.55); border: 1px solid rgba(168, 85, 247, 0.3);">
              <div style="font-size: 0.84rem; font-weight: 700; color: #e2e8f0; margin-bottom: 6px;">📁 વિકલ્પ B: ફોન/PC માંથી MP3 / WAV / Voice Note અપલોડ કરો</div>
              <input type="file" id="av-audio-input" accept="audio/*,video/mp4" class="input" style="width: 100%; padding: 6px; font-size: 0.84rem;" />
            </div>

            <!-- Option C: Pick Saved Audio -->
            <div style="padding: 12px; border-radius: 12px; background: rgba(15, 23, 42, 0.55); border: 1px solid rgba(16, 185, 129, 0.3);">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 0.84rem; font-weight: 700; color: #e2e8f0;">💾 વિકલ્પ C: અગાઉ બનાવેલો Audio પસંદ કરો</span>
                <button id="av-btn-refresh-audios" type="button" class="btn btn-outline" style="padding: 2px 8px; font-size: 0.74rem;">🔄</button>
              </div>
              <select id="av-saved-audio-select" class="input" style="width: 100%; padding: 8px; border-radius: 8px; font-size: 0.86rem;">
                <option value="">-- સેવ કરેલ ઓડિયો પસંદ કરો --</option>
              </select>
            </div>
          </div>

          <div id="av-audio-preview-box" style="margin-top: 12px; display: none;">
            <div id="av-audio-label" style="font-size: 0.8rem; color: #34d399; font-weight: 700; margin-bottom: 4px;"></div>
            <audio id="av-audio-player" controls style="width: 100%; height: 38px;"></audio>
          </div>
        </div>
      </div>

      <!-- Card 3: Object / Product Photos + Studio Options -->
      <div class="card" style="padding: 20px; border: 1.5px solid rgba(16, 185, 129, 0.4);">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 10px;">
          <span style="font-weight: 800; color: #34d399; font-size: 1rem;">
            ૩. વસ્તુ / વિષયના અસલી ફોટા ઉમેરો (વૈકલ્પિક — 0 થી 10 ફોટા)
          </span>
          <span id="av-product-count" style="font-size: 0.82rem; color: var(--text-muted);">૦ વસ્તુના ફોટા</span>
        </div>

        <div id="av-product-drop" style="border: 2px dashed rgba(52, 211, 153, 0.5); border-radius: 12px; padding: 14px; text-align: center; cursor: pointer; background: rgba(16, 185, 129, 0.05);">
          <input type="file" id="av-product-input" accept="image/*" multiple style="display: none;" />
          <div style="font-weight: 700; color: #e2e8f0; font-size: 0.92rem;">
            📦 અહીં ક્લિક કરીને વસ્તુ / પ્રોડક્ટ / સ્લાઇડના ફોટા ઉમેરો (ગમે તેટલા)
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 3px;">
            ફોટો નાખશો તો સ્ક્રીન પર વસ્તુ દેખાશે અને વ્યક્તિ તેને અસલી રીતે સમજાવતો દેખાશે
          </div>
        </div>
        <div id="av-product-grid" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px;"></div>

        <!-- Studio Settings -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(148, 163, 184, 0.2);">
          <div>
            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">📐 વિડિયો લેઆઉટ (Layout):</label>
            <select id="av-layout" class="input" style="width: 100%; padding: 8px 10px; border-radius: 8px; font-weight: 700;">
              <option value="pip" selected>🖼️ વસ્તુ મુખ્ય + ખૂણામાં બોલતો વ્યક્તિ (PiP)</option>
              <option value="split">⚖️ બાજુ-બાજુ (અડધે વ્યક્તિ + અડધે વસ્તુ)</option>
              <option value="full">👤 ફક્ત બોલતો વ્યક્તિ (Full Video)</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">📱 સ્ક્રીન સાઇઝ:</label>
            <select id="av-aspect" class="input" style="width: 100%; padding: 8px 10px; border-radius: 8px; font-weight: 700;">
              <option value="16:9" selected>16:9 YouTube / Facebook HD</option>
              <option value="9:16">9:16 Reels / Shorts</option>
              <option value="1:1">1:1 Facebook Square</option>
              <option value="raw">ઓરિજિનલ ફોટો સાઇઝ</option>
            </select>
          </div>
          <div>
            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: #cbd5e1; margin-bottom: 4px;">🎯 ચહેરાની ક્વોલિટી:</label>
            <select id="av-size" class="input" style="width: 100%; padding: 8px 10px; border-radius: 8px; font-weight: 700;">
              <option value="256" selected>ઝડપી HD + GFPGAN Sharp (Recommended)</option>
              <option value="512">Ultra HD 512px (વધુ સ્પષ્ટ, થોડો વધુ સમય)</option>
            </select>
          </div>
          <div style="display: flex; flex-direction: column; justify-content: center; gap: 6px;">
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.84rem; font-weight: 700; color: #f8fafc; cursor: pointer;">
              <input type="checkbox" id="av-enhancer" checked /> ✨ GFPGAN ચહેરો ક્લિયર (HD)
            </label>
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.84rem; font-weight: 700; color: #f8fafc; cursor: pointer;">
              <input type="checkbox" id="av-still" /> 🧘 શરીર સ્થિર રાખો (Static Pose)
            </label>
          </div>
        </div>
      </div>

      <!-- Generate Button & Progress -->
      <div class="card" style="padding: 20px; border: 1.5px solid rgba(139, 92, 246, 0.45);">
        <button id="av-btn-render" class="btn btn-primary" style="width: 100%; padding: 15px 20px; font-size: 1.06rem; font-weight: 800; background: linear-gradient(135deg, #ec4899, #8b5cf6, #0ea5e9); border: none; border-radius: 12px;">
          🎬 અસલી બોલતો AI વિડિયો બનાવો (Generate Real Talking Video)
        </button>

        <div id="av-progress-box" style="margin-top: 14px; display: none;">
          <div style="display: flex; justify-content: space-between; font-size: 0.88rem; font-weight: 800; color: #38bdf8; margin-bottom: 6px;">
            <span id="av-step-label">તૈયારી થઈ રહી છે...</span>
            <span id="av-pct-label">0%</span>
          </div>
          <div style="width: 100%; height: 10px; background: rgba(15, 23, 42, 0.8); border-radius: 999px; overflow: hidden; border: 1px solid rgba(56, 189, 248, 0.35);">
            <div id="av-progress-bar" style="width: 5%; height: 100%; background: linear-gradient(90deg, #ec4899, #38bdf8, #10b981); transition: width 0.4s ease;"></div>
          </div>
          <pre id="av-logs-box" style="margin-top: 10px; padding: 10px; border-radius: 10px; background: rgba(2, 6, 23, 0.85); color: #94a3b8; font-size: 0.76rem; max-height: 120px; overflow-y: auto; white-space: pre-wrap;"></pre>
        </div>

        <div id="av-error-box" style="margin-top: 12px; padding: 12px; border-radius: 10px; background: rgba(239, 68, 68, 0.14); border: 1px solid #ef4444; color: #fca5a5; font-size: 0.88rem; display: none;"></div>
      </div>

      <!-- Final Output Video Card -->
      <div id="av-result-card" class="card" style="padding: 20px; border: 1.5px solid rgba(16, 185, 129, 0.6); background: rgba(16, 185, 129, 0.06); display: none;">
        <div style="font-weight: 800; color: #34d399; font-size: 1.12rem; margin-bottom: 12px;">
          🎉 તમારો અસલી બોલતો AI વિડિયો તૈયાર છે!
        </div>
        <video id="av-result-video" controls playsinline style="width: 100%; max-height: 500px; border-radius: 12px; background: #000; border: 1px solid rgba(148, 163, 184, 0.3);"></video>
        <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px;">
          <a id="av-btn-download" href="#" download class="btn btn-primary" style="flex: 1; min-width: 180px; text-align: center; font-weight: 800; text-decoration: none; background: #10b981; border: none;">
            📥 વિડિયો ડાઉનલોડ કરો (MP4)
          </a>
          <button id="av-btn-open-fb" type="button" class="btn btn-outline" style="flex: 1; min-width: 180px; font-weight: 800; border-color: #3b82f6; color: #93c5fd;">
            📘 Facebook Video &amp; SEO માં ખોલો
          </button>
          <button id="av-btn-copy-link" type="button" class="btn btn-outline" style="padding: 10px 14px; font-weight: 700;">
            🔗 લિંક કોપી કરો
          </button>
        </div>
      </div>
    </div>
  `;

  const engineBadgeEl = container.querySelector('#av-engine-badge');
  const speakerDropEl = container.querySelector('#av-speaker-drop');
  const speakerInputEl = container.querySelector('#av-speaker-input');
  const speakerPlaceholderEl = container.querySelector('#av-speaker-placeholder');
  const speakerPreviewEl = container.querySelector('#av-speaker-preview');
  const speakerStatusEl = container.querySelector('#av-speaker-status');
  const btnClearSpeaker = container.querySelector('#av-btn-clear-speaker');

  const btnRecStart = container.querySelector('#av-btn-rec-start');
  const btnRecStop = container.querySelector('#av-btn-rec-stop');
  const recTimerEl = container.querySelector('#av-rec-timer');
  const audioInputEl = container.querySelector('#av-audio-input');
  const savedAudioSelectEl = container.querySelector('#av-saved-audio-select');
  const audioPreviewBoxEl = container.querySelector('#av-audio-preview-box');
  const audioLabelEl = container.querySelector('#av-audio-label');
  const audioPlayerEl = container.querySelector('#av-audio-player');

  const productDropEl = container.querySelector('#av-product-drop');
  const productInputEl = container.querySelector('#av-product-input');
  const productCountEl = container.querySelector('#av-product-count');
  const productGridEl = container.querySelector('#av-product-grid');

  const layoutEl = container.querySelector('#av-layout');
  const aspectEl = container.querySelector('#av-aspect');
  const sizeEl = container.querySelector('#av-size');
  const enhancerEl = container.querySelector('#av-enhancer');
  const stillEl = container.querySelector('#av-still');

  const btnRender = container.querySelector('#av-btn-render');
  const progressBoxEl = container.querySelector('#av-progress-box');
  const stepLabelEl = container.querySelector('#av-step-label');
  const pctLabelEl = container.querySelector('#av-pct-label');
  const progressBarEl = container.querySelector('#av-progress-bar');
  const logsBoxEl = container.querySelector('#av-logs-box');
  const errorBoxEl = container.querySelector('#av-error-box');

  const resultCardEl = container.querySelector('#av-result-card');
  const resultVideoEl = container.querySelector('#av-result-video');
  const btnDownload = container.querySelector('#av-btn-download');

  function showError(msg) {
    errorBoxEl.textContent = msg ? `⚠️ ${msg}` : '';
    errorBoxEl.style.display = msg ? 'block' : 'none';
  }

  async function refreshStatus() {
    try {
      const st = await api.getAvatarStatus();
      if (st.ready) {
        engineBadgeEl.textContent = `✅ RTX 3060 GPU Ready (${st.checkpoints?.gfpgan ? 'GFPGAN HD + ' : ''}SadTalker Live)`;
        engineBadgeEl.style.color = '#34d399';
        engineBadgeEl.style.borderColor = '#10b981';
      } else {
        const missing = [];
        if (!st.pythonOk) missing.push('Python');
        if (!st.checkpoints?.model256) missing.push('256px Model');
        if (!st.checkpoints?.mapping109) missing.push('Mapping');
        engineBadgeEl.textContent = `⏳ મોડેલ ડાઉનલોડ ચાલુ છે (${missing.join(', ') || 'Setting up'})`;
        engineBadgeEl.style.color = '#fbbf24';
      }
    } catch (_) {
      engineBadgeEl.textContent = '⚠️ GPU એન્જિન સ્ટેટસ મળી શક્યું નહીં';
    }
  }

  async function refreshAudios() {
    try {
      const res = await api.getAvatarAudios();
      const list = Array.isArray(res.audios) ? res.audios : [];
      savedAudioSelectEl.innerHTML = `<option value="">-- સેવ કરેલ ઓડિયો (${list.length}) પસંદ કરો --</option>` +
        list.map(a => `<option value="${escapeHtml(a.url)}">${escapeHtml(a.filename)} (${a.sizeKB} KB)</option>`).join('');
    } catch (_) {}
  }

  // Speaker photo handlers
  speakerDropEl.addEventListener('click', () => speakerInputEl.click());
  speakerInputEl.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      speakerImageBase64 = await readImageAsDataUrl(file, 1500, 0.92);
      speakerPreviewEl.src = speakerImageBase64;
      speakerPreviewEl.style.display = 'block';
      speakerPlaceholderEl.style.display = 'none';
      speakerStatusEl.textContent = `✅ પસંદ: ${file.name}`;
      speakerStatusEl.style.color = '#34d399';
      btnClearSpeaker.style.display = 'inline-block';
    } catch (err) {
      showError(err.message);
    }
    speakerInputEl.value = '';
  });

  btnClearSpeaker.addEventListener('click', () => {
    speakerImageBase64 = '';
    speakerPreviewEl.style.display = 'none';
    speakerPlaceholderEl.style.display = 'block';
    speakerStatusEl.textContent = 'કોઈ ફોટો પસંદ કરેલ નથી';
    speakerStatusEl.style.color = 'var(--text-muted)';
    btnClearSpeaker.style.display = 'none';
  });

  // Mic Recorder
  btnRecStart.addEventListener('click', async () => {
    showError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        clearInterval(recordTimer);
        const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        speechAudioBase64 = await blobToDataUrl(blob);
        speechAudioUrl = '';
        savedAudioSelectEl.value = '';
        audioPlayerEl.src = speechAudioBase64;
        audioLabelEl.textContent = `✅ રેકોર્ડ કરેલ Speech તૈયાર છે (${recordSec} સેકન્ડ)`;
        audioPreviewBoxEl.style.display = 'block';
        btnRecStart.style.display = 'inline-block';
        btnRecStop.style.display = 'none';
      };
      mediaRecorder.start();
      recordSec = 0;
      recTimerEl.textContent = '🔴 00:00';
      btnRecStart.style.display = 'none';
      btnRecStop.style.display = 'inline-block';
      recordTimer = setInterval(() => {
        recordSec += 1;
        const mm = String(Math.floor(recordSec / 60)).padStart(2, '0');
        const ss = String(recordSec % 60).padStart(2, '0');
        recTimerEl.textContent = `🔴 ${mm}:${ss}`;
      }, 1000);
    } catch (err) {
      showError('માઇક્રોફોન ચાલુ થઈ શક્યો નહીં: ' + err.message);
    }
  });

  btnRecStop.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
  });

  // Upload audio file
  audioInputEl.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      speechAudioBase64 = await blobToDataUrl(file);
      speechAudioUrl = '';
      savedAudioSelectEl.value = '';
      audioPlayerEl.src = speechAudioBase64;
      audioLabelEl.textContent = `✅ અપલોડ કરેલ Speech: ${file.name}`;
      audioPreviewBoxEl.style.display = 'block';
    } catch (err) {
      showError(err.message);
    }
  });

  // Select saved audio
  savedAudioSelectEl.addEventListener('change', () => {
    const val = savedAudioSelectEl.value;
    if (!val) return;
    speechAudioUrl = val;
    speechAudioBase64 = '';
    audioPlayerEl.src = val;
    audioLabelEl.textContent = `✅ સેવ કરેલ Speech પસંદ: ${val.split('/').pop()}`;
    audioPreviewBoxEl.style.display = 'block';
  });

  container.querySelector('#av-btn-refresh-audios').addEventListener('click', refreshAudios);

  // Product / object photos
  function renderProductGrid() {
    productCountEl.textContent = `${productImages.length} વસ્તુના ફોટા (મહત્તમ 10)`;
    productGridEl.innerHTML = productImages.map((src, idx) => `
      <div style="position: relative; width: 96px; height: 96px; border-radius: 10px; overflow: hidden; border: 1.5px solid rgba(52, 211, 153, 0.6);">
        <img src="${src}" alt="Product ${idx + 1}" style="width: 100%; height: 100%; object-fit: cover;" />
        <button data-rm-prod="${idx}" title="દૂર કરો" style="position: absolute; top: 4px; right: 4px; background: rgba(15,23,42,0.85); color: #fff; border: none; border-radius: 50%; width: 22px; height: 22px; cursor: pointer; font-weight: 800; font-size: 11px;">✕</button>
      </div>
    `).join('');
    productGridEl.querySelectorAll('[data-rm-prod]').forEach(b => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        productImages.splice(Number(b.getAttribute('data-rm-prod')), 1);
        renderProductGrid();
      });
    });
  }

  productDropEl.addEventListener('click', () => productInputEl.click());
  productInputEl.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'));
    for (const f of files) {
      if (productImages.length >= 10) break;
      try {
        productImages.push(await readImageAsDataUrl(f, 1600, 0.9));
      } catch (_) {}
    }
    renderProductGrid();
    productInputEl.value = '';
  });

  // Render Job
  btnRender.addEventListener('click', async () => {
    showError('');
    if (!speakerImageBase64) {
      showError('પહેલા બોલનાર વ્યક્તિનો અસલી ફોટો અપલોડ કરો.');
      return;
    }
    if (!speechAudioBase64 && !speechAudioUrl) {
      showError('તમારી Speech રેકોર્ડ કરો, અપલોડ કરો અથવા સેવ કરેલો ઓડિયો પસંદ કરો.');
      return;
    }

    if (pollTimer) clearInterval(pollTimer);
    btnRender.disabled = true;
    btnRender.style.opacity = '0.6';
    progressBoxEl.style.display = 'block';
    resultCardEl.style.display = 'none';
    progressBarEl.style.width = '5%';
    pctLabelEl.textContent = '5%';
    stepLabelEl.textContent = 'AI GPU એન્જિન શરૂ થઈ રહ્યું છે...';
    logsBoxEl.textContent = '';

    try {
      const startRes = await api.renderTalkingAvatar({
        speakerImageBase64,
        speechAudioBase64,
        speechAudioUrl,
        productImagesBase64: productImages,
        layout: layoutEl.value,
        aspect: aspectEl.value,
        size: Number(sizeEl.value),
        enhancer: enhancerEl.checked,
        still: stillEl.checked,
        expressionScale: 1.15
      });

      const jobId = startRes.jobId;
      pollTimer = setInterval(async () => {
        if (!document.body.contains(container)) {
          clearInterval(pollTimer);
          return;
        }
        try {
          const jr = await api.getAvatarJob(jobId);
          const job = jr.job;
          if (!job) return;
          progressBarEl.style.width = `${job.progress || 10}%`;
          pctLabelEl.textContent = `${job.progress || 10}%`;
          stepLabelEl.textContent = job.step || 'પ્રોસેસ ચાલુ છે...';
          if (Array.isArray(job.logs) && job.logs.length) {
            logsBoxEl.textContent = job.logs.slice(-12).join('\n');
            logsBoxEl.scrollTop = logsBoxEl.scrollHeight;
          }

          if (job.status === 'completed') {
            clearInterval(pollTimer);
            btnRender.disabled = false;
            btnRender.style.opacity = '1';
            const srcUrl = `${job.videoUrl}?t=${Date.now()}`;
            resultVideoEl.src = srcUrl;
            btnDownload.href = job.videoUrl;
            btnDownload.setAttribute('download', job.filename || 'talking_avatar.mp4');
            resultCardEl.style.display = 'block';
            resultCardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            container.querySelector('#av-btn-copy-link').onclick = () => {
              const fullWatch = `${window.location.origin}/watch?v=${encodeURIComponent(job.filename)}`;
              copyToClipboard(fullWatch, 'વિડિયો શેર લિંક કોપી થઈ! ✓');
            };
          } else if (job.status === 'failed') {
            clearInterval(pollTimer);
            btnRender.disabled = false;
            btnRender.style.opacity = '1';
            showError(job.error || 'વિડિયો બનાવવામાં સમસ્યા આવી.');
          }
        } catch (pollErr) {
          clearInterval(pollTimer);
          btnRender.disabled = false;
          btnRender.style.opacity = '1';
          showError(pollErr.message);
        }
      }, 1500);
    } catch (err) {
      btnRender.disabled = false;
      btnRender.style.opacity = '1';
      showError(err.message);
    }
  });

  container.querySelector('#av-btn-open-fb').addEventListener('click', () => {
    if (typeof navCallback === 'function') navCallback('facebook');
    else window.location.hash = 'facebook';
  });

  refreshStatus();
  refreshAudios();
}
