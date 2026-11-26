const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

describe('LIVE AUDIO & VIDEO SCREEN: CHATGPT SCRIPT DIRECT PASTE & SPEAK', () => {
  const rootDir = process.cwd();

  it('1. Multi-slide ChatGPT output parses cleanly into individual slide scripts', async () => {
    const { parseChatGptScriptText } = await import('../public/js/utils/externalSlideParser.js');
    const chatGptOutput = `
[સ્લાઇડ #1: આંગણવાડી પગાર વધારો ૨૦૨૬]
નમસ્કાર મિત્રો, જ્ઞાન યાત્રા ચેનલમાં આપનું હાર્દિક સ્વાગત છે. આજના મહત્વના સમાચારમાં આંગણવાડી બહેનો માટે ખુશખબર આવી છે.

[સ્લાઇડ #2: નવા પગાર ધોરણની વિગતો]
સરકાર દ્વારા જાહેર કરાયેલા પરિપત્ર અનુસાર માનદ વેતનમાં નોંધપાત્ર વધારો કરવામાં આવ્યો છે.

[સ્લાઇડ #3: ક્યારથી અમલમાં આવશે?]
આ નવો વધારો ૧ એપ્રિલ ૨૦૨૬ થી તમામ કર્મચારીઓને ખાતામાં જમા કરવામાં આવશે.
    `.trim();

    const mockSlides = [
      { slideNumber: 1, title: 'સ્લાઇડ ૧', scriptText: '' },
      { slideNumber: 2, title: 'સ્લાઇડ ૨', scriptText: '' },
      { slideNumber: 3, title: 'સ્લાઇડ ૩', scriptText: '' }
    ];

    const parsed = parseChatGptScriptText(chatGptOutput, mockSlides);
    assert.strictEqual(parsed.length, 3, 'Should parse exactly 3 sections');
    assert.match(parsed[0].scriptText, /નમસ્કાર મિત્રો/, 'Slide 1 script matches');
    assert.match(parsed[1].scriptText, /પરિપત્ર અનુસાર/, 'Slide 2 script matches');
    assert.match(parsed[2].scriptText, /૧ એપ્રિલ ૨૦૨૬/, 'Slide 3 script matches');
  });

  it('2. slideVoiceStudio.js contains dedicated ChatGPT Script Paste Button and Full/Slide Teleprompter Switch', () => {
    const svPath = path.join(rootDir, 'public', 'js', 'components', 'slideVoiceStudio.js');
    const content = fs.readFileSync(svPath, 'utf8');

    assert.ok(content.includes('svr-btn-paste-chatgpt-script'), 'Must include svr-btn-paste-chatgpt-script button');
    assert.ok(content.includes('ChatGPT Script Paste કરો'), 'Must display Gujarati button text for ChatGPT paste');
    assert.ok(content.includes('svr-btn-mode-slidewise'), 'Must include slide-wise view mode button');
    assert.ok(content.includes('svr-btn-mode-full'), 'Must include full continuous script view mode button');
    assert.ok(content.includes('svr-chatgpt-modal-textarea'), 'Must include dedicated modal textarea for ChatGPT paste');
    assert.ok(content.includes('handleApplyChatGptFullScript'), 'Must include handleApplyChatGptFullScript handler');
  });

  it('3. slideVoiceStudio.js supports direct paste event on teleprompter textarea', () => {
    const svPath = path.join(rootDir, 'public', 'js', 'components', 'slideVoiceStudio.js');
    const content = fs.readFileSync(svPath, 'utf8');

    assert.ok(
      content.includes("targetContainer.querySelector('#svr-slide-script-text')?.addEventListener('paste'"),
      'Teleprompter textarea must intercept paste to auto-distribute multi-slide scripts'
    );
  });

  it('4. videoeditor.js contains dedicated ChatGPT Script Paste Button and clip distribution', () => {
    const vePath = path.join(rootDir, 'public', 'js', 'views', 'videoeditor.js');
    const content = fs.readFileSync(vePath, 'utf8');

    assert.ok(content.includes('btn-video-paste-chatgpt-script'), 'Must include btn-video-paste-chatgpt-script button');
    assert.ok(content.includes('handleVideoApplyChatGptScript'), 'Must include handleVideoApplyChatGptScript handler');
    assert.ok(
      content.includes("videoScriptTa?.addEventListener('paste'"),
      'Video script textarea must intercept paste event'
    );
  });

  it('5. slideVoiceStudio.js contains full script quick bar & project script select buttons', () => {
    const svPath = path.join(rootDir, 'public', 'js', 'components', 'slideVoiceStudio.js');
    const content = fs.readFileSync(svPath, 'utf8');

    assert.ok(content.includes('svr-btn-top-pick-proj-script'), 'Must include top pick project script button');
    assert.ok(content.includes('svr-btn-top-paste-full-script'), 'Must include top paste full script button');
    assert.ok(content.includes('svr-btn-pick-proj-script'), 'Must include pane 2 pick project script button');
    assert.ok(content.includes('svr-btn-quick-paste-full'), 'Must include pane 2 paste full script button');
  });

  it('6. videoeditor.js contains open full script studio box with tab toggles & select buttons', () => {
    const vePath = path.join(rootDir, 'public', 'js', 'views', 'videoeditor.js');
    const content = fs.readFileSync(vePath, 'utf8');

    assert.ok(content.includes('tab-video-script-full'), 'Must include full script tab button');
    assert.ok(content.includes('tab-video-script-clip'), 'Must include clip script tab button');
    assert.ok(content.includes('btn-video-select-proj-script'), 'Must include select project script button');
    assert.ok(content.includes('btn-video-paste-full-script'), 'Must include paste full script button');
    assert.ok(content.includes('video-full-script-textarea'), 'Must include full video script textarea');
  });
});
