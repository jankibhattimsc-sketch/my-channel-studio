const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('STEP 6 THUMBNAIL STUDIO & STEP 7 SEO, TITLE & DESCRIPTION INTEGRATION', () => {
  const rootDir = process.cwd();

  it('1. Step 6 (Thumbnail) and Step 7 (SEO) exist in index.html desktop & mobile navigation', () => {
    const indexPath = path.join(rootDir, 'public', 'index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    // Desktop nav
    assert.ok(indexContent.includes('id="nav-thumbnails"'), 'index.html must have id="nav-thumbnails"');
    assert.ok(indexContent.includes('data-view="thumbnails"'), 'index.html must have data-view="thumbnails"');
    assert.ok(indexContent.includes('Thumbnail'), 'index.html must show Thumbnail');
    assert.ok(indexContent.includes('id="nav-seo"'), 'index.html must have id="nav-seo"');
    assert.ok(indexContent.includes('data-view="seodescription"'), 'index.html must have data-view="seodescription"');
    assert.ok(indexContent.includes('SEO'), 'index.html must show SEO');

    // Mobile nav
    assert.ok(indexContent.includes('Thumb'), 'index.html mobile nav must have Thumb');
    assert.ok(indexContent.includes('SEO'), 'index.html mobile nav must have SEO');
  });

  it('2. Step 6 and Step 7 exist in studio.html navigation', () => {
    const studioPath = path.join(rootDir, 'public', 'studio.html');
    const studioContent = fs.readFileSync(studioPath, 'utf-8');

    assert.ok(studioContent.includes('id="nav-thumbnails"'), 'studio.html must have id="nav-thumbnails"');
    assert.ok(studioContent.includes('id="nav-seo"'), 'studio.html must have id="nav-seo"');
    assert.ok(studioContent.includes('Thumbnail'), 'studio.html must show Thumbnail step');
    assert.ok(studioContent.includes('SEO'), 'studio.html must show SEO step');
  });

  it('3. app.js routes thumbnails and seodescription views cleanly', () => {
    const appPath = path.join(rootDir, 'public', 'js', 'app.js');
    const appContent = fs.readFileSync(appPath, 'utf-8');

    assert.ok(appContent.includes("renderThumbnails(this.container"), 'app.js must route to renderThumbnails');
    assert.ok(appContent.includes("renderSEODescription(this.container"), 'app.js must route to renderSEODescription');
    assert.ok(appContent.includes("'thumbnails'"), 'app.js validViews must include thumbnails');
    assert.ok(appContent.includes("'seodescription'"), 'app.js validViews must include seodescription');
  });

  it('4. thumbnails.js features pure white background (#FFFFFF) prompt with 4-5 text elements and photorealistic subject', () => {
    const thumbPath = path.join(rootDir, 'public', 'js', 'views', 'thumbnails.js');
    const thumbContent = fs.readFileSync(thumbPath, 'utf-8');

    // White background requirement
    assert.ok(thumbContent.includes('#FFFFFF'), 'thumbnails.js must enforce pure white background #FFFFFF');
    assert.ok(thumbContent.includes('white_minimalist'), 'thumbnails.js must have white_minimalist preset');

    // 4 to 5 text elements
    assert.ok(thumbContent.includes('૪ થી ૫ હાઈ-કોન્ટ્રાસ્ટ'), 'thumbnails.js blueprint must specify 4 to 5 text elements');
    assert.ok(thumbContent.includes('4 to 5 distinct elements'), 'thumbnails.js prompt must specify 4 to 5 distinct elements');

    // Photorealistic subject
    assert.ok(thumbContent.includes('strictly photorealistic subject'), 'prompt must require strictly photorealistic subject');
    assert.ok(thumbContent.includes('NO 3D cartoon'), 'prompt must ban 3D cartoon clutter');

    // Navigation buttons
    assert.ok(thumbContent.includes('btn-next-to-seo-thumb'), 'thumbnails.js must have jump button to Step 7 SEO');
  });

  it('5. seodescription.js generates 5 High-CTR titles, full formatted description, and 35 tags', () => {
    const seoPath = path.join(rootDir, 'public', 'js', 'views', 'seodescription.js');
    const seoContent = fs.readFileSync(seoPath, 'utf-8');

    // 5 High CTR titles
    assert.ok(seoContent.includes('૫ સુપરહિટ હાઇ-CTR ટાઇટલ્સ'), 'seodescription.js must generate 5 high-CTR titles');

    // Full description with timestamps
    assert.ok(seoContent.includes('સંપૂર્ણ YouTube SEO ડિસ્ક્રિપ્શન'), 'seodescription.js must generate full YouTube SEO description');
    assert.ok(seoContent.includes('વિડીયો ચેપ્ટર્સ / ટાઇમસ્ટેમ્પ્સ'), 'seodescription.js must include video chapters/timestamps');

    // 35 Tags
    assert.ok(seoContent.includes('૩૫ સર્વોચ્ચ રેન્કિંગ કીવર્ડ્સ & ટેગ્સ'), 'seodescription.js must generate 35 ranking tags');

    // Breadcrumbs
    assert.ok(seoContent.includes('btn-prev-thumb-seo'), 'seodescription.js must have back button to Step 6 Thumbnail');
  });

  it('6. videoeditor.js has direct jump button to Step 6 Thumbnail Maker', () => {
    const vePath = path.join(rootDir, 'public', 'js', 'views', 'videoeditor.js');
    const veContent = fs.readFileSync(vePath, 'utf-8');

    assert.ok(veContent.includes('btn-next-to-thumbnail-editor'), 'videoeditor.js must have btn-next-to-thumbnail-editor');
    assert.ok(veContent.includes('btn-goto-thumbnail-from-saved'), 'videoeditor.js must have btn-goto-thumbnail-from-saved');
  });
});

