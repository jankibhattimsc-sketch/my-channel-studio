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
      '0.98 0.97 0.96 rg 0 0 595 842 re f',
      '0.91 0.95 1.00 rg 32 732 531 78 re f',
      '0.22 0.48 0.71 rg 32 732 531 4 re f',
      '0.15 0.22 0.29 rg BT /F1 19 Tf 48 776 Td (' + escapePdfText(heading) + ') Tj ET',
      '0.40 0.47 0.54 rg BT /F1 11 Tf 48 752 Td (' + escapePdfText(subheading + '  |  Page ' + (i + 1) + ' of ' + pageCount) + ') Tj ET',
      '0.15 0.22 0.29 rg'
    ];

    let y = 678;
    for (const line of pageLines) {
      streamLines.push(`BT /F1 14 Tf 48 ${y} Td (${escapePdfText(line)}) Tj ET`);
      streamLines.push(`0.82 0.87 0.92 rg 48 ${y - 12} 499 1 re f`);
      streamLines.push('0.15 0.22 0.29 rg');
      y -= 54;
    }

    streamLines.push('0.40 0.47 0.54 rg BT /F1 10 Tf 48 56 Td (Special Kids Worksheets - Printable A4 Resource | Personal & Home Educational Use) Tj ET');
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
  const full = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320">
  <rect width="480" height="320" fill="#FAF8F5"/>
  <rect x="34" y="18" width="412" height="284" rx="14" fill="#FFFFFF" stroke="#D8E2EC" stroke-width="2"/>
  <rect x="34" y="18" width="412" height="44" rx="14" fill="#EAF4FF"/>
  <rect x="34" y="48" width="412" height="14" fill="#EAF4FF"/>
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
        <text x="54" y="45" font-family="sans-serif" font-size="16" font-weight="700" fill="#26384A">Line Tracing Practice</text>
        <text x="424" y="45" font-family="sans-serif" font-size="12" font-weight="700" fill="#397BB5" text-anchor="end">A4 Printable</text>
        <circle cx="82" cy="108" r="18" fill="#FFF2C9" stroke="#F59E0B" stroke-width="2"/>
        <text x="82" y="114" font-size="18" text-anchor="middle">🐝</text>
        <path d="M114 108 Q165 82 216 108 T318 108 T382 108" fill="none" stroke="#397BB5" stroke-width="3.5" stroke-dasharray="7 7" stroke-linecap="round"/>
        <circle cx="404" cy="108" r="16" fill="#E4F5EA"/>
        <text x="404" y="114" font-size="16" text-anchor="middle">🌸</text>

        <circle cx="82" cy="176" r="18" fill="#FFE9E4"/>
        <text x="82" y="182" font-size="18" text-anchor="middle">🦋</text>
        <polyline points="114,176 156,154 198,196 240,154 282,196 324,154 382,176" fill="none" stroke="#EC4899" stroke-width="3.5" stroke-dasharray="7 7" stroke-linecap="round"/>
        <circle cx="404" cy="176" r="16" fill="#FFF2C9"/>
        <text x="404" y="182" font-size="16" text-anchor="middle">🌼</text>

        <circle cx="82" cy="244" r="18" fill="#EAF4FF"/>
        <text x="82" y="250" font-size="18" text-anchor="middle">🚗</text>
        <line x1="114" y1="244" x2="382" y2="244" stroke="#25805B" stroke-width="3.5" stroke-dasharray="8 8" stroke-linecap="round"/>
        <circle cx="404" cy="244" r="16" fill="#F2EAFE"/>
        <text x="404" y="250" font-size="16" text-anchor="middle">🏠</text>
      `,
      pdfOpts: {
        heading: 'Line Tracing Practice Workbook',
        subheading: 'Ages 3-5 Years | Fine Motor Support',
        pagesText: [
          ['Activity 1: Trace the straight dashed path from the Bee to the Flower.', 'Practice slow, steady pencil strokes from left to right.'],
          ['Activity 2: Trace the gentle waves from the Butterfly to the Sun.', 'Take breaks anytime and go at your own pace.'],
          ['Activity 3: Guide the Car along the straight road to Home.']
        ]
      },
      book: {
        title: 'Line Tracing Practice',
        subtitle: 'Gentle dotted paths to strengthen pencil grip and hand control',
        learningGoal: 'Pencil control & hand-eye coordination',
        ageGroup: '3-5',
        category: 'Tracing',
        learningNeed: 'Fine Motor Skills',
        skillArea: 'Motor',
        pages: 10,
        mrp: 0,
        price: 0,
        description: 'Calm, uncluttered tracing paths featuring bees, butterflies, and roads designed for early fine-motor practice.',
        highlights: ['Clear high-contrast dashed guide lines', 'Spacious A4 layout with minimal distractions'],
        featured: true
      }
    },
    {
      file: 'shape_matching_pack.pdf',
      cover: 'thumb_shape_matching.svg',
      svg: `
        <text x="54" y="45" font-family="sans-serif" font-size="16" font-weight="700" fill="#26384A">Shape Matching</text>
        <text x="424" y="45" font-family="sans-serif" font-size="12" font-weight="700" fill="#25805B" text-anchor="end">A4 Printable</text>
        <circle cx="110" cy="108" r="24" fill="#FFF2C9" stroke="#D97706" stroke-width="3"/>
        <polygon points="110,152 84,198 136,198" fill="#EAF4FF" stroke="#397BB5" stroke-width="3"/>
        <rect x="86" y="224" width="48" height="44" rx="6" fill="#E4F5EA" stroke="#25805B" stroke-width="3"/>

        <line x1="154" y1="108" x2="322" y2="176" stroke="#94A3B8" stroke-width="2.5" stroke-dasharray="6 6"/>
        <line x1="154" y1="176" x2="322" y2="246" stroke="#94A3B8" stroke-width="2.5" stroke-dasharray="6 6"/>
        <line x1="154" y1="246" x2="322" y2="108" stroke="#94A3B8" stroke-width="2.5" stroke-dasharray="6 6"/>

        <rect x="342" y="86" width="48" height="44" rx="6" fill="none" stroke="#25805B" stroke-width="3" stroke-dasharray="5 4"/>
        <circle cx="366" cy="176" r="24" fill="none" stroke="#D97706" stroke-width="3" stroke-dasharray="5 4"/>
        <polygon points="366,224 340,270 392,270" fill="none" stroke="#397BB5" stroke-width="3" stroke-dasharray="5 4"/>
      `,
      pdfOpts: {
        heading: 'Shape Matching & Visual Discrimination',
        subheading: 'Ages 4-6 Years | Focus & Visual Skills',
        pagesText: [
          ['Match each colorful shape on the left to its dotted twin on the right.', 'Circle -> Circle  |  Triangle -> Triangle  |  Square -> Square'],
          ['Bonus Activity: Color each matched pair the same soft color!']
        ]
      },
      book: {
        title: 'Shape Matching',
        subtitle: 'Match circles, squares, stars, and triangles step by step',
        learningGoal: 'Visual recognition & steady focus',
        ageGroup: '4-6',
        category: 'Matching',
        learningNeed: 'ADHD Activities',
        skillArea: 'Focus',
        pages: 8,
        mrp: 0,
        price: 0,
        description: 'Structured visual matching activities that support visual attention without distracting page clutter.',
        highlights: ['Clean shapes with clear dotted targets', 'Builds visual discrimination at child pace'],
        featured: true
      }
    },
    {
      file: 'alphabet_tracing_az.pdf',
      cover: 'thumb_alphabet_tracing.svg',
      svg: `
        <text x="54" y="45" font-family="sans-serif" font-size="16" font-weight="700" fill="#26384A">Alphabet Tracing (A–Z)</text>
        <text x="424" y="45" font-family="sans-serif" font-size="12" font-weight="700" fill="#397BB5" text-anchor="end">A4 Printable</text>
        <rect x="58" y="84" width="110" height="110" rx="14" fill="#FFE9E4"/>
        <text x="113" y="156" font-size="60" text-anchor="middle">🍎</text>
        <text x="236" y="158" font-family="sans-serif" font-size="86" font-weight="800" fill="none" stroke="#397BB5" stroke-width="3" stroke-dasharray="6 5">A</text>
        <text x="330" y="158" font-family="sans-serif" font-size="76" font-weight="800" fill="none" stroke="#687789" stroke-width="2.5" stroke-dasharray="5 5">a</text>
        <line x1="58" y1="230" x2="422" y2="230" stroke="#CBD5E1" stroke-width="2"/>
        <line x1="58" y1="252" x2="422" y2="252" stroke="#94A3B8" stroke-width="2" stroke-dasharray="6 6"/>
        <line x1="58" y1="274" x2="422" y2="274" stroke="#CBD5E1" stroke-width="2"/>
        <text x="90" y="266" font-family="sans-serif" font-size="30" font-weight="700" fill="#94A3B8">A   a   A   a</text>
      `,
      pdfOpts: {
        heading: 'Alphabet Tracing Workbook (A to Z)',
        subheading: 'Ages 4-6 Years | Letter Formation',
        pagesText: [
          ['Letter A - Apple: Trace uppercase A and lowercase a inside the wide lines.', 'A   A   A   |   a   a   a'],
          ['Letter B - Ball: Trace uppercase B and lowercase b carefully.', 'B   B   B   |   b   b   b']
        ]
      },
      book: {
        title: 'Alphabet Tracing',
        subtitle: 'Large dotted letters with clear stroke space for comfortable writing',
        learningGoal: 'Letter recognition & writing practice',
        ageGroup: '4-6',
        category: 'Tracing',
        learningNeed: 'Learning Disability',
        skillArea: 'Motor',
        pages: 26,
        mrp: 0,
        price: 0,
        description: 'Every letter from A to Z gets its own calm, spacious page with clear picture cues and gentle tracing rows.',
        highlights: ['Full A–Z uppercase & lowercase practice', 'Extra-wide baseline spacing for easy writing'],
        featured: true
      }
    },
    {
      file: 'number_recognition_1_10.pdf',
      cover: 'thumb_number_recognition.svg',
      svg: `
        <text x="54" y="45" font-family="sans-serif" font-size="16" font-weight="700" fill="#26384A">Number Recognition (1–10)</text>
        <text x="424" y="45" font-family="sans-serif" font-size="12" font-weight="700" fill="#25805B" text-anchor="end">A4 Printable</text>
        <rect x="56" y="84" width="110" height="90" rx="14" fill="#FFF2C9"/>
        <text x="111" y="148" font-family="sans-serif" font-size="56" font-weight="800" fill="none" stroke="#397BB5" stroke-width="3" stroke-dasharray="6 4" text-anchor="middle">3</text>
        <text x="235" y="138" font-size="34">⭐ ⭐ ⭐</text>
        <rect x="56" y="196" width="368" height="84" rx="12" fill="#E4F5EA"/>
        <text x="240" y="246" font-family="sans-serif" font-size="24" font-weight="700" fill="#26384A" text-anchor="middle">1   •   2   •   3   •   4   •   5</text>
      `,
      pdfOpts: {
        heading: 'Number Recognition & Counting (1 to 10)',
        subheading: 'Ages 3-6 Years | Early Numeracy',
        pagesText: [
          ['Number 1 & 2: Trace the number and count the friendly stars.', 'Number 3: Point and count 1, 2, 3!'],
          ['Circle the groups that show 4 objects.']
        ]
      },
      book: {
        title: 'Number Recognition',
        subtitle: 'Countable visual groups paired with bold tracing numbers 1 to 10',
        learningGoal: 'Early counting & number recognition',
        ageGroup: '3-6',
        category: 'Coloring',
        learningNeed: 'Autism Support',
        skillArea: 'Focus',
        pages: 12,
        mrp: 0,
        price: 0,
        description: 'Clear 1-to-1 counting visuals help children connect written numbers with concrete quantities.',
        highlights: ['One number per section for calm focus', 'Trace, count, and color activities combined'],
        featured: true
      }
    },
    {
      file: 'emotion_matching_sel.pdf',
      cover: 'thumb_emotion_matching.svg',
      svg: `
        <text x="54" y="45" font-family="sans-serif" font-size="16" font-weight="700" fill="#26384A">Emotion Matching</text>
        <text x="424" y="45" font-family="sans-serif" font-size="12" font-weight="700" fill="#397BB5" text-anchor="end">A4 Printable</text>
        <rect x="62" y="84" width="166" height="90" rx="14" fill="#FFF2C9"/>
        <text x="145" y="132" font-size="38" text-anchor="middle">😊</text>
        <text x="145" y="160" font-family="sans-serif" font-size="14" font-weight="700" fill="#26384A" text-anchor="middle">Happy</text>

        <rect x="252" y="84" width="166" height="90" rx="14" fill="#EAF4FF"/>
        <text x="335" y="132" font-size="38" text-anchor="middle">😌</text>
        <text x="335" y="160" font-family="sans-serif" font-size="14" font-weight="700" fill="#26384A" text-anchor="middle">Calm</text>

        <rect x="62" y="192" width="166" height="90" rx="14" fill="#FFE9E4"/>
        <text x="145" y="240" font-size="38" text-anchor="middle">😢</text>
        <text x="145" y="268" font-family="sans-serif" font-size="14" font-weight="700" fill="#26384A" text-anchor="middle">Sad</text>

        <rect x="252" y="192" width="166" height="90" rx="14" fill="#F2EAFE"/>
        <text x="335" y="240" font-size="38" text-anchor="middle">😮</text>
        <text x="335" y="268" font-family="sans-serif" font-size="14" font-weight="700" fill="#26384A" text-anchor="middle">Surprised</text>
      `,
      pdfOpts: {
        heading: 'Emotion Matching & Social Cues',
        subheading: 'Ages 4-8 Years | Social & Emotional Learning',
        pagesText: [
          ['Look at each friendly face: Happy, Calm, Sad, Surprised.', 'Draw a line to match the face with how the child feels today.'],
          ['Parent Prompt: Ask your child what helps them feel calm when upset.']
        ]
      },
      book: {
        title: 'Emotion Matching',
        subtitle: 'Clear expressive faces to explore everyday feelings safely',
        learningGoal: 'Identifying feelings & communication',
        ageGroup: '4-8',
        category: 'Matching',
        learningNeed: 'Social & Emotional Learning',
        skillArea: 'Communication',
        pages: 10,
        mrp: 0,
        price: 0,
        description: 'Friendly emotion cards and matching sheets designed to support communication and talking about everyday feelings.',
        highlights: ['Supports emotion naming & verbal cues', 'Great for home conversations & visual schedules'],
        featured: true
      }
    },
    {
      file: 'visual_pattern_activities.pdf',
      cover: 'thumb_visual_patterns.svg',
      svg: `
        <text x="54" y="45" font-family="sans-serif" font-size="16" font-weight="700" fill="#26384A">Visual Pattern Activities</text>
        <text x="424" y="45" font-family="sans-serif" font-size="12" font-weight="700" fill="#25805B" text-anchor="end">A4 Printable</text>
        <rect x="54" y="84" width="372" height="58" rx="12" fill="#F2EAFE"/>
        <circle cx="96" cy="113" r="15" fill="#397BB5"/>
        <polygon points="154,97 137,128 171,128" fill="#F59E0B"/>
        <circle cx="212" cy="113" r="15" fill="#397BB5"/>
        <polygon points="270,97 253,128 287,128" fill="#F59E0B"/>
        <rect x="330" y="94" width="38" height="38" rx="8" fill="#FFFFFF" stroke="#26384A" stroke-width="2" stroke-dasharray="4 3"/>
        <text x="349" y="120" font-family="sans-serif" font-size="18" font-weight="800" fill="#687789" text-anchor="middle">?</text>

        <rect x="54" y="162" width="372" height="58" rx="12" fill="#E4F5EA"/>
        <rect x="82" y="177" width="28" height="28" rx="5" fill="#25805B"/>
        <rect x="140" y="177" width="28" height="28" rx="5" fill="#25805B"/>
        <circle cx="212" cy="191" r="15" fill="#EC4899"/>
        <rect x="256" y="177" width="28" height="28" rx="5" fill="#25805B"/>
        <rect x="330" y="172" width="38" height="38" rx="8" fill="#FFFFFF" stroke="#26384A" stroke-width="2" stroke-dasharray="4 3"/>
        <text x="349" y="198" font-family="sans-serif" font-size="18" font-weight="800" fill="#687789" text-anchor="middle">?</text>

        <text x="240" y="266" font-family="sans-serif" font-size="14" font-weight="700" fill="#687789" text-anchor="middle">Complete the sequence pattern step by step</text>
      `,
      pdfOpts: {
        heading: 'Visual Pattern Activities',
        subheading: 'Ages 5-8 Years | Cognitive Sequencing',
        pagesText: [
          ['Pattern Row 1: Circle - Triangle - Circle - Triangle - What comes next?', 'Draw or circle the missing shape in the box.'],
          ['Pattern Row 2: Big - Small - Big - Small sequence puzzles.']
        ]
      },
      book: {
        title: 'Visual Pattern Activities',
        subtitle: 'Step-by-step ABAB and ABC visual sequence completion sheets',
        learningGoal: 'Logical sequencing & problem solving',
        ageGroup: '5-8',
        category: 'Matching',
        learningNeed: 'Communication & Language',
        skillArea: 'Focus',
        pages: 14,
        mrp: 0,
        price: 0,
        description: 'Predictable visual pattern grids encourage children to spot sequences and build confidence step by step.',
        highlights: ['Predictable low-stress visual puzzles', 'Progressive difficulty from ABAB to ABC'],
        featured: true
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
