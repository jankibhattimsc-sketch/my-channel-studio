import { api } from '../api.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { ThumbnailCanvasRenderer } from '../utils/canvasHelper.js';
import { projectState } from '../utils/projectState.js';

export async function renderThumbnails(container, navigateTo) {
  const initialTopic = window.prefillTopic || (typeof projectState !== 'undefined' ? projectState.getTopic() : '') || 'ગુજરાત સરકારની નવી સહાય યોજના 2026';
  window.prefillTopic = null;

  container.innerHTML = `
    <div style="display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 20px;">
      <div>
        <h2 style="font-size: 1.5rem; font-weight: 800; display: flex; align-items: center; gap: 10px;">
          <span>🎨</span> AI Thumbnail Studio (૧૬:૯ થંબનેલ વર્કસ્પેસ)
        </h2>
        <p style="color: var(--text-secondary); font-size: 0.88rem;">
          ટોપિક લખતા જ ઓટોમેટિક AI પ્રોમ્પ્ટ તૈયાર, 1280x720 કેનવાસ એડિટર અને ડાઉનલોડ સપોર્ટ
        </p>
      </div>

      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button id="btn-thumb-header-chatgpt" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #10b981, #059669); border-color: #059669;">
          <span>💬</span> Built-in ChatGPT
        </button>
      </div>
    </div>

    <!-- Topic Input & Auto-Generated Prompt Bar -->
    <div class="card" style="margin-bottom: 20px; border-left: 4px solid #10b981;">
      <!-- Topic Input Row -->
      <div style="display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-end; margin-bottom: 12px;">
        <div style="flex: 1; min-width: 260px;">
          <label class="form-label" style="font-weight: 700; color: #ffffff;">
            વિષય / ટોપિક (Topic for Thumbnail):
          </label>
          <input type="text" id="thumb-topic-input" class="form-input" value="${initialTopic}" placeholder="દા.ત. આંગણવાડી સુપરવાઈઝર ભરતી 2026">
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="btn-get-concepts" class="btn btn-outline" style="height: 48px;">
            <span>💡</span> ૩ કોન્સેપ્ટ્સ જુઓ
          </button>
        </div>
      </div>

      <!-- Auto-Generated Prompt Box (Directly Below Topic Input) -->
      <div style="background: rgba(0,0,0,0.35); border: 1px solid rgba(56,189,248,0.25); border-radius: 8px; padding: 14px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.15rem;">⚡</span>
            <strong style="color: #38bdf8; font-size: 0.92rem;">
              આ થંબનેલ માટે ઓટો-જનરેટેડ AI પ્રોમ્પ્ટ (Auto-Generated AI Prompt):
            </strong>
            <span class="badge badge-green" style="font-size: 0.7rem;">લાઈવ ઓટો-ફિલ</span>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="btn-copy-thumb-prompt" class="btn btn-secondary btn-sm" title="પ્રોમ્પ્ટ કોપી કરો">
              <span>📋</span> પ્રોમ્પ્ટ કોપી કરો
            </button>
            <button id="btn-ai-generate-from-prompt" class="btn btn-warning btn-sm" title="AI આર્ટ બનાવો">
              <span>✨</span> AI આર્ટ બનાવો
            </button>
            <button id="btn-goto-chatgpt-thumb" class="btn btn-primary btn-sm" style="background: linear-gradient(135deg, #10b981, #059669); border-color: #059669;">
              <span>💬</span> ChatGPT
            </button>
          </div>
        </div>

        <textarea id="thumb-master-prompt-textarea" class="form-textarea font-gu" style="height: 130px; font-size: 0.86rem; line-height: 1.55; background: #07090e; border-color: rgba(56,189,248,0.35); color: #f1f5f9; padding: 12px; border-radius: 6px; width: 100%; resize: vertical;" placeholder="ટોપિક લખતા જ અહીં થંબનેલ માટેનો શાનદાર AI પ્રોમ્પ્ટ આપોઆપ લખાઈને આવી જશે..."></textarea>
        
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 8px; font-size: 0.74rem; color: var(--text-muted);">
          <span>💡 ટોપિક લખતા જ આ પ્રોમ્પ્ટ અને કેનવાસનું લખાણ રિયલ-ટાઇમમાં ઓટોમેટિક અપડેટ થાય છે.</span>
          <label style="display: inline-flex; align-items: center; gap: 6px; cursor: pointer; color: #94a3b8;">
            <input type="checkbox" id="chk-full-blueprint" checked style="accent-color: #10b981;">
            <span>સંપૂર્ણ બ્લૂપ્રિન્ટ ફોર્મેટ (ટેક્સ્ટ + કલર્સ) દર્શાવો</span>
          </label>
        </div>
      </div>

      <!-- Quick High-CTR Category Chips -->
      <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
        <span style="font-size: 0.78rem; font-weight: 700; color: #10b981;">
          🔥 High CTR ટોપિક્સ:
        </span>
        <button type="button" class="btn btn-outline btn-sm thumb-topic-chip" data-topic="ગુજરાત સરકારી કર્મચારી પગાર વધારો & DA મંજૂર 2026" style="font-size: 0.76rem; padding: 4px 10px; border-radius: 20px; border-color: rgba(220,38,38,0.5); color: #fca5a5;">
          🏛️ 💰 પગાર વધારો / DA
        </button>
        <button type="button" class="btn btn-outline btn-sm thumb-topic-chip" data-topic="આંગણવાડી કાર્યકર અને તેડાગર પગાર વધારો 2026" style="font-size: 0.76rem; padding: 4px 10px; border-radius: 20px; border-color: rgba(236,72,153,0.5); color: #f472b6;">
          👩‍👧 💰 આંગણવાડી પગાર વધારો
        </button>
        <button type="button" class="btn btn-outline btn-sm thumb-topic-chip" data-topic="આંગણવાડી સુપરવાઈઝર નવી ભરતી 2026" style="font-size: 0.76rem; padding: 4px 10px; border-radius: 20px; border-color: rgba(16,185,129,0.5); color: #86efac;">
          👩‍🏫 આંગણવાડી સુપરવાઈઝર ભરતી
        </button>
        <button type="button" class="btn btn-outline btn-sm thumb-topic-chip" data-topic="ગુજરાત પોલીસ & LRD નવી ભરતી 2026" style="font-size: 0.76rem; padding: 4px 10px; border-radius: 20px; border-color: rgba(59,130,246,0.5); color: #93c5fd;">
          👮‍♂️ પોલીસ & LRD ભરતી
        </button>
        <button type="button" class="btn btn-outline btn-sm thumb-topic-chip" data-topic="ગુજરાત સરકાર નવી સહાય યોજના 2026" style="font-size: 0.76rem; padding: 4px 10px; border-radius: 20px; border-color: rgba(245,158,11,0.5); color: #fde047;">
          🚜 સરકારી સહાય યોજના
        </button>
      </div>
    </div>

    <!-- 3 Concepts Container (Clean, Collapsible) -->
    <div id="thumb-concepts-container" style="display: none; margin-bottom: 24px;"></div>

    <!-- 16:9 Live Canvas Workspace -->
    <div class="card">
      <div class="card-header" style="margin-bottom: 16px;">
        <div class="card-title">
          <span>🖥️</span> 16:9 લાઈવ થંબનેલ કેનવાસ એડિટર (1280 × 720 Pixels)
        </div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="btn-ai-generate-bg" class="btn btn-warning btn-sm">
            <span>✨</span> AI બેકગ્રાઉન્ડ આર્ટ બનાવો
          </button>
          <button id="btn-download-thumb" class="btn btn-success btn-sm">
            <span>📥</span> Download Thumbnail (PNG)
          </button>
        </div>
      </div>

      <div class="thumbnail-workspace">
        <!-- Left: 16:9 Canvas Preview -->
        <div class="canvas-preview-card">
          <div class="canvas-aspect-wrapper">
            <canvas id="thumbnail-canvas"></canvas>
          </div>
          <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 10px; text-align: center;">
            મોબાઈલ સ્ક્રીન પર સ્પષ્ટ વંચાય તેવું હાઈ-કોન્ટ્રાસ્ટ 16:9 લેઆઉટ (1280x720)
          </p>
        </div>

        <!-- Right: Controls -->
        <div class="canvas-controls-card">
          <!-- Preset Backgrounds -->
          <div>
            <label class="form-label" style="font-weight: 700;">બેકગ્રાઉન્ડ સ્ટાઇલ પસંદ કરો:</label>
            <div class="preset-selector">
              <button class="preset-btn active" data-preset="white_minimalist">⚪ ૧-ફોટો શુદ્ધ સફેદ (#FFFFFF)</button>
              <button class="preset-btn" data-preset="breaking">🔴 બ્રેકિંગ ન્યૂઝ (Red)</button>
              <button class="preset-btn" data-preset="finance">🟢 યોજના / કમાણી (Green)</button>
              <button class="preset-btn" data-preset="tech">🔵 ટેક & ગેજેટ (Cyan)</button>
              <button class="preset-btn" data-preset="curiosity">🟣 રહસ્ય (Curiosity)</button>
            </div>
          </div>

          <!-- Main Gujarati Text -->
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-weight: 700;">મુખ્ય બોલ્ડ લખાણ (Main Punchline):</label>
            <input type="text" id="canvas-main-text" class="form-input" value="મોટો ફેરફાર!">
          </div>

          <!-- Subtext / Guarantee -->
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-weight: 700;">ગૌણ લખાણ / વિગત (Subtext):</label>
            <input type="text" id="canvas-sub-text" class="form-input" value="2026 નો નવો નિયમ લાગુ">
          </div>

          <!-- Badge Overlay -->
          <div class="form-group" style="margin-bottom: 12px;">
            <label class="form-label" style="font-weight: 700;">હાઇ-સીટીઆર બેજ (Badge):</label>
            <select id="canvas-badge-select" class="form-select">
              <option value="નવી જાહેરાત ⚠️">નવી જાહેરાત ⚠️</option>
              <option value="મોટો ફેરફાર! 🔥">મોટો ફેરફાર! 🔥</option>
              <option value="100% સાચું ✓">100% સાચું ✓</option>
              <option value="નવો નિયમ લાગુ 📜">નવો નિયમ લાગુ 📜</option>
              <option value="ચેતવણી! 🚨">ચેતવણી! 🚨</option>
              <option value="સત્તાવાર નિર્ણય">સત્તાવાર નિર્ણય</option>
              <option value="">કોઈ બેજ નહીં</option>
            </select>
          </div>

          <!-- Creator Photo Upload -->
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-weight: 700;">તમારો ફોટો ઉમેરો (Photo Upload):</label>
            <input type="file" id="creator-photo-input" accept="image/*" class="form-input" style="padding: 8px;">
            <div style="display: flex; gap: 10px; margin-top: 8px; align-items: center;">
              <span style="font-size: 0.8rem; color: var(--text-muted);">સ્થાન:</span>
              <button id="btn-pos-left" class="btn btn-outline btn-sm active">ડાબી બાજુ (Left)</button>
              <button id="btn-pos-right" class="btn btn-outline btn-sm">જમણી બાજુ (Right)</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const canvasEl = container.querySelector('#thumbnail-canvas');
  const renderer = new ThumbnailCanvasRenderer(canvasEl);
  renderer.render();

  // Control Elements
  const mainTextInput = container.querySelector('#canvas-main-text');
  const subTextInput = container.querySelector('#canvas-sub-text');
  const badgeSelect = container.querySelector('#canvas-badge-select');
  const photoInput = container.querySelector('#creator-photo-input');
  const posLeftBtn = container.querySelector('#btn-pos-left');
  const posRightBtn = container.querySelector('#btn-pos-right');
  const downloadBtn = container.querySelector('#btn-download-thumb');
  const aiGenerateBgBtn = container.querySelector('#btn-ai-generate-bg');
  const aiGenerateFromPromptBtn = container.querySelector('#btn-ai-generate-from-prompt');
  const topicInput = container.querySelector('#thumb-topic-input');
  const promptTextarea = container.querySelector('#thumb-master-prompt-textarea');
  const chkFullBlueprint = container.querySelector('#chk-full-blueprint');
  const conceptsContainer = container.querySelector('#thumb-concepts-container');
  const btnGetConcepts = container.querySelector('#btn-get-concepts');

  // Client-side Smart Derivation Engine
  function deriveSmartElements(rawTopic) {
    const t = (rawTopic || '').trim().toLowerCase();
    const isQuestionOrSpeculative = /\?|કેમ\?|શું\?|કેટલો\?|શક્યતા|અફવા|હશે\?|નહીં\?/i.test(rawTopic);
    const hasExplicitApproval = /મંજૂર|જાહેર|સત્તાવાર|પરિપત્ર|gr|હુકમ|ઓર્ડર|approved/i.test(rawTopic);

    const isSalary = /પગાર|વધારો|salary|hike|da|મોંઘવારી|ભથ્થ|પેન્શન|માનદવેતન|માનદ વેતન|વેતન/i.test(t);
    const isAnganwadi = /આંગણવાડી|તેડાગર|anganwadi/i.test(t);
    const isSupervisor = /સુપરવાઈઝર|supervisor/i.test(t);
    const isPolice = /પોલીસ|lrd|police|કોન્સ્ટેબલ|રક્ષક|psi/i.test(t);
    const isSahay = /સહાય|યોજના|ખેડૂત|કિસાન|સબસિડી|ખાતામાં|ગાય સહાય|ટ્રેક્ટર/i.test(t);
    const isEducation = /બોર્ડ|gseb|રીઝલ્ટ|result|૧૦મું|૧૨મું|10th|12th|પરીક્ષા|એડમિશન|કોલેજ/i.test(t);
    const isBharti = /ભરતી|ટેટ|ટાટ|શિક્ષક|clerk|તલાટી|પરીક્ષા|ojas|recruitment/i.test(t);
    const isBusiness = /કમાણી|બિઝનેસ|ઓનલાઇન|રૂપિયા|પૈસા|રોકાણ|business|earning/i.test(t);

    let el1 = '';
    let el2 = '';
    let el3 = '';
    let el4 = 'નવી જાહેરાત ⚠️';
    let el1En = '';
    let el2En = '';
    let el3En = '';
    let el4En = 'BREAKING UPDATE';
    let gujPhoto = '';
    let engSubject = '';

    if (isAnganwadi && isSalary) {
      el1 = 'આંગણવાડી બહેનો';
      el1En = 'ANGANWADI WORKERS';
      el2 = (hasExplicitApproval && !isQuestionOrSpeculative) ? 'માનદવેતન વધારો મંજૂર!' : 'માનદવેતન વધારાની ગણતરી';
      el2En = (hasExplicitApproval && !isQuestionOrSpeculative) ? 'HONORARIUM HIKE APPROVED!' : 'HONORARIUM HIKE DETAILS';
      el3 = '૨૦૨૬ સત્તાવાર અપડેટ';
      el3En = '2026 OFFICIAL UPDATE';
      el4 = 'સત્તાવાર નિર્ણય';
      el4En = 'OFFICIAL UPDATE';
      gujPhoto = 'આંગણવાડી કાર્યકર બહેનનો વાસ્તવિક ખુશ ચહેરો: કેમેરા સામે ઉત્સાહ અને સંતોષથી જોતી સાચી ભારતીય આંગણવાડી બહેન.';
      engSubject = 'an authentic Indian Gujarati Anganwadi female worker looking at camera with a natural happy and confident smile';
    } else if (isSalary || /મુખ્યમંત્રી|ભૂપેન્દ્ર|cm|કર્મચારી/i.test(t)) {
      el1 = 'ગુજરાત કર્મચારીઓ';
      el1En = 'GUJARAT GOVT EMPLOYEES';
      const hasDa = /da|મોંઘવારી|ભથ્થ/i.test(t);
      const hasBasicSalary = /પગાર|salary|વેતન/i.test(t);

      if (hasExplicitApproval && !isQuestionOrSpeculative) {
        if (hasDa && hasBasicSalary) {
          el2 = 'પગાર અને DA વધારો મંજૂર!';
          el2En = 'SALARY & DA HIKE APPROVED!';
        } else if (hasDa) {
          el2 = 'DA વધારો મંજૂર!';
          el2En = 'DA HIKE APPROVED!';
        } else {
          el2 = 'પગાર વધારો મંજૂર!';
          el2En = 'SALARY HIKE APPROVED!';
        }
      } else {
        el2 = hasDa ? 'DA વધારો કેટલો મળશે?' : 'પગાર સુધારણા નિયમો';
        el2En = hasDa ? 'HOW MUCH DA HIKE?' : 'NEW SALARY RULES';
      }
      el3 = '૨૦૨૬ સત્તાવાર પરિપત્ર';
      el3En = '2026 OFFICIAL CIRCULAR';
      el4 = 'સત્તાવાર નિર્ણય';
      el4En = 'OFFICIAL DECISION';
      gujPhoto = 'ગુજરાતના મુખ્યમંત્રીશ્રી ભૂપેન્દ્ર પટેલનો વાસ્તવિક સત્તાવાર ફોટો: પ્રેસ કોન્ફરન્સમાં સત્તાવાર નિર્ણય જાહેર કરતા મુખ્યમંત્રીશ્રી.';
      engSubject = 'the Chief Minister of Gujarat, Bhupendra Patel, in traditional clean white kurta at an official press briefing podium looking at camera with a confident expression';
    } else if (isAnganwadi && isSupervisor) {
      el1 = 'આંગણવાડી સુપરવાઈઝર';
      el1En = 'ANGANWADI SUPERVISOR';
      el2 = 'નવી સીધી ભરતી ૨૦૨૬';
      el2En = 'NEW RECRUITMENT 2026';
      el3 = 'લાયકાત અને સિલેબસ';
      el3En = 'ELIGIBILITY & SYLLABUS';
      el4 = 'નવો નિયમ લાગુ 📜';
      el4En = 'OJAS PORTAL';
      gujPhoto = 'શિક્ષિકાનો વાસ્તવિક પ્રોફેશનલ ફોટો: કેમેરા સામે ઉત્સાહથી જોતો ભારતીય શિક્ષિકા/ઉમેદવારનો ચહેરો.';
      engSubject = 'a professional Indian woman educator looking at camera with a natural confident expression';
    } else if (isPolice) {
      el1 = 'ગુજરાત પોલીસ ભરતી';
      el1En = 'GUJARAT POLICE BHARTI';
      el2 = '૧૨,૦૦૦+ નવી જગ્યાઓ';
      el2En = '12,000+ NEW VACANCIES';
      el3 = 'નવા શારીરિક & લેખિત નિયમો';
      el3En = 'NEW PHYSICAL & EXAM RULES';
      el4 = 'નવી જાહેરાત ⚠️';
      el4En = 'OFFICIAL NOTICE';
      gujPhoto = 'પોલીસ ઉમેદવારનો વાસ્તવિક ફોટો: ખાખી યુનિફોર્મમાં કેમેરા સામે ગર્વ અને સંકલ્પથી જોતો યુવા ઉમેદવાર.';
      engSubject = 'a young authentic Indian candidate in crisp khaki police recruitment uniform looking at camera with determination';
    } else if (isSahay) {
      el1 = 'ગુજરાત ખેડૂત સહાય';
      el1En = 'GUJARAT KISAN SAHAY';
      el2 = 'સીધા ખાતામાં સહાય જમા';
      el2En = 'DIRECT BANK TRANSFER';
      el3 = 'ઓનલાઇન અરજી પ્રક્રિયા';
      el3En = 'ONLINE APPLICATION';
      el4 = '100% સાચું ✓';
      el4En = 'GOVT SCHEME 2026';
      gujPhoto = 'ખેડૂતનો વાસ્તવિક ખુશ ચહેરો: કેમેરા સામે હાથ જોડીને સંતોષથી જોતો ભારતીય ખેડૂત.';
      engSubject = 'a dignified Indian Gujarati farmer in clean traditional white kurta looking at camera with folded hands and a warm smile';
    } else if (isEducation) {
      el1 = 'ધોરણ ૧૦-૧૨ બોર્ડ';
      el1En = 'GSEB 10TH & 12TH BOARD';
      el2 = /રીઝલ્ટ|result|તારીખ/i.test(t) ? 'પરિણામ તારીખ જાહેર!' : 'આ ૩ કોર્સ ખાસ કરો';
      el2En = /રીઝલ્ટ|result|તારીખ/i.test(t) ? 'RESULT DATE DECLARED!' : 'TOP 3 HIGH-PAYING COURSES';
      el3 = 'કરિયર ગાઈડન્સ ૨૦૨૬';
      el3En = 'CAREER GUIDANCE 2026';
      el4 = 'મોટો ફેરફાર! 🔥';
      el4En = 'GSEB OFFICIAL';
      gujPhoto = 'વિદ્યાર્થી અથવા શિક્ષકનો વાસ્તવિક ચહેરો: પુસ્તક અથવા માર્કશીટ સાથે કેમેરા સામે જોતો ભારતીય ચહેરો.';
      engSubject = 'a dedicated Indian educator or studious young student looking at camera with a focused expression';
    } else if (isBharti) {
      el1 = 'ગુજરાત સરકારી ભરતી';
      el1En = 'GUJARAT GOVT RECRUITMENT';
      el2 = 'નવી સત્તાવાર જાહેરાત';
      el2En = 'NEW OFFICIAL VACANCY';
      el3 = 'કુલ જગ્યાઓ & લાયકાત';
      el3En = 'ELIGIBILITY & VACANCIES';
      el4 = 'નવી જાહેરાત ⚠️';
      el4En = 'OJAS PORTAL 2026';
      gujPhoto = 'ઉમેદવારનો વાસ્તવિક પ્રોફેશનલ ફોટો: કેમેરા સામે આત્મવિશ્વાસથી જોતો ભારતીય યુવાન.';
      engSubject = 'a professional Indian educator looking at camera with a natural confident expression';
    } else if (isBusiness) {
      el1 = 'મોબાઇલથી ઓનલાઇન કમાણી';
      el1En = 'ONLINE MOBILE EARNING';
      el2 = 'રોજના ₹1,000 થી ₹2,500';
      el2En = 'DAILY EARNING GUIDE';
      el3 = 'ઝીરો રોકાણ સાથે શરૂઆત';
      el3En = 'ZERO INVESTMENT REQUIRED';
      el4 = '100% સાચું ✓';
      el4En = 'VERIFIED PROOF';
      gujPhoto = 'વાસ્તવિક ભારતીય ડિજિટલ ક્રિએટરનો ખુશ ચહેરો: મોબાઇલ સ્ક્રીન બતાવતો આત્મવિશ્વાસપૂર્ણ ભાવ.';
      engSubject = 'a confident young Indian professional holding a clean smartphone looking at camera with a warm authentic smile';
    } else {
      const words = (rawTopic || '').split(/\s+/).filter(Boolean);
      el1 = words.slice(0, 2).join(' ') || 'ગુજરાત નવી અપડેટ';
      el1En = 'GUJARAT NEW UPDATE';
      el2 = words.slice(2, 5).join(' ') || 'મોટી સત્તાવાર જાહેરાત';
      el2En = 'OFFICIAL ANNOUNCEMENT';
      el3 = '૨૦૨૬ ની તાજી વિગત';
      el3En = '2026 LATEST DETAILS';
      el4 = 'નવી જાહેરાત ⚠️';
      el4En = 'OFFICIAL INFO';
      gujPhoto = 'વિષયને અનુરૂપ વાસ્તવિક ભારતીય વ્યક્તિનો અસલી પ્રોફેશનલ ફોટો: કેમેરા સામે સંતુલિત અને ગંભીર ભાવ સાથે જોતો ચહેરો.';
      engSubject = 'an authentic Indian professional matching the topic looking at camera with a natural confident expression';
    }

    return { el1, el2, el3, el4, el1En, el2En, el3En, el4En, gujPhoto, engSubject };
  }

  // Generate & Update Prompt + Sync Canvas
  function updateFromTopic(syncInputs = true) {
    const rawTopic = topicInput.value.trim() || 'આંગણવાડી સુપરવાઈઝર ભરતી 2026';
    if (typeof projectState !== 'undefined' && projectState.setTopic) {
      projectState.setTopic(rawTopic);
    }
    const derived = deriveSmartElements(rawTopic);

    if (syncInputs) {
      mainTextInput.value = derived.el2;
      subTextInput.value = derived.el3;
      if (derived.el4) {
        const hasOpt = Array.from(badgeSelect.options).some(o => o.value === derived.el4);
        badgeSelect.value = hasOpt ? derived.el4 : 'નવી જાહેરાત ⚠️';
      }
    }

    const currentMain = mainTextInput.value.trim() || derived.el2;
    const currentSub = subTextInput.value.trim() || derived.el3;
    const currentBadge = badgeSelect.value;

    // Synchronize Canvas Renderer
    renderer.setState({
      topicText: derived.el1,
      mainText: currentMain,
      subText: currentSub,
      badgeText: currentBadge
    });

    // Build the AI Image / Thumbnail Prompt
    const dalleShortPrompt = `A minimalist 16:9 YouTube thumbnail with a pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of ${derived.engSubject}. On the right: A clean, high-contrast hierarchical text layout with exactly 3 to 4 distinct elements: Top line in deep navy blue (#102A56): "${derived.el1En}"; Main primary hook on a bold crimson red (#D71920) panel with vibrant gold-yellow (#FFD928) letters: "${derived.el2En}"; Supporting detail in crisp dark charcoal (#111111): "${derived.el3En}"${derived.el4En ? `; Clean accent badge in navy blue: "${derived.el4En}"` : ''}. Ultra clean, professional typography, maximum mobile readability, strictly photorealistic subject, zero clutter, absolutely NO 3D cartoon, NO neon, NO dark gradients, NO gaming effects.`;

    if (chkFullBlueprint && chkFullBlueprint.checked) {
      promptTextarea.value = `🎯 **Gyan Yatra - સ્માર્ટ થંબનેલ (૧ ફોટો + ૩-૪ હાઈ-કોન્ટ્રાસ્ટ ટેક્સ્ટ એલિમેન્ટ્સ)**
📌 **વિષય**: "${rawTopic}"
⚪ **બેકગ્રાઉન્ડ**: ૧૦૦% શુદ્ધ સફેદ (#FFFFFF)
📐 **રેશિયો**: ૧૬:૯ (1280 × 720) YouTube Thumbnail

---

### 🎨 ૧. કલર કોન્ટ્રાસ્ટ પેલેટ:
• બેકગ્રાઉન્ડ: #FFFFFF (Pure White)
• મુખ્ય ટેક્સ્ટ: #102A56 (Deep Navy Blue)
• પ્રાયમરી હૂક પેનલ: #D71920 (Crimson Red) પર #FFD928 (Gold Yellow) અક્ષરો
• સહાયક વિગત: #111111 (Dark Charcoal)

### 📝 ૨. થંબનેલ લખાણ (૩ થી ૪ એલિમેન્ટ્સ):
૧. મુખ્ય વિષય: "${derived.el1}"
૨. પ્રાયમરી હૂક: "${currentMain}"
૩. સહાયક વિગત: "${currentSub}"
૪. સ્ટેટસ બેજ: "${currentBadge}"

### 📷 ૩. વાસ્તવિક ફોટોગ્રાફ:
👉 ${derived.gujPhoto}

### 🤖 AI Image (DALL-E 3 / Flux) પ્રોમ્પ્ટ:
${dalleShortPrompt}`;
    } else {
      promptTextarea.value = dalleShortPrompt;
    }
  }

  // Topic input typing event: Automatically generates prompt and syncs canvas live!
  topicInput.addEventListener('input', () => updateFromTopic(true));
  topicInput.addEventListener('change', () => updateFromTopic(true));
  topicInput.addEventListener('keyup', () => updateFromTopic(true));
  topicInput.addEventListener('paste', () => setTimeout(() => updateFromTopic(true), 20));

  // Blueprint checkbox toggle
  chkFullBlueprint.addEventListener('change', () => updateFromTopic(false));

  // Canvas text input events
  mainTextInput.addEventListener('input', (e) => {
    renderer.setState({ mainText: e.target.value });
  });

  subTextInput.addEventListener('input', (e) => {
    renderer.setState({ subText: e.target.value });
  });

  badgeSelect.addEventListener('change', (e) => {
    renderer.setState({ badgeText: e.target.value });
  });

  // Preset buttons
  container.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      container.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const preset = e.currentTarget.getAttribute('data-preset');
      renderer.setState({ preset, backgroundImage: null });
    });
  });

  // Photo Upload & Position
  posLeftBtn.addEventListener('click', () => {
    posLeftBtn.classList.add('active');
    posRightBtn.classList.remove('active');
    renderer.setState({ creatorPosition: 'left' });
  });

  posRightBtn.addEventListener('click', () => {
    posRightBtn.classList.add('active');
    posLeftBtn.classList.remove('active');
    renderer.setState({ creatorPosition: 'right' });
  });

  photoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          renderer.setCreatorImage(img);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Download Thumbnail
  downloadBtn.addEventListener('click', () => {
    renderer.download(`youtube-thumbnail-${Date.now()}.png`);
  });

  // AI Background Generation
  async function triggerAiGeneration() {
    const topic = topicInput.value.trim() || 'Breaking News Gujarat';
    const prompt = promptTextarea.value.trim() || `Realistic high contrast 16:9 YouTube thumbnail background about ${topic}`;

    const originalBgText = aiGenerateBgBtn.innerHTML;
    const originalPromptText = aiGenerateFromPromptBtn ? aiGenerateFromPromptBtn.innerHTML : '';

    aiGenerateBgBtn.disabled = true;
    aiGenerateBgBtn.innerHTML = '<span>⏳</span> આર્ટ જનરેટ થાય છે...';
    if (aiGenerateFromPromptBtn) {
      aiGenerateFromPromptBtn.disabled = true;
      aiGenerateFromPromptBtn.innerHTML = '<span>⏳</span> જનરેટ થાય છે...';
    }

    try {
      const res = await api.generateThumbnailImage(prompt, 1, topic);
      if (res.imageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          renderer.setBackgroundImage(img);
          aiGenerateBgBtn.disabled = false;
          aiGenerateBgBtn.innerHTML = originalBgText;
          if (aiGenerateFromPromptBtn) {
            aiGenerateFromPromptBtn.disabled = false;
            aiGenerateFromPromptBtn.innerHTML = originalPromptText;
          }
        };
        img.src = res.imageUrl;
      } else {
        throw new Error('Image URL not received');
      }
    } catch (err) {
      alert('AI ઈમેજ જનરેશનમાં ભૂલ: ' + err.message);
      aiGenerateBgBtn.disabled = false;
      aiGenerateBgBtn.innerHTML = originalBgText;
      if (aiGenerateFromPromptBtn) {
        aiGenerateFromPromptBtn.disabled = false;
        aiGenerateFromPromptBtn.innerHTML = originalPromptText;
      }
    }
  }

  aiGenerateBgBtn.addEventListener('click', triggerAiGeneration);
  aiGenerateFromPromptBtn?.addEventListener('click', triggerAiGeneration);

  // Copy Prompt
  container.querySelector('#btn-copy-thumb-prompt')?.addEventListener('click', () => {
    const prompt = promptTextarea.value;
    if (prompt) {
      copyToClipboard(prompt, 'થંબનેલ AI પ્રોમ્પ્ટ કોપી થઈ ગયો!');
    }
  });

  // Go to Built-in ChatGPT with this prompt
  container.querySelector('#btn-goto-chatgpt-thumb')?.addEventListener('click', () => {
    window.pendingChatPrompt = promptTextarea.value;
    navigateTo('chatgpt');
  });

  container.querySelector('#btn-thumb-header-chatgpt')?.addEventListener('click', () => {
    navigateTo('chatgpt');
  });

  // Topic chip click handlers
  container.querySelectorAll('.thumb-topic-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const topic = e.currentTarget.getAttribute('data-topic');
      if (topic) {
        topicInput.value = topic;
        updateFromTopic(true);
      }
    });
  });

  // 3 Concepts Loading & Display
  let conceptsLoaded = false;
  async function loadConcepts() {
    const topic = topicInput.value.trim();
    if (!topic) return;

    conceptsContainer.style.display = 'block';
    conceptsContainer.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div class="pulse-indicator" style="width: 18px; height: 18px; margin-bottom: 8px;"></div>
        <p style="color: var(--text-secondary); font-size: 0.9rem;">૩ થંબનેલ કોન્સેપ્ટ તૈયાર થઈ રહ્યા છે...</p>
      </div>
    `;

    try {
      const res = await api.generateThumbnailConcepts(topic);
      const concepts = res.concepts || [];
      conceptsLoaded = true;

      conceptsContainer.innerHTML = `
        <div class="card" style="border-top: 4px solid var(--accent-blue, #3b82f6);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px;">
            <h3 style="font-size: 1.15rem; font-weight: 800; display: flex; align-items: center; gap: 8px; margin: 0;">
              <span>💡</span> આ વિષય માટે ૩ વિશિષ્ટ થંબનેલ કોન્સેપ્ટ (3 Visual Concepts)
            </h3>
            <button id="btn-close-concepts" class="btn btn-outline btn-sm" style="padding: 2px 10px; font-size: 0.78rem;">
              ✕ બંધ કરો
            </button>
          </div>

          <div class="grid-3">
            ${concepts.map((c, i) => `
              <div class="card" style="border-top: 3px solid ${c.accentColor || 'var(--yt-red)'}; padding: 16px; background: rgba(255,255,255,0.02);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <span class="badge" style="background: rgba(255,255,255,0.08); color: #fff; font-size: 0.72rem;">કોન્સેપ્ટ #${i + 1}</span>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">${c.style}</span>
                </div>

                <div style="background: rgba(0,0,0,0.35); border-radius: 6px; padding: 10px; margin-bottom: 10px; text-align: center;">
                  <span style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 2px;">થંબનેલ પંચ લખાણ:</span>
                  <span style="font-size: 1.05rem; font-weight: 900; color: #fde68a;">"${c.gujaratiText}"</span>
                </div>

                <div style="font-size: 0.78rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px;">
                  <div><strong>ચહેરો/ભાવ:</strong> ${c.expression}</div>
                  <div><strong>સ્થાન:</strong> ${c.subjectPlacement}</div>
                  <div><strong>બેકગ્રાઉન્ડ:</strong> ${c.background}</div>
                  <div><strong>કોન્ટ્રાસ્ટ:</strong> ${c.contrastAdvice}</div>
                </div>

                <div style="display: flex; gap: 8px;">
                  <button class="btn btn-outline btn-sm apply-concept-btn" style="flex: 1; font-size: 0.78rem;" data-text="${c.gujaratiText}" data-accent="${c.accentColor || '#FF0000'}">
                    કેનવાસ પર લગાવો
                  </button>
                  <button class="btn btn-secondary btn-sm copy-btn" data-copy="${c.imagePrompt}" title="AI Prompt કોપી કરો" style="font-size: 0.78rem;">
                    📋 Prompt
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      // Close button
      conceptsContainer.querySelector('#btn-close-concepts')?.addEventListener('click', () => {
        conceptsContainer.style.display = 'none';
      });

      // Apply to canvas
      conceptsContainer.querySelectorAll('.apply-concept-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const text = e.currentTarget.getAttribute('data-text');
          const accent = e.currentTarget.getAttribute('data-accent');
          mainTextInput.value = text;
          renderer.setState({ mainText: text, accentColor: accent });
          container.querySelector('.canvas-preview-card')?.scrollIntoView({ behavior: 'smooth' });
        });
      });

      // Copy prompt
      conceptsContainer.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const text = e.currentTarget.getAttribute('data-copy');
          copyToClipboard(text, 'AI Image Prompt કોપી થઈ ગયો!');
        });
      });

    } catch (err) {
      conceptsContainer.innerHTML = `<div class="alert alert-warning">${err.message}</div>`;
    }
  }

  btnGetConcepts?.addEventListener('click', () => {
    if (conceptsContainer.style.display === 'none') {
      loadConcepts();
    } else {
      conceptsContainer.style.display = 'none';
    }
  });

  // Initial Auto-Generation on Page Load
  updateFromTopic(true);
}
