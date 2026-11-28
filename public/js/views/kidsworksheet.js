import { copyToClipboard } from '../utils/clipboard.js?v=90.0';

const PRESET_TOPICS = [
  { label: '🔢 1 to 10 Single-Dots (1 Page Each)', topic: 'Single-Line Single-Dots Number Tracing 1 to 10 (One Number Per Page)', type: 'tracing_1_to_10', age: '4-6', need: 'Fine Motor Skills', pages: 10 },
  { label: '1️⃣ Number 1-10 + Ten Frames', topic: 'Number Tracing 1 to 10 & Ten Frames Counting', type: 'numbers', age: '4-6', need: 'Early Learning', pages: 8 },
  { label: '🔤 Alphabet Tracing A-Z', topic: 'Alphabet Tracing A to Z Phonics Pack', type: 'alphabet', age: '4-6', need: 'Early Learning', pages: 8 },
  { label: '✏️ Pre-Writing Lines', topic: 'Pre-Writing Lines, Loops & Zigzag Tracing', type: 'line_tracing', age: '2-5', need: 'Fine Motor Skills', pages: 5 },
  { label: '🔺 Shape Matching', topic: 'Visual Shape & Shadow Matching Game', type: 'shapes_matching', age: '2-5', need: 'Autism Support', pages: 5 },
  { label: '➕ Picture Addition Math', topic: 'Visual Picture Addition & Counting Math', type: 'math_addition', age: '6-8', need: 'ADHD Activities', pages: 8 },
  { label: '🦁 Animal Coloring Book', topic: 'Cute Animals Bold Outline Coloring Book', type: 'coloring', age: '2-5', need: 'Fine Motor Skills', pages: 8 },
  { label: '😊 Emotions & Social Skills', topic: 'Emotions Recognition & Calm Feelings Pack', type: 'emotions', age: '4-6', need: 'Autism Support', pages: 5 },
  { label: '🌟 All-in-One Special Kids Pack', topic: 'Complete Special Kids Learning Workbook', type: 'auto', age: '4-6', need: 'Autism Support', pages: 8 }
];

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPagePreviewSrcdoc(pageHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    font-family: 'Nunito Sans', 'Segoe UI', system-ui, sans-serif;
    color: #1E293B;
    overflow: hidden;
  }
  .ws-page {
    position: relative;
    width: 794px;
    height: 1122px;
    padding: 42px;
    background: #FFFFFF;
    overflow: hidden;
  }
  .ws-inner-border {
    position: relative;
    z-index: 3;
    width: 100%;
    height: 100%;
    background: #FFFFFF;
    border: 3.5px solid #397BB5;
    border-radius: 22px;
    padding: 20px 26px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .ws-top-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px; }
  .ws-name-row { display: flex; gap: 16px; font-size: 14px; color: #334155; }
  .ws-title-pill { padding: 6px 16px; border-radius: 999px; font-weight: 900; font-size: 14px; white-space: nowrap; }
  .ws-instruction-box {
    background: #F1F5F9; border-radius: 12px; padding: 10px 16px;
    display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 16px; color: #1E293B;
  }
  .ws-star-badge { width: 28px; height: 28px; border-radius: 50%; background: #FACC15; color: #713F12; display: inline-grid; place-items: center; font-weight: 900; flex-shrink: 0; }
  .ws-body-area { flex: 1; min-height: 0; overflow: hidden; }
  .ws-footer-bar {
    display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 700; color: #64748B;
    border-top: 1.5px solid #E2E8F0; padding-top: 8px;
  }
</style>
</head>
<body>${pageHtml || ''}
<script>
  function fitA4() {
    var scale = Math.max(0.25, window.innerWidth / 794);
    document.body.style.zoom = scale;
  }
  fitA4();
  window.addEventListener('resize', fitA4);
</script>
</body>
</html>`;
}

export async function renderKidsWorksheet(container) {
  let currentPack = null;
  let currentViewMode = 'page'; // 'cover' | 'page'
  let currentPageIndex = 0;
  let lastExportUrl = '';

  container.innerHTML = `
    <div style="max-width: 1240px; margin: 0 auto; padding: 12px 6px 40px;">
      <!-- Studio Header -->
      <div class="card" style="background: linear-gradient(135deg, rgba(16,185,129,0.18), rgba(14,165,233,0.16), rgba(245,158,11,0.14)); border: 1.5px solid rgba(52,211,153,0.45); margin-bottom: 18px;">
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 14px;">
          <div>
            <div style="display: inline-flex; align-items: center; gap: 8px; padding: 4px 12px; border-radius: 999px; background: rgba(16,185,129,0.22); color: #6ee7b7; font-size: 12px; font-weight: 800; margin-bottom: 8px;">
              <span>🧩 TOOL 15</span>
              <span>•</span>
              <span>A4 Print-Ready Vector PDF Generator</span>
            </div>
            <h1 style="margin: 0 0 6px; font-size: 26px; font-weight: 900; color: #f8fafc;">
              🎨 Best Kids Worksheet AI Studio
            </h1>
            <p style="margin: 0; color: #cbd5e1; font-size: 14px; line-height: 1.5;">
              ફક્ત <b>kidsworksheet</b> કે કોઈપણ ટોપિક નાખો → ઓટોમેટિક Crisp Vector Cover, Tracing Guides, Ten-Frames, Matching, Coloring અને Direct A4 PDF + Live Store Publish તૈયાર!
            </p>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <a href="https://special-kids-worksheets.onrender.com" target="_blank" rel="noopener"
              style="padding: 10px 14px; border-radius: 10px; background: rgba(15,23,42,0.75); border: 1px solid rgba(148,163,184,0.35); color: #7dd3fc; font-weight: 700; text-decoration: none; font-size: 13px;">
              🌐 Live Store જુઓ
            </a>
          </div>
        </div>
      </div>

      <!-- Generator Controls -->
      <div class="card" style="background: rgba(15,23,42,0.82); border: 1px solid rgba(148,163,184,0.24); margin-bottom: 18px;">
        <div style="margin-bottom: 14px;">
          <label for="kw-topic" style="display: block; font-size: 13px; font-weight: 800; color: #e2e8f0; margin-bottom: 8px;">
            ✍️ ટોપિક અથવા "kidsworksheet" લખો:
          </label>
          <input id="kw-topic" type="text" value="kidsworksheet"
            placeholder="દા.ત. kidsworksheet, Number Tracing 1-10, Alphabet Phonics, Autism Calm Matching..."
            style="width: 100%; padding: 13px 16px; border-radius: 12px; border: 1.5px solid #334155; background: #0f172a; color: #f8fafc; font-size: 15px; font-weight: 600;" />
        </div>

        <!-- Quick Topic Presets -->
        <div style="margin-bottom: 16px;">
          <div style="font-size: 12px; font-weight: 700; color: #94a3b8; margin-bottom: 8px;">⚡ 1-Click Best Worksheet Presets:</div>
          <div id="kw-presets" style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${PRESET_TOPICS.map((p, idx) => `
              <button type="button" class="kw-preset-btn" data-idx="${idx}"
                style="padding: 8px 12px; border-radius: 10px; border: 1px solid rgba(56,189,248,0.35); background: rgba(30,41,59,0.9); color: #e0f2fe; font-size: 12.5px; font-weight: 700; cursor: pointer;">
                ${p.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Dropdown Grid -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-bottom: 18px;">
          <div>
            <label for="kw-type" style="display: block; font-size: 12px; font-weight: 700; color: #94a3b8; margin-bottom: 6px;">📚 Worksheet Style</label>
            <select id="kw-type" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #334155; background: #0f172a; color: #f8fafc; font-size: 13.5px;">
              <option value="auto">🌟 Auto Best Mix (Balanced Pack)</option>
              <option value="tracing_1_to_10">🔢 1 to 10 Single-Dots (1 Number Per Page)</option>
              <option value="numbers">1️⃣ Number Tracing & Ten-Frames</option>
              <option value="alphabet">🔤 Alphabet Tracing & Phonics</option>
              <option value="line_tracing">✏️ Pre-Writing Line Tracing</option>
              <option value="shapes_matching">🔺 Visual Shape Matching</option>
              <option value="math_addition">➕ Picture Addition Math</option>
              <option value="coloring">🦁 Bold Animal Coloring</option>
              <option value="emotions">😊 Emotions & Social Skills</option>
            </select>
          </div>

          <div>
            <label for="kw-age" style="display: block; font-size: 12px; font-weight: 700; color: #94a3b8; margin-bottom: 6px;">👶 Age Group</label>
            <select id="kw-age" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #334155; background: #0f172a; color: #f8fafc; font-size: 13.5px;">
              <option value="2-5">2-5 Years (Toddler / Pre-K)</option>
              <option value="4-6" selected>4-6 Years (Kindergarten)</option>
              <option value="6-8">6-8 Years (Early Primary)</option>
              <option value="8-10+">8-10+ Years (Skill Booster)</option>
            </select>
          </div>

          <div>
            <label for="kw-pages" style="display: block; font-size: 12px; font-weight: 700; color: #94a3b8; margin-bottom: 6px;">📄 Total Pages</label>
            <select id="kw-pages" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #334155; background: #0f172a; color: #f8fafc; font-size: 13.5px;">
              <option value="1">1 Page (Single Full Sheet)</option>
              <option value="5">5 Pages (Quick Starter)</option>
              <option value="8" selected>8 Pages (Best Standard Pack)</option>
              <option value="10">10 Pages (Full Workbook)</option>
              <option value="12">12 Pages (Mega Pack)</option>
              <option value="15">15 Pages (Complete Edition)</option>
            </select>
          </div>

          <div>
            <label for="kw-need" style="display: block; font-size: 12px; font-weight: 700; color: #94a3b8; margin-bottom: 6px;">🧠 Learning Need</label>
            <select id="kw-need" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #334155; background: #0f172a; color: #f8fafc; font-size: 13.5px;">
              <option value="General Support">General Support</option>
              <option value="Autism Support">Autism Support (Clear Visuals)</option>
              <option value="ADHD Activities">ADHD Activities (Focused Tasks)</option>
              <option value="Fine Motor Skills">Fine Motor Skills</option>
              <option value="Early Learning">Early Learning</option>
            </select>
          </div>
        </div>

        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 14px;">
          <button id="kw-generate-btn" type="button"
            style="padding: 13px 24px; border-radius: 12px; border: none; background: linear-gradient(135deg, #10b981, #0ea5e9); color: #ffffff; font-size: 15px; font-weight: 900; cursor: pointer; box-shadow: 0 8px 20px rgba(16,185,129,0.28);">
            ✨ Best Kids Worksheet બનાવો
          </button>
          <label style="display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: #e2e8f0; font-weight: 700; cursor: pointer;">
            <input id="kw-include-cover" type="checkbox" checked style="width: 16px; height: 16px; accent-color: #10b981;" />
            <span>📕 PDF ના પહેલા પેજ પર Colorful Cover Book ઉમેરો</span>
          </label>
          <span id="kw-status" style="font-size: 13.5px; color: #94a3b8; font-weight: 600;"></span>
        </div>
      </div>

      <!-- Result Studio -->
      <div id="kw-result-area" style="display: none; grid-template-columns: minmax(320px, 1.25fr) minmax(300px, 0.95fr); gap: 18px; align-items: start;">
        <!-- Left: A4 Live Preview -->
        <div class="card" style="background: rgba(15,23,42,0.86); border: 1px solid rgba(52,211,153,0.35);">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px;">
            <div>
              <h2 style="margin: 0; font-size: 18px; font-weight: 800; color: #f8fafc;">👁️ A4 Print Preview</h2>
              <div id="kw-page-caption" style="font-size: 12.5px; color: #6ee7b7; font-weight: 700; margin-top: 2px;">Page 1</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <button id="kw-prev-btn" type="button" style="padding: 7px 12px; border-radius: 8px; border: 1px solid #475569; background: #1e293b; color: #f8fafc; font-weight: 700; cursor: pointer;">◀ Prev</button>
              <button id="kw-next-btn" type="button" style="padding: 7px 12px; border-radius: 8px; border: 1px solid #475569; background: #1e293b; color: #f8fafc; font-weight: 700; cursor: pointer;">Next ▶</button>
            </div>
          </div>

          <!-- Thumbnail Quick Jump -->
          <div id="kw-thumbs" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px;"></div>

          <!-- White A4 Sheet Box -->
          <div id="kw-preview-box" style="background: #ffffff; border-radius: 12px; padding: 6px; box-shadow: 0 12px 30px rgba(0,0,0,0.45); overflow: hidden;">
            <iframe id="kw-preview-frame" title="Worksheet A4 Preview"
              style="width: 100%; aspect-ratio: 210 / 297; border: none; border-radius: 8px; background: #ffffff; display: block;"></iframe>
            <img id="kw-cover-preview" alt="Worksheet Cover"
              style="display: none; width: 100%; border-radius: 8px; background: #ffffff;" />
          </div>
        </div>

        <!-- Right: Download, SEO & Direct Publish -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          <!-- Export Actions -->
          <div class="card" style="background: rgba(15,23,42,0.86); border: 1px solid rgba(56,189,248,0.35);">
            <h2 style="margin: 0 0 10px; font-size: 18px; font-weight: 800; color: #f8fafc;">📥 Export Print-Ready PDF & Cover</h2>
            <p style="margin: 0 0 12px; font-size: 13px; color: #cbd5e1;">
              300-DPI Vector A4 PDF (નો વોટરમાર્ક, Print & KDP / Gumroad / Store રેડી).
            </p>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              <button id="kw-export-pdf-btn" type="button"
                style="width: 100%; padding: 12px 16px; border-radius: 10px; border: none; background: linear-gradient(135deg, #2563eb, #0284c7); color: #fff; font-size: 14px; font-weight: 800; cursor: pointer;">
                📥 Print-Ready A4 PDF ડાઉનલોડ કરો
              </button>
              <button id="kw-download-cover-btn" type="button"
                style="width: 100%; padding: 11px 16px; border-radius: 10px; border: 1px solid rgba(168,85,247,0.5); background: rgba(168,85,247,0.16); color: #e9d5ff; font-size: 13.5px; font-weight: 800; cursor: pointer;">
                🖼️ Cover Image (SVG) ડાઉનલોડ કરો
              </button>
            </div>
            <div id="kw-export-status" style="margin-top: 10px; font-size: 13px; color: #93c5fd;"></div>
          </div>

          <!-- SEO Details -->
          <div class="card" style="background: rgba(15,23,42,0.86); border: 1px solid rgba(250,204,21,0.32);">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 10px;">
              <h2 style="margin: 0; font-size: 17px; font-weight: 800; color: #fde047;">🔍 SEO Title & Description</h2>
              <button id="kw-copy-seo-btn" type="button"
                style="padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(250,204,21,0.45); background: rgba(250,204,21,0.14); color: #fef08a; font-size: 12px; font-weight: 800; cursor: pointer;">
                📋 Copy SEO
              </button>
            </div>
            <div id="kw-seo-box" style="font-size: 13px; color: #e2e8f0; line-height: 1.55;"></div>
          </div>

          <!-- 1-Click Publish to Live Store -->
          <div class="card" style="background: rgba(15,23,42,0.86); border: 1px solid rgba(244,114,182,0.4);">
            <h2 style="margin: 0 0 8px; font-size: 17px; font-weight: 800; color: #f9a8d4;">🚀 Live Store પર Direct Publish કરો</h2>
            <p style="margin: 0 0 12px; font-size: 12.5px; color: #cbd5e1;">
              તમારા <b>Special Kids Worksheets</b> Store પર A4 PDF + Cover + SEO બધું 1 ક્લિકમાં પબ્લિશ થઈ જશે.
            </p>
            <div style="display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 12px;">
              <div>
                <label for="kw-store-url" style="display: block; font-size: 11.5px; color: #94a3b8; margin-bottom: 4px;">Store URL</label>
                <input id="kw-store-url" type="text" value="https://special-kids-worksheets.onrender.com"
                  style="width: 100%; padding: 9px 11px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #f8fafc; font-size: 13px;" />
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>
                  <label for="kw-price" style="display: block; font-size: 11.5px; color: #94a3b8; margin-bottom: 4px;">Price (₹ / 0 = Free)</label>
                  <input id="kw-price" type="number" min="0" value="0"
                    style="width: 100%; padding: 9px 11px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #f8fafc; font-size: 13px;" />
                </div>
                <div>
                  <label for="kw-pin" style="display: block; font-size: 11.5px; color: #94a3b8; margin-bottom: 4px;">Admin PIN</label>
                  <input id="kw-pin" type="password" value="1234"
                    style="width: 100%; padding: 9px 11px; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #f8fafc; font-size: 13px;" />
                </div>
              </div>
            </div>
            <button id="kw-publish-btn" type="button"
              style="width: 100%; padding: 12px 16px; border-radius: 10px; border: none; background: linear-gradient(135deg, #ec4899, #f97316); color: #fff; font-size: 14px; font-weight: 900; cursor: pointer;">
              🚀 Live Store પર Publish કરો
            </button>
            <div id="kw-publish-status" style="margin-top: 10px; font-size: 13px; color: #fbcfe8;"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const topicEl = container.querySelector('#kw-topic');
  const typeEl = container.querySelector('#kw-type');
  const ageEl = container.querySelector('#kw-age');
  const pagesEl = container.querySelector('#kw-pages');
  const needEl = container.querySelector('#kw-need');
  const includeCoverEl = container.querySelector('#kw-include-cover');
  const generateBtn = container.querySelector('#kw-generate-btn');
  const statusEl = container.querySelector('#kw-status');
  const resultArea = container.querySelector('#kw-result-area');
  const previewFrame = container.querySelector('#kw-preview-frame');
  const coverPreview = container.querySelector('#kw-cover-preview');
  const pageCaption = container.querySelector('#kw-page-caption');
  const thumbsEl = container.querySelector('#kw-thumbs');
  const prevBtn = container.querySelector('#kw-prev-btn');
  const nextBtn = container.querySelector('#kw-next-btn');
  const exportPdfBtn = container.querySelector('#kw-export-pdf-btn');
  const downloadCoverBtn = container.querySelector('#kw-download-cover-btn');
  const exportStatusEl = container.querySelector('#kw-export-status');
  const seoBox = container.querySelector('#kw-seo-box');
  const copySeoBtn = container.querySelector('#kw-copy-seo-btn');
  const storeUrlEl = container.querySelector('#kw-store-url');
  const priceEl = container.querySelector('#kw-price');
  const pinEl = container.querySelector('#kw-pin');
  const publishBtn = container.querySelector('#kw-publish-btn');
  const publishStatusEl = container.querySelector('#kw-publish-status');

  function renderPreview() {
    if (!currentPack) return;
    const totalPages = (currentPack.pagesHtml || []).length;
    const startSheetIdx = currentPack.hasCoverInPdf ? 1 : 0;

    const thumbButtons = [
      `<button type="button" data-mode="cover" style="padding: 5px 10px; border-radius: 8px; border: 1px solid ${currentViewMode === 'cover' ? '#f472b6' : '#334155'}; background: ${currentViewMode === 'cover' ? 'rgba(236,72,153,0.25)' : '#1e293b'}; color: #f8fafc; font-size: 12px; font-weight: 700; cursor: pointer;">📕 Cover</button>`
    ];
    for (let i = startSheetIdx; i < totalPages; i++) {
      const sheetNum = i - startSheetIdx + 1;
      const active = currentViewMode === 'page' && currentPageIndex === i;
      thumbButtons.push(
        `<button type="button" data-mode="page" data-page="${i}" style="padding: 5px 10px; border-radius: 8px; border: 1px solid ${active ? '#38bdf8' : '#334155'}; background: ${active ? 'rgba(56,189,248,0.25)' : '#1e293b'}; color: #f8fafc; font-size: 12px; font-weight: 700; cursor: pointer;">P${sheetNum}</button>`
      );
    }
    thumbsEl.innerHTML = thumbButtons.join('');

    thumbsEl.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.mode === 'cover') {
          currentViewMode = 'cover';
        } else {
          currentViewMode = 'page';
          currentPageIndex = Number(btn.dataset.page || startSheetIdx);
        }
        renderPreview();
      });
    });

    if (currentViewMode === 'cover' && currentPack.coverDataUrl) {
      previewFrame.style.display = 'none';
      coverPreview.style.display = 'block';
      coverPreview.src = currentPack.coverDataUrl;
      pageCaption.textContent = `📕 Front Cover • ${currentPack.title}`;
    } else {
      coverPreview.style.display = 'none';
      previewFrame.style.display = 'block';
      const pageHtml = (currentPack.pagesHtml || [])[currentPageIndex] || '';
      previewFrame.srcdoc = buildPagePreviewSrcdoc(pageHtml);
      const sheetNum = currentPageIndex - startSheetIdx + 1;
      const sheetCount = totalPages - startSheetIdx;
      pageCaption.textContent = `Page ${sheetNum} of ${sheetCount} • ${currentPack.ageGroup} Yrs • ${currentPack.learningNeed}`;
    }
  }

  function renderSeoBox() {
    if (!currentPack) return;
    const highlights = Array.isArray(currentPack.highlights) ? currentPack.highlights : [];
    seoBox.innerHTML = `
      <div style="margin-bottom: 8px;"><b style="color:#93c5fd;">Title:</b> ${escapeHtml(currentPack.title)}</div>
      <div style="margin-bottom: 8px;"><b style="color:#93c5fd;">Subtitle:</b> ${escapeHtml(currentPack.subtitle)}</div>
      <div style="margin-bottom: 8px;"><b style="color:#93c5fd;">Category:</b> ${escapeHtml(currentPack.category)} • <b style="color:#93c5fd;">Skill:</b> ${escapeHtml(currentPack.skillArea)}</div>
      <div style="margin-bottom: 8px;"><b style="color:#93c5fd;">Description:</b> ${escapeHtml(currentPack.description)}</div>
      ${highlights.length ? `<div><b style="color:#93c5fd;">Highlights:</b><ul style="margin:4px 0 0 18px; padding:0;">${highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul></div>` : ''}
    `;
  }

  async function generatePack() {
    const topic = (topicEl.value || '').trim() || 'kidsworksheet';
    generateBtn.disabled = true;
    generateBtn.textContent = '⏳ Best Worksheet બની રહી છે...';
    statusEl.textContent = 'Crisp Vector A4 Pages + Cover + SEO તૈયાર થઈ રહ્યું છે...';
    exportStatusEl.textContent = '';
    publishStatusEl.textContent = '';
    lastExportUrl = '';

    try {
      const res = await fetch('/api/worksheet-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          worksheetType: typeEl.value,
          ageGroup: ageEl.value,
          pageCount: Number(pagesEl.value || 8),
          learningNeed: needEl.value,
          includeCoverInPdf: includeCoverEl ? includeCoverEl.checked : true
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.pack) {
        throw new Error(data.error || 'Failed to generate worksheet pack');
      }

      currentPack = data.pack;
      currentViewMode = currentPack.hasCoverInPdf ? 'cover' : 'page';
      currentPageIndex = currentPack.hasCoverInPdf ? 1 : 0;

      resultArea.style.display = 'grid';
      renderPreview();
      renderSeoBox();
      statusEl.innerHTML = `<span style="color:#6ee7b7;">✅ તૈયાર! ${currentPack.pagesHtml.length} Printable A4 Pages + Vector Cover બની ગઈ.</span>`;
    } catch (err) {
      statusEl.innerHTML = `<span style="color:#fca5a5;">❌ Error: ${escapeHtml(err.message)}</span>`;
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = '✨ Best Kids Worksheet બનાવો';
    }
  }

  // Preset buttons
  container.querySelectorAll('.kw-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = PRESET_TOPICS[Number(btn.dataset.idx)];
      if (!preset) return;
      topicEl.value = preset.topic;
      typeEl.value = preset.type;
      ageEl.value = preset.age;
      needEl.value = preset.need;
      if (preset.pages) {
        pagesEl.value = String(preset.pages);
        if (includeCoverEl) includeCoverEl.checked = preset.pages > 1;
      }
      generatePack();
    });
  });

  pagesEl.addEventListener('change', () => {
    if (includeCoverEl) includeCoverEl.checked = Number(pagesEl.value || 8) > 1;
  });

  generateBtn.addEventListener('click', generatePack);
  topicEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') generatePack();
  });

  prevBtn.addEventListener('click', () => {
    if (!currentPack) return;
    const startSheetIdx = currentPack.hasCoverInPdf ? 1 : 0;
    if (currentViewMode === 'cover') return;
    if (currentPageIndex <= startSheetIdx) {
      currentViewMode = 'cover';
    } else {
      currentPageIndex--;
    }
    renderPreview();
  });

  nextBtn.addEventListener('click', () => {
    if (!currentPack) return;
    const total = (currentPack.pagesHtml || []).length;
    const startSheetIdx = currentPack.hasCoverInPdf ? 1 : 0;
    if (currentViewMode === 'cover') {
      currentViewMode = 'page';
      currentPageIndex = startSheetIdx;
    } else if (currentPageIndex < total - 1) {
      currentPageIndex++;
    }
    renderPreview();
  });

  exportPdfBtn.addEventListener('click', async () => {
    if (!currentPack) return;
    exportPdfBtn.disabled = true;
    exportPdfBtn.textContent = '⏳ A4 Print PDF Render થઈ રહી છે...';
    exportStatusEl.textContent = 'High-resolution PDF બની રહી છે...';

    try {
      const res = await fetch('/api/worksheet-studio/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullPrintableHtml: currentPack.fullPrintableHtml,
          title: currentPack.title
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.downloadUrl) {
        throw new Error(data.error || 'PDF export failed');
      }
      lastExportUrl = data.downloadUrl;
      const kb = Math.round((data.bytes || 0) / 1024);
      exportStatusEl.innerHTML = `✅ PDF Ready (${kb} KB): <a href="${escapeHtml(data.downloadUrl)}" download="${escapeHtml(data.filename || 'worksheet.pdf')}" style="color:#6ee7b7; font-weight:800; text-decoration:underline;">અહીં ક્લિક કરી ડાઉનલોડ કરો</a>`;

      const a = document.createElement('a');
      a.href = data.downloadUrl;
      a.download = data.filename || 'kids-worksheet.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      exportStatusEl.innerHTML = `<span style="color:#fca5a5;">❌ ${escapeHtml(err.message)}</span>`;
    } finally {
      exportPdfBtn.disabled = false;
      exportPdfBtn.textContent = '📥 Print-Ready A4 PDF ડાઉનલોડ કરો';
    }
  });

  downloadCoverBtn.addEventListener('click', () => {
    if (!currentPack || !currentPack.coverDataUrl) return;
    const a = document.createElement('a');
    a.href = currentPack.coverDataUrl;
    a.download = `${(currentPack.title || 'worksheet-cover').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  copySeoBtn.addEventListener('click', async () => {
    if (!currentPack) return;
    const seoText = [
      `Title: ${currentPack.title}`,
      `Subtitle: ${currentPack.subtitle}`,
      `Category: ${currentPack.category}`,
      `Age Group: ${currentPack.ageGroup}`,
      `Learning Need: ${currentPack.learningNeed}`,
      `Skill Area: ${currentPack.skillArea}`,
      `Description: ${currentPack.description}`,
      `Highlights:\n- ${(currentPack.highlights || []).join('\n- ')}`
    ].join('\n');
    await copyToClipboard(seoText);
    copySeoBtn.textContent = '✅ Copied!';
    setTimeout(() => { copySeoBtn.textContent = '📋 Copy SEO'; }, 1800);
  });

  publishBtn.addEventListener('click', async () => {
    if (!currentPack) return;
    publishBtn.disabled = true;
    publishBtn.textContent = '⏳ Store પર Publish થઈ રહ્યું છે...';
    publishStatusEl.textContent = 'PDF બનાવીને Live Store પર અપલોડ થઈ રહ્યું છે...';

    try {
      const storeUrl = (storeUrlEl.value || 'https://special-kids-worksheets.onrender.com').trim();
      const res = await fetch('/api/worksheet-studio/publish-store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeUrl,
          adminPin: (pinEl.value || '1234').trim(),
          title: currentPack.title,
          subtitle: currentPack.subtitle,
          ageGroup: currentPack.ageGroup,
          category: currentPack.category,
          learningNeed: currentPack.learningNeed,
          skillArea: currentPack.skillArea,
          pages: `${currentPack.pagesHtml.length} Printable A4 Pages`,
          price: Number(priceEl.value || 0),
          mrp: Number(priceEl.value || 0) > 0 ? Math.round(Number(priceEl.value) * 1.5) : 149,
          description: currentPack.description,
          highlights: currentPack.highlights,
          coverDataUrl: currentPack.coverDataUrl,
          fullPrintableHtml: currentPack.fullPrintableHtml
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Store publish failed');
      }
      const slug = data.book?.slug ? `${storeUrl.replace(/\/+$/, '')}/book/${data.book.slug}` : storeUrl;
      publishStatusEl.innerHTML = `✅ Live Store પર Publish થઈ ગઈ! <a href="${escapeHtml(slug)}" target="_blank" rel="noopener" style="color:#6ee7b7; font-weight:800; text-decoration:underline;">Store પર જુઓ ↗</a>`;
    } catch (err) {
      publishStatusEl.innerHTML = `<span style="color:#fca5a5;">❌ ${escapeHtml(err.message)}</span>`;
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = '🚀 Live Store પર Publish કરો';
    }
  });
}
