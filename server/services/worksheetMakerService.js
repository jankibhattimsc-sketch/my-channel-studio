const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const openaiService = require('./openaiService');

const BASE_ROOT = path.join(__dirname, '..', '..');
const DOWNLOAD_DIR = path.join(BASE_ROOT, 'public', 'download');
const SCRATCH_DIR = path.join(BASE_ROOT, 'scratch');

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function findHeadlessBrowser() {
  const candidates = [
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const ALPHABET_BANK = [
  { letter: 'A', word: 'Apple', color: '#EF4444', iconSvg: '<circle cx="40" cy="44" r="24" fill="#EF4444" stroke="#991B1B" stroke-width="3"/><path d="M40 20 C40 12, 48 10, 52 14" stroke="#78350F" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="48" cy="18" rx="9" ry="5" fill="#22C55E" transform="rotate(-20 48 18)"/><circle cx="32" cy="40" r="3" fill="#1E293B"/><circle cx="46" cy="40" r="3" fill="#1E293B"/><path d="M34 48 Q39 53 44 48" stroke="#1E293B" stroke-width="2.5" fill="none" stroke-linecap="round"/>' },
  { letter: 'B', word: 'Ball', color: '#3B82F6', iconSvg: '<circle cx="40" cy="40" r="25" fill="#FDE047" stroke="#1E293B" stroke-width="3"/><path d="M22 22 Q40 40 22 58" stroke="#EF4444" stroke-width="5" fill="none"/><path d="M58 22 Q40 40 58 58" stroke="#3B82F6" stroke-width="5" fill="none"/><circle cx="40" cy="40" r="25" fill="none" stroke="#1E293B" stroke-width="3"/>' },
  { letter: 'C', word: 'Cat', color: '#F59E0B', iconSvg: '<polygon points="20,28 24,10 36,22" fill="#FDBA74" stroke="#9A3412" stroke-width="2.5"/><polygon points="60,28 56,10 44,22" fill="#FDBA74" stroke="#9A3412" stroke-width="2.5"/><circle cx="40" cy="42" r="22" fill="#FED7AA" stroke="#9A3412" stroke-width="3"/><circle cx="32" cy="39" r="3.2" fill="#1E293B"/><circle cx="48" cy="39" r="3.2" fill="#1E293B"/><polygon points="40,44 37,48 43,48" fill="#EC4899"/><path d="M35 51 Q40 55 45 51" stroke="#9A3412" stroke-width="2.2" fill="none"/>' },
  { letter: 'D', word: 'Duck', color: '#10B981', iconSvg: '<ellipse cx="42" cy="48" rx="22" ry="16" fill="#FDE047" stroke="#CA8A04" stroke-width="2.8"/><circle cx="30" cy="28" r="13" fill="#FDE047" stroke="#CA8A04" stroke-width="2.8"/><polygon points="18,28 8,32 18,35" fill="#F97316" stroke="#C2410C" stroke-width="2"/><circle cx="26" cy="26" r="2.8" fill="#1E293B"/>' },
  { letter: 'E', word: 'Egg', color: '#8B5CF6', iconSvg: '<ellipse cx="40" cy="42" rx="20" ry="26" fill="#FEF3C7" stroke="#D97706" stroke-width="3"/><path d="M22 40 Q31 32 40 40 T58 40" stroke="#F472B6" stroke-width="3" fill="none"/><circle cx="34" cy="28" r="3.5" fill="#60A5FA"/><circle cx="46" cy="52" r="3.5" fill="#34D399"/>' },
  { letter: 'F', word: 'Fish', color: '#06B6D4', iconSvg: '<polygon points="56,40 70,26 70,54" fill="#FB923C" stroke="#C2410C" stroke-width="2.5"/><ellipse cx="36" cy="40" rx="23" ry="16" fill="#38BDF8" stroke="#0369A1" stroke-width="3"/><circle cx="24" cy="36" r="3" fill="#1E293B"/><path d="M22 45 Q28 49 33 45" stroke="#0369A1" stroke-width="2.4" fill="none"/>' },
  { letter: 'G', word: 'Grapes', color: '#7C3AED', iconSvg: '<path d="M40 12 L40 22" stroke="#78350F" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="30" r="8" fill="#A855F7" stroke="#6B21A8" stroke-width="2.2"/><circle cx="48" cy="30" r="8" fill="#A855F7" stroke="#6B21A8" stroke-width="2.2"/><circle cx="28" cy="44" r="8" fill="#9333EA" stroke="#6B21A8" stroke-width="2.2"/><circle cx="40" cy="44" r="8" fill="#A855F7" stroke="#6B21A8" stroke-width="2.2"/><circle cx="52" cy="44" r="8" fill="#9333EA" stroke="#6B21A8" stroke-width="2.2"/><circle cx="40" cy="58" r="8" fill="#7E22CE" stroke="#581C87" stroke-width="2.2"/>' },
  { letter: 'H', word: 'House', color: '#EC4899', iconSvg: '<polygon points="40,12 14,34 66,34" fill="#FB7185" stroke="#BE123C" stroke-width="2.8"/><rect x="20" y="34" width="40" height="30" fill="#FEF9C3" stroke="#CA8A04" stroke-width="2.8"/><rect x="34" y="44" width="12" height="20" rx="2" fill="#60A5FA" stroke="#1D4ED8" stroke-width="2"/>' },
  { letter: 'I', word: 'Ice Cream', color: '#F43F5E', iconSvg: '<polygon points="26,38 54,38 40,68" fill="#FBBF24" stroke="#B45309" stroke-width="2.6"/><circle cx="40" cy="28" r="15" fill="#F9A8D4" stroke="#DB2777" stroke-width="2.6"/><circle cx="40" cy="14" r="5" fill="#EF4444"/>' },
  { letter: 'J', word: 'Jellyfish', color: '#6366F1', iconSvg: '<path d="M20 38 A20 20 0 0 1 60 38 Z" fill="#C084FC" stroke="#7E22CE" stroke-width="2.8"/><path d="M26 38 Q22 52 28 64 M36 38 Q32 52 38 64 M46 38 Q50 52 44 64 M54 38 Q58 52 52 64" stroke="#A855F7" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="34" cy="30" r="2.6" fill="#1E293B"/><circle cx="46" cy="30" r="2.6" fill="#1E293B"/>' },
  { letter: 'K', word: 'Kite', color: '#14B8A6', iconSvg: '<polygon points="40,10 64,34 40,58 16,34" fill="#FBBF24" stroke="#0F766E" stroke-width="3"/><line x1="40" y1="10" x2="40" y2="58" stroke="#0F766E" stroke-width="2"/><line x1="16" y1="34" x2="64" y2="34" stroke="#0F766E" stroke-width="2"/><path d="M40 58 Q48 64 40 70" stroke="#EF4444" stroke-width="3" fill="none"/>' },
  { letter: 'L', word: 'Lion', color: '#EA580C', iconSvg: '<circle cx="40" cy="40" r="26" fill="#F97316" stroke="#9A3412" stroke-width="2.8"/><circle cx="40" cy="40" r="18" fill="#FDE047" stroke="#CA8A04" stroke-width="2"/><circle cx="34" cy="37" r="2.8" fill="#1E293B"/><circle cx="46" cy="37" r="2.8" fill="#1E293B"/><polygon points="40,42 37,46 43,46" fill="#9A3412"/><path d="M34 49 Q40 53 46 49" stroke="#9A3412" stroke-width="2" fill="none"/>' }
];

const NUMBER_WORDS = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve'];

function cuteSmallItemSvg(kind, fill = '#EF4444', stroke = '#991B1B') {
  if (kind === 'star') {
    return `<svg width="46" height="46" viewBox="0 0 60 60"><polygon points="30,6 37,22 54,23 41,35 45,52 30,43 15,52 19,35 6,23 23,22" fill="#FACC15" stroke="#B45309" stroke-width="3" stroke-linejoin="round"/><circle cx="25" cy="28" r="2.4" fill="#1E293B"/><circle cx="35" cy="28" r="2.4" fill="#1E293B"/><path d="M26 34 Q30 38 34 34" stroke="#1E293B" stroke-width="2" fill="none" stroke-linecap="round"/></svg>`;
  }
  if (kind === 'heart') {
    return `<svg width="46" height="46" viewBox="0 0 60 60"><path d="M30 52 C30 52 8 38 8 22 C8 13 15 8 22 8 C26.5 8 29 10.5 30 13 C31 10.5 33.5 8 38 8 C45 8 52 13 52 22 C52 38 30 52 30 52 Z" fill="#F472B6" stroke="#BE185D" stroke-width="3"/></svg>`;
  }
  return `<svg width="46" height="46" viewBox="0 0 60 60"><circle cx="30" cy="34" r="19" fill="${fill}" stroke="${stroke}" stroke-width="3"/><path d="M30 15 Q32 8 38 8" stroke="#78350F" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="36" cy="13" rx="7" ry="4" fill="#22C55E"/><circle cx="24" cy="31" r="2.5" fill="#1E293B"/><circle cx="36" cy="31" r="2.5" fill="#1E293B"/><path d="M25 38 Q30 42 35 38" stroke="#1E293B" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`;
}

function inferWorksheetStyle(topic = '', explicitType = 'auto') {
  if (explicitType && explicitType !== 'auto') return explicitType;
  const t = topic.toLowerCase();
  if ((t.includes('1-10') || t.includes('1 to 10') || t.includes('1_10')) && !t.includes('ten frame') && !t.includes('ten-frame') && !t.includes('math')) {
    return 'tracing_1_to_10';
  }
  if (t.includes('alphabet') || t.includes('a-z') || t.includes('abc') || t.includes('letter')) return 'alphabet';
  if (t.includes('number') || t.includes('count') || t.includes('1-10') || t.includes('1 to 10')) return 'numbers';
  if (t.includes('add') || t.includes('math') || t.includes('sum')) return 'math_addition';
  if (t.includes('color') || t.includes('colour') || t.includes('animal')) return 'coloring';
  if (t.includes('shape') || t.includes('match')) return 'shapes_matching';
  if (t.includes('emotion') || t.includes('feel') || t.includes('social')) return 'emotions';
  if (t.includes('line') || t.includes('pre-writing') || t.includes('pencil')) return 'line_tracing';
  return 'auto';
}

function buildCoverSvg({ title, ageGroup, learningNeed, pageCount, style }) {
  const palette = {
    alphabet: { bg: '#EAF4FF', accent: '#397BB5', badge: '#FEF08A' },
    numbers: { bg: '#FFF7ED', accent: '#EA580C', badge: '#BBF7D0' },
    coloring: { bg: '#FDF2F8', accent: '#DB2777', badge: '#FEF08A' },
    math_addition: { bg: '#EEF2FF', accent: '#4F46E5', badge: '#FDE68A' },
    shapes_matching: { bg: '#ECFDF5', accent: '#059669', badge: '#FDE68A' },
    emotions: { bg: '#F5F3FF', accent: '#7C3AED', badge: '#FEF08A' },
    line_tracing: { bg: '#EAF4FF', accent: '#0284C7', badge: '#FED7AA' },
    auto: { bg: '#EAF4FF', accent: '#397BB5', badge: '#FDE047' }
  }[style] || { bg: '#EAF4FF', accent: '#397BB5', badge: '#FDE047' };

  const safeTitle = escHtml(title || 'Special Kids Activity Workbook');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="780" viewBox="0 0 600 780">
  <rect width="600" height="780" fill="${palette.bg}"/>
  <rect x="24" y="24" width="552" height="732" rx="34" fill="#FFFFFF" stroke="${palette.accent}" stroke-width="6"/>
  <rect x="44" y="44" width="512" height="692" rx="26" fill="none" stroke="${palette.accent}" stroke-width="2.5" stroke-dasharray="10 8" opacity="0.5"/>
  <rect x="130" y="64" width="340" height="44" rx="22" fill="${palette.badge}" stroke="#CA8A04" stroke-width="2.5"/>
  <text x="300" y="93" font-family="Nunito Sans, Comic Sans MS, sans-serif" font-size="19" font-weight="900" fill="#26384A" text-anchor="middle">PRINTABLE WORKBOOK • AGES ${escHtml(ageGroup)}</text>

  <text x="300" y="168" font-family="Nunito Sans, sans-serif" font-size="34" font-weight="900" fill="#1E293B" text-anchor="middle">${safeTitle.slice(0, 26)}</text>
  ${safeTitle.length > 26 ? `<text x="300" y="212" font-family="Nunito Sans, sans-serif" font-size="32" font-weight="900" fill="${palette.accent}" text-anchor="middle">${safeTitle.slice(26, 54)}</text>` : ''}

  <rect x="150" y="232" width="300" height="34" rx="17" fill="#E0F2FE"/>
  <text x="300" y="254" font-family="Nunito Sans, sans-serif" font-size="16" font-weight="800" fill="#0369A1" text-anchor="middle">${escHtml(learningNeed)} • ${pageCount} Printable Sheets</text>

  <!-- Central Cheerful Illustration -->
  <circle cx="300" cy="430" r="145" fill="${palette.bg}" stroke="${palette.accent}" stroke-width="3" stroke-dasharray="8 8"/>
  <!-- Cute Rainbow Arch -->
  <path d="M180 455 A120 120 0 0 1 420 455" fill="none" stroke="#FB7185" stroke-width="14" stroke-linecap="round"/>
  <path d="M198 455 A102 102 0 0 1 402 455" fill="none" stroke="#FBBF24" stroke-width="14" stroke-linecap="round"/>
  <path d="M216 455 A84 84 0 0 1 384 455" fill="none" stroke="#34D399" stroke-width="14" stroke-linecap="round"/>
  <path d="M234 455 A66 66 0 0 1 366 455" fill="none" stroke="#60A5FA" stroke-width="14" stroke-linecap="round"/>

  <!-- Cute ABC + 123 Blocks -->
  <rect x="176" y="458" width="70" height="70" rx="14" fill="#EF4444" stroke="#991B1B" stroke-width="3.5"/>
  <text x="211" y="506" font-family="Nunito Sans, sans-serif" font-size="38" font-weight="900" fill="#FFFFFF" text-anchor="middle">A</text>
  <rect x="265" y="446" width="70" height="70" rx="14" fill="#FACC15" stroke="#B45309" stroke-width="3.5"/>
  <text x="300" y="494" font-family="Nunito Sans, sans-serif" font-size="38" font-weight="900" fill="#1E293B" text-anchor="middle">1</text>
  <rect x="354" y="458" width="70" height="70" rx="14" fill="#3B82F6" stroke="#1E40AF" stroke-width="3.5"/>
  <text x="389" y="506" font-family="Nunito Sans, sans-serif" font-size="38" font-weight="900" fill="#FFFFFF" text-anchor="middle">B</text>

  <!-- Floating Stars & Pencil -->
  <polygon points="150,330 158,348 178,350 163,363 167,382 150,372 133,382 137,363 122,350 142,348" fill="#FACC15" stroke="#CA8A04" stroke-width="2.5"/>
  <polygon points="452,326 459,341 475,343 463,354 466,370 452,362 438,370 441,354 429,343 445,341" fill="#FACC15" stroke="#CA8A04" stroke-width="2.5"/>

  <!-- Name Box -->
  <rect x="85" y="618" width="430" height="78" rx="20" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="3"/>
  <text x="115" y="654" font-family="Nunito Sans, sans-serif" font-size="19" font-weight="800" fill="#475569">This Workbook Belongs To:</text>
  <line x1="115" y1="680" x2="485" y2="680" stroke="#94A3B8" stroke-width="2.5" stroke-dasharray="6 5"/>
</svg>`;
}

function pageFrame(pageNum, totalPages, tag, instruction, accentColor, innerHtml) {
  return `
    <div class="ws-page" style="border-color: ${accentColor};">
      <div class="ws-inner-border">
        <div class="ws-top-bar">
          <div class="ws-name-row">
            <span><strong>Name:</strong> ___________________________</span>
            <span><strong>Date:</strong> _______________</span>
          </div>
          <div class="ws-title-pill" style="background: ${accentColor}; color: #FFFFFF;">${escHtml(tag)}</div>
        </div>
        <div class="ws-instruction-box">
          <span class="ws-star-badge">★</span>
          <span>${escHtml(instruction)}</span>
        </div>
        <div class="ws-body-area">
          ${innerHtml}
        </div>
        <div class="ws-footer-bar">
          <span>Special Kids Worksheets • Printable A4 Learning Sheet</span>
          <span class="ws-reward-stars">Rate Your Effort: ☆ ☆ ☆ &nbsp;|&nbsp; Page ${pageNum} of ${totalPages}</span>
        </div>
      </div>
    </div>
  `;
}

function buildLineTracingContent(variant = 0) {
  const rows = [
    [
      { left: '🐝', right: '🌸', d: 'M 75 40 Q 130 5, 185 40 T 295 40 T 405 40 T 520 40', stroke: '#397BB5' },
      { left: '🦋', right: '🌻', d: 'M 75 40 L 145 10 L 215 70 L 285 10 L 355 70 L 425 10 L 520 40', stroke: '#EC4899' },
      { left: '🚗', right: '🏁', d: 'M 75 40 L 520 40', stroke: '#10B981' },
      { left: '🚀', right: '⭐', d: 'M 75 55 C 145 5, 195 75, 265 25 C 335 -5, 385 75, 455 25 L 520 40', stroke: '#8B5CF6' }
    ],
    [
      { left: '🐸', right: '🍀', d: 'M 75 60 A 55 45 0 0 1 185 60 A 55 45 0 0 1 295 60 A 55 45 0 0 1 405 60 A 55 45 0 0 1 520 60', stroke: '#16A34A' },
      { left: '🐶', right: '🦴', d: 'M 75 20 L 165 20 L 165 65 L 275 65 L 275 20 L 395 20 L 395 65 L 520 65', stroke: '#EA580C' },
      { left: '🚂', right: '🏠', d: 'M 75 40 Q 145 75, 215 40 T 355 40 T 520 40', stroke: '#0284C7' },
      { left: '🐟', right: '🌊', d: 'M 75 30 L 170 55 L 265 25 L 360 55 L 455 25 L 520 45', stroke: '#06B6D4' }
    ]
  ][variant % 2];

  return `<div style="display:flex; flex-direction:column; justify-content:space-between; height:100%; gap:14px;">
    ${rows.map((r, i) => `
      <div style="background:#F8FAFC; border:2px dashed #CBD5E1; border-radius:18px; padding:12px 18px; display:flex; align-items:center;">
        <svg viewBox="0 0 600 84" width="100%" height="96">
          <circle cx="36" cy="42" r="28" fill="#FEF9C3" stroke="#F59E0B" stroke-width="2.5"/>
          <text x="36" y="53" font-size="30" text-anchor="middle">${r.left}</text>
          <path d="${r.d}" fill="none" stroke="${r.stroke}" stroke-width="5" stroke-dasharray="10 10" stroke-linecap="round"/>
          <circle cx="80" cy="${i === 2 && variant % 2 === 0 ? 40 : 42}" r="6" fill="#22C55E"/>
          <circle cx="560" cy="42" r="28" fill="#E0F2FE" stroke="#0284C7" stroke-width="2.5"/>
          <text x="560" y="53" font-size="30" text-anchor="middle">${r.right}</text>
        </svg>
      </div>
    `).join('')}
  </div>`;
}

function buildAlphabetContent(idx = 0) {
  const item = ALPHABET_BANK[idx % ALPHABET_BANK.length];
  const pair = `${item.letter}${item.letter.toLowerCase()}`;
  const dottedRow = (txt) => `
    <div style="position:relative; height:96px; border-top:2px solid #94A3B8; border-bottom:2px solid #94A3B8; background:#FFFFFF; display:flex; align-items:center; justify-content:space-around; padding:0 16px;">
      <div style="position:absolute; left:0; right:0; top:50%; border-top:2px dashed #CBD5E1;"></div>
      <svg viewBox="0 0 620 84" width="100%" height="84" style="position:relative; z-index:2;">
        <text x="38" y="64" font-family="Nunito Sans, Arial Rounded MT Bold, sans-serif" font-size="68" font-weight="900" fill="${item.color}" opacity="0.9">${escHtml(txt)}</text>
        ${[160, 275, 390, 505].map(x => `
          <text x="${x}" y="64" font-family="Nunito Sans, Arial Rounded MT Bold, sans-serif" font-size="68" font-weight="900" fill="none" stroke="#64748B" stroke-width="2.2" stroke-dasharray="4 4">${escHtml(txt)}</text>
        `).join('')}
      </svg>
    </div>
  `;
  return `
    <div style="display:flex; flex-direction:column; gap:18px; height:100%; justify-content:space-between;">
      <div style="display:grid; grid-template-columns: 1.2fr 0.8fr; gap:18px; align-items:center; background:#F8FAFC; border:2px solid #E2E8F0; border-radius:20px; padding:18px 24px;">
        <div>
          <div style="font-size:15px; font-weight:800; color:#64748B; text-transform:uppercase; margin-bottom:4px;">Letter of the Page</div>
          <svg viewBox="0 0 280 120" width="100%" height="120">
            <text x="16" y="102" font-family="Nunito Sans, sans-serif" font-size="112" font-weight="900" fill="#EFF6FF" stroke="${item.color}" stroke-width="4" stroke-dasharray="8 6">${escHtml(pair)}</text>
          </svg>
        </div>
        <div style="text-align:center; background:#FFFFFF; border-radius:18px; padding:14px; border:2px solid #E2E8F0;">
          <svg viewBox="0 0 80 80" width="96" height="96">${item.iconSvg}</svg>
          <div style="font-size:24px; font-weight:900; color:${item.color}; margin-top:4px;">${escHtml(item.letter)} is for ${escHtml(item.word)}</div>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:14px;">
        <div style="font-size:15px; font-weight:800; color:#334155;">Trace the Uppercase &amp; Lowercase Letters:</div>
        ${dottedRow(item.letter)}
        ${dottedRow(item.letter.toLowerCase())}
        ${dottedRow(pair)}
      </div>
    </div>
  `;
}

const SINGLE_DOT_DIGIT_PATHS = {
  1: 'M 22 15 L 32 8 L 32 54',
  2: 'M 16 19 C 16 6, 46 6, 46 21 C 46 33, 22 43, 16 54 L 47 54',
  3: 'M 17 14 C 23 6, 45 7, 45 20 C 45 28, 36 30, 27 30 C 37 30, 47 34, 47 44 C 47 56, 22 57, 16 48',
  4: 'M 37 10 L 15 39 L 48 39 M 38 18 L 38 54',
  5: 'M 44 9 L 20 9 L 18 28 C 28 22, 46 26, 46 41 C 46 55, 22 57, 17 48',
  6: 'M 42 12 C 30 6, 16 18, 16 37 C 16 51, 25 55, 33 55 C 43 55, 48 47, 48 39 C 48 30, 39 26, 31 26 C 23 26, 18 31, 16 37',
  7: 'M 15 9 L 47 9 L 25 54',
  8: 'M 32 29 C 20 27, 18 9, 32 9 C 46 9, 44 27, 32 29 C 17 31, 15 54, 32 54 C 49 54, 47 31, 32 29',
  9: 'M 45 23 C 45 13, 37 9, 29 9 C 20 9, 16 17, 16 24 C 16 33, 23 38, 31 38 C 39 38, 44 33, 45 24 M 45 16 L 45 54',
  10: 'M 9 16 L 17 9 L 17 54 M 44 9 C 34 9, 29 19, 29 31.5 C 29 44, 34 54, 44 54 C 54 54, 58 44, 58 31.5 C 58 19, 54 9, 44 9'
};

function buildFullPage1to10TracingContent(variant = 0) {
  const num = (variant % 10) + 1;
  const digitPath = SINGLE_DOT_DIGIT_PATHS[num] || SINGLE_DOT_DIGIT_PATHS[1];
  const cols = num === 10
    ? [12, 105, 198, 291, 384, 477, 570]
    : [12, 95, 178, 261, 344, 427, 510, 593];
  const rowIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8];

  return `
    <div style="display:flex; flex-direction:column; justify-content:space-between; height:100%; gap:5px;">
      ${rowIndices.map(() => `
        <div style="flex:1; min-height:76px; display:flex; align-items:center; background:#FFFFFF;">
          <svg viewBox="0 0 680 86" width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="display:block;">
            <line x1="8" y1="73" x2="672" y2="73" stroke="#94A3B8" stroke-width="2"/>
            ${cols.map((cx) => `
              <g transform="translate(${cx}, 8) scale(1.15)">
                <path d="${digitPath}" fill="none" stroke="#475569" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0.2 7.2"/>
              </g>
            `).join('')}
          </svg>
        </div>
      `).join('')}
    </div>
  `;
}

function buildNumberContent(n = 1) {
  const num = ((n - 1) % 10) + 1;
  const word = NUMBER_WORDS[num] || String(num);
  const kind = num % 3 === 1 ? 'apple' : (num % 3 === 2 ? 'star' : 'heart');
  const iconsHtml = Array.from({ length: num }, () => cuteSmallItemSvg(kind)).join('');
  const tenCells = Array.from({ length: 10 }, (_, idx) => `
    <div style="height:46px; border:2px solid #397BB5; border-radius:8px; display:grid; place-items:center; background:${idx < num ? '#DBEAFE' : '#FFFFFF'};">
      ${idx < num ? '<div style="width:24px;height:24px;border-radius:50%;background:#397BB5;"></div>' : ''}
    </div>
  `).join('');

  return `
    <div style="display:flex; flex-direction:column; gap:16px; height:100%; justify-content:space-between;">
      <div style="display:grid; grid-template-columns: 0.75fr 1.25fr; gap:16px; align-items:center; background:#FFFBEB; border:2px solid #FDE68A; border-radius:20px; padding:16px 20px;">
        <div style="text-align:center;">
          <svg viewBox="0 0 180 120" width="160" height="110">
            <text x="90" y="102" font-family="Nunito Sans, sans-serif" font-size="112" font-weight="900" fill="#FEF3C7" stroke="#EA580C" stroke-width="4" stroke-dasharray="7 5" text-anchor="middle">${num}</text>
          </svg>
          <div style="font-size:24px; font-weight:900; color:#C2410C;">${num} — ${word}</div>
        </div>
        <div>
          <div style="font-size:15px; font-weight:800; color:#9A3412; margin-bottom:8px;">Count &amp; Point (${num}):</div>
          <div style="display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:flex-start; background:#FFFFFF; border-radius:14px; padding:12px; border:1.5px solid #FCD34D;">
            ${iconsHtml}
          </div>
        </div>
      </div>

      <div style="background:#F8FAFC; border:2px solid #E2E8F0; border-radius:16px; padding:12px 16px;">
        <div style="font-size:14px; font-weight:800; color:#1E40AF; margin-bottom:8px;">Ten-Frame Visual Helper (${num} out of 10):</div>
        <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:8px;">${tenCells}</div>
      </div>

      <div>
        <div style="font-size:15px; font-weight:800; color:#334155; margin-bottom:8px;">Trace Number ${num} Carefully:</div>
        ${[0, 1].map(() => `
          <div style="border-top:2px solid #94A3B8; border-bottom:2px solid #94A3B8; margin-bottom:10px; height:76px; background:#FFFFFF; position:relative;">
            <div style="position:absolute; left:0; right:0; top:50%; border-top:2px dashed #CBD5E1;"></div>
            <svg viewBox="0 0 620 72" width="100%" height="72" style="position:relative; z-index:2;">
              <text x="42" y="58" font-family="Nunito Sans, sans-serif" font-size="58" font-weight="900" fill="#EA580C">${num}</text>
              ${[150, 260, 370, 480, 565].map(x => `
                <text x="${x}" y="58" font-family="Nunito Sans, sans-serif" font-size="58" font-weight="900" fill="none" stroke="#64748B" stroke-width="2.2" stroke-dasharray="4 4">${num}</text>
              `).join('')}
            </svg>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function buildShapesMatchingContent(variant = 0) {
  const leftShapes = [
    { label: 'Circle', svg: '<circle cx="40" cy="40" r="26" fill="#EF4444" stroke="#991B1B" stroke-width="3"/>' },
    { label: 'Star', svg: '<polygon points="40,10 48,28 68,30 53,43 57,62 40,52 23,62 27,43 12,30 32,28" fill="#FACC15" stroke="#B45309" stroke-width="3"/>' },
    { label: 'Square', svg: '<rect x="16" y="16" width="48" height="48" rx="6" fill="#3B82F6" stroke="#1E40AF" stroke-width="3"/>' },
    { label: 'Triangle', svg: '<polygon points="40,12 68,62 12,62" fill="#22C55E" stroke="#15803D" stroke-width="3"/>' }
  ];
  const rightOrder = variant % 2 === 0 ? [2, 0, 3, 1] : [3, 1, 0, 2];

  return `
    <div style="display:grid; grid-template-columns: 1fr 160px 1fr; gap:12px; align-items:center; height:100%;">
      <div style="display:flex; flex-direction:column; gap:18px;">
        ${leftShapes.map(s => `
          <div style="background:#F8FAFC; border:2px solid #E2E8F0; border-radius:16px; padding:12px 16px; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:12px;">
              <svg viewBox="0 0 80 80" width="64" height="64">${s.svg}</svg>
              <strong style="font-size:20px; color:#1E293B;">${s.label}</strong>
            </div>
            <span style="width:16px; height:16px; border-radius:50%; background:#397BB5; display:inline-block;"></span>
          </div>
        `).join('')}
      </div>

      <div style="text-align:center; color:#64748B; font-size:15px; font-weight:800;">
        <div style="padding:14px; background:#F1F5F9; border-radius:16px; border:1.5px dashed #94A3B8;">
          ✏️<br/>Draw a line to match the same shape!
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:18px;">
        ${rightOrder.map(idx => {
          const s = leftShapes[idx];
          const outline = s.svg.replace(/fill="[^"]+"/g, 'fill="#F8FAFC"').replace(/stroke-width="3"/g, 'stroke-width="3.5" stroke-dasharray="6 5"');
          return `
            <div style="background:#FFFFFF; border:2px solid #CBD5E1; border-radius:16px; padding:12px 16px; display:flex; align-items:center; justify-content:space-between;">
              <span style="width:16px; height:16px; border-radius:50%; background:#EC4899; display:inline-block;"></span>
              <div style="display:flex; align-items:center; gap:12px;">
                <strong style="font-size:18px; color:#64748B;">${s.label}</strong>
                <svg viewBox="0 0 80 80" width="64" height="64">${outline}</svg>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function buildMathAdditionContent(variant = 0) {
  const problems = variant % 2 === 0
    ? [[2, 1], [3, 2], [4, 1], [2, 3]]
    : [[1, 3], [4, 2], [3, 3], [5, 2]];
  const kinds = ['apple', 'star', 'heart', 'apple'];

  return `
    <div style="display:flex; flex-direction:column; gap:16px; height:100%; justify-content:space-between;">
      ${problems.map(([a, b], i) => `
        <div style="display:flex; align-items:center; justify-content:space-between; background:#F8FAFC; border:2px solid #E2E8F0; border-radius:18px; padding:12px 20px;">
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; max-width:34%;">
            ${Array.from({ length: a }, () => cuteSmallItemSvg(kinds[i])).join('')}
          </div>
          <span style="font-size:34px; font-weight:900; color:#397BB5;">+</span>
          <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap; max-width:34%;">
            ${Array.from({ length: b }, () => cuteSmallItemSvg(kinds[i])).join('')}
          </div>
          <span style="font-size:34px; font-weight:900; color:#397BB5;">=</span>
          <div style="width:68px; height:64px; border:3px dashed #64748B; border-radius:14px; background:#FFFFFF;"></div>
        </div>
      `).join('')}

      <div style="background:#EFF6FF; border:2px solid #BFDBFE; border-radius:14px; padding:10px 16px;">
        <div style="font-size:13px; font-weight:800; color:#1E40AF; margin-bottom:6px;">Number Line Helper (Count Forward!):</div>
        <div style="display:flex; justify-content:space-between; font-size:20px; font-weight:900; color:#1E293B;">
          ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<span style="width:32px;height:32px;border-radius:50%;background:#FFFFFF;border:1.5px solid #93C5FD;display:grid;place-items:center;">${n}</span>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function buildColoringContent(variant = 0) {
  const drawings = [
    {
      label: 'Happy Lion',
      svg: `
        <circle cx="220" cy="210" r="145" fill="#FFFFFF" stroke="#1E293B" stroke-width="7" stroke-dasharray="16 8"/>
        <circle cx="220" cy="210" r="105" fill="#FFFFFF" stroke="#1E293B" stroke-width="6"/>
        <circle cx="145" cy="128" r="28" fill="#FFFFFF" stroke="#1E293B" stroke-width="6"/>
        <circle cx="295" cy="128" r="28" fill="#FFFFFF" stroke="#1E293B" stroke-width="6"/>
        <circle cx="182" cy="192" r="13" fill="#1E293B"/><circle cx="258" cy="192" r="13" fill="#1E293B"/>
        <circle cx="186" cy="187" r="4" fill="#FFFFFF"/><circle cx="262" cy="187" r="4" fill="#FFFFFF"/>
        <polygon points="220,218 202,240 238,240" fill="#FFFFFF" stroke="#1E293B" stroke-width="5"/>
        <path d="M188 258 Q220 286 252 258" fill="none" stroke="#1E293B" stroke-width="6" stroke-linecap="round"/>
      `
    },
    {
      label: 'Friendly Whale',
      svg: `
        <path d="M80 245 C80 140, 260 130, 325 225 C345 255, 385 230, 405 185 C425 225, 415 280, 365 290 C310 302, 275 305, 190 305 C115 305, 80 285, 80 245 Z" fill="#FFFFFF" stroke="#1E293B" stroke-width="6"/>
        <circle cx="142" cy="222" r="11" fill="#1E293B"/><circle cx="145" cy="218" r="3.5" fill="#FFFFFF"/>
        <path d="M125 260 Q165 280 205 260" fill="none" stroke="#1E293B" stroke-width="5" stroke-linecap="round"/>
        <path d="M210 145 Q195 95 160 100 M210 145 Q235 90 265 102" fill="none" stroke="#1E293B" stroke-width="5" stroke-linecap="round"/>
        <path d="M40 340 Q95 315 150 340 T260 340 T370 340 T440 340" fill="none" stroke="#1E293B" stroke-width="5" stroke-linecap="round"/>
      `
    },
    {
      label: 'Space Rocket',
      svg: `
        <path d="M220 55 C285 115, 295 235, 265 305 L175 305 C145 235, 155 115, 220 55 Z" fill="#FFFFFF" stroke="#1E293B" stroke-width="6"/>
        <polygon points="172,225 118,305 175,285" fill="#FFFFFF" stroke="#1E293B" stroke-width="6"/>
        <polygon points="268,225 322,305 265,285" fill="#FFFFFF" stroke="#1E293B" stroke-width="6"/>
        <circle cx="220" cy="172" r="36" fill="#FFFFFF" stroke="#1E293B" stroke-width="6"/>
        <path d="M192 305 Q220 390 248 305" fill="#FFFFFF" stroke="#1E293B" stroke-width="5"/>
        <polygon points="95,110 104,132 128,134 110,149 115,172 95,160 75,172 80,149 62,134 86,132" fill="#FFFFFF" stroke="#1E293B" stroke-width="4.5"/>
        <polygon points="348,95 356,115 378,117 361,131 366,152 348,141 330,152 335,131 318,117 340,115" fill="#FFFFFF" stroke="#1E293B" stroke-width="4.5"/>
      `
    }
  ];
  const d = drawings[variant % drawings.length];
  return `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:space-between; height:100%;">
      <div style="width:100%; flex:1; display:flex; align-items:center; justify-content:center; border:2px dashed #CBD5E1; border-radius:22px; background:#FFFFFF; padding:12px;">
        <svg viewBox="0 0 440 400" width="92%" height="410">${d.svg}</svg>
      </div>
      <div style="margin-top:14px; font-size:28px; font-weight:900; color:#1E293B; letter-spacing:4px; border:2px solid #E2E8F0; border-radius:14px; padding:10px 28px; background:#F8FAFC;">
        ${escHtml(d.label.toUpperCase())}
      </div>
    </div>
  `;
}

function buildEmotionsContent() {
  const faces = [
    { word: 'HAPPY', color: '#FACC15', mouth: 'M32 50 Q45 63 58 50' },
    { word: 'CALM', color: '#86EFAC', mouth: 'M34 52 Q45 57 56 52' },
    { word: 'SAD', color: '#93C5FD', mouth: 'M32 58 Q45 45 58 58' },
    { word: 'SURPRISED', color: '#F9A8D4', mouth: '<circle cx="45" cy="54" r="6" fill="#1E293B"/>', circleMouth: true }
  ];
  return `
    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:18px; height:100%;">
      ${faces.map(f => `
        <div style="background:#F8FAFC; border:2px solid #E2E8F0; border-radius:20px; padding:16px; display:flex; flex-direction:column; align-items:center; justify-content:space-between;">
          <svg viewBox="0 0 90 90" width="120" height="120">
            <circle cx="45" cy="45" r="36" fill="${f.color}" stroke="#1E293B" stroke-width="3.5"/>
            <circle cx="33" cy="37" r="4" fill="#1E293B"/>
            <circle cx="57" cy="37" r="4" fill="#1E293B"/>
            ${f.circleMouth ? f.mouth : `<path d="${f.mouth}" fill="none" stroke="#1E293B" stroke-width="4" stroke-linecap="round"/>`}
          </svg>
          <div style="font-size:26px; font-weight:900; color:#FFFFFF; -webkit-text-stroke: 1.5px #475569; letter-spacing:3px; border-bottom:2px dashed #94A3B8; padding-bottom:6px; width:100%; text-align:center;">
            ${f.word}
          </div>
          <div style="font-size:13px; color:#64748B; font-weight:700;">Trace the feeling word &amp; point!</div>
        </div>
      `).join('')}
    </div>
  `;
}

async function generateWorksheetPack({
  topic = 'Printable Kids Learning Workbook',
  worksheetType = 'auto',
  ageGroup = '4-6',
  pageCount = 10,
  learningNeed = 'General Support',
  includeCoverInPdf
} = {}) {
  const rawTopic = String(topic || 'Printable Kids Learning Workbook').trim();
  const isGenericShortcut = /^kids[-_\s]*work\s*sheet[s]?$/i.test(rawTopic);
  const cleanTopic = isGenericShortcut
    ? `Best Kids Learning & Tracing Activity Workbook (Ages ${ageGroup})`
    : rawTopic;
  const totalPages = Math.max(1, Math.min(20, Number(pageCount) || 10));
  const style = inferWorksheetStyle(cleanTopic, worksheetType);
  const putCoverInPdf = typeof includeCoverInPdf === 'boolean'
    ? includeCoverInPdf
    : style !== 'tracing_1_to_10';

  let aiSeo = null;
  if (openaiService.isConfigured() || openaiService.getGeminiApiKey()) {
    try {
      aiSeo = await openaiService.generateJSON({
        prompt: `Create parent-friendly SEO metadata (in clean simple English, no medical claims) for a printable A4 kids PDF worksheet pack titled "${cleanTopic}" for ages "${ageGroup}" (${learningNeed}, ${totalPages} pages). Return JSON: { "title": "...", "subtitle": "...", "description": "...", "highlights": ["...", "...", "...", "..."] }`,
        fallback: null
      });
    } catch (_) {
      aiSeo = null;
    }
  }

  const bookTitle = aiSeo?.title || cleanTopic;
  const bookSubtitle = aiSeo?.subtitle || `Calm, fun printable ${style.replace('_', ' ')} activities for Ages ${ageGroup}`;
  const bookDescription = aiSeo?.description || `Help children build confidence and early learning skills with ${bookTitle}. Thoughtfully designed printable A4 sheets with large clear guides, friendly illustrations, and distraction-free spacing for home and classroom practice.`;
  const highlights = Array.isArray(aiSeo?.highlights) && aiSeo.highlights.length
    ? aiSeo.highlights.slice(0, 5)
    : [
        `${totalPages} Print-Ready A4 PDF Worksheets`,
        `Ages ${ageGroup} Years Friendly Progression`,
        'Crisp Vector Lines & Ink-Friendly Layout',
        'Supports Fine Motor Control & Calm Focus'
      ];

  const coverSvg = buildCoverSvg({
    title: bookTitle,
    ageGroup,
    learningNeed,
    pageCount: totalPages,
    style
  });

  const pagesHtml = [];
  if (putCoverInPdf && totalPages > 1) {
    // Page 1: Illustrated Cover Sheet inside PDF
    pagesHtml.push(`
      <div class="ws-page" style="padding: 0; border: none; background: #FFFFFF;">
        <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding:8mm; box-sizing:border-box;">
          ${coverSvg.replace('width="600" height="780"', 'style="width:100%; height:100%; max-height:280mm; display:block;"')}
        </div>
      </div>
    `);
  }

  const startPage = pagesHtml.length ? 2 : 1;
  const mixSequence = ['line_tracing', 'alphabet', 'numbers', 'shapes_matching', 'math_addition', 'coloring', 'emotions'];
  for (let p = startPage; p <= totalPages; p++) {
    const idx = p - startPage;
    const activeKind = style === 'auto' ? mixSequence[idx % mixSequence.length] : style;
    let frame = '';
    if (activeKind === 'tracing_1_to_10') {
      const traceNum = (idx % 10) + 1;
      frame = pageFrame(p, totalPages, `Number ${traceNum} Tracing`, `Trace number ${traceNum} carefully over the single dots along every line!`, '#2563EB', buildFullPage1to10TracingContent(idx));
    } else if (activeKind === 'line_tracing') {
      frame = pageFrame(p, totalPages, 'Line Tracing', 'Follow the dotted paths slowly with your crayon or pencil!', '#397BB5', buildLineTracingContent(idx));
    } else if (activeKind === 'alphabet') {
      frame = pageFrame(p, totalPages, 'Alphabet Tracing', 'Say the letter sound aloud, color the picture, and trace each line!', '#2563EB', buildAlphabetContent(idx));
    } else if (activeKind === 'numbers') {
      frame = pageFrame(p, totalPages, 'Number Practice', 'Count each picture aloud, check the Ten-Frame, and trace carefully!', '#EA580C', buildNumberContent(idx + 1));
    } else if (activeKind === 'shapes_matching') {
      frame = pageFrame(p, totalPages, 'Shape Matching', 'Look at each colorful shape on the left and draw a line to match!', '#059669', buildShapesMatchingContent(idx));
    } else if (activeKind === 'math_addition') {
      frame = pageFrame(p, totalPages, 'Picture Addition', 'Count both picture groups and write the total inside the dashed box!', '#4F46E5', buildMathAdditionContent(idx));
    } else if (activeKind === 'coloring') {
      frame = pageFrame(p, totalPages, 'Creative Coloring', 'Use your favorite bright crayons to color inside the bold outlines!', '#DB2777', buildColoringContent(idx));
    } else {
      frame = pageFrame(p, totalPages, 'Feelings & Words', 'Look at each friendly face and trace the emotion word underneath!', '#7C3AED', buildEmotionsContent());
    }
    pagesHtml.push(frame);
  }

  const fullPrintableHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escHtml(bookTitle)}</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { margin: 0; padding: 0; background: #FFFFFF; font-family: 'Nunito Sans', 'Segoe UI', system-ui, sans-serif; color: #1E293B; }
  .ws-page {
    width: 210mm;
    height: 296.5mm;
    padding: 9mm;
    background: #FFFFFF;
    overflow: hidden;
    page-break-after: always;
    break-after: page;
  }
  .ws-page:last-child { page-break-after: auto; break-after: auto; }
  .ws-inner-border {
    width: 100%;
    height: 100%;
    border: 3px solid #397BB5;
    border-radius: 18px;
    padding: 16px 20px;
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
<body>
${pagesHtml.join('\n')}
</body>
</html>`;

  const categoryMap = {
    tracing_1_to_10: 'Numbers',
    line_tracing: 'Tracing',
    alphabet: 'Alphabets',
    numbers: 'Numbers',
    shapes_matching: 'Matching',
    math_addition: 'Numbers',
    coloring: 'Colouring',
    emotions: 'Life Skills',
    auto: 'Tracing'
  };

  return {
    title: bookTitle,
    subtitle: bookSubtitle,
    description: bookDescription,
    highlights,
    ageGroup,
    category: categoryMap[style] || 'Tracing',
    learningNeed,
    skillArea: style === 'math_addition' || style === 'shapes_matching' ? 'Cognitive Skills' : 'Fine Motor',
    pages: totalPages,
    style,
    coverSvg,
    coverDataUrl: 'data:image/svg+xml;base64,' + Buffer.from(coverSvg, 'utf8').toString('base64'),
    pagesHtml,
    fullPrintableHtml
  };
}

function exportWorkbookToPdf(fullPrintableHtml, fileSlug = 'kids_worksheet') {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
  const browser = findHeadlessBrowser();
  if (!browser) {
    throw new Error('Microsoft Edge / Chrome headless browser not found on this system to render PDF.');
  }
  const safeSlug = String(fileSlug || 'kids_worksheet').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'kids_worksheet';
  const id = Date.now() + '_' + crypto.randomBytes(2).toString('hex');
  const tmpHtml = path.join(SCRATCH_DIR, `${safeSlug}_${id}.html`);
  const outName = `${safeSlug}_${id}.pdf`;
  const outPdf = path.join(DOWNLOAD_DIR, outName);

  try {
    fs.writeFileSync(tmpHtml, fullPrintableHtml, 'utf8');
    execFileSync(
      browser,
      ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', `--print-to-pdf=${outPdf}`, `file:///${tmpHtml.replace(/\\/g, '/')}`],
      { timeout: 30000 }
    );
    const pdfBuffer = fs.readFileSync(outPdf);
    return {
      filename: outName,
      downloadUrl: `/download/${outName}`,
      pdfBase64: 'data:application/pdf;base64,' + pdfBuffer.toString('base64'),
      bytes: pdfBuffer.length
    };
  } finally {
    try { if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml); } catch (_) {}
  }
}

module.exports = {
  generateWorksheetPack,
  exportWorkbookToPdf
};
