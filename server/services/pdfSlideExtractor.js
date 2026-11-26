const pdfParseModule = require('pdf-parse');
const slideVoiceoverService = require('./slideVoiceoverService');
const db = require('../db');

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
        } catch (_) { }
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
        const fallbackTopic = (options.overallTopic || '').trim() || 'સરકારી નિર્ણય અને મુખ્ય મુદ્દાઓ';
        pages.push({
          pageNumber: 1,
          rawText: `સ્લાઇડ ૧: ${fallbackTopic}\n• સત્તાવાર જાહેરાત અને પરિપત્ર\n• મહત્વપૂર્ણ નિયમો અને પાત્રતા`
        });
      }
    }

    // Sort pages by pageNumber
    pages.sort((a, b) => a.pageNumber - b.pageNumber);
    const fullPdfText = pages.map(p => `[પેજ ${p.pageNumber}]\n${p.rawText}`).join('\n\n');

    // Retrieve existing script from database if projectId is provided
    let existingScript = null;
    if (options.projectId) {
      try {
        existingScript = db.getLatestScriptByProjectId(options.projectId);
      } catch (_) { }
    }

    // Contextual slide topics template dynamically adapted to overallTopic for image-only / scanned PDFs
    const topicHeading = (options.overallTopic || '').trim() || 'સત્તાવાર સરકારી પરિપત્ર અને માહિતી';
    const isTopicAnganwadi = topicHeading.includes('આંગણવાડી') || topicHeading.includes('anganwadi') || topicHeading.includes('તેડાગર');
    const isTopicDa = topicHeading.includes('મોંઘવારી') || topicHeading.includes('da') || topicHeading.includes('પગાર');
    const isTopicKisan = topicHeading.includes('કિસાન') || topicHeading.includes('kisan') || topicHeading.includes('ખેડૂત');
    const isTopicPolice = topicHeading.includes('પોલીસ') || topicHeading.includes('police') || topicHeading.includes('કોન્સ્ટેબલ');

    let benefitLabel = 'લાભાર્થી પાત્રતા & મળવાપાત્ર લાભોનું માળખું';
    let benefitPoints = ['નક્કી કરેલ શરતો અને માન્ય શ્રેણીના લાભાર્થીઓ', 'લાભો, સહાય અથવા સુવિધાઓની વિગતવાર માહિતી', 'સીધા બેંક ખાતામાં DBT દ્વારા પારદર્શક લાભ'];

    if (isTopicAnganwadi) {
      benefitLabel = 'પાત્રતા, શરતો & માનદ વેતન માળખું';
      benefitPoints = ['નક્કી કરેલ શરતો અને માન્ય કેટેગરી', 'માનદ વેતન / ભથ્થાં વધારાના ધોરણો', 'સીધા બેંક ખાતામાં DBT દ્વારા જમા'];
    } else if (isTopicDa) {
      benefitLabel = 'DA વધારો & પે-મેટ્રિક્સ ગણતરી માળખું';
      benefitPoints = ['કેન્દ્ર અને રાજ્ય સરકાર દ્વારા ટકાવારી વધારો', '૭મા પગારપંચ પે-મેટ્રિક્સ મુજબ મળવાપાત્ર રકમ', 'રોકડ અને GPF જમા એરિયર્સની સંપૂર્ણ ગણતરી'];
    } else if (isTopicKisan) {
      benefitLabel = 'ખેડૂત પાત્રતા & યોજના સહાય માળખું';
      benefitPoints = ['e-KYC અને જમીન ચકાસણીના નિયમો', 'સીધા બેંક ખાતામાં હપ્તો જમા થવાની પ્રક્રિયા', 'તાલુકા અને ગ્રામ પંચાયત કક્ષાએ વેરિફિકેશન'];
    } else if (isTopicPolice) {
      benefitLabel = 'ઉમેદવાર પાત્રતા, વયમર્યાદા & શારીરિક માપદંડ';
      benefitPoints = ['શૈક્ષણિક લાયકાત અને છૂટછાટના નિયમો', 'PET / PST શારીરિક કસોટી માપદંડ', 'OJAS પોર્ટલ પર ઓનલાઇન અરજી પ્રક્રિયા'];
    }

    const defaultSlideTemplates = [
      { title: `${topicHeading} - મુખ્ય જાહેરાત & સત્તાવાર પરિપત્ર`, points: ['સત્તાવાર સરકારી જાહેરાત અને પરિપત્ર જાહેર', 'રાજ્ય સરકાર દ્વારા મહત્વપૂર્ણ મંજૂરી', 'તમામ પાત્ર ઉમેદવારો અને લાભાર્થીઓ માટે નિયમો'] },
      { title: 'પૃષ્ઠભૂમિ & નવા નિર્ણયની જરૂરિયાત', points: ['જરૂરી ફેરફારો અને સમિતિ દ્વારા ભલામણો', 'લાભાર્થીઓની માંગણીઓ અને વહીવટી સમીક્ષા', 'સુવિધા અને પારદર્શિતા માટે સરળતા'] },
      { title: benefitLabel, points: benefitPoints },
      { title: 'સત્તાવાર જોગવાઈઓ & પરિપત્ર વિશ્લેષણ', points: ['સત્તાવાર ઠરાવ મુજબ અમલીકરણ', 'કેન્દ્ર અને રાજ્ય સરકારનો ફાળો', 'સમયસર ચુકવણી અને પારદર્શક વ્યવસ્થા'] },
      { title: 'જૂના અને નવા માળખાની તુલના', points: ['અગાઉ મળવાપાત્ર જોગવાઈ અને હાલનો નવો દર', 'વાર્ષિક અને માસિક નાણાકીય/વહીવટી ફાયદો', 'વધારાના વિશેષ લાભો અને પ્રોત્સાહન'] },
      { title: 'ઓનલાઇન અરજી & અમલીકરણ પદ્ધતિ', points: ['ઓનલાઇન પોર્ટલ દ્વારા ડેટા વેરિફિકેશન', 'જિલ્લા અને તાલુકા કક્ષાએ મંજૂરી પ્રક્રિયા', 'જરૂરી ડોક્યુમેન્ટ્સ અને પુરાવાઓની યાદી'] },
      { title: 'હકીકત તપાસ & અગત્યની સ્પષ્ટતા', points: ['અફવાઓ અને ખોટી માહિતીથી સાવચેત રહેવું', 'માત્ર સત્તાવાર વેબસાઇટનો પરિપત્ર માન્ય', 'વિભાગીય હેલ્પલાઇન અને સંપર્ક નંબર'] },
      { title: 'નીતિગત અસર & સામાજિક ફાયદા', points: ['લાભાર્થીઓ અને પરિવારોને મહત્વપૂર્ણ સુરક્ષા', 'સેવાઓની ગુણવત્તામાં નોંધપાત્ર સુધારો', 'લાંબા ગાળાના આયોજન માટે સકારાત્મક પગલું'] },
      { title: 'મુખ્ય તારણો & અંતિમ નિષ્કર્ષ', points: ['વિડીયોને લાઈક કરો અને તમારા ગ્રૂપમાં શેર કરો', 'નવા પરિપત્રની પીડીએફ મેળવવા સંપર્કમાં રહો', 'જ્ઞાન યાત્રા ચેનલને સબ્સ્ક્રાઇબ કરો'] }
    ];

    const extractedSlides = pages.map((page, idx) => {
      const slideNum = idx + 1;
      const lines = page.rawText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      let title = `સ્લાઇડ ${slideNum}`;
      let contentLines = [];
      let rawContentLines = [];
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
        rawContentLines = lines.filter((_, i) => i !== foundTitleIdx);

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

      // If text layer was empty (image-only/scanned PDF), pull from existing project script or topic templates
      let scriptText = '';
      if (contentLines.length === 0 || title === `સ્લાઇડ ${slideNum}`) {
        // 1. Try matching with existing project script from Database
        const dbSec = existingScript?.sections?.[idx] || existingScript?.sections?.find(s => s.slideNumber === slideNum);
        if (dbSec && (dbSec.scriptText || dbSec.title || dbSec.sectionName)) {
          const candidateTitle = dbSec.title || dbSec.sectionName;
          if (candidateTitle && !candidateTitle.startsWith('સ્લાઇડ')) {
            title = candidateTitle;
          }
          if (dbSec.scriptText && dbSec.scriptText.trim().length > 0) {
            scriptText = dbSec.scriptText.trim();
            if (contentLines.length === 0) {
              const sentences = scriptText
                .split(/[।\.\?!]+/)
                .map(s => s.trim())
                .filter(s => s.length >= 8 && s.length <= 110);
              contentLines = sentences.slice(0, 4);
            }
          }
        }

        // 2. Fallback to topic-specific contextual template if still empty or dummy title
        const tpl = defaultSlideTemplates[idx % defaultSlideTemplates.length];
        if (title === `સ્લાઇડ ${slideNum}` || !title || title.startsWith('સ્લાઇડ')) {
          title = tpl.title;
        }
        if (contentLines.length === 0) {
          contentLines = [...tpl.points];
        }
      }

      // Preserve all substantive sentences from the PDF page so script is 100% full and not truncated
      const allPageTextLines = rawContentLines
        .map(l => l.replace(/^[•\-\*0-9\.\)]+\s*/, '').trim())
        .filter(l => l && !isJunkLine(l) && l.length >= 4);

      // Limit to 4-5 high-impact bullet points for slide visual display only
      const displayContentLines = contentLines.length > 5 ? contentLines.slice(0, 5) : contentLines;

      // Format bullet points
      let formattedContent = '';
      if (displayContentLines.length > 0) {
        formattedContent = displayContentLines.map(line => `• ${line}`).join('\n');
      }

      const bulletArr = displayContentLines.length > 0 ? displayContentLines : [];
      if (!scriptText) {
        if (allPageTextLines.length > 0) {
          scriptText = `${title}.\n${allPageTextLines.join(' ')}`;
        } else if (bulletArr.length > 0) {
          scriptText = `${title}.\n${bulletArr.join('. ')}.`;
        } else {
          scriptText = title;
        }
      }

      // Detect visual elements from text
      const fullSlideText = `${title} ${formattedContent} ${scriptText}`.toLowerCase();
      if (fullSlideText.includes('કોષ્ટક') || fullSlideText.includes('ટેબલ') || fullSlideText.includes('table')) {
        visualHint = 'વિગતવાર ડેટા કોષ્ટક / કેલ્ક્યુલેશન ટેબલ';
      } else if (fullSlideText.includes('પરિપત્ર') || fullSlideText.includes('ઠરાવ') || fullSlideText.includes('gr')) {
        visualHint = 'ગાંધીનગર સચિવાલય સત્તાવાર ઠરાવ / પરિપત્ર PDF સ્કેન';
      } else if (fullSlideText.includes('ojas') || fullSlideText.includes('ikhedut') || fullSlideText.includes('પોર્ટલ')) {
        visualHint = 'સત્તાવાર ઓનલાઇન પોર્ટલ હોમપેજ અને અરજી ફોર્મ સ્ક્રીનશોટ';
      } else if (fullSlideText.includes('સિલેબસ') || fullSlideText.includes('પરીક્ષા') || fullSlideText.includes('પેપર')) {
        visualHint = 'પરીક્ષા પદ્ધતિ, ગુણભાર અને વિષયવાર ચાર્ટ';
      } else if (fullSlideText.includes('પગાર') || fullSlideText.includes('da') || fullSlideText.includes('માનદ') || fullSlideText.includes('એરિયર્સ')) {
        visualHint = '૭મા પગારપંચ પે-મેટ્રિક્સ અને માનદ વેતન ગણતરી કોષ્ટક';
      } else {
        visualHint = 'મુખ્ય માહિતી ચાર્ટ / સ્ક્રીન પર દર્શાવેલ વિઝ્યુઅલ મુદ્દા';
      }

      // Timing estimation
      const startMin = Math.floor((idx * 1.5));
      const endMin = Math.floor(((idx + 1) * 1.5));
      const timing = `0${startMin}:00 - 0${endMin}:30`;
      const accentColors = ['#DC2626', '#2563EB', '#10B981', '#7C3AED', '#EA580C', '#0284C7', '#0D9488', '#D97706'];
      const accentColor = accentColors[idx % accentColors.length];

      return {
        id: Date.now() + idx,
        slideId: `slide_${options.projectId || 'proj'}_${slideNum}`,
        slideNumber: slideNum,
        pageNumber: page.pageNumber || slideNum,
        title: title,
        subtitle: '',
        bulletPoints: bulletArr,
        visual: visualHint,
        content: formattedContent,
        scriptText: scriptText,
        timing: timing,
        audioTime: timing,
        bgColor: '#FFFFFF',
        textColor: '#0F172A',
        accentColor
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
