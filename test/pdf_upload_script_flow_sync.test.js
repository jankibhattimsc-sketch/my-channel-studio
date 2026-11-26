const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const pdfSlideExtractor = require('../server/services/pdfSlideExtractor');
const db = require('../server/db');

describe('PDF PROCESSING & SCRIPT EXTRACTION PIPELINE', () => {
  it('1. Image-only PDF with 0 fonts enriches slides from existing project script in database', async () => {
    const pdfPath = path.join(__dirname, '..', 'public', 'presentations', 'pres_1793731159887_Gujarat_Anganwadi_Pay_Reform_2026.pdf');
    if (!fs.existsSync(pdfPath)) {
      console.log('Skipping test 1 as sample PDF file not on disk');
      return;
    }

    const buf = fs.readFileSync(pdfPath);
    const result = await pdfSlideExtractor.extractSlidesFromPdf(buf, {
      filename: 'Gujarat_Anganwadi_Pay_Reform_2026.pdf',
      projectId: 'proj_1793436207566_h4ew'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.slides.length, 9);

    // Slide 1 should have rich script text from the saved database script
    const slide1 = result.slides[0];
    assert.ok(slide1.scriptText && slide1.scriptText.length > 50, 'Slide 1 should contain authentic Gujarati script');
    assert.ok(slide1.scriptText.includes('ગુજરાતી') || slide1.scriptText.includes('આંગણવાડી') || slide1.scriptText.includes('જ્ઞાન યાત્રા'), 'Script text should mention channel or authentic topic');

    // Slide 2 should have the exact topic heading from the database script
    const slide2 = result.slides[1];
    assert.ok(slide2.title.includes('પૃષ્ઠભૂમિ') || slide2.title.includes('પગાર'), `Slide 2 title should be meaningful, got: ${slide2.title}`);
    assert.ok(slide2.bulletPoints.length > 0, 'Slide 2 should have extracted bullet points');
  });

  it('2. Image-only PDF without existing script generates structured Gujarati slide titles and points', async () => {
    const pdfPath = path.join(__dirname, '..', 'public', 'presentations', 'pres_1793731159887_Gujarat_Anganwadi_Pay_Reform_2026.pdf');
    if (!fs.existsSync(pdfPath)) {
      return;
    }

    const buf = fs.readFileSync(pdfPath);
    const result = await pdfSlideExtractor.extractSlidesFromPdf(buf, {
      filename: 'New_Gujarat_Govt_GR_2026.pdf',
      projectId: 'proj_brand_new_no_script_xyz'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.slides.length, 9);

    // Should NOT have blank titles or empty content
    result.slides.forEach((slide, idx) => {
      assert.ok(slide.title && slide.title.length > 3, `Slide ${idx + 1} should have valid title`);
      assert.ok(slide.bulletPoints && slide.bulletPoints.length > 0, `Slide ${idx + 1} should have bullet points`);
      assert.ok(slide.scriptText && slide.scriptText.length > 10, `Slide ${idx + 1} should have script text`);
    });
  });

  it('3. slideeditor.js sends projectId and saves extracted script to DB if missing', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'views', 'slideeditor.js'), 'utf-8');
    assert.ok(code.includes('projectId: project.id'), 'slideeditor.js must pass projectId to upload-file');
    assert.ok(code.includes('saveScriptToDatabase'), 'slideeditor.js must import and call saveScriptToDatabase');
  });

  it('4. scriptwriter.js queries getProjectPresentation and preserves rich scripts on new PDF upload', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'views', 'scriptwriter.js'), 'utf-8');
    assert.ok(code.includes('getProjectPresentation'), 'scriptwriter.js must import getProjectPresentation');
    assert.ok(code.includes('projectId: project.id'), 'scriptwriter.js must pass projectId to upload-file');
    assert.ok(code.includes('existingSections'), 'scriptwriter.js must preserve rich existing script sections');
  });

  it('5. slideVoiceStudio.js reloads presentation from IndexedDB and syncs script sections', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'components', 'slideVoiceStudio.js'), 'utf-8');
    assert.ok(code.includes('projectId: activeProj.id'), 'slideVoiceStudio.js must pass projectId');
    assert.ok(code.includes('sec.title || sec.sectionName'), 'slideVoiceStudio.js must sync title from script sections');
  });

  it('6. videoeditor.js syncs script with database and updates script on new PDF upload', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'views', 'videoeditor.js'), 'utf-8');
    assert.ok(code.includes('syncProjectScriptWithDatabase'), 'videoeditor.js must sync script with database');
    assert.ok(code.includes('projectId: project.id'), 'videoeditor.js must pass projectId in handlePdfUploadInVideoEditor');
  });
});

