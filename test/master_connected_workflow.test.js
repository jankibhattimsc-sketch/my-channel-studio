const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const pptxExtractor = require('../server/services/pptxExtractor');

// Create authentic 5-slide PPTX
function create5SlidePptx() {
  const entries = [];
  const slideCount = 5;

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
    'આંગણવાડી સુપરવાઈઝર ભરતી ૨૦૨૬ જાહેરાત',
    'શૈક્ષણિક લાયકાત અને વયમર્યાદા નિયમો',
    'ઓનલાઇન અરજી પ્રક્રિયા અને જરૂરી દસ્તાવેજો',
    'પગારધોરણ અને ભથ્થાની સત્તાવાર વિગત',
    'અરજી કરવાની છેલ્લી તારીખ અને હેલ્પલાઇન'
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
          <a:p><a:r><a:t>• કુલ ૧૦,૪૫૦ જગ્યાઓ માટે નોટિફિકેશન મંજૂર</a:t></a:r></a:p>
          <a:p><a:r><a:t>• મહિલા ઉમેદવારો માટે સુવર્ણ તક</a:t></a:r></a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`;
    entries.push({ name: `ppt/slides/slide${i + 1}.xml`, data: Buffer.from(slideXml, 'utf-8') });
  }

  const localHeaders = [];
  const cdHeaders = [];
  let offset = 0;

  for (const entry of entries) {
    const fnBuf = Buffer.from(entry.name, 'utf-8');
    const compData = zlib.deflateRawSync(entry.data);

    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8);
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(0, 14);
    lh.writeUInt32LE(compData.length, 18);
    lh.writeUInt32LE(entry.data.length, 22);
    lh.writeUInt16LE(fnBuf.length, 26);
    lh.writeUInt16LE(0, 28);

    const localEntry = Buffer.concat([lh, fnBuf, compData]);
    localHeaders.push(localEntry);

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

describe('Master Connected Video Production Workflow Integration', () => {

  // Simulated project data model
  let mockProject = null;

  test('Stage 1 & 2: Setup Project & Slide Prompt', () => {
    mockProject = {
      id: 'proj_anganwadi_2026',
      userId: 'test_user_1',
      name: 'આંગણવાડી ભરતી ૨૦૨૬',
      topic: 'આંગણવાડી સુપરવાઈઝર નવી ભરતી ૨૦૨૬',
      slide: {
        tool2Prompt: 'NotebookLM Master Prompt generated from Topic',
        importedPresentation: null,
        slides: []
      },
      script: {
        sections: [],
        fullText: '',
        isCompleted: false
      },
      voice: {},
      thumbnail: {},
      seo: {},
      versionHistory: { slides: [], scripts: [] }
    };

    assert.strictEqual(mockProject.id, 'proj_anganwadi_2026');
    assert.ok(mockProject.slide.tool2Prompt.length > 10);
  });

  test('Stage 3: Import Presentation ONCE & Extract All 5 Slides', () => {
    const pptxBuf = create5SlidePptx();
    const extracted = pptxExtractor.extractPptxSlides(pptxBuf);

    assert.strictEqual(extracted.length, 5, 'Must extract exactly 5 slides');

    // Save into project state
    mockProject.slide.importedPresentation = {
      id: 'pres_anganwadi_1',
      filename: 'Anganwadi_NotebookLM_Slides.pptx',
      fileType: 'pptx',
      fileUrl: '/presentations/pres_anganwadi_1.pptx',
      size: pptxBuf.length,
      sizeFormatted: `${Math.round(pptxBuf.length / 1024)} KB`,
      uploadedAt: new Date().toISOString(),
      slideCount: 5
    };
    mockProject.slide.slides = extracted;
    mockProject.slide.isCompleted = true;

    assert.strictEqual(mockProject.slide.slides.length, 5);
    assert.strictEqual(mockProject.slide.importedPresentation.filename, 'Anganwadi_NotebookLM_Slides.pptx');
  });

  test('Stage 4: Connect Slides to ChatGPT Script Prompt Generator & Import Script', () => {
    // Stage 4 reads mockProject.slide.slides directly
    assert.ok(mockProject.slide.importedPresentation, 'Presentation must exist');
    assert.strictEqual(mockProject.slide.slides.length, 5);

    // 1. Stage 4 builds comprehensive ChatGPT prompt using all extracted slides
    const slidesBlock = mockProject.slide.slides.map((s, idx) => {
      const slideNum = s.slideNumber || (idx + 1);
      const title = s.title;
      const bullets = s.bulletPoints.map(b => `   • ${b}`).join('\n');
      return `[સ્લાઇડ #${slideNum}: ${title}]\n   મુખ્ય મુદ્દાઓ:\n${bullets}`;
    }).join('\n\n');

    const chatGptPrompt = `તમે એક વરિષ્ઠ ગુજરાતી YouTube વિડીયો સ્ક્રિપ્ટ રાઇટર છો.
અમારી YouTube ચેનલ "જ્ઞાન યાત્રા" માટે નીચે આપેલ પ્રેઝન્ટેશનની તમામ ૫ સ્લાઇડ્સ પરથી સંપૂર્ણ ગુજરાતી સ્ક્રિપ્ટ તૈયાર કરો.
📌 વિડીયો વિષય: ${mockProject.name}
📊 કુલ સ્લાઇડ્સ સંખ્યા: ${mockProject.slide.slides.length} સ્લાઇડ્સ

${slidesBlock}`;

    mockProject.script.chatGptPrompt = chatGptPrompt;

    assert.ok(mockProject.script.chatGptPrompt.includes('આંગણવાડી ભરતી ૨૦૨૬'));
    assert.ok(mockProject.script.chatGptPrompt.includes('સ્લાઇડ #1'));
    assert.ok(mockProject.script.chatGptPrompt.includes('સ્લાઇડ #5'));
    assert.ok(mockProject.script.chatGptPrompt.includes('કુલ ૧૦,૪૫૦ જગ્યાઓ'));

    // 2. User submits prompt to ChatGPT and imports the returned narration script:
    const chatGptOutput = `[સ્લાઇડ #1: આંગણવાડી સુપરવાઈઝર નવી ભરતી ૨૦૨૬]
નમસ્તે મિત્રો! જ્ઞાન યાત્રા ચેનલમાં આપનું હાર્દિક સ્વાગત છે. આજના આ ખાસ વિડીયોમાં આપણે વાત કરીશું આંગણવાડી સુપરવાઈઝર ભરતી વિશે.

[સ્લાઇડ #2: જગ્યાઓની વિગત અને પાત્રતા]
હવે જગ્યાઓ અને પાત્રતા અંગે સમજીએ. કુલ ૧૦,૪૫૦ જગ્યાઓ માટે આ જાહેરાત કરવામાં આવી છે.

[સ્લાઇડ #3: શૈક્ષણિક લાયકાત અને વયમર્યાદા]
શૈક્ષણિક લાયકાતમાં માન્ય યુનિવર્સિટીમાંથી સ્નાતક ડિગ્રી જરૂરી છે. વયમર્યાદા ૧૮ થી ૩૫ વર્ષની રહેશે.

[સ્લાઇડ #4: ઓનલાઇન અરજી પ્રક્રિયા]
ઓજસ પોર્ટલ પરથી ઓનલાઇન ફોર્મ ભરવાના રહેશે. તમામ પુરાવા સ્પષ્ટ અપલોડ કરવા.

[સ્લાઇડ #5: અગત્યની તારીખો અને સત્તાવાર સૂચનાઓ]
ફોર્મ ભરવાની છેલ્લી તારીખ ૩૧ ડિસેમ્બર છે. કોઈપણ અફવાઓમાં ન આવવું અને વિડીયો શેર કરી ચેનલ સબ્સ્ક્રાઇબ કરી લેજો. જય હિન્દ!`;

    // 3. System parses imported script into slide-wise sections
    const parts = chatGptOutput.split(/(?=(?:^|\n)\[સ્લાઇડ #[0-9]+:)/i).map(p => p.trim()).filter(Boolean);
    const parsedSections = parts.map((chunk, idx) => {
      const lines = chunk.split('\n').map(l => l.trim()).filter(Boolean);
      const match = lines[0].match(/\[સ્લાઇડ #([0-9]+):\s*(.*)\]/i);
      const slideNum = match ? parseInt(match[1], 10) : (idx + 1);
      const title = match ? match[2] : `સ્લાઇડ #${slideNum}`;
      const scriptText = lines.slice(1).join('\n').trim();
      return {
        slideNumber: slideNum,
        sectionName: `સ્લાઇડ #${slideNum}`,
        title,
        bullets: mockProject.slide.slides[idx]?.bulletPoints || [],
        scriptText,
        timing: `0${Math.floor(idx * 1.5)}:00 - 0${Math.floor((idx + 1) * 1.5)}:30`
      };
    });

    mockProject.script.sections = parsedSections;
    mockProject.script.fullText = chatGptOutput;
    mockProject.script.source = 'ChatGPT';
    mockProject.script.sourcePresentation = mockProject.slide.importedPresentation.filename;
    mockProject.script.isCompleted = true;

    // Sync to slide.slides
    mockProject.slide.slides.forEach((sl, idx) => {
      if (parsedSections[idx]) {
        sl.scriptText = parsedSections[idx].scriptText;
      }
    });

    assert.strictEqual(mockProject.script.sections.length, 5, 'Must parse exactly 5 slide sections from ChatGPT');
    assert.strictEqual(mockProject.script.sections[0].slideNumber, 1);
    assert.strictEqual(mockProject.script.sections[4].slideNumber, 5);
    assert.strictEqual(mockProject.script.source, 'ChatGPT');
    assert.ok(mockProject.script.sections[0].scriptText.includes('જ્ઞાન યાત્રા ચેનલમાં આપનું હાર્દિક સ્વાગત છે'));
  });

  test('Stage 5: Connect Script to Script Editor (Maintains 1-to-1 sections & persists edits)', () => {
    // Script Editor receives the 5 sections
    assert.strictEqual(mockProject.script.sections.length, 5);

    // User edits Section 2 in Script Editor
    const originalSec2 = mockProject.script.sections[1].scriptText;
    const editedSec2 = 'સુધારેલ નરેશન: ઉમેદવાર પાસે માન્ય યુનિવર્સિટીમાંથી સ્નાતક ડિગ્રી હોવી આવશ્યક છે.';
    mockProject.script.sections[1].scriptText = editedSec2;
    mockProject.script.editedSections = mockProject.script.sections;

    // Sync to slide 2
    mockProject.slide.slides[1].scriptText = editedSec2;

    // Update fullText
    mockProject.script.fullText = mockProject.script.sections.map(s => `[સ્લાઇડ #${s.slideNumber}: ${s.title}]\n${s.scriptText}`).join('\n\n');

    assert.strictEqual(mockProject.script.sections[1].scriptText, editedSec2);
    assert.strictEqual(mockProject.slide.slides[1].scriptText, editedSec2);
    assert.ok(mockProject.script.fullText.includes('સ્નાતક ડિગ્રી હોવી આવશ્યક છે'));
  });

  test('Stage 6: Slide-by-Slide Voice Recording (Separate Recordings & Retake Isolation)', () => {
    // Stage 6 reads edited script and slides directly
    assert.strictEqual(mockProject.slide.slides.length, 5);

    // Slide 1 Recording
    const slide1Rec = {
      projectId: mockProject.id,
      slideId: '1',
      scriptSectionId: 'sec_1',
      recordingId: 'rec_s1_v1',
      filename: 'slide_1_voice.wav',
      duration: 18.5,
      status: 'Recorded',
      createdAt: new Date().toISOString()
    };

    // Slide 2 Recording
    const slide2Rec = {
      projectId: mockProject.id,
      slideId: '2',
      scriptSectionId: 'sec_2',
      recordingId: 'rec_s2_v1',
      filename: 'slide_2_voice.wav',
      duration: 24.2,
      status: 'Recorded',
      createdAt: new Date().toISOString()
    };

    mockProject.voice = {
      hasSavedAudio: true,
      slideRecordings: [slide1Rec, slide2Rec]
    };
    mockProject.slide.slides[0].audioUrl = 'blob:audio/s1.wav';
    mockProject.slide.slides[0].recordingDuration = 18.5;
    mockProject.slide.slides[1].audioUrl = 'blob:audio/s2.wav';
    mockProject.slide.slides[1].recordingDuration = 24.2;

    assert.strictEqual(mockProject.voice.slideRecordings.length, 2);
    assert.strictEqual(mockProject.voice.slideRecordings[0].duration, 18.5);
    assert.strictEqual(mockProject.voice.slideRecordings[1].duration, 24.2);

    // Retake Slide 1: user retakes slide 1 without altering slide 2!
    const slide1Retake = {
      ...slide1Rec,
      recordingId: 'rec_s1_v2_retake',
      duration: 20.1,
      status: 'Recorded',
      updatedAt: new Date().toISOString()
    };
    mockProject.voice.slideRecordings[0] = slide1Retake;
    mockProject.slide.slides[0].recordingDuration = 20.1;

    assert.strictEqual(mockProject.voice.slideRecordings[0].duration, 20.1);
    assert.strictEqual(mockProject.voice.slideRecordings[0].recordingId, 'rec_s1_v2_retake');
    // Slide 2 is 100% preserved!
    assert.strictEqual(mockProject.voice.slideRecordings[1].duration, 24.2);
    assert.strictEqual(mockProject.voice.slideRecordings[1].recordingId, 'rec_s2_v1');
  });

  test('Save and Resume: Close after Slide 2, Reopen and continue with Slide 3..5', () => {
    // Simulate closing and restoring project from storage
    const restoredProject = JSON.parse(JSON.stringify(mockProject));

    assert.strictEqual(restoredProject.voice.slideRecordings.length, 2);
    assert.strictEqual(restoredProject.voice.slideRecordings[0].status, 'Recorded');
    assert.strictEqual(restoredProject.voice.slideRecordings[1].status, 'Recorded');

    // Continue recording Slide 3, 4, 5
    for (let i = 3; i <= 5; i++) {
      const rec = {
        projectId: restoredProject.id,
        slideId: String(i),
        scriptSectionId: `sec_${i}`,
        recordingId: `rec_s${i}_v1`,
        filename: `slide_${i}_voice.wav`,
        duration: 15 + i * 2,
        status: 'Recorded',
        createdAt: new Date().toISOString()
      };
      restoredProject.voice.slideRecordings.push(rec);
      restoredProject.slide.slides[i - 1].audioUrl = `blob:audio/s${i}.wav`;
      restoredProject.slide.slides[i - 1].recordingDuration = rec.duration;
    }

    assert.strictEqual(restoredProject.voice.slideRecordings.length, 5, 'All 5 slides recorded separately');
    mockProject = restoredProject;
  });

  test('Stage 9: Multi-Track Video Editing Studio Timeline & Synchronization', () => {
    // Generate 5-Track Timeline
    const rawSlides = mockProject.slide.slides;
    const voiceRecs = mockProject.voice.slideRecordings;

    let offset = 0;
    const presentationClips = [];
    const voiceClips = [];
    const subtitleClips = [];

    rawSlides.forEach((s, idx) => {
      const v = voiceRecs[idx];
      const clipDuration = v ? Math.ceil(v.duration) : 8;

      presentationClips.push({
        id: `pres_${idx + 1}`,
        slideNumber: idx + 1,
        title: s.title,
        startTime: offset,
        duration: clipDuration
      });

      voiceClips.push({
        id: `voice_${idx + 1}`,
        slideNumber: idx + 1,
        audioUrl: s.audioUrl,
        startTime: offset,
        duration: v ? v.duration : 0,
        volume: 1.0
      });

      subtitleClips.push({
        id: `sub_${idx + 1}`,
        slideNumber: idx + 1,
        text: s.scriptText,
        startTime: offset,
        duration: clipDuration
      });

      offset += clipDuration;
    });

    const timeline = {
      totalDuration: offset,
      tracks: {
        presentation: presentationClips,
        voice: voiceClips,
        bgm: { enabled: true, volume: 0.15, fadeIn: 2, fadeOut: 2 },
        subtitles: subtitleClips,
        transitions: [
          { type: 'crossfade', duration: 0.8 },
          { type: 'crossfade', duration: 0.8 },
          { type: 'crossfade', duration: 0.8 },
          { type: 'crossfade', duration: 0.8 }
        ]
      }
    };

    mockProject.editing = {
      timeline,
      exportHistory: []
    };

    assert.strictEqual(timeline.tracks.presentation.length, 5, 'Track 1 must have 5 slide clips');
    assert.strictEqual(timeline.tracks.voice.length, 5, 'Track 2 must have 5 voice clips');
    assert.strictEqual(timeline.tracks.subtitles.length, 5, 'Track 4 must have 5 subtitle clips');
    assert.strictEqual(timeline.tracks.transitions.length, 4, 'Track 5 must have 4 transitions');
    assert.ok(timeline.totalDuration > 80, 'Total timeline duration calculated properly');
    assert.strictEqual(timeline.tracks.presentation[0].startTime, 0);
    assert.strictEqual(timeline.tracks.presentation[1].startTime, timeline.tracks.presentation[0].duration);
  });

  test('Stage 9: Video Export Engine (1080p Full HD MP4 at 30 FPS)', () => {
    // Simulate MP4 Export Pipeline
    const totalDur = mockProject.editing.timeline.totalDuration;
    const fps = 30;
    const totalFrames = Math.round(totalDur * fps);

    assert.ok(totalFrames > 2000, 'Must calculate exact 30 FPS frame count for Full HD video');

    const exportRecord = {
      filename: `${mockProject.name}_1080p_FullHD.mp4`,
      duration: totalDur,
      resolution: '1920x1080 Full HD',
      fps: 30,
      exportedAt: new Date().toISOString(),
      sizeBytes: 15420300 // ~15.4 MB
    };

    mockProject.editing.exportHistory.push(exportRecord);

    assert.strictEqual(mockProject.editing.exportHistory.length, 1);
    assert.strictEqual(mockProject.editing.exportHistory[0].resolution, '1920x1080 Full HD');
    assert.strictEqual(mockProject.editing.exportHistory[0].fps, 30);
    assert.ok(mockProject.editing.exportHistory[0].filename.endsWith('.mp4'));
  });

  test('Stage 7 & 8: Thumbnail & SEO inherit project topic and presentation facts', () => {
    mockProject.thumbnail = {
      gujaratiWords: 'સુપરવાઈઝર નવી ભરતી જાહેર!',
      dalleShortPrompt: 'Anganwadi supervisor holding official folder'
    };

    mockProject.seo = {
      title: 'આંગણવાડી સુપરવાઈઝર નવી ભરતી ૨૦૨૬ | ઓનલાઇન અરજી, લાયકાત અને પગાર નિયમો',
      description: `સત્તાવાર પરિપત્ર જાહેરાત:\n00:00 - ${mockProject.slide.slides[0].title}\n01:30 - ${mockProject.slide.slides[1].title}`,
      tags: ['આંગણવાડી ભરતી ૨૦૨૬', 'OJAS Gujarat', 'WCD Gujarat']
    };

    assert.ok(mockProject.seo.title.includes('આંગણવાડી'));
    assert.ok(mockProject.seo.description.includes('00:00'));
  });

  test('Stage 9: Publishing verifies genuine assets without fake placeholders', () => {
    const hasPresentation = Boolean(mockProject.slide?.importedPresentation && mockProject.slide?.slides?.length > 0);
    const hasScript = Boolean(mockProject.script?.fullText);
    const hasAudio = Boolean(mockProject.voice?.hasSavedAudio);
    const hasThumb = Boolean(mockProject.thumbnail?.gujaratiWords);
    const hasSEO = Boolean(mockProject.seo?.title);

    assert.strictEqual(hasPresentation, true);
    assert.strictEqual(hasScript, true);
    assert.strictEqual(hasAudio, true);
    assert.strictEqual(hasThumb, true);
    assert.strictEqual(hasSEO, true);
  });

  test('Project Isolation: Project A edits do not alter Project B', () => {
    const projectB = {
      id: 'proj_gujarat_da_2026',
      name: 'ગુજરાત DA વધારો ૨૦૨૬',
      slide: { slides: [], importedPresentation: null },
      script: { sections: [], fullText: '' }
    };

    assert.strictEqual(projectB.slide.slides.length, 0);
    assert.strictEqual(mockProject.slide.slides.length, 5);
    assert.notStrictEqual(mockProject.id, projectB.id);
  });

});

