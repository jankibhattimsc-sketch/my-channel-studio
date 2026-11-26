const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

test('NotebookLM Direct Search & Instant Slide Deck Master Prompt Verification', async (t) => {
  const { generateClientNotebookLMPrompt, classifyTopicDomain } = await import('../public/js/utils/notebooklmPromptGenerator.js');

  await t.test('1. Master slide prompt leads immediately with Direct Search & Instant Slide Deck command', () => {
    const topic = 'ગુજરાત સરકાર નવી કિસાન સહાય યોજના ૨૦૨૬';
    const res = generateClientNotebookLMPrompt({ topic, slideCount: '8-10' });

    assert.ok(res.pptDeckPrompt, 'pptDeckPrompt must exist');
    assert.strictEqual(res.pptDeckPrompt, res.promptText, 'promptText must alias pptDeckPrompt');
    assert.strictEqual(res.pptDeckPrompt, res.pptPromptText, 'pptPromptText must alias pptDeckPrompt');

    // Check imperative Direct Search header
    assert.ok(
      res.pptDeckPrompt.startsWith('🚨 તાત્કાલિક આદેશ: ડાયરેક્ટ સર્ચ કરો અને સીધી સ્લાઇડ ડેક બનાવવાનું શરૂ કરો (DIRECT SEARCH & INSTANT SLIDE DECK COMMAND)'),
      'Prompt must start with the immediate direct search & slide deck command'
    );

    // Check direct search directives
    assert.ok(res.pptDeckPrompt.includes('ડાયરેક્ટ વેબ/સોર્સ રિસર્ચ (DIRECT SEARCH)'), 'Must instruct direct web/source research');
    assert.ok(res.pptDeckPrompt.includes(`🎯 વિષય (TOPIC): "${topic}"`), 'Must embed exact topic');
    assert.ok(res.pptDeckPrompt.includes('કોઈ પણ વધારાની ભૂમિકા, પ્રસ્તાવના કે સવાલ પૂછ્યા વિના'), 'Must prohibit preamble or asking questions');
    assert.ok(res.pptDeckPrompt.includes('સ્લાઇડ ૧ થી સ્લાઇડ 8-10 નું સંપૂર્ણ સ્લાઇડ ડેક (COMPLETE SLIDE DECK) બનાવવાનું તાત્કાલિક ચાલુ કરી દો!'), 'Must command instant slide generation');
  });

  await t.test('2. Direct search instructions mandate official government portals and factual search', () => {
    const topic = 'ગુજરાત પોલીસ કોન્સ્ટેબલ નવી ભરતી ૨૦૨૬';
    const res = generateClientNotebookLMPrompt({ topic, slideCount: '5-6' });

    assert.ok(res.pptDeckPrompt.includes('સ્ટેપ ૧: ડાયરેક્ટ વેબ સર્ચ & સત્તાવાર સ્ત્રોત સંશોધન (DIRECT SEARCH INSTRUCTIONS)'));
    assert.ok(res.pptDeckPrompt.includes('.gov.in, .gujarat.gov.in, ojas.gujarat.gov.in, gseb.org, pib.gov.in'));
    assert.ok(res.pptDeckPrompt.includes('STRICT ZERO FABRICATION'));
    assert.ok(res.pptDeckPrompt.includes('સ્લાઇડ ૧ થી સ્લાઇડ 5-6 નું સંપૂર્ણ સ્લાઇડ ડેક'));
  });

  await t.test('3. Master prompt enforces 100% pure white background and real photos (no neon / no cartoons)', () => {
    const topic = 'આંગણવાડી કાર્યકર અને તેડાગર નવી ભરતી ૨૦૨૬';
    const res = generateClientNotebookLMPrompt({ topic });

    assert.ok(res.pptDeckPrompt.includes('૧૦૦% શુદ્ધ સફેદ (#FFFFFF) બેકગ્રાઉન્ડ'));
    assert.ok(res.pptDeckPrompt.includes('ઘેરો નેવી બ્લૂ (#0F172A અથવા #102A56)'));
    assert.ok(res.pptDeckPrompt.includes('STRICTLY NO DARK SLIDES'));
    assert.ok(res.pptDeckPrompt.includes('STRICTLY NO NEON'));
    assert.ok(res.pptDeckPrompt.includes('વાસ્તવિક અસલી ફોટોગ્રાફ્સ (BEST REAL PHOTOS ONLY)'));
    assert.ok(res.pptDeckPrompt.includes('હવે ડાયરેક્ટ સર્ચ કરીને સીધી જ સ્લાઇડ ૧ થી શરૂ કરીને આખું સ્લાઇડ ડેક (Slide Deck) લખો:'));
  });

  await t.test('4. slideprompts.js UI features Direct Search mode banner, quick copy button, and link to NotebookLM', () => {
    const viewCode = fs.readFileSync(path.join(__dirname, '../public/js/views/slideprompts.js'), 'utf8');

    // UI elements
    assert.ok(viewCode.includes('ડાયરેક્ટ સર્ચ & ઇન્સ્ટન્ટ સ્લાઇડ ડેક મોડ'), 'Must have Direct Search Mode heading');
    assert.ok(viewCode.includes('id="btn-quick-copy-search-prompt"'), 'Must have quick copy button ID');
    assert.ok(viewCode.includes('https://notebooklm.google.com'), 'Must have direct link to NotebookLM');

    // Event listener
    assert.ok(viewCode.includes("container.querySelector('#btn-quick-copy-search-prompt')"), 'Must wire button click event');
    assert.ok(viewCode.includes('⚡ ડાયરેક્ટ સર્ચ & સ્લાઇડ ડેક પ્રોમ્પ્ટ કોપી થઈ ગયો!'), 'Must display confirmation on copy');
  });

  await t.test('5. Dedicated uploadedSourcePrompt prioritizes uploaded source document and strict slide format', () => {
    const topic = 'ગુજરાત નવી આંગણવાડી ભરતી ૨૦૨૬';
    const res = generateClientNotebookLMPrompt({ topic, slideCount: '8-10' });

    assert.ok(res.uploadedSourcePrompt, 'uploadedSourcePrompt must exist in return object');
    assert.ok(
      res.uploadedSourcePrompt.includes('અપલોડ કરેલા સોર્સ (PDF / પરિપત્ર) માંથી સીધું સ્લાઇડ ડેક બનાવવાનો આદેશ'),
      'Must contain uploaded source slide deck command header'
    );
    assert.ok(
      res.uploadedSourcePrompt.includes('મેં આ નોટબુકમાં જે SOURCE (સત્તાવાર પરિપત્ર / PDF / દસ્તાવેજ) અપલોડ કર્યો છે, તેને સંપૂર્ણ અને ઝીણવટપૂર્વક ૧૦૦% વાંચો'),
      'Must instruct NotebookLM to thoroughly read uploaded source'
    );
    assert.ok(
      res.uploadedSourcePrompt.includes('સ્લાઇડ ૧ થી સ્લાઇડ 8-10 નું સંપૂર્ણ પ્રેઝન્ટેશન સ્લાઇડ ડેક'),
      'Must instruct complete slide deck generation for all slides'
    );
    assert.ok(
      res.uploadedSourcePrompt.includes('૧૦૦% શુદ્ધ સફેદ (#FFFFFF) બેકગ્રાઉન્ડ'),
      'Must enforce pure white background'
    );
  });

  await t.test('6. slideprompts.js features Source Upload guidance card and mode switch tabs', () => {
    const viewCode = fs.readFileSync(path.join(__dirname, '../public/js/views/slideprompts.js'), 'utf8');

    assert.ok(viewCode.includes('NotebookLM માં SOURCE (PDF/પરિપત્ર) અપલોડ કર્યા પછી સ્લાઇડ્સ કેવી રીતે મેળવવી?'), 'Must explain source upload solution');
    assert.ok(viewCode.includes('id="btn-tab-source-prompt"'), 'Must have source mode switch tab');
    assert.ok(viewCode.includes('id="btn-tab-search-prompt"'), 'Must have search mode switch tab');
    assert.ok(viewCode.includes('૧. અપલોડ કરેલ સોર્સ (PDF) સ્લાઇડ પ્રોમ્પ્ટ'), 'Must label source mode tab clearly');
  });

  await t.test('7. slideprompts.js provides quick copy button for uploaded source slide prompt and wires click handler', () => {
    const viewCode = fs.readFileSync(path.join(__dirname, '../public/js/views/slideprompts.js'), 'utf8');

    assert.ok(viewCode.includes('id="btn-quick-copy-source-prompt"'), 'Must have quick copy source button ID');
    assert.ok(viewCode.includes('id="banner-source-mode"'), 'Must have dedicated source mode banner');
    assert.ok(viewCode.includes("container.querySelector('#btn-quick-copy-source-prompt')"), 'Must wire button click handler');
    assert.ok(viewCode.includes('⚡ આપેલ સોર્સ (PDF) પરથી ડાયરેક્ટ સ્લાઇડ બનાવવાનો પ્રોમ્પ્ટ કોપી થઈ ગયો!'), 'Must display toast confirmation on copy');
  });

  await t.test('8. Strict Topic Relevance Guarantee: Prompts are 100% dynamically tailored to the specific active topic', () => {
    // A. Employee DA Topic
    const daTopic = 'ગુજરાત સરકારી કર્મચારી ૫૦% DA વધારો & એરિયર્સ ૨૦૨૬';
    const daRes = generateClientNotebookLMPrompt({ topic: daTopic, slideCount: '8-10' });
    assert.ok(daRes.uploadedSourcePrompt.includes('STRICT TOPIC-RELEVANCE MANDATE'), 'Must enforce strict topic relevance mandate');
    assert.ok(daRes.uploadedSourcePrompt.includes(daTopic), 'Must embed exact DA topic');
    assert.ok(daRes.uploadedSourcePrompt.includes('મોંઘવારી ભથ્થામાં (DA) ટકાવારી વધારો') || daRes.uploadedSourcePrompt.includes('DA'), 'Must include DA specific slide titles');
    assert.ok(daRes.uploadedSourcePrompt.includes('એરિયર્સ (Arrears) ની રોકડ ચૂકવણી'), 'Must include Arrears specific slide');

    // B. Anganwadi Topic
    const anganwadiTopic = 'આંગણવાડી કાર્યકર અને તેડાગર નવી ભરતી ૨૦૨૬ સત્તાવાર પરિપત્ર';
    const anganwadiRes = generateClientNotebookLMPrompt({ topic: anganwadiTopic, slideCount: '8-10' });
    assert.ok(anganwadiRes.uploadedSourcePrompt.includes('માનદવેતન (Honorarium)'), 'Must include Anganwadi honorarium');
    assert.ok(anganwadiRes.uploadedSourcePrompt.includes('સ્થાનિક રહેવાસી હોવાનો નિયમ'), 'Must include local resident condition');

    // C. Kisan / Agriculture Topic
    const kisanTopic = 'પીએમ કિસાન યોજના ૨૧મો હપ્તો અને નવી ખેડૂત સબસિડી';
    const kisanRes = generateClientNotebookLMPrompt({ topic: kisanTopic, slideCount: '8-10' });
    assert.ok(kisanRes.uploadedSourcePrompt.includes('iKhedut'), 'Must include iKhedut portal');
    assert.ok(kisanRes.uploadedSourcePrompt.includes('૭/૧૨ અને ૮-અ'), 'Must include 7/12 land records');

    // D. Board Exam / Education Topic
    const eduTopic = 'ધોરણ ૧૦ બોર્ડ પરીક્ષા ટાઈમટેબલ અને બ્લૂપ્રિન્ટ ૨૦૨૬';
    const eduRes = generateClientNotebookLMPrompt({ topic: eduTopic, slideCount: '8-10' });
    assert.ok(eduRes.uploadedSourcePrompt.includes('(Blueprint)'), 'Must include Blueprint');
    assert.ok(eduRes.uploadedSourcePrompt.includes('પાસિંગ માર્ક્સ'), 'Must include Passing marks');
  });
});
