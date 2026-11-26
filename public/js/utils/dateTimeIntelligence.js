/**
 * Gyan Yatra AI Studio — Date-Time Intelligence Engine
 * Timezone: Asia/Kolkata (IST: UTC+05:30)
 * 
 * Strict Zero-Hallucination Rules:
 * 1. Store accurate timestamps in standard ISO format.
 * 2. Format and display consistently in Asia/Kolkata timezone.
 * 3. Keep capturedAt, sourcePublishedAt, createdAt, updatedAt, and analyzedAt isolated.
 * 4. Never assume screenshot capture time is equal to video publication time.
 * 5. Unknown or unreadable dates MUST remain null / unverified.
 */

const TIMEZONE = 'Asia/Kolkata';

// Gujarati to English digit mapping
const GUJARATI_DIGITS = {
  '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
  '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
};

export function convertGujaratiNumbers(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[૦-૯]/g, d => GUJARATI_DIGITS[d] || d);
}

/**
 * Returns current timestamp and separated date/time in Asia/Kolkata timezone
 */
export function getCurrentIST() {
  const now = new Date();
  return {
    iso: now.toISOString(),
    timestamp: now.getTime(),
    dateStr: formatDateISO(now),
    timeStr: formatTimeISO(now),
    display: formatISTDisplay(now)
  };
}

/**
 * Formats date into YYYY-MM-DD in Asia/Kolkata
 */
export function formatDateISO(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
}

/**
 * Formats time into HH:mm:ss in Asia/Kolkata
 */
export function formatTimeISO(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return formatter.format(d);
}

/**
 * Indian Date Display: "31 October 2026"
 */
export function formatIndianDateDisplay(dateInput) {
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

/**
 * Indian Time Display: "01:45 PM IST"
 */
export function formatIndianTimeDisplay(dateInput) {
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

/**
 * Combined Indian Date & Time Display: "31 October 2026, 01:45 PM IST"
 */
export function formatIndianDateTimeDisplay(dateInput) {
  if (!dateInput) return 'તારીખ ઉપલબ્ધ નથી (Unknown)';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'અમાન્ય તારીખ';
  return `${formatIndianDateDisplay(d)}, ${formatIndianTimeDisplay(d)}`;
}

/**
 * Filter a list of ideas by creation date range in Asia/Kolkata timezone:
 * 'today', 'yesterday', 'last7days', 'last30days', 'custom', 'all'
 */
export function filterIdeasByDateRange(ideas = [], rangeKey = 'all', customStart = null, customEnd = null) {
  if (!Array.isArray(ideas)) return [];
  if (rangeKey === 'all') return [...ideas];

  const now = new Date();
  const todayStr = formatDateISO(now);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = formatDateISO(yesterday);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  return ideas.filter(idea => {
    const rawDate = idea.createdAt || idea.clientUpdatedAt || idea.updatedAt;
    if (!rawDate) return false;
    const ideaDate = new Date(rawDate);
    if (isNaN(ideaDate.getTime())) return false;
    const ideaDateStr = formatDateISO(ideaDate);

    switch (rangeKey) {
      case 'today':
        return ideaDateStr === todayStr;
      case 'yesterday':
        return ideaDateStr === yesterdayStr;
      case 'last7days':
        return ideaDate >= sevenDaysAgo;
      case 'last30days':
        return ideaDate >= thirtyDaysAgo;
      case 'custom': {
        if (!customStart) return true;
        const cStart = new Date(customStart);
        const cEnd = customEnd ? new Date(customEnd) : new Date();
        cEnd.setHours(23, 59, 59, 999);
        return ideaDate >= cStart && ideaDate <= cEnd;
      }
      default:
        return true;
    }
  });
}

/**
 * Group ideas by their creation date (e.g. "31 October 2026")
 * Returns an array of groups: [{ dateLabel: "31 October 2026", dateISO: "2026-10-31", ideas: [...] }]
 */
export function groupIdeasByDate(ideas = []) {
  if (!Array.isArray(ideas)) return [];
  const map = new Map();

  for (const idea of ideas) {
    const rawDate = idea.createdAt || idea.updatedAt || new Date().toISOString();
    const d = new Date(rawDate);
    const dateLabel = isNaN(d.getTime()) ? 'અન્ય તારીખ' : formatIndianDateDisplay(d);
    const dateISO = isNaN(d.getTime()) ? 'unknown' : formatDateISO(d);

    if (!map.has(dateLabel)) {
      map.set(dateLabel, {
        dateLabel,
        dateISO,
        ideas: []
      });
    }
    map.get(dateLabel).ideas.push(idea);
  }

  return Array.from(map.values());
}

/**
 * Human-friendly display in Asia/Kolkata (e.g., "31 Oct 2026, 01:15 PM IST")
 */
export function formatISTDisplay(dateInput) {
  if (!dateInput) return 'તારીખ ઉપલબ્ધ નથી (Unknown)';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return 'અમાન્ય તારીખ (Invalid)';

  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  return formatter.format(d) + ' IST';
}

/**
 * Safely parse potential publication/time strings from YouTube Studio OCR.
 * Supports English and Gujarati relative & absolute formats.
 * Returns null if no authentic date is found. Never invents dates.
 */
export function parseYouTubeStudioDate(rawText, referenceTimestamp = Date.now()) {
  if (!rawText || typeof rawText !== 'string') return null;

  const normalized = convertGujaratiNumbers(rawText.trim());

  // 1. Relative Hours Ago: "2 hours ago", "૨ કલાક પહેલા", "4h ago"
  const hoursAgoMatch = normalized.match(/(\d+)\s*(?:hours?|hrs?|h|કલાક|घंटे)\s*(?:ago|પહેલા|पहले)?/i);
  if (hoursAgoMatch) {
    const hours = parseInt(hoursAgoMatch[1], 10);
    if (!isNaN(hours) && hours >= 0 && hours < 8760) {
      const estimatedDate = new Date(referenceTimestamp - (hours * 60 * 60 * 1000));
      return {
        iso: estimatedDate.toISOString(),
        isRelative: true,
        hoursAgo: hours,
        raw: rawText,
        display: formatISTDisplay(estimatedDate)
      };
    }
  }

  // 2. Relative Days Ago: "3 days ago", "૩ દિવસ પહેલા", "3d ago"
  const daysAgoMatch = normalized.match(/(\d+)\s*(?:days?|d|દિવસ|दिन)\s*(?:ago|પહેલા|पहले)?/i);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    if (!isNaN(days) && days >= 0 && days < 365) {
      const estimatedDate = new Date(referenceTimestamp - (days * 24 * 60 * 60 * 1000));
      return {
        iso: estimatedDate.toISOString(),
        isRelative: true,
        daysAgo: days,
        raw: rawText,
        display: formatISTDisplay(estimatedDate)
      };
    }
  }

  // 3. Absolute Date: "Oct 28, 2026", "28 Oct 2026", "28/10/2026", "28-10-2026"
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthRegex = new RegExp(`(?:published\\s+on\\s+)?([0-9]{1,2})[\\s\\-]+(${months.join('|')})[\\s,]+([0-9]{4})`, 'i');
  const monthMatch1 = normalized.match(monthRegex);

  if (monthMatch1) {
    const day = parseInt(monthMatch1[1], 10);
    const month = months.indexOf(monthMatch1[2].toLowerCase());
    const year = parseInt(monthMatch1[3], 10);
    const parsed = new Date(Date.UTC(year, month, day, 6, 30)); // 12:00 PM IST
    if (!isNaN(parsed.getTime())) {
      return {
        iso: parsed.toISOString(),
        isRelative: false,
        raw: rawText,
        display: formatISTDisplay(parsed)
      };
    }
  }

  // 4. Formatted dd/mm/yyyy or yyyy-mm-dd
  const dmyMatch = normalized.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const parsed = new Date(Date.UTC(year, month, day, 6, 30));
    if (!isNaN(parsed.getTime())) {
      return {
        iso: parsed.toISOString(),
        isRelative: false,
        raw: rawText,
        display: formatISTDisplay(parsed)
      };
    }
  }

  // No verified date found
  return null;
}

/**
 * Calculates time difference between two ISO/timestamp values in hours and minutes
 */
export function calculateTimeDelta(olderDateInput, newerDateInput = Date.now()) {
  if (!olderDateInput) return null;
  const tOld = new Date(olderDateInput).getTime();
  const tNew = new Date(newerDateInput).getTime();
  if (isNaN(tOld) || isNaN(tNew) || tNew < tOld) return null;

  const diffMs = tNew - tOld;
  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const totalHours = Number((diffMs / (3600 * 1000)).toFixed(2));

  let displayStr = '';
  if (totalHours < 1) {
    displayStr = `${totalMinutes} મિનિટ પહેલા (${totalMinutes}m ago)`;
  } else if (totalHours < 24) {
    displayStr = `${Math.floor(totalHours)} કલાક પહેલા (${Math.floor(totalHours)}h ago)`;
  } else {
    const days = Math.floor(totalHours / 24);
    displayStr = `${days} દિવસ પહેલા (${days}d ago)`;
  }

  return {
    diffMs,
    totalMinutes,
    totalHours,
    display: displayStr
  };
}

/**
 * Normalizes all timestamps on an idea object
 */
export function normalizeIdeaTimestamps(idea = {}, isNew = false) {
  const ist = getCurrentIST();
  return {
    ...idea,
    createdAt: idea.createdAt || ist.iso,
    updatedAt: ist.iso,
    capturedAt: idea.capturedAt || (isNew ? ist.iso : null),
    sourcePublishedAt: idea.sourcePublishedAt || null,
    analyzedAt: idea.analyzedAt || (idea.views48h ? ist.iso : null),
    istDate: formatDateISO(idea.updatedAt || ist.iso),
    istTime: formatTimeISO(idea.updatedAt || ist.iso)
  };
}

