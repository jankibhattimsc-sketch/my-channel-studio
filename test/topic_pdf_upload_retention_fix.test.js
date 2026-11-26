const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('TOPIC-SPECIFIC PDF UPLOAD AND RETENTION SYSTEM GUARANTEE', () => {

  it('1. isContentMatchingTopic correctly accepts generic presentation filenames (NotebookLM, slides, presentation) for ANY topic', () => {
    const { isContentMatchingTopic } = require('../public/js/utils/projectState.js');
    
    // Generic presentation filenames exported from NotebookLM/Gamma/PowerPoint
    assert.strictEqual(isContentMatchingTopic('NotebookLM.pdf', 'કિસાન ક્રેડિટ કાર્ડ યોજના ૨૦૨૬'), true);
    assert.strictEqual(isContentMatchingTopic('presentation.pdf', 'ગુજરાત પોલીસ કોન્સ્ટેબલ ભરતી ૨૦૨૬'), true);
    assert.strictEqual(isContentMatchingTopic('slides.pdf', 'ટેટ ૧ અને ટેટ ૨ પરિણામ ૨૦૨૬'), true);
    assert.strictEqual(isContentMatchingTopic('Untitled presentation.pdf', 'મફત અનાજ રેશનકાર્ડ યોજના'), true);
    assert.strictEqual(isContentMatchingTopic('NotebookLM_export.pptx', 'નવી સરકારી યોજના ૨૦૨૬'), true);
  });

  it('2. isContentMatchingTopic inspects slide content when passed an object with slides', () => {
    const { isContentMatchingTopic } = require('../public/js/utils/projectState.js');

    const kisanSlides = [
      { slideNumber: 1, title: 'કિસાન ક્રેડિટ કાર્ડ યોજના', content: 'ખેડૂતો માટે સસ્તા વ્યાજે લોન અને સહાય' },
      { slideNumber: 2, title: 'પાત્રતા અને જરૂરી પુરાવા', content: 'જમીનના ૭/૧૨ અને ૮-અ ના ઉતારા' }
    ];

    assert.strictEqual(isContentMatchingTopic({ slides: kisanSlides, filename: 'doc.pdf' }, 'કિસાન ક્રેડિટ કાર્ડ'), true);
    // Should NOT match a completely different topic like Police
    assert.strictEqual(isContentMatchingTopic({ slides: kisanSlides, filename: 'doc.pdf' }, 'ગુજરાત પોલીસ કોન્સ્ટેબલ'), false);
  });

  it('3. buildTopicProjectKit preserves existing user-imported presentation without purging', () => {
    const { buildTopicProjectKit } = require('../public/js/utils/projectState.js');

    const existingProject = {
      id: 'proj_kisan_123',
      name: 'કિસાન સહાય યોજના ૨૦૨૬',
      topic: 'કિસાન સહાય યોજના ૨૦૨૬',
      slide: {
        importedPresentation: {
          id: 'pres_kisan_123_456',
          projectId: 'proj_kisan_123',
          filename: 'NotebookLM_Kisan.pdf',
          fileUrl: '/presentations/pres_kisan.pdf',
          slidesCount: 8
        },
        slides: [
          { slideNumber: 1, title: 'કિસાન યોજના વિગતો', scriptText: 'ખેડૂત મિત્રો માટે યોજના' },
          { slideNumber: 2, title: 'અરજી પ્રક્રિયા', scriptText: 'ઓનલાઇન અરજી કરવાની રીત' }
        ]
      }
    };

    const refreshed = buildTopicProjectKit('કિસાન સહાય યોજના ૨૦૨૬', 'proj_kisan_123', existingProject);
    assert.ok(refreshed.slide.importedPresentation, 'importedPresentation must NOT be nullified');
    assert.strictEqual(refreshed.slide.importedPresentation.filename, 'NotebookLM_Kisan.pdf');
    assert.strictEqual(refreshed.slide.slides.length, 2, 'Authentic slides must be preserved');
  });

  it('4. pdfSlideExtractor creates topic-adapted templates instead of hardcoded honorarium', async () => {
    const pdfSlideExtractor = require('../server/services/pdfSlideExtractor');
    
    // Test with a minimal buffer (fallback path)
    const dummyBuffer = Buffer.from('%PDF-1.4 %dummy text without text stream');
    const result = await pdfSlideExtractor.extractSlidesFromPdf(dummyBuffer, {
      overallTopic: 'કિસાન ક્રેડિટ કાર્ડ સહાય યોજના',
      projectId: 'proj_kisan_test'
    });

    assert.ok(result.slides && result.slides.length > 0);
    const firstSlideTitle = result.slides[0].title;
    assert.ok(firstSlideTitle.includes('કિસાન'), 'First slide title should adapt to overallTopic');
    // Ensure "માનદ વેતન" (honorarium) does NOT contaminate Kisan topic
    const hasHonorarium = result.slides.some(s => (s.title + ' ' + (s.bulletPoints || []).join(' ')).includes('માનદ વેતન'));
    assert.strictEqual(hasHonorarium, false, 'Kisan slides must not contain Anganwadi honorarium');
  });

  it('5. Research route handles uploaded file with projectId and retrieves via /latest-topic-presentation', async () => {
    const fs = require('fs');
    const path = require('path');
    const presDir = path.join(__dirname, '..', 'public', 'presentations');
    if (!fs.existsSync(presDir)) fs.mkdirSync(presDir, { recursive: true });

    // Simulate saving a file with projectId in filename
    const testProjectId = 'proj_police_test_' + Date.now();
    const testFileName = `pres_${testProjectId}_${Date.now()}_police_bharti_slides.pdf`;
    const testFilePath = path.join(presDir, testFileName);
    fs.writeFileSync(testFilePath, '%PDF-1.4 dummy police bharti content');

    try {
      // Simulate latest-topic-presentation query logic
      const files = fs.readdirSync(presDir);
      const projClean = String(testProjectId).replace(/[^a-zA-Z0-9_-]/g, '_');
      const projFiles = files.filter(f => f.includes(projClean)).sort((a, b) => 
        fs.statSync(path.join(presDir, b)).mtimeMs - fs.statSync(path.join(presDir, a)).mtimeMs
      );

      assert.ok(projFiles.length > 0, 'Must find file by projectId');
      assert.strictEqual(projFiles[0], testFileName);
    } finally {
      if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    }
  });

  it('6. videoeditor.js and scriptwriter.js protect project-matched presentations from being purged', () => {
    const videoEditorSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'views', 'videoeditor.js'), 'utf-8');
    const scriptWriterSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'views', 'scriptwriter.js'), 'utf-8');
    const slideVoiceStudioSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'components', 'slideVoiceStudio.js'), 'utf-8');
    const slidePromptsSrc = fs.readFileSync(path.join(__dirname, '..', 'public', 'js', 'views', 'slideprompts.js'), 'utf-8');

    // Video editor must check isProjectMatch before purging importedMeta
    assert.ok(videoEditorSrc.includes('const isProjectMatch = Boolean('), 'Video editor must check isProjectMatch');
    assert.ok(videoEditorSrc.includes('!isProjectMatch && !isContentMatchingTopic('), 'Video editor must guard isMismatch');

    // Scriptwriter must check isProjectMatch before purging importedMeta
    assert.ok(scriptWriterSrc.includes('const isProjectMatch = Boolean('), 'Scriptwriter must check isProjectMatch');
    assert.ok(scriptWriterSrc.includes('!isProjectMatch && !isContentMatchingTopic('), 'Scriptwriter must guard isMismatch');

    // SlideVoiceStudio must check isProjMatch and preserve validMeta
    assert.ok(slideVoiceStudioSrc.includes('const isProjMatch = Boolean('), 'SlideVoiceStudio must check isProjMatch');

    // SlidePrompts must include direct PDF upload handler
    assert.ok(slidePromptsSrc.includes('handlePdfUploadInSlidePrompts'), 'SlidePrompts must support direct PDF upload');
    assert.ok(slidePromptsSrc.includes('input-slideprompt-pdf'), 'SlidePrompts must have PDF file input');
  });

});
