/**
 * Gyan Yatra AI Studio — Smart Text Idea Parser
 * Used for Copy-Paste Ideas (Module 1.B)
 * Extracts candidate titles, view counts, dates, and source URLs from pasted raw text.
 * Zero-Hallucination: Missing fields remain null.
 */

import { convertGujaratiNumbers, parseYouTubeStudioDate } from './dateTimeIntelligence.js';

/**
 * Extracts potential metadata from a pasted block of text.
 * @param {string} rawText 
 * @returns {Object}
 */
export function parsePastedIdeaText(rawText = '') {
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
  } else if (detectedUrl.includes('sandesh.com') || detectedUrl.includes('divyabhaskar.co.in')) {
    detectedSource = 'News Article';
  }

  // 3. Detect candidate View Counts (e.g., "18,450 views", "1.2M views", "૨૫,૦૦૦ વ્યુઝ")
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

  // 4. Detect candidate Date
  let detectedDate = null;
  for (const line of lines) {
    const parsedDate = parseYouTubeStudioDate(line);
    if (parsedDate && parsedDate.iso) {
      detectedDate = parsedDate.iso;
      break;
    }
  }

  // 5. Detect candidate Title (first meaningful line that isn't just a URL or short timestamp)
  let candidateTitle = '';
  for (const line of lines) {
    if (line.startsWith('http://') || line.startsWith('https://')) continue;
    if (/^\d{1,2}:\d{2}/.test(line)) continue; // ignore timestamp line
    if (line.length >= 5) {
      candidateTitle = line.substring(0, 120).trim();
      break;
    }
  }

  if (!candidateTitle && lines.length > 0) {
    candidateTitle = lines[0].substring(0, 80);
  }

  // 6. Candidate Tags from Hashtags or Keywords
  const tagMatches = trimmed.match(/#([\u0A80-\u0AFFa-zA-Z0-9_-]+)/g);
  const tags = tagMatches ? tagMatches.map(t => t.replace('#', '').trim()) : [];

  return {
    title: candidateTitle,
    description: lines.length > 1 ? lines.slice(1).join('\n') : '',
    originalText: trimmed,
    detectedViews,
    detectedDate,
    detectedUrl,
    detectedSource,
    tags
  };
}

