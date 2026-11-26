const { test, describe } = require('node:test');
const assert = require('node:assert');

// 1. Test Date-Time Formatting and Grouping Logic
describe('Module 2 & 5: Smart Idea Date-Time & Grouping Engine (Asia/Kolkata)', () => {
  const TIMEZONE = 'Asia/Kolkata';

  function formatIndianDateDisplay(dateInput) {
    if (!dateInput) return 'તારીખ ઉપલબ્ધ નથી (Unknown)';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'અમાન્ય તારીખ';

    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: TIMEZONE,
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    return formatter.format(d);
  }

  function formatIndianTimeDisplay(dateInput) {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';

    const formatter = new Intl.DateTimeFormat('en-IN', {
      timeZone: TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    return formatter.format(d) + ' IST';
  }

  function formatIndianDateTimeDisplay(dateInput) {
    if (!dateInput) return 'તારીખ ઉપલબ્ધ નથી (Unknown)';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return 'અમાન્ય તારીખ';
    return `${formatIndianDateDisplay(d)}, ${formatIndianTimeDisplay(d)}`;
  }

  function filterIdeasByDateRange(ideas = [], rangeKey = 'all', referenceDate = new Date()) {
    if (!Array.isArray(ideas)) return [];
    if (rangeKey === 'all') return [...ideas];

    const ref = new Date(referenceDate);
    const todayStr = ref.toISOString().slice(0, 10);
    const yesterday = new Date(ref.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(ref.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(ref.getTime() - 30 * 24 * 60 * 60 * 1000);

    return ideas.filter(idea => {
      const ideaDate = new Date(idea.createdAt);
      if (isNaN(ideaDate.getTime())) return false;
      const ideaDateStr = ideaDate.toISOString().slice(0, 10);

      switch (rangeKey) {
        case 'today':
          return ideaDateStr === todayStr;
        case 'yesterday':
          return ideaDateStr === yesterdayStr;
        case 'last7days':
          return ideaDate >= sevenDaysAgo;
        case 'last30days':
          return ideaDate >= thirtyDaysAgo;
        default:
          return true;
      }
    });
  }

  function groupIdeasByDate(ideas = []) {
    if (!Array.isArray(ideas)) return [];
    const map = new Map();

    for (const idea of ideas) {
      const rawDate = idea.createdAt || new Date().toISOString();
      const d = new Date(rawDate);
      const dateLabel = isNaN(d.getTime()) ? 'અન્ય તારીખ' : formatIndianDateDisplay(d);

      if (!map.has(dateLabel)) {
        map.set(dateLabel, {
          dateLabel,
          ideas: []
        });
      }
      map.get(dateLabel).ideas.push(idea);
    }

    return Array.from(map.values());
  }

  test('formats dates in authentic Indian format (e.g. 31 October 2026, 01:45 PM IST)', () => {
    // 2026-10-31T08:15:00.000Z corresponds to 1:45 PM IST (+05:30)
    const fixedIso = '2026-10-31T08:15:00.000Z';
    const dateFormatted = formatIndianDateDisplay(fixedIso);
    const timeFormatted = formatIndianTimeDisplay(fixedIso);
    const fullFormatted = formatIndianDateTimeDisplay(fixedIso);

    assert.ok(dateFormatted.includes('31'));
    assert.ok(dateFormatted.includes('October'));
    assert.ok(dateFormatted.includes('2026'));
    assert.ok(timeFormatted.includes('01:45'));
    assert.ok(timeFormatted.includes('IST'));
    assert.ok(fullFormatted.includes('31 October 2026, 01:45 pm IST') || fullFormatted.includes('31 October 2026, 01:45 PM IST') || fullFormatted.includes('01:45'));
  });

  test('filters ideas by Today, Yesterday, and Last 7 Days accurately', () => {
    const fixedNow = new Date('2026-10-31T10:00:00.000Z');
    const mockIdeas = [
      { id: '1', title: 'Idea Today', createdAt: '2026-10-31T05:00:00.000Z' },
      { id: '2', title: 'Idea Yesterday', createdAt: '2026-10-30T09:00:00.000Z' },
      { id: '3', title: 'Idea 5 Days Ago', createdAt: '2026-10-26T12:00:00.000Z' },
      { id: '4', title: 'Idea 40 Days Ago', createdAt: '2026-09-20T10:00:00.000Z' }
    ];

    const todayIdeas = filterIdeasByDateRange(mockIdeas, 'today', fixedNow);
    assert.strictEqual(todayIdeas.length, 1);
    assert.strictEqual(todayIdeas[0].title, 'Idea Today');

    const yesterdayIdeas = filterIdeasByDateRange(mockIdeas, 'yesterday', fixedNow);
    assert.strictEqual(yesterdayIdeas.length, 1);
    assert.strictEqual(yesterdayIdeas[0].title, 'Idea Yesterday');

    const weekIdeas = filterIdeasByDateRange(mockIdeas, 'last7days', fixedNow);
    assert.strictEqual(weekIdeas.length, 3);
  });

  test('groups ideas by distinct creation dates', () => {
    const mockIdeas = [
      { id: '1', title: 'Idea 1', createdAt: '2026-10-31T05:00:00.000Z' },
      { id: '2', title: 'Idea 2', createdAt: '2026-10-31T08:00:00.000Z' },
      { id: '3', title: 'Idea 3', createdAt: '2026-10-30T09:00:00.000Z' }
    ];

    const groups = groupIdeasByDate(mockIdeas);
    assert.strictEqual(groups.length, 2);
    assert.strictEqual(groups[0].ideas.length, 2);
    assert.strictEqual(groups[1].ideas.length, 1);
  });
});

// 2. Test Copy-Paste Smart Parser Logic
describe('Module 1.B: Copy-Paste Idea Parser', () => {
  const GUJARATI_DIGITS = {
    '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
    '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
  };
  function convertGujaratiNumbers(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[૦-૯]/g, d => GUJARATI_DIGITS[d] || d);
  }

  function parsePastedIdeaText(rawText = '') {
    if (!rawText || typeof rawText !== 'string') {
      return {
        title: '',
        description: '',
        originalText: '',
        detectedViews: null,
        detectedDate: null,
        detectedUrl: '',
        detectedSource: 'Copy-Paste',
        tags: []
      };
    }

    const trimmed = rawText.trim();
    const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);

    // 1. Detect candidate URL
    let detectedUrl = '';
    const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      detectedUrl = urlMatch[1];
    }

    // 2. Detect candidate Source
    let detectedSource = 'Copy-Paste';
    if (detectedUrl.includes('youtube.com') || detectedUrl.includes('youtu.be')) {
      detectedSource = 'YouTube';
    } else if (detectedUrl.includes('ojas.gujarat.gov.in') || detectedUrl.includes('gujarat.gov.in')) {
      detectedSource = 'Gujarat Govt Portal';
    }

    // 3. Detect candidate View Counts
    let detectedViews = null;
    const normalizedForViews = convertGujaratiNumbers(trimmed);
    const viewsMatch = normalizedForViews.match(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?[kKmM]|[0-9]{3,7})\s*(?:views?|viewers?|વ્યુઝ|વ્યૂઝ)/i);
    if (viewsMatch) {
      const rawVal = viewsMatch[1].replace(/,/g, '').toLowerCase();
      if (rawVal.endsWith('k')) {
        detectedViews = Math.round(parseFloat(rawVal.replace('k', '')) * 1000);
      } else if (rawVal.endsWith('m')) {
        detectedViews = Math.round(parseFloat(rawVal.replace('m', '')) * 1000000);
      } else {
        const parsedInt = parseInt(rawVal, 10);
        if (!isNaN(parsedInt)) detectedViews = parsedInt;
      }
    }

    // 4. Candidate Title
    let candidateTitle = '';
    for (const line of lines) {
      if (line.startsWith('http://') || line.startsWith('https://')) continue;
      if (/^\d{1,2}:\d{2}/.test(line)) continue;
      if (line.length >= 5) {
        candidateTitle = line.substring(0, 120).trim();
        break;
      }
    }

    // 5. Candidate Tags from Hashtags
    const tagMatches = trimmed.match(/#([\u0A80-\u0AFFa-zA-Z0-9_-]+)/g);
    const tags = tagMatches ? tagMatches.map(t => t.replace('#', '').trim()) : [];

    return {
      title: candidateTitle || (lines[0] || '').substring(0, 80),
      description: lines.length > 1 ? lines.slice(1).join('\n') : '',
      originalText: trimmed,
      detectedViews,
      detectedUrl,
      detectedSource,
      tags
    };
  }

  test('extracts title, view counts, and URLs from pasted YouTube content', () => {
    const raw = `ગુજરાત આંગણવાડી ભરતી ૨૦૨૬ મોટી જાહેરાત
સત્તાવાર વેબસાઈટ પર ૧૪,૦૦૦ જગ્યાઓ માટે ઓનલાઇન ફોર્મ શરૂ થયા છે.
18,450 views • 3 days ago
https://youtube.com/watch?v=abcdef123
#AnganwadiBharti #GujaratGovt`;

    const parsed = parsePastedIdeaText(raw);
    assert.strictEqual(parsed.title, 'ગુજરાત આંગણવાડી ભરતી ૨૦૨૬ મોટી જાહેરાત');
    assert.strictEqual(parsed.detectedViews, 18450);
    assert.strictEqual(parsed.detectedUrl, 'https://youtube.com/watch?v=abcdef123');
    assert.strictEqual(parsed.detectedSource, 'YouTube');
    assert.strictEqual(parsed.originalText, raw);
    assert.strictEqual(parsed.tags.length, 2);
  });

  test('zero hallucination: returns null for views when no view counts are in pasted text', () => {
    const raw = `પીએમ કિસાન યોજના ૨૦૨૬
નવા નિયમો જાહેર થયા છે.`;

    const parsed = parsePastedIdeaText(raw);
    assert.strictEqual(parsed.title, 'પીએમ કિસાન યોજના ૨૦૨૬');
    assert.strictEqual(parsed.detectedViews, null);
    assert.strictEqual(parsed.detectedUrl, '');
  });
});

// 3. Test Idea State & Timestamp Preservation on Edit
describe('Module 2 & 3: Timestamp Isolation and Preservation on Edit', () => {
  function createOrUpdateIdea(existingIdea, newData) {
    const isNew = !existingIdea;
    const nowIso = new Date().toISOString();

    return {
      id: existingIdea ? existingIdea.id : ('idea_' + Date.now()),
      projectId: 'proj_123',
      title: newData.title || existingIdea?.title || 'નવો આઈડિયા',
      description: newData.description !== undefined ? newData.description : (existingIdea?.description || ''),
      originalText: newData.originalText !== undefined ? newData.originalText : (existingIdea?.originalText || ''),
      inputType: newData.inputType || existingIdea?.inputType || 'manual',
      views48h: newData.views48h !== undefined ? newData.views48h : (existingIdea?.views48h || null),
      timezone: 'Asia/Kolkata',
      createdAt: existingIdea ? existingIdea.createdAt : nowIso, // NEVER overwrite createdAt
      updatedAt: nowIso // ALWAYS update updatedAt
    };
  }

  test('preserves original createdAt when an existing idea is updated', async () => {
    const originalCreatedAt = '2026-10-25T08:00:00.000Z';
    const existing = {
      id: 'idea_orig_1',
      title: 'Original Title',
      createdAt: originalCreatedAt,
      updatedAt: originalCreatedAt
    };

    // Sleep a few milliseconds to ensure timestamp difference
    await new Promise(r => setTimeout(r, 10));

    const updated = createOrUpdateIdea(existing, { title: 'Updated Title' });
    assert.strictEqual(updated.title, 'Updated Title');
    assert.strictEqual(updated.createdAt, originalCreatedAt); // MUST BE EQUAL
    assert.notStrictEqual(updated.updatedAt, originalCreatedAt); // MUST BE NEWER
  });
});

// 4. Test ChatGPT Master Prompt Generation with Selected Ideas
describe('Module 6: Multi-Idea Selected ChatGPT Prompt Generator', () => {
  function generateSelectedIdeasPrompt(selectedIdeas, channelContext = {}) {
    const channelName = channelContext.title || 'Gyan Yatra';
    const customUrl = channelContext.customUrl || '@gyan.yatra1';

    const ideasFormatted = selectedIdeas.map((idea, idx) => {
      const num = idx + 1;
      const viewsStr = (typeof idea.views48h === 'number' && idea.views48h > 0)
        ? `${Number(idea.views48h).toLocaleString('en-IN')} વ્યુઝ (48-Hour Views)`
        : 'વ્યુઝ: ઉપલબ્ધ નથી';
      const sourceStr = idea.inputType === 'ocr' ? 'YouTube Studio Screenshot (OCR સ્કેન)'
        : idea.inputType === 'paste' ? `Copy-Paste સોર્સ (${idea.source || 'વેબસાઇટ'})`
        : 'ડાયરેક્ટ નોટબુક એન્ટ્રી (Manual Creation)';
      const descStr = idea.description ? `\n   - વિગત / નોંધ: "${idea.description.trim()}"` : '';

      return `[આઈડિયા #${num}]:
   - ટાઇટલ: "${idea.title}"
   - કેટેગરી: ${idea.category || 'સરકારી યોજના'}
   - ઇનપુટ સોર્સ: ${sourceStr}
   - વાસ્તવિક વ્યુઝ: ${viewsStr}${descStr}`;
    }).join('\n\n');

    return `ચેનલ: "${channelName}" (${customUrl})\n${ideasFormatted}`;
  }

  test('generates accurate prompt containing all selected ideas data without hallucinations', () => {
    const selected = [
      { id: '1', title: 'આંગણવાડી ભરતી ૨૦૨૬', views48h: 14200, category: 'સરકારી ભરતી', inputType: 'ocr', description: 'કુલ ૧૪,૦૦૦ જગ્યાઓ' },
      { id: '2', title: 'કર્મચારી DA વધારો પરિપત્ર', views48h: 18450, category: 'સરકારી યોજના', inputType: 'manual', description: '૪% ડીએ વધારો' }
    ];

    const prompt = generateSelectedIdeasPrompt(selected, { title: 'Gyan Yatra', customUrl: '@gyan.yatra1' });
    assert.ok(prompt.includes('Gyan Yatra'));
    assert.ok(prompt.includes('આંગણવાડી ભરતી ૨૦૨૬'));
    assert.ok(prompt.includes('14,200 વ્યુઝ'));
    assert.ok(prompt.includes('કર્મચારી DA વધારો પરિપત્ર'));
    assert.ok(prompt.includes('18,450 વ્યુઝ'));
    assert.ok(prompt.includes('કુલ ૧૪,૦૦૦ જગ્યાઓ'));
    assert.ok(prompt.includes('૪% ડીએ વધારો'));
  });
});

