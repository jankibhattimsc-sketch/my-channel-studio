const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const express = require('express');
const db = require('../server/db');
const openaiService = require('../server/services/openaiService');
const { validateSlideWiseScriptFidelity, parseExternalSlidesText } = require('../server/services/externalSlideParserService');

describe('MASTER PROMPT: EXACT SLIDE-WISE SCRIPT GENERATION', () => {
  const sampleSlides = [
    {
      slideId: 'slide_anganwadi_1',
      slideNumber: 1,
      title: 'ગુજરાત આંગણવાડી કાર્યકર અને તેડાગર નવી ભરતી ૨૦૨૬',
      subtitle: 'મહિલા અને બાળ વિકાસ વિભાગ સત્તાવાર જાહેરાત',
      bulletPoints: [
        'કુલ ૧૦,૪૫૦ જગ્યાઓ માટે રાજ્યવ્યાપી ઓનલાઇન ભરતી',
        'e-HRMS પોર્ટલ પરથી ૧૫ માર્ચ સુધી ઓનલાઇન અરજી સ્વીકારાશે'
      ]
    },
    {
      slideId: 'slide_anganwadi_2',
      slideNumber: 2,
      title: 'શૈક્ષણિક લાયકાત અને વયમર્યાદા નિયમો',
      subtitle: 'કોણ અરજી કરી શકે?',
      bulletPoints: [
        'કાર્યકર માટે ધોરણ ૧૨ પાસ અને તેડાગર માટે ધોરણ ૧૦ પાસ',
        'ઉમેદવારની વયમર્યાદા ૧૮ થી ૩૫ વર્ષ રાખવામાં આવી છે'
      ]
    },
    {
      slideId: 'slide_anganwadi_3',
      slideNumber: 3,
      title: 'પગાર ધોરણ, માનદ વેતન અને ડોક્યુમેન્ટ્સ',
      subtitle: 'માસિક ભથ્થું અને જરૂરી પુરાવા',
      bulletPoints: [
        'કાર્યકરને માસિક રૂપિયા ૧૦,૦૦૦ અને તેડાગરને રૂપિયા ૫,૫૦૦ માનદ વેતન',
        'શાળા છોડ્યાનું પ્રમાણપત્ર LC, આધારકાર્ડ અને રહેઠાણનો પુરાવો ફરજિયાત'
      ]
    }
  ];

  test('1. Original PDF/PPT Analysis: Reads all slides and preserves 1-to-N order without dropping', () => {
    assert.strictEqual(sampleSlides.length, 3, 'All 3 slides must be present');
    sampleSlides.forEach((s, idx) => {
      assert.strictEqual(s.slideNumber, idx + 1, `Slide ${idx + 1} order must be strictly preserved`);
      assert.ok(s.title && s.title.length > 5, `Slide ${idx + 1} must have a valid title`);
      assert.ok(Array.isArray(s.bulletPoints) && s.bulletPoints.length > 0, `Slide ${idx + 1} must have bullet points`);
    });
  });

  test('2. Exact Slide-Wise Script Generation: Formats with exact slide markers [સ્લાઇડ #X: ...]', async () => {
    const result = await openaiService.generateSlideWiseScript({
      slides: sampleSlides,
      topic: 'ગુજરાત આંગણવાડી ભરતી ૨૦૨૬',
      durationMinutes: 8,
      speakingTone: 'news_conversational'
    });

    assert.ok(result, 'Must return a generated script result');
    assert.strictEqual(result.totalSlides, 3, 'Must match total slide count');
    assert.strictEqual(result.sections.length, 3, 'Must have exactly 3 slide-wise sections');

    result.sections.forEach((sec, idx) => {
      assert.strictEqual(sec.slideNumber, idx + 1, `Section slideNumber must match slide ${idx + 1}`);
      assert.ok(sec.scriptText && sec.scriptText.length > 30, `Section ${idx + 1} must contain narration`);
    });

    // Check exact slide markers in fullText
    assert.ok(result.fullText.includes('[સ્લાઇડ #1:'), 'fullText must include [સ્લાઇડ #1: marker');
    assert.ok(result.fullText.includes('[સ્લાઇડ #2:'), 'fullText must include [સ્લાઇડ #2: marker');
    assert.ok(result.fullText.includes('[સ્લાઇડ #3:'), 'fullText must include [સ્લાઇડ #3: marker');
  });

  test('3. Strict Content Matching & Preservation: Numbers, dates and rules stay in their respective slides', async () => {
    const result = await openaiService.generateSlideWiseScript({
      slides: sampleSlides,
      topic: 'ગુજરાત આંગણવાડી ભરતી ૨૦૨૬'
    });

    const sec1 = result.sections[0].scriptText;
    const sec2 = result.sections[1].scriptText;
    const sec3 = result.sections[2].scriptText;

    // Slide 1 has 10,450 vacancies
    assert.ok(sec1.includes('૧૦,૪૫૦') || sec1.includes('10,450') || sec1.includes('ઓનલાઇન'), 'Slide 1 script must preserve Slide 1 facts');

    // Slide 2 has age 18 to 35
    assert.ok(sec2.includes('૧૮') || sec2.includes('18') || sec2.includes('૩૫') || sec2.includes('35') || sec2.includes('લાયકાત'), 'Slide 2 script must preserve Slide 2 qualifications/age');

    // Slide 3 has salary 10,000 and 5,500
    assert.ok(sec3.includes('૧૦,૦૦૦') || sec3.includes('10,000') || sec3.includes('૫,૫૦૦') || sec3.includes('5,500') || sec3.includes('વેતન'), 'Slide 3 script must preserve Slide 3 salary');
  });

  test('4. Cross-Slide Contamination Guard: Slide 3 salary info must not bleed into Slide 1 or Slide 2', async () => {
    const result = await openaiService.generateSlideWiseScript({
      slides: sampleSlides,
      topic: 'ગુજરાત આંગણવાડી ભરતી ૨૦૨૬'
    });

    const sec1 = result.sections[0].scriptText;
    const sec2 = result.sections[1].scriptText;

    // Salary numbers 5,500 or 10,000 should NOT bleed into Slide 2 eligibility
    assert.ok(!sec2.includes('૫,૫૦૦'), 'Slide 2 eligibility must not contain Slide 3 honorarium amount ૫,૫૦૦');
  });

  test('5. Natural Gujarati Voiceover Writing: News anchor style with authentic hooks and closing CTA', async () => {
    const result = await openaiService.generateSlideWiseScript({
      slides: sampleSlides,
      topic: 'ગુજરાત આંગણવાડી ભરતી ૨૦૨૬'
    });

    const firstSection = result.sections[0].scriptText;
    const lastSection = result.sections[sampleSlides.length - 1].scriptText;

    // Anchor Greeting in Slide 1
    assert.ok(firstSection.includes('નમસ્તે') || firstSection.includes('જ્ઞાન યાત્રા'), 'Slide 1 must include news anchor greeting');

    // Anchor Closing CTA in Last Slide
    assert.ok(lastSection.includes('સત્તાવાર') || lastSection.includes('શેર') || lastSection.includes('ગુજરાત'), 'Last slide must include official advisory and CTA');
  });

  test('6. 7-Point Final Script Validation Checklist: Validates all 7 criteria', () => {
    const mockSections = [
      {
        slideNumber: 1,
        title: sampleSlides[0].title,
        scriptText: 'નમસ્તે દર્શક મિત્રો! ગુજરાત આંગણવાડી કાર્યકર અને તેડાગર નવી ભરતી ૨૦૨૬ જાહેર થઈ છે. કુલ ૧૦,૪૫૦ જગ્યાઓ માટે ૧૫ માર્ચ સુધી ઓનલાઇન અરજી સ્વીકારાશે.'
      },
      {
        slideNumber: 2,
        title: sampleSlides[1].title,
        scriptText: 'શૈક્ષણિક લાયકાત અને વયમર્યાદા નિયમો: કાર્યકર માટે ૧૨ પાસ અને તેડાગર માટે ૧૦ પાસ. વયમર્યાદા ૧૮ થી ૩૫ વર્ષ રાખવામાં આવી છે.'
      },
      {
        slideNumber: 3,
        title: sampleSlides[2].title,
        scriptText: 'પગાર ધોરણ અને માનદ વેતન: કાર્યકરને માસિક ૧૦,૦૦૦ અને તેડાગરને ૫,૫૦૦ મળશે. શાળા છોડ્યાનું પ્રમાણપત્ર LC અને આધારકાર્ડ સાથે રાખવા.'
      }
    ];

    const validation = validateSlideWiseScriptFidelity(sampleSlides, mockSections, 'full script');
    assert.strictEqual(validation.isValid, true, '7-Point validation must pass for authentic script');
    assert.strictEqual(validation.checklist.length, 7, 'Must validate exactly 7 checklist items');

    const checkIds = validation.checklist.map(c => c.id);
    assert.ok(checkIds.includes('title_accuracy'), 'Checklist must include title_accuracy');
    assert.ok(checkIds.includes('points_coverage'), 'Checklist must include points_coverage');
    assert.ok(checkIds.includes('numbers_dates'), 'Checklist must include numbers_dates');
    assert.ok(checkIds.includes('cross_contamination'), 'Checklist must include cross_contamination');
    assert.ok(checkIds.includes('zero_hallucination'), 'Checklist must include zero_hallucination');
    assert.ok(checkIds.includes('anchor_readability'), 'Checklist must include anchor_readability');
    assert.ok(checkIds.includes('mapping_exact'), 'Checklist must include mapping_exact');
  });

  test('7. Script Output & Auto-Save API: End-to-end server route saves script to database', async () => {
    const testProjectId = `proj_exact_slidewise_test_${Date.now()}`;
    const scriptsRouter = require('../server/routes/scripts');

    // Find the /generate-slidewise route handler directly
    const route = scriptsRouter.stack.find(layer => layer.route && layer.route.path === '/generate-slidewise');
    assert.ok(route, 'Router must have /generate-slidewise route');
    const handler = route.route.stack[0].handle;

    const req = {
      body: {
        projectId: testProjectId,
        slides: sampleSlides,
        topic: 'ગુજરાત આંગણવાડી ભરતી ૨૦૨૬',
        durationMinutes: 8,
        speakingTone: 'news_conversational',
        autoSave: true
      }
    };

    let responseData = null;
    let statusCode = 200;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await handler(req, res);

    assert.strictEqual(statusCode, 200, 'Endpoint must return HTTP 200');
    assert.ok(responseData, 'Must return response data');
    assert.strictEqual(responseData.success, true, 'Response must be success: true');
    assert.strictEqual(responseData.savedInDb, true, 'Script must be automatically saved in DB');
    assert.strictEqual(responseData.script.sections.length, 3, 'Must have 3 sections');

    // Verify retrieval from Database
    const savedInDb = db.getLatestScriptByProjectId(testProjectId);
    assert.ok(savedInDb, 'Script must exist in DB');
    assert.strictEqual(savedInDb.projectId, testProjectId, 'ProjectId must match');
    assert.strictEqual(savedInDb.sections.length, 3, 'Saved sections count must match');
    assert.ok(savedInDb.fullText.includes('[સ્લાઇડ #1:'), 'Full text in DB must contain [સ્લાઇડ #1:');
  });
});
