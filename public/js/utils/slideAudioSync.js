/**
 * Slide-to-Audio Synchronization Engine
 * 
 * Provides:
 * 1. Semantic slide-to-speech alignment (intelligent boundary estimation from script and speech rate)
 * 2. Precision timestamp parsing and formatting (seconds <-> mm:ss)
 * 3. Timeline continuity validation (gaps, overlaps, boundary checks)
 * 4. Automatic 1-click gap/overlap repairing
 * 5. Exportable timeline manifest for video rendering pipelines
 */

export function parseTimeToSeconds(timeInput) {
  if (typeof timeInput === 'number') return Math.max(0, timeInput);
  if (!timeInput || typeof timeInput !== 'string') return 0;

  const clean = timeInput.trim().toLowerCase();
  
  // If range like "0:00 - 0:45" or "0:00 to 0:45", take start unless specified
  const parts = clean.split(/[-–to]/);
  const target = parts[0].trim();

  // If mm:ss or hh:mm:ss
  if (target.includes(':')) {
    const segments = target.split(':').map(s => parseFloat(s) || 0);
    if (segments.length === 2) {
      return segments[0] * 60 + segments[1];
    } else if (segments.length === 3) {
      return segments[0] * 3600 + segments[1] * 60 + segments[2];
    }
  }

  // If "45s" or raw number
  const num = parseFloat(target.replace('s', ''));
  return isNaN(num) ? 0 : Math.max(0, num);
}

export function parseRangeToSeconds(rangeStr, defaultDuration = 45) {
  if (!rangeStr || typeof rangeStr !== 'string') {
    return { start: 0, end: defaultDuration, duration: defaultDuration };
  }
  const parts = rangeStr.split(/[-–to]/).map(s => s.trim());
  if (parts.length >= 2) {
    const start = parseTimeToSeconds(parts[0]);
    const end = parseTimeToSeconds(parts[1]);
    const duration = Math.max(1, end - start);
    return { start, end: Math.max(start + 1, end), duration };
  } else {
    const start = parseTimeToSeconds(parts[0]);
    return { start, end: start + defaultDuration, duration: defaultDuration };
  }
}

export function formatSecondsToTime(seconds) {
  const total = Math.max(0, Math.round(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function formatTimeRange(startSec, endSec) {
  return `${formatSecondsToTime(startSec)} - ${formatSecondsToTime(endSec)}`;
}

/**
 * Intelligent Semantic Slide-to-Speech Alignment
 * Matches slide topics and bullets to spoken narration sections/sentences,
 * calculating proportional timestamps instead of blind equal division.
 */
export function matchSlidesToAudio(slides = [], totalAudioDuration = 180, scriptSections = [], fullScriptText = '') {
  if (!slides || slides.length === 0) return [];
  const duration = Math.max(10, totalAudioDuration || 180);

  // 1. If script sections exist in projectState (e.g. 4-5 structured sections)
  if (scriptSections && scriptSections.length >= slides.length) {
    let currentStart = 0;
    return slides.map((slide, idx) => {
      const section = scriptSections[idx];
      let sectionDuration = 0;
      if (section && section.timeRange) {
        const range = parseRangeToSeconds(section.timeRange, duration / slides.length);
        sectionDuration = range.duration;
      } else if (section && section.content) {
        // Gujarati speech rate: ~2.3 words/sec
        const words = section.content.trim().split(/\s+/).length;
        sectionDuration = Math.max(12, words / 2.3);
      } else {
        sectionDuration = duration / slides.length;
      }

      const start = currentStart;
      const end = (idx === slides.length - 1) ? duration : Math.min(duration, start + sectionDuration);
      currentStart = end;

      return {
        ...slide,
        startTime: parseFloat(start.toFixed(1)),
        endTime: parseFloat(end.toFixed(1)),
        duration: parseFloat(Math.max(1, end - start).toFixed(1)),
        audioTime: formatTimeRange(start, end),
        spokenSnippet: section?.content ? section.content.slice(0, 110) + '...' : (slide.subtitle || slide.title)
      };
    });
  }

  // 2. Keyword & Word-Weight Boundary Estimation
  // Calculate relative weight of each slide based on its content richness
  const weights = slides.map((s, idx) => {
    let weight = 15; // base weight
    if (s.title) weight += s.title.length * 0.3;
    if (s.subtitle) weight += s.subtitle.length * 0.2;
    if (s.bulletPoints && Array.isArray(s.bulletPoints)) {
      weight += s.bulletPoints.reduce((acc, b) => acc + (b.length * 0.4), 0);
    }
    // Introduction and conclusion usually have distinct weight
    if (idx === 0) weight *= 1.15;
    return weight;
  });

  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
  let runningTime = 0;

  return slides.map((slide, idx) => {
    const isLast = (idx === slides.length - 1);
    const allocated = (weights[idx] / totalWeight) * duration;
    const start = runningTime;
    const end = isLast ? duration : runningTime + allocated;
    runningTime = end;

    // Extract approximate matching script snippet if full script text is provided
    let snippet = '';
    if (fullScriptText && typeof fullScriptText === 'string') {
      const sentences = fullScriptText.split(/[।!?\n]+/).map(s => s.trim()).filter(Boolean);
      if (sentences.length > 0) {
        const targetSentenceIdx = Math.min(sentences.length - 1, Math.floor((idx / slides.length) * sentences.length));
        snippet = sentences[targetSentenceIdx] || '';
      }
    }
    if (!snippet) {
      snippet = slide.bulletPoints && slide.bulletPoints[0] ? slide.bulletPoints[0] : slide.title;
    }

    return {
      ...slide,
      startTime: parseFloat(start.toFixed(1)),
      endTime: parseFloat(end.toFixed(1)),
      duration: parseFloat(Math.max(1, end - start).toFixed(1)),
      audioTime: formatTimeRange(start, end),
      spokenSnippet: snippet.length > 120 ? snippet.slice(0, 120) + '...' : snippet
    };
  });
}

/**
 * Timing Continuity Validation
 * Validates whether slide sequence covers the entire audio without gaps or overlaps.
 */
export function validateTimeline(slides = [], totalAudioDuration = 0) {
  const errors = [];
  const warnings = [];

  if (!slides || slides.length === 0) {
    return { isValid: false, errors: ['કોઈ સ્લાઇડ મળી નથી.'], warnings: [] };
  }

  // 1. First slide starts at 0
  if (Math.abs(slides[0].startTime - 0) > 0.5) {
    warnings.push(`પ્રથમ સ્લાઇડ ૦:૦૦ પરથી શરૂ થવી જોઈએ (હાલ: ${formatSecondsToTime(slides[0].startTime)}).`);
  }

  for (let i = 0; i < slides.length; i++) {
    const cur = slides[i];

    // Negative or zero duration check
    if (cur.endTime <= cur.startTime) {
      errors.push(`સ્લાઇડ #${i + 1} નો સમયગાળો અમાન્ય છે (Start: ${cur.startTime}s, End: ${cur.endTime}s).`);
    }

    // Continuity with next slide
    if (i < slides.length - 1) {
      const next = slides[i + 1];
      const diff = next.startTime - cur.endTime;

      if (diff > 0.3) {
        // Gap
        warnings.push(`સ્લાઇડ #${i + 1} અને #${i + 2} વચ્ચે ${diff.toFixed(1)} સેકન્ડનો ગેપ છે.`);
      } else if (diff < -0.3) {
        // Overlap
        warnings.push(`સ્લાઇડ #${i + 1} અને #${i + 2} વચ્ચે ${Math.abs(diff).toFixed(1)} સેકન્ડનું ઓવરલેપિંગ છે.`);
      }
    }
  }

  // Total duration check if audio duration known
  if (totalAudioDuration > 5) {
    const lastSlide = slides[slides.length - 1];
    const diffFromEnd = Math.abs(lastSlide.endTime - totalAudioDuration);
    if (diffFromEnd > 2.0) {
      warnings.push(`છેલ્લી સ્લાઇડ ઓડિયોના અંત (${formatSecondsToTime(totalAudioDuration)}) સાથે મેળ ખાતી નથી.`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    isFullySynchronized: errors.length === 0 && warnings.length === 0
  };
}

/**
 * 1-Click Fix Gaps and Overlaps
 * Repairs all boundaries so that:
 * - Slide 1 starts at 0.0s
 * - Each slide's endTime perfectly equals the next slide's startTime
 * - Final slide ends at totalAudioDuration
 */
export function fixTimelineGaps(slides = [], totalAudioDuration = 0) {
  if (!slides || slides.length === 0) return [];
  const duration = Math.max(10, totalAudioDuration || (slides[slides.length - 1]?.endTime || 180));

  let currentStart = 0;
  return slides.map((s, idx) => {
    const isLast = (idx === slides.length - 1);
    const origDuration = Math.max(2, (s.endTime || 0) - (s.startTime || 0)) || (duration / slides.length);
    const start = currentStart;
    const end = isLast ? duration : Math.min(duration - (slides.length - 1 - idx) * 2, start + origDuration);
    currentStart = end;

    return {
      ...s,
      startTime: parseFloat(start.toFixed(1)),
      endTime: parseFloat(end.toFixed(1)),
      duration: parseFloat((end - start).toFixed(1)),
      audioTime: formatTimeRange(start, end)
    };
  });
}

/**
 * Set a slide's start time and automatically align previous slide boundary to avoid gaps
 */
export function setSlideStartTime(slides = [], idx = 0, newStart = 0, totalDuration = 0) {
  if (!slides || !slides[idx]) return slides;
  const startSec = Math.max(0, parseFloat(newStart.toFixed(1)));
  const cur = slides[idx];

  // Ensure start is before end
  if (startSec >= cur.endTime) {
    cur.endTime = Math.max(startSec + 2, totalDuration > 0 ? Math.min(totalDuration, startSec + 15) : startSec + 15);
  }
  cur.startTime = startSec;
  cur.duration = parseFloat(Math.max(1, cur.endTime - cur.startTime).toFixed(1));
  cur.audioTime = formatTimeRange(cur.startTime, cur.endTime);

  // If previous slide exists, seamlessly align its end time
  if (idx > 0 && slides[idx - 1]) {
    const prev = slides[idx - 1];
    prev.endTime = cur.startTime;
    prev.duration = parseFloat(Math.max(1, prev.endTime - prev.startTime).toFixed(1));
    prev.audioTime = formatTimeRange(prev.startTime, prev.endTime);
  }
  return slides;
}

/**
 * Set a slide's end time and automatically align next slide boundary to avoid gaps
 */
export function setSlideEndTime(slides = [], idx = 0, newEnd = 0, totalDuration = 0) {
  if (!slides || !slides[idx]) return slides;
  let endSec = parseFloat(newEnd.toFixed(1));
  if (totalDuration > 0) endSec = Math.min(totalDuration, endSec);
  const cur = slides[idx];

  // Ensure end is after start
  if (endSec <= cur.startTime) {
    endSec = cur.startTime + 2;
  }
  cur.endTime = endSec;
  cur.duration = parseFloat(Math.max(1, cur.endTime - cur.startTime).toFixed(1));
  cur.audioTime = formatTimeRange(cur.startTime, cur.endTime);

  // If next slide exists, seamlessly align its start time
  if (idx < slides.length - 1 && slides[idx + 1]) {
    const next = slides[idx + 1];
    next.startTime = cur.endTime;
    if (next.endTime <= next.startTime) {
      next.endTime = totalDuration > 0 ? Math.min(totalDuration, next.startTime + 15) : next.startTime + 15;
    }
    next.duration = parseFloat(Math.max(1, next.endTime - next.startTime).toFixed(1));
    next.audioTime = formatTimeRange(next.startTime, next.endTime);
  }
  return slides;
}

/**
 * Nudge a slide's start or end boundary by delta seconds
 */
export function nudgeSlideTiming(slides = [], idx = 0, field = 'end', deltaSeconds = 1, totalDuration = 0) {
  if (!slides || !slides[idx]) return slides;
  const cur = slides[idx];
  if (field === 'start') {
    const newStart = Math.max(0, cur.startTime + deltaSeconds);
    return setSlideStartTime(slides, idx, newStart, totalDuration);
  } else {
    const newEnd = cur.endTime + deltaSeconds;
    return setSlideEndTime(slides, idx, newEnd, totalDuration);
  }
}

/**
 * Split a slide at current audio playhead timestamp
 */
export function splitSlideAtTime(slides = [], idx = 0, splitSec = 0, totalDuration = 0) {
  if (!slides || !slides[idx]) return slides;
  const cur = slides[idx];
  const splitPoint = parseFloat(splitSec.toFixed(1));

  // Must be strictly between slide's start and end
  if (splitPoint <= cur.startTime + 1.5 || splitPoint >= cur.endTime - 1.5) {
    return slides;
  }

  const origEnd = cur.endTime;
  cur.endTime = splitPoint;
  cur.duration = parseFloat(Math.max(1, cur.endTime - cur.startTime).toFixed(1));
  cur.audioTime = formatTimeRange(cur.startTime, cur.endTime);

  const newSlide = {
    ...cur,
    id: Date.now() + Math.floor(Math.random() * 1000),
    title: `${cur.title} (ભાગ ૨)`,
    subtitle: cur.subtitle || 'વિગતવાર મુદ્દાઓ',
    bulletPoints: cur.bulletPoints.length > 2 ? cur.bulletPoints.slice(Math.ceil(cur.bulletPoints.length / 2)) : [...cur.bulletPoints],
    startTime: splitPoint,
    endTime: origEnd,
    duration: parseFloat(Math.max(1, origEnd - splitPoint).toFixed(1)),
    audioTime: formatTimeRange(splitPoint, origEnd)
  };

  slides.splice(idx + 1, 0, newSlide);
  return slides;
}

/**
 * Export Synchronized Timeline Specification
 */
export function createSyncManifest(project, slides, totalDuration) {
  return {
    projectName: project.topic || 'Gyan Yatra Presentation',
    createdAt: new Date().toISOString(),
    totalDurationSeconds: totalDuration,
    formattedTotalDuration: formatSecondsToTime(totalDuration),
    audioUrl: project.voiceAudio?.audioUrl || '/audio/my_real_cloned_voice.mp3',
    audioProvider: project.voiceAudio?.provider || 'Neural Voice Engine',
    slideCount: slides.length,
    slides: slides.map((s, idx) => ({
      slideNumber: idx + 1,
      title: s.title,
      subtitle: s.subtitle || '',
      startTime: s.startTime,
      endTime: s.endTime,
      duration: s.duration,
      audioTime: s.audioTime,
      spokenSnippet: s.spokenSnippet || '',
      bulletPoints: s.bulletPoints || []
    })),
    renderingSpecification: {
      resolution: '1920x1080',
      aspectRatio: '16:9',
      fps: 30,
      background: '#FFFFFF',
      videoCodec: 'H.264',
      audioCodec: 'AAC',
      note: 'Use FFmpeg image concat demuxer or Remotion sequence to stitch the exported 16:9 slide images with the audio stream at these exact timestamps.'
    }
  };
}

