import { copyToClipboard, showNoticeToast } from '../utils/clipboard.js';
import { projectState } from '../utils/projectState.js';

export async function renderSEO(container, navigateTo) {
  // Read active project state
  const project = (projectState && typeof projectState.getProject === 'function')
    ? projectState.getProject()
    : (projectState?.project || {});

  const initialTopic = window.prefillTopic || project?.topic || 'ગુજરાત કર્મચારી પગાર અને DA વધારો 2026';
  window.prefillTopic = null; // reset

  // High-CTR 16:9 minimalist white thumbnail preset concepts
  const presetConcepts = [
    {
      id: 1,
      name: '🏛️ #૧ DA/પગાર (CM પટેલ)',
      topic: 'ગુજરાત કર્મચારી પગાર અને DA વધારો 2026',
      gujaratiWords: '૫૦% DA મંજૂર! ખાતામાં આવશે ₹15,000 થી ₹45,000',
      photoSubject: 'ગુજરાતના મુખ્યમંત્રીશ્રી ભૂપેન્દ્ર પટેલનો વાસ્તવિક સત્તાવાર પ્રેસ ફોટો',
      prompt: 'A minimalist 16:9 YouTube thumbnail. Pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of the Chief Minister of Gujarat, Bhupendra Patel, in traditional clean white kurta at an official press briefing looking at camera with a confident expression. On the right: Exactly 4 large ultra-bold clean text words in deep navy blue: "GUJARAT SALARY DA 50% HIKE". Ultra clean, high contrast, zero clutter, strictly photorealistic, absolutely NO 3D cartoon, NO neon.'
    },
    {
      id: 2,
      name: '👩‍🏫 #૨ આંગણવાડી/ભરતી (શિક્ષિકા)',
      topic: 'આંગણવાડી સુપરવાઈઝર નવી ભરતી 2026',
      gujaratiWords: 'સુપરવાઈઝર નવી ભરતી જાહેર! લાયકાત અને ફોર્મ તારીખ',
      photoSubject: 'આંગણવાડી સુપરવાઈઝર / મહિલા શિક્ષિકાનો સત્તાવાર પરિધાનમાં વાસ્તવિક ફોટો',
      prompt: 'A minimalist 16:9 YouTube thumbnail. Pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of an Indian female education officer / Anganwadi supervisor holding an official file with a warm confident expression. On the right: Exactly 4 large ultra-bold clean text words in deep navy blue and crimson: "ANGANWADI RECRUITMENT 2026". Ultra clean, high contrast, zero clutter, photorealistic.'
    },
    {
      id: 3,
      name: '🌾 #૩ સરકારી યોજના (PM મોદી)',
      topic: 'પીએમ કિસાન ૧૯મો હપ્તો ₹૨,૦૦૦ તારીખ',
      gujaratiWords: '૧૯મો હપ્તો તારીખ જાહેર! ખાતામાં ₹૨,૦૦૦ જમા',
      photoSubject: 'પીએમ નરેન્દ્ર મોદીનો સત્તાવાર સંબોધન ફોટો અથવા ખેડૂત લાભાર્થી',
      prompt: 'A minimalist 16:9 YouTube thumbnail. Pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of Prime Minister Narendra Modi in official attire looking at camera. On the right: Exactly 4 large ultra-bold text words in navy blue: "PM KISAN 19TH INSTALLMENT". Ultra clean, high contrast, zero clutter, strictly photorealistic.'
    },
    {
      id: 4,
      name: '🎓 #૪ પરીક્ષા / મેરિટ લિસ્ટ',
      topic: 'ગુજરાત સરકારી ભરતી પરિણામ અને મેરિટ લિસ્ટ 2026',
      gujaratiWords: 'સત્તાવાર મેરિટ લિસ્ટ જાહેર! તમારું નામ ચેક કરો',
      photoSubject: 'ગુજરાત સચિવાલય અધિકારી અથવા પરીક્ષા બોર્ડ અધ્યક્ષનો વાસ્તવિક ફોટો',
      prompt: 'A minimalist 16:9 YouTube thumbnail. Pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of a senior Gujarat government exam official at office desk. On the right: Exactly 4 large ultra-bold clean text words in deep navy blue: "OFFICIAL MERIT LIST DECLARED". Ultra clean, high contrast, zero clutter, photorealistic.'
    }
  ];

  // Active selected thumbnail state
  let currentTopic = initialTopic;
  let activeThumb = (project && project.thumbnail && (project.thumbnail.dalleShortPrompt || project.thumbnail.prompt))
    ? {
        name: 'કસ્ટમ કોન્સેપ્ટ',
        topic: project.topic || initialTopic,
        gujaratiWords: project.thumbnail.gujaratiWords || '૫૦% DA મંજૂર! ખાતામાં આવશે ₹15,000 થી ₹45,000',
        photoSubject: project.thumbnail.photoSubject || 'સત્તાવાર અધિકૃત ફોટોગ્રાફ',
        prompt: project.thumbnail.dalleShortPrompt || project.thumbnail.prompt
      }
    : presetConcepts[0];

  container.innerHTML = `
    <!-- Top View Header -->
    <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px; margin-bottom: 22px;">
      <div>
        <h2 style="font-size: 1.45rem; font-weight: 800; display: flex; align-items: center; gap: 10px; margin: 0 0 4px 0; color: #ffffff;">
          <span style="font-size: 1.6rem;">🖼️</span> ૫. થંબનેલ (16:9 Thumbnail & AI Prompt)
        </h2>
        <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0;">
          ફક્ત વિષયનું નામ (Topic Name), ૧૬:૯ થંબનેલ ડિઝાઇન અને નીચે સીધો AI પ્રોમ્પ્ટ.
        </p>
      </div>

      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button id="btn-top-goto-step6" class="btn btn-success btn-sm" style="font-weight: 800; background: linear-gradient(135deg, #10b981, #059669); border: none; padding: 8px 16px; font-size: 0.85rem; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(16,185,129,0.35);">
          <span>🚀</span> આગળ વધો: ૬. SEO & ટાઈટલ (ChatGPT) ➔
        </button>
      </div>
    </div>

    <!-- MAIN THUMBNAIL CONTAINER -->
    <div style="max-width: 900px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px;">

      <!-- 1. TOPIC NAME CARD -->
      <div class="card" style="border: 1px solid rgba(255,255,255,0.08); background: #0f172a; border-radius: 12px; padding: 18px 20px;">
        <label for="seo-topic-input" style="display: block; font-size: 0.88rem; font-weight: 800; color: #38bdf8; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px;">
          📌 વિષય / ટોપિકનું નામ (Topic Name)
        </label>
        
        <input 
          type="text" 
          id="seo-topic-input" 
          class="form-input font-gu" 
          placeholder="વિષયનું નામ દાખલ કરો..." 
          value="${currentTopic}"
          style="width: 100%; font-size: 1.1rem; font-weight: 700; padding: 12px 14px; background: #07090e; border: 2px solid #38bdf8; border-radius: 8px; color: #ffffff; box-sizing: border-box; outline: none;"
        />

        <!-- Preset Concept Quick Chips -->
        <div style="margin-top: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <span style="font-size: 0.74rem; font-weight: 700; color: #94a3b8;">ઝડપી કોન્સેપ્ટ:</span>
          ${presetConcepts.map((c, idx) => `
            <button 
              type="button" 
              class="btn btn-sm btn-preset-thumb" 
              data-idx="${idx}"
              style="font-size: 0.75rem; font-weight: 700; padding: 4px 10px; border-radius: 6px; cursor: pointer; border: 1px solid rgba(255,255,255,0.15); background: ${idx === 0 ? '#38bdf8' : 'rgba(255,255,255,0.05)'}; color: ${idx === 0 ? '#000' : '#e2e8f0'};"
            >
              ${c.name}
            </button>
          `).join('')}
        </div>
      </div>

      <!-- 2. THUMBNAIL VISUAL PREVIEW CARD (16:9 RATIO) -->
      <div class="card" style="border: 2px solid #8b5cf6; background: #0b0f19; border-radius: 14px; padding: 18px; box-shadow: 0 10px 30px rgba(139,92,246,0.18);">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.25rem;">🖼️</span>
            <span style="font-weight: 800; font-size: 0.95rem; color: #ffffff;">૧૬:૯ થંબનેલ પ્રીવ્યૂ (16:9 High-CTR Clean Preview)</span>
          </div>
          <span style="font-size: 0.74rem; font-weight: 800; background: #10b981; color: #000; padding: 3px 8px; border-radius: 4px;">
            ૧૦૦% શુદ્ધ સફેદ બેકગ્રાઉન્ડ
          </span>
        </div>

        <!-- 16:9 Canvas Box with Pure White Background -->
        <div id="thumb-preview-box" style="width: 100%; aspect-ratio: 16 / 9; max-height: 380px; background: #FFFFFF; border-radius: 10px; overflow: hidden; display: flex; box-shadow: 0 8px 24px rgba(0,0,0,0.5); border: 3px solid #ffffff; position: relative;">
          
          <!-- Left side: 42% width Photo Subject Area -->
          <div style="width: 42%; height: 100%; background: #f8fafc; border-right: 2px dashed #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; text-align: center; box-sizing: border-box; position: relative;">
            <div style="width: 82px; height: 82px; border-radius: 50%; background: linear-gradient(135deg, #1e3a8a, #3b82f6); display: flex; align-items: center; justify-content: center; font-size: 40px; box-shadow: 0 4px 16px rgba(30,58,138,0.25); margin-bottom: 10px;">
              👤
            </div>
            <span style="background: #0f172a; color: #ffffff; font-size: 0.68rem; font-weight: 800; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; margin-bottom: 6px;">
              વાસ્તવિક ફોટોગ્રાફ
            </span>
            <div id="thumb-preview-subject" style="font-size: 0.8rem; font-weight: 800; color: #1e293b; line-height: 1.3;">
              ${activeThumb.photoSubject}
            </div>
          </div>

          <!-- Right side: 58% width Big Bold Text Area -->
          <div style="width: 58%; height: 100%; background: #FFFFFF; display: flex; flex-direction: column; justify-content: center; padding: 20px 24px; box-sizing: border-box;">
            
            <div style="display: inline-block; align-self: flex-start; background: #dc2626; color: #ffffff; font-size: 0.72rem; font-weight: 900; padding: 4px 10px; border-radius: 4px; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">
              🔥 તાજા મોટા સમાચાર
            </div>

            <div id="thumb-preview-text" style="font-size: 1.55rem; font-weight: 900; color: #0f172a; line-height: 1.25; margin-bottom: 14px; text-shadow: 0 1px 1px rgba(0,0,0,0.05); font-family: 'Anek Gujarati', sans-serif;">
              ${activeThumb.gujaratiWords}
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background: #1e3a8a; color: #ffffff; font-size: 0.72rem; font-weight: 800; padding: 4px 8px; border-radius: 4px;">
                GYAN YATRA EXCLUSIVE
              </span>
              <span style="color: #64748b; font-size: 0.72rem; font-weight: 700;">
                સત્તાવાર પરિપત્ર સાથે
              </span>
            </div>
          </div>
        </div>

        <!-- 2 Detail Summary Badges -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; margin-top: 14px;">
          <div style="background: rgba(0,0,0,0.35); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #10b981;">
            <span style="font-size: 0.72rem; color: #10b981; font-weight: 800;">૧. થંબનેલ પર બોલ્ડ શબ્દો:</span>
            <div id="badge-gujarati-words" style="font-size: 0.92rem; font-weight: 800; color: #ffffff; margin-top: 2px;">
              ${activeThumb.gujaratiWords}
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.35); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #38bdf8;">
            <span style="font-size: 0.72rem; color: #38bdf8; font-weight: 800;">૨. વાસ્તવિક ફોટો વિષય:</span>
            <div id="badge-photo-subject" style="font-size: 0.85rem; color: #e2e8f0; margin-top: 2px;">
              ${activeThumb.photoSubject}
            </div>
          </div>
        </div>
      </div>

      <!-- 3. AI THUMBNAIL PROMPT CARD (RIGHT BELOW THUMBNAIL) -->
      <div class="card" style="border: 2px solid #8b5cf6; background: linear-gradient(135deg, rgba(139,92,246,0.12), rgba(15,23,42,0.95)); border-radius: 14px; padding: 18px 20px; box-shadow: 0 8px 30px rgba(139,92,246,0.2);">
        
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; border-bottom: 1px solid rgba(139,92,246,0.25); padding-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.4rem;">🤖</span>
            <div>
              <h3 style="font-size: 1.05rem; font-weight: 800; color: #ffffff; margin: 0;">
                AI થંબનેલ પ્રોમ્પ્ટ (DALL-E 3 / ChatGPT / Midjourney)
              </h3>
              <p style="color: #c4b5fd; font-size: 0.78rem; margin: 2px 0 0 0;">
                શુદ્ધ સફેદ બેકગ્રાઉન્ડ પર ૧૬:૯ હાઈ-CTR વાસ્તવિક ફોટોગ્રાફ થંબનેલ પ્રોમ્પ્ટ
              </p>
            </div>
          </div>

          <!-- Prominent Copy Button -->
          <button id="btn-copy-prompt-main" class="btn btn-primary" style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #ffffff; font-weight: 800; padding: 10px 20px; border: none; border-radius: 8px; box-shadow: 0 4px 15px rgba(139,92,246,0.45); cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-size: 0.9rem;">
            <span id="copy-btn-icon">📋</span>
            <span id="copy-btn-label">૧-ક્લિક થંબનેલ પ્રોમ્પ્ટ કોપી કરો</span>
          </button>
        </div>

        <!-- Monospace Textarea containing the prompt -->
        <div style="margin-bottom: 14px;">
          <textarea 
            id="seo-thumb-prompt-textarea" 
            class="form-textarea font-en" 
            style="width: 100%; height: 130px; font-family: 'Consolas', 'Courier New', monospace; font-size: 0.88rem; background: #05070c; color: #f8fafc; line-height: 1.55; border: 1.5px solid rgba(139,92,246,0.4); border-radius: 8px; padding: 14px; box-sizing: border-box; resize: vertical;"
          >${activeThumb.prompt}</textarea>
        </div>

        <!-- Action Links -->
        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <button id="btn-copy-prompt-secondary" class="btn btn-secondary btn-sm" style="background: rgba(139,92,246,0.25); border: 1px solid #8b5cf6; color: #c4b5fd; font-weight: 700; padding: 7px 14px; font-size: 0.8rem; cursor: pointer;">
            📋 પ્રોમ્પ્ટ કોપી કરો
          </button>
          
          <a href="https://chatgpt.com" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="border-color: #10b981; color: #6ee7b7; font-weight: 700; padding: 7px 14px; font-size: 0.8rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
            🤖 ChatGPT Image માં ખોલો ↗
          </a>

          <a href="https://www.midjourney.com" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm" style="border-color: #38bdf8; color: #7dd3fc; font-weight: 700; padding: 7px 14px; font-size: 0.8rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
            🎨 Midjourney ↗
          </a>
        </div>
      </div>

    </div>
  `;

  // Selectors
  const topicInput = container.querySelector('#seo-topic-input');
  const previewSubject = container.querySelector('#thumb-preview-subject');
  const previewText = container.querySelector('#thumb-preview-text');
  const badgeWords = container.querySelector('#badge-gujarati-words');
  const badgePhoto = container.querySelector('#badge-photo-subject');
  const promptTextarea = container.querySelector('#seo-thumb-prompt-textarea');
  const btnCopyMain = container.querySelector('#btn-copy-prompt-main');
  const btnCopySec = container.querySelector('#btn-copy-prompt-secondary');
  const copyBtnIcon = container.querySelector('#copy-btn-icon');
  const copyBtnLabel = container.querySelector('#copy-btn-label');
  const presetButtons = container.querySelectorAll('.btn-preset-thumb');

  // Copy helper
  const handleCopy = (btnElement) => {
    const textToCopy = promptTextarea ? promptTextarea.value : activeThumb.prompt;
    copyToClipboard(textToCopy, '🎨 થંબનેલ AI પ્રોમ્પ્ટ સફળતાપૂર્વક કોપી થઈ ગયો! ✓', btnElement);
    
    if (copyBtnLabel) copyBtnLabel.textContent = '✓ પ્રોમ્પ્ટ કોપી થઈ ગયો!';
    if (copyBtnIcon) copyBtnIcon.textContent = '✓';
    
    setTimeout(() => {
      if (copyBtnLabel) copyBtnLabel.textContent = '૧-ક્લિક થંબનેલ પ્રોમ્પ્ટ કોપી કરો';
      if (copyBtnIcon) copyBtnIcon.textContent = '📋';
    }, 2400);
  };

  btnCopyMain?.addEventListener('click', () => handleCopy(btnCopyMain));
  btnCopySec?.addEventListener('click', () => handleCopy(btnCopySec));

  // Switch preset concept
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      const chosen = presetConcepts[idx] || presetConcepts[0];
      activeThumb = chosen;

      // Update button styles
      presetButtons.forEach(b => {
        b.style.background = 'rgba(255,255,255,0.05)';
        b.style.color = '#e2e8f0';
      });
      btn.style.background = '#38bdf8';
      btn.style.color = '#000000';

      // Update fields
      if (topicInput) topicInput.value = chosen.topic;
      if (previewText) previewText.textContent = chosen.gujaratiWords;
      if (previewSubject) previewSubject.textContent = chosen.photoSubject;
      if (badgeWords) badgeWords.textContent = chosen.gujaratiWords;
      if (badgePhoto) badgePhoto.textContent = chosen.photoSubject;
      if (promptTextarea) promptTextarea.value = chosen.prompt;

      // Persist in projectState
      if (projectState && typeof projectState.setThumbnail === 'function') {
        projectState.setThumbnail({
          title: chosen.topic,
          gujaratiWords: chosen.gujaratiWords,
          photoSubject: chosen.photoSubject,
          dalleShortPrompt: chosen.prompt
        });
      }
      if (projectState && typeof projectState.setTopic === 'function') {
        projectState.setTopic(chosen.topic);
      }
    });
  });

  // Dynamic input typing handler for custom topics
  topicInput?.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    if (!val) return;

    // Update activeThumb topic & preview
    activeThumb.topic = val;
    activeThumb.gujaratiWords = val;
    if (previewText) previewText.textContent = val;
    if (badgeWords) badgeWords.textContent = val;

    // Generate dynamic prompt
    const generatedPrompt = `A minimalist 16:9 YouTube thumbnail. Pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of ${activeThumb.photoSubject || 'relevant official news personality/subject'}, clean studio cutout lighting looking at camera. On the right: Exactly 4 large ultra-bold clean text words in deep navy blue: "${val.toUpperCase()}". Ultra clean, high contrast, zero clutter, strictly photorealistic, absolutely NO 3D cartoon, NO neon.`;

    activeThumb.prompt = generatedPrompt;
    if (promptTextarea) promptTextarea.value = generatedPrompt;

    // Persist in projectState
    if (projectState && typeof projectState.setTopic === 'function') {
      projectState.setTopic(val);
    }
    if (projectState && typeof projectState.setThumbnail === 'function') {
      projectState.setThumbnail({
        title: val,
        gujaratiWords: val,
        photoSubject: activeThumb.photoSubject,
        dalleShortPrompt: generatedPrompt
      });
    }
  });

  container.querySelector('#btn-top-goto-step6')?.addEventListener('click', () => {
    if (typeof navigateTo === 'function') navigateTo('seodescription');
  });
}
