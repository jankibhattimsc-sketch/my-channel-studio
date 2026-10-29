import { projectState } from '../utils/projectState.js';
import { copyToClipboard } from '../utils/clipboard.js';

export function renderEditing(container, navigateTo) {
  const p = projectState.getActiveProject();
  const editing = p.editing || {};
  const checklist = editing.checklist || {};

  function updateEditingState(partial) {
    projectState.updateTool('editing', partial);
  }

  container.innerHTML = `
    <!-- Top Project Context Header -->
    <div style="background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1.5px solid rgba(56, 189, 248, 0.35); border-radius: var(--radius-lg); padding: 18px 22px; margin-bottom: 20px; box-shadow: 0 8px 25px rgba(0,0,0,0.35);">
      <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <button id="btn-back-to-projects" class="btn btn-outline btn-sm" style="font-weight: 700; display: flex; align-items: center; gap: 6px;">
            <span>←</span> બધા પ્રોજેક્ટ્સ (Projects)
          </button>
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.3rem;">🎬</span>
              <h2 style="font-size: 1.25rem; font-weight: 800; color: #fff; margin: 0;">
                ૫. વિડિયો એડિટિંગ ગાઇડ & કટ લિસ્ટ (Video Editing)
              </h2>
            </div>
            <p style="font-size: 0.82rem; color: #38bdf8; margin: 2px 0 0 0; font-weight: 600;">
              📁 પ્રોજેક્ટ: ${p.name}
            </p>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <span class="badge badge-green" style="font-size: 0.75rem; font-weight: 800; display: flex; align-items: center; gap: 5px;">
            <span class="status-dot"></span> સ્વચાલિત સેવ (Auto-Saved)
          </span>
          <button id="btn-copy-editing-plan" class="btn btn-outline btn-sm" style="font-weight: 700;">
            <span>📋</span> એડિટિંગ પ્લાન કોપી કરો
          </button>
        </div>
      </div>
    </div>

    <!-- Main 2-Column Grid -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 20px; margin-bottom: 24px;">
      
      <!-- Left Column: Video Settings & Timeline Blueprint -->
      <div class="card" style="border: 1px solid rgba(255,255,255,0.1);">
        <h3 style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
          <span>⚙️</span> વિડિયો ફોર્મેટ & સેટિંગ્સ
        </h3>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px;">
          <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 4px;">રેશિયો (Ratio)</label>
            <select id="select-ratio" class="form-select" style="font-size: 0.82rem; padding: 6px;">
              <option value="16:9" ${editing.aspectRatio === '16:9' ? 'selected' : ''}>૧૬:૯ (Main Video)</option>
              <option value="9:16" ${editing.aspectRatio === '9:16' ? 'selected' : ''}>૯:૧૬ (Shorts / Reel)</option>
            </select>
          </div>

          <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 4px;">ક્વોલિટી (Quality)</label>
            <select id="select-resolution" class="form-select" style="font-size: 0.82rem; padding: 6px;">
              <option value="1080p Full HD" ${editing.resolution === '1080p Full HD' ? 'selected' : ''}>1080p Full HD</option>
              <option value="4K UHD" ${editing.resolution === '4K UHD' ? 'selected' : ''}>4K Ultra HD</option>
              <option value="720p HD" ${editing.resolution === '720p HD' ? 'selected' : ''}>720p HD</option>
            </select>
          </div>

          <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 4px;">ફ્રેમ રેટ (FPS)</label>
            <select id="select-fps" class="form-select" style="font-size: 0.82rem; padding: 6px;">
              <option value="60fps" ${editing.fps === '60fps' ? 'selected' : ''}>60 FPS (Ultra Smooth)</option>
              <option value="30fps" ${editing.fps === '30fps' ? 'selected' : ''}>30 FPS (Standard)</option>
            </select>
          </div>
        </div>

        <!-- Timeline Blueprint -->
        <h4 style="font-size: 0.95rem; font-weight: 800; color: #e2e8f0; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
          <span>⏱️</span> પ્રોફેશનલ ટાઇમલાઇન બ્લૂપ્રિન્ટ (Timeline Flow)
        </h4>

        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px;">
          <div style="background: rgba(220, 38, 38, 0.1); border-left: 3px solid #dc2626; padding: 10px 14px; border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.85rem; color: #fca5a5; margin-bottom: 2px;">
              <span>૦:૦૦ થી ૦:૫૦ — ધમાકેદાર હૂક (Viral Hook)</span>
              <span>પ્રથમ ૫૦ સેકન્ડ</span>
            </div>
            <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0;">
              • સત્તાવાર સરકારી પરિપત્ર અથવા ઠરાવ સ્ક્રીન પર ફુલ હાઇલાઇટ કરો.<br>
              • દર્શકને તાત્કાલિક ખબર પડવી જોઈએ કે તેમને શું ફાયદો થશે.
            </p>
          </div>

          <div style="background: rgba(37, 99, 235, 0.1); border-left: 3px solid #2563eb; padding: 10px 14px; border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.85rem; color: #93c5fd; margin-bottom: 2px;">
              <span>૦:૫૦ થી ૩:૩૦ — મુખ્ય પુરાવા & સ્લાઇડ્સ</span>
              <span>વિગતવાર માહિતી</span>
            </div>
            <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0;">
              • ૧૬:૯ સફેદ સ્લાઇડ્સનો ધીમો ઝૂમ-ઇન (Slow Zoom 100% to 105%) આપો.<br>
              • કીવર્ડ્સ બોલાય ત્યારે યલો ટેક્સ્ટ હાઇલાઇટ ઇફેક્ટ વાપરો.
            </p>
          </div>

          <div style="background: rgba(16, 185, 129, 0.1); border-left: 3px solid #10b981; padding: 10px 14px; border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.85rem; color: #6ee7b7; margin-bottom: 2px;">
              <span>૩:૩૦ થી ૭:૦૦ — ગણતરી & કેલ્ક્યુલેશન ટેબલ</span>
              <span>સાચો ફાયદો</span>
            </div>
            <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0;">
              • ટેબલ અને સ્પષ્ટ આંકડા દર્શાવો જેથી દર્શકોનો વિશ્વાસ વધે.
            </p>
          </div>

          <div style="background: rgba(168, 85, 247, 0.1); border-left: 3px solid #a855f7; padding: 10px 14px; border-radius: 6px;">
            <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: 0.85rem; color: #d8b4fe; margin-bottom: 2px;">
              <span>૭:૦૦ થી ૮:૩૦ — સમાપન & Call-To-Action</span>
              <span>સબ્સ્ક્રાઇબ & શેર</span>
            </div>
            <p style="font-size: 0.78rem; color: var(--text-secondary); margin: 0;">
              • લાઈક, શેર અને સબ્સ્ક્રાઇબ એનિમેશન બેલ આઇકન સાથે મૂકો.
            </p>
          </div>
        </div>

        <!-- Music & Sound Guidance -->
        <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 8px; padding: 12px;">
          <h4 style="font-size: 0.88rem; font-weight: 800; color: #fbbf24; margin: 0 0 6px 0; display: flex; align-items: center; gap: 6px;">
            <span>🎵</span> બેકગ્રાઉન્ડ મ્યુઝિક સેટિંગ્સ
          </h4>
          <p style="font-size: 0.8rem; color: #fde68a; margin: 0;">
            વોલ્યુમ લેવલ: <strong>-22dB થી -26dB</strong> વચ્ચે રાખવું (જેથી તમારો અવાજ સ્પષ્ટ અને બુલંદ સંભળાય). સંગીત ન્યૂઝ/ઇન્સ્પિરેશનલ હોવું જોઈએ, કોઈ કર્કશ બીટ્સ નહીં.
          </p>
        </div>
      </div>

      <!-- Right Column: Interactive Checklist & Custom Editor Notes -->
      <div class="card" style="border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h3 style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span>✅</span> એડિટિંગ ચેકલિસ્ટ (Auto-Saved)
          </h3>

          <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 22px;">
            ${[
              { id: 'introHook', label: 'પ્રથમ ૫૦ સેકન્ડમાં અસલી પરિપત્ર/જીઆર હાઇલાઇટ કર્યું' },
              { id: 'cutDeadSpace', label: 'વૉઇસમાંથી અટકાવો, ખાલી જગ્યા અને સાસના અવાજો કટ કર્યા' },
              { id: 'addSlides', label: '૧૬:૯ સફેદ PPT સ્લાઇડ્સ સમય પ્રમાણે યોગ્ય જગ્યાએ સેટ કરી' },
              { id: 'soundFx', label: 'સ્લાઇડ અને મહત્વના મુદ્દા બદલાય ત્યારે હળવો ડીંગ સાઉન્ડ મૂક્યો' },
              { id: 'colorCorrection', label: 'પરિપત્ર અને ટેક્સ્ટનો કોન્ટ્રાસ્ટ સ્પષ્ટ દેખાય તેવો રાખ્યો' },
              { id: 'outroSubscribe', label: 'છેલ્લે સબ્સ્ક્રાઇબ અને વોટ્સએપ ગ્રૂપમાં શેર કરવાનું એનિમેશન મૂક્યું' }
            ].map(item => `
              <label style="display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); padding: 10px 12px; border-radius: 8px; cursor: pointer; user-select: none;">
                <input type="checkbox" class="chk-editing-item" data-id="${item.id}" ${checklist[item.id] ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: #10b981; cursor: pointer;">
                <span style="font-size: 0.85rem; color: ${checklist[item.id] ? '#a7f3d0' : '#e2e8f0'}; font-weight: ${checklist[item.id] ? '700' : '500'};">
                  ${item.label}
                </span>
              </label>
            `).join('')}
          </div>

          <!-- Custom Notes Textarea -->
          <h4 style="font-size: 0.95rem; font-weight: 800; color: #e2e8f0; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span>📝</span> આ પ્રોજેક્ટ માટે તમારી પર્સનલ એડિટિંગ નોંધ:
          </h4>
          <textarea id="textarea-custom-notes" class="form-textarea" rows="6" placeholder="દા.ત. ૩:૩૦ મિનિટે પરિપત્રનો પાના નં. ૨ ઝૂમ કરવો, ૭:૦૦ મિનિટે સબ્સ્ક્રાઇબ બેલ મૂકવી..." style="font-size: 0.88rem; line-height: 1.5; width: 100%; margin-bottom: 8px;">${editing.customNotes || ''}</textarea>
          <span style="font-size: 0.72rem; color: var(--text-muted);">
            💡 નોંધ લખતાની સાથે જ આ પ્રોજેક્ટમાં આપોઆપ સેવ થઈ જાય છે.
          </span>
        </div>

        <!-- Bottom Navigation Buttons -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); gap: 10px;">
          <button id="btn-prev-voice" class="btn btn-secondary btn-sm" style="font-weight: 700;">
            ← ૪. મારો અવાજ
          </button>
          <button id="btn-next-canva" class="btn btn-success" style="font-weight: 800; padding: 8px 18px;">
            ૬. કેન્વા (Canva) પર જાઓ →
          </button>
        </div>
      </div>

    </div>
  `;

  // Attach Event Handlers
  container.querySelector('#btn-back-to-projects')?.addEventListener('click', () => {
    navigateTo('projects');
  });

  // Aspect ratio change
  container.querySelector('#select-ratio')?.addEventListener('change', (e) => {
    updateEditingState({ aspectRatio: e.target.value });
  });

  // Resolution change
  container.querySelector('#select-resolution')?.addEventListener('change', (e) => {
    updateEditingState({ resolution: e.target.value });
  });

  // FPS change
  container.querySelector('#select-fps')?.addEventListener('change', (e) => {
    updateEditingState({ fps: e.target.value });
  });

  // Checkbox changes
  container.querySelectorAll('.chk-editing-item').forEach(chk => {
    chk.addEventListener('change', () => {
      const id = chk.getAttribute('data-id');
      const cur = (projectState.getActiveProject().editing?.checklist) || {};
      cur[id] = chk.checked;
      updateEditingState({ checklist: cur });
    });
  });

  // Textarea auto-save on input
  container.querySelector('#textarea-custom-notes')?.addEventListener('input', (e) => {
    updateEditingState({ customNotes: e.target.value });
  });

  // Copy editing plan
  container.querySelector('#btn-copy-editing-plan')?.addEventListener('click', () => {
    const text = `=======================================================
🎬 એડિટિંગ પ્લાન: ${p.name}
=======================================================
• રેશિયો: ${editing.aspectRatio || '16:9'}
• ક્વોલિટી: ${editing.resolution || '1080p Full HD'} | ${editing.fps || '60fps'}
• બેકગ્રાઉન્ડ મ્યુઝિક: ${editing.musicStyle || 'Soft News Tone (-24dB)'}

⏱️ ટાઇમલાઇન ફ્લો:
- 0:00 - 0:50 : ધમાકેદાર હૂક & સત્તાવાર પરિપત્ર પુરાવો
- 0:50 - 3:30 : ૧૬:૯ સફેદ સ્લાઇડ્સ ઝૂમ-ઇન & ટેક્સ્ટ હાઇલાઇટ
- 3:30 - 7:00 : ગણતરી & કેલ્ક્યુલેશન ટેબલ
- 7:00 - 8:30 : સમાપન & સબ્સ્ક્રાઇબ બેલ એનિમેશન

📝 પર્સનલ નોંધ:
${editing.customNotes || 'કોઈ ખાસ નોંધ નથી'}`;

    copyToClipboard(text, 'એડિટિંગ પ્લાન કોપી થઈ ગયો! ✓');
  });

  // Navigation buttons
  container.querySelector('#btn-prev-voice')?.addEventListener('click', () => {
    navigateTo('myvoice');
  });
  container.querySelector('#btn-next-canva')?.addEventListener('click', () => {
    navigateTo('canva');
  });
}
