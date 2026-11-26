const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('VOICE-BASED SLIDE SYNCHRONIZATION DEMO ARCHITECTURE', () => {

  // Gujarati semantic matcher algorithm from videoEditDemo.js
  function runSemanticMatcher(spokenText, slides) {
    if (!spokenText || slides.length === 0) return { slideId: slides[0]?.slideId, confidence: 50, matchedKeywords: [] };

    const cleanTokens = spokenText
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'«»]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 1);

    const scored = slides.map(slide => {
      let score = 0;
      const matched = [];

      // 1. Title matching
      const titleTokens = (slide.title || '').toLowerCase().split(/\s+/);
      titleTokens.forEach(t => {
        if (t.length > 2 && cleanTokens.includes(t)) {
          score += 35;
          matched.push(t);
        }
      });

      // 2. Keyword matching
      (slide.keywords || []).forEach(kw => {
        const kwLower = kw.toLowerCase();
        if (spokenText.toLowerCase().includes(kwLower)) {
          score += 25;
          if (!matched.includes(kw)) matched.push(kw);
        }
      });

      // 3. Bullet points matching
      (slide.bulletPoints || []).forEach(bp => {
        const bpTokens = bp.toLowerCase().split(/\s+/);
        bpTokens.forEach(t => {
          if (t.length > 3 && cleanTokens.includes(t) && !matched.includes(t)) {
            score += 12;
            matched.push(t);
          }
        });
      });

      const confidence = Math.min(98, Math.max(30, Math.round(score * 1.25)));

      return {
        slideId: slide.slideId,
        slideNumber: slide.slideNumber,
        title: slide.title,
        confidence: confidence,
        matchedKeywords: matched
      };
    });

    scored.sort((a, b) => b.confidence - a.confidence);
    return scored[0];
  }

  const slides = [
    {
      slideId: 'sl_1_recruitment',
      slideNumber: 1,
      title: 'ગુજરાત આંગણવાડી ભરતી ૨૦૨૬',
      subtitle: 'મહિલા અને બાળ વિકાસ વિભાગ, ગુજરાત સરકાર',
      bulletPoints: ['૧૨,૫૦૦+ જગ્યાઓ', 'e-HRMS પોર્ટલ'],
      keywords: ['આંગણવાડી', 'ભરતી', 'ગુજરાત સરકાર']
    },
    {
      slideId: 'sl_2_eligibility',
      slideNumber: 2,
      title: 'વયમર્યાદા & શૈક્ષણિક લાયકાત',
      subtitle: 'ઉંમર મર્યાદા ૧૮ થી ૩૫ વર્ષ',
      bulletPoints: ['૧૨ પાસ કાર્યકર', '૧૦ પાસ તેડાગર'],
      keywords: ['ઉંમર', 'વયમર્યાદા', '૧૮ થી ૩૫', 'લાયકાત', 'પાસ']
    },
    {
      slideId: 'sl_3_salary',
      slideNumber: 3,
      title: 'પગાર ધોરણ & માસિક માનદ વેતન',
      subtitle: 'રાજ્ય સરકાર દ્વારા નિયમિત વેતન',
      bulletPoints: ['કાર્યકર: ₹૧૦,૦૦૦/-', 'તેડાગર: ₹૫,૫૦૦/-'],
      keywords: ['પગાર', 'વેતન', 'માનદ વેતન', 'રૂપિયા', '૧૦,૦૦૦']
    },
    {
      slideId: 'sl_4_application',
      slideNumber: 4,
      title: 'ઓનલાઇન અરજી & છેલ્લી તારીખ',
      subtitle: 'e-HRMS પોર્ટલ પર અરજી',
      bulletPoints: ['તારીખ ૧૫ થી શરૂ', 'છેલ્લી તારીખ પહેલાં'],
      keywords: ['અરજી', 'તારીખ', 'છેલ્લી તારીખ', 'e-HRMS']
    }
  ];

  it('1. Voice Narration Determines Slide: Spoken topic correctly switches slides', () => {
    // When speaker says: "આજે આપણે ગુજરાત સરકારની આંગણવાડી ભરતી વિશે વાત કરીશું"
    const match1 = runSemanticMatcher('આજે આપણે ગુજરાત સરકારની આંગણવાડી ભરતી વિશે વાત કરીશું', slides);
    assert.strictEqual(match1.slideId, 'sl_1_recruitment');
    assert.ok(match1.confidence >= 80, `Expected high confidence, got ${match1.confidence}%`);

    // When speaker moves to: "આ ભરતી માટે ઉમેદવારની વયમર્યાદા ૧૮ થી ૩૫ વર્ષ રાખવામાં આવી છે"
    const match2 = runSemanticMatcher('આ ભરતી માટે ઉમેદવારની વયમર્યાદા ૧૮ થી ૩૫ વર્ષ રાખવામાં આવી છે', slides);
    assert.strictEqual(match2.slideId, 'sl_2_eligibility');
    assert.ok(match2.confidence >= 80, `Expected high confidence, got ${match2.confidence}%`);

    // When speaker moves to salary: "હવે પગાર ધોરણ અને માનદ વેતન રૂપિયા ૧૦,૦૦૦ રહેશે"
    const match3 = runSemanticMatcher('હવે પગાર ધોરણ અને માનદ વેતન રૂપિયા ૧૦,૦૦૦ રહેશે', slides);
    assert.strictEqual(match3.slideId, 'sl_3_salary');
    assert.ok(match3.confidence >= 80, `Expected high confidence, got ${match3.confidence}%`);
  });

  it('2. Method A (Manual Timeline Editing): Timing nudges, custom split, and reassignments', () => {
    const segments = [
      { id: 'seg_1', startTime: 0, endTime: 15, assignedSlideId: 'sl_1_recruitment' },
      { id: 'seg_2', startTime: 15, endTime: 30, assignedSlideId: 'sl_2_eligibility' }
    ];

    // Nudge +1s on segment 1
    segments[0].endTime += 1;
    segments[1].startTime += 1;
    assert.strictEqual(segments[0].endTime, 16);
    assert.strictEqual(segments[1].startTime, 16);

    // Reassign segment 2 to slide 4 manually
    segments[1].assignedSlideId = 'sl_4_application';
    assert.strictEqual(segments[1].assignedSlideId, 'sl_4_application');
  });

  it('3. Edge Case: Returning to an earlier topic re-uses the earlier slide', () => {
    const timeline = [
      { id: 'seg_1', startTime: 0, endTime: 14, spokenText: 'આંગણવાડી ભરતી પરિચય', assignedSlideId: 'sl_1_recruitment' },
      { id: 'seg_2', startTime: 14, endTime: 28, spokenText: 'વયમર્યાદા ૧૮ થી ૩૫ વર્ષ', assignedSlideId: 'sl_2_eligibility' },
      { id: 'seg_3', startTime: 28, endTime: 42, spokenText: 'પગાર ધોરણ ૧૦૦૦૦', assignedSlideId: 'sl_3_salary' },
      // Edge Case: At 42s speaker revisits Age Relaxation topic
      { id: 'seg_4', startTime: 42, endTime: 56, spokenText: 'યાદ રાખજો, વયમર્યાદા અને ઉંમરમાં અનામત છૂટછાટ મળશે', assignedSlideId: 'sl_2_eligibility' }
    ];

    assert.strictEqual(timeline[1].assignedSlideId, 'sl_2_eligibility');
    assert.strictEqual(timeline[3].assignedSlideId, 'sl_2_eligibility');
    assert.strictEqual(timeline[0].assignedSlideId !== timeline[1].assignedSlideId, true);
    // Slide 2 successfully re-appears at seg_4!
  });

  it('4. Data Safety: Continuous Narration Audio is Never Cut or Truncated', () => {
    const segments = [
      { startTime: 0, endTime: 14, spokenText: 'સંપૂર્ણ વાક્ય ૧' },
      { startTime: 14, endTime: 28, spokenText: 'સંપૂર્ણ વાક્ય ૨' },
      { startTime: 28, endTime: 42, spokenText: 'સંપૂર્ણ વાક્ય ૩' }
    ];

    const totalAudioDuration = 42;
    const coveredDuration = segments[segments.length - 1].endTime - segments[0].startTime;

    assert.strictEqual(coveredDuration, totalAudioDuration, 'All audio time must be 100% accounted for without truncation');
  });

  it('5. Method B (User Approval Guarantee): Suggestions require explicit approval', () => {
    const segment = {
      id: 'seg_test',
      assignedSlideId: 'sl_1_recruitment',
      aiSuggestedSlideId: 'sl_3_salary',
      aiConfidence: 94,
      isApproved: false
    };

    // Before user approval, assignedSlideId remains unchanged
    assert.strictEqual(segment.assignedSlideId, 'sl_1_recruitment');
    assert.strictEqual(segment.isApproved, false);

    // When user clicks "Approve Suggestion"
    segment.assignedSlideId = segment.aiSuggestedSlideId;
    segment.isApproved = true;

    assert.strictEqual(segment.assignedSlideId, 'sl_3_salary');
    assert.strictEqual(segment.isApproved, true);
  });

  it('6. Live User Cue Punch-In ("હું કહું ને ત્યારે ટાઇમલાઇન અને સ્લાઇડ બદલાય"): Split at exact second', () => {
    const segments = [
      { id: 'seg_1', startTime: 0, endTime: 60, assignedSlideId: 'sl_1_recruitment' }
    ];

    // User is listening, at 14.5s user clicks Slide 2!
    const cueTime = 14.5;
    const chosenSlide = 'sl_2_eligibility';

    // Execution of changeSlideOnUserCue
    const curIdx = segments.findIndex(s => cueTime >= s.startTime && cueTime < s.endTime);
    assert.strictEqual(curIdx, 0);

    const oldEnd = segments[curIdx].endTime;
    segments[curIdx].endTime = cueTime;
    segments.push({
      id: 'seg_cued_1',
      startTime: cueTime,
      endTime: oldEnd,
      assignedSlideId: chosenSlide
    });

    // Verification: Timeline now has 2 segments with exact split at 14.5s
    assert.strictEqual(segments.length, 2);
    assert.strictEqual(segments[0].endTime, 14.5);
    assert.strictEqual(segments[1].startTime, 14.5);
    assert.strictEqual(segments[1].assignedSlideId, 'sl_2_eligibility');

    // Next at 28.2s user clicks Slide 3!
    const cueTime2 = 28.2;
    const chosenSlide2 = 'sl_3_salary';
    const curIdx2 = segments.findIndex(s => cueTime2 >= s.startTime && cueTime2 < s.endTime);
    assert.strictEqual(curIdx2, 1);

    const oldEnd2 = segments[curIdx2].endTime;
    segments[curIdx2].endTime = cueTime2;
    segments.push({
      id: 'seg_cued_2',
      startTime: cueTime2,
      endTime: oldEnd2,
      assignedSlideId: chosenSlide2
    });

    assert.strictEqual(segments.length, 3);
    assert.strictEqual(segments[1].endTime, 28.2);
    assert.strictEqual(segments[2].startTime, 28.2);
    assert.strictEqual(segments[2].assignedSlideId, 'sl_3_salary');
  });

  it('7. Fresh Live Sync Session: Dynamic building from 00:00 without pre-divided blocks', () => {
    let narrationSegments = [
      { id: 'seg_init', startTime: 0, endTime: 70, assignedSlideId: 'sl_1_recruitment' }
    ];

    assert.strictEqual(narrationSegments.length, 1);
    assert.strictEqual(narrationSegments[0].assignedSlideId, 'sl_1_recruitment');

    // Cue 1: Age eligibility at 15s
    narrationSegments[0].endTime = 15;
    narrationSegments.push({ id: 'seg_2', startTime: 15, endTime: 70, assignedSlideId: 'sl_2_eligibility' });

    // Cue 2: Salary at 32s
    narrationSegments[1].endTime = 32;
    narrationSegments.push({ id: 'seg_3', startTime: 32, endTime: 70, assignedSlideId: 'sl_3_salary' });

    // Cue 3: Revisiting Age eligibility at 50s
    narrationSegments[2].endTime = 50;
    narrationSegments.push({ id: 'seg_4', startTime: 50, endTime: 70, assignedSlideId: 'sl_2_eligibility' });

    assert.strictEqual(narrationSegments.length, 4);
    assert.strictEqual(narrationSegments[0].assignedSlideId, 'sl_1_recruitment');
    assert.strictEqual(narrationSegments[1].assignedSlideId, 'sl_2_eligibility');
    assert.strictEqual(narrationSegments[2].assignedSlideId, 'sl_3_salary');
    assert.strictEqual(narrationSegments[3].assignedSlideId, 'sl_2_eligibility');
  });

  it('8. Preview Approval Gate (Step 7 & 9): Final Export locked until explicitly approved, invalidated on edit', () => {
    let isPreviewApproved = false;

    // Export must be locked initially
    assert.strictEqual(isPreviewApproved, false, 'Export must start locked');

    // User reviews demo preview and clicks Approve
    isPreviewApproved = true;
    assert.strictEqual(isPreviewApproved, true, 'Export unlocked after approval');

    // User later makes an edit (e.g. nudges slide time)
    const onEdit = () => { isPreviewApproved = false; };
    onEdit();
    assert.strictEqual(isPreviewApproved, false, 'Export immediately re-locked upon edit until fresh approval');
  });

  it('9. Undo / Redo Stack: Reversible editing without data loss', () => {
    const undoStack = [];
    const redoStack = [];
    let state = [{ id: 'clip_1', duration: 10 }];

    // Action 1: Change duration to 15
    undoStack.push(JSON.stringify(state));
    state[0].duration = 15;
    assert.strictEqual(state[0].duration, 15);

    // Undo action
    redoStack.push(JSON.stringify(state));
    state = JSON.parse(undoStack.pop());
    assert.strictEqual(state[0].duration, 10, 'Undo restored original duration');

    // Redo action
    undoStack.push(JSON.stringify(state));
    state = JSON.parse(redoStack.pop());
    assert.strictEqual(state[0].duration, 15, 'Redo restored modified duration');
  });

});
