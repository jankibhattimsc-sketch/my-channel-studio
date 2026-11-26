const zlib = require('node:zlib');

/**
 * Robust ZIP Entry Extractor using Central Directory (EOCD) with fallback to Local Headers.
 * Handles DEFLATE (method 8) and STORE (method 0), including archives with data descriptors.
 */
function readZipEntries(buffer) {
  const files = {};
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 22) return files;

  // 1. Primary Strategy: Locate End of Central Directory Record (EOCD) PK\x05\x06 (0x06054b50)
  let eocdOffset = -1;
  const maxSearch = Math.min(buffer.length, 65535 + 22);
  for (let i = buffer.length - 22; i >= buffer.length - maxSearch; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset !== -1) {
    try {
      const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
      const cdOffset = buffer.readUInt32LE(eocdOffset + 16);

      let curr = cdOffset;
      for (let e = 0; e < totalEntries && curr < buffer.length - 46; e++) {
        if (buffer.readUInt32LE(curr) !== 0x02014b50) break;

        const compression = buffer.readUInt16LE(curr + 10);
        const compressedSize = buffer.readUInt32LE(curr + 20);
        const fileNameLen = buffer.readUInt16LE(curr + 28);
        const extraLen = buffer.readUInt16LE(curr + 30);
        const commentLen = buffer.readUInt16LE(curr + 32);
        const localHeaderOffset = buffer.readUInt32LE(curr + 42);

        const fileName = buffer.toString('utf-8', curr + 46, curr + 46 + fileNameLen);
        curr += 46 + fileNameLen + extraLen + commentLen;

        if (localHeaderOffset + 30 <= buffer.length && buffer.readUInt32LE(localHeaderOffset) === 0x04034b50) {
          const localFileNameLen = buffer.readUInt16LE(localHeaderOffset + 26);
          const localExtraLen = buffer.readUInt16LE(localHeaderOffset + 28);
          const dataStart = localHeaderOffset + 30 + localFileNameLen + localExtraLen;
          const dataEnd = dataStart + compressedSize;

          if (dataEnd <= buffer.length) {
            const compData = buffer.subarray(dataStart, dataEnd);
            try {
              let decomp;
              if (compression === 0) {
                decomp = compData;
              } else if (compression === 8) {
                decomp = zlib.inflateRawSync(compData);
              }
              if (decomp) {
                files[fileName] = decomp;
              }
            } catch (_) {}
          }
        }
      }
    } catch (_) {}
  }

  // 2. Fallback Strategy: Local file header scan (for streamed or non-standard ZIP buffers)
  if (Object.keys(files).length === 0) {
    let offset = 0;
    while (offset < buffer.length - 30) {
      if (buffer.readUInt32LE(offset) === 0x04034b50) {
        const flags = buffer.readUInt16LE(offset + 6);
        const compression = buffer.readUInt16LE(offset + 8);
        let compressedSize = buffer.readUInt32LE(offset + 18);
        const fileNameLen = buffer.readUInt16LE(offset + 26);
        const extraLen = buffer.readUInt16LE(offset + 28);
        const fileName = buffer.toString('utf-8', offset + 30, offset + 30 + fileNameLen);
        const dataStart = offset + 30 + fileNameLen + extraLen;

        if ((flags & 0x08) && compressedSize === 0) {
          // Find next signature
          let nextHeader = dataStart;
          while (nextHeader < buffer.length - 4) {
            const sig = buffer.readUInt32LE(nextHeader);
            if (sig === 0x08074b50) {
              compressedSize = buffer.readUInt32LE(nextHeader + 4);
              break;
            } else if (sig === 0x04034b50 || sig === 0x02014b50) {
              compressedSize = nextHeader - dataStart;
              break;
            }
            nextHeader++;
          }
        }

        const dataEnd = dataStart + compressedSize;
        if (dataEnd <= buffer.length && compressedSize > 0) {
          const compData = buffer.subarray(dataStart, dataEnd);
          try {
            let decomp;
            if (compression === 0) decomp = compData;
            else if (compression === 8) decomp = zlib.inflateRawSync(compData);
            if (decomp) files[fileName] = decomp;
          } catch (_) {}
          offset = dataEnd;
        } else {
          offset++;
        }
      } else {
        offset++;
      }
    }
  }

  return files;
}

/**
 * Extracts and decodes text runs and paragraphs from an XML string.
 */
function cleanXmlText(text) {
  if (!text) return '';
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

/**
 * Pure Node.js Complete PPTX Presentation Extractor
 * Reads ALL slides, preserves original ordering, extracts titles, subtitles, bullets,
 * background colors, and embedded images.
 */
function extractPptxSlides(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) return [];

  const files = readZipEntries(buffer);
  const fileKeys = Object.keys(files);
  if (fileKeys.length === 0) return [];

  // Determine slide files in order:
  // 1. Try reading ppt/presentation.xml and ppt/_rels/presentation.xml.rels
  let orderedSlideKeys = [];
  const presKey = fileKeys.find(k => /(?:^|\/)ppt\/presentation\.xml$/i.test(k));
  const relsKey = fileKeys.find(k => /(?:^|\/)ppt\/_rels\/presentation\.xml\.rels$/i.test(k));

  if (presKey && relsKey) {
    try {
      const presXml = files[presKey].toString('utf-8');
      const relsXml = files[relsKey].toString('utf-8');

      // Map rId to target
      const rIdMap = {};
      const relRegex = /<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"/gi;
      let relMatch;
      while ((relMatch = relRegex.exec(relsXml)) !== null) {
        let target = relMatch[2].replace(/^\.\//, '');
        if (!target.startsWith('ppt/')) {
          target = `ppt/${target}`;
        }
        rIdMap[relMatch[1]] = target;
      }

      // Read ordered p:sldId
      const sldRegex = /<p:sldId\b[^>]*\br:id="([^"]+)"/gi;
      let sldMatch;
      while ((sldMatch = sldRegex.exec(presXml)) !== null) {
        const rId = sldMatch[1];
        const target = rIdMap[rId];
        if (target) {
          // Find matching key case-insensitively
          const actualKey = fileKeys.find(k => k.toLowerCase() === target.toLowerCase());
          if (actualKey && !orderedSlideKeys.includes(actualKey)) {
            orderedSlideKeys.push(actualKey);
          }
        }
      }
    } catch (_) {}
  }

  // 2. Fallback: If orderedSlideKeys is empty, gather all ppt/slides/slide*.xml and sort naturally
  if (orderedSlideKeys.length === 0) {
    orderedSlideKeys = fileKeys
      .filter(name => /(?:^|\/)ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
        const numB = parseInt(b.match(/slide(\d+)\.xml/i)?.[1] || '0', 10);
        return numA - numB;
      });
  }

  if (orderedSlideKeys.length === 0) {
    return [];
  }

  const slides = [];
  const accentColors = ['#DC2626', '#2563EB', '#10B981', '#7C3AED', '#EA580C', '#0284C7', '#0D9488', '#D97706'];

  orderedSlideKeys.forEach((slideKey, idx) => {
    const slideNumber = idx + 1;
    const xml = files[slideKey].toString('utf-8');

    // Parse shapes <p:sp>
    let title = '';
    let subtitle = '';
    const bulletPoints = [];
    const allParagraphs = [];

    // Check for custom slide background color
    let bgColor = '#FFFFFF';
    const srgbMatch = xml.match(/<a:srgbClr\b[^>]*\bval="([0-9a-fA-F]{6})"/i);
    if (srgbMatch) {
      bgColor = `#${srgbMatch[1]}`;
    }

    // Check for embedded images in slide rels
    let imageUrl = '';
    const relsSlideKey = slideKey.replace(/ppt\/slides\/([^/]+)$/i, 'ppt/slides/_rels/$1.rels');
    const actualRelsKey = fileKeys.find(k => k.toLowerCase() === relsSlideKey.toLowerCase());
    if (actualRelsKey) {
      try {
        const slideRelsXml = files[actualRelsKey].toString('utf-8');
        const imgRelMatch = slideRelsXml.match(/<Relationship\b[^>]*\bType="[^"]*\/image"[^>]*\bTarget="([^"]+)"/i);
        if (imgRelMatch) {
          let mediaTarget = imgRelMatch[1].replace(/^\.\.\//, 'ppt/');
          const mediaKey = fileKeys.find(k => k.toLowerCase() === mediaTarget.toLowerCase());
          if (mediaKey && files[mediaKey]) {
            const ext = mediaKey.split('.').pop().toLowerCase();
            const mime = ext === 'png' ? 'image/png' : (ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png');
            imageUrl = `data:${mime};base64,${files[mediaKey].toString('base64')}`;
          }
        }
      } catch (_) {}
    }

    // Extract all shape blocks
    const shapeRegex = /<p:sp\b[\s\S]*?<\/p:sp>/gi;
    let shapeMatch;
    const shapes = [];
    while ((shapeMatch = shapeRegex.exec(xml)) !== null) {
      shapes.push(shapeMatch[0]);
    }

    shapes.forEach(shapeXml => {
      const isTitleShape = /<p:ph\b[^>]*\btype="(?:title|ctrTitle)"/i.test(shapeXml) ||
                           /name="Title/i.test(shapeXml);
      const isSubtitleShape = /<p:ph\b[^>]*\btype="subTitle"/i.test(shapeXml) ||
                              /name="Subtitle/i.test(shapeXml);

      // Extract paragraphs within this shape
      const pRegex = /<a:p\b[\s\S]*?<\/a:p>/gi;
      let pMatch;
      const paragraphsInShape = [];

      while ((pMatch = pRegex.exec(shapeXml)) !== null) {
        const pXml = pMatch[0];
        // Extract all text runs <a:t>
        const tRegex = /<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/gi;
        let tMatch;
        let pText = '';
        while ((tMatch = tRegex.exec(pXml)) !== null) {
          pText += cleanXmlText(tMatch[1]);
        }
        pText = pText.trim();
        if (pText) {
          paragraphsInShape.push(pText);
          allParagraphs.push(pText);
        }
      }

      if (paragraphsInShape.length > 0) {
        if (isTitleShape && !title) {
          title = paragraphsInShape[0];
          if (paragraphsInShape.length > 1 && !subtitle) {
            subtitle = paragraphsInShape[1];
          }
        } else if (isSubtitleShape && !subtitle) {
          subtitle = paragraphsInShape.join(' • ');
        } else {
          paragraphsInShape.forEach(p => {
            if (!title) {
              title = p;
            } else {
              bulletPoints.push(p);
            }
          });
        }
      }
    });

    // Fallback if no structured shapes found: check raw text runs in slide
    if (!title && allParagraphs.length > 0) {
      title = allParagraphs[0];
      if (allParagraphs.length > 1 && !subtitle) {
        subtitle = allParagraphs[1];
      }
      for (let i = 2; i < allParagraphs.length; i++) {
        bulletPoints.push(allParagraphs[i]);
      }
    }

    if (!title) {
      title = `સ્લાઇડ #${slideNumber}`;
    }

    // Clean bullets of bullet markers
    const cleanedBullets = bulletPoints
      .map(b => b.replace(/^[•\-\*●\+0-9\.\)]+\s*/, '').trim())
      .filter(b => b && b !== title && b !== subtitle);

    const timing = `0${Math.floor(idx * 1.5)}:00 - 0${Math.floor((idx + 1) * 1.5)}:30`;
    const accentColor = accentColors[idx % accentColors.length];

    slides.push({
      id: Date.now() + idx,
      slideNumber,
      title: title.slice(0, 120),
      subtitle: subtitle ? subtitle.slice(0, 120) : '',
      bulletPoints: cleanedBullets.length > 0 ? cleanedBullets.slice(0, 12) : [],
      content: cleanedBullets.join('\n'),
      scriptText: cleanedBullets.length > 0 ? `${title}. ${cleanedBullets.join('. ')}.` : title,
      audioTime: timing,
      timing,
      visual: imageUrl ? 'સ્લાઇડ ઇમેજ અને વિઝ્યુઅલ' : 'મુખ્ય માહિતી અને ટેક્સ્ટ ચાર્ટ',
      imageUrl,
      bgColor,
      textColor: '#0F172A',
      accentColor
    });
  });

  return slides;
}

module.exports = {
  extractPptxSlides,
  readZipEntries
};
