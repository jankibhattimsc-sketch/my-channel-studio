const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('ChatGPT Single Box: Exact Topic Slide-Wise Content Prompt Without Speaker Speech Verification', async (t) => {
  const { generateClientNotebookLMPrompt } = await import('../public/js/utils/notebooklmPromptGenerator.js');

  await t.test('1. chatgptUnifiedPrompt strictly commands slide-by-slide content with NO speaker speech', () => {
    const topic = 'ગુજરાત નવી આંગણવાડી કાર્યકર અને તેડાગર ભરતી ૨૦૨૬';
    const res = generateClientNotebookLMPrompt({ topic, slideCount: '8-10' });

    assert.ok(res.chatgptUnifiedPrompt, 'chatgptUnifiedPrompt must exist');

    // Strict command for single topic slide-wise content without speaker speech
    assert.ok(res.chatgptUnifiedPrompt.includes('નીચે આપેલા એક જ વિષય માટે ફક્ત સ્લાઇડ પ્રમાણે વ્યવસ્થિત સંપૂર્ણ કન્ટેન્ટ આપો (વક્તાસ્પીચ કે બોલવાની સ્ક્રિપ્ટ વિના)'));
    assert.ok(res.chatgptUnifiedPrompt.includes(`🎯 વિષય (TOPIC): "${topic}"`), 'Must embed exact topic');
    assert.ok(res.chatgptUnifiedPrompt.includes('STRICT ZERO SPEAKER SPEECH RULE'), 'Must enforce strict zero speaker speech rule');
    assert.ok(res.chatgptUnifiedPrompt.includes('આ સ્લાઇડ પ્રોમ્પ્ટમાં કોઈ પણ વક્તાસ્પીચ, સ્પીકર નોટ્સ કે માઇક્રોફોન સામે બોલવાની સ્ક્રિપ્ટ લખવાની નથી'), 'Must explicitly forbid speaker speech');

    // Visual design rules matching current authentic style
    assert.ok(res.chatgptUnifiedPrompt.includes('૧૦૦% શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF PURE WHITE)'), 'Must enforce 100% pure white background');
    assert.ok(res.chatgptUnifiedPrompt.includes('ઘેરો નેવી બ્લૂ કલર (#0F172A અથવા #102A56)'), 'Must enforce navy blue box heading');
    assert.ok(res.chatgptUnifiedPrompt.includes('REAL PHOTOGRAPHS (શ્રેષ્ઠ વાસ્તવિક અસલી ફોટા)'), 'Must enforce real official photographs');
    assert.ok(res.chatgptUnifiedPrompt.includes('STRICTLY NO 3D CARTOONS • NO NEON'), 'Must forbid 3D cartoons and neon');

    // Slide-by-slide 3 core items (WITHOUT speaker speech)
    assert.ok(res.chatgptUnifiedPrompt.includes('દરેક સ્લાઇડ માટે ફક્ત આ ૩ બાબતો વ્યવસ્થિત ક્રમબદ્ધ લખો (વક્તાસ્પીચ વગર)'), 'Must mandate only 3 items per slide');
    assert.ok(res.chatgptUnifiedPrompt.includes('[સ્લાઇડ #X હેડિંગ]'), 'Must include slide heading');
    assert.ok(res.chatgptUnifiedPrompt.includes('[શ્રેષ્ઠ વાસ્તવિક ફોટો (Real Visual Description)]'), 'Must include real visual');
    assert.ok(res.chatgptUnifiedPrompt.includes('[સ્લાઇડ કન્ટેન્ટ / મુખ્ય મુદ્દાઓ]'), 'Must include bullet points');

    // Ensure speaker notes are NOT in chatgptUnifiedPrompt
    assert.strictEqual(res.chatgptUnifiedPrompt.includes('[શિક્ષક/વક્તા સ્પીકર નોટ્સ & સ્ક્રિપ્ટ]'), false, 'Must NOT contain speaker notes/speech item');
    assert.ok(res.chatgptUnifiedPrompt.includes('કોઈ પણ બીજી પ્રસ્તાવના, વક્તાસ્પીચ કે વધારાની વિગતો વગર'), 'Must command output without speaker speech');
  });

  await t.test('2. slideprompts.js UI presents single-box slide-wise content prompt without speaker speech', () => {
    const viewCode = fs.readFileSync(path.join(__dirname, '../public/js/views/slideprompts.js'), 'utf8');

    // Defaults to chatgpt-unified
    assert.ok(viewCode.includes("let activePromptMode = 'chatgpt-unified';"), 'Must default to chatgpt-unified mode');
    assert.ok(viewCode.includes('let tool2Prompt = currentChatGPTUnifiedPrompt;'), 'Must initialize tool2Prompt with currentChatGPTUnifiedPrompt');

    // Header & Guidance text reflect single box slide-wise content without speech
    assert.ok(viewCode.includes('૪. Content Search (સ્લાઇડ પ્રમાણે કન્ટેન્ટ પ્રોમ્પ્ટ)'), 'Must have clear Tool 4 title');
    assert.ok(viewCode.includes('⚡ આ એક જ વિષય માટે ફક્ત સ્લાઇડ પ્રમાણે વ્યવસ્થિત કન્ટેન્ટ પ્રોમ્પ્ટ:'), 'Must label prompt box accurately');
    assert.ok(viewCode.includes('વક્તાસ્પીચ વગર ફક્ત સ્લાઇડ કન્ટેન્ટ'), 'Must describe capability without speaker speech');

    // Copy event uses confirmation toast for slide-wise content without speaker speech
    assert.ok(viewCode.includes('⚡ સ્લાઇડ કન્ટેન્ટ પ્રોમ્પ્ટ (વક્તાસ્પીચ વગર) કોપી થઈ ગયો!'), 'Must confirm copy on action');
  });
});
