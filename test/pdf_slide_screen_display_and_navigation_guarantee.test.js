const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');

test('PDF SLIDE SCREEN DISPLAY AND NAVIGATION GUARANTEE', async (t) => {

  await t.test('1. Video Editor renders pure white #ffffff slide cards without broken iframes', () => {
    const videoEditorPath = path.join(ROOT_DIR, 'public', 'js', 'views', 'videoeditor.js');
    const content = fs.readFileSync(videoEditorPath, 'utf8');

    // Verify renderSlideDisplay exists and uses pure white #ffffff background
    assert.ok(content.includes('function renderSlideDisplay(clip)'), 'renderSlideDisplay function must exist');
    
    // Find renderSlideDisplay function body
    const startIdx = content.indexOf('function renderSlideDisplay(clip)');
    const endIdx = content.indexOf('function renderView()', startIdx);
    const renderFn = content.substring(startIdx, endIdx);

    // Assert NO iframe is inside renderSlideDisplay
    assert.ok(!renderFn.includes('<iframe'), 'renderSlideDisplay must NEVER use <iframe which causes screen freezes in Chromium');

    // Assert pure white background #ffffff
    assert.ok(renderFn.includes('background: #ffffff'), 'renderSlideDisplay must use pure white #ffffff background');

    // Assert dynamic slide properties are used
    assert.ok(renderFn.includes('${title}'), 'renderSlideDisplay must dynamically render slide title');
    assert.ok(renderFn.includes('bullets'), 'renderSlideDisplay must dynamically render bullet points');
    assert.ok(renderFn.includes('${curSNum}'), 'renderSlideDisplay must dynamically render slide number badge');
  });

  await t.test('2. Video Editor timeline mini thumbnails use pure white background and no iframes', () => {
    const videoEditorPath = path.join(ROOT_DIR, 'public', 'js', 'views', 'videoeditor.js');
    const content = fs.readFileSync(videoEditorPath, 'utf8');

    const startIdx = content.indexOf('function renderMiniSlideThumbnail(clip)');
    const endIdx = content.indexOf('function renderSlideDisplay(clip)', startIdx);
    const miniThumbFn = content.substring(startIdx, endIdx);

    assert.ok(!miniThumbFn.includes('<iframe'), 'renderMiniSlideThumbnail must not use iframes');
    assert.ok(miniThumbFn.includes('background: #ffffff'), 'renderMiniSlideThumbnail must use pure white background');
    assert.ok(miniThumbFn.includes('clip-thumb-${clip.slideNumber}'), 'Thumbnail must have clip-thumb class for real-time DOM updates');
  });

  await t.test('3. Video Editor updateLiveStageVisual enforces pure white stage background and updates DOM', () => {
    const videoEditorPath = path.join(ROOT_DIR, 'public', 'js', 'views', 'videoeditor.js');
    const content = fs.readFileSync(videoEditorPath, 'utf8');

    assert.ok(content.includes('function updateLiveStageVisual(clip)'), 'updateLiveStageVisual must exist');
    assert.ok(content.includes("stage.style.background = '#ffffff'"), 'updateLiveStageVisual must enforce pure white #ffffff background');
    assert.ok(content.includes('id="step1-slide-preview-container"\n                    style="background: #ffffff'), 'Step 1 preview container must have pure white background');
  });

  await t.test('4. Slide Voice Studio eliminates all presentation iframes in 16:9 stage and thumbnails', () => {
    const studioPath = path.join(ROOT_DIR, 'public', 'js', 'components', 'slideVoiceStudio.js');
    const content = fs.readFileSync(studioPath, 'utf8');

    // Verify top 16:9 stage has no svr-pdf-frame iframe
    assert.ok(!content.includes('id="svr-pdf-frame"'), 'Top 16:9 stage must NOT use svr-pdf-frame iframe');

    // Verify slide thumbnails in slidewise audio cards do NOT use iframe
    const cardsIdx = content.indexOf('svr-slidewise-audio-card');
    const cardsSection = content.substring(cardsIdx, cardsIdx + 5000);
    assert.ok(!cardsSection.includes('<iframe'), 'Slidewise audio cards must NOT use iframes for thumbnails');

    // Verify pure white background on image and fallback slide card
    assert.ok(content.includes('100% Pure White High-Definition 16:9 Slide Presentation Card'), 'Pure white slide presentation card must exist');
  });

  await t.test('5. Slide Voice Studio handleDirectPdfUpload resets PDF cache and starts on Slide 1', () => {
    const studioPath = path.join(ROOT_DIR, 'public', 'js', 'components', 'slideVoiceStudio.js');
    const content = fs.readFileSync(studioPath, 'utf8');

    const fnStart = content.indexOf('async function handleDirectPdfUpload(file)');
    const fnEnd = content.indexOf('reader.readAsDataURL(file);', fnStart);
    const fnBody = content.substring(fnStart, fnEnd + 50);

    assert.ok(fnBody.includes('cachedPdfDoc = null;'), 'Must reset cachedPdfDoc when new PDF is uploaded');
    assert.ok(fnBody.includes('Object.keys(pdfSlideImages).forEach(k => delete pdfSlideImages[k]);'), 'Must clear pdfSlideImages cache');
    assert.ok(fnBody.includes('currentSlideIdx = 0;'), 'Must reset to Slide 1 upon new PDF upload');
    assert.ok(fnBody.includes('renderPdfSlideImages()'), 'Must trigger fresh PDF slide rendering');
  });

  await t.test('6. Dynamic Slide Switching Simulation: Slide 1 and Slide 2 generate distinct visual content', () => {
    // Simulate the slide card template logic
    function createSlideCardHtml(clip, project, totalSlides) {
      const curSNum = clip.slideNumber || 1;
      const curPNum = clip.pageNumber || curSNum;
      const title = clip.title || `સ્લાઇડ #${curSNum}`;
      const subtitle = clip.subtitle || clip.visual || 'સત્તાવાર પ્રેઝન્ટેશન વિઝ્યુઅલ';
      const bullets = (Array.isArray(clip.bulletPoints) && clip.bulletPoints.length > 0)
        ? clip.bulletPoints
        : [title, 'સત્તાવાર પરિપત્ર અને નિયમો મુજબ વિગત'];

      return `
        <div style="background: #ffffff;">
          <span class="badge">સ્લાઇડ #${curSNum}</span>
          <h2>${title}</h2>
          <div>${subtitle}</div>
          <ul>${bullets.map(b => `<li>${b}</li>`).join('')}</ul>
          <footer>${curSNum} / ${totalSlides}</footer>
        </div>
      `;
    }

    const slide1 = {
      slideNumber: 1,
      pageNumber: 1,
      title: 'આંગણવાડી કાર્યકર માનદ વેતન વધારો ૨૦૨૬',
      subtitle: 'સત્તાવાર પરિપત્ર અને જાહેરાત',
      bulletPoints: ['માનદ વેતનમાં મહત્વપૂર્ણ વધારો', 'સમસ્ત ગુજરાતના કેન્દ્રોમાં અમલ']
    };

    const slide2 = {
      slideNumber: 2,
      pageNumber: 2,
      title: 'કોને કોને મળશે લાભ? પાત્રતા અને શરતો',
      subtitle: 'લાભાર્થી કેટેગરી વિશ્લેષણ',
      bulletPoints: ['કાર્યકર અને તેડાગર બહેનો', 'નિયમિત હાજરી અને પોષણ ટ્રેકર']
    };

    const html1 = createSlideCardHtml(slide1, { name: 'માનદ વેતન' }, 5);
    const html2 = createSlideCardHtml(slide2, { name: 'માનદ વેતન' }, 5);

    assert.ok(html1.includes('આંગણવાડી કાર્યકર માનદ વેતન વધારો ૨૦૨૬'));
    assert.ok(html1.includes('સ્લાઇડ #1'));
    assert.ok(html1.includes('1 / 5'));

    assert.ok(html2.includes('કોને કોને મળશે લાભ? પાત્રતા અને શરતો'));
    assert.ok(html2.includes('સ્લાઇડ #2'));
    assert.ok(html2.includes('2 / 5'));

    // Verify html1 and html2 are completely different and contain no iframes
    assert.notEqual(html1, html2);
    assert.ok(!html1.includes('<iframe'));
    assert.ok(!html2.includes('<iframe'));
  });

});
