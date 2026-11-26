const { test, describe } = require('node:test');
const assert = require('node:assert');

// Test Date-Time Intelligence logic
describe('Date-Time Intelligence Engine (Asia/Kolkata)', () => {
  const GUJARATI_DIGITS = {
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
    '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
  };
  function convertGujaratiNumbers(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[૦-૯]/g, d => GUJARATI_DIGITS[d] || d);
  }

  function formatISTDisplay(dateInput) {
    if (!dateInput) return 'તારીખ ઉપલબ્ધ નથી (Unknown)';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'અમાન્ય તારીખ (Invalid)';

    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return formatter.format(d) + ' IST';
  }

  function parseYouTubeStudioDate(rawText, referenceTimestamp = Date.now()) {
    if (!rawText || typeof rawText !== 'string') return null;
    const normalized = convertGujaratiNumbers(rawText.trim());

    const hoursAgoMatch = normalized.match(/(\d+)\s*(?:hours?|hrs?|h|કલાક|घंटे)\s*(?:ago|પહેલા|पहले)?/i);
    if (hoursAgoMatch) {
      const hours = parseInt(hoursAgoMatch[1], 10);
      if (!isNaN(hours) && hours >= 0 && hours < 8760) {
        const estimatedDate = new Date(referenceTimestamp - (hours * 60 * 60 * 1000));
        return {
          iso: estimatedDate.toISOString(),
          isRelative: true,
          hoursAgo: hours,
          display: formatISTDisplay(estimatedDate)
        };
      }
    }

    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthRegex = new RegExp(`(?:published\\s+on\\s+)?([0-9]{1,2})[\\s\\-]+(${months.join('|')})[\\s,]+([0-9]{4})`, 'i');
    const monthMatch = normalized.match(monthRegex);
    if (monthMatch) {
      const day = parseInt(monthMatch[1], 10);
      const month = months.indexOf(monthMatch[2].toLowerCase());
      const year = parseInt(monthMatch[3], 10);
      const parsed = new Date(Date.UTC(year, month, day, 6, 30));
      if (!isNaN(parsed.getTime())) {
        return {
          iso: parsed.toISOString(),
          isRelative: false,
          display: formatISTDisplay(parsed)
        };
      }
    }

    return null;
  }

  test('converts Gujarati numerals accurately', () => {
    assert.strictEqual(convertGujaratiNumbers('૨૪,૮૫૦'), '24,850');
    assert.strictEqual(convertGujaratiNumbers('૧૯મો હપ્તો ₹૨,૦૦૦'), '19મો હપ્તો ₹2,000');
  });

  test('parses relative hours in Gujarati and English', () => {
    const fixedNow = new Date('2026-10-31T12:00:00.000Z').getTime();
    const parsedEng = parseYouTubeStudioDate('Published 4 hours ago', fixedNow);
    assert.ok(parsedEng);
    assert.strictEqual(parsedEng.hoursAgo, 4);

    const parsedGuj = parseYouTubeStudioDate('૪ કલાક પહેલા', fixedNow);
    assert.ok(parsedGuj);
    assert.strictEqual(parsedGuj.hoursAgo, 4);
  });

  test('parses absolute dates and formats in Asia/Kolkata', () => {
    const parsed = parseYouTubeStudioDate('Published on 28 Oct 2026');
    assert.ok(parsed);
    assert.ok(parsed.display.includes('28 Oct 2026'));
    assert.ok(parsed.display.includes('IST'));
  });

  test('zero hallucination: returns null for invalid / unverified dates', () => {
    assert.strictEqual(parseYouTubeStudioDate('random studio title with no date'), null);
    assert.strictEqual(parseYouTubeStudioDate(''), null);
    assert.strictEqual(parseYouTubeStudioDate(null), null);
  });
});

describe('Idea Analysis & Growth Intelligence Engine', () => {
  const CLASSIFICATIONS = {
    BREAKING: 'Breaking',
    TRENDING: 'Trending',
    GROWING: 'Growing',
    STABLE: 'Stable',
    DECLINING: 'Declining',
    INSUFFICIENT_DATA: 'Insufficient Data'
  };

  function analyzeIdeaMetrics(currentData = {}, historySnapshots = []) {
    const currentViews = (typeof currentData.views48h === 'number' && !isNaN(currentData.views48h)) 
      ? currentData.views48h 
      : null;

    if (currentViews === null || currentViews <= 0) {
      return {
        classification: CLASSIFICATIONS.INSUFFICIENT_DATA,
        growthPct: null,
        velocityPerHour: null,
        hasGenuineBaseline: false,
        isVerified: false
      };
    }

    const validHistory = (historySnapshots || [])
      .filter(h => typeof h.views48h === 'number' && h.views48h > 0 && h.timestamp)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    if (validHistory.length === 0) {
      return {
        views48h: currentViews,
        previousViews48h: null,
        growthPct: null,
        velocityPerHour: null,
        classification: CLASSIFICATIONS.INSUFFICIENT_DATA,
        hasGenuineBaseline: false,
        isVerified: true
      };
    }

    const baseline = validHistory[0];
    const baselineViews = baseline.views48h;
    const tOld = new Date(baseline.timestamp).getTime();
    const tNew = new Date(currentData.analyzedAt || Date.now()).getTime();
    const elapsedHours = Number(((tNew - tOld) / (3600 * 1000)).toFixed(2));

    if (elapsedHours <= 0) {
      return {
        views48h: currentViews,
        previousViews48h: baselineViews,
        growthPct: null,
        velocityPerHour: null,
        classification: CLASSIFICATIONS.STABLE,
        hasGenuineBaseline: true,
        isVerified: true
      };
    }

    const viewsDelta = currentViews - baselineViews;
    const growthPct = Number((((currentViews - baselineViews) / baselineViews) * 100).toFixed(1));
    const velocityPerHour = Math.round(viewsDelta / elapsedHours);

    let classification = CLASSIFICATIONS.STABLE;
    if (growthPct >= 40 || (velocityPerHour > 1000 && elapsedHours <= 24)) {
      classification = CLASSIFICATIONS.BREAKING;
    } else if (growthPct >= 18 || (velocityPerHour > 300 && elapsedHours <= 48)) {
      classification = CLASSIFICATIONS.TRENDING;
    } else if (growthPct >= 5) {
      classification = CLASSIFICATIONS.GROWING;
    } else if (growthPct <= -5) {
      classification = CLASSIFICATIONS.DECLINING;
    }

    return {
      views48h: currentViews,
      previousViews48h: baselineViews,
      viewsDelta,
      growthPct,
      velocityPerHour,
      elapsedHours,
      classification,
      hasGenuineBaseline: true,
      isVerified: true
    };
  }

  test('returns Insufficient Data when no previous baseline exists', () => {
    const analysis = analyzeIdeaMetrics({ views48h: 12500 }, []);
    assert.strictEqual(analysis.classification, CLASSIFICATIONS.INSUFFICIENT_DATA);
    assert.strictEqual(analysis.hasGenuineBaseline, false);
    assert.strictEqual(analysis.growthPct, null);
  });

  test('returns Insufficient Data when current views are null or zero', () => {
    const analysis = analyzeIdeaMetrics({ views48h: null }, [{ views48h: 5000, timestamp: '2026-10-31T08:00:00Z' }]);
    assert.strictEqual(analysis.classification, CLASSIFICATIONS.INSUFFICIENT_DATA);
    assert.strictEqual(analysis.isVerified, false);
  });

  test('accurately calculates growth % and velocity per hour with genuine baseline', () => {
    const history = [{
      views48h: 10000,
      timestamp: new Date(Date.now() - (4 * 3600 * 1000)).toISOString() // 4 hours ago
    }];
    const current = {
      views48h: 15000, // +5000 views (+50%) in 4 hours = 1250 views/hr
      analyzedAt: new Date().toISOString()
    };
    const analysis = analyzeIdeaMetrics(current, history);
    assert.strictEqual(analysis.hasGenuineBaseline, true);
    assert.strictEqual(analysis.viewsDelta, 5000);
    assert.strictEqual(analysis.growthPct, 50);
    assert.strictEqual(analysis.velocityPerHour, 1250);
    assert.strictEqual(analysis.classification, CLASSIFICATIONS.BREAKING);
  });

  test('accurately classifies Trending, Growing, Stable, and Declining', () => {
    const baseTime = new Date(Date.now() - (10 * 3600 * 1000)).toISOString();
    
    // Trending: +25%
    const trendRes = analyzeIdeaMetrics({ views48h: 12500 }, [{ views48h: 10000, timestamp: baseTime }]);
    assert.strictEqual(trendRes.classification, CLASSIFICATIONS.TRENDING);

    // Growing: +10%
    const growRes = analyzeIdeaMetrics({ views48h: 11000 }, [{ views48h: 10000, timestamp: baseTime }]);
    assert.strictEqual(growRes.classification, CLASSIFICATIONS.GROWING);

    // Stable: +2%
    const stableRes = analyzeIdeaMetrics({ views48h: 10200 }, [{ views48h: 10000, timestamp: baseTime }]);
    assert.strictEqual(stableRes.classification, CLASSIFICATIONS.STABLE);

    // Declining: -15%
    const declineRes = analyzeIdeaMetrics({ views48h: 8500 }, [{ views48h: 10000, timestamp: baseTime }]);
    assert.strictEqual(declineRes.classification, CLASSIFICATIONS.DECLINING);
  });
});

