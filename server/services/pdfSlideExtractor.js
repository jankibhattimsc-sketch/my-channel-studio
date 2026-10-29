const pdfParseModule = require('pdf-parse');
const slideVoiceoverService = require('./slideVoiceoverService');

/**
 * Service to parse slide presentations provided as PDF documents.
 * Extracts page-by-page slide content, titles, visuals, and key bullet points.
 */
class PdfSlideExtractor {
  /**
   * Extract slides from a PDF buffer
   * @param {Buffer} dataBuffer - Raw PDF buffer
   * @param {Object} options - { overallTopic, explanationDepth, language, targetAudience, autoGenerate }
   */
  async extractSlidesFromPdf(dataBuffer, options = {}) {
    if (!dataBuffer || !Buffer.isBuffer(dataBuffer)) {
      throw new Error('માન્ય PDF ફાઇલ અથવા બફર મળેલ નથી (Valid PDF buffer required).');
    }

    const pages = [];
    let totalPages = 1;

    try {
      // 1. Support modern pdf-parse 2.x (PDFParse class)
      if (pdfParseModule.PDFParse) {
        const parserInstance = new pdfParseModule.PDFParse({ data: dataBuffer });
        await parserInstance.load();
        const textResult = await parserInstance.getText();
        
        if (textResult && Array.isArray(textResult.pages) && textResult.pages.length > 0) {
          totalPages = textResult.total || textResult.pages.length;
          textResult.pages.forEach(p => {
            pages.push({
              pageNumber: p.num || pages.length + 1,
              rawText: (p.text || '').trim()
            });
          });
        } else if (textResult && textResult.text) {
          pages.push({ pageNumber: 1, rawText: textResult.text.trim() });
        }
        
        try {
          if (typeof parserInstance.destroy === 'function') {
            await parserInstance.destroy();
          }
        } catch (_) {}
      } else if (typeof pdfParseModule === 'function') {
        // 2. Support classic pdf-parse 1.x
        function customPageRender(pageData) {
          return pageData.getTextContent().then(textContent => {
            let text = '';
            let lastY;
            for (const item of textContent.items) {
              if (lastY === item.transform[5] || !lastY) {
                text += item.str;
              } else {
                text += '\n' + item.str;
              }
              lastY = item.transform[5];
            }
            pages.push({
              pageNumber: pageData.pageIndex + 1,
              rawText: text.trim()
            });
            return text;
          });
        }

        const classicData = await pdfParseModule(dataBuffer, { pagerender: customPageRender });
        totalPages = classicData.numpages || pages.length || 1;
        if (pages.length === 0 && classicData.text) {
          pages.push({ pageNumber: 1, rawText: classicData.text.trim() });
        }
      }
    } catch (parseErr) {
      console.warn('[PdfSlideExtractor] Parser library notice:', parseErr.message);
    }

    // Fallback: If pages empty, attempt text-chunk extraction from buffer
    if (pages.length === 0) {
      const rawAscii = dataBuffer.toString('utf-8');
      const textMatches = rawAscii.match(/\(([^()]{3,})\)\s*Tj/g) || [];
      const cleanTexts = textMatches.map(m => m.replace(/^\(|\)\s*Tj$/g, '').trim()).filter(Boolean);
      if (cleanTexts.length > 0) {
        pages.push({
          pageNumber: 1,
          rawText: cleanTexts.join('\n')
        });
      } else {
        pages.push({
          pageNumber: 1,
          rawText: 'સ્લાઇડ ૧: સરકારી નિર્ણય અને મુખ્ય મુદ્દાઓ\n• સત્તાવાર જાહેરાત અને પરિપત્ર\n• મહત્વપૂર્ણ નિયમો અને પાત્રતા'
        });
      }
    }

    // Sort pages by pageNumber
    pages.sort((a, b) => a.pageNumber - b.pageNumber);
    const fullPdfText = pages.map(p => `[પેજ ${p.pageNumber}]\n${p.rawText}`).join('\n\n');

    const extractedSlides = pages.map((page, idx) => {
      const slideNum = idx + 1;
      const lines = page.rawText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      let title = `સ્લાઇડ ${slideNum}`;
      let contentLines = [];
      let visualHint = 'સત્તાવાર દસ્તાવેજ / સ્લાઇડ વિઝ્યુઅલ';

      // Helper to check if a line is a header/junk/date/page number
      const isJunkLine = (l) => {
        const lower = l.toLowerCase();
        if (/^(?:page|પેજ|સ્લાઇડ|slide)\s*\d+/i.test(lower)) return true;
        if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(lower)) return true;
        if (/^(?:તારીખ|date|ક્રમાંક|no\.|ref\.|પરિપત્ર\s*ક્રમાંક)[:\s]/i.test(lower)) return true;
        if (/^https?:\/\//i.test(lower)) return true;
        if (l.replace(/[\s\-_=\*\.]/g, '').length < 3) return true;
        return false;
      };

      if (lines.length > 0) {
        // Find best substantive line for heading (skipping dates, page numbers, reference codes)
        let foundTitleIdx = -1;
        for (let i = 0; i < lines.length; i++) {
          const cleanLine = lines[i]
            .replace(/^(?:Slide|સ્લાઇડ|Page|પેજ)\s*\d+[:\.\-]?\s*/i, '')
            .replace(/^[•\-\*0-9\.\)]+\s*/, '')
            .trim();
          
          if (!isJunkLine(cleanLine) && cleanLine.length >= 4 && cleanLine.length <= 90) {
            title = cleanLine;
            foundTitleIdx = i;
            break;
          }
        }

        // Remaining lines are content
        const rawContentLines = lines.filter((_, i) => i !== foundTitleIdx);
        
        // Clean and extract punchy bullet points
        rawContentLines.forEach(l => {
          const c = l.replace(/^[•\-\*0-9\.\)]+\s*/, '').trim();
          if (c && !isJunkLine(c) && c.length >= 6) {
            // If line is very long, break by sentence
            if (c.length > 120) {
              const subSentences = c.split(/[।\.\?!]+/).map(s => s.trim()).filter(s => s.length >= 8);
              contentLines.push(...subSentences);
            } else {
              contentLines.push(c);
            }
          }
        });
      }

      // Limit to 3-5 high-impact bullet points
      if (contentLines.length > 4) {
        contentLines = contentLines.slice(0, 4);
      }

      // Format bullet points
      let formattedContent = '';
      if (contentLines.length > 0) {
        formattedContent = contentLines.map(line => `• ${line}`).join('\n');
      } else {
        formattedContent = `• ${title} અંગે સત્તાવાર પરિપત્ર અને નિયમો જાહેર\n• પાત્રતા, માપદંડો અને ચોખ્ખી નાણાકીય વિગત\n• મહત્વપૂર્ણ તારીખો અને અમલ પ્રક્રિયા`;
      }

      // Detect visual elements from text
      const fullSlideText = `${title} ${formattedContent}`.toLowerCase();
      if (fullSlideText.includes('કોષ્ટક') || fullSlideText.includes('ટેબલ') || fullSlideText.includes('table')) {
        visualHint = 'વિગતવાર ડેટા કોષ્ટક / કેલ્ક્યુલેશન ટેબલ';
      } else if (fullSlideText.includes('પરિપત્ર') || fullSlideText.includes('ઠરાવ') || fullSlideText.includes('gr')) {
        visualHint = 'ગાંધીનગર સચિવાલય સત્તાવાર ઠરાવ / પરિપત્ર PDF સ્કેન';
      } else if (fullSlideText.includes('ojas') || fullSlideText.includes('ikhedut') || fullSlideText.includes('પોર્ટલ')) {
        visualHint = 'સત્તાવાર ઓનલાઇન પોર્ટલ હોમપેજ અને અરજી ફોર્મ સ્ક્રીનશોટ';
      } else if (fullSlideText.includes('સિલેબસ') || fullSlideText.includes('પરીક્ષા') || fullSlideText.includes('પેપર')) {
        visualHint = 'પરીક્ષા પદ્ધતિ, ગુણભાર અને વિષયવાર ચાર્ટ';
      } else if (fullSlideText.includes('પગાર') || fullSlideText.includes('da') || fullSlideText.includes('એરિયર્સ')) {
        visualHint = '૭મા પગારપંચ પે-મેટ્રિક્સ અને મોંઘવારી ભથ્થા ગણતરી કોષ્ટક';
      } else {
        visualHint = 'મુખ્ય માહિતી ચાર્ટ / સ્ક્રીન પર દર્શાવેલ વિઝ્યુઅલ મુદ્દા';
      }

      // Timing estimation
      const startMin = Math.floor((idx * 1.5));
      const endMin = Math.floor(((idx + 1) * 1.5));
      const timing = `0${startMin}:00 - 0${endMin}:30`;

      return {
        slideNumber: slideNum,
        title: title,
        visual: visualHint,
        content: formattedContent,
        timing: timing
      };
    });

    // Derive overall topic from options, subject analysis of extracted text, or filename
    let overallTopic = options.overallTopic;
    if (!overallTopic || overallTopic === 'ગુજરાત સરકાર સત્તાવાર માહિતી ૨૦૨૬') {
      const detected = slideVoiceoverService.analyzePdfSubjectAndDetails(fullPdfText, '', options.filename);
      if (detected.subject && detected.subject.length >= 4) {
        overallTopic = detected.subject;
      } else if (extractedSlides[0] && extractedSlides[0].title && !extractedSlides[0].title.startsWith('સ્લાઇડ')) {
        overallTopic = extractedSlides[0].title;
      } else if (options.filename) {
        overallTopic = options.filename.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
      } else {
        overallTopic = 'ગુજરાત સરકાર સત્તાવાર પરિપત્ર અને ભરતી નિર્ણય ૨૦૨૬';
      }
    }
    const explanationDepth = options.explanationDepth || 'detailed';
    const language = options.language || 'gu';
    const targetAudience = options.targetAudience || 'ગુજરાતના સરકારી કર્મચારીઓ, ઉમેદવારો અને નાગરિકો';

    let promptResult = null;
    if (options.autoGenerate !== false) {
      promptResult = slideVoiceoverService.generateMasterPromptForSlides({
        slides: extractedSlides,
        overallTopic: overallTopic,
        explanationDepth: explanationDepth,
        language: language,
        targetAudience: targetAudience,
        fullPdfText: fullPdfText,
        filename: options.filename
      });
    }

    return {
      success: true,
      totalPages: totalPages,
      slideCount: extractedSlides.length,
      overallTopic: overallTopic,
      explanationDepth: explanationDepth,
      language: language,
      slides: extractedSlides,
      fullPdfText: fullPdfText,
      promptResult: promptResult
    };
  }
}

module.exports = new PdfSlideExtractor();
