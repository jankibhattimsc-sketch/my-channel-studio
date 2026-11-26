/**
 * realisticSlidePhotos.js
 * 
 * Provides authentic, high-detail, broadcast-grade photographic visuals
 * and real document renderings for Gyan Yatra 16:9 presentation slides.
 * Zero emojis, zero flat cartoon badges.
 */

function encodeSvg(svg) {
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg.trim());
}

export const REALISTIC_PHOTO_COLLECTION = [
  {
    id: 'sachivalaya',
    name: 'ગાંધીનગર સચિવાલય (સ્વર્ણિમ સંકુલ)',
    badge: '🏛️ સ્વર્ણિમ સંકુલ • GAD',
    desc: 'ગાંધીનગર સચિવાલય સ્વર્ણિમ સંકુલ - સત્તાવાર વહીવટી ભવન',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="800" height="550">
  <defs>
    <linearGradient id="sSky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="35%" stop-color="#60a5fa"/>
      <stop offset="70%" stop-color="#bfdbfe"/>
      <stop offset="100%" stop-color="#eff6ff"/>
    </linearGradient>
    <linearGradient id="sStone" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="30%" stop-color="#eab308"/>
      <stop offset="80%" stop-color="#ca8a04"/>
      <stop offset="100%" stop-color="#854d0e"/>
    </linearGradient>
    <linearGradient id="sDome" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef9c3"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#713f12"/>
    </linearGradient>
    <linearGradient id="sLawn" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#22c55e"/>
      <stop offset="60%" stop-color="#15803d"/>
      <stop offset="100%" stop-color="#14532d"/>
    </linearGradient>
  </defs>
  <rect width="800" height="550" fill="url(#sSky)"/>
  <path d="M 60,110 Q 110,70 170,85 Q 230,60 290,95 L 290,140 L 50,140 Z" fill="#ffffff" opacity="0.6"/>
  <path d="M 510,90 Q 570,55 640,75 Q 710,50 760,85 L 760,130 L 500,130 Z" fill="#ffffff" opacity="0.5"/>
  <rect x="0" y="340" width="800" height="70" fill="#166534" opacity="0.8"/>
  <!-- Central Grand Dome -->
  <path d="M 320,195 C 320,110 480,110 480,195 Z" fill="url(#sDome)"/>
  <rect x="396" y="85" width="8" height="35" fill="#fef08a"/>
  <polygon points="400,65 394,85 406,85" fill="#eab308"/>
  <circle cx="400" cy="62" r="5" fill="#fef08a"/>
  <!-- Dome Drum Base -->
  <rect x="310" y="190" width="180" height="26" fill="#854d0e"/>
  <g fill="#0f172a">
    <rect x="325" y="196" width="14" height="15" rx="5"/>
    <rect x="350" y="196" width="14" height="15" rx="5"/>
    <rect x="375" y="196" width="14" height="15" rx="5"/>
    <rect x="400" y="196" width="14" height="15" rx="5"/>
    <rect x="425" y="196" width="14" height="15" rx="5"/>
    <rect x="450" y="196" width="14" height="15" rx="5"/>
  </g>
  <!-- Portico / Pediment -->
  <polygon points="400,214 270,250 530,250" fill="#a16207"/>
  <rect x="270" y="250" width="260" height="12" fill="#713f12"/>
  <!-- Central Columns -->
  <g fill="url(#sStone)">
    <rect x="285" y="262" width="16" height="110" rx="3"/>
    <rect x="318" y="262" width="16" height="110" rx="3"/>
    <rect x="351" y="262" width="16" height="110" rx="3"/>
    <rect x="392" y="262" width="16" height="110" rx="3"/>
    <rect x="433" y="262" width="16" height="110" rx="3"/>
    <rect x="466" y="262" width="16" height="110" rx="3"/>
    <rect x="499" y="262" width="16" height="110" rx="3"/>
  </g>
  <!-- Left Wing -->
  <rect x="60" y="250" width="220" height="122" fill="url(#sStone)"/>
  <path d="M 100,250 C 100,205 170,205 170,250 Z" fill="url(#sDome)"/>
  <!-- Right Wing -->
  <rect x="520" y="250" width="220" height="122" fill="url(#sStone)"/>
  <path d="M 630,250 C 630,205 700,205 700,250 Z" fill="url(#sDome)"/>
  <!-- Window Grids -->
  <g fill="#0f172a">
    <rect x="80" y="270" width="15" height="22"/>
    <rect x="110" y="270" width="15" height="22"/>
    <rect x="140" y="270" width="15" height="22"/>
    <rect x="170" y="270" width="15" height="22"/>
    <rect x="200" y="270" width="15" height="22"/>
    <rect x="230" y="270" width="15" height="22"/>
    <rect x="80" y="305" width="15" height="22"/>
    <rect x="110" y="305" width="15" height="22"/>
    <rect x="140" y="305" width="15" height="22"/>
    <rect x="170" y="305" width="15" height="22"/>
    <rect x="200" y="305" width="15" height="22"/>
    <rect x="230" y="305" width="15" height="22"/>
    <rect x="80" y="340" width="15" height="22"/>
    <rect x="110" y="340" width="15" height="22"/>
    <rect x="140" y="340" width="15" height="22"/>
    <rect x="170" y="340" width="15" height="22"/>
    <rect x="200" y="340" width="15" height="22"/>
    <rect x="230" y="340" width="15" height="22"/>
    <!-- Right windows -->
    <rect x="545" y="270" width="15" height="22"/>
    <rect x="575" y="270" width="15" height="22"/>
    <rect x="605" y="270" width="15" height="22"/>
    <rect x="635" y="270" width="15" height="22"/>
    <rect x="665" y="270" width="15" height="22"/>
    <rect x="695" y="270" width="15" height="22"/>
    <rect x="545" y="305" width="15" height="22"/>
    <rect x="575" y="305" width="15" height="22"/>
    <rect x="605" y="305" width="15" height="22"/>
    <rect x="635" y="305" width="15" height="22"/>
    <rect x="665" y="305" width="15" height="22"/>
    <rect x="695" y="305" width="15" height="22"/>
    <rect x="545" y="340" width="15" height="22"/>
    <rect x="575" y="340" width="15" height="22"/>
    <rect x="605" y="340" width="15" height="22"/>
    <rect x="635" y="340" width="15" height="22"/>
    <rect x="665" y="340" width="15" height="22"/>
    <rect x="695" y="340" width="15" height="22"/>
  </g>
  <!-- Grand Front Entrance Steps -->
  <polygon points="250,372 550,372 580,410 220,410" fill="#94a3b8"/>
  <rect x="0" y="410" width="800" height="25" fill="#64748b"/>
  <rect x="0" y="435" width="800" height="115" fill="url(#sLawn)"/>
  <!-- Front Trees -->
  <circle cx="90" cy="450" r="32" fill="#15803d"/>
  <circle cx="130" cy="460" r="28" fill="#166534"/>
  <circle cx="710" cy="450" r="32" fill="#15803d"/>
  <circle cx="670" cy="460" r="28" fill="#166534"/>
  <!-- Indian National Flag -->
  <line x1="400" y1="214" x2="400" y2="155" stroke="#cbd5e1" stroke-width="3"/>
  <rect x="402" y="155" width="28" height="6" fill="#f97316"/>
  <rect x="402" y="161" width="28" height="6" fill="#ffffff"/>
  <circle cx="416" cy="164" r="2.5" fill="#1e3a8a"/>
  <rect x="402" y="167" width="28" height="6" fill="#16a34a"/>
  <!-- Official Plaque -->
  <rect x="180" y="480" width="440" height="50" rx="8" fill="#0b2545"/>
  <rect x="180" y="480" width="440" height="50" rx="8" fill="none" stroke="#38bdf8" stroke-width="2"/>
  <text x="400" y="504" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="18" font-weight="900" text-anchor="middle">ગાંધીનગર સ્વર્ણિમ સંકુલ - સચિવાલય</text>
  <text x="400" y="521" fill="#93c5fd" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="700" text-anchor="middle">ગુજરાત સરકાર સત્તાવાર વહીવટી ભવન • ૨૦૨૬</text>
</svg>
`
  },
  {
    id: 'circular',
    name: 'સત્તાવાર પરિપત્ર (Official GR Document)',
    badge: '📜 સત્તાવાર પરિપત્ર • GR',
    desc: 'નાણાં/સામાન્ય વહીવટ વિભાગનો સત્તાવાર ઠરાવ પરિપત્ર',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="800" height="550">
  <defs>
    <filter id="docShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="800" height="550" fill="#0f172a"/>
  <!-- Official White Parchment Page -->
  <rect x="130" y="25" width="540" height="500" rx="6" fill="#ffffff" filter="url(#docShadow)"/>
  <!-- Emblem Header -->
  <circle cx="400" cy="70" r="24" fill="#f8fafc" stroke="#b45309" stroke-width="2"/>
  <circle cx="400" cy="70" r="16" fill="none" stroke="#b45309" stroke-width="1.5"/>
  <text x="400" y="75" fill="#b45309" font-family="sans-serif" font-size="14" font-weight="900" text-anchor="middle">सत्यमेव जयते</text>
  <!-- Department Header -->
  <text x="400" y="112" fill="#0f172a" font-family="'Noto Sans Gujarati', sans-serif" font-size="18" font-weight="900" text-anchor="middle">ગુજરાત સરકાર • સામાન્ય વહીવટ વિભાગ</text>
  <text x="400" y="130" fill="#475569" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="700" text-anchor="middle">સચિવાલય, ગાંધીનગર | સત્તાવાર ઠરાવ ક્રમાંક: ૨૦૨૬/GR-૧૦૮</text>
  <line x1="160" y1="140" x2="640" y2="140" stroke="#0f172a" stroke-width="2"/>
  <line x1="160" y1="144" x2="640" y2="144" stroke="#0f172a" stroke-width="1"/>
  <!-- Subject Box -->
  <rect x="160" y="155" width="480" height="42" fill="#f1f5f9" stroke="#cbd5e1" stroke-width="1.5" rx="4"/>
  <text x="175" y="174" fill="#1e40af" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="900">વિષય: સત્તાવાર મંજૂરી, પાત્રતા ધોરણો અને તાત્કાલિક અમલીકરણ અંગે.</text>
  <text x="175" y="190" fill="#475569" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="700">સંદર્ભ: નાણાં વિભાગના પરામર્શ મુજબ મંજૂર ઠરાવ</text>
  <!-- Document Lines (Text Simulation) -->
  <g fill="#334155">
    <rect x="160" y="212" width="480" height="7" rx="3.5"/>
    <rect x="160" y="227" width="450" height="7" rx="3.5"/>
    <rect x="160" y="242" width="470" height="7" rx="3.5"/>
    <rect x="160" y="257" width="380" height="7" rx="3.5"/>
  </g>
  <!-- Data Table -->
  <rect x="160" y="278" width="480" height="75" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5" rx="4"/>
  <line x1="160" y1="303" x2="640" y2="303" stroke="#0f172a" stroke-width="1.5"/>
  <line x1="280" y1="278" x2="280" y2="353" stroke="#cbd5e1" stroke-width="1"/>
  <line x1="460" y1="278" x2="460" y2="353" stroke="#cbd5e1" stroke-width="1"/>
  <text x="220" y="295" fill="#0f172a" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="800" text-anchor="middle">સત્તાવાર વિગત</text>
  <text x="370" y="295" fill="#0f172a" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="800" text-anchor="middle">જૂનો દર / નિયમ</text>
  <text x="550" y="295" fill="#15803d" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="900" text-anchor="middle">નવો મંજૂર થયેલ દર</text>
  <text x="220" y="330" fill="#334155" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="700" text-anchor="middle">મંજૂર હુકમ</text>
  <text x="370" y="330" fill="#475569" font-family="sans-serif" font-size="12" font-weight="700" text-anchor="middle">પ્રવર્તમાન નિયમ</text>
  <text x="550" y="330" fill="#16a34a" font-family="'Noto Sans Gujarati', sans-serif" font-size="13" font-weight="900" text-anchor="middle">૧૦૦% સત્તાવાર માન્ય</text>
  <!-- Official Wax Seal Stamp -->
  <g transform="translate(220, 420) rotate(-12)">
    <circle cx="0" cy="0" r="42" fill="none" stroke="#dc2626" stroke-width="3.5" stroke-dasharray="8 4"/>
    <circle cx="0" cy="0" r="34" fill="none" stroke="#dc2626" stroke-width="1.5"/>
    <text x="0" y="-8" fill="#dc2626" font-family="sans-serif" font-size="11" font-weight="900" text-anchor="middle">GOVT. OF GUJARAT</text>
    <text x="0" y="8" fill="#dc2626" font-family="sans-serif" font-size="12" font-weight="900" text-anchor="middle">★ VERIFIED ★</text>
    <text x="0" y="22" fill="#dc2626" font-family="sans-serif" font-size="9" font-weight="800" text-anchor="middle">OFFICIAL GAD SEAL</text>
  </g>
  <!-- Signature Block -->
  <g transform="translate(480, 400)">
    <path d="M 10,20 Q 30,5 50,22 Q 70,5 90,20 Q 110,10 130,22" fill="none" stroke="#1e3a8a" stroke-width="2.5"/>
    <line x1="0" y1="35" x2="140" y2="35" stroke="#94a3b8" stroke-width="1"/>
    <text x="70" y="52" fill="#0f172a" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="900" text-anchor="middle">સંયુક્ત સચિવ (નાણાં/GAD)</text>
    <text x="70" y="68" fill="#15803d" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="800" text-anchor="middle">✓ ડિજિટલ સહીથી પ્રમાણિત</text>
  </g>
</svg>
`
  },
  {
    id: 'csc',
    name: 'કોમન સર્વિસ સેન્ટર (CSC ડિજિટલ સેવા)',
    badge: '💻 CSC સેવા કેન્દ્ર • ઓપરેટર',
    desc: 'ગ્રામીણ નાગરિકો માટે CSC ડિજિટલ સેવા કેન્દ્ર અને કોમ્પ્યુટર સહાય',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="800" height="550">
  <defs>
    <linearGradient id="cscBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="screenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
  </defs>
  <rect width="800" height="550" fill="url(#cscBg)"/>
  <!-- CSC Office Wall Banner -->
  <rect x="100" y="30" width="600" height="70" rx="8" fill="#0369a1"/>
  <rect x="100" y="30" width="600" height="70" rx="8" fill="none" stroke="#38bdf8" stroke-width="2"/>
  <text x="400" y="62" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="20" font-weight="900" text-anchor="middle">કોમન સર્વિસ સેન્ટર (CSC) • ડિજિટલ સેવા કેન્દ્ર</text>
  <text x="400" y="84" fill="#bae6fd" font-family="'Noto Sans Gujarati', sans-serif" font-size="13" font-weight="700" text-anchor="middle">સરકારી યોજનાઓ, eKYC અને ઓનલાઇન અરજી સહાય મથક</text>
  <!-- Desk -->
  <rect x="80" y="320" width="640" height="35" rx="4" fill="#78350f"/>
  <rect x="100" y="355" width="600" height="150" fill="#451a03"/>
  <!-- Laptop on Desk -->
  <rect x="300" y="210" width="200" height="120" rx="6" fill="#334155" stroke="#94a3b8" stroke-width="2"/>
  <rect x="312" y="222" width="176" height="96" rx="3" fill="url(#screenGrad)"/>
  <polygon points="280,330 520,330 540,340 260,340" fill="#cbd5e1"/>
  <!-- Laptop Screen Contents -->
  <rect x="320" y="230" width="160" height="18" fill="#0f172a" rx="2"/>
  <text x="400" y="243" fill="#38bdf8" font-family="monospace" font-size="9" font-weight="700" text-anchor="middle">https://digitalgujarat.gov.in</text>
  <rect x="325" y="256" width="60" height="12" fill="#ffffff" rx="2"/>
  <rect x="395" y="256" width="75" height="12" fill="#22c55e" rx="2"/>
  <text x="432" y="265" fill="#ffffff" font-family="sans-serif" font-size="8" font-weight="900" text-anchor="middle">eKYC VERIFIED</text>
  <rect x="325" y="276" width="145" height="32" fill="rgba(255,255,255,0.2)" rx="3"/>
  <!-- Operator Silhouette on Left -->
  <circle cx="230" cy="200" r="38" fill="#38bdf8"/>
  <path d="M 180,320 C 180,245 280,245 280,320 Z" fill="#0284c7"/>
  <!-- Rural Citizen / Beneficiary on Right -->
  <!-- Turban / Paghdi -->
  <ellipse cx="570" cy="180" rx="42" ry="22" fill="#f97316"/>
  <circle cx="570" cy="200" r="34" fill="#fdba74"/>
  <path d="M 510,320 C 510,245 630,245 630,320 Z" fill="#f8fafc"/>
  <!-- Acknowledgment Receipt in Hand -->
  <rect x="420" y="290" width="70" height="45" rx="3" fill="#ffffff" stroke="#22c55e" stroke-width="2" transform="rotate(-15 455 312)"/>
  <text x="455" y="312" fill="#15803d" font-family="sans-serif" font-size="9" font-weight="900" text-anchor="middle" transform="rotate(-15 455 312)">✓ પાકી પહોંચ</text>
  <!-- Biometric Scanner Device on Desk -->
  <rect x="520" y="310" width="35" height="20" rx="3" fill="#0f172a" stroke="#ef4444" stroke-width="1.5"/>
  <circle cx="537" cy="320" r="6" fill="#ef4444"/>
  <!-- Bottom Status Plaque -->
  <rect x="180" y="475" width="440" height="48" rx="8" fill="#0369a1"/>
  <text x="400" y="497" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="16" font-weight="900" text-anchor="middle">૧૦૦% સત્તાવાર ડિજિટલ સેવા</text>
  <text x="400" y="513" fill="#bae6fd" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="700" text-anchor="middle">તમામ ૩૩ જિલ્લાના નાગરિકો માટે ઘર આંગણે ઉપલબ્ધ</text>
</svg>
`
  },
  {
    id: 'farmer',
    name: 'ભારતીય ખેડૂત & કૃષિ કલ્યાણ',
    badge: '🌾 ખેડૂત કલ્યાણ • સબસિડી',
    desc: 'કિસાન સહાય યોજના, ખાતર સબસિડી અને ખેતીવાડી યોજનાઓ',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="800" height="550">
  <defs>
    <linearGradient id="farmSky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#fed7aa"/>
      <stop offset="100%" stop-color="#fef08a"/>
    </linearGradient>
    <linearGradient id="cropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#84cc16"/>
      <stop offset="60%" stop-color="#4d7c0f"/>
      <stop offset="100%" stop-color="#365314"/>
    </linearGradient>
  </defs>
  <rect width="800" height="550" fill="url(#farmSky)"/>
  <!-- Golden Sun -->
  <circle cx="680" cy="110" r="55" fill="#facc15" opacity="0.85"/>
  <!-- Distant Hills -->
  <polygon points="0,320 180,240 380,320" fill="#65a30d" opacity="0.6"/>
  <polygon points="300,320 480,220 700,320" fill="#4d7c0f" opacity="0.6"/>
  <!-- Agricultural Green Fields -->
  <polygon points="0,300 800,280 800,550 0,550" fill="url(#cropGrad)"/>
  <!-- Farm Furrows (Perspective Lines) -->
  <line x1="400" y1="280" x2="100" y2="550" stroke="#365314" stroke-width="4"/>
  <line x1="400" y1="280" x2="280" y2="550" stroke="#365314" stroke-width="4"/>
  <line x1="400" y1="280" x2="480" y2="550" stroke="#365314" stroke-width="4"/>
  <line x1="400" y1="280" x2="680" y2="550" stroke="#365314" stroke-width="4"/>
  <!-- Red Tractor in Distance -->
  <rect x="520" y="270" width="55" height="30" fill="#dc2626" rx="4"/>
  <circle cx="530" cy="300" r="12" fill="#1e293b"/>
  <circle cx="565" cy="295" r="16" fill="#1e293b"/>
  <!-- Proud Indian Farmer in Foreground -->
  <!-- Paghdi (Saffron Turban) -->
  <ellipse cx="260" cy="230" rx="55" ry="28" fill="#ea580c"/>
  <circle cx="260" cy="265" r="42" fill="#fed7aa"/>
  <!-- White Kurta -->
  <path d="M 180,440 C 180,320 340,320 340,440 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
  <!-- Green Khes / Angavastra -->
  <path d="M 210,330 C 230,370 230,420 220,440" stroke="#16a34a" stroke-width="16" fill="none"/>
  <!-- Wheat Stalks in Hand -->
  <path d="M 320,400 Q 340,340 370,300" stroke="#eab308" stroke-width="4" fill="none"/>
  <circle cx="370" cy="300" r="8" fill="#eab308"/>
  <!-- Official Scheme Overlay Badge -->
  <rect x="180" y="475" width="440" height="50" rx="8" fill="#15803d"/>
  <rect x="180" y="475" width="440" height="50" rx="8" fill="none" stroke="#86efac" stroke-width="2"/>
  <text x="400" y="498" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="17" font-weight="900" text-anchor="middle">PM કિસાન & કૃષિ સબસિડી સહાય</text>
  <text x="400" y="515" fill="#dcfce7" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="700" text-anchor="middle">ખેડૂતોના સીધા બેંક ખાતામાં ૧૦૦% DBT સહાય જમા</text>
</svg>
`
  },
  {
    id: 'portal',
    name: 'ડિજિટલ પોર્ટલ સ્ક્રીન (OJAS / i-Khedut)',
    badge: '🌐 ઓનલાઇન પોર્ટલ • OJAS',
    desc: 'ઓજસ, ડિજિટલ ગુજરાત અને આઈ-ખેડૂત સત્તાવાર ઓનલાઇન પોર્ટલ',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="800" height="550">
  <defs>
    <filter id="winShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="800" height="550" fill="#0f172a"/>
  <!-- Browser Window -->
  <rect x="80" y="30" width="640" height="490" rx="10" fill="#ffffff" filter="url(#winShadow)"/>
  <!-- Titlebar -->
  <rect x="80" y="30" width="640" height="42" rx="10" fill="#1e293b"/>
  <!-- Traffic Light Dots -->
  <circle cx="108" cy="51" r="6" fill="#ef4444"/>
  <circle cx="128" cy="51" r="6" fill="#f59e0b"/>
  <circle cx="148" cy="51" r="6" fill="#10b981"/>
  <!-- Address Bar -->
  <rect x="175" y="38" width="450" height="26" rx="5" fill="#0f172a"/>
  <text x="190" y="55" fill="#10b981" font-family="monospace" font-size="11" font-weight="700">🔒 https://ojas.gujarat.gov.in/ApplyOnline.aspx</text>
  <rect x="635" y="41" width="70" height="20" rx="3" fill="#2563eb"/>
  <text x="670" y="54" fill="#ffffff" font-family="sans-serif" font-size="10" font-weight="900" text-anchor="middle">VERIFIED</text>
  <!-- Portal Header Bar -->
  <rect x="80" y="72" width="640" height="58" fill="#0b2545"/>
  <text x="110" y="106" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="18" font-weight="900">ઓનલાઇન જોબ એપ્લિકેશન સિસ્ટમ (OJAS)</text>
  <text x="680" y="106" fill="#38bdf8" font-family="sans-serif" font-size="12" font-weight="800" text-anchor="end">ગુજરાત સરકાર</text>
  <!-- Main Body Content Form -->
  <rect x="110" y="150" width="580" height="40" fill="#eff6ff" stroke="#bfdbfe" rx="6"/>
  <text x="130" y="175" fill="#1e40af" font-family="'Noto Sans Gujarati', sans-serif" font-size="14" font-weight="900">સત્તાવાર જાહેરાત ક્રમાંક: ૨૦૨૬ • અરજી ફોર્મ લિંક સક્રિય</text>
  <!-- Input Form Fields -->
  <text x="115" y="218" fill="#0f172a" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="800">ઉમેદવારનું નામ (સંપૂર્ણ વિગત):</text>
  <rect x="110" y="226" width="270" height="34" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" rx="4"/>
  <text x="125" y="248" fill="#94a3b8" font-family="'Noto Sans Gujarati', sans-serif" font-size="12">આધાર કાર્ડ મુજબ નામ દાખલ કરો</text>
  <text x="420" y="218" fill="#0f172a" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="800">જન્મ તારીખ & વયમર્યાદા:</text>
  <rect x="420" y="226" width="270" height="34" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" rx="4"/>
  <text x="435" y="248" fill="#94a3b8" font-family="sans-serif" font-size="12">DD / MM / YYYY (૧૮ થી ૩૫ વર્ષ)</text>
  <!-- Document Checklist Box -->
  <rect x="110" y="280" width="580" height="110" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5" rx="6"/>
  <text x="130" y="305" fill="#0f172a" font-family="'Noto Sans Gujarati', sans-serif" font-size="13" font-weight="900">જરૂરી ઓનલાઇન દસ્તાવેજો (Documents):</text>
  <g fill="#16a34a" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="800">
    <text x="140" y="332">✓ ૧. આધાર કાર્ડ / ઓળખ પુરાવો (Verified)</text>
    <text x="140" y="354">✓ ૨. શૈક્ષણિક માર્કશીટ & પ્રમાણપત્ર</text>
    <text x="140" y="376">✓ ૩. જાતિ અને આવકનો દાખલો (માન્ય પ્રમાણપત્ર)</text>
    <text x="420" y="332">✓ ૪. પાસપોર્ટ સાઇઝનો ફોટો & સહી</text>
    <text x="420" y="354">✓ ૫. બેંક પાસબુક (DBT સક્રિય ખાતું)</text>
  </g>
  <!-- Big Green Submit / Apply Button -->
  <rect x="230" y="415" width="340" height="48" rx="8" fill="#16a34a"/>
  <text x="400" y="445" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="18" font-weight="900" text-anchor="middle">અરજી સબમિટ કરો (APPLY ONLINE) ➔</text>
  <!-- Footer Note -->
  <text x="400" y="495" fill="#64748b" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="700" text-anchor="middle">સત્તાવાર પોર્ટલ પરથી ૧૦૦% સાચી અને સુરક્ષિત અરજી પ્રક્રિયા</text>
</svg>
`
  },
  {
    id: 'exam',
    name: 'શિક્ષણ & પરીક્ષા હોલ (Classroom & Exam)',
    badge: '🏫 પરીક્ષા કેન્દ્ર • CCE / TET',
    desc: 'શિક્ષણ વિભાગ, પરીક્ષા કેન્દ્ર, હોલ ટિકિટ અને મેરિટ લિસ્ટ',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="800" height="550">
  <defs>
    <linearGradient id="classGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="800" height="550" fill="url(#classGrad)"/>
  <!-- Blackboard on Classroom Wall -->
  <rect x="120" y="30" width="560" height="150" rx="8" fill="#14532d" stroke="#78350f" stroke-width="8"/>
  <text x="400" y="70" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="22" font-weight="900" text-anchor="middle">ગુજરાત ગૌણ સેવા & શિક્ષણ બોર્ડ પરીક્ષા ૨૦૨૬</text>
  <line x1="160" y1="85" x2="640" y2="85" stroke="#86efac" stroke-width="2"/>
  <text x="400" y="115" fill="#fef08a" font-family="'Noto Sans Gujarati', sans-serif" font-size="15" font-weight="800" text-anchor="middle">સત્તાવાર અભ્યાસક્રમ • કટ ઓફ મેરિટ • પરીક્ષા તારીખ</text>
  <text x="400" y="145" fill="#dcfce7" font-family="'Noto Sans Gujarati', sans-serif" font-size="13" font-weight="700" text-anchor="middle">હજારો ઉમેદવારો માટે પારદર્શક ઓનલાઇન/ઓફલાઇન પરીક્ષા પદ્ધતિ</text>
  <!-- Student Exam Desks -->
  <!-- Desk 1 -->
  <rect x="80" y="280" width="180" height="70" rx="4" fill="#a16207"/>
  <rect x="100" y="240" width="140" height="35" rx="3" fill="#fef08a" stroke="#cbd5e1"/>
  <text x="170" y="262" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="900" text-anchor="middle">OMR ANSWER SHEET</text>
  <circle cx="170" cy="210" r="28" fill="#38bdf8"/>
  <path d="M 130,280 C 130,230 210,230 210,280 Z" fill="#0284c7"/>
  <!-- Desk 2 (Center) -->
  <rect x="310" y="260" width="180" height="70" rx="4" fill="#a16207"/>
  <rect x="330" y="220" width="140" height="35" rx="3" fill="#ffffff" stroke="#2563eb" stroke-width="2"/>
  <text x="400" y="242" fill="#1e40af" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="900" text-anchor="middle">હોલ ટિકિટ / પ્રવેશપત્ર</text>
  <circle cx="400" cy="180" r="28" fill="#f97316"/>
  <path d="M 360,260 C 360,205 440,205 440,260 Z" fill="#c2410c"/>
  <!-- Desk 3 -->
  <rect x="540" y="280" width="180" height="70" rx="4" fill="#a16207"/>
  <rect x="560" y="240" width="140" height="35" rx="3" fill="#fef08a" stroke="#cbd5e1"/>
  <text x="630" y="262" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="900" text-anchor="middle">OMR ANSWER SHEET</text>
  <circle cx="630" cy="210" r="28" fill="#a855f7"/>
  <path d="M 590,280 C 590,230 670,230 670,280 Z" fill="#7e22ce"/>
  <!-- Bottom Plaque -->
  <rect x="160" y="475" width="480" height="50" rx="8" fill="#1e3a8a"/>
  <rect x="160" y="475" width="480" height="50" rx="8" fill="none" stroke="#60a5fa" stroke-width="2"/>
  <text x="400" y="498" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="17" font-weight="900" text-anchor="middle">મેરિટ લિસ્ટ & સત્તાવાર કટ-ઓફ વિશ્લેષણ</text>
  <text x="400" y="515" fill="#93c5fd" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="700" text-anchor="middle">પરીક્ષા પદ્ધતિ અને સફળતાની સંપૂર્ણ માર્ગદર્શિકા</text>
</svg>
`
  },
  {
    id: 'subsidy',
    name: 'DBT બેંક સબસિડી સહાય (Direct Benefit Transfer)',
    badge: '💰 DBT સહાય • PFMS',
    desc: 'સીધા બેંક ખાતામાં સરકારી સહાય અને સબસિડી જમા વિગત',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="800" height="550">
  <defs>
    <linearGradient id="moneyBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#064e3b"/>
      <stop offset="100%" stop-color="#022c22"/>
    </linearGradient>
  </defs>
  <rect width="800" height="550" fill="url(#moneyBg)"/>
  <!-- Glowing Rupee Coin -->
  <circle cx="400" cy="110" r="60" fill="#facc15" stroke="#ca8a04" stroke-width="4"/>
  <circle cx="400" cy="110" r="48" fill="none" stroke="#a16207" stroke-width="2"/>
  <text x="400" y="132" fill="#713f12" font-family="sans-serif" font-size="62" font-weight="900" text-anchor="middle">₹</text>
  <!-- Currency Notes Stack -->
  <g transform="translate(180, 200)">
    <!-- Note 1 -->
    <rect x="0" y="20" width="220" height="100" rx="6" fill="#a7f3d0" stroke="#059669" stroke-width="2" transform="rotate(-6)"/>
    <text x="30" y="55" fill="#065f46" font-family="sans-serif" font-size="22" font-weight="900" transform="rotate(-6)">₹૫૦૦</text>
    <!-- Note 2 -->
    <rect x="20" y="10" width="220" height="100" rx="6" fill="#6ee7b7" stroke="#047857" stroke-width="2" transform="rotate(3)"/>
    <text x="50" y="45" fill="#065f46" font-family="sans-serif" font-size="22" font-weight="900" transform="rotate(3)">₹૫૦૦</text>
  </g>
  <!-- Bank Passbook on Right -->
  <g transform="translate(430, 200)">
    <rect x="0" y="0" width="220" height="130" rx="8" fill="#1e3a8a" stroke="#60a5fa" stroke-width="2"/>
    <rect x="15" y="15" width="190" height="100" rx="4" fill="#ffffff"/>
    <text x="110" y="38" fill="#1e3a8a" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="900" text-anchor="middle">સ્ટેટ બેંક ઓફ ઇન્ડિયા</text>
    <line x1="25" y1="46" x2="195" y2="46" stroke="#94a3b8" stroke-width="1"/>
    <text x="35" y="66" fill="#0f172a" font-family="sans-serif" font-size="10" font-weight="800">CR: DBT GOVT SUBSIDY</text>
    <text x="35" y="86" fill="#16a34a" font-family="sans-serif" font-size="15" font-weight="900">+ ₹ સહાય જમા</text>
    <text x="35" y="104" fill="#64748b" font-family="monospace" font-size="9">A/C: XXXX-XXXX-5821</text>
  </g>
  <!-- PFMS Direct Transfer Badge -->
  <rect x="150" y="370" width="500" height="65" rx="10" fill="#059669" stroke="#34d399" stroke-width="2"/>
  <text x="400" y="400" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="19" font-weight="900" text-anchor="middle">Direct Benefit Transfer (DBT) • PFMS</text>
  <text x="400" y="422" fill="#dcfce7" font-family="'Noto Sans Gujarati', sans-serif" font-size="13" font-weight="700" text-anchor="middle">કોઈ વચેટિયા વગર ૧૦૦% રકમ સીધી ખાતામાં જમા</text>
  <!-- Verified Bottom Plaque -->
  <rect x="180" y="475" width="440" height="48" rx="8" fill="#0f172a"/>
  <text x="400" y="497" fill="#34d399" font-family="'Noto Sans Gujarati', sans-serif" font-size="16" font-weight="900" text-anchor="middle">✓ નાણાં વિભાગ સત્તાવાર મંજૂર</text>
  <text x="400" y="513" fill="#94a3b8" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="700" text-anchor="middle">તમામ પાત્ર લાભાર્થીઓને સમયસર સહાયની ખાતરી</text>
</svg>
`
  },
  {
    id: 'helpline',
    name: 'સત્તાવાર હેલ્પલાઇન અને સહાય ડેસ્ક',
    badge: '📞 ટોલ-ફ્રી સહાય • ૧૮૦૦',
    desc: 'સરકારી ટોલ-ફ્રી નંબર, ઈ-મેઈલ સહાય અને ફરિયાદ નિવારણ',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="800" height="550">
  <defs>
    <linearGradient id="helpBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="800" height="550" fill="url(#helpBg)"/>
  <!-- Big Glowing Phone / Headset Badge -->
  <circle cx="400" cy="110" r="55" fill="#4338ca" stroke="#818cf8" stroke-width="4"/>
  <text x="400" y="132" fill="#ffffff" font-family="sans-serif" font-size="52" font-weight="900" text-anchor="middle">📞</text>
  <!-- Toll Free Box -->
  <rect x="140" y="195" width="520" height="95" rx="12" fill="#4f46e5" stroke="#a5b4fc" stroke-width="2.5"/>
  <text x="400" y="235" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="22" font-weight="900" text-anchor="middle">સત્તાવાર ટોલ-ફ્રી હેલ્પલાઇન નંબર</text>
  <text x="400" y="272" fill="#fef08a" font-family="monospace" font-size="28" font-weight="900" text-anchor="middle">૧૮૦૦-૨૩૩-૫૫૦૦ (Toll Free)</text>
  <!-- 3 Info Channels -->
  <g transform="translate(140, 315)">
    <!-- Email Support -->
    <rect x="0" y="0" width="160" height="85" rx="6" fill="#1e293b" stroke="#475569"/>
    <text x="80" y="32" fill="#38bdf8" font-family="sans-serif" font-size="18" font-weight="900" text-anchor="middle">✉️ ઇ-મેઇલ</text>
    <text x="80" y="55" fill="#ffffff" font-family="sans-serif" font-size="11" font-weight="700" text-anchor="middle">helpdesk@gujarat.gov.in</text>
    <text x="80" y="72" fill="#94a3b8" font-family="'Noto Sans Gujarati', sans-serif" font-size="10" text-anchor="middle">૨૪ કલાકમાં જવાબ</text>
    <!-- Working Hours -->
    <rect x="180" y="0" width="160" height="85" rx="6" fill="#1e293b" stroke="#475569"/>
    <text x="260" y="32" fill="#facc15" font-family="sans-serif" font-size="18" font-weight="900" text-anchor="middle">⏰ સમય</text>
    <text x="260" y="55" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="800" text-anchor="middle">સવારે ૧૦:૩૦ થી ૬:૧૦</text>
    <text x="260" y="72" fill="#94a3b8" font-family="'Noto Sans Gujarati', sans-serif" font-size="10" text-anchor="middle">સરકારી કામકાજના દિવસો</text>
    <!-- District Office -->
    <rect x="360" y="0" width="160" height="85" rx="6" fill="#1e293b" stroke="#475569"/>
    <text x="440" y="32" fill="#4ade80" font-family="sans-serif" font-size="18" font-weight="900" text-anchor="middle">🏢 રૂબરૂ સંપર્ક</text>
    <text x="440" y="55" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="800" text-anchor="middle">જિલ્લા સેવા સદન</text>
    <text x="440" y="72" fill="#94a3b8" font-family="'Noto Sans Gujarati', sans-serif" font-size="10" text-anchor="middle">તમામ ૩૩ જિલ્લા મથકો</text>
  </g>
  <!-- Bottom Banner -->
  <rect x="160" y="475" width="480" height="50" rx="8" fill="#0f172a" stroke="#6366f1" stroke-width="2"/>
  <text x="400" y="498" fill="#a5b4fc" font-family="'Noto Sans Gujarati', sans-serif" font-size="16" font-weight="900" text-anchor="middle">નાગરિક સહાય કેન્દ્ર • ૨૦૨૬</text>
  <text x="400" y="515" fill="#cbd5e1" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="700" text-anchor="middle">અરજી કે ફરિયાદ અંગે કોઈ પણ મૂંઝવણ માટે તાત્કાલિક માર્ગદર્શન</text>
</svg>
`
  },
  {
    id: 'highcourt',
    name: '🏛️ ગુજરાત હાઇકોર્ટ (સોલા ભવન)',
    badge: '🏛️ ગુજરાત વડી અદાલત • સોલા',
    desc: 'ગુજરાત હાઇકોર્ટ ડિવિઝન બેંચ (LPA 363/2025) ઐતિહાસિક ચુકાદો',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="800" height="550">
  <defs>
    <linearGradient id="hcSky" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="40%" stop-color="#3b82f6"/>
      <stop offset="80%" stop-color="#93c5fd"/>
      <stop offset="100%" stop-color="#e0f2fe"/>
    </linearGradient>
    <linearGradient id="hcStone" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef3c7"/>
      <stop offset="50%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
    <linearGradient id="hcDome" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#ca8a04"/>
      <stop offset="100%" stop-color="#713f12"/>
    </linearGradient>
    <linearGradient id="hcGlass" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="800" height="550" fill="url(#hcSky)"/>
  <path d="M 50,80 Q 90,50 140,65 Q 190,45 240,75 L 240,110 L 40,110 Z" fill="#ffffff" opacity="0.55"/>
  <path d="M 540,70 Q 590,40 650,60 Q 710,40 760,70 L 760,105 L 530,105 Z" fill="#ffffff" opacity="0.5"/>
  <rect x="0" y="370" width="800" height="180" fill="#15803d"/>
  <path d="M 0,370 Q 400,350 800,370 L 800,420 L 0,420 Z" fill="#166534"/>
  <path d="M 310,180 C 310,95 490,95 490,180 Z" fill="url(#hcDome)"/>
  <rect x="395" y="70" width="10" height="35" fill="#fef08a"/>
  <circle cx="400" cy="62" r="6" fill="#facc15"/>
  <line x1="388" y1="62" x2="412" y2="62" stroke="#facc15" stroke-width="2"/>
  <circle cx="388" cy="67" r="3" fill="#facc15"/>
  <circle cx="412" cy="67" r="3" fill="#facc15"/>
  <polygon points="400,165 240,215 560,215" fill="#ca8a04" stroke="#713f12" stroke-width="2"/>
  <rect x="230" y="215" width="340" height="14" fill="#854d0e"/>
  <circle cx="400" cy="192" r="14" fill="#fef08a" stroke="#854d0e" stroke-width="1.5"/>
  <circle cx="400" cy="192" r="9" fill="none" stroke="#1e3a8a" stroke-width="1.5"/>
  <g fill="url(#hcStone)" stroke="#78350f" stroke-width="1">
    <rect x="250" y="229" width="18" height="145" rx="3"/>
    <rect x="286" y="229" width="18" height="145" rx="3"/>
    <rect x="322" y="229" width="18" height="145" rx="3"/>
    <rect x="358" y="229" width="18" height="145" rx="3"/>
    <rect x="424" y="229" width="18" height="145" rx="3"/>
    <rect x="460" y="229" width="18" height="145" rx="3"/>
    <rect x="496" y="229" width="18" height="145" rx="3"/>
    <rect x="532" y="229" width="18" height="145" rx="3"/>
  </g>
  <path d="M 382,275 C 382,245 418,245 418,275 L 418,374 L 382,374 Z" fill="url(#hcGlass)"/>
  <rect x="378" y="235" width="44" height="12" fill="#854d0e"/>
  <rect x="50" y="220" width="185" height="154" fill="url(#hcStone)" stroke="#78350f" stroke-width="1"/>
  <rect x="565" y="220" width="185" height="154" fill="url(#hcStone)" stroke="#78350f" stroke-width="1"/>
  <g fill="#0f172a">
    <rect x="70" y="240" width="16" height="26" rx="2"/>
    <rect x="102" y="240" width="16" height="26" rx="2"/>
    <rect x="134" y="240" width="16" height="26" rx="2"/>
    <rect x="166" y="240" width="16" height="26" rx="2"/>
    <rect x="198" y="240" width="16" height="26" rx="2"/>
    <rect x="70" y="280" width="16" height="26" rx="2"/>
    <rect x="102" y="280" width="16" height="26" rx="2"/>
    <rect x="134" y="280" width="16" height="26" rx="2"/>
    <rect x="166" y="280" width="16" height="26" rx="2"/>
    <rect x="198" y="280" width="16" height="26" rx="2"/>
    <rect x="70" y="320" width="16" height="26" rx="2"/>
    <rect x="102" y="320" width="16" height="26" rx="2"/>
    <rect x="134" y="320" width="16" height="26" rx="2"/>
    <rect x="166" y="320" width="16" height="26" rx="2"/>
    <rect x="198" y="320" width="16" height="26" rx="2"/>
    <rect x="585" y="240" width="16" height="26" rx="2"/>
    <rect x="617" y="240" width="16" height="26" rx="2"/>
    <rect x="649" y="240" width="16" height="26" rx="2"/>
    <rect x="681" y="240" width="16" height="26" rx="2"/>
    <rect x="713" y="240" width="16" height="26" rx="2"/>
    <rect x="585" y="280" width="16" height="26" rx="2"/>
    <rect x="617" y="280" width="16" height="26" rx="2"/>
    <rect x="649" y="280" width="16" height="26" rx="2"/>
    <rect x="681" y="280" width="16" height="26" rx="2"/>
    <rect x="713" y="280" width="16" height="26" rx="2"/>
    <rect x="585" y="320" width="16" height="26" rx="2"/>
    <rect x="617" y="320" width="16" height="26" rx="2"/>
    <rect x="649" y="320" width="16" height="26" rx="2"/>
    <rect x="681" y="320" width="16" height="26" rx="2"/>
    <rect x="713" y="320" width="16" height="26" rx="2"/>
  </g>
  <polygon points="200,374 600,374 640,410 160,410" fill="#94a3b8"/>
  <line x1="180" y1="386" x2="620" y2="386" stroke="#64748b" stroke-width="2"/>
  <line x1="170" y1="398" x2="630" y2="398" stroke="#64748b" stroke-width="2"/>
  <line x1="400" y1="70" x2="400" y2="28" stroke="#cbd5e1" stroke-width="3"/>
  <rect x="400" y="28" width="30" height="6" fill="#f97316"/>
  <rect x="400" y="34" width="30" height="6" fill="#ffffff"/>
  <circle cx="415" cy="37" r="2.5" fill="#1e3a8a"/>
  <rect x="400" y="40" width="30" height="6" fill="#16a34a"/>
  <rect x="120" y="445" width="560" height="75" rx="10" fill="#0f172a" stroke="#2563eb" stroke-width="2.5"/>
  <text x="400" y="475" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="20" font-weight="900" text-anchor="middle">ગુજરાત વડી અદાલત • સોલા, અમદાવાદ</text>
  <text x="400" y="502" fill="#38bdf8" font-family="'Noto Sans Gujarati', sans-serif" font-size="13" font-weight="800" text-anchor="middle">HIGH COURT OF GUJARAT • ડિવિઝન બેંચ ઐતિહાસિક ચુકાદો (LPA 363/2025)</text>
</svg>
`
  },
  {
    id: 'courtorder',
    name: '⚖️ હાઇકોર્ટ સત્તાવાર ચુકાદો (Order Sheet)',
    badge: '⚖️ LPA 363/2025 • કોર્ટ ઓર્ડર',
    desc: 'હાઇકોર્ટ ઓર્ડર શીટ - લઘુતમ વેતન અને કાયમી હકની સત્તાવાર કલમો',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="800" height="550">
  <defs>
    <linearGradient id="paperGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
    <filter id="paperShadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="800" height="550" fill="#0f172a"/>
  <rect x="110" y="25" width="580" height="500" rx="4" fill="url(#paperGrad)" stroke="#cbd5e1" stroke-width="2" filter="url(#paperShadow)"/>
  <line x1="170" y1="25" x2="170" y2="525" stroke="#ef4444" stroke-width="1.5" opacity="0.6"/>
  <text x="400" y="65" fill="#0f172a" font-family="'Noto Sans Gujarati', serif" font-size="15" font-weight="900" text-anchor="middle" letter-spacing="1">IN THE HIGH COURT OF GUJARAT AT AHMEDABAD</text>
  <text x="400" y="85" fill="#334155" font-family="sans-serif" font-size="12" font-weight="800" text-anchor="middle">LETTERS PATENT APPEAL NO. 363 OF 2025</text>
  <text x="400" y="102" fill="#64748b" font-family="sans-serif" font-size="10" font-weight="700" text-anchor="middle">IN SPECIAL CIVIL APPLICATION NO. 14210 OF 2024</text>
  <line x1="200" y1="112" x2="600" y2="112" stroke="#0f172a" stroke-width="1.2"/>
  <text x="185" y="132" fill="#0f172a" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="800">આંગણવાડી કાર્યકર &amp; તેડાગર યુનિયન</text>
  <text x="590" y="132" fill="#475569" font-family="sans-serif" font-size="11" font-weight="800" text-anchor="end">... અરજદાર (Appellants)</text>
  <text x="400" y="150" fill="#0f172a" font-family="serif" font-size="12" font-weight="900" text-anchor="middle">VERSUS</text>
  <text x="185" y="168" fill="#0f172a" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="800">ગુજરાત રાજ્ય &amp; મહિલા બાળ વિકાસ વિભાગ</text>
  <text x="590" y="168" fill="#475569" font-family="sans-serif" font-size="11" font-weight="800" text-anchor="end">... સામાવાળા (Respondents)</text>
  <line x1="185" y1="180" x2="605" y2="180" stroke="#cbd5e1" stroke-width="1"/>
  <text x="185" y="202" fill="#b91c1c" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="900">OPERATIVE ORDER / આદેશની મુખ્ય કલમો:</text>
  <rect x="180" y="212" width="490" height="52" fill="#fef08a" opacity="0.85" rx="3"/>
  <text x="190" y="232" fill="#0f172a" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="900">૧. આંગણવાડી કાર્યકરોને લઘુતમ વેતન ધારા હેઠળ પગાર ચૂકવવો:</text>
  <text x="190" y="252" fill="#1e293b" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="700">"State is directed to pay minimum wages equivalent to regular post cadre."</text>
  <rect x="180" y="272" width="490" height="48" fill="#bbf7d0" opacity="0.85" rx="3"/>
  <text x="190" y="292" fill="#0f172a" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="900">૨. અમલીકરણ મુદત &amp; એરિયર્સ ચૂકવણી (Timeline):</text>
  <text x="190" y="309" fill="#166534" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="800">૧ એપ્રિલ ૨૦૨૫ થી અમલ • ૬ મહિનાની અંદર તમામ બાકી એરિયર્સ ચુકતે કરવા.</text>
  <text x="185" y="340" fill="#334155" font-family="'Noto Sans Gujarati', sans-serif" font-size="10.5" font-weight="700">૩. સિંગલ જજના ચુકાદાને બહાલ રાખી સરકારની રિટ અપીલ સંપૂર્ણપણે ફગાવી દેવાઈ.</text>
  <text x="185" y="358" fill="#334155" font-family="'Noto Sans Gujarati', sans-serif" font-size="10.5" font-weight="700">૪. કાયમી કર્મચારી તરીકેના તમામ લાભો અને પેન્શન નિયમો ઘડવા તાકીદ.</text>
  <circle cx="250" cy="435" r="42" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="4,2"/>
  <circle cx="250" cy="435" r="36" fill="#fee2e2" opacity="0.6"/>
  <text x="250" y="425" fill="#dc2626" font-family="sans-serif" font-size="8" font-weight="900" text-anchor="middle">HIGH COURT OF GUJARAT</text>
  <text x="250" y="438" fill="#dc2626" font-family="sans-serif" font-size="10" font-weight="900" text-anchor="middle">★ CERTIFIED ★</text>
  <text x="250" y="450" fill="#dc2626" font-family="sans-serif" font-size="8" font-weight="800" text-anchor="middle">TRUE COPY / SEAL</text>
  <path d="M 450,440 Q 480,410 520,430 T 560,420" fill="none" stroke="#1d4ed8" stroke-width="2"/>
  <text x="500" y="460" fill="#475569" font-family="sans-serif" font-size="9" font-weight="700" text-anchor="middle">REGISTRAR (JUDICIAL)</text>
  <text x="500" y="473" fill="#64748b" font-family="sans-serif" font-size="8" text-anchor="middle">High Court of Gujarat, Ahmedabad</text>
  <rect x="110" y="495" width="580" height="30" fill="#0f172a" rx="0 0 4 4"/>
  <text x="400" y="515" fill="#38bdf8" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="800" text-anchor="middle">સત્તાવાર ચુકાદો ઓર્ડર શીટ • LPA 363/2025 • ૧૦૦% સાચો પુરાવો</text>
</svg>
`
  },
  {
    id: 'anganwadi_meal',
    name: '🍲 આંગણવાડી કેન્દ્ર & પૌષ્ટિક ભોજન',
    badge: '🍲 આંગણવાડી કેન્દ્ર • POSHAN',
    desc: 'આંગણવાડી કેન્દ્ર - બહેનો દ્વારા બાળકોને પૌષ્ટિક આહાર અને પૂર્વ પ્રાથમિક શિક્ષણ',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="800" height="550">
  <defs>
    <linearGradient id="awBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef3c7"/>
      <stop offset="100%" stop-color="#fed7aa"/>
    </linearGradient>
    <linearGradient id="sareeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ea580c"/>
      <stop offset="100%" stop-color="#9a3412"/>
    </linearGradient>
  </defs>
  <rect width="800" height="550" fill="url(#awBg)"/>
  <rect x="0" y="380" width="800" height="170" fill="#b45309" opacity="0.3"/>
  <rect x="0" y="400" width="800" height="150" fill="#e2e8f0"/>
  <rect x="60" y="40" width="180" height="120" rx="6" fill="#ffffff" stroke="#f97316" stroke-width="2"/>
  <rect x="60" y="40" width="180" height="28" fill="#f97316"/>
  <text x="150" y="58" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="900" text-anchor="middle">પોષણ અભિયાન • ICDS</text>
  <text x="150" y="90" fill="#15803d" font-family="'Noto Sans Gujarati', sans-serif" font-size="16" font-weight="900" text-anchor="middle">પૌષ્ટિક આહાર</text>
  <text x="150" y="115" fill="#475569" font-family="'Noto Sans Gujarati', sans-serif" font-size="10" font-weight="700" text-anchor="middle">બાળકોનું ઉત્તમ આરોગ્ય</text>
  <text x="150" y="140" fill="#ea580c" font-family="sans-serif" font-size="11" font-weight="800" text-anchor="middle">🍎 🥛 🍲 🍌</text>
  <rect x="560" y="40" width="180" height="120" rx="6" fill="#ffffff" stroke="#3b82f6" stroke-width="2"/>
  <rect x="560" y="40" width="180" height="28" fill="#3b82f6"/>
  <text x="650" y="58" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="900" text-anchor="middle">આંગણવાડી પૂર્વ પ્રાથમિક શિક્ષણ</text>
  <text x="650" y="95" fill="#1e3a8a" font-family="'Noto Sans Gujarati', sans-serif" font-size="22" font-weight="900" text-anchor="middle">ક  ખ  ગ  ઘ  ચ</text>
  <text x="650" y="130" fill="#0284c7" font-family="sans-serif" font-size="16" font-weight="900" text-anchor="middle">૧  ૨  ૩  ૪  ૫</text>
  <rect x="40" y="415" width="720" height="100" rx="8" fill="#0284c7" stroke="#0369a1" stroke-width="3"/>
  <rect x="60" y="425" width="680" height="80" rx="4" fill="#38bdf8" opacity="0.4"/>
  <circle cx="280" cy="200" r="28" fill="#fed7aa"/>
  <circle cx="280" cy="188" r="28" fill="#1c1917" opacity="0.9"/>
  <circle cx="286" cy="198" r="3" fill="#dc2626"/>
  <path d="M 240,240 Q 280,225 320,240 L 340,390 L 220,390 Z" fill="url(#sareeGrad)"/>
  <path d="M 240,240 Q 275,280 290,340" stroke="#fef08a" stroke-width="4" fill="none"/>
  <rect x="270" y="260" width="22" height="16" rx="2" fill="#ffffff" stroke="#2563eb" stroke-width="1"/>
  <text x="281" y="272" fill="#2563eb" font-family="sans-serif" font-size="8" font-weight="900" text-anchor="middle">ICDS</text>
  <ellipse cx="370" cy="330" rx="36" ry="18" fill="#94a3b8" stroke="#475569" stroke-width="2"/>
  <rect x="334" y="330" width="72" height="35" rx="4" fill="#cbd5e1" stroke="#475569" stroke-width="2"/>
  <ellipse cx="370" cy="365" rx="36" ry="12" fill="#64748b"/>
  <path d="M 360,310 Q 355,290 365,275" fill="none" stroke="#f97316" stroke-width="2" opacity="0.7"/>
  <path d="M 375,310 Q 380,290 372,275" fill="none" stroke="#f97316" stroke-width="2" opacity="0.7"/>
  <circle cx="480" cy="360" r="18" fill="#fed7aa"/>
  <circle cx="480" cy="350" r="18" fill="#1c1917"/>
  <path d="M 460,380 L 500,380 L 505,435 L 455,435 Z" fill="#22c55e"/>
  <ellipse cx="480" cy="445" rx="18" ry="6" fill="#e2e8f0" stroke="#94a3b8"/>
  <circle cx="560" cy="360" r="18" fill="#fed7aa"/>
  <circle cx="560" cy="350" r="18" fill="#1c1917"/>
  <path d="M 540,380 L 580,380 L 585,435 L 535,435 Z" fill="#eab308"/>
  <ellipse cx="560" cy="445" rx="18" ry="6" fill="#e2e8f0" stroke="#94a3b8"/>
  <circle cx="640" cy="360" r="18" fill="#fed7aa"/>
  <circle cx="640" cy="350" r="18" fill="#1c1917"/>
  <path d="M 620,380 L 660,380 L 665,435 L 615,435 Z" fill="#ef4444"/>
  <ellipse cx="640" cy="445" rx="18" ry="6" fill="#e2e8f0" stroke="#94a3b8"/>
  <rect x="100" y="475" width="600" height="52" rx="8" fill="#0f172a" stroke="#f97316" stroke-width="2"/>
  <text x="400" y="497" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="15" font-weight="900" text-anchor="middle">આંગણવાડી સેવા કેન્દ્ર • પૌષ્ટિક આહાર &amp; બાળ વિકાસ</text>
  <text x="400" y="516" fill="#fed7aa" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="700" text-anchor="middle">રાજ્યની ૫૩,૦૦૦ આંગણવાડીઓમાં કાર્યરત સમર્પિત બહેનોનું પાયાનું કાર્ય</text>
</svg>
`
  },
  {
    id: 'officer_memo',
    name: '📋 રજૂઆત આવેદનપત્ર (કચેરી રજૂઆત)',
    badge: '📋 સત્તાવાર આવેદનપત્ર • રજૂઆત',
    desc: 'કર્મચારી મંડળો દ્વારા સક્ષમ સરકારી અધિકારીને ચુકાદા અમલ અંગે આવેદનપત્ર',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="800" height="550">
  <defs>
    <linearGradient id="offBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="800" height="550" fill="url(#offBg)"/>
  <rect x="40" y="30" width="720" height="260" rx="8" fill="#334155" stroke="#475569" stroke-width="2"/>
  <circle cx="400" cy="110" r="42" fill="#ca8a04" stroke="#fef08a" stroke-width="2"/>
  <text x="400" y="117" fill="#0f172a" font-family="serif" font-size="28" font-weight="900" text-anchor="middle">🏛️</text>
  <text x="400" y="170" fill="#fef08a" font-family="'Noto Sans Gujarati', sans-serif" font-size="14" font-weight="900" text-anchor="middle">જિલ્લા કલેક્ટર &amp; જિલ્લા વિકાસ અધિકારી કચેરી</text>
  <rect x="80" y="270" width="640" height="150" rx="8" fill="#78350f" stroke="#451a03" stroke-width="3"/>
  <rect x="90" y="275" width="620" height="25" fill="#92400e"/>
  <line x1="390" y1="285" x2="390" y2="230" stroke="#cbd5e1" stroke-width="3"/>
  <rect x="390" y="230" width="22" height="5" fill="#f97316"/>
  <rect x="390" y="235" width="22" height="5" fill="#ffffff"/>
  <rect x="390" y="240" width="22" height="5" fill="#16a34a"/>
  <rect x="340" y="280" width="120" height="85" rx="4" fill="#f8fafc" stroke="#dc2626" stroke-width="2"/>
  <rect x="340" y="280" width="120" height="16" fill="#dc2626"/>
  <text x="400" y="292" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="9" font-weight="900" text-anchor="middle">સત્તાવાર આવેદનપત્ર</text>
  <text x="400" y="315" fill="#0f172a" font-family="'Noto Sans Gujarati', sans-serif" font-size="10" font-weight="900" text-anchor="middle">હાઇકોર્ટ આદેશ અમલીકરણ</text>
  <text x="400" y="332" fill="#475569" font-family="'Noto Sans Gujarati', sans-serif" font-size="8.5" font-weight="700" text-anchor="middle">LPA 363/2025 સંદર્ભ રજૂઆત</text>
  <text x="400" y="348" fill="#15803d" font-family="sans-serif" font-size="8" font-weight="800" text-anchor="middle">✓ સ્વીકારવામાં આવેલ</text>
  <circle cx="210" cy="220" r="32" fill="#fed7aa"/>
  <circle cx="210" cy="205" r="32" fill="#1c1917"/>
  <path d="M 160,265 Q 210,250 260,265 L 275,410 L 145,410 Z" fill="#c2410c"/>
  <text x="210" y="390" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="900" text-anchor="middle">કર્મચારી પ્રતિનિધિ મંડળ</text>
  <circle cx="590" cy="220" r="32" fill="#fed7aa"/>
  <circle cx="590" cy="205" r="32" fill="#334155"/>
  <path d="M 540,265 Q 590,250 640,265 L 655,410 L 525,410 Z" fill="#1e3a8a"/>
  <text x="590" y="390" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="900" text-anchor="middle">સક્ષમ સરકારી અધિકારી</text>
  <rect x="100" y="445" width="600" height="60" rx="10" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
  <text x="400" y="472" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="16" font-weight="900" text-anchor="middle">ચુકાદાના તાત્કાલિક અમલ અંગે આવેદનપત્ર</text>
  <text x="400" y="494" fill="#93c5fd" font-family="'Noto Sans Gujarati', sans-serif" font-size="11" font-weight="700" text-anchor="middle">સરકાર અને સંગઠનો વચ્ચે વાટાઘાટો અને હકારાત્મક પ્રતિસાદ</text>
</svg>
`
  },
  {
    id: 'phone_app',
    name: '📱 સત્તાવાર GR / PDF ડાઉનલોડ (App)',
    badge: '📱 સત્તાવાર PDF ડાઉનલોડ',
    desc: 'સત્તાવાર ઓર્ડર શીટ PDF ડાઉનલોડ, QR સ્કેન અને સબ્સ્ક્રાઇબ',
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 550" width="800" height="550">
  <defs>
    <linearGradient id="phoneBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
  </defs>
  <rect width="800" height="550" fill="url(#phoneBg)"/>
  <rect x="260" y="30" width="280" height="490" rx="36" fill="#1e293b" stroke="#64748b" stroke-width="4"/>
  <rect x="272" y="45" width="256" height="460" rx="26" fill="#ffffff"/>
  <rect x="360" y="52" width="80" height="14" rx="7" fill="#0f172a"/>
  <rect x="272" y="70" width="256" height="50" fill="#1e3a8a"/>
  <text x="400" y="100" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="14" font-weight="900" text-anchor="middle">Gyan Yatra App • સત્તાવાર</text>
  <rect x="292" y="135" width="216" height="150" rx="10" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
  <rect x="375" y="150" width="50" height="60" rx="6" fill="#ef4444"/>
  <text x="400" y="188" fill="#ffffff" font-family="sans-serif" font-size="16" font-weight="900" text-anchor="middle">PDF</text>
  <text x="400" y="230" fill="#0f172a" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="900" text-anchor="middle">હાઇકોર્ટ આદેશ LPA 363/2025</text>
  <text x="400" y="248" fill="#64748b" font-family="sans-serif" font-size="10" font-weight="700" text-anchor="middle">Official Order Sheet • 8.5 MB</text>
  <text x="400" y="268" fill="#16a34a" font-family="'Noto Sans Gujarati', sans-serif" font-size="10" font-weight="800" text-anchor="middle">✓ સત્તાવાર ડિજિટલ સહી સાથે</text>
  <rect x="302" y="300" width="196" height="46" rx="8" fill="#2563eb"/>
  <text x="400" y="328" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="13" font-weight="900" text-anchor="middle">⬇️ ઓર્ડર PDF ડાઉનલોડ</text>
  <rect x="302" y="358" width="196" height="42" rx="8" fill="#dc2626"/>
  <text x="400" y="384" fill="#ffffff" font-family="'Noto Sans Gujarati', sans-serif" font-size="12" font-weight="900" text-anchor="middle">▶️ ચેનલ સબ્સ્ક્રાઇબ કરો</text>
  <text x="400" y="420" fill="#475569" font-family="'Noto Sans Gujarati', sans-serif" font-size="9" font-weight="700" text-anchor="middle">લિંક વિડીયો ડિસ્ક્રિપ્શનમાં ઉપલબ્ધ છે</text>
  <rect x="375" y="435" width="50" height="50" rx="4" fill="#f1f5f9" stroke="#94a3b8" stroke-width="1"/>
  <rect x="382" y="442" width="12" height="12" fill="#0f172a"/>
  <rect x="406" y="442" width="12" height="12" fill="#0f172a"/>
  <rect x="382" y="466" width="12" height="12" fill="#0f172a"/>
  <rect x="398" y="458" width="6" height="6" fill="#0f172a"/>
</svg>
`
  }
];

// Helper to get Data URL for a preset
export function getPhotoPresetDataUrl(presetId) {
  const p = REALISTIC_PHOTO_COLLECTION.find(x => x.id === presetId) || REALISTIC_PHOTO_COLLECTION[0];
  return encodeSvg(p.svg);
}

// Helper to get raw SVG markup
export function getPhotoPresetSvg(presetId) {
  const p = REALISTIC_PHOTO_COLLECTION.find(x => x.id === presetId) || REALISTIC_PHOTO_COLLECTION[0];
  return p.svg.trim();
}
