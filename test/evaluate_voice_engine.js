const assert = require('assert');
const fs = require('fs');
const path = require('path');
const voiceService = require('../server/services/voiceService');
const voiceActorService = require('../server/services/voiceActorService');
const { cleanGujaratiForTTS } = require('../server/services/gujaratiCleaner');

/**
 * Section 11 Evaluation Suite for Script-Aware Human-Like Acting Voice Engine
 */
async function runVoiceEvaluationSuite() {
  console.log('================================================================');
  console.log('🎙️ STARTING SCRIPT-AWARE ACTING VOICE ENGINE EVALUATION SUITE');
  console.log('================================================================\n');

  const testCases = [
    {
      id: 1,
      title: '1. Gujarati Government Recruitment Announcement',
      expectedCategory: 'recruitment_announcement',
      script: `નમસ્તે ઉમેદવાર મિત્રો! ગુજરાત ગૌણ સેવા પસંદગી મંડળ એટલે કે જીએસએસએસબી દ્વારા ક્લાર્ક અને હેડ ક્લાર્કની નવી ભરતી ૨૦૨૬ માટે સત્તાવાર જાહેરાત પ્રસિદ્ધ કરવામાં આવી છે.
કુલ જગ્યાઓ ૩,૫૫૦ છે, જેમાં સ્નાતક ઉમેદવારો ઓજસ પોર્ટલ પર અરજી કરી શકશે.
વય મર્યાદા ૨૦ થી ૩૫ વર્ષ નક્કી કરવામાં આવી છે. છેલ્લી તારીખ ૩૦ એપ્રિલ ૨૦૨૬ રહેશે, તેથી સમયસર ઓનલાઇન ફોર્મ ભરી લેવું.`
    },
    {
      id: 2,
      title: '2. Gujarati Salary Increase & DA Announcement',
      expectedCategory: 'salary_financial',
      script: `નમસ્તે મિત્રો! રાજ્યના લાખો સરકારી કર્મચારીઓ અને પેન્શનરો માટે અત્યંત આનંદના સમાચાર આવ્યા છે.
નાણાં વિભાગ દ્વારા મોંઘવારી ભથ્થામાં એટલે કે ડીએ માં ૫૦% નો મોટો વધારો મંજૂર કરવામાં આવ્યો છે!
આ નિર્ણયથી કર્મચારીઓના ખાતામાં સીધા ૧૫,૦૦૦ થી ૪૫,૦૦૦ રૂપિયા એરિયર્સ સાથે જમા થશે. આગામી માસથી નવો પગાર લાગુ કરી દેવાશે.`
    },
    {
      id: 3,
      title: '3. Serious Government News & Cabinet Resolution',
      expectedCategory: 'breaking_news',
      script: `ગાંધીનગર સચિવાલયથી આ સમયના સૌથી મોટા અને મહત્વના તાજા સમાચાર સામે આવી રહ્યા છે.
મુખ્યમંત્રીશ્રીની અધ્યક્ષતામાં મળેલી કેબિનેટ બેઠકમાં નવો સત્તાવાર પરિપત્ર અને જીઆર જાહેર કરવામાં આવ્યો છે.
તમામ જિલ્લા કલેક્ટરોને તાત્કાલિક અસરથી આ નિયમો લાગુ કરવા સખત આદેશ આપવામાં આવ્યા છે. અનધિકૃત અફવાઓથી સાવચેત રહેવું.`
    },
    {
      id: 4,
      title: '4. Educational Explanation & Step-by-Step Guide',
      expectedCategory: 'educational_lesson',
      script: `નમસ્તે વિદ્યાર્થી મિત્રો, આજના શૈક્ષણિક વિષયમાં આપણે ઓનલાઇન અરજી પ્રક્રિયાના સરળ સ્ટેપ્સ વિગતવાર સમજીશું.
સૌ પ્રથમ સત્તાવાર પોર્ટલ ખોલો અને નવું રજીસ્ટ્રેશન પૂર્ણ કરો.
ત્યારબાદ જરૂરી શૈક્ષણિક દસ્તાવેજો અને સહી અપલોડ કરો. આ સ્ટેપ્સ અનુસરવાથી ફોર્મ ભરવામાં કોઈ ભૂલ થશે નહીં.`
    },
    {
      id: 5,
      title: '5. A Question Directed at the Audience (Intonation Test)',
      expectedCategory: 'audience_interaction',
      script: `શું તમે પણ સરકારી ભરતીના નવા નિયમો વિશે સાંભળ્યું છે? 
શું તમારા ખાતામાં સહાય યોજનાનો હપ્તો જમા થયો છે કે નહીં?
તમારો અભિપ્રાય અમને નીચે કોમેન્ટ બોક્સમાં જરૂર જણાવજો!`
    },
    {
      id: 6,
      title: '6. Paragraph with Dates, Numbers, Percentages & Acronyms',
      expectedCategory: 'recruitment_announcement',
      script: `જીપીએસસી અને ઓજસ પોર્ટલ પર તા. ૧૫-૦૪-૨૦૨૬ ના રોજ નવી સૂચના બહાર પડી છે.
કુલ ૪,૨૦૦ જગ્યાઓ માટે ૫૦% અનામત અને ૧૦% ઈડબલ્યુએસ ક્વોટા લાગુ રહેશે.
રૂપિયા ૨૫,૦૦૦ થી ૬૦,૦૦૦ સુધીનું માસિક વેતન ધોરણ નક્કી કરાયું છે.`
    },
    {
      id: 7,
      title: '7. Full Dramatic Script (Multiple Tone Transitions across Arc)',
      expectedCategory: 'salary_financial',
      script: `નમસ્તે મિત્રો! આજના વિડીયોમાં એક અતિ મહત્વપૂર્ણ ખુશખબર લઈને આવ્યા છીએ!
શું ખરેખર ગુજરાત સરકાર દ્વારા કર્મચારીઓના પગાર ભથ્થામાં ઐતિહાસિક ફેરફાર કરી દેવાયો છે?
હા મિત્રો, નાણાં વિભાગે સત્તાવાર મંજૂરી આપી દીધી છે. તમામ કર્મચારીઓને ૪ ટકા વધારા સાથે દર મહિને ₹૫,૦૦૦ થી ₹૧૨,૦૦૦ નો સીધો ફાયદો થશે.
પરંતુ ધ્યાન રાખજો, છેલ્લી તારીખ પહેલાં સર્વિસ બુક વેરિફિકેશન કરાવવું ફરજિયાત છે.
વિડીયો ગમ્યો હોય તો લાઈક અને શેર કરજો. જય હિન્દ, જય જય ગરવી ગુજરાત!`
    }
  ];

  let passedTests = 0;

  for (const tc of testCases) {
    console.log(`----------------------------------------------------------------`);
    console.log(`▶️ RUNNING TEST ${tc.id}: ${tc.title}`);
    console.log(`----------------------------------------------------------------`);

    // 1. Script Analysis Verification
    const analysis = voiceActorService.analyzeScript(tc.script, { userSpeed: 1.0 });
    assert.strictEqual(analysis.success, true, `Analysis should succeed for Test ${tc.id}`);
    console.log(`  ✓ Genre Detected: [${analysis.context.nameGuj}] (${analysis.context.category})`);
    console.log(`  ✓ Total Sentences: ${analysis.totalSentences}`);
    console.log(`  ✓ Thought Units: ${analysis.thoughtUnits.length}`);

    // Verify thought unit structure
    assert.ok(analysis.thoughtUnits.length >= 1, `Must have at least 1 thought unit for Test ${tc.id}`);
    analysis.thoughtUnits.forEach((u, uIdx) => {
      assert.ok(u.rate, `Thought unit ${uIdx + 1} must have rate`);
      assert.ok(u.pitch, `Thought unit ${uIdx + 1} must have pitch`);
      assert.ok(u.volume, `Thought unit ${uIdx + 1} must have volume`);
      assert.ok(u.role, `Thought unit ${uIdx + 1} must have communicative role`);
      assert.ok(u.arcPhase, `Thought unit ${uIdx + 1} must have dramatic arc phase`);
    });

    console.log(`  ✓ Thought Units Prosody:`);
    analysis.thoughtUnits.forEach(u => {
      console.log(`     • [${u.arcPhase}] ${u.role}: Rate=${u.rate}, Pitch=${u.pitch}, Vol=${u.volume}, Pause=${u.pauseAfterMs}ms`);
    });

    // 2. Real Audio Synthesis Verification
    const timestamp = Date.now();
    const result = await voiceService.generateVoice({
      text: tc.script,
      profileId: 'anchor-dhwani-female',
      speed: 1.0
    });

    assert.strictEqual(result.success, true, `Audio generation must succeed for Test ${tc.id}`);
    assert.ok(result.audioUrl, `Must return valid audioUrl`);
    assert.ok(result.fileSize > 5000, `Audio file must be non-empty (got ${result.fileSize} bytes)`);

    console.log(`  ✓ Audio Generated: ${result.filename} (${Math.round(result.fileSize / 1024)} KB)`);
    console.log(`  ✓ Status: PASSED\n`);
    passedTests++;
  }

  console.log('================================================================');
  console.log(`🎉 ALL ${passedTests}/${testCases.length} VOICE EVALUATION TESTS PASSED SUCCESSFULLY!`);
  console.log('================================================================');
}

if (require.main === module) {
  runVoiceEvaluationSuite().catch(err => {
    console.error('❌ Evaluation Failed:', err);
    process.exit(1);
  });
}

module.exports = { runVoiceEvaluationSuite };
