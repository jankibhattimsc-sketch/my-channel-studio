const test = require('node:test');
const assert = require('node:assert');

test('Slide & Audio Synchronization Engine Verification Suite', async (t) => {
  const sync = await import('../public/js/utils/slideAudioSync.js');

  await t.test('1. Precision Timestamp Parsing and Formatting', () => {
    assert.strictEqual(sync.parseTimeToSeconds('0:00'), 0);
    assert.strictEqual(sync.parseTimeToSeconds('0:45'), 45);
    assert.strictEqual(sync.parseTimeToSeconds('1:30'), 90);
    assert.strictEqual(sync.parseTimeToSeconds('02:15'), 135);
    assert.strictEqual(sync.parseTimeToSeconds('60s'), 60);

    const range = sync.parseRangeToSeconds('0:45 - 1:30');
    assert.strictEqual(range.start, 45);
    assert.strictEqual(range.end, 90);
    assert.strictEqual(range.duration, 45);

    assert.strictEqual(sync.formatSecondsToTime(0), '0:00');
    assert.strictEqual(sync.formatSecondsToTime(75), '1:15');
    assert.strictEqual(sync.formatSecondsToTime(130), '2:10');
    assert.strictEqual(sync.formatTimeRange(45, 90), '0:45 - 1:30');
  });

  await t.test('2. Automatic Semantic Slide-to-Speech Matching (Non-Equal Division)', () => {
    const rawSlides = [
      { id: 1, title: 'ગુજરાત કર્મચારી પગાર અને DA વધારો ૨૦૨૬: સત્તાવાર નિર્ણય', bulletPoints: ['પરિપત્ર જાહેર'] },
      { id: 2, title: 'પાત્રતા અને ગ્રેડ-પે મુજબ ચોખ્ખો વધારો', bulletPoints: ['વર્ગ-૪ કર્મચારીઓ', 'વર્ગ-૩ કર્મચારીઓ', 'સાતમું પગાર પંચ'] },
      { id: 3, title: 'એરિયર્સ ચૂકવણી અને ખાતામાં જમા તારીખ', bulletPoints: ['રોકડમાં ચૂકવણી', 'બેંક ખાતામાં જમા'] },
      { id: 4, title: 'ચેતવણી અને સત્તાવાર પુરાવો', bulletPoints: ['અફવાઓથી દૂર રહો'] }
    ];

    const matched = sync.matchSlidesToAudio(rawSlides, 180);
    assert.strictEqual(matched.length, 4);

    // Slide 1 must start at 0
    assert.strictEqual(matched[0].startTime, 0);

    // Each slide boundary must match the next slide start
    for (let i = 0; i < matched.length - 1; i++) {
      assert.strictEqual(matched[i].endTime, matched[i + 1].startTime, `Slide ${i+1} end should match Slide ${i+2} start`);
    }

    // Final slide must reach total audio duration
    assert.strictEqual(matched[matched.length - 1].endTime, 180);

    // Durations must NOT be blindly equal (Slide 2 has 3 bullet points, more content -> different duration)
    const durations = matched.map(s => s.duration);
    const allEqual = durations.every(d => d === durations[0]);
    assert.strictEqual(allEqual, false, 'Slide durations should be content-weighted, not blindly equal');
  });

  await t.test('3. Timeline Continuity Validation & Gap/Overlap Detection', () => {
    // Normal continuous slides
    const validSlides = [
      { startTime: 0, endTime: 45, duration: 45 },
      { startTime: 45, endTime: 90, duration: 45 },
      { startTime: 90, endTime: 150, duration: 60 }
    ];
    const resValid = sync.validateTimeline(validSlides, 150);
    assert.strictEqual(resValid.isValid, true);
    assert.strictEqual(resValid.isFullySynchronized, true);

    // Slide with gap
    const gapSlides = [
      { startTime: 0, endTime: 40, duration: 40 },
      { startTime: 45, endTime: 90, duration: 45 } // 5s gap!
    ];
    const resGap = sync.validateTimeline(gapSlides, 90);
    assert.strictEqual(resGap.warnings.length > 0, true, 'Should detect gap between slides');

    // Slide with overlap
    const overlapSlides = [
      { startTime: 0, endTime: 50, duration: 50 },
      { startTime: 45, endTime: 90, duration: 45 } // 5s overlap!
    ];
    const resOverlap = sync.validateTimeline(overlapSlides, 90);
    assert.strictEqual(resOverlap.warnings.length > 0, true, 'Should detect overlap between slides');
  });

  await t.test('4. 1-Click Gap and Overlap Automatic Repair', () => {
    const brokenSlides = [
      { id: 1, startTime: 0, endTime: 35, duration: 35 },
      { id: 2, startTime: 42, endTime: 75, duration: 33 }, // gap
      { id: 3, startTime: 70, endTime: 110, duration: 40 } // overlap
    ];

    const repaired = sync.fixTimelineGaps(brokenSlides, 120);
    assert.strictEqual(repaired[0].startTime, 0);
    assert.strictEqual(repaired[0].endTime, repaired[1].startTime);
    assert.strictEqual(repaired[1].endTime, repaired[2].startTime);
    assert.strictEqual(repaired[2].endTime, 120);

    const val = sync.validateTimeline(repaired, 120);
    assert.strictEqual(val.isFullySynchronized, true);
  });

  await t.test('5. Sync Manifest Generation for Video Rendering', () => {
    const mockProject = {
      topic: 'ગુજરાત કર્મચારી પગાર અને DA વધારો ૨૦૨૬',
      voiceAudio: { audioUrl: '/audio/test_connected_emotional_acting.mp3', provider: 'Neural Voice' }
    };
    const mockSlides = [
      { id: 1, title: 'સ્લાઇડ ૧', startTime: 0, endTime: 45, duration: 45, audioTime: '0:00 - 0:45' },
      { id: 2, title: 'સ્લાઇડ ૨', startTime: 45, endTime: 90, duration: 45, audioTime: '0:45 - 1:30' }
    ];

    const manifest = sync.createSyncManifest(mockProject, mockSlides, 90);
    assert.strictEqual(manifest.projectName, mockProject.topic);
    assert.strictEqual(manifest.slideCount, 2);
    assert.strictEqual(manifest.totalDurationSeconds, 90);
    assert.strictEqual(manifest.slides[0].startTime, 0);
    assert.strictEqual(manifest.slides[1].endTime, 90);
    assert.ok(manifest.renderingSpecification.resolution === '1920x1080');
  });
});
