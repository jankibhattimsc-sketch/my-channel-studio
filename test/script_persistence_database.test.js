const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const db = require('../server/db');

describe('CRITICAL FIX: SCRIPT SAVE & DATA PERSISTENCE IN DATABASE', () => {
  const testProjectId = 'test_proj_persisted_' + Date.now();
  const sampleChatGptText = `[સ્લાઇડ #1: ગુજરાત સરકારી કર્મચારી પગાર અને DA વધારો ૨૦૨૬]
નમસ્તે મિત્રો! જ્ઞાન યાત્રા ચેનલમાં આપનું હાર્દિક સ્વાગત છે. આજના વિડીયોમાં આપણે વાત કરીશું ૫૦% મોંઘવારી ભથ્થા વિશે.

[સ્લાઇડ #2: પાત્રતા અને પરિપત્ર નિયમો]
નાણાં વિભાગ દ્વારા જાહેર થયેલ ઠરાવ મુજબ તમામ કાયમી કર્મચારીઓ આ લાભ માટે પાત્ર રહેશે.

[સ્લાઇડ #3: સમાપન અને અપીલ]
વિડીયોને લાઈક કરી તમારા વોટ્સએપ ગ્રૂપમાં શેર કરજો. જય હિન્દ, જય જય ગરવી ગુજરાત!`;

  it('1. Permanent Script Storage: Saves script with unique Script ID, project linking, and slide count', () => {
    const saved = db.saveScript({
      projectId: testProjectId,
      projectName: 'GSRTC પરીક્ષા માસ્ટર સ્ટ્રેટેજી ૨૦૨૬',
      pdfFilename: 'GSRTC_Exam_Master_Strategy__1_.pdf',
      slideCount: 9,
      rawText: sampleChatGptText,
      fullText: sampleChatGptText,
      sections: [
        { slideNumber: 1, title: 'ગુજરાત સરકારી કર્મચારી પગાર', scriptText: 'નમસ્તે મિત્રો! જ્ઞાન યાત્રા ચેનલમાં આપનું હાર્દિક સ્વાગત છે.' },
        { slideNumber: 2, title: 'પાત્રતા અને પરિપત્ર નિયમો', scriptText: 'નાણાં વિભાગ દ્વારા જાહેર થયેલ ઠરાવ મુજબ તમામ કાયમી કર્મચારીઓ આ લાભ માટે પાત્ર રહેશે.' },
        { slideNumber: 3, title: 'સમાપન અને અપીલ', scriptText: 'વિડીયોને લાઈક કરી તમારા વોટ્સએપ ગ્રૂપમાં શેર કરજો. જય હિન્દ!' }
      ],
      source: 'ChatGPT'
    });

    assert.ok(saved, 'Must return saved script record');
    assert.ok(saved.scriptId, 'Must have a unique scriptId');
    assert.ok(saved.scriptId.startsWith(`script_${testProjectId}`), 'scriptId must link to projectId');
    assert.strictEqual(saved.projectId, testProjectId);
    assert.strictEqual(saved.pdfFilename, 'GSRTC_Exam_Master_Strategy__1_.pdf');
    assert.strictEqual(saved.slideCount, 9);
    assert.strictEqual(saved.version, 1);
    assert.strictEqual(saved.rawText, sampleChatGptText);
    assert.strictEqual(saved.fullText, sampleChatGptText);
    assert.strictEqual(saved.savedInDb, true);
  });

  it('2. Persistence Across Query / Reload: getLatestScriptByProjectId returns the exact saved script', () => {
    const fetched = db.getLatestScriptByProjectId(testProjectId);

    assert.ok(fetched, 'Must fetch script by projectId');
    assert.strictEqual(fetched.projectId, testProjectId);
    assert.strictEqual(fetched.rawText, sampleChatGptText, 'Must match 100% of verbatim saved text');
    assert.strictEqual(fetched.sections.length, 3);
    assert.strictEqual(fetched.slideCount, 9);
  });

  it('3. No Automatic Script Overwrite: Updates create Version 2 and archive Version 1 in versions history', () => {
    const updatedText = sampleChatGptText + '\n\n[સ્લાઇડ #4: નવી માહિતી]\nઆ વધારાનું લખાણ ઉમેરેલું છે.';

    const updated = db.saveScript({
      projectId: testProjectId,
      projectName: 'GSRTC પરીક્ષા માસ્ટર સ્ટ્રેટેજી ૨૦૨૬',
      pdfFilename: 'GSRTC_Exam_Master_Strategy__1_.pdf',
      slideCount: 9,
      rawText: updatedText,
      fullText: updatedText,
      sections: [
        { slideNumber: 1, title: 'ગુજરાત સરકારી કર્મચારી પગાર', scriptText: 'નમસ્તે મિત્રો!' },
        { slideNumber: 2, title: 'પાત્રતા', scriptText: 'નાણાં વિભાગ ઠરાવ' },
        { slideNumber: 3, title: 'સમાપન', scriptText: 'જય હિન્દ!' },
        { slideNumber: 4, title: 'નવી માહિતી', scriptText: 'આ વધારાનું લખાણ ઉમેરેલું છે.' }
      ],
      source: 'ChatGPT',
      changeSummary: 'Added Slide 4'
    });

    assert.strictEqual(updated.version, 2, 'Version must be incremented to 2');
    assert.strictEqual(updated.rawText, updatedText);

    // Verify Version 1 was NOT deleted; it is safely archived in versions array
    assert.ok(Array.isArray(updated.versions), 'versions array must exist');
    assert.strictEqual(updated.versions.length, 1, 'Must hold 1 archived version');
    assert.strictEqual(updated.versions[0].versionNumber, 1, 'Archived version must be Version 1');
    assert.strictEqual(updated.versions[0].rawText, sampleChatGptText, 'Archived version must retain original text');
  });

  it('4. Version History Restore: restoreScriptVersion restores Version 1 safely without losing Version 2', () => {
    const latest = db.getLatestScriptByProjectId(testProjectId);
    assert.strictEqual(latest.version, 2);
    const v1Id = latest.versions[0].scriptId;

    const restored = db.restoreScriptVersion(testProjectId, v1Id);

    assert.ok(restored, 'Restored record must be returned');
    assert.strictEqual(restored.version, 3, 'Restoring creates active Version 3 with Version 1 text');
    assert.strictEqual(restored.rawText, sampleChatGptText, 'Restored text must match original Version 1 verbatim');

    // Both previous versions exist in history
    assert.strictEqual(restored.versions.length, 2, 'History must contain both Version 2 and Version 1');
  });

  it('5. Audio Generation binds to exact Script ID from Database', () => {
    const latest = db.getLatestScriptByProjectId(testProjectId);
    const foundById = db.getScriptById(latest.scriptId);

    assert.ok(foundById, 'Script must be retrievable by unique scriptId');
    assert.strictEqual(foundById.scriptId, latest.scriptId);
    assert.strictEqual(foundById.sections[0].slideNumber, 1);
  });
});

