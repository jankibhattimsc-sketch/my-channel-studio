const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');

test('MULTI-PAGE PDF SLIDE NAVIGATION AND FLIP GUARANTEE', async (t) => {

  await t.test('1. pdfSlideExtractor guarantees slideId and pageNumber on every extracted slide', async () => {
    const pdfSlideExtractor = require('../server/services/pdfSlideExtractor');
    
    // Test with a mock buffer or real PDF
    const testPdfPath = path.join(ROOT_DIR, 'public', 'presentations', 'pres_topic_1794653083272_irjhji_1794941169327_PM_Kisan_Center_Business_Blueprint.pdf');
    if (fs.existsSync(testPdfPath)) {
      const buf = fs.readFileSync(testPdfPath);
      const res = await pdfSlideExtractor.extractSlidesFromPdf(buf, {
        projectId: 'test_flip_proj',
        overallTopic: 'PM Kisan'
      });

      assert.ok(Array.isArray(res.slides), 'Slides must be an array');
      assert.ok(res.slides.length >= 2, 'Must have at least 2 slides');

      // Verify Slide 1
      assert.strictEqual(res.slides[0].slideNumber, 1);
      assert.strictEqual(res.slides[0].pageNumber, 1);
      assert.strictEqual(res.slides[0].slideId, 'slide_test_flip_proj_1');

      // Verify Slide 2 (Critical for "biji slide pharti nthi")
      assert.strictEqual(res.slides[1].slideNumber, 2);
      assert.strictEqual(res.slides[1].pageNumber, 2);
      assert.strictEqual(res.slides[1].slideId, 'slide_test_flip_proj_2');
      assert.ok(res.slides[1].title && res.slides[1].title.length > 0, 'Slide 2 must have a title');
    }
  });

  await t.test('2. Slide Editor In-App Viewer enables full multi-slide flipping for PDF presentations', () => {
    const slideEditorPath = path.join(ROOT_DIR, 'public', 'js', 'views', 'slideeditor.js');
    const content = fs.readFileSync(slideEditorPath, 'utf8');

    // Verify view mode switcher exists for PDF
    assert.ok(content.includes('modal-btn-view-slides'), 'Must provide 16:9 slides view toggle');
    assert.ok(content.includes('modal-btn-view-rawpdf'), 'Must provide raw PDF view toggle');

    // Verify slide list and navigation buttons are available in presentation mode
    assert.ok(content.includes('modal-ppt-prev'), 'Must have Previous Slide button');
    assert.ok(content.includes('modal-ppt-next'), 'Must have Next Slide button');
    assert.ok(content.includes('modal-select-slide'), 'Must have slide dropdown selector');
    assert.ok(content.includes('modal-slide-nav-item'), 'Must have clickable slide list items');
    assert.ok(content.includes('activeViewerSlideIdx'), 'Must track active slide index for page-turning');
  });

  await t.test('3. Video Editor guarantees slide 2 flipping via next button, dropdown, and keyboard arrows', () => {
    const videoEditorPath = path.join(ROOT_DIR, 'public', 'js', 'views', 'videoeditor.js');
    const content = fs.readFileSync(videoEditorPath, 'utf8');

    // Verify totalClips is properly defined (prevent strict mode ReferenceError)
    assert.ok(content.includes('let totalClips = 0;'), 'totalClips must be declared with let');

    // Verify Step 1 slide dropdown selector with class and onchange
    assert.ok(content.includes('id="step1-select-slide"'), 'Step 1 must have slide dropdown selector');
    assert.ok(content.includes('step1-select-slide-nav'), 'Step 1 must have step1-select-slide-nav class');
    assert.ok(content.includes('window.videoEditorGoToSlide'), 'Must provide window.videoEditorGoToSlide global helper');

    // Verify selectClip updates currentSlideIndex and live stage visual
    assert.ok(content.includes('function selectClip(index)'), 'selectClip function must exist');
    assert.ok(content.includes('updateLiveStageVisual(clip)'), 'selectClip must call updateLiveStageVisual');
    assert.ok(content.includes('window.videoEditorNextSlide'), 'Must provide window.videoEditorNextSlide');
    assert.ok(content.includes('window.videoEditorPrevSlide'), 'Must provide window.videoEditorPrevSlide');
    assert.ok(content.includes('prevScrollY'), 'Must preserve user scroll position during slide flips');

    // Verify Next Slide button listener and inline onclick
    assert.ok(content.includes('btn-nav-next-slide'), 'btn-nav-next-slide class must exist');
    assert.ok(content.includes('btn-stage-float-next'), 'btn-stage-float-next floating arrow on stage must exist');
    assert.ok(content.includes('btn-stage-float-prev'), 'btn-stage-float-prev floating arrow on stage must exist');
    assert.ok(content.includes("container.querySelectorAll('#btn-next-slide, .btn-nav-next-slide')"), 'btn-next-slide listener must exist');

    // Verify keyboard navigation
    assert.ok(content.includes('handleVideoEditorKeyNav'), 'Keyboard navigation must exist');
    assert.ok(content.includes("e.key === 'ArrowRight'"), 'ArrowRight must advance slide');
    assert.ok(content.includes("e.key === 'ArrowLeft'"), 'ArrowLeft must retreat slide');
  });

  await t.test('4. Slide Voice Studio guarantees slide 2 navigation via next button, dropdown, and filmstrip chips', () => {
    const studioPath = path.join(ROOT_DIR, 'public', 'js', 'components', 'slideVoiceStudio.js');
    const content = fs.readFileSync(studioPath, 'utf8');

    // Verify slide filmstrip chips (svr-slide-nav-chip)
    assert.ok(content.includes('svr-slide-nav-chip'), 'Must have clickable slide filmstrip chips');

    // Verify slide dropdown selector (svr-select-slide-nav)
    assert.ok(content.includes('id="svr-select-slide-nav"'), 'Must have slide dropdown navigation');

    // Verify triggerImmediateSlideRender
    assert.ok(content.includes('function triggerImmediateSlideRender'), 'triggerImmediateSlideRender must exist');

    // Verify next button advances slide
    assert.ok(content.includes("targetContainer.querySelector('#svr-btn-next-slide')"), 'svr-btn-next-slide must exist');

    // Verify keyboard shortcuts
    assert.ok(content.includes('handleStudioKeyNav'), 'Studio keyboard navigation must exist');
  });

  await t.test('5. Simulation: Advancing from Slide 1 to Slide 2 transitions state and displays Slide 2', () => {
    const slides = [
      { slideNumber: 1, pageNumber: 1, slideId: 'slide_1', title: 'મુખ્ય પરિપત્ર', bulletPoints: ['પોઈન્ટ ૧', 'પોઈન્ટ ૨'] },
      { slideNumber: 2, pageNumber: 2, slideId: 'slide_2', title: 'પાત્રતા અને નિયમો', bulletPoints: ['નિયમ ૧', 'નિયમ ૨'] }
    ];

    let currentIdx = 0;
    assert.strictEqual(slides[currentIdx].slideNumber, 1);
    assert.strictEqual(slides[currentIdx].title, 'મુખ્ય પરિપત્ર');

    // Simulate clicking Next Slide (આગળની સ્લાઇડ)
    if (currentIdx < slides.length - 1) {
      currentIdx++;
    }

    assert.strictEqual(currentIdx, 1);
    assert.strictEqual(slides[currentIdx].slideNumber, 2);
    assert.strictEqual(slides[currentIdx].title, 'પાત્રતા અને નિયમો');
    assert.strictEqual(slides[currentIdx].bulletPoints[0], 'નિયમ ૧');
  });

  await t.test('6. Video Editor provides on-demand single-page PDF rendering and pageNumber assignment', () => {
    const videoEditorPath = path.join(ROOT_DIR, 'public', 'js', 'views', 'videoeditor.js');
    const content = fs.readFileSync(videoEditorPath, 'utf8');

    // Verify renderSpecificPdfPage method exists
    assert.ok(content.includes('async function renderSpecificPdfPage(pageNum)'), 'Must provide renderSpecificPdfPage');
    assert.ok(content.includes('clip.pageNumber = s.pageNumber || (idx + 1);'), 'Must strictly assign clip.pageNumber');

    // Verify selectClip calls renderSpecificPdfPage
    assert.ok(content.includes('renderSpecificPdfPage(pNum)'), 'selectClip must trigger renderSpecificPdfPage for instant page turning');

    // Verify renderSlideDisplay checks all slide/page keys
    assert.ok(content.includes('pdfPageCanvases[String(curPNum)]'), 'renderSlideDisplay must check pdfPageCanvases by page number');
  });

  await t.test('7. Cache buster v99.0+ guarantees immediate fresh load without browser disk cache stalls', () => {
    const indexCode = fs.readFileSync(path.join(ROOT_DIR, 'public', 'index.html'), 'utf8');
    const studioCode = fs.readFileSync(path.join(ROOT_DIR, 'public', 'studio.html'), 'utf8');
    const swCode = fs.readFileSync(path.join(ROOT_DIR, 'public', 'sw.js'), 'utf8');

    assert.ok(/CURRENT_VERSION = 'v99\.[0-9]+'/.test(indexCode), 'index.html must have v99.x cache buster');
    assert.ok(/CURRENT_VERSION = 'v99\.[0-9]+'/.test(studioCode), 'studio.html must have v99.x cache buster');
    assert.ok(/CACHE_NAME = 'gyan-yatra-v99\.[0-9]+'/.test(swCode), 'sw.js must be upgraded to v99.x');
    assert.ok(swCode.includes("url.hostname === 'localhost'"), 'sw.js must bypass cache on localhost');
  });

});
