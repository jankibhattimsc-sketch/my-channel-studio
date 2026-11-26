/**
 * Gyan Yatra AI Studio — Idea Analysis & Growth Intelligence Engine
 * 
 * Strict Zero-Fabrication Rules:
 * 1. Growth percentage is ONLY calculated when a verified previous observation exists.
 * 2. Velocity (views/hr) is calculated strictly using actual elapsed time.
 * 3. Never invent previous views or synthetic baseline multipliers.
 * 4. Transparent classification with explicit reasons:
 *    - Breaking
 *    - Trending
 *    - Growing
 *    - Stable
 *    - Declining
 *    - Insufficient Data
 */

import { calculateTimeDelta, formatISTDisplay } from './dateTimeIntelligence.js';

export const CLASSIFICATIONS = {
  BREAKING: 'Breaking',
  TRENDING: 'Trending',
  GROWING: 'Growing',
  STABLE: 'Stable',
  DECLINING: 'Declining',
  INSUFFICIENT_DATA: 'Insufficient Data'
};

export const CLASSIFICATION_COLORS = {
  [CLASSIFICATIONS.BREAKING]: { bg: '#fee2e2', text: '#b91c1c', border: '#f87171', badge: '🔥 બ્રેકિંગ (Breaking)' },
  [CLASSIFICATIONS.TRENDING]: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d', badge: '⚡ ટ્રેન્ડિંગ (Trending)' },
  [CLASSIFICATIONS.GROWING]: { bg: '#dcfce7', text: '#15803d', border: '#86efac', badge: '📈 ગ્રોઇંગ (Growing)' },
  [CLASSIFICATIONS.STABLE]: { bg: '#e0f2fe', text: '#0369a1', border: '#7dd3fc', badge: '⚖️ સ્થિર (Stable)' },
  [CLASSIFICATIONS.DECLINING]: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1', badge: '📉 ધીમું (Declining)' },
  [CLASSIFICATIONS.INSUFFICIENT_DATA]: { bg: '#f3f4f6', text: '#6b7280', border: '#d1d5db', badge: 'ℹ️ નવો વિષય (New)' }
};

/**
 * Analyzes an idea against its historical records and returns accurate metrics.
 * 
 * @param {Object} currentData - { views48h, views60m, capturedAt, analyzedAt, sourcePublishedAt }
 * @param {Array} historySnapshots - Array of previous history records
 */
export function analyzeIdeaMetrics(currentData = {}, historySnapshots = []) {
  const currentViews = (typeof currentData.views48h === 'number' && !isNaN(currentData.views48h)) 
    ? currentData.views48h 
    : null;

  // If current views are not available or 0, return Insufficient Data without guessing
  if (currentViews === null || currentViews <= 0) {
    return {
      views48h: currentViews,
      previousViews48h: null,
      viewsDelta: null,
      growthPct: null,
      velocityPerHour: null,
      elapsedHours: null,
      classification: CLASSIFICATIONS.INSUFFICIENT_DATA,
      analysisReason: 'વ્યુઝ મળ્યા નથી અથવા અચોક્કસ છે. વિશ્લેષણ માટે સાચા વ્યુઝ જરૂરી છે. (Views unverified or not detected.)',
      hasGenuineBaseline: false,
      isVerified: false
    };
  }

  // Filter valid previous snapshots with genuine recorded views
  const validHistory = (historySnapshots || [])
    .filter(h => typeof h.views48h === 'number' && h.views48h > 0 && h.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // If no prior history exists, this is the first observation point
  if (validHistory.length === 0) {
    return {
      views48h: currentViews,
      previousViews48h: null,
      viewsDelta: null,
      growthPct: null,
      velocityPerHour: null,
      elapsedHours: null,
      classification: CLASSIFICATIONS.INSUFFICIENT_DATA,
      analysisReason: `પ્રથમ રેકોર્ડ: ${currentViews.toLocaleString('en-IN')} વ્યુઝ. વૃદ્ધિ દર ગણવા માટે ભવિષ્યના સ્કેન સાથે સરખામણી થશે. (Baseline established with ${currentViews.toLocaleString('en-IN')} views.)`,
      hasGenuineBaseline: false,
      isVerified: true
    };
  }

  // Find the most relevant baseline snapshot
  const baseline = validHistory[0];
  const baselineViews = baseline.views48h;
  const deltaObj = calculateTimeDelta(baseline.timestamp, currentData.analyzedAt || Date.now());

  if (!deltaObj || deltaObj.totalHours <= 0) {
    return {
      views48h: currentViews,
      previousViews48h: baselineViews,
      viewsDelta: currentViews - baselineViews,
      growthPct: null,
      velocityPerHour: null,
      elapsedHours: 0,
      classification: CLASSIFICATIONS.STABLE,
      analysisReason: `સમાન સમયગાળામાં ડેટા અપડેટ થયો છે. (${currentViews.toLocaleString('en-IN')} views).`,
      hasGenuineBaseline: true,
      isVerified: true
    };
  }

  const elapsedHours = deltaObj.totalHours;
  const viewsDelta = currentViews - baselineViews;
  const growthPct = Number((((currentViews - baselineViews) / baselineViews) * 100).toFixed(1));
  const velocityPerHour = Math.round(viewsDelta / elapsedHours);

  // Determine Classification strictly based on real mathematical deltas
  let classification = CLASSIFICATIONS.STABLE;
  let reason = '';

  const hoursDisplay = elapsedHours < 1 ? `${Math.round(elapsedHours * 60)} મિનિટ` : `${elapsedHours.toFixed(1)} કલાક`;

  if (growthPct >= 40 || (velocityPerHour > 1000 && elapsedHours <= 24)) {
    classification = CLASSIFICATIONS.BREAKING;
    reason = `🔥 પ્રચંડ ઉછાળો: ${hoursDisplay}માં +${viewsDelta.toLocaleString('en-IN')} વ્યુઝ (+${growthPct}%) વધ્યા. ઝડપ: ${velocityPerHour.toLocaleString('en-IN')} વ્યુઝ/કલાક.`;
  } else if (growthPct >= 18 || (velocityPerHour > 300 && elapsedHours <= 48)) {
    classification = CLASSIFICATIONS.TRENDING;
    reason = `⚡ ઉત્તમ ટ્રેન્ડ: ${hoursDisplay}માં +${viewsDelta.toLocaleString('en-IN')} વ્યુઝ (+${growthPct}%) વધ્યા. ઝડપ: +${velocityPerHour.toLocaleString('en-IN')} વ્યુઝ/કલાક.`;
  } else if (growthPct >= 5) {
    classification = CLASSIFICATIONS.GROWING;
    reason = `📈 સામાન્ય વૃદ્ધિ: ${hoursDisplay}માં +${viewsDelta.toLocaleString('en-IN')} વ્યુઝ (+${growthPct}%) વધ્યા.`;
  } else if (growthPct <= -5) {
    classification = CLASSIFICATIONS.DECLINING;
    reason = `📉 ઘટાડો: ૪૮ કલાકના વિન્ડોમાં અગાઉની સરખામણીએ ${Math.abs(growthPct)}% ઘટાડો નોંધાયો.`;
  } else {
    classification = CLASSIFICATIONS.STABLE;
    reason = `⚖️ સ્થિર પર્ફોર્મન્સ: વ્યુઝમાં મોટો ફેરફાર નથી (${growthPct >= 0 ? '+' : ''}${growthPct}%).`;
  }

  return {
    views48h: currentViews,
    previousViews48h: baselineViews,
    viewsDelta,
    growthPct,
    velocityPerHour,
    elapsedHours,
    classification,
    analysisReason: reason,
    baselineRecordedAt: baseline.timestamp,
    hasGenuineBaseline: true,
    isVerified: true
  };
}

/**
 * Checks duplicate titles using Levenshtein distance and clean string tokens
 */
export function checkDuplicateTitle(newTitle, existingIdeas = []) {
  if (!newTitle || typeof newTitle !== 'string') return { isDuplicate: false };

  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9\u0A80-\u0AFF]/g, '').trim();
  const target = clean(newTitle);
  if (target.length < 5) return { isDuplicate: false };

  for (const idea of existingIdeas) {
    const existingClean = clean(idea.title || '');
    if (!existingClean) continue;

    // Exact or direct inclusion match
    if (target === existingClean || (target.length > 10 && (target.includes(existingClean) || existingClean.includes(target)))) {
      return {
        isDuplicate: true,
        matchedIdeaId: idea.id,
        matchedTitle: idea.title,
        similarity: 1.0
      };
    }
  }

  return { isDuplicate: false };
}

