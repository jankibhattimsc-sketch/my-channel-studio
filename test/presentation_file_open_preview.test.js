const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const researchRoutes = require('../server/routes/research');
const pptxExtractor = require('../server/services/pptxExtractor');
const pdfSlideExtractor = require('../server/services/pdfSlideExtractor');

/**
 * Creates an authentic multi-slide PPTX with standard ZIP Central Directory.
 */
function createMultiSlidePptx(slideCount = 5) {
  const entries = [];

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${Array.from({ length: slideCount }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('\n  ')}
</Types>`;
  entries.push({ name: '[Content_Types].xml', data: Buffer.from(contentTypesXml, 'utf-8') });

  // 2. ppt/presentation.xml
  const sldIds = Array.from({ length: slideCount }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('');
  const presXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst>${sldIds}</p:sldIdLst>
</p:presentation>`;
  entries.push({ name: 'ppt/presentation.xml', data: Buffer.from(presXml, 'utf-8') });

  // 3. ppt/_rels/presentation.xml.rels
  const rels = Array.from({ length: slideCount }, (_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('\n  ');
  const presRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${rels}
</Relationships>`;
  entries.push({ name: 'ppt/_rels/presentation.xml.rels', data: Buffer.from(presRelsXml, 'utf-8') });

  // 4. ppt/slides/slide1.xml to slideN.xml
  const titles = [
    'આંગણવાડી ભરતી ૨૦૨૬ સત્તાવાર જાહેરાત',
    'પાત્રતા, વયમર્યાદા અને અનામત નિયમો',
    'ઓનલાઇન અરજી પ્રક્રિયા અને જરૂરી આધાર',
    'મેરિટ લિસ્ટ અને પસંદગી પદ્ધતિ',
    'મહત્વપૂર્ણ તારીખો અને હેલ્પલાઇન નંબર'
  ];

  for (let i = 0; i < slideCount; i++) {
    const slideTitle = titles[i % titles.length] || `સ્લાઇડ #${i + 1}: સત્તાવાર નિયમ`;
    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:txBody>
          <a:p><a:r><a:t>${slideTitle}</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:nvSpPr><p:nvPr><p:ph type="subTitle"/></p:nvPr></p:nvSpPr>
        <p:txBody>
          <a:p><a:r><a:t>ગાંધીનગર મહિલા અને બાળ વિકાસ વિભાગ</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
      <p:sp>
        <p:txBody>
          <a:p><a:r><a:t>• કુલ ૧૦,૪૫૦ જગ્યાઓ માટે નોટિફિકેશન મંજૂર</a:t></a:r></a:p>
          <a:p><a:r><a:t>• તમામ જરૂરી પ્રમાણપત્રો સમયસર તૈયાર રાખવા</a:t></a:r></a:p>
          <a:p><a:r><a:t>• સત્તાવાર પોર્ટલ પરથી જ સીધી અરજી કરવી</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
    entries.push({ name: `ppt/slides/slide${i + 1}.xml`, data: Buffer.from(slideXml, 'utf-8') });
  }

  // Construct ZIP Archive with Central Directory
  const localHeaders = [];
  const cdHeaders = [];
  let offset = 0;

  for (const entry of entries) {
    const fnBuf = Buffer.from(entry.name, 'utf-8');
    const compData = zlib.deflateRawSync(entry.data);

    // Local Header
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8); // Deflate
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(0, 14);
    lh.writeUInt32LE(compData.length, 18);
    lh.writeUInt32LE(entry.data.length, 22);
    lh.writeUInt16LE(fnBuf.length, 26);
    lh.writeUInt16LE(0, 28);

    const localEntry = Buffer.concat([lh, fnBuf, compData]);
    localHeaders.push(localEntry);

    // Central Directory Header
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(0, 16);
    cd.writeUInt32LE(compData.length, 20);
    cd.writeUInt32LE(entry.data.length, 24);
    cd.writeUInt16LE(fnBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);

    cdHeaders.push(Buffer.concat([cd, fnBuf]));
    offset += localEntry.length;
  }

  const allLocal = Buffer.concat(localHeaders);
  const allCd = Buffer.concat(cdHeaders);

  // End of Central Directory Record
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(allCd.length, 12);
  eocd.writeUInt32LE(allLocal.length, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([allLocal, allCd, eocd]);
}

/**
 * Creates an authentic multi-page PDF with 5 distinct pages.
 */
function createMultiPagePdf(pageCount = 5) {
  const pageTitles = [
    'Gujarat Government DA 2026 Notification',
    'Eligibility Criteria and Eligible Cadres',
    'Arrears Payment Calculation Table',
    'Implementation Rules and Treasury Orders',
    'Final Verification and Helpline Instructions'
  ];

  let pdfText = '%PDF-1.4\n';
  const offsets = [];

  // Helper to record object offset
  function appendObj(num, content) {
    offsets[num] = Buffer.byteLength(pdfText, 'utf-8');
    pdfText += `${num} 0 obj\n${content}\nendobj\n`;
  }

  // 1: Catalog -> /Pages 2 0 R
  appendObj(1, '<< /Type /Catalog /Pages 2 0 R >>');

  // Kids IDs for Pages
  const pageIds = [];
  let nextObjId = 3;
  for (let i = 0; i < pageCount; i++) {
    pageIds.push(`${nextObjId} 0 R`);
    nextObjId += 2; // page obj + content stream obj
  }

  // 2: Pages root
  appendObj(2, `<< /Type /Pages /Kids [${pageIds.join(' ')}] /Count ${pageCount} >>`);

  // Font object
  const fontObjId = nextObjId;
  appendObj(fontObjId, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  // Page objects and content streams
  let curObjId = 3;
  for (let i = 0; i < pageCount; i++) {
    const pageObjId = curObjId;
    const contentObjId = curObjId + 1;
    const pTitle = pageTitles[i] || `Section ${i + 1}`;

    appendObj(pageObjId, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentObjId} 0 R /Resources << /Font << /F1 ${fontObjId} 0 R >> >> >>`);

    const streamContent = `BT /F1 12 Tf 50 720 Td (Page ${i + 1}: ${pTitle}) Tj ET\n` +
                          `BT /F1 10 Tf 50 690 Td (Official Guidelines and Notifications for Step ${i + 1}) Tj ET\n` +
                          `BT /F1 10 Tf 50 665 Td (Full details verified by Finance Department) Tj ET\n`;
    const streamLen = Buffer.byteLength(streamContent, 'utf-8');
    appendObj(contentObjId, `<< /Length ${streamLen} >>\nstream\n${streamContent}endstream`);

    curObjId += 2;
  }

  const xrefOffset = Buffer.byteLength(pdfText, 'utf-8');
  const totalObjs = fontObjId + 1;
  pdfText += `xref\n0 ${totalObjs}\n0000000000 65535 f \n`;
  for (let i = 1; i < totalObjs; i++) {
    const offStr = String(offsets[i] || 0).padStart(10, '0');
    pdfText += `${offStr} 00000 n \n`;
  }
  pdfText += `trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdfText, 'utf-8');
}

// Dispatch directly to Express Router in-process (zero socket binding needed)
function callRoute(method, url, body = {}, params = {}) {
  return new Promise((resolve) => {
    const headers = {};
    let statusCode = 200;

    const req = {
      method: method.toUpperCase(),
      url,
      path: url,
      body,
      params,
      headers: { 'content-type': 'application/json' }
    };

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      setHeader(k, v) {
        headers[k.toLowerCase()] = v;
      },
      json(data) {
        resolve({ statusCode, headers, body: data });
      },
      send(data) {
        resolve({ statusCode, headers, body: data });
      }
    };

    const matchingRoute = researchRoutes.stack.find(layer => {
      if (!layer.route) return false;
      const layerMethod = Object.keys(layer.route.methods)[0]?.toUpperCase();
      return layerMethod === req.method && (
        layer.route.path === url ||
        (layer.route.path.includes(':filename') && url.startsWith('/presentation-file/'))
      );
    });

    if (matchingRoute) {
      if (matchingRoute.route.path.includes(':filename')) {
        req.params.filename = url.replace('/presentation-file/', '');
      }
      matchingRoute.route.stack[0].handle(req, res, () => {
        resolve({ statusCode: 404, headers, body: 'Not Found' });
      });
    } else {
      resolve({ statusCode: 404, headers, body: 'Route Not Found' });
    }
  });
}

describe('Full PPTX & PDF Import, In-App Multi-Slide Preview & Project Isolation', () => {

  test('1. PPTX Complete Import: Extracts ALL 5 Slides with Original Ordering & Content (No 1-slide drop)', async () => {
    const pptxBuf = createMultiSlidePptx(5);
    assert.ok(pptxBuf.length > 500, 'PPTX buffer must be a valid zip');

    // Test direct service extraction
    const extractedSlides = pptxExtractor.extractPptxSlides(pptxBuf);
    assert.strictEqual(extractedSlides.length, 5, 'Must extract exactly 5 slides from 5-slide PPTX');
    assert.strictEqual(extractedSlides[0].title, 'આંગણવાડી ભરતી ૨૦૨૬ સત્તાવાર જાહેરાત');
    assert.strictEqual(extractedSlides[1].title, 'પાત્રતા, વયમર્યાદા અને અનામત નિયમો');
    assert.strictEqual(extractedSlides[2].title, 'ઓનલાઇન અરજી પ્રક્રિયા અને જરૂરી આધાર');
    assert.strictEqual(extractedSlides[3].title, 'મેરિટ લિસ્ટ અને પસંદગી પદ્ધતિ');
    assert.strictEqual(extractedSlides[4].title, 'મહત્વપૂર્ણ તારીખો અને હેલ્પલાઇન નંબર');

    // Confirm bullets are preserved
    assert.ok(extractedSlides[0].bulletPoints.length > 0, 'Slide 1 must have bullet points');
    assert.ok(extractedSlides[0].bulletPoints.some(b => b.includes('૧૦,૪૫૦ જગ્યાઓ')), 'Bullet points content must match');

    // Test upload endpoint
    const base64Data = 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,' + pptxBuf.toString('base64');
    const uploadRes = await callRoute('POST', '/upload-file', {
      fileBase64: base64Data,
      filename: 'Anganwadi_NotebookLM_5Slides.pptx',
      overallTopic: 'આંગણવાડી ભરતી ૨૦૨૬'
    });

    assert.strictEqual(uploadRes.statusCode, 200);
    assert.strictEqual(uploadRes.body.success, true);
    assert.strictEqual(uploadRes.body.slideCount, 5, 'Upload response must report all 5 slides');
    assert.strictEqual(uploadRes.body.slides.length, 5, 'Upload response must contain all 5 slides');
  });

  test('2. PPTX In-App Preview & Slide Accessibility: All 5 slides are individually accessible', async () => {
    const pptxBuf = createMultiSlidePptx(5);
    const slides = pptxExtractor.extractPptxSlides(pptxBuf);

    for (let idx = 0; idx < 5; idx++) {
      const s = slides[idx];
      assert.strictEqual(s.slideNumber, idx + 1);
      assert.ok(s.title && s.title.length > 5);
      assert.ok(s.subtitle && s.subtitle.length > 0);
      assert.ok(Array.isArray(s.bulletPoints) && s.bulletPoints.length > 0);
      assert.ok(s.scriptText && s.scriptText.length > 10);
      assert.ok(s.timing && s.timing.includes(':'));
    }
  });

  test('3. PDF Complete Import: Multi-Page PDF Extracts ALL 5 Pages into 5 Slides', async () => {
    const pdfBuf = createMultiPagePdf(5);
    assert.ok(pdfBuf.length > 300, 'PDF buffer must be valid');

    const base64Data = 'data:application/pdf;base64,' + pdfBuf.toString('base64');
    const uploadRes = await callRoute('POST', '/upload-file', {
      fileBase64: base64Data,
      filename: 'Gujarat_DA_Hike_5Pages.pdf',
      overallTopic: 'ગુજરાત કર્મચારી પગાર અને DA વધારો ૨૦૨૬'
    });

    assert.strictEqual(uploadRes.statusCode, 200);
    assert.strictEqual(uploadRes.body.success, true);
    assert.ok(uploadRes.body.slideCount >= 5, `Must extract at least 5 slides from 5-page PDF (got ${uploadRes.body.slideCount})`);
    assert.strictEqual(uploadRes.body.slides.length, uploadRes.body.slideCount);

    // Verify slide titles correspond to the pages
    const firstSlide = uploadRes.body.slides[0];
    assert.ok(firstSlide.title.includes('Gujarat') || firstSlide.title.includes('DA') || firstSlide.title.includes('Notification'));
    assert.ok(Array.isArray(firstSlide.bulletPoints));
  });

  test('4. PDF In-App Preview & Page Navigation: PDF file serves with exact application/pdf MIME type', async () => {
    const pdfBuf = createMultiPagePdf(5);
    const base64Data = 'data:application/pdf;base64,' + pdfBuf.toString('base64');
    const uploadRes = await callRoute('POST', '/upload-file', {
      fileBase64: base64Data,
      filename: 'Gujarat_DA_Hike_5Pages.pdf'
    });

    const streamRes = await callRoute('GET', `/presentation-file/${uploadRes.body.storedFilename}`);
    assert.strictEqual(streamRes.headers['content-type'], 'application/pdf');
    assert.ok(streamRes.headers['content-disposition'].includes('inline'));
    assert.strictEqual(streamRes.body.length, pdfBuf.length);
  });

  test('5. Original Files Persist After Refresh: Binary files exist on disk with exact byte length', async () => {
    const pptxBuf = createMultiSlidePptx(5);
    const res = await callRoute('POST', '/upload-file', {
      fileBase64: 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,' + pptxBuf.toString('base64'),
      filename: 'Persistent_Anganwadi.pptx'
    });

    const diskPath = path.join(__dirname, '..', 'public', 'presentations', res.body.storedFilename);
    assert.ok(fs.existsSync(diskPath), 'File must be written to disk');
    const diskContent = fs.readFileSync(diskPath);
    assert.strictEqual(diskContent.length, pptxBuf.length, 'Persisted file size must match original buffer exactly');
  });

  test('6. Project Isolation: Distinct projects have independent files, URLs and slide counts', async () => {
    const pptxBuf = createMultiSlidePptx(5);
    const resA = await callRoute('POST', '/upload-file', {
      fileBase64: 'data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,' + pptxBuf.toString('base64'),
      filename: 'ProjectA_Anganwadi_5Slides.pptx'
    });

    const pdfBuf = createMultiPagePdf(5);
    const resB = await callRoute('POST', '/upload-file', {
      fileBase64: 'data:application/pdf;base64,' + pdfBuf.toString('base64'),
      filename: 'ProjectB_Gujarat_DA_5Pages.pdf'
    });

    assert.notStrictEqual(resA.body.fileUrl, resB.body.fileUrl);
    assert.strictEqual(resA.body.slideCount, 5);
    assert.ok(resB.body.slideCount >= 5);
    assert.ok(resA.body.fileUrl.endsWith('.pptx'));
    assert.ok(resB.body.fileUrl.endsWith('.pdf'));
  });

});
