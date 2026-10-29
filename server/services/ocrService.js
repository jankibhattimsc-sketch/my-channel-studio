const { createWorker } = require('tesseract.js');

function convertGujaratiDigits(str) {
  if (!str) return '';
  const gujDigits = ['૦', '૧', '૨', '૩', '૪', '૫', '૬', '૭', '૮', '૯'];
  return String(str).replace(/[૦-૯]/g, d => {
    const idx = gujDigits.indexOf(d);
    return idx !== -1 ? idx : d;
  });
}

function parseVal(s) {
  if (!s) return 0;
  const clean = convertGujaratiDigits(String(s).trim().toLowerCase());
  if (clean.endsWith('k')) return Math.round(parseFloat(clean.replace('k', '')) * 1000);
  if (clean.endsWith('m')) return Math.round(parseFloat(clean.replace('m', '')) * 1000000);
  const n = parseInt(clean.replace(/,/g, '').replace(/\s+/g, ''), 10);
  return isNaN(n) ? 0 : n;
}

function isStatusBar(str) {
  if (!str) return false;
  const norm = convertGujaratiDigits(str);
  if (/\b\d{1,2}:\d{2}\b/.test(norm)) return true;
  if (/\b\d{1,3}%\b/.test(norm)) return true;
  if (/\b(?:lte|volte|5g|4g|wifi|kb\/s|mb\/s|am|pm)\b/i.test(norm)) return true;
  return false;
}

const ignoredWords = [
  'youtube', 'studio', 'analytics', 'realtime', 'overview', 'content', 'audience',
  'research', 'subscribers', 'hours', 'minutes', 'publish', 'monetization',
  'earn', 'see more', 'top content', 'last 48 hours', 'last 60 minutes', '48 hours', '48 hours:', '60 minutes', '60 minutes:',
  'ટોપ કન્ટેન્ટ', 'રીઅલ ટાઇમ', 'એનાલિટિક્સ', 'છેલ્લા 48 કલાક', 'સબસ્ક્રાઇબર', 'અપડેટિંગ લાઈવ', 'updating live',
  'dashboard', 'community'
];

function isIgnored(text) {
  if (!text) return true;
  const lower = text.toLowerCase().trim();
  if (isStatusBar(lower)) return true;
  return ignoredWords.some(w => lower === w || lower.startsWith(w + ' ') || lower.endsWith(' ' + w));
}

function extractViews(str) {
  if (!str) return 0;
  if (isStatusBar(str)) return 0;
  const clean = convertGujaratiDigits(str.trim());
  const strippedTime = clean
    .replace(/(?:last\s*)?48\s*(?:h(?:ours?)?|કલાક)/gi, '')
    .replace(/(?:last\s*)?60\s*(?:m(?:in(?:utes?)?)?|મિનિટ)/gi, '')
    .replace(/\d+\s*(?:days?|દિવસ|hours?|કલાક|mins?|minutes?|મિનિટ)\s*ago/gi, '')
    .replace(/^(?:realtime|ટોપ કન્ટેન્ટ|top content|top videos)[:\s]*/gi, '');

  const mWord = strippedTime.match(/(?:^|[\s,.\-_:()|·•])([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?[kKmM]|[0-9]+)\s*(?:views?|viewers?|વ્યુઝ|વ્યૂઝ)/i);
  if (mWord) return parseVal(mWord[1]);

  const mFmt = strippedTime.match(/(?:^|[\s,.\-_:()|·•])([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?[kKmM])(?:$|[\s,.\-_:()|·•])/i);
  if (mFmt) return parseVal(mFmt[1]);

  const mEnd = strippedTime.match(/(?:^|[\s,.\-_:()|·•])([0-9]{1,8})(?:\s*$|[\s,.\-_:()|·•])/);
  if (mEnd) {
    const val = parseVal(mEnd[1]);
    if (val < 2020 || val > 2035) return val;
  }

  return 0;
}

function isViewLine(str) {
  if (!str) return false;
  if (isStatusBar(str)) return false;
  const clean = convertGujaratiDigits(str.trim());
  const stripped = clean
    .replace(/[0-9,.\sKkMm+/%|·•–—:()✓✔\-]/g, '')
    .replace(/(?:views?|viewers?|વ્યુઝ|વ્યૂઝ|hours?|mins?|minutes?|ago|realtime|top|content|published|days?|દાડો|દિવસ|કલાક|મિનિટ)/gi, '')
    .trim();
  return stripped.length <= 3 && /\d/.test(clean);
}

function cleanTitleString(title) {
  if (!title) return '';
  return title
    .replace(/^[^a-zA-Z0-9\u0A80-\u0AFF]+/, '') // leading symbols like |_| or શ.
    .replace(/^(?:[a-zA-Z0-9]{1,3}|[a-zA-Z][0-9]|[0-9][a-zA-Z])\s+/, '') // leading noise like "aT 6 ", "a2 ", "B "
    .replace(/^[\s#·•\-_*]*[0-9૧-૯]+[\s.)\-_:]+/, '') // leading bullet indexes (1., ૨.)
    .replace(/^[\d.)\s\-·•]+/, '')
    .replace(/^(?:હો|શ|ટા|કૈ|જિ|પ|i=|a2|b)\s+/i, '') // common single Gujarati leading OCR artifacts
    .replace(/[\s.…|·•:\-]+$/, '') // trailing dots or dashes
    .replace(/\|\s*$/, '')
    .trim();
}

function cleanGujaratiTitle(title) {
  if (!title) return '';
  let clean = cleanTitleString(title);

  // Fix common OCR broken words at the end
  clean = clean
    .replace(/\bસમા\b/g, 'સમાચાર')
    .replace(/\bફેરફા\b/g, 'ફેરફાર')
    .replace(/\bRes\b/gi, 'Result')
    .replace(/\btet\s*1\b/gi, 'TET-1')
    .replace(/\btat\s*hs\b/gi, 'TAT Higher Secondary')
    .replace(/\bgsrtc\b/gi, 'GSRTC')
    .replace(/#.*$/, '') // remove trailing hashtags like #yt st or #shorts
    .replace(/§\s*[0-9]+/g, '') // remove OCR artifact symbols like § 324
    .replace(/[|_~©®§•·\-+=*]{2,}/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return clean;
}

function normalizeForDedup(title) {
  if (!title) return '';
  return cleanTitleString(title)
    .toLowerCase()
    .replace(/[૦-૯]/g, d => '0123456789'['૦૧૨૩૪૫૬૭૮૯'.indexOf(d)] || d)
    .replace(/[^a-z0-9\u0A80-\u0AFF]/g, '')
    .trim();
}

function matchWithChannelVideos(ocrTitle, channelVideos = []) {
  if (!ocrTitle) return '';
  const cleanedOcr = cleanGujaratiTitle(ocrTitle);
  if (!channelVideos || channelVideos.length === 0) return cleanedOcr;

  const ocrNorm = normalizeForDedup(cleanedOcr);
  if (ocrNorm.length < 4) return cleanedOcr;

  let bestMatch = null;
  let bestScore = 0;

  for (const cv of channelVideos) {
    const cvTitle = typeof cv === 'string' ? cv : (cv.title || '');
    const cvNorm = normalizeForDedup(cvTitle);
    if (!cvNorm) continue;

    // Direct substring match
    if (cvNorm.includes(ocrNorm) || ocrNorm.includes(cvNorm)) {
      return cvTitle;
    }

    // Keyword overlap match
    const ocrWords = cleanedOcr.toLowerCase().split(/\s+/).filter(w => w.length >= 3);
    let shared = 0;
    for (const w of ocrWords) {
      if (cvTitle.toLowerCase().includes(w)) shared++;
    }

    const score = shared / (ocrWords.length || 1);
    if (score > bestScore && score >= 0.45) {
      bestScore = score;
      bestMatch = cvTitle;
    }
  }

  return bestMatch || cleanedOcr;
}

function deduplicateVideos(videoList, channelVideos = []) {
  const result = [];

  for (const item of videoList) {
    if (!item || !item.title) continue;
    // Enrich with official channel video title if available
    const enrichedTitle = matchWithChannelVideos(item.title, channelVideos);
    const norm = normalizeForDedup(enrichedTitle);
    if (!norm || norm.length < 3) continue;

    const existingIdx = result.findIndex(existing => {
      const existingNorm = normalizeForDedup(existing.title);
      if (existingNorm === norm) return true;
      if (norm.length >= 6 && existingNorm.length >= 6) {
        if (norm.includes(existingNorm) || existingNorm.includes(norm)) {
          return true;
        }
      }
      return false;
    });

    if (existingIdx !== -1) {
      if ((item.views48h || 0) > (result[existingIdx].views48h || 0)) {
        result[existingIdx].views48h = item.views48h;
      }
      if (enrichedTitle.length > result[existingIdx].title.length) {
        result[existingIdx].title = enrichedTitle;
      }
    } else {
      result.push({ title: enrichedTitle, views48h: item.views48h || 0 });
    }
  }

  return result.sort((a, b) => (b.views48h || 0) - (a.views48h || 0));
}

function extractVideoFromLine(raw) {
  if (!raw) return null;
  const norm = convertGujaratiDigits(raw.trim());
  if (isIgnored(norm) || isStatusBar(norm) || isViewLine(norm)) return null;

  // Pattern A: YouTube Studio line with Title ... [VIEWS] [optional trailing noise like icon/bar chart]
  const dotsMatch = norm.match(/^(.*?)(?:…|\.{2,}|\s{2,}|\s*\|\s*)\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?[kKmM]|[0-9]{1,6})(?:\b|[\s\W])/);
  if (dotsMatch) {
    const title = cleanGujaratiTitle(dotsMatch[1]);
    const views = parseVal(dotsMatch[2]);
    if (views > 0 && (views < 2020 || views > 2035) && title.length >= 4) {
      return { title, views48h: views };
    }
  }

  // Pattern B: Title followed by views count with optional trailing characters
  const endMatch = norm.match(/^(.*?)(?:[\s.…|·•:\-]+)([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?[kKmM]|[0-9]{1,6})(?:\s+[^\d]*)?$/);
  if (endMatch) {
    const title = cleanGujaratiTitle(endMatch[1]);
    const views = parseVal(endMatch[2]);
    if (views > 0 && (views < 2020 || views > 2035) && title.length >= 4) {
      return { title, views48h: views };
    }
  }

  return null;
}

function extractTopVideosAndViews(lines, totalViews48h, totalViews60m) {
  const results = [];
  const usedIndexes = new Set();

  console.log('[OCR Parser] Total lines to parse:', lines.length);

  // Pass 1: Parse YouTube Studio Title + View line directly
  for (let i = 0; i < lines.length; i++) {
    const raw = (lines[i].text || '').trim();
    const parsed = extractVideoFromLine(raw);
    if (parsed && !isIgnored(parsed.title)) {
      console.log(`[Pass 1 YouTubeStudio] "${parsed.title}" => ${parsed.views48h}`);
      results.push(parsed);
      usedIndexes.add(i);
    }
  }

  // Pass 2: Horizontal Proximity (BBox Y on table layout)
  for (let i = 0; i < lines.length; i++) {
    if (usedIndexes.has(i)) continue;
    const rawI = (lines[i].text || '').trim();
    if (!rawI || isIgnored(rawI) || isStatusBar(rawI) || isViewLine(rawI) || rawI.length < 4) continue;

    const bboxI = lines[i].bbox;
    if (bboxI && typeof bboxI.y0 === 'number') {
      let bestIdx = -1;
      let minDiff = 45;
      for (let j = 0; j < lines.length; j++) {
        if (i === j || usedIndexes.has(j)) continue;
        const rawJ = (lines[j].text || '').trim();
        if (!isViewLine(rawJ)) continue;
        const bboxJ = lines[j].bbox;
        if (bboxJ && typeof bboxJ.y0 === 'number') {
          const diff = Math.abs(bboxI.y0 - bboxJ.y0);
          if (diff < minDiff) {
            minDiff = diff;
            bestIdx = j;
          }
        }
      }

      if (bestIdx !== -1) {
        const title = cleanGujaratiTitle(rawI);
        const views = extractViews(lines[bestIdx].text);
        if (views > 0 && title.length >= 4) {
          console.log(`[Pass 2 BBoxY] "${title}" => ${views}`);
          results.push({ title, views48h: views });
          usedIndexes.add(i);
          usedIndexes.add(bestIdx);
        }
      }
    }
  }

  // Pass 3: Consecutive lines (Title on line i, Views on line i+1)
  for (let i = 0; i < lines.length - 1; i++) {
    if (usedIndexes.has(i)) continue;
    const rawI = (lines[i].text || '').trim();
    const rawNext = (lines[i + 1].text || '').trim();

    if (!rawI || isIgnored(rawI) || isStatusBar(rawI) || isViewLine(rawI) || rawI.length < 4) continue;

    if (isViewLine(rawNext)) {
      const views = extractViews(rawNext);
      if (views > 0) {
        const title = cleanGujaratiTitle(rawI);
        if (title.length >= 4 && !isIgnored(title)) {
          console.log(`[Pass 3 Consecutive] "${title}" => ${views}`);
          results.push({ title, views48h: views });
          usedIndexes.add(i);
          usedIndexes.add(i + 1);
        }
      }
    }
  }

  // Pass 4: Title wrapped across 2 lines followed by Views
  for (let i = 0; i < lines.length - 2; i++) {
    if (usedIndexes.has(i) || usedIndexes.has(i + 1)) continue;
    const rawI = (lines[i].text || '').trim();
    const rawI2 = (lines[i + 1].text || '').trim();
    const rawV = (lines[i + 2].text || '').trim();

    if (isIgnored(rawI) || isStatusBar(rawI) || isViewLine(rawI) || rawI.length < 3) continue;
    if (isIgnored(rawI2) || isStatusBar(rawI2) || isViewLine(rawI2) || rawI2.length < 3) continue;

    if (isViewLine(rawV)) {
      const views = extractViews(rawV);
      if (views > 0) {
        const fullTitle = cleanGujaratiTitle(`${rawI} ${rawI2}`);
        if (fullTitle.length >= 5 && !isIgnored(fullTitle)) {
          console.log(`[Pass 4 Wrapped] "${fullTitle}" => ${views}`);
          results.push({ title: fullTitle, views48h: views });
          usedIndexes.add(i);
          usedIndexes.add(i + 1);
          usedIndexes.add(i + 2);
        }
      }
    }
  }

  return results;
}

async function extractFromMultipleImages(imagesBase64, knownChannelTitles = []) {
  if (!imagesBase64 || !Array.isArray(imagesBase64) || imagesBase64.length === 0) {
    return { views48h: 0, views60m: 0, topVideos: [], rawText: '' };
  }

  let allExtractedVideos = [];
  let maxHeaderViews = 0;
  let combinedRawTexts = [];
  let worker = null;

  try {
    console.log(`[Server OCR] Initializing worker for ${imagesBase64.length} screenshot(s)...`);
    const workerPromise = createWorker(['guj', 'eng']);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Server OCR Timeout / Cloud Container restricted')), 3500));
    worker = await Promise.race([workerPromise, timeoutPromise]);

    for (let i = 0; i < imagesBase64.length; i++) {
      const base64Data = imagesBase64[i];
      if (!base64Data) continue;
      const base64Clean = base64Data.includes(';base64,') ? base64Data.split(';base64,').pop() : base64Data;
      const buffer = Buffer.from(base64Clean, 'base64');

      try {
        console.log(`[Server OCR] Processing screenshot ${i + 1} of ${imagesBase64.length}...`);
        const ret = await worker.recognize(buffer);
        const text = ret.data.text || '';
        const lines = ret.data.lines || [];
        combinedRawTexts.push(`--- Photo ${i + 1} ---\n` + text);

        const lineTexts = (lines.length > 0 ? lines.map(l => (l.text || '').trim()) : text.split('\n').map(l => l.trim())).filter(Boolean);
        const fullText = lineTexts.join(' ');

        // Check 48h header
        const m48After = fullText.match(/48\s*h(?:ours?)?[^0-9]{1,25}([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?[kK]|[0-9]+)/i);
        const m48Before = fullText.match(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?[kK]|[0-9]+)[^0-9]{1,25}48\s*h(?:ours?)?/i);
        const val48 = Math.max(m48After ? parseVal(m48After[1]) : 0, m48Before ? parseVal(m48Before[1]) : 0);
        if (val48 > maxHeaderViews) maxHeaderViews = val48;

        const videos = extractTopVideosAndViews(lines.length > 0 ? lines : lineTexts.map(t => ({ text: t })), val48, 0);
        console.log(`[Server OCR] Photo ${i + 1} yielded ${videos.length} videos`);
        allExtractedVideos.push(...videos);
      } catch (imgErr) {
        console.error(`[Server OCR] Error on screenshot ${i + 1}:`, imgErr.message);
      }
    }
  } catch (workerErr) {
    console.error('[Server OCR Worker Error]:', workerErr.message);
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch (e) {
        // ignore terminate error
      }
    }
  }

  // Deduplicate and sort combined videos across all uploaded photos + match with channel titles
  const uniqueVideos = deduplicateVideos(allExtractedVideos, knownChannelTitles);

  const sumVideoViews = uniqueVideos.reduce((acc, cur) => acc + (cur.views48h || 0), 0);
  const views48h = maxHeaderViews > sumVideoViews ? maxHeaderViews : sumVideoViews;

  console.log(`[Server OCR Complete] Total combined unique videos from ${imagesBase64.length} photo(s): ${uniqueVideos.length}, total views: ${views48h}`);

  return {
    views48h,
    views60m: 0,
    topVideos: uniqueVideos.slice(0, 40), // Up to 40 videos across all photos!
    rawText: combinedRawTexts.join('\n\n')
  };
}

async function extractFromImage(base64Data, knownChannelTitles = []) {
  return extractFromMultipleImages([base64Data], knownChannelTitles);
}

module.exports = {
  extractFromImage,
  extractFromMultipleImages
};
