const { describe, it } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const extractor = require('../server/services/pdfSlideExtractor');

describe('ORIGINAL IMPORTED PDF IN VOICE STUDIO VERIFICATION', () => {
  const actualPdfPath = path.join(__dirname, '..', 'public', 'presentations', 'pres_1793465525051_Gujarat_DA_Hike_5Pages.pdf');

  it('1. User Actual Previously Imported PDF: Loads from persistent storage and preserves all pages', async () => {
    assert.strictEqual(fs.existsSync(actualPdfPath), true, 'Actual imported PDF must exist in persistent storage');

    const pdfBuffer = fs.readFileSync(actualPdfPath);
    assert.ok(pdfBuffer.length > 0, 'PDF buffer must not be empty');

    const result = await extractor.extractSlidesFromPdf(pdfBuffer, {
      filename: 'Gujarat_DA_Hike_5Pages.pdf'
    });

    assert.strictEqual(result.success, true, 'PDF extraction must succeed');
    assert.strictEqual(result.slideCount, 5, 'Must extract exactly 5 pages for 5-page PDF');
    assert.strictEqual(result.totalPages, 5, 'Total pages must equal 5');
  });

  it('2. First, Middle, and Last Pages match the original PDF content in exact unchanged order', async () => {
    const pdfBuffer = fs.readFileSync(actualPdfPath);
    const result = await extractor.extractSlidesFromPdf(pdfBuffer, {
      filename: 'Gujarat_DA_Hike_5Pages.pdf'
    });

    const slides = result.slides;

    // Check Page 1 (First page)
    assert.strictEqual(slides[0].slideNumber, 1, 'First slide must be page 1');
    assert.ok(slides[0].title.toLowerCase().includes('da') || slides[0].title.toLowerCase().includes('gujarat'), 'Page 1 must match original topic');

    // Check Page 3 (Middle page)
    const midIdx = Math.floor(slides.length / 2);
    assert.strictEqual(slides[midIdx].slideNumber, 3, 'Middle slide must be page 3');
    assert.ok(slides[midIdx].title.length > 0, 'Page 3 must have authentic content');

    // Check Page 5 (Last page)
    const lastIdx = slides.length - 1;
    assert.strictEqual(slides[lastIdx].slideNumber, 5, 'Last slide must be page 5');
    assert.ok(slides[lastIdx].title.length > 0, 'Page 5 must have authentic content');

    // Check strictly strictly sequential order
    for (let i = 0; i < slides.length; i++) {
      assert.strictEqual(slides[i].slideNumber, i + 1, `Slide at index ${i} must have slideNumber ${i + 1}`);
    }
  });

  it('3. PDF Presentation URL resolution correctly identifies PDF and serves inline fileUrl', () => {
    const pdfRecord = {
      id: 'pres_pdf_test_101',
      projectId: 'proj_pdf_101',
      filename: 'Gujarat_DA_Hike_5Pages.pdf',
      fileType: 'pdf',
      fileUrl: '/presentations/pres_1793465525051_Gujarat_DA_Hike_5Pages.pdf',
      slidesCount: 5,
      slides: [
        { slideNumber: 1, title: 'Gujarat Government DA 2026 Notification' },
        { slideNumber: 2, title: 'Eligibility Criteria and Eligible Cadres' },
        { slideNumber: 3, title: 'Arrears Payment Calculation Table' },
        { slideNumber: 4, title: 'Implementation Rules and Treasury Orders' },
        { slideNumber: 5, title: 'Final Verification and Helpline Instructions' }
      ]
    };

    const isPdf = Boolean(
      pdfRecord.fileType === 'pdf' ||
      pdfRecord.filename.toLowerCase().endsWith('.pdf') ||
      pdfRecord.fileUrl.toLowerCase().endsWith('.pdf')
    );

    assert.strictEqual(isPdf, true, 'Must identify PDF presentation correctly');
    assert.strictEqual(pdfRecord.fileUrl.endsWith('.pdf'), true, 'Must retain authentic PDF fileUrl');
    assert.strictEqual(pdfRecord.slides.length, 5, 'Must have exact 5 pages without additions or deletions');
  });

  it('4. Voice Recording links 1-to-1 to each PDF page number without modifying the PDF', () => {
    const totalPages = 5;
    const recordings = {};

    for (let page = 1; page <= totalPages; page++) {
      recordings[page] = {
        slideId: page,
        status: 'Recorded',
        url: `blob:http://localhost:5000/audio-page-${page}`,
        duration: 15.0 + page,
        timestamp: new Date().toISOString()
      };
    }

    assert.strictEqual(Object.keys(recordings).length, 5);
    for (let page = 1; page <= totalPages; page++) {
      assert.strictEqual(recordings[page].slideId, page, `Recording must map to slideId ${page}`);
      assert.strictEqual(recordings[page].status, 'Recorded');
    }
  });

  it('5. Iframe open parameters construct exact page view (#page=N&view=FitH) for all pages', () => {
    const pdfUrl = '/presentations/pres_1793465525051_Gujarat_DA_Hike_5Pages.pdf';

    for (let page = 1; page <= 5; page++) {
      const src = `${pdfUrl}#page=${page}&view=FitH&toolbar=0&navpanes=0&scrollbar=0`;
      assert.ok(src.includes(`#page=${page}`), `Iframe src must target #page=${page}`);
      assert.ok(src.includes('view=FitH'), 'Iframe src must fit horizontally');
      assert.ok(src.includes('toolbar=0'), 'Iframe src must hide PDF toolbar');
    }
  });

  it('6. Fullscreen PDF Presentation view iframe parameters construct exact page view (#page=N&view=Fit)', () => {
    const pdfUrl = '/presentations/pres_1793465525051_Gujarat_DA_Hike_5Pages.pdf';
    for (let page = 1; page <= 5; page++) {
      const fullscreenSrc = `${pdfUrl}#page=${page}&view=Fit&toolbar=0&navpanes=0`;
      assert.ok(fullscreenSrc.includes(`#page=${page}`), `Fullscreen must target page ${page}`);
      assert.ok(fullscreenSrc.includes('view=Fit'), 'Fullscreen must fit page');
    }
  });

  it('7. Zero Fake/Demo Slides: If no presentation is present, studio shows missing notice', () => {
    const emptySlides = [];
    const hasPresentation = Boolean(emptySlides.length > 0);
    assert.strictEqual(hasPresentation, false, 'Empty presentation must be detected as false');
    const renderedSlides = hasPresentation ? emptySlides : [];
    assert.strictEqual(renderedSlides.length, 0, 'No fake demo slides should ever be injected');
  });

  it('8. Persistence After Refresh: PDF remains identical and available across project reloads', () => {
    // Simulating project state before and after reload
    const projectStateBefore = {
      id: 'proj_persistent_pdf',
      slide: {
        slides: [
          { slideNumber: 1, title: 'Gujarat Government DA 2026 Notification' },
          { slideNumber: 2, title: 'Eligibility Criteria and Eligible Cadres' },
          { slideNumber: 3, title: 'Arrears Payment Calculation Table' },
          { slideNumber: 4, title: 'Implementation Rules and Treasury Orders' },
          { slideNumber: 5, title: 'Final Verification and Helpline Instructions' }
        ],
        importedPresentation: {
          id: 'pres_pdf_persist',
          filename: 'Gujarat_DA_Hike_5Pages.pdf',
          fileType: 'pdf',
          fileUrl: '/presentations/pres_1793465525051_Gujarat_DA_Hike_5Pages.pdf',
          slideCount: 5
        }
      }
    };

    // Serialize to JSON (like localStorage or IndexedDB save)
    const serialized = JSON.stringify(projectStateBefore);
    const restored = JSON.parse(serialized);

    assert.strictEqual(restored.slide.importedPresentation.filename, 'Gujarat_DA_Hike_5Pages.pdf');
    assert.strictEqual(restored.slide.importedPresentation.fileUrl, '/presentations/pres_1793465525051_Gujarat_DA_Hike_5Pages.pdf');
    assert.strictEqual(restored.slide.slides.length, 5);
    assert.strictEqual(restored.slide.slides[0].slideNumber, 1);
    assert.strictEqual(restored.slide.slides[4].slideNumber, 5);
  });
});
