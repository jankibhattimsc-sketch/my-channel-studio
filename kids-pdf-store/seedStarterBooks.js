const fs = require('fs');
const path = require('path');
const storeDb = require('./storeDb');

const BASE_DIR = __dirname;
const BOOKS_DIR = path.join(BASE_DIR, 'uploads', 'books');
const COVERS_DIR = path.join(BASE_DIR, 'uploads', 'covers');

function escapePdfText(txt) {
  return String(txt || '').replace(/[^\x20-\x7E]/g, ' ').replace(/([\\()])/g, '\\$1');
}

function createPrintableWorksheetPdf(filePath, { heading, subheading, pagesText }) {
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
      '1.0 1.0 1.0 rg 0 0 595 842 re f',
      '0.92 0.96 1.00 rg 32 732 531 78 re f',
      '0.22 0.48 0.71 rg 32 732 531 4 re f',
      '0.15 0.22 0.29 rg BT /F1 19 Tf 48 776 Td (' + escapePdfText(heading) + ') Tj ET',
      '0.40 0.47 0.54 rg BT /F1 11 Tf 48 752 Td (' + escapePdfText(subheading + '  |  Page ' + (i + 1) + ' of ' + pageCount) + ') Tj ET',
      '0.15 0.22 0.29 rg'
    ];

    let y = 678;
    for (const line of pageLines) {
      streamLines.push(`BT /F1 14 Tf 48 ${y} Td (${escapePdfText(line)}) Tj ET`);
      streamLines.push(`0.84 0.88 0.93 rg 48 ${y - 14} 499 1 re f`);
      streamLines.push('0.15 0.22 0.29 rg');
      y -= 58;
    }

    streamLines.push('0.40 0.47 0.54 rg BT /F1 10 Tf 48 52 Td (Special Kids Worksheets - Printable A4 Educational Resource | www.specialkidsworksheets.in) Tj ET');
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

function writeWorksheetThumbnailSvg(filePath, svgBody) {
  const full = `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="320" viewBox="0 0 460 320">
  <rect width="460" height="320" fill="#F8FAFC"/>
  <rect x="24" y="14" width="412" height="292" rx="14" fill="#FFFFFF" stroke="#DCE5F0" stroke-width="2"/>
  ${svgBody}
</svg>`;
  fs.writeFileSync(filePath, full, 'utf8');
}

function seedIfEmpty() {
  fs.mkdirSync(BOOKS_DIR, { recursive: true });
  fs.mkdirSync(COVERS_DIR, { recursive: true });

  const existing = storeDb.getAllBooksAdmin();
  if (existing.length > 0) return;

  const starters = [
    {
      file: 'line_tracing_practice.pdf',
      cover: 'thumb_line_tracing.svg',
      svg: `
        <path d="M58 74 C98 44, 138 104, 178 74 C218 44, 258 104, 340 74" fill="none" stroke="#475569" stroke-width="4" stroke-dasharray="7 7" stroke-linecap="round"/>
        <text x="382" y="84" font-size="36" text-anchor="middle">🐝</text>
        <text x="72" y="162" font-size="34" text-anchor="middle">🦋</text>
        <polyline points="116,154 166,128 216,178 266,128 316,178 390,154" fill="none" stroke="#475569" stroke-width="4" stroke-dasharray="7 7" stroke-linecap="round"/>
        <text x="72" y="248" font-size="34" text-anchor="middle">🚗</text>
        <line x1="118" y1="242" x2="360" y2="242" stroke="#475569" stroke-width="4" stroke-dasharray="8 8" stroke-linecap="round"/>
        <text x="394" y="250" font-size="32" text-anchor="middle">🏁</text>
      `,
      pdfOpts: {
        heading: 'Line Tracing Practice',
        subheading: 'Ages 4 - 6 Years | Fine Motor Skill | Autism Support',
        pagesText: [
          ['Page 1: Curved Wave Line Tracing (Bee to Flower)', 'Trace along the smooth dashed hills from left to right.'],
          ['Page 2: Zig-Zag Mountain Tracing (Butterfly Path)', 'Follow the up-and-down peaks carefully without rushing.'],
          ['Page 3: Straight Line Control (Red Car Track)', 'Drive along the straight dotted path with steady pencil pressure.']
        ]
      },
      book: {
        title: 'Line Tracing Practice',
        subtitle: 'Autism Support',
        learningGoal: 'Pencil control, tracing, hand-eye coordination',
        ageGroup: '4-6',
        category: 'Tracing',
        learningNeed: 'Autism Support',
        skillArea: 'Fine Motor',
        pages: 10,
        price: 0,
        description: 'Clear, spacious line tracing worksheets featuring bees, butterflies, and cars to build pencil control step by step.',
        highlights: ['10 Pages (PDF)', 'Printable (A4)', 'Pencil control & hand-eye coordination'],
        featured: true
      }
    },
    {
      file: 'match_same_fruits.pdf',
      cover: 'thumb_match_fruits.svg',
      svg: `
        <text x="95" y="108" font-size="44" text-anchor="middle">🍎</text>
        <text x="230" y="108" font-size="44" text-anchor="middle">🍌</text>
        <text x="365" y="108" font-size="44" text-anchor="middle">🍇</text>
        <line x1="95" y1="128" x2="230" y2="222" stroke="#397BB5" stroke-width="3" stroke-dasharray="6 6"/>
        <line x1="230" y1="128" x2="365" y2="222" stroke="#25805B" stroke-width="3" stroke-dasharray="6 6"/>
        <line x1="365" y1="128" x2="95" y2="222" stroke="#D97706" stroke-width="3" stroke-dasharray="6 6"/>
        <text x="95" y="256" font-size="42" text-anchor="middle">🍇</text>
        <text x="230" y="256" font-size="42" text-anchor="middle">🍎</text>
        <text x="365" y="256" font-size="42" text-anchor="middle">🍌</text>
      `,
      pdfOpts: {
        heading: 'Match the Same (Fruits)',
        subheading: 'Ages 4 - 6 Years | Cognitive Skills | Autism Support',
        pagesText: [
          ['Draw a line connecting each fruit on the top row to the matching fruit below.', 'Apple -> Apple  |  Banana -> Banana  |  Grapes -> Grapes'],
          ['Bonus Task: Name the color of each fruit aloud together!']
        ]
      },
      book: {
        title: 'Match the Same (Fruits)',
        subtitle: 'Cognitive Skills',
        learningGoal: 'Visual matching & object recognition',
        ageGroup: '4-6',
        category: 'Matching',
        learningNeed: 'Autism Support',
        skillArea: 'Cognitive Skills',
        pages: 8,
        price: 0,
        description: 'Bright, recognizable fruit matching sheets designed for calm cognitive sorting and visual focus.',
        highlights: ['8 Pages (PDF)', 'Printable (A4)', 'Visual matching practice'],
        featured: true
      }
    },
    {
      file: 'shapes_recognition.pdf',
      cover: 'thumb_shapes_recognition.svg',
      svg: `
        <polygon points="230,36 244,72 282,72 252,94 263,130 230,108 197,130 208,94 178,72 216,72" fill="#FACC15" stroke="#CA8A04" stroke-width="3"/>
        <polygon points="150,154 104,234 196,234" fill="#38BDF8" stroke="#0284C7" stroke-width="3"/>
        <rect x="268" y="156" width="76" height="76" rx="8" fill="#FB923C" stroke="#C2410C" stroke-width="3"/>
        <circle cx="152" cy="272" r="24" fill="#F472B6" stroke="#BE185D" stroke-width="3"/>
        <polygon points="310,250 286,294 334,294" fill="#4ADE80" stroke="#15803D" stroke-width="3"/>
      `,
      pdfOpts: {
        heading: 'Shapes Recognition',
        subheading: 'Ages 3 - 5 Years | Early Learning | ADHD Activities',
        pagesText: [
          ['Identify Star, Triangle, Square, and Circle on each printable card.', 'Trace around the outside borders and say each shape name.'],
          ['Color all Triangles light blue and Squares soft orange!']
        ]
      },
      book: {
        title: 'Shapes Recognition',
        subtitle: 'Early Learning',
        learningGoal: 'Shape naming, sorting & early focus',
        ageGroup: '3-5',
        category: 'Matching',
        learningNeed: 'ADHD Activities',
        skillArea: 'Focus',
        pages: 10,
        price: 0,
        description: 'Friendly primary shapes arranged with generous white space for early recognition without overwhelm.',
        highlights: ['10 Pages (PDF)', 'Printable (A4)', 'Early learning foundations'],
        featured: true
      }
    },
    {
      file: 'alphabet_tracing_az.pdf',
      cover: 'thumb_alphabet_tracing.svg',
      svg: `
        <text x="128" y="176" font-family="sans-serif" font-size="140" font-weight="800" fill="#FFFFFF" stroke="#334155" stroke-width="4" stroke-dasharray="9 7" text-anchor="middle">A</text>
        <circle cx="128" cy="118" r="14" fill="none" stroke="#94A3B8" stroke-width="2" stroke-dasharray="4 4"/>
        <text x="328" y="168" font-size="96" text-anchor="middle">🍎</text>
        <line x1="64" y1="234" x2="396" y2="234" stroke="#CBD5E1" stroke-width="2"/>
        <line x1="64" y1="262" x2="396" y2="262" stroke="#94A3B8" stroke-width="2" stroke-dasharray="6 6"/>
        <line x1="64" y1="288" x2="396" y2="288" stroke="#CBD5E1" stroke-width="2"/>
        <text x="230" y="278" font-family="sans-serif" font-size="30" font-weight="700" fill="#94A3B8" text-anchor="middle">A   a   A   a   A   a</text>
      `,
      pdfOpts: {
        heading: 'Alphabet Tracing (A to Z)',
        subheading: 'Ages 4 - 6 Years | Learning Disability | Letter Practice',
        pagesText: [
          ['Letter A - Apple: Trace the large dotted A then follow the lined row.', 'A   A   A   |   a   a   a'],
          ['Letter B - Ball: Follow the numbered arrow strokes gently.', 'B   B   B   |   b   b   b']
        ]
      },
      book: {
        title: 'Alphabet Tracing (A to Z)',
        subtitle: 'Letter Formation',
        learningGoal: 'Alphabet recognition & guided tracing',
        ageGroup: '4-6',
        category: 'Tracing',
        learningNeed: 'Learning Disability',
        skillArea: 'Motor',
        pages: 26,
        price: 0,
        description: 'Complete A to Z printable workbook with large clear letter outlines and picture anchors.',
        highlights: ['26 Pages (PDF)', 'Printable (A4)', 'Full A–Z uppercase & lowercase'],
        featured: true
      }
    },
    {
      file: 'numbers_tracing_1_10.pdf',
      cover: 'thumb_numbers_tracing.svg',
      svg: `
        <text x="148" y="198" font-family="sans-serif" font-size="148" font-weight="800" fill="#FFFFFF" stroke="#334155" stroke-width="4" stroke-dasharray="9 7" text-anchor="middle">1</text>
        <text x="316" y="182" font-size="92" text-anchor="middle">🐞</text>
        <rect x="64" y="232" width="332" height="52" rx="10" fill="#F1F5F9"/>
        <text x="230" y="268" font-family="sans-serif" font-size="28" font-weight="700" fill="#64748B" text-anchor="middle">1  •  2  •  3  •  4  •  5  •  6</text>
      `,
      pdfOpts: {
        heading: 'Numbers Tracing (1 to 10)',
        subheading: 'Ages 4 - 6 Years | Number Recognition & Counting',
        pagesText: [
          ['Number 1: Trace the tall number 1 and count the 1 friendly ladybug.', 'Number 2: Trace 2 and count 2 stars.'],
          ['Numbers 1 to 10 dotted practice rows.']
        ]
      },
      book: {
        title: 'Numbers Tracing (1 to 10)',
        subtitle: 'Number Recognition',
        learningGoal: 'Counting 1–10 & number tracing',
        ageGroup: '4-6',
        category: 'Numbers',
        learningNeed: 'Autism Support',
        skillArea: 'Focus',
        pages: 10,
        price: 0,
        description: 'Countable visual bugs and objects paired with clean dotted numerals from 1 to 10.',
        highlights: ['10 Pages (PDF)', 'Printable (A4)', '1-to-1 counting support'],
        featured: true
      }
    },
    {
      file: 'colouring_fun_animals.pdf',
      cover: 'thumb_colouring_animals.svg',
      svg: `
        <circle cx="230" cy="154" r="66" fill="#FFFFFF" stroke="#334155" stroke-width="3.5"/>
        <circle cx="230" cy="154" r="46" fill="#FFFFFF" stroke="#334155" stroke-width="3"/>
        <circle cx="212" cy="146" r="5" fill="#334155"/>
        <circle cx="248" cy="146" r="5" fill="#334155"/>
        <path d="M216 168 Q230 180 244 168" fill="none" stroke="#334155" stroke-width="3" stroke-linecap="round"/>
        <text x="86" y="102" font-size="40" text-anchor="middle">☀️</text>
        <text x="366" y="246" font-size="40" text-anchor="middle">🌼</text>
        <text x="230" y="274" font-family="sans-serif" font-size="16" font-weight="700" fill="#687789" text-anchor="middle">Calm Outline Lion Coloring Sheet</text>
      `,
      pdfOpts: {
        heading: 'Colouring Fun (Animals)',
        subheading: 'Ages 3 - 6 Years | Fine Motor & Creativity',
        pagesText: [
          ['Page 1: Friendly Lion & Sunshine — Use soft yellow, orange, and green crayons!', 'Stay comfortably inside bold easy outlines.'],
          ['Page 2: Happy Elephant & Butterfly Garden coloring page.']
        ]
      },
      book: {
        title: 'Colouring Fun (Animals)',
        subtitle: 'Fine Motor & Calm Focus',
        learningGoal: 'Coloring inside wide bold animal outlines',
        ageGroup: '3-6',
        category: 'Colouring',
        learningNeed: 'Fine Motor Skills',
        skillArea: 'Motor',
        pages: 12,
        price: 0,
        description: 'Thick black-and-white friendly animal outlines designed for effortless home printing and joyful coloring.',
        highlights: ['12 Pages (PDF)', 'Printable (A4)', 'Ink-friendly white background'],
        featured: true
      }
    },
    {
      file: 'emotion_matching_sel.pdf',
      cover: 'thumb_emotion_matching.svg',
      svg: `
        <rect x="52" y="42" width="166" height="98" rx="14" fill="#FFF2C9"/>
        <text x="135" y="96" font-size="42" text-anchor="middle">😊</text>
        <text x="135" y="124" font-family="sans-serif" font-size="15" font-weight="700" fill="#26384A" text-anchor="middle">Happy</text>
        <rect x="242" y="42" width="166" height="98" rx="14" fill="#EAF4FF"/>
        <text x="325" y="96" font-size="42" text-anchor="middle">😌</text>
        <text x="325" y="124" font-family="sans-serif" font-size="15" font-weight="700" fill="#26384A" text-anchor="middle">Calm</text>
        <rect x="52" y="164" width="166" height="98" rx="14" fill="#FFE9E4"/>
        <text x="135" y="218" font-size="42" text-anchor="middle">😢</text>
        <text x="135" y="246" font-family="sans-serif" font-size="15" font-weight="700" fill="#26384A" text-anchor="middle">Sad</text>
        <rect x="242" y="164" width="166" height="98" rx="14" fill="#F2EAFE"/>
        <text x="325" y="218" font-size="42" text-anchor="middle">😮</text>
        <text x="325" y="246" font-family="sans-serif" font-size="15" font-weight="700" fill="#26384A" text-anchor="middle">Surprised</text>
      `,
      pdfOpts: {
        heading: 'Emotion Matching',
        subheading: 'Ages 4 - 8 Years | Emotional & Social Skills',
        pagesText: [
          ['Match each expressive face (Happy, Calm, Sad, Surprised) with everyday situations.'],
          ['Parent Guide: Ask your child to point to how they feel right now.']
        ]
      },
      book: {
        title: 'Emotion Matching',
        subtitle: 'Social & Emotional Skills',
        learningGoal: 'Recognizing feelings & social communication',
        ageGroup: '4-8',
        category: 'Life Skills',
        learningNeed: 'Emotional & Social Skills',
        skillArea: 'Communication',
        pages: 10,
        price: 0,
        description: 'Supportive visual cards helping children recognize and talk about Happy, Calm, Sad, and Surprised emotions.',
        highlights: ['10 Pages (PDF)', 'Printable (A4)', 'Social communication cards'],
        featured: true
      }
    },
    {
      file: 'visual_pattern_activities.pdf',
      cover: 'thumb_visual_patterns.svg',
      svg: `
        <rect x="50" y="64" width="360" height="72" rx="12" fill="#F2EAFE"/>
        <circle cx="96" cy="100" r="18" fill="#397BB5"/>
        <polygon points="156,82 136,118 176,118" fill="#F59E0B"/>
        <circle cx="216" cy="100" r="18" fill="#397BB5"/>
        <polygon points="276,82 256,118 296,118" fill="#F59E0B"/>
        <rect x="330" y="79" width="42" height="42" rx="8" fill="#FFFFFF" stroke="#397BB5" stroke-width="2.5" stroke-dasharray="4 3"/>
        <text x="351" y="108" font-family="sans-serif" font-size="20" font-weight="800" fill="#397BB5" text-anchor="middle">?</text>

        <rect x="50" y="164" width="360" height="72" rx="12" fill="#E4F5EA"/>
        <rect x="80" y="184" width="32" height="32" rx="6" fill="#25805B"/>
        <rect x="140" y="184" width="32" height="32" rx="6" fill="#25805B"/>
        <circle cx="216" cy="200" r="18" fill="#EC4899"/>
        <rect x="260" y="184" width="32" height="32" rx="6" fill="#25805B"/>
        <rect x="330" y="179" width="42" height="42" rx="8" fill="#FFFFFF" stroke="#25805B" stroke-width="2.5" stroke-dasharray="4 3"/>
        <text x="351" y="208" font-family="sans-serif" font-size="20" font-weight="800" fill="#25805B" text-anchor="middle">?</text>
      `,
      pdfOpts: {
        heading: 'Visual Pattern Activities',
        subheading: 'Ages 5 - 8 Years | Logical Sequencing & Focus',
        pagesText: [
          ['Complete each ABAB and AABA pattern row by circling the missing shape.'],
          ['Cut-and-paste pattern strip practice for hands-on engagement.']
        ]
      },
      book: {
        title: 'Visual Pattern Activities',
        subtitle: 'Communication & Logic',
        learningGoal: 'Sequence thinking & visual focus',
        ageGroup: '5-8',
        category: 'Matching',
        learningNeed: 'Communication & Language',
        skillArea: 'Focus',
        pages: 14,
        price: 0,
        description: 'Predictable visual pattern grids that help children spot logical order calmly.',
        highlights: ['14 Pages (PDF)', 'Printable (A4)', 'Step-by-step patterns'],
        featured: false
      }
    }
  ];

  for (const item of starters) {
    const pdfFull = path.join(BOOKS_DIR, item.file);
    const coverFull = path.join(COVERS_DIR, item.cover);
    createPrintableWorksheetPdf(pdfFull, item.pdfOpts);
    writeWorksheetThumbnailSvg(coverFull, item.svg);
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
