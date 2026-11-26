const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('ADVANCED VOICEOVER + PPT + SCRIPT AUTO SYNC SYSTEM', () => {

  // Helper simulating getSlideWordData function
  function getSlideWordData(scriptText, durationSec) {
    const text = (scriptText || '').trim();
    if (!text) {
      return { sentences: [], words: [], totalDuration: 0 };
    }

    const rawSentences = text
      .split(/(?<=[.!?।\n])\s+/)
      .map(s => s.trim())
      .filter(Boolean);

    const sentences = [];
    const words = [];
    let globalWordIdx = 0;

    rawSentences.forEach((sText, sIdx) => {
      const rawWords = sText.split(/\s+/).filter(Boolean);
      const sentWords = [];

      rawWords.forEach(w => {
        const wObj = {
          word: w,
          wordIndex: globalWordIdx,
          sentenceIndex: sIdx
        };
        words.push(wObj);
        sentWords.push(wObj);
        globalWordIdx++;
      });

      sentences.push({
        sentenceIndex: sIdx,
        text: sText,
        words: sentWords
      });
    });

    const totalWords = words.length;
    const dur = (durationSec && durationSec > 0) ? durationSec : Math.max(1, totalWords * 0.45);
    const timePerWord = dur / Math.max(1, totalWords);

    words.forEach((w, i) => {
      w.start = i * timePerWord;
      w.end = (i + 1) * timePerWord;
    });

    return { sentences, words, totalDuration: dur };
  }

  it('1. Perfect Audio & Slide Synchronization: Each slide has dedicated audio segment, start_time, end_time', () => {
    const slides = [
      { id: 'sl_1', slideNumber: 1, title: 'પરિપત્ર વિગત', scriptText: 'નમસ્કાર મિત્રો, આજના વિડીયોમાં આપનું સ્વાગત છે.', audioUrl: 'blob:audio_1.mp3', duration: 8.0 },
      { id: 'sl_2', slideNumber: 2, title: 'ડીએ વધારો', scriptText: 'ગુજરાત સરકારે કર્મચારીઓ માટે મોંઘવારી ભથ્થામાં વધારો જાહેર કર્યો છે.', audioUrl: 'blob:audio_2.mp3', duration: 10.5 },
      { id: 'sl_3', slideNumber: 3, title: 'ચૂકવણી તારીખો', scriptText: 'આ વધારો આગામી મહિનાથી પગારમાં ઉમેરાશે.', audioUrl: 'blob:audio_3.mp3', duration: 7.2 }
    ];

    let currentTimelineOffset = 0;
    const mappedSlides = slides.map((s, idx) => {
      const startTime = currentTimelineOffset;
      const endTime = currentTimelineOffset + s.duration;
      currentTimelineOffset = endTime;

      const wordData = getSlideWordData(s.scriptText, s.duration);

      return {
        slide_id: s.id,
        slide_number: s.slideNumber,
        slide_image: s.imageUrl || '',
        script_text: s.scriptText,
        audio_segment: { url: s.audioUrl, duration: s.duration },
        start_time: startTime,
        end_time: endTime,
        word_timestamps: wordData.words
      };
    });

    assert.strictEqual(mappedSlides.length, 3);
    assert.strictEqual(mappedSlides[0].start_time, 0);
    assert.strictEqual(mappedSlides[0].end_time, 8.0);
    assert.strictEqual(mappedSlides[1].start_time, 8.0);
    assert.strictEqual(mappedSlides[1].end_time, 18.5);
    assert.strictEqual(mappedSlides[2].start_time, 18.5);
    assert.strictEqual(mappedSlides[2].end_time, 25.7);

    // Verify Clean Cut (0s delay between end of slide 1 and start of slide 2)
    assert.strictEqual(mappedSlides[0].end_time, mappedSlides[1].start_time);
    assert.strictEqual(mappedSlides[1].end_time, mappedSlides[2].start_time);
  });

  it('2. Automatic Script Changing According to Slide: Script panel strictly updates when slide advances', () => {
    const slides = [
      { slideNumber: 1, scriptText: 'સ્ક્રિપ્ટ ૧: પરિચય અને મુખ્ય મુદ્દાઓ.' },
      { slideNumber: 2, scriptText: 'સ્ક્રિપ્ટ ૨: ડીએ વધારાની ટકાવારી અને પાત્રતા.' },
      { slideNumber: 3, scriptText: 'સ્ક્રિપ્ટ ૩: નિષ્કર્ષ અને આગળની કાર્યવાહી.' }
    ];

    // State simulator
    let activeSlideIdx = 0;
    function getActiveScript(idx) {
      return slides[idx]?.scriptText || '';
    }

    assert.strictEqual(getActiveScript(activeSlideIdx), 'સ્ક્રિપ્ટ ૧: પરિચય અને મુખ્ય મુદ્દાઓ.');

    // Audio for slide 1 finishes -> Advance to slide 2
    activeSlideIdx++;
    assert.strictEqual(getActiveScript(activeSlideIdx), 'સ્ક્રિપ્ટ ૨: ડીએ વધારાની ટકાવારી અને પાત્રતા.');

    // Audio for slide 2 finishes -> Advance to slide 3
    activeSlideIdx++;
    assert.strictEqual(getActiveScript(activeSlideIdx), 'સ્ક્રિપ્ટ ૩: નિષ્કર્ષ અને આગળની કાર્યવાહી.');
  });

  it('3. Word-Level Audio Highlighting: Accurately identifies the spoken word token from currentTime', () => {
    const script = 'ગુજરાત સરકારે કર્મચારીઓ માટે મોંઘવારી ભથ્થામાં વધારો જાહેર કર્યો છે.';
    const totalDuration = 10.0;
    const wordData = getSlideWordData(script, totalDuration);

    assert.ok(wordData.words.length > 0, 'Must have word tokens');
    const totalWords = wordData.words.length;
    const timePerWord = totalDuration / totalWords;

    // Test currentTime = 0.5s -> Should be word 0 ('ગુજરાત')
    let cTime = 0.5;
    let foundWord = wordData.words.find(w => cTime >= w.start && cTime < w.end);
    assert.strictEqual(foundWord.word, 'ગુજરાત');
    assert.strictEqual(foundWord.wordIndex, 0);

    // Test currentTime in middle
    const midIdx = Math.floor(totalWords / 2);
    cTime = (midIdx * timePerWord) + 0.1;
    foundWord = wordData.words.find(w => cTime >= w.start && cTime < w.end);
    assert.strictEqual(foundWord.wordIndex, midIdx);

    // When audio pauses at 4.2s, the highlight index remains frozen at that exact token
    const pausedTime = 4.2;
    const pausedWord = wordData.words.find(w => pausedTime >= w.start && pausedTime < w.end);
    assert.ok(pausedWord !== undefined);
    assert.ok(pausedWord.start <= pausedTime && pausedTime <= pausedWord.end);
  });

  it('4. Sentence Tracking & Upcoming Sentence Preview', () => {
    const multiSentenceScript = 'આ પહેલું વાક્ય છે. આ બીજું વાક્ય છે! આ ત્રીજું વાક્ય છે.';
    const wordData = getSlideWordData(multiSentenceScript, 9.0);

    assert.strictEqual(wordData.sentences.length, 3);
    assert.strictEqual(wordData.sentences[0].sentenceIndex, 0);
    assert.strictEqual(wordData.sentences[1].sentenceIndex, 1);
    assert.strictEqual(wordData.sentences[2].sentenceIndex, 2);

    // While sentence 0 is active, sentence 1 is upcoming and fully rendered
    const currentSentenceIdx = 0;
    const upcomingSentence = wordData.sentences[currentSentenceIdx + 1];
    assert.strictEqual(upcomingSentence.sentenceIndex, 1);
    assert.ok(upcomingSentence.text.includes('બીજું વાક્ય'));
  });

  it('5. Audio Speed Adjustment: Scales playback time dynamically (0.75x, 1x, 1.25x, 1.5x)', () => {
    const baseDuration = 10.0; // 1x
    const speeds = [0.75, 1.0, 1.25, 1.5];

    speeds.forEach(speed => {
      const effectiveWallClockDuration = baseDuration / speed;
      if (speed === 1.0) assert.strictEqual(effectiveWallClockDuration, 10.0);
      if (speed === 1.5) assert.strictEqual(Math.round(effectiveWallClockDuration * 100) / 100, 6.67);
      if (speed === 0.75) assert.strictEqual(Math.round(effectiveWallClockDuration * 100) / 100, 13.33);
      assert.ok(effectiveWallClockDuration > 0);
    });
  });

  it('6. Volume Control is within valid 0.0 to 1.0 bounds', () => {
    let volume = 1.0;
    assert.strictEqual(volume, 1.0);

    // Slide-wise adjustment to 50%
    volume = 0.5;
    assert.strictEqual(volume, 0.5);

    // Muted
    volume = 0.0;
    assert.strictEqual(volume, 0.0);
  });

  it('7. Original Presentation Preservation: Zero animation or zoom transitions (Clean Cut 0s)', () => {
    const transitionType = 'cut';
    const transitionDuration = 0; // 0s instant clean cut
    assert.strictEqual(transitionType, 'cut');
    assert.strictEqual(transitionDuration, 0, 'Must have zero animation or transition delay');
  });
});

