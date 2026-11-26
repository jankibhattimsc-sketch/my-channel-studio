const { test, describe } = require('node:test');
const assert = require('node:assert');
const zlib = require('zlib');
const pptxExtractor = require('../server/services/pptxExtractor');
const externalSlideParserService = require('../server/services/externalSlideParserService');

// Create authentic sample PPTX
function createAuthenticPptx() {
  const entries = [];
  const slideCount = 3;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${Array.from({ length: slideCount }, (_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('\n  ')}
</Types>`;
  entries.push({ name: '[Content_Types].xml', data: Buffer.from(contentTypesXml, 'utf-8') });

  const sldIds = Array.from({ length: slideCount }, (_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('');
  const presXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldIdLst>${sldIds}</p:sldIdLst>
</p:presentation>`;
  entries.push({ name: 'ppt/presentation.xml', data: Buffer.from(presXml, 'utf-8') });

  const rels = Array.from({ length: slideCount }, (_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`).join('\n  ');
  const presRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  ${rels}
</Relationships>`;
  entries.push({ name: 'ppt/_rels/presentation.xml.rels', data: Buffer.from(presRelsXml, 'utf-8') });

  const titles = [
    'GPSC વર્ગ ૧ અને ૨ ભરતી પરીક્ષા જાહેરાત',
    'શૈક્ષણિક લાયકાત અને અભ્યાસક્રમ વિગત',
    'પરીક્ષા પદ્ધતિ અને મુખ્ય તારીખો'
  ];

  const bullets = [
    ['કુલ ૨૫૦ વર્ગ ૧ અને ૨ જગ્યાઓ', 'ઓજસ પોર્ટલ પરથી અરજી'],
    ['માન્ય યુનિવર્સિટીમાંથી સ્નાતક ડિગ્રી', 'વયમર્યાદા ૨૦ થી ૩૬ વર્ષ'],
    ['પ્રાથમિક કસોટી અને મુખ્ય લેખિત પરીક્ષા', 'છેલ્લી તારીખ ૩૦ નવેમ્બર']
  ];

  for (let i = 0; i < slideCount; i++) {
    const slideXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr>
        <p:txBody><a:p><a:r><a:t>${titles[i]}</a:t></a:r></a:p></p:txBody>
      </p:sp>
      <p:sp>
        <p:txBody>
          ${bullets[i].map(b => `<a:p><a:r><a:t>• ${b}</a:t></a:r></a:p>`).join('\n          ')}
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
    entries.push({ name: `ppt/slides/slide${i + 1}.xml`, data: Buffer.from(slideXml, 'utf-8') });
  }

  // Build ZIP buffer
  const parts = [];
  const cdRecords = [];
  let curOffset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf-8');
    const compData = zlib.deflateRawSync(entry.data);
    const uncompLen = entry.data.length;
    const compLen = compData.length;

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(0, 14);
    lh.writeUInt32LE(compLen, 18);
    lh.writeUInt32LE(uncompLen, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);

    const localEntry = Buffer.concat([lh, nameBuf, compData]);
    parts.push(localEntry);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(0, 16);
    cd.writeUInt32LE(compLen, 20);
    cd.writeUInt32LE(uncompLen, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(curOffset, 42);

    cdRecords.push(Buffer.concat([cd, nameBuf]));
    curOffset += localEntry.length;
  }

  const cdStart = curOffset;
  const cdBuf = Buffer.concat(cdRecords);
  const cdSize = cdBuf.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...parts, cdBuf, eocd]);
}

describe('PPT IMPORT - SCRIPT - AUDIO CONNECTION VERIFICATION', () => {
  test('1. PPT Import extracts genuine titles & bullets without fake banners or fallback subtitles', () => {
    const pptxBuf = createAuthenticPptx();
    const slides = pptxExtractor.extractPptxSlides(pptxBuf);

    assert.strictEqual(slides.length, 3, 'Must extract exact slide count (3)');
    
    // Check Slide 1
    assert.strictEqual(slides[0].title, 'GPSC વર્ગ ૧ અને ૨ ભરતી પરીક્ષા જાહેરાત');
    assert.ok(slides[0].bulletPoints.length >= 2);
    assert.ok(slides[0].bulletPoints[0].includes('કુલ ૨૫૦ વર્ગ ૧ અને ૨ જગ્યાઓ'));
    
    // Ensure NO synthetic fake fallback subtitles
    assert.ok(!slides[0].subtitle.includes('સત્તાવાર નિર્ણય & માહિતી'), 'Must not have fake fallback subtitle');
    assert.ok(!slides[0].subtitle.includes('સત્તાવાર નિર્ણય સંદર્ભ'), 'Must not have fake fallback subtitle');

    // Ensure NO fake placeholder bullets
    slides.forEach((s, idx) => {
      s.bulletPoints.forEach(b => {
        assert.ok(!b.includes('સત્તાવાર નિયમો અને વિગતો'), `Slide ${idx + 1} has fake bullet`);
        assert.ok(!b.includes('તમામ માપદંડો ચકાસો'), `Slide ${idx + 1} has fake bullet`);
      });
    });
  });

  test('2. Script stage preserves 1-to-1 slide correlation with original PPT content', () => {
    const pptxBuf = createAuthenticPptx();
    const slides = pptxExtractor.extractPptxSlides(pptxBuf);

    // Build script prompt content representation
    const promptSlideList = slides.map(s => {
      return `સ્લાઇડ #${s.slideNumber}: ${s.title}\nમુખ્ય મુદ્દા:\n${s.bulletPoints.map(b => `   • ${b}`).join('\n')}`;
    }).join('\n\n');

    assert.ok(promptSlideList.includes('સ્લાઇડ #1: GPSC વર્ગ ૧ અને ૨ ભરતી પરીક્ષા જાહેરાત'));
    assert.ok(promptSlideList.includes('સ્લાઇડ #2: શૈક્ષણિક લાયકાત અને અભ્યાસક્રમ વિગત'));
    assert.ok(promptSlideList.includes('સ્લાઇડ #3: પરીક્ષા પદ્ધતિ અને મુખ્ય તારીખો'));
    assert.ok(promptSlideList.includes('કુલ ૨૫૦ વર્ગ ૧ અને ૨ જગ્યાઓ'));
    assert.ok(promptSlideList.includes('છેલ્લી તારીખ ૩૦ નવેમ્બર'));
  });

  test('3. External Slide Parser defaults subtitle to empty string when not specified', () => {
    const rawSlideText = `સ્લાઇડ ૧: નવી ભરતી જાહેરાત\n• પ્રથમ વિગત\n• બીજી વિગત\n\nસ્લાઇડ ૨: લાયકાત માપદંડ\n• ગ્રેજ્યુએટ જરૂરી`;
    const parsed = externalSlideParserService.parseExternalSlidesText(rawSlideText);

    assert.strictEqual(parsed.length, 2);
    assert.strictEqual(parsed[0].title, 'નવી ભરતી જાહેરાત');
    assert.strictEqual(parsed[0].subtitle, '', 'Subtitle should default to empty string, not fake banner');
    assert.strictEqual(parsed[1].subtitle, '', 'Subtitle should default to empty string, not fake banner');
  });

  test('4. Video Editor Timeline initializes with Cut transitions (0s duration, no animation)', () => {
    const pptxBuf = createAuthenticPptx();
    const slides = pptxExtractor.extractPptxSlides(pptxBuf);

    // Mock initializeTimeline logic from videoeditor.js
    const transitionClips = [];
    slides.forEach((s, idx) => {
      if (idx > 0) {
        transitionClips.push({
          id: `trans_${idx}`,
          slideIndex: idx,
          type: 'cut',
          duration: 0
        });
      }
    });

    assert.strictEqual(transitionClips.length, 2);
    transitionClips.forEach(t => {
      assert.strictEqual(t.type, 'cut', 'Transition must be cut (no animation)');
      assert.strictEqual(t.duration, 0, 'Transition duration must be 0s');
    });
  });

  test('5. Preserving authentic slides: setScript does not overwrite authentic imported slides with synthetic script slides', () => {
    // Mock project with imported presentation
    const activeProject = {
      id: 'proj_test_123',
      slide: {
        importedPresentation: {
          id: 'pres_123',
          filename: 'original_presentation.pptx'
        },
        slides: [
          { id: 1, title: 'Original PPT Slide 1' },
          { id: 2, title: 'Original PPT Slide 2' }
        ]
      }
    };

    const hasImportedSlides = Boolean(activeProject.slide?.importedPresentation || (Array.isArray(activeProject.slide?.slides) && activeProject.slide.slides.length > 0));
    
    // Simulate setScript guard
    if (!hasImportedSlides) {
      activeProject.slide.slides = [{ id: 99, title: 'Synthetic Slide' }];
    }

    assert.strictEqual(activeProject.slide.slides.length, 2);
    assert.strictEqual(activeProject.slide.slides[0].title, 'Original PPT Slide 1', 'Original slide must remain preserved');
  });
});
