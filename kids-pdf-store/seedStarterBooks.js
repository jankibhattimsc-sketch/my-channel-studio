const fs = require('fs');
const path = require('path');
const storeDb = require('./storeDb');

const BASE_DIR = __dirname;
const BOOKS_DIR = path.join(BASE_DIR, 'uploads', 'books');
const COVERS_DIR = path.join(BASE_DIR, 'uploads', 'covers');

function escapePdfText(txt) {
  return String(txt || '').replace(/[^\x20-\x7E]/g, ' ').replace(/([\\()])/g, '\\$1');
}

function createSampleKidsPdf(filePath, { heading, subheading, pagesText }) {
  const objects = [];
  const pageCount = pagesText.length;
  const fontObjNum = 3 + pageCount * 2;

  // 1: Catalog, 2: Pages
  objects.push(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);
  const kidsRefs = [];
  for (let i = 0; i < pageCount; i++) {
    kidsRefs.push(`${3 + i * 2} 0 R`);
  }
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kidsRefs.join(' ')}] /Count ${pageCount} >>\nendobj\n`);

  for (let i = 0; i < pageCount; i++) {
    const pageObjNum = 3 + i * 2;
    const contentObjNum = pageObjNum + 1;
    const pageLines = pagesText[i] || [];

    const streamLines = [
      'q',
      '0.98 0.96 0.90 rg 0 0 595 842 re f',
      '0.22 0.74 0.97 rg 30 740 535 72 re f',
      '1 1 1 rg BT /F1 20 Tf 48 775 Td (' + escapePdfText(heading) + ') Tj ET',
      '0.95 0.97 1 rg BT /F1 11 Tf 48 754 Td (' + escapePdfText(subheading + '  |  Page ' + (i + 1) + ' of ' + pageCount) + ') Tj ET',
      '0.10 0.14 0.24 rg'
    ];

    let y = 690;
    for (const line of pageLines) {
      streamLines.push(`BT /F1 14 Tf 48 ${y} Td (${escapePdfText(line)}) Tj ET`);
      y -= 32;
    }
    streamLines.push('0.96 0.62 0.04 rg 48 110 499 4 re f');
    streamLines.push(`0.35 0.40 0.50 rg BT /F1 10 Tf 48 82 Td (Printable Kids Activity Edition - LittleStars Kids PDF Store) Tj ET`);
    streamLines.push('Q');

    const streamStr = streamLines.join('\n');
    objects.push(`${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /Contents ${contentObjNum} 0 R >>\nendobj\n`);
    objects.push(`${contentObjNum} 0 obj\n<< /Length ${Buffer.byteLength(streamStr, 'utf8')} >>\nstream\n${streamStr}\nendstream\nendobj\n`);
  }

  objects.push(`${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    pdf += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  fs.writeFileSync(filePath, pdf, 'utf8');
}

function createCoverSvg(filePath, { bg1, bg2, emoji, badge, titleLine1, titleLine2, ageLabel }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="680" viewBox="0 0 520 680">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>
  </defs>
  <rect width="520" height="680" rx="34" fill="url(#g)"/>
  <circle cx="445" cy="95" r="78" fill="rgba(255,255,255,0.18)"/>
  <circle cx="80" cy="595" r="110" fill="rgba(255,255,255,0.14)"/>
  <rect x="34" y="34" width="210" height="44" rx="22" fill="rgba(255,255,255,0.92)"/>
  <text x="139" y="63" font-family="Segoe UI, Arial, sans-serif" font-size="20" font-weight="800" fill="#0f172a" text-anchor="middle">${badge}</text>
  <circle cx="260" cy="240" r="108" fill="rgba(255,255,255,0.92)"/>
  <text x="260" y="275" font-size="112" text-anchor="middle">${emoji}</text>
  <text x="260" y="425" font-family="Segoe UI, Arial, sans-serif" font-size="34" font-weight="900" fill="#ffffff" text-anchor="middle">${titleLine1}</text>
  <text x="260" y="472" font-family="Segoe UI, Arial, sans-serif" font-size="28" font-weight="700" fill="#fef08a" text-anchor="middle">${titleLine2}</text>
  <rect x="120" y="535" width="280" height="54" rx="27" fill="#0f172a" fill-opacity="0.72"/>
  <text x="260" y="570" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">${ageLabel}</text>
  <text x="260" y="642" font-family="Segoe UI, Arial, sans-serif" font-size="16" font-weight="700" fill="rgba(255,255,255,0.9)" text-anchor="middle">PRINTABLE HIGH-RES KIDS PDF E-BOOK</text>
</svg>`;
  fs.writeFileSync(filePath, svg, 'utf8');
}

function seedIfEmpty() {
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
  fs.mkdirSync(COVERS_DIR, { recursive: true });

  const existing = storeDb.getAllBooksAdmin();
  if (existing.length > 0) return;

  const starters = [
    {
      file: 'abc_coloring_workbook.pdf',
      cover: 'cover_abc.svg',
      coverOpts: {
        bg1: '#ec4899', bg2: '#f97316', emoji: '🎨',
        badge: 'BESTSELLER ★', titleLine1: 'A to Z Coloring',
        titleLine2: '& Tracing Fun Book', ageLabel: 'Age 3 to 6 Years'
      },
      pdfOpts: {
        heading: 'Super Kids A to Z Alphabet & Coloring Book',
        subheading: 'Ages 3-6 Printable Workbook',
        pagesText: [
          ['Welcome Little Artist!', 'Letter A - A is for Apple & Aeroplane', 'Trace:  A   A   A   A   a   a   a   a', 'Activity: Color the big smiling Apple red!'],
          ['Letter B - B is for Ball & Butterfly', 'Trace:  B   B   B   B   b   b   b   b', 'Activity: Count 3 colorful balloons and draw circles.'],
          ['Letter C - C is for Cat & Car', 'Trace:  C   C   C   C   c   c   c   c', 'Activity: Match the cute Cat to its milk bowl!']
        ]
      },
      book: {
        title: 'A થી Z ફન કલરિંગ & ટ્રેસિંગ બુક (30+ Pages)',
        subtitle: 'બાળકો માટે મોટા અક્ષરો, ડોટ-ટુ-ડોટ અને મજેદાર ચિત્રો',
        ageGroup: '2-5',
        category: 'રંગપૂરણી 🎨',
        pages: 32,
        mrp: 199,
        price: 49,
        description: '૩ થી ૬ વર્ષના નાના બાળકો ઘરે બેઠા રમતાં-રમતાં A થી Z અક્ષરો લખતા અને રંગ પૂરતા શીખે તે માટે ખાસ પ્રિન્ટેબલ PDF બુક.',
        highlights: ['A4 સાઇઝમાં પ્રિન્ટ કરવા માટે તૈયાર HD PDF', 'મોટા અને સરળ ચિત્રો જેથી બાળકો આરામથી રંગ પૂરી શકે', 'એકવાર ખરીદો અને ગમે તેટલી વાર પ્રિન્ટ કાઢો'],
        featured: true
      }
    },
    {
      file: 'gujarati_kakko_barakhadi.pdf',
      cover: 'cover_kakko.svg',
      coverOpts: {
        bg1: '#0ea5e9', bg2: '#6366f1', emoji: '✍️',
        badge: 'GUJARATI SPECIAL', titleLine1: 'Gujarati Kakko',
        titleLine2: '& Barakhadi Practice', ageLabel: 'Age 3 to 7 Years'
      },
      pdfOpts: {
        heading: 'Gujarati Kakko & Barakhadi Activity Book',
        subheading: 'Ages 3-7 Early Learning',
        pagesText: [
          ['Lesson 1: Ka - Kamal (Lotus) & Kha - Khataro', 'Practice tracing strokes carefully inside dotted boxes.', 'Reward Stars:  [ * ]  [ * ]  [ * ]'],
          ['Lesson 2: Ga - Ganpati & Gha - Ghar', 'Draw a cute house and trace Ga-Gha 10 times.']
        ]
      },
      book: {
        title: 'ગુજરાતી કક્કો, બારાખડી & ચિત્ર અભ્યાસ બુક',
        subtitle: 'ક થી જ્ઞ સુધી સુંદર ચિત્રો અને લખવાની પ્રેક્ટિસ વર્કશીટ્સ',
        ageGroup: '4-6',
        category: 'કક્કો / ગુજરાતી ✍️',
        pages: 38,
        mrp: 249,
        price: 79,
        description: 'ગુજરાતી મૂળાક્ષરો, સ્વર, વ્યંજન અને સરળ શબ્દો શીખવા માટે રંગીન અને આકર્ષક Kids PDF બુક.',
        highlights: ['ક થી જ્ઞ સુધી દરેક અક્ષર માટે અલગ પ્રેક્ટિસ પેજ', 'માતા-પિતા ઘરે બાળકોને સરળતાથી ભણાવી શકે', 'મોબાઇલ/ટેબલેટ પર પણ સીધું જોઈ શકાય'],
        featured: true
      }
    },
    {
      file: 'kids_math_brain_games.pdf',
      cover: 'cover_math.svg',
      coverOpts: {
        bg1: '#10b981', bg2: '#0d9488', emoji: '🔢',
        badge: 'BRAIN BOOSTER', titleLine1: 'Fun Math 1-100',
        titleLine2: 'Counting & Puzzles', ageLabel: 'Age 5 to 9 Years'
      },
      pdfOpts: {
        heading: 'Fun Math Counting, Addition & Brain Puzzles',
        subheading: 'Ages 5-9 Activity Workbook',
        pagesText: [
          ['Chapter 1: Number Counting 1 to 20', 'Count the stars and circle the right answer.', '2 + 3 = ___   |   4 + 1 = ___   |   5 + 2 = ___'],
          ['Chapter 2: Spot the Pattern & Maze Challenge', 'Help Bunny reach the carrot through numbers 1 -> 20!']
        ]
      },
      book: {
        title: 'ફન મેથ્સ 1–100 ગણતરી, સરવાળા & બ્રેઈન પઝલ્સ',
        subtitle: 'મોબાઇલની લત છોડાવતી મજેદાર ગણિત અને તર્કશક્તિ ગેમ્સ',
        ageGroup: '6-8',
        category: 'ગણિત 🔢',
        pages: 44,
        mrp: 299,
        price: 99,
        description: '૫ થી ૯ વર્ષના બાળકોની ગણતરી, સરવાળા-બાદબાકી, મેઝ ગેમ્સ અને બ્રેઈન પાવર વધારતી પ્રિન્ટેબલ વર્કબુક.',
        highlights: ['બાળકોનો સ્ક્રીન ટાઇમ ઘટાડવા માટે ઉત્તમ', 'રમતો, પઝલ્સ અને કલર કોડિંગ ગણિત', 'જવાબો (Answer Key) સાથે સંપૂર્ણ PDF'],
        featured: false
      }
    }
  ];

  for (const item of starters) {
    const pdfFull = path.join(BOOKS_DIR, item.file);
    const coverFull = path.join(COVERS_DIR, item.cover);
    createSampleKidsPdf(pdfFull, item.pdfOpts);
    createCoverSvg(coverFull, item.coverOpts);
    storeDb.addBook({
      ...item.book,
      pdfFile: item.file,
      samplePdfFile: item.file,
      coverUrl: `/uploads/covers/${item.cover}`,
      published: true
    });
  }
}

module.exports = { seedIfEmpty };
