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
      '0.01 0.52 0.78 rg 30 740 535 72 re f',
      '1 1 1 rg BT /F1 19 Tf 48 776 Td (' + escapePdfText(heading) + ') Tj ET',
      '0.92 0.96 1 rg BT /F1 11 Tf 48 754 Td (' + escapePdfText(subheading + '  |  Page ' + (i + 1) + ' of ' + pageCount) + ') Tj ET',
      '0.10 0.14 0.24 rg'
    ];

    let y = 690;
    for (const line of pageLines) {
      streamLines.push(`BT /F1 14 Tf 48 ${y} Td (${escapePdfText(line)}) Tj ET`);
      y -= 34;
    }
    streamLines.push('0.96 0.62 0.04 rg 48 110 499 4 re f');
    streamLines.push(`0.35 0.40 0.50 rg BT /F1 10 Tf 48 82 Td (Printable High-Res A4 Kids Edition - LittleStars Kids PDF Store) Tj ET`);
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
  <rect x="34" y="34" width="215" height="44" rx="22" fill="rgba(255,255,255,0.94)"/>
  <text x="141" y="63" font-family="Segoe UI, Arial, sans-serif" font-size="19" font-weight="800" fill="#0f172a" text-anchor="middle">${badge}</text>
  <circle cx="260" cy="240" r="108" fill="rgba(255,255,255,0.92)"/>
  <text x="260" y="275" font-size="112" text-anchor="middle">${emoji}</text>
  <text x="260" y="425" font-family="Segoe UI, Arial, sans-serif" font-size="33" font-weight="900" fill="#ffffff" text-anchor="middle">${titleLine1}</text>
  <text x="260" y="472" font-family="Segoe UI, Arial, sans-serif" font-size="26" font-weight="700" fill="#fef08a" text-anchor="middle">${titleLine2}</text>
  <rect x="120" y="535" width="280" height="54" rx="27" fill="#0f172a" fill-opacity="0.72"/>
  <text x="260" y="570" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="800" fill="#ffffff" text-anchor="middle">${ageLabel}</text>
  <text x="260" y="642" font-family="Segoe UI, Arial, sans-serif" font-size="15" font-weight="700" fill="rgba(255,255,255,0.9)" text-anchor="middle">PRINTABLE HIGH-RES KIDS PDF E-BOOK</text>
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
        titleLine2: '& Tracing Fun Book', ageLabel: 'Ages 2 to 5 Years'
      },
      pdfOpts: {
        heading: 'Super Kids A to Z Alphabet & Coloring Book',
        subheading: 'Ages 2-5 Printable Activity Workbook',
        pagesText: [
          ['Welcome Little Artist!', 'Letter A - A is for Apple & Aeroplane', 'Trace:  A   A   A   A   a   a   a   a', 'Activity: Color the big smiling Apple bright red!'],
          ['Letter B - B is for Ball & Butterfly', 'Trace:  B   B   B   B   b   b   b   b', 'Activity: Count 3 colorful balloons and draw circles.'],
          ['Letter C - C is for Cat & Car', 'Trace:  C   C   C   C   c   c   c   c', 'Activity: Match the cute Cat to its milk bowl!']
        ]
      },
      book: {
        title: 'Super Kids A–Z Alphabet Coloring & Tracing Workbook',
        subtitle: 'Bold letters, dot-to-dot puzzles & big friendly illustrations for little hands',
        ageGroup: '2-5',
        category: 'Coloring 🎨',
        pages: 32,
        mrp: 199,
        price: 49,
        description: 'Designed by early-childhood educators to build pencil grip, letter recognition, and creativity away from phone screens. Ready to print at home on standard A4 paper.',
        highlights: ['Crisp A4 Print-Ready PDF Format', 'Large Friendly Illustrations Easy to Color', 'Unlimited Lifetime Personal Prints'],
        featured: true
      }
    },
    {
      file: 'phonics_reading_explorer.pdf',
      cover: 'cover_phonics.svg',
      coverOpts: {
        bg1: '#0ea5e9', bg2: '#6366f1', emoji: '📖',
        badge: 'PARENT FAVORITE', titleLine1: 'Phonics & Early',
        titleLine2: 'Reading Explorer', ageLabel: 'Ages 4 to 6 Years'
      },
      pdfOpts: {
        heading: 'Phonics, Sight Words & Early Reading Activity Pack',
        subheading: 'Ages 4-6 Early Literacy Edition',
        pagesText: [
          ['Lesson 1: Short Vowel A (-at, -an, -ap)', 'Read aloud:  CAT   HAT   MAT   BAT   SAT', 'Circle the picture that rhymes with CAT!'],
          ['Lesson 2: Sight Word Builders', 'Trace & Read:  THE   AND   YOU   LOOK   PLAY']
        ]
      },
      book: {
        title: 'Phonics, Sight Words & Early Reading Activity Pack',
        subtitle: 'Step-by-step sound blending, rhyming games & sentence builders',
        ageGroup: '4-6',
        category: 'Phonics & Reading 📖',
        pages: 38,
        mrp: 249,
        price: 79,
        description: 'Help young learners decode words effortlessly with engaging sound families, cut-and-match word cards, and joyful reading comprehension sheets.',
        highlights: ['CVC Word Families & 50+ Essential Sight Words', 'Interactive Matching & Cut-Out Flashcards', 'Works Great on Tablets or Printed Sheets'],
        featured: true
      }
    },
    {
      file: 'kids_math_brain_games.pdf',
      cover: 'cover_math.svg',
      coverOpts: {
        bg1: '#10b981', bg2: '#0d9488', emoji: '🔢',
        badge: 'BRAIN BOOSTER', titleLine1: 'Fun Math 1-100',
        titleLine2: 'Logic & Brain Mazes', ageLabel: 'Ages 6 to 8 Years'
      },
      pdfOpts: {
        heading: 'Fun Math Counting, Logic & Brain Boosters Workbook',
        subheading: 'Ages 6-8 Problem Solving Pack',
        pagesText: [
          ['Chapter 1: Mental Math Warmup', 'Solve:  12 + 7 = ___   |   25 - 9 = ___   |   8 x 2 = ___', 'Color the even numbers blue and odd numbers gold!'],
          ['Chapter 2: Logic Path & Pattern Puzzle', 'Help Bunny reach the golden carrot following multiples of 3!']
        ]
      },
      book: {
        title: 'Fun Math 1–100, Logic Mazes & Brain Boosters Pack',
        subtitle: 'Turn math into a screen-free adventure with number mazes & brain teasers',
        ageGroup: '6-8',
        category: 'Math & Logic 🔢',
        pages: 44,
        mrp: 299,
        price: 99,
        description: 'Zero boring drills! Packed with visual addition challenges, skip-counting mazes, spot-the-pattern puzzles, and complete Answer Key pages for parents.',
        highlights: ['Replaces Screen Time With Playful Logic Puzzles', 'Visual Addition, Subtraction & Pattern Mastery', 'Includes Complete Parent Answer Key'],
        featured: true
      }
    },
    {
      file: 'junior_stem_space_quiz.pdf',
      cover: 'cover_stem.svg',
      coverOpts: {
        bg1: '#7c3aed', bg2: '#db2777', emoji: '🚀',
        badge: 'NEW RELEASE', titleLine1: 'Space & Science',
        titleLine2: 'Junior Explorer Pack', ageLabel: 'Ages 8 to 12 Years'
      },
      pdfOpts: {
        heading: 'Space, Planets & Junior Science Discovery Workbook',
        subheading: 'Ages 8-12 Curious Minds Edition',
        pagesText: [
          ['Mission 1: Our Solar System Tour', 'Name all 8 planets in order from the Sun!', 'Fun Fact: One day on Venus is longer than a year on Venus.'],
          ['Mission 2: Kitchen Science Experiments', '3 Safe & Exciting Weekend Home Projects with Steps!']
        ]
      },
      book: {
        title: 'Space, Planets & Junior Science Discovery Workbook',
        subtitle: 'Solar system quests, cool science facts & DIY weekend challenges',
        ageGroup: '8-12',
        category: 'Science & GK 🚀',
        pages: 48,
        mrp: 349,
        price: 119,
        description: 'Spark curiosity in growing minds with cosmic trivia, crossword missions, printable planet posters, and safe weekend home science projects.',
        highlights: ['30+ Space & Science Brain Missions', 'DIY Safe Home Science Experiment Guides', 'Printable Bonus Planet Achievement Certificates'],
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
