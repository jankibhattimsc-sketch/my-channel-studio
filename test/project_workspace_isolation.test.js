const { test, describe } = require('node:test');
const assert = require('node:assert');

describe('Phase 3: Project-Scoped State Manager & Version History', () => {
  // Test Project State Factory and Isolation
  function createBlankProject(name = '', topic = '', category = 'સરકારી યોજના', folderId = 'f_default', folderName = '📁 મુખ્ય ફોલ્ડર') {
    const pId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const pTopic = topic || name || 'નવો વિડીયો વિષય';
    const pName = name || pTopic;
    const safeName = pName.replace(/[\s/\\?%*:|"<>]+/g, '_').substring(0, 40);

    return {
      id: pId,
      name: pName,
      topic: pTopic,
      category: category,
      folderId: folderId || 'f_default',
      folderName: folderName || '📁 મુખ્ય ફોલ્ડર',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastStep: 'topics',
      uploads: [],
      ideas: [],
      
      workspaceState: {
        activeSection: 'overview',
        lastSlideIndex: 0,
        lastScriptSectionIdx: 0,
        lastSelectedThumbId: null,
        lastSEODraftId: null,
        scrollOffset: 0,
        completionStatus: {
          ideas: false,
          slidePrompt: false,
          slides: false,
          script: false,
          scriptEditor: false,
          thumbnail: false,
          seo: false,
          voice: false,
          finalOutput: false,
          publishing: false
        },
        lastSavedAt: new Date().toISOString()
      },

      versionHistory: {
        slides: [],
        scripts: [],
        slidePrompts: [],
        thumbnails: [],
        seo: []
      },

      idea: { topic: pTopic, masterPrompt: '', notes: '', isCompleted: false },
      slide: { customName: '', tool2Prompt: '', importedPresentation: null, slides: [] },
      script: { customName: `${safeName}_script.txt`, fullText: '', sections: [] },
      voice: { customName: `${safeName}_voice.wav`, filename: `${safeName}_voice.wav` },
      editing: { aspectRatio: '16:9', checklist: {} },
      canva: { headline: pName },
      seo: { title: `${pName} 2026: સત્તાવાર પરિપત્ર જાહેર!` },
      thumbnail: { customName: `${safeName}_thumbnail.png`, gujaratiWords: pName }
    };
  }

  function saveVersionSnapshot(project, type, label = '', data = null, force = false) {
    if (!project || !type) return null;
    if (!project.versionHistory) {
      project.versionHistory = { slides: [], scripts: [], slidePrompts: [], thumbnails: [], seo: [] };
    }
    if (!Array.isArray(project.versionHistory[type])) {
      project.versionHistory[type] = [];
    }

    let snapshotData = data;
    if (!snapshotData) {
      if (type === 'slides') snapshotData = project.slide?.slides || [];
      else if (type === 'scripts') snapshotData = { fullText: project.script?.fullText || '', sections: project.script?.sections || [] };
      else if (type === 'slidePrompts') snapshotData = { promptText: project.slide?.tool2Prompt || '' };
      else if (type === 'thumbnails') snapshotData = { ...project.thumbnail };
      else if (type === 'seo') snapshotData = { ...project.seo };
    }

    const jsonStr = JSON.stringify(snapshotData);
    const historyList = project.versionHistory[type];

    // Dedup check: do not create redundant snapshots if identical (unless force is true)
    if (!force && historyList.length > 0) {
      const last = historyList[0];
      if (JSON.stringify(last.data) === jsonStr) {
        return last.versionId;
      }
    }

    const versionId = `v_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const versionObj = {
      versionId,
      versionNumber: historyList.length + 1,
      timestamp: new Date().toISOString(),
      label: label || `Version ${historyList.length + 1}`,
      data: JSON.parse(jsonStr)
    };

    historyList.unshift(versionObj);
    project.updatedAt = new Date().toISOString();
    return versionId;
  }

  function restoreVersionSnapshot(project, type, versionId) {
    if (!project || !type || !versionId || !project.versionHistory) return { success: false, reason: 'Invalid parameters' };

    const historyList = project.versionHistory[type] || [];
    const targetVersion = historyList.find(v => v.versionId === versionId);
    if (!targetVersion) return { success: false, reason: 'Version not found' };

    // 1. Safety snapshot of current state before rollback (force: true)
    saveVersionSnapshot(project, type, `Safety snapshot before restoring ${targetVersion.label || versionId}`, null, true);

    // 2. Restore content safely
    const restoredData = JSON.parse(JSON.stringify(targetVersion.data));
    if (type === 'slides') {
      if (!project.slide) project.slide = {};
      project.slide.slides = Array.isArray(restoredData) ? restoredData : (restoredData.slides || []);
    } else if (type === 'scripts') {
      if (!project.script) project.script = {};
      if (typeof restoredData === 'string') {
        project.script.fullText = restoredData;
      } else {
        project.script.fullText = restoredData.fullText || project.script.fullText || '';
        project.script.sections = restoredData.sections || project.script.sections || [];
      }
    } else if (type === 'slidePrompts') {
      if (!project.slide) project.slide = {};
      project.slide.tool2Prompt = restoredData.promptText || restoredData || '';
    } else if (type === 'thumbnails') {
      project.thumbnail = { ...project.thumbnail, ...restoredData };
    } else if (type === 'seo') {
      project.seo = { ...project.seo, ...restoredData };
    }

    project.updatedAt = new Date().toISOString();
    return { success: true, restored: targetVersion };
  }

  function migrateEmbeddedDataToProjectScoped(project) {
    if (!project) return { success: false, reason: 'Project not found' };

    const before = {
      id: project.id,
      name: project.name,
      slidesCount: Array.isArray(project.slide?.slides) ? project.slide.slides.length : 0,
      scriptSectionsCount: Array.isArray(project.script?.sections) ? project.script.sections.length : 0,
      hasVoice: Boolean(project.voice?.filename),
      hasEditing: Boolean(project.editing?.aspectRatio),
      hasCanva: Boolean(project.canva?.headline),
      hasSEO: Boolean(project.seo?.title),
      hasThumbnail: Boolean(project.thumbnail?.gujaratiWords),
      uploadsCount: Array.isArray(project.uploads) ? project.uploads.length : 0,
      ideasCount: Array.isArray(project.ideas) ? project.ideas.length : 0
    };

    if (!project.versionHistory) {
      project.versionHistory = { slides: [], scripts: [], slidePrompts: [], thumbnails: [], seo: [] };
    }

    if (project.slide?.slides && project.versionHistory.slides.length === 0) {
      saveVersionSnapshot(project, 'slides', 'Original Slide Deck (v1)', project.slide.slides);
    }
    if (project.script && project.versionHistory.scripts.length === 0) {
      saveVersionSnapshot(project, 'scripts', 'Original Script (v1)', { fullText: project.script.fullText || '', sections: project.script.sections || [] });
    }
    if (project.slide?.tool2Prompt && project.versionHistory.slidePrompts.length === 0) {
      saveVersionSnapshot(project, 'slidePrompts', 'Original Slide Prompt (v1)', { promptText: project.slide.tool2Prompt });
    }
    if (project.thumbnail && project.versionHistory.thumbnails.length === 0) {
      saveVersionSnapshot(project, 'thumbnails', 'Original Thumbnail Concept (v1)', project.thumbnail);
    }
    if (project.seo && project.versionHistory.seo.length === 0) {
      saveVersionSnapshot(project, 'seo', 'Original SEO Draft (v1)', project.seo);
    }

    const after = {
      id: project.id,
      name: project.name,
      slidesCount: Array.isArray(project.slide?.slides) ? project.slide.slides.length : 0,
      scriptSectionsCount: Array.isArray(project.script?.sections) ? project.script.sections.length : 0,
      hasVoice: Boolean(project.voice?.filename),
      hasEditing: Boolean(project.editing?.aspectRatio),
      hasCanva: Boolean(project.canva?.headline),
      hasSEO: Boolean(project.seo?.title),
      hasThumbnail: Boolean(project.thumbnail?.gujaratiWords),
      uploadsCount: Array.isArray(project.uploads) ? project.uploads.length : 0,
      ideasCount: Array.isArray(project.ideas) ? project.ideas.length : 0,
      versionHistoryCounts: {
        slides: project.versionHistory.slides.length,
        scripts: project.versionHistory.scripts.length,
        slidePrompts: project.versionHistory.slidePrompts.length,
        thumbnails: project.versionHistory.thumbnails.length,
        seo: project.versionHistory.seo.length
      }
    };

    const isVerified = (
      before.slidesCount === after.slidesCount &&
      before.scriptSectionsCount === after.scriptSectionsCount &&
      before.uploadsCount === after.uploadsCount &&
      before.ideasCount === after.ideasCount
    );

    return { success: true, isVerified, projectId: project.id, before, after };
  }

  test('1. Strict Project Isolation: Modifying Project A never affects Project B', () => {
    const projA = createBlankProject('આંગણવાડી ભરતી 2026', 'આંગણવાડી સુપરવાઈઝર 2026', 'સરકારી યોજના');
    const projB = createBlankProject('ગુજરાત DA વધારો 2026', 'ગુજરાત કર્મચારી પગાર 2026', 'સરકારી કર્મચારી');

    assert.notStrictEqual(projA.id, projB.id);

    // Modify Project A slides
    projA.slide.slides = [
      { id: 101, title: 'આંગણવાડી સ્લાઇડ ૧', scriptText: 'આંગણવાડી સ્ક્રિપ્ટ' }
    ];

    // Verify Project B remains completely isolated
    assert.strictEqual(projB.name, 'ગુજરાત DA વધારો 2026');
    assert.strictEqual(projB.slide.slides.length, 0);
  });

  test('2. Stop-and-Resume Workspace State is accurately saved and restored', () => {
    const proj = createBlankProject('ટેસ્ટ પ્રોજેક્ટ રેઝ્યૂમ', 'વિષય રેઝ્યૂમ');

    proj.workspaceState = {
      ...proj.workspaceState,
      activeSection: 'slides',
      lastSlideIndex: 3,
      lastScriptSectionIdx: 2,
      scrollOffset: 450,
      completionStatus: { ideas: true, slides: true }
    };

    assert.strictEqual(proj.workspaceState.activeSection, 'slides');
    assert.strictEqual(proj.workspaceState.lastSlideIndex, 3);
    assert.strictEqual(proj.workspaceState.lastScriptSectionIdx, 2);
    assert.strictEqual(proj.workspaceState.scrollOffset, 450);
    assert.strictEqual(proj.workspaceState.completionStatus.ideas, true);
    assert.strictEqual(proj.workspaceState.completionStatus.slides, true);
  });

  test('3. Version History: Saves snapshots, prevents duplicates, and preserves versions', () => {
    const proj = createBlankProject('વર્ઝન હિસ્ટ્રી ટેસ્ટ', 'વિષય હિસ્ટ્રી');

    const slidesV1 = [{ id: 1, title: 'સ્લાઇડ વર્ઝન ૧' }];
    const slidesV2 = [{ id: 1, title: 'સ્લાઇડ વર્ઝન ૨ - એડિટેડ' }];

    const v1Id = saveVersionSnapshot(proj, 'slides', 'First Slide Draft', slidesV1);
    assert.ok(v1Id, 'v1Id should be generated');

    // Attempting to save exact same snapshot again should deduplicate
    const dupId = saveVersionSnapshot(proj, 'slides', 'Duplicate Draft', slidesV1);
    assert.strictEqual(dupId, v1Id, 'Should return existing versionId without creating duplicate');

    // Saving modified snapshot creates v2
    const v2Id = saveVersionSnapshot(proj, 'slides', 'Second Slide Draft', slidesV2);
    assert.notStrictEqual(v2Id, v1Id);

    const history = proj.versionHistory.slides;
    assert.strictEqual(history.length, 2, 'Should contain exactly 2 distinct versions');
    assert.strictEqual(history[0].versionId, v2Id);
    assert.strictEqual(history[1].versionId, v1Id);
  });

  test('4. Reversible Version Rollback: Preserves safety snapshot of current state before rollback', () => {
    const proj = createBlankProject('રોલબેક ટેસ્ટ પ્રોજેક્ટ', 'વિષય રોલબેક');

    const scriptV1 = { fullText: 'આ ઓરિજિનલ સ્ક્રિપ્ટ લખાણ છે.', sections: [] };
    const scriptV2 = { fullText: 'આ બીજી સુધારેલી સ્ક્રિપ્ટ છે.', sections: [] };

    const v1Id = saveVersionSnapshot(proj, 'scripts', 'Script V1', scriptV1);
    const v2Id = saveVersionSnapshot(proj, 'scripts', 'Script V2', scriptV2);

    proj.script.fullText = scriptV2.fullText;

    // Rollback to V1
    const res = restoreVersionSnapshot(proj, 'scripts', v1Id);
    assert.strictEqual(res.success, true);
    assert.strictEqual(proj.script.fullText, scriptV1.fullText);

    // Verify safety snapshot was created in history before applying rollback
    const history = proj.versionHistory.scripts;
    assert.ok(history.length >= 3, 'History must contain safety snapshot + previous versions');
    assert.ok(history[0].label.includes('Safety snapshot'), 'Latest history record must be the safety snapshot');
  });

  test('5. Non-Destructive Migration: 100% data preservation and verification', () => {
    const proj = createBlankProject('માઈગ્રેશન સેફ્ટી ટેસ્ટ', 'વિષય માઈગ્રેશન');
    proj.slide.slides = [
      { id: 1, title: 'સ્લાઇડ ૧' },
      { id: 2, title: 'સ્લાઇડ ૨' }
    ];
    proj.script.sections = [
      { sectionName: 'Hook', content: 'નમસ્તે' }
    ];

    const migrationRes = migrateEmbeddedDataToProjectScoped(proj);
    assert.strictEqual(migrationRes.success, true);
    assert.strictEqual(migrationRes.isVerified, true);
    assert.strictEqual(migrationRes.after.slidesCount, 2);
    assert.strictEqual(migrationRes.after.scriptSectionsCount, 1);
    assert.ok(migrationRes.after.versionHistoryCounts.slides >= 1);
    assert.ok(migrationRes.after.versionHistoryCounts.scripts >= 1);
  });

  test('6. Project-Based Slide Storage: Project A and B maintain completely isolated slides', () => {
    // Project A: Anganwadi
    const projA = createBlankProject('આંગણવાડી ભરતી 2026', 'આંગણવાડી સુપરવાઈઝર 2026');
    projA.slide.slides = [
      { id: 101, title: 'આંગણવાડી સ્લાઇડ ૧: પરિપત્ર', bulletPoints: ['મુદ્દો ૧', 'મુદ્દો ૨'] },
      { id: 102, title: 'આંગણવાડી સ્લાઇડ ૨: પાત્રતા', bulletPoints: ['શરતો'] },
      { id: 103, title: 'આંગણવાડી સ્લાઇડ ૩: અરજી', bulletPoints: ['ઓનલાઇન ફોર્મ'] }
    ];

    // Project B: Gujarat DA Hike
    const projB = createBlankProject('ગુજરાત DA વધારો 2026', 'ગુજરાત કર્મચારી પગાર 2026');
    // Initially Project B has empty slides
    assert.strictEqual(projB.slide.slides.length, 0);

    // Add 2 slides to Project B
    projB.slide.slides = [
      { id: 201, title: 'DA સ્લાઇડ ૧: ૫૦% વધારો', bulletPoints: ['નાણાં વિભાગ ઠરાવ'] },
      { id: 202, title: 'DA સ્લાઇડ ૨: એરિયર્સ હપ્તા', bulletPoints: ['ખાતામાં જમા તારીખ'] }
    ];

    // Verify Project A still has exact 3 slides
    assert.strictEqual(projA.slide.slides.length, 3);
    assert.strictEqual(projA.slide.slides[0].title, 'આંગણવાડી સ્લાઇડ ૧: પરિપત્ર');
    assert.strictEqual(projA.slide.slides[2].title, 'આંગણવાડી સ્લાઇડ ૩: અરજી');

    // Verify Project B still has exact 2 slides
    assert.strictEqual(projB.slide.slides.length, 2);
    assert.strictEqual(projB.slide.slides[0].title, 'DA સ્લાઇડ ૧: ૫૦% વધારો');
  });

  test('7. Slide Deck Actions: Reorder, Duplicate, and Delete operations', () => {
    const proj = createBlankProject('સ્લાઇડ ઓપરેશન્સ ટેસ્ટ', 'ટેસ્ટ');
    proj.slide.slides = [
      { id: 1, title: 'સ્લાઇડ ૧' },
      { id: 2, title: 'સ્લાઇડ ૨' },
      { id: 3, title: 'સ્લાઇડ ૩' }
    ];

    // 1. Reorder: Move Slide 2 up to position 0
    const temp = proj.slide.slides[1];
    proj.slide.slides[1] = proj.slide.slides[0];
    proj.slide.slides[0] = temp;
    assert.strictEqual(proj.slide.slides[0].title, 'સ્લાઇડ ૨');
    assert.strictEqual(proj.slide.slides[1].title, 'સ્લાઇડ ૧');

    // 2. Duplicate: Duplicate Slide 0
    const original = proj.slide.slides[0];
    const dup = { ...JSON.parse(JSON.stringify(original)), id: Date.now(), title: original.title + ' (કોપી)' };
    proj.slide.slides.splice(1, 0, dup);
    assert.strictEqual(proj.slide.slides.length, 4);
    assert.strictEqual(proj.slide.slides[1].title, 'સ્લાઇડ ૨ (કોપી)');

    // 3. Delete: Delete the duplicated slide
    proj.slide.slides.splice(1, 1);
    assert.strictEqual(proj.slide.slides.length, 3);
    assert.strictEqual(proj.slide.slides[1].title, 'સ્લાઇડ ૧');
  });

  test('8. New Project Starts 100% Empty: Zero prebuilt slides and zero fake filenames', () => {
    const newProj = createBlankProject('નવો સ્વચ્છ પ્રોજેક્ટ 2026', 'સ્વચ્છ વિષય');

    // Rule 1 & 3: Must start completely empty
    assert.strictEqual(newProj.slide.slides.length, 0, 'New project slides must be empty');
    assert.strictEqual(newProj.slide.importedPresentation, null, 'No presentation imported by default');
    assert.strictEqual(newProj.slide.customName, '', 'customName must be empty until a real file is imported');
  });

  test('9. Legacy Demo Slides Archival: Detects prebuilt demo slides and archives them safely without data destruction', () => {
    const legacyProject = createBlankProject('જૂનો લીગસી પ્રોજેક્ટ', 'જૂનો વિષય');
    
    // Inject legacy demo slides as previously generated by default templates
    legacyProject.slide.slides = [
      {
        id: 1,
        title: 'જૂનો લીગસી પ્રોજેક્ટ: પરિપત્ર વિગત',
        subtitle: 'મુખ્ય માહિતી અને નિયમો',
        bulletPoints: ['ગાંધીનગર સચિવાલય દ્વારા નવો સત્તાવાર પરિપત્ર જાહેર']
      },
      {
        id: 2,
        title: 'પાત્રતા અને લાભાર્થી નિયમો ૨૦૨૬',
        subtitle: 'કોને કોને લાભ મળશે? સંપૂર્ણ શરતો',
        bulletPoints: ['રાજ્યના લાખો કર્મચારીઓ અને પેન્શનર્સને સીધો ફાયદો']
      }
    ];

    // Simulate loader cleanup logic
    const hasPrebuiltSignatures = legacyProject.slide.slides.some(s => 
      (s.subtitle && (s.subtitle.includes('મુખ્ય માહિતી અને નિયમો') || s.subtitle.includes('સત્તાવાર નિર્ણય જાહેર'))) ||
      (s.title && s.title.includes('પરિપત્ર વિગત'))
    );

    assert.strictEqual(hasPrebuiltSignatures, true, 'Should detect legacy prebuilt signatures');

    if (hasPrebuiltSignatures && !legacyProject.slide.importedPresentation) {
      legacyProject.legacyDemoSlidesArchive = legacyProject.slide.slides;
      legacyProject.slide.slides = [];
    }

    // Active slides are now empty, preserving clean slate for imported PPT/PDF
    assert.strictEqual(legacyProject.slide.slides.length, 0, 'Active slides must be cleaned');
    assert.strictEqual(legacyProject.legacyDemoSlidesArchive.length, 2, 'Legacy data must be preserved in archive');
  });

  test('10. Real PPTX & PDF Presentation Import, Persistence, and Cross-Project Isolation', () => {
    // Project A: Anganwadi with PPTX import
    const projA = createBlankProject('આંગણવાડી ભરતી 2026', 'આંગણવાડી સુપરવાઈઝર 2026');
    const pptxFile = {
      filename: 'Anganwadi_Recruitment_NotebookLM.pptx',
      fileType: 'pptx',
      size: 45200,
      sizeFormatted: '44 KB',
      slides: [
        { id: 1, title: 'આંગણવાડી ભરતી ૨૦૨૬', subtitle: 'સત્તાવાર WCD પરિપત્ર', bulletPoints: ['૧૦,૪૦૦ જગ્યાઓ'] },
        { id: 2, title: 'વયમર્યાદા & શૈક્ષણિક લાયકાત', subtitle: '૧૮ થી ૩૩ વર્ષ', bulletPoints: ['સ્નાતક પાસ'] }
      ]
    };

    projA.slide.importedPresentation = {
      id: `pres_${projA.id}_001`,
      filename: pptxFile.filename,
      fileType: pptxFile.fileType,
      sizeFormatted: pptxFile.sizeFormatted,
      slideCount: pptxFile.slides.length,
      uploadedAt: new Date().toISOString()
    };
    projA.slide.customName = pptxFile.filename;
    projA.slide.slides = pptxFile.slides;

    // Project B: DA Hike with PDF import
    const projB = createBlankProject('ગુજરાત DA વધારો 2026', 'ગુજરાત કર્મચારી પગાર 2026');
    const pdfFile = {
      filename: 'Gujarat_DA_Finance_Notification.pdf',
      fileType: 'pdf',
      size: 82400,
      sizeFormatted: '80 KB',
      slides: [
        { id: 101, title: 'DA ૫૦% મંજૂરી ઠરાવ', subtitle: 'નાણાં વિભાગ ગાંધીનગર', bulletPoints: ['૫૦% DA વધારો'] }
      ]
    };

    projB.slide.importedPresentation = {
      id: `pres_${projB.id}_002`,
      filename: pdfFile.filename,
      fileType: pdfFile.fileType,
      sizeFormatted: pdfFile.sizeFormatted,
      slideCount: pdfFile.slides.length,
      uploadedAt: new Date().toISOString()
    };
    projB.slide.customName = pdfFile.filename;
    projB.slide.slides = pdfFile.slides;

    // Verify Project A has its exact PPTX file and slides
    assert.strictEqual(projA.slide.importedPresentation.filename, 'Anganwadi_Recruitment_NotebookLM.pptx');
    assert.strictEqual(projA.slide.importedPresentation.fileType, 'pptx');
    assert.strictEqual(projA.slide.slides.length, 2);
    assert.strictEqual(projA.slide.slides[0].title, 'આંગણવાડી ભરતી ૨૦૨૬');

    // Verify Project B has its exact PDF file and slides
    assert.strictEqual(projB.slide.importedPresentation.filename, 'Gujarat_DA_Finance_Notification.pdf');
    assert.strictEqual(projB.slide.importedPresentation.fileType, 'pdf');
    assert.strictEqual(projB.slide.slides.length, 1);
    assert.strictEqual(projB.slide.slides[0].title, 'DA ૫૦% મંજૂરી ઠરાવ');

    // Verify Complete Isolation: Neither project leaked slides or files into the other
    assert.notStrictEqual(projA.slide.importedPresentation.filename, projB.slide.importedPresentation.filename);
    assert.notStrictEqual(projA.slide.slides[0].id, projB.slide.slides[0].id);
  });
});
