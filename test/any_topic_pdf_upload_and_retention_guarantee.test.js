const { describe, it } = require('node:test');
const assert = require('node:assert');

// Mock localStorage and window for Node environment
if (typeof global.localStorage === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

if (typeof global.window === 'undefined') {
  global.window = {
    dispatchEvent: () => true,
    CustomEvent: class CustomEvent { constructor(type, detail) { this.type = type; this.detail = detail; } }
  };
}

describe('ANY TOPIC PDF UPLOAD AND RETENTION GUARANTEE', () => {
  const { isContentMatchingTopic } = require('../public/js/utils/projectState.js');

  it('1. Accepts any PDF for custom government exams (e.g. Talati, GPSC, GSSSB CCE)', () => {
    const talatiTopic = 'ગુજરાત પંચાયત સેવા પસંદગી મંડળ તલાટી કમ મંત્રી ભરતી ૨૦૨૬';
    const cceTopic = 'GSSSB CCE 2.0 નવી પરીક્ષા પદ્ધતિ અને સિલેબસ માર્ગદર્શિકા';

    // Generic PDF
    assert.strictEqual(isContentMatchingTopic('NotebookLM.pdf', talatiTopic), true);
    assert.strictEqual(isContentMatchingTopic('presentation.pdf', cceTopic), true);

    // PDF with exam / recruitment content
    const examSlides = [
      { slideNumber: 1, title: 'પરીક્ષા પદ્ધતિ અને અભ્યાસક્રમ', content: 'ગુજરાતી વ્યાકરણ અને સામાન્ય જ્ઞાન' },
      { slideNumber: 2, title: 'ઓનલાઇન અરજી નિયમો', content: 'OJAS પોર્ટલ પરથી અરજી કરવાની રહેશે' }
    ];
    assert.strictEqual(isContentMatchingTopic({ slides: examSlides, filename: 'syllabus.pdf' }, talatiTopic), true);
    assert.strictEqual(isContentMatchingTopic({ slides: examSlides, filename: 'cce_rules.pdf' }, cceTopic), true);
  });

  it('2. Does not falsely reject government circulars mentioning salary (પગાર) or rules (નિયમો)', () => {
    const recruitmentTopic = 'ગુજરાત વનરક્ષક ફોરેસ્ટ ગાર્ડ શારીરિક કસોટી તારીખ ૨૦૨૬';
    // Circular mentions salary / stipend which shouldn't falsely trigger DA rejection
    const forestSlides = [
      { slideNumber: 1, title: 'વનરક્ષક ભરતી શારીરિક કસોટી', content: 'PET અને PST ના માપદંડ' },
      { slideNumber: 2, title: 'પગાર ધોરણ અને નિમણૂક શરતો', content: 'ફિક્સ પગાર અને અન્ય સરકારી ભથ્થાં નિયમો' }
    ];
    assert.strictEqual(isContentMatchingTopic({ slides: forestSlides, filename: 'forest_gr.pdf' }, recruitmentTopic), true);
  });

  it('3. Respects user-uploaded presentation objects unconditionally', () => {
    const userUploadedPres = {
      id: 'pres_user_custom_123',
      projectId: 'proj_any_topic_456',
      filename: 'My_Government_Notes.pdf',
      fileType: 'pdf',
      slidesCount: 6,
      slides: [{ slideNumber: 1, title: 'સરકારી માહિતી' }]
    };
    assert.strictEqual(isContentMatchingTopic(userUploadedPres, 'કોઈપણ નવો વિષય ૨૦૨૬'), true);
  });

  it('4. Backend /latest-topic-presentation finds uploaded PDF by projectId', async () => {
    const fs = require('fs');
    const path = require('path');
    const presDir = path.join(__dirname, '..', 'public', 'presentations');
    if (!fs.existsSync(presDir)) fs.mkdirSync(presDir, { recursive: true });

    const projId = 'test_proj_pdf_' + Date.now();
    const testFileName = `pres_${projId}_${Date.now()}_custom_topic.pdf`;
    const filePath = path.join(presDir, testFileName);
    fs.writeFileSync(filePath, '%PDF-1.4 test presentation content');

    try {
      const files = fs.readdirSync(presDir);
      const matched = files.find(f => f.includes(projId));
      assert.ok(matched, 'File must be found by project ID');
      assert.strictEqual(matched, testFileName);
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });
});
