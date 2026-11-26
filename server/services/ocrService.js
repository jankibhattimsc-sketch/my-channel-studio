const { createWorker } = require('tesseract.js');
const path = require('path');

function isCorruptedNoise(str) {
  if (!str) return true;
  const s = str.trim();
  if (s.length < 4) return true;

  // Patterns like "eC @P [+]", "5 pp ——", icon artifacts
  if (/^[@#*~_=+[\]|•·–—\s]+$/.test(s)) return true;
  if (/^(?:eC|@P|\[\+\]|\bpp\b|\bmais\b|\been\b|\bwan\b)/i.test(s)) return true;

  const gujChars = (s.match(/[\u0A80-\u0AFF]/g) || []).length;
  const engWords = (s.match(/[a-zA-Z]{3,}/g) || []).length;
  if (gujChars < 2 && engWords < 1) return true;

  const letters = (s.match(/[\u0A80-\u0AFFa-zA-Z]/g) || []).length;
  if (letters / s.length < 0.35) return true;

  return false;
}

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
  if (isCorruptedNoise(text)) return true;
  const lower = text.toLowerCase().trim();
  if (isStatusBar(lower)) return true;
  if (lower.includes('realtime') || lower.includes('real time') || lower.includes('રીઅલ ટાઇમ')) return true;
  if (lower.includes('analytics') || lower.includes('overview') || lower.includes('subscribers') || lower.includes('સબસ્ક્રાઇબર')) return true;
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

function isValidVideoTitle(title) {
  if (!title || typeof title !== 'string') return false;
  const clean = cleanGujaratiTitle(title);
  if (clean.length < 8) return false;

  const gujLetters = (clean.match(/[\u0A80-\u0AFF]/g) || []).length;
  const engWords = (clean.match(/\b[a-zA-Z]{3,}\b/g) || []).length;
  if (gujLetters < 5 && engWords < 2) return false;

  const lower = clean.toLowerCase();
  if (lower.includes('slide') || lower.includes('સ્લાઇડ્સ') || lower.includes('realtime') || lower.includes('analytics') || lower.includes('overview') || lower.includes('ppt')) return false;

  const alphanumericCount = (clean.match(/[\u0A80-\u0AFFa-zA-Z0-9]/g) || []).length;
  if (alphanumericCount / clean.length < 0.50) return false;

  return true;
}

function deduplicateVideos(videoList, channelVideos = []) {
  const result = [];

  for (const item of videoList) {
    if (!item || !item.title) continue;
    if (!isValidVideoTitle(item.title)) continue;

    // Enrich with official channel video title if available
    const enrichedTitle = matchWithChannelVideos(item.title, channelVideos);
    const norm = normalizeForDedup(enrichedTitle);
    if (!norm || norm.length < 4) continue;

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
      result.push({
        title: enrichedTitle,
        views48h: item.views48h || null,
        confidence: item.confidence || 75,
        isConfidenceVerified: Boolean(item.isConfidenceVerified),
        bbox: item.bbox || null
      });
    }
  }

  return result.sort((a, b) => (b.views48h || 0) - (a.views48h || 0));
}

function extractVideoFromLine(raw) {
  if (!raw) return null;
  const norm = convertGujaratiDigits(raw.trim());
  if (isIgnored(norm) || isStatusBar(norm) || isViewLine(norm)) return null;

  // Pattern A: YouTube Studio line with Title ... [VIEWS]
  const dotsMatch = norm.match(/^(.*?)(?:…|\.{2,}|\s{2,}|\s*\|\s*)\s*([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?[kKmM]|[0-9]{2,6})(?:\b|[\s\W])/);
  if (dotsMatch) {
    const title = cleanGujaratiTitle(dotsMatch[1]);
    const views = parseVal(dotsMatch[2]);
    if (views >= 10 && (views < 2020 || views > 2035) && isValidVideoTitle(title)) {
      return { title, views48h: views };
    }
  }

  // Pattern B: Title followed by views count
  const endMatch = norm.match(/^(.*?)(?:[\s.…|·•:\-]+)([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?[kKmM]|[0-9]{2,6})(?:\s+[^\d]*)?$/);
  if (endMatch) {
    const title = cleanGujaratiTitle(endMatch[1]);
    const views = parseVal(endMatch[2]);
    if (views >= 10 && (views < 2020 || views > 2035) && isValidVideoTitle(title)) {
      return { title, views48h: views };
    }
  }

  return null;
}

function extractTopVideosAndViews(lines, totalViews48h, totalViews60m) {
  const results = [];
  const usedIndexes = new Set();

  console.log('[OCR Parser] Total lines to parse:', lines.length);

  // Filter out noisy status bar and corrupted lines first
  const candidateLines = lines.map((l, idx) => ({
    ...l,
    origIdx: idx,
    cleanText: cleanGujaratiTitle(l.text || '')
  })).filter(l => l.cleanText && !isIgnored(l.cleanText) && !isCorruptedNoise(l.cleanText));

  // Pass 1: Parse YouTube Studio Title + View inline directly
  for (let i = 0; i < candidateLines.length; i++) {
    const l = candidateLines[i];
    const parsed = extractVideoFromLine(l.text);
    if (parsed && !isIgnored(parsed.title) && !isCorruptedNoise(parsed.title)) {
      console.log(`[Pass 1 YouTubeStudio] "${parsed.title}" => ${parsed.views48h}`);
      results.push({
        ...parsed,
        confidence: l.confidence || 75,
        isConfidenceVerified: (l.confidence || 75) >= 65 && parsed.views48h > 0,
        bbox: l.bbox || null
      });
      usedIndexes.add(l.origIdx);
    }
  }

  // Pass 2: Vertical Row Grouping (BBox Y overlap on tabular screenshot layout)
  for (let i = 0; i < lines.length; i++) {
    if (usedIndexes.has(i)) continue;
    const lineI = lines[i];
    const rawI = (lineI.text || '').trim();
    if (!rawI || isIgnored(rawI) || isCorruptedNoise(rawI) || isStatusBar(rawI) || isViewLine(rawI) || rawI.length < 4) continue;

    const bboxI = lineI.bbox;
    let foundViews = null;
    let bestViewIdx = -1;

    if (bboxI && typeof bboxI.y0 === 'number') {
      let minDiff = 40; // max pixel distance vertically for same row
      for (let j = 0; j < lines.length; j++) {
        if (i === j || usedIndexes.has(j)) continue;
        const lineJ = lines[j];
        const rawJ = (lineJ.text || '').trim();
        if (!isViewLine(rawJ)) continue;
        const bboxJ = lineJ.bbox;
        if (bboxJ && typeof bboxJ.y0 === 'number') {
          const diff = Math.abs(bboxI.y0 - bboxJ.y0);
          if (diff < minDiff) {
            minDiff = diff;
            bestViewIdx = j;
          }
        }
      }

      if (bestViewIdx !== -1) {
        foundViews = extractViews(lines[bestViewIdx].text);
        usedIndexes.add(bestViewIdx);
      }
    }

    // Pass 3: If no horizontal bbox match, check consecutive line i+1
    if (foundViews === null && i + 1 < lines.length && !usedIndexes.has(i + 1)) {
      const nextRaw = (lines[i + 1].text || '').trim();
      if (isViewLine(nextRaw)) {
        foundViews = extractViews(nextRaw);
        usedIndexes.add(i + 1);
      }
    }

    const title = cleanGujaratiTitle(rawI);
    if (title.length >= 4 && !isIgnored(title) && !isCorruptedNoise(title)) {
      usedIndexes.add(i);
      const conf = lineI.confidence || 70;
      results.push({
        title,
        views48h: (foundViews && foundViews > 0) ? foundViews : null,
        confidence: conf,
        isConfidenceVerified: conf >= 65 && Boolean(foundViews && foundViews > 0),
        bbox: bboxI || null
      });
    }
  }

  return results;
}

function parseDateFromLine(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  const norm = convertGujaratiDigits(rawText.trim());

  // Relative hours ago: "2 hours ago", "૨ કલાક પહેલા", "4h ago"
  const hrMatch = norm.match(/(\d+)\s*(?:hours?|hrs?|h|કલાક|घंटे)\s*(?:ago|પહેલા|पहले)?/i);
  if (hrMatch) {
    const hrs = parseInt(hrMatch[1], 10);
    if (!isNaN(hrs) && hrs >= 0 && hrs < 8760) {
      return new Date(Date.now() - (hrs * 60 * 60 * 1000)).toISOString();
    }
  }

  // Relative days ago: "3 days ago", "૩ દિવસ પહેલા", "3d ago"
  const dayMatch = norm.match(/(\d+)\s*(?:days?|d|દિવસ|दिन)\s*(?:ago|પહેલા|पहले)?/i);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    if (!isNaN(days) && days >= 0 && days < 365) {
      return new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString();
    }
  }

  // Absolute Date: "28 Oct 2026", "Oct 28, 2026", "28/10/2026"
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthRegex = new RegExp(`([0-9]{1,2})[\\s\\-]+(${months.join('|')})[\\s,]+([0-9]{4})`, 'i');
  const mMatch = norm.match(monthRegex);
  if (mMatch) {
    const d = parseInt(mMatch[1], 10);
    const m = months.indexOf(mMatch[2].toLowerCase());
    const y = parseInt(mMatch[3], 10);
    const parsed = new Date(Date.UTC(y, m, d, 6, 30));
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }

  return null;
}

async function extractFromMultipleImages(imagesBase64, knownChannelTitles = []) {
  if (!imagesBase64 || !Array.isArray(imagesBase64) || imagesBase64.length === 0) {
    return { views48h: 0, views60m: 0, topVideos: [], rawText: '' };
  }

  let allExtractedVideos = [];
  let maxHeaderViews = 0;
  let combinedRawTexts = [];
  let detectedGlobalDate = null;
  let worker = null;

  try {
    console.log(`[Server OCR] Initializing worker for ${imagesBase64.length} screenshot(s)...`);
    const langDir = path.resolve('.');
    const workerPromise = createWorker(['guj', 'eng'], 1, {
      langPath: langDir,
      gzip: false
    });
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Server OCR Timeout / Worker load restricted')), 8000));
    worker = await Promise.race([workerPromise, timeoutPromise]);

    for (let i = 0; i < imagesBase64.length; i++) {
      const base64Data = imagesBase64[i];
      if (!base64Data) continue;
      const base64Clean = base64Data.includes(';base64,') ? base64Data.split(';base64,').pop() : base64Data;
      const buffer = Buffer.from(base64Clean, 'base64');

      try {
        console.log(`[Server OCR] Processing screenshot ${i + 1} of ${imagesBase64.length}...`);
        const ret = await worker.recognize(buffer, {}, { blocks: true });
        const text = ret.data.text || '';
        combinedRawTexts.push(`--- Photo ${i + 1} ---\n` + text);

        // Extract lines with true bounding boxes and confidence from blocks
        const lines = [];
        if (ret.data && ret.data.blocks) {
          for (const block of ret.data.blocks) {
            for (const para of (block.paragraphs || [])) {
              for (const line of (para.lines || [])) {
                const lineTxt = (line.text || '').trim();
                if (lineTxt) {
                  lines.push({
                    text: lineTxt,
                    bbox: line.bbox,
                    confidence: Math.round(line.confidence || 0),
                    words: line.words || []
                  });
                }
              }
            }
          }
        }

        // If no blocks, fallback to text splitting
        const effectiveLines = lines.length > 0 ? lines : text.split('\n').map(l => l.trim()).filter(Boolean).map(t => ({ text: t, confidence: 70 }));
        const fullText = effectiveLines.map(l => l.text).join(' ');

        // Check for date in text
        if (!detectedGlobalDate) {
          for (const lObj of effectiveLines) {
            const pDate = parseDateFromLine(lObj.text);
            if (pDate) {
              detectedGlobalDate = pDate;
              break;
            }
          }
        }

        // Check 48h header
        const m48After = fullText.match(/48\s*h(?:ours?)?[^0-9]{1,25}([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?[kK]|[0-9]+)/i);
        const m48Before = fullText.match(/([0-9]{1,3}(?:,[0-9]{3})+|[0-9]+(?:\.[0-9]+)?[kK]|[0-9]+)[^0-9]{1,25}48\s*h(?:ours?)?/i);
        const val48 = Math.max(m48After ? parseVal(m48After[1]) : 0, m48Before ? parseVal(m48Before[1]) : 0);
        if (val48 > maxHeaderViews) maxHeaderViews = val48;

        const videos = extractTopVideosAndViews(effectiveLines, val48, 0);
        
        // Attach detected dates to videos if present
        videos.forEach(v => {
          if (!v.sourcePublishedAt && detectedGlobalDate) {
            v.sourcePublishedAt = detectedGlobalDate;
          }
        });

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
  const views48h = maxHeaderViews > sumVideoViews ? maxHeaderViews : (sumVideoViews > 0 ? sumVideoViews : null);

  console.log(`[Server OCR Complete] Total combined unique videos from ${imagesBase64.length} photo(s): ${uniqueVideos.length}, total views: ${views48h}`);

  return {
    views48h,
    views60m: 0,
    detectedDate: detectedGlobalDate || null,
    topVideos: uniqueVideos.slice(0, 40),
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
