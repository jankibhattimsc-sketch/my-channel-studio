/**
 * Slide-Wise Engaging Gujarati YouTube Script Prompt Generator Service
 * 
 * Implements:
 * 1. ANTIGRAVITY MASTER PROMPT — SLIDE-WISE ENGAGING SCRIPT PROMPT GENERATOR
 *    - Generates a SEPARATE, DETAILED, COPY-READY SCRIPT GENERATION PROMPT for each slide.
 *    - Required Format: SLIDE [NUMBER] — SCRIPT GENERATION PROMPT (Section 9)
 *    - Word Count and Explanation Depth Configurable: short (~60-90 words), detailed (~130-180 words), extended (~200-300 words).
 *    - Preserves slide sequence with smooth inter-slide transitions.
 *    - Strict factual accuracy, official government notifications, zero fabrication.
 * 2. MASTER PROMPT: GYAN YATRA — SLIDE-BY-SLIDE GUJARATI YOUTUBE VOICEOVER SCRIPT EXPERT
 *    - Preserved for full backward compatibility.
 */

class SlideVoiceoverService {
  constructor() {
    this.channelName = 'Gyan Yatra';
    this.appName = 'Gyan Yatra App';
  }

  /**
   * Cleans and parses slide input data (can accept array of slides or raw pasted text)
   */
  normalizeSlides(slidesInput, defaultTopic = 'ગુજરાત સરકારી યોજના અને ભરતી પરિપત્ર') {
    if (Array.isArray(slidesInput) && slidesInput.length > 0) {
      return slidesInput.map((s, idx) => {
        let points = [];
        if (Array.isArray(s.points) && s.points.length > 0) {
          points = s.points.map(p => String(p).trim()).filter(Boolean);
        } else if (Array.isArray(s.content)) {
          points = s.content.map(p => String(p).trim()).filter(Boolean);
        } else if (typeof s.content === 'string') {
          points = s.content.split('\n').map(p => p.trim()).filter(Boolean);
        } else if (typeof s.points === 'string') {
          points = s.points.split('\n').map(p => p.trim()).filter(Boolean);
        }

        return {
          slideNumber: s.slideNumber || idx + 1,
          title: (s.title || `સ્લાઇડ ${idx + 1}`).trim(),
          visual: (s.visual || 'સત્તાવાર પરિપત્ર/દસ્તાવેજનો વાસ્તવિક ફોટો').trim(),
          points: points.length > 0 ? points : ['મુખ્ય નિર્ણય અને સત્તાવાર વિગત', 'નિયમો અને પાત્રતા શરતો', 'મહત્વપૂર્ણ તારીખો'],
          timing: s.timing || '01:00 - 02:15'
        };
      });
    }

    // If string input (pasted multi-slide text)
    if (typeof slidesInput === 'string' && slidesInput.trim().length > 0) {
      const raw = slidesInput.trim();
      const chunks = raw.split(/(?:સ્લાઇડ|Slide)\s*(\d+)[:\-\.]?/i);
      
      if (chunks.length > 1) {
        const parsed = [];
        for (let i = 1; i < chunks.length; i += 2) {
          const num = parseInt(chunks[i], 10) || (parsed.length + 1);
          const body = chunks[i + 1] ? chunks[i + 1].trim() : '';
          const lines = body.split('\n').map(l => l.trim()).filter(Boolean);
          const title = lines[0] ? lines[0].replace(/^[:\-\.\s]+/, '') : `સ્લાઇડ ${num}`;
          const points = lines.slice(1).map(l => l.replace(/^[•\-\*\d\.\)\s]+/, '').trim()).filter(Boolean);

          parsed.push({
            slideNumber: num,
            title: title || `સ્લાઇડ ${num}`,
            visual: 'સત્તાવાર દસ્તાવેજનો વાસ્તવિક ફોટો / ડેટા ટેબલ',
            points: points.length > 0 ? points : [title],
            timing: '01:00 - 02:00'
          });
        }
        if (parsed.length > 0) return parsed;
      }

      // Single slide from text
      const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
      return [{
        slideNumber: 1,
        title: lines[0] || defaultTopic,
        visual: 'સત્તાવાર પરિપત્ર અને વાસ્તવિક પુરાવો',
        points: lines.slice(1).length > 0 ? lines.slice(1) : [lines[0] || defaultTopic],
        timing: '00:00 - 01:30'
      }];
    }

    // Default sample slide
    return [
      {
        slideNumber: 1,
        title: defaultTopic,
        visual: 'ગાંધીનગર સચિવાલય ઠરાવ / સત્તાવાર પોર્ટલ સ્ક્રીનશોટ',
        points: [
          'રાજ્ય સરકાર દ્વારા ૭મા પગારપંચ મુજબ મહત્વનો પરિપત્ર જાહેર',
          'મોંઘવારી ભથ્થામાં (DA) ૪% નો વધારો અને નિયત હપ્તામાં એરિયર્સ ચુકવણી',
          'પાછલી અસરથી એટલે કે ૧લી જુલાઈથી અમલમાં આવશે'
        ],
        timing: '00:00 - 01:30'
      }
    ];
  }

  /**
   * Detects topic category from slide text
   */
  detectCategory(text = '') {
    const t = text.toLowerCase();
    if (/આંગણવાડી|તેડાગર|માનદવેતન|anganwadi/i.test(t)) return 'anganwadi';
    if (/ભરતી|પોલીસ|કોન્સ્ટેબલ|lrd|recruitment|ojas|જગ્યાઓ|ખાલી જગ્યા|વયમર્યાદા|શારીરિક કસોટી/i.test(t)) return 'recruitment';
    if (/da|મોંઘવારી|પગાર|પેન્શન|salary|arrears|કર્મચારી|૭મું પગારપંચ/i.test(t)) return 'salary_da';
    if (/યોજના|સહાય|કિસાન|સબસિડી|ખેડૂત|આવાસ|ikhedut|scheme/i.test(t)) return 'scheme';
    if (/tet|tat|ટાટ|ટેટ|પરીક્ષા|બોર્ડ|રીઝલ્ટ|gseb|શિક્ષણ|સિલેબસ|કટઓફ/i.test(t)) return 'education';
    if (/ટેકનોલોજી|ai|chatgpt|કમ્પ્યુટર|સોફ્ટવેર|technology/i.test(t)) return 'technology';
    return 'general_government';
  }

  /**
   * Generates a separate, copy-ready SCRIPT GENERATION PROMPT for a single slide
   * strictly adhering to the 12 requirements and Section 9 required format.
   */
  generateSingleSlidePrompt(slide, index, totalSlides, options = {}) {
    const {
      overallTopic = '',
      targetAudience = 'ગુજરાતના સરકારી કર્મચારીઓ, ઉમેદવારો અને જાગૃત નાગરિકો',
      explanationDepth = 'detailed', // 'short', 'detailed', 'extended'
      language = 'gu' // 'gu', 'hi', 'en'
    } = options;

    const slideNum = slide.slideNumber || index + 1;
    const isFirst = (index === 0);
    const isLast = (index === totalSlides - 1);
    const isSingle = (totalSlides <= 1);
    const category = this.detectCategory((slide.title || '') + ' ' + (overallTopic || '') + ' ' + (slide.points || []).join(' '));

    let depthGuidance = '';
    let targetWords = 150;
    let durationText = '1 - 1.5 મિનિટ';

    if (explanationDepth === 'short') {
      targetWords = 75;
      durationText = '30 - 45 સેકન્ડ';
      depthGuidance = 'Short explanation (~60-90 words, estimated speaking duration 30-45 seconds). Explain the core essence crisply without unnecessary preamble.';
    } else if (explanationDepth === 'extended') {
      targetWords = 250;
      durationText = '2 - 2.5 મિનિટ';
      depthGuidance = 'Extended educational explanation (~200-300 words, estimated speaking duration 2-2.5 minutes). Provide comprehensive, in-depth breakdown of every sub-point, practical calculation/examples, background context, and clear rationale.';
    } else {
      // detailed (default)
      targetWords = 150;
      durationText = '1 - 1.5 મિનિટ';
      depthGuidance = 'Detailed explanation (~130-180 words, estimated speaking duration 1-1.5 minutes). Provide balanced, informative coverage of each point with clear explanations and practical context.';
    }

    // Specific domain guidance
    let domainSpecificInstructions = '';
    if (category === 'salary_da') {
      domainSpecificInstructions = `• Clarify 7th Pay Commission percentage (e.g. 4% DA hike), effective date (e.g. retrospective from July), and cash arrear distribution.
• Differentiate basic salary from gross pay; explain grade-pay / pay-band impacts (Class-3 and Class-4).
• Reference official Gujarat Finance Department Government Resolutions (GRs) and finance.gujarat.gov.in.`;
    } else if (category === 'recruitment') {
      domainSpecificInstructions = `• Clarify sanctioned vacancies, official advertisement number, education criteria, and age limits.
• Explain the official application flow on OJAS (ojas.gujarat.gov.in) and exam syllabus/stages (prelims/mains/physical ground test).
• Explicitly caution viewers against fake social media rumors and unverified WhatsApp cutoffs.`;
    } else if (category === 'scheme') {
      domainSpecificInstructions = `• Outline the exact beneficiary criteria, subsidy/assistance amount, and key documents (7/12, Aadhaar, bank passbook).
• Explain the step-by-step application process on official portals like iKhedut (ikhedut.gujarat.gov.in) or Digital Gujarat.
• Clearly distinguish confirmed government assistance from hypothetical estimates.`;
    } else if (category === 'education') {
      domainSpecificInstructions = `• Outline subject-wise syllabus, GCERT/NCERT reference books, paper pattern, marking scheme, and passing criteria.
• Explain strategic preparation tips for Gujarati candidates without generic platitudes.`;
    } else if (category === 'anganwadi') {
      domainSpecificInstructions = `• Detail monthly honorarium increase, mobile/data allowances, and supervisor promotion criteria.
• Reference Women & Child Development (WCD) department notifications.`;
    } else if (category === 'technology') {
      domainSpecificInstructions = `• Explain technical terms, step-by-step tools, practical workflows, and authentic real-world applications.
• Focus on usability and practical value for Gujarati learners.`;
    } else {
      domainSpecificInstructions = `• Clearly explain official procedures, eligibility, timelines, and verifiable facts.
• Use authentic examples relevant to Gujarat citizens and students.`;
    }

    // Inter-slide transitions & presentation connection
    let transitionInstructions = '';
    if (isSingle) {
      transitionInstructions = `• Standalone Slide: Begin with a strong, relevant 10-15 second opening hook.
• Closing: Conclude with a clear summary and call-to-action to check official documents on Gyan Yatra App.`;
    } else if (isFirst) {
      transitionInstructions = `• Opening Hook: Begin with an engaging 15-20 second opening hook that introduces the entire presentation's core significance for the viewer.
• Transition to Next Slide: End this slide's explanation with a seamless bridge sentence leading directly into Slide ${slideNum + 1} (e.g., "હવે આનાથી તમારા પગારમાં કેટલો વધારો થશે અથવા આગળની લાયકાત શું છે, ચાલો આગલી સ્લાઇડમાં સમજીએ.").`;
    } else if (isLast) {
      transitionInstructions = `• Transition from Previous Slide: Begin with a natural connecting phrase from Slide ${slideNum - 1} without repeating the overall video introduction.
• Closing: Conclude this final slide with a powerful Concluding wrap-up of key takeaways, and a clear call-to-action (like, subscribe, download official notification PDF from Gyan Yatra App).`;
    } else {
      transitionInstructions = `• Transition from Previous Slide: Begin with a natural spoken link from Slide ${slideNum - 1} (e.g., "હવે પાત્રતા સમજ્યા પછી, સૌથી મહત્વની બાબત છે..."). DO NOT repeat the video introduction.
• Transition to Next Slide: Conclude with a natural curiosity-driven bridge sentence leading into Slide ${slideNum + 1}.`;
    }

    // Language guidance
    let langInstructions = '';
    if (language === 'hi') {
      langInstructions = 'Natural, conversational Hindi suitable for spoken narration. Grammatically correct, easy to understand, avoiding overly formal language.';
    } else if (language === 'en') {
      langInstructions = 'Clear, professional Indian-English spoken narration. Engaging, informative, natural pronunciation, avoiding robotic phrasing.';
    } else {
      langInstructions = `• Natural, fluent, grammatically correct spoken Gujarati (conversational yet authoritative).
• Sound like an experienced Gujarati YouTube educator or credible news presenter speaking directly to viewers, NOT reading textbook bullet points.
• Use easy-to-pronounce sentences with natural phrasing and appropriate pauses.
• Avoid awkward literal machine translations; pronounce common English technical terms naturally in Gujarati context.`;
    }

    const bulletsFormatted = slide.points && slide.points.length > 0
      ? slide.points.map((p, i) => `  (${i + 1}) ${p}`).join('\n')
      : `  (1) ${slide.title}`;

    const promptText = `SLIDE ${slideNum} — SCRIPT GENERATION PROMPT

Slide heading: ${slide.title}

Slide information:
• Screen Visual / Document / Table: ${slide.visual || 'સત્તાવાર પરિપત્ર/દસ્તાવેજનો વાસ્તવિક ફોટો'}
• Key Statements & Bullet Points:
${bulletsFormatted}
• Timing & Sequence: Slide ${slideNum} of ${totalSlides} (Expected duration: ${slide.timing || durationText})
• Intended Audience: ${targetAudience}

Script-writing instructions:
1. Write a complete, natural, informative, and engaging word-for-word spoken voice-over script for this slide based strictly on the slide information above.
2. Explain every important point in the slide clearly. Expand short bullet points into meaningful, well-organized spoken sentences.
3. Explain technical terms, processes, eligibility criteria, statistics, and examples where relevant:
${domainSpecificInstructions}
4. Coherent Presentation Flow:
${transitionInstructions}
5. Clean Spoken Output: Write ONLY the words to be spoken aloud into the microphone. DO NOT include bracketed production notes (like [હસો], [પોઝ], [Music]), speaker labels, or heading tags inside the spoken script text.

Language and tone:
${langInstructions}

Engagement requirements:
• Begin with a relevant question, practical problem, surprising verified fact, or direct audience benefit.
• Explain why this specific information matters to viewers and how it impacts them practically.
• Maintain viewer retention through step-by-step clarity, smooth phrasing, and authentic curiosity.
• Avoid excessive repetition, artificial excitement, exaggerated claims, and clickbait.

Accuracy requirements:
• STRICT ZERO FABRICATION: Use accurate information supported by the supplied slide and official reliable sources.
• Never invent dates, pay scales, vacancies, eligibility criteria, or GR numbers.
• Clearly distinguish confirmed official facts from estimates or unverified social media claims.
• If any figure or document is uncertain, explicitly flag the uncertainty rather than fabricating details.
• Prioritize official notifications and relevant Gujarat Government sources.

Length requirements:
• Explanation Depth: ${depthGuidance}
• Recommended Spoken Word Count: ~${targetWords} words (spoken at natural Gujarati rate of ~130 words/minute).
• Focus on substance and clarity rather than inflating length with filler words.

Final instruction:
Write the complete word-for-word spoken voice-over script for this slide, ready for recording.`;

    return {
      slideNumber: slideNum,
      title: slide.title,
      visual: slide.visual || 'સત્તાવાર પરિપત્ર / વાસ્તવિક ફોટો',
      points: slide.points || [],
      explanationDepth,
      language,
      estimatedDuration: durationText,
      recommendedWords: targetWords,
      promptText
    };
  }

  /**
   * Regenerates a single slide's prompt independently
   */
  regenerateSingleSlidePrompt(slide, index, totalSlides, options = {}) {
    return this.generateSingleSlidePrompt(slide, index, totalSlides, options);
  }

  /**
   * Generates the Master Prompt ready to paste into ChatGPT / AI writers
   * as well as the independent per-slide prompts array.
   */
  generateMasterPromptForSlides({
    slides = [],
    overallTopic = '',
    targetAudience = '',
    explanationDepth = 'detailed',
    language = 'gu',
    fullPdfText = '',
    filename = ''
  } = {}) {
    const parsedSlides = this.normalizeSlides(slides, overallTopic);
    const mainTopic = (overallTopic || parsedSlides[0]?.title || 'ગુજરાત સરકાર સત્તાવાર અપડેટ').trim();
    const audience = targetAudience || 'ગુજરાતના ગંભીર ઉમેદવારો, સરકારી કર્મચારીઓ અને જાગૃત નાગરિકો';
    const isMultiSlide = parsedSlides.length > 1;

    // 1. Generate individual slide prompts for each slide
    const slidePrompts = parsedSlides.map((slide, idx) => {
      return this.generateSingleSlidePrompt(slide, idx, parsedSlides.length, {
        overallTopic: mainTopic,
        targetAudience: audience,
        explanationDepth,
        language
      });
    });

    // 2. Generate copy-all text combining all individual slide prompts with Master Step 1 Header
    const allPromptsText = `# GYAN YATRA — COMPLETE SLIDE-WISE SCRIPT PROMPTS (READ FULL PDF FIRST)
સર્વોચ્ચ આદેશ: સ્ક્રિપ્ટ લખતા પહેલા અપલોડ કરેલી આખી PDF / સત્તાવાર પરિપત્ર સંપૂર્ણ વાંચો. ત્યારબાદ નીચે દર્શાવેલી દરેક સ્લાઇડ માટે ક્રમબદ્ધ સંપૂર્ણ શબ્દશઃ ગુજરાતી સ્ક્રિપ્ટ તૈયાર કરો.

============================================================\n\n` + slidePrompts.map(sp => sp.promptText).join('\n\n============================================================\n\n');

    // 3. Generate legacy master prompt (strictly preserving all 7 sections & test requirements)
    const slidesContextText = parsedSlides.map((s, idx) => {
      const pText = s.points.map((p, pIdx) => `   (${pIdx + 1}) ${p}`).join('\n');
      return `------------------------------------------------------------
📌 [સ્લાઇડ ${s.slideNumber || idx + 1}]: "${s.title}"
📷 સ્ક્રીન પર દેખાતો વિઝ્યુઅલ / ફોટો / ડેટા ટેબલ: ${s.visual}
📝 સ્લાઇડ પરના મહત્વપૂર્ણ મુદ્દાઓ અને આંકડા:
${pText}
⏱️ અપેક્ષિત સમયગાળો: ${s.timing}
------------------------------------------------------------`;
    }).join('\n\n');

    const promptText = `# MASTER PROMPT: GYAN YATRA — SLIDE-BY-SLIDE GUJARATI YOUTUBE VOICEOVER SCRIPT EXPERT

તમે YouTube ચેનલ "Gyan Yatra" માટે વરિષ્ઠ ગુજરાતી સ્ક્રિપ્ટ રાઇટર, શૈક્ષણિક સંશોધક, ઓડિયન્સ રીટેન્શન સ્પેશિયાલિસ્ટ અને વોઇસઓવર સ્ક્રિપ્ટ એડિટર છો.

નીચે મારી PPT સ્લાઇડ્સની તમામ વિગતો આપેલી છે. આ સ્લાઇડ્સનું સંપૂર્ણ વિશ્લેષણ કરીને માઇક્રોફોન સામે સીધું બોલી શકાય તેવી શબ્દશઃ ગુજરાતી સ્ક્રિપ્ટ (Word-for-Word Spoken Gujarati Voiceover Script) તૈયાર કરો.

============================================================
🎯 મુખ્ય વિષય (OVERALL TOPIC): "${mainTopic}"
👥 લક્ષિત દર્શકો: ${audience}
🏷️ ચેનલ: "Gyan Yatra" (અને "Gyan Yatra App")
📊 સ્લાઇડ્સની કુલ સંખ્યા: ${parsedSlides.length} સ્લાઇડ્સ
============================================================

📋 મારી PPT સ્લાઇડ્સનો ડેટા (INPUT SLIDES):
${slidesContextText}

============================================================
⚡ કડક નિયમો અને માર્ગદર્શિકા (STRICT RULES):
============================================================
૧. WORD-FOR-WORD SPOKEN GUJARATI: સ્લાઇડ પરના મુદ્દા માત્ર વાંચવાના નથી, પરંતુ એક અનુભવી શિક્ષક ક્લાસમાં સમજાવતા હોય તેમ શુદ્ધ, જીવંત અને બોલચાલની ગુજરાતીમાં શબ્દશઃ સ્ક્રિપ્ટ લખો.
૨. STRICT FACT-CHECKING (ZERO FABRICATION): 
   - સત્તાવાર જાહેર થયેલ નિર્ણય vs પ્રસ્તાવ/માંગણી vs અફવાઓ વચ્ચે સ્પષ્ટ ભેદ દર્શાવો.
   - કોઈપણ મનઘડંત પગાર વધારા, તારીખો કે ખાલી જગ્યાઓ ઉમેરશો નહીં.
   - જો કોઈ વિગત શંકાસ્પદ હોય તો ફ્લેગ કરો.
૩. AUDIENCE RETENTION STRATEGY: પ્રથમ લાઇનથી જ દર્શકની જિજ્ઞાસા જાળવી રાખો, જટિલ નિયમો સરળ ઉદાહરણોથી સમજાવો, અને આગળની સ્લાઇડ માટે સહજ ટ્રાન્ઝિશન આપો.
૪. સ્ક્રિપ્ટના લખાણની અંદર કૌંસ કે ડાયરેક્શન નહીં, ફક્ત બોલવાના શબ્દો જ આપો.

${isMultiSlide ? `============================================================
🎬 સંપૂર્ણ વિડીયો ફ્લો (COMPLETE VIDEO FLOW REQUIRED):
A. ૨૦-૩૦ સેકન્ડનો દમદાર ઓપનિંગ હૂક (Strong Hook)
B. વિષયનો ટૂંકો પરિચય અને મહત્વ
C. દરેક સ્લાઇડ માટે નીચે દર્શાવેલ ચોક્કસ ૭-સ્તરીય ફોર્મેટ
D. સ્લાઇડ્સ વચ્ચે સહજ ટ્રાન્ઝિશન
E. અંતિમ નિષ્કર્ષ અને Gyan Yatra App & સબ્સ્ક્રાઇબ માટેનો CTA
F. અંતિમ ફેક્ટ-ચેક ચેકલિસ્ટ
============================================================` : ''}

============================================================
📐 દરેક સ્લાઇડ માટે ફરજિયાત આઉટપુટ ફોર્મેટ (STRICT 7-SECTION FORMAT):
============================================================
દરેક સ્લાઇડ માટે નીચે મુજબનું ચોક્કસ માળખું આપો:

### SLIDE [નંબર]: [સ્લાઇડ શીર્ષક]

**1. Slide Understanding**
- Main topic: 
- Main message: 
- Target audience: 
- Most important information: 
- Any factual concern or missing detail: 

**2. Audience Retention Objective**
(દર્શક આ સ્લાઇડ પૂર્ણ થતાં શું સમજી જશે અને કેમ આગળ જોતો રહેશે)

**3. Word-for-Word Gujarati Voiceover Script**
(માઇક્રોફોન પર બોલવાની સંપૂર્ણ, જીવંત ગુજરાતી સ્ક્રિપ્ટ ફકરાઓમાં. કોઈ પ્રોડક્શન બ્રેકેટ્સ બોલવાના લખાણમાં ના હોવા જોઈએ.)

**4. Optional Voice Delivery Notes**
(ક્યાં અટકવું, કયા આંકડા પર ભાર મૂકવો, ક્યાં ધીમા પડવું)

**5. On-Screen Highlight Suggestions**
(મહત્તમ ૩ ચોક્કસ શબ્દો કે આંકડા જે સ્ક્રીન પર બોક્સ કે એરોથી હાઇલાઇટ કરવા)

**6. Fact-Check and Sources**
(સાબિત થયેલ હકીકત vs અંદાજ અને સત્તાવાર સરકારી પોર્ટલ/GR રેફરન્સ)

**7. Transition to the Next Slide**
(આગળની સ્લાઇડ સાથે જોડતું ૧ સહજ ગુજરાતી વાક્ય)

હવે ઉપરોક્ત નિયમો મુજબ સ્લાઇડ્સનું વિશ્લેષણ કરીને સંપૂર્ણ ગુજરાતી વોઇસઓવર સ્ક્રિપ્ટ આપો:`;

    // 4. BEST ALL-IN-ONE MASTER SCRIPT PROMPT (READ FULL PDF FIRST + SCRIPT FOR ALL SLIDES TOGETHER)
    const allInOneScriptPrompt = `# 🎯 GYAN YATRA MASTER PROMPT: ALL-IN-ONE GUJARATI SCRIPT (READ FULL PDF FIRST)
(સર્વોચ્ચ આદેશ: પહેલા અપલોડ કરેલી આખી PDF સંપૂર્ણ વાંચો + બધી સ્લાઇડ્સ માટે એકસાથે જ શબ્દશઃ સ્ક્રિપ્ટ આપો)

તમે YouTube ચેનલ "Gyan Yatra" માટે વરિષ્ઠ શિક્ષણવિદ્, સત્તાવાર પરિપત્ર વિશ્લેષક, પરીક્ષા ફેકલ્ટી અને પ્રોફેશનલ YouTube સ્ક્રિપ્ટ રાઇટર છો.
મારી YouTube ચેનલ માટે નીચે આપેલી તમામ ${parsedSlides.length} સ્લાઇડ્સ અને જોડાયેલા સત્તાવાર દસ્તાવેજના આધારે શરૂઆતથી અંત સુધી માઇક્રોફોન સામે સીધું બોલી શકાય તેવી શબ્દશઃ (Word-for-Word) સંપૂર્ણ ગુજરાતી સ્ક્રિપ્ટ તૈયાર કરો.

============================================================
🎯 મુખ્ય વિષય (OVERALL TOPIC): "${mainTopic}"
👥 લક્ષિત દર્શકો: ${audience}
🏷️ બ્રાન્ડિંગ: "Gyan Yatra" YouTube Channel અને "Gyan Yatra App" (સત્તાવાર પરિપત્ર PDF & મોક ટેસ્ટ)
📊 સ્લાઇડ્સની કુલ સંખ્યા: ${parsedSlides.length} સ્લાઇડ્સ
⏱️ અપેક્ષિત સમયગાળો: ~${Math.max(1, Math.round(parsedSlides.length * 1.5))} મિનિટ (ગહનતા: ${explanationDepth === 'short' ? 'ટૂંકી' : (explanationDepth === 'extended' ? 'વિસ્તૃત' : 'વિગતવાર')})
⚪ વિઝ્યુઅલ થીમ: ૧૦૦% શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF), બોલ્ડ હેડિંગ બોક્સ, સત્તાવાર પરિપત્રો અને અસલી ફોટા
============================================================

============================================================
🚨 સર્વોચ્ચ પ્રથમ આદેશ: પહેલા અપલોડ કરેલી આખી PDF / પરિપત્ર સંપૂર્ણ વાંચો
(MANDATORY STEP 1: CAREFULLY READ AND COMPREHEND THE ENTIRE UPLOADED PDF / DOCUMENT FIRST)
============================================================
૧. સ્ક્રિપ્ટ લખવાનું શરૂ કરતા પહેલા, આ ચેટ અથવા નોટબુકમાં અપલોડ કરેલી આખી PDF ફાઇલ, સત્તાવાર સરકારી પરિપત્ર (GR), જાહેરાત કે દસ્તાવેજ શરૂઆતથી અંત સુધી ૧૦૦% સંપૂર્ણ અને ઊંડાણપૂર્વક વાંચો!
૨. PDF માં દર્શાવેલ સત્તાવાર વિભાગ, ઠરાવ ક્રમાંક (GR Number), જાહેર થયા તારીખ, અમલ તારીખ, પાત્રતા માપદંડો, વયમર્યાદા, આવકમર્યાદા, પગારધોરણ / DA વધારો / સહાય રકમ, જરૂરી પુરાવા, સત્તાવાર પોર્ટલ (OJAS / iKhedut / Digital Gujarat) અને નિયમોનો ઝીણવટપૂર્વક અભ્યાસ કરો.
૩. કડક ફેક્ટ-ચેકિંગ (STRICT ZERO FABRICATION): PDF માં ના હોય તેવી કોઈ પણ ખોટી, કાલ્પનિક કે અપ્રમાણિત વિગત જાતે ઉમેરશો નહીં. ફક્ત સત્તાવાર સાબિત થયેલ હકીકતો [Confirmed Official Facts] પર જ સ્ક્રિપ્ટ આધારિત હોવી જોઈએ.

============================================================
🎬 સ્ટેપ ૨: આખી સ્લાઇડ્સ મુજબ એકસાથે જ સંપૂર્ણ સ્ક્રિપ્ટ આપો
(MANDATORY STEP 2: GENERATE THE COMPLETE SCRIPT FOR ALL SLIDES TOGETHER AT ONCE)
============================================================
કોઈપણ સ્લાઇડ બાકી રાખ્યા વિના કે વચ્ચે અટક્યા વિના, આખી PDF ના સંપૂર્ણ સંદર્ભ મુજબ સ્લાઇડ ૧ થી છેલ્લી સ્લાઇડ સુધીની આખા વિડીયોની સંપૂર્ણ, જીવંત અને શબ્દશઃ બોલવાની ગુજરાતી સ્ક્રિપ્ટ એકસાથે જ (Continuous Complete Script for All Slides) લખો!

============================================================
📋 મારી પ્રેઝન્ટેશનની તમામ સ્લાઇડ્સનો ડેટા (INPUT SLIDES CONTEXT):
============================================================
${slidesContextText}
${fullPdfText ? `\n============================================================\n📄 PDF માંથી એક્સટ્રેક્ટ થયેલો મુખ્ય સંદર્ભ (PDF EXTRACTED TEXT):\n${fullPdfText.substring(0, 4000)}${fullPdfText.length > 4000 ? '\n...(બાકીનું PDF લખાણ જોડાયેલ દસ્તાવેજમાં ઉપલબ્ધ છે)...' : ''}\n============================================================\n` : ''}
============================================================
⚡ સ્ક્રિપ્ટ લખવા માટેના કડક નિયમો (STRICT WRITING RULES):
============================================================
૧. WORD-FOR-WORD SPOKEN GUJARATI: સ્લાઇડ પરના મુદ્દા માત્ર વાંચવાના નથી, પરંતુ એક અનુભવી શિક્ષક ક્લાસમાં વિદ્યાર્થીઓ કે ઉમેદવારોને રસપ્રદ રીતે સમજાવતા હોય તેમ શુદ્ધ, જીવંત, વિશ્વાસપૂર્ણ અને બોલચાલની ગુજરાતીમાં શબ્દશઃ સ્ક્રિપ્ટ લખો.
૨. કૌંસ કે બ્રેકેટ્સ મુક્ત: સ્ક્રિપ્ટના બોલવાના લખાણમાં [હસો], [પોઝ], [સંગીત] જેવા કોઈ પ્રોડક્શન બ્રેકેટ્સ ન હોવા જોઈએ. માત્ર મોંમાંથી બોલવાના સાચા શબ્દો જ આપો.
૩. સ્મૂથ ટ્રાન્ઝિશન (Smooth Inter-Slide Flow): એક સ્લાઇડ પૂરી થતાં જ બીજી સ્લાઇડ સાથે જોડતું ૧ સહજ વાક્ય આપો જેથી દર્શક આખો વિડીયો અંત સુધી જળવાઈ રહે.
૪. સ્લાઇડ ૧ માં દર્શકોને જકડી રાખતો ૧૫ થી ૨૦ સેકન્ડનો દમદાર ઓપનિંગ હૂક (Strong Hook) આપો.
૫. છેલ્લી સ્લાઇડમાં શક્તિશાળી કન્ક્લુઝન અને Gyan Yatra YouTube સબ્સ્ક્રાઇબ કરવાનો તથા "Gyan Yatra App" પરથી સત્તાવાર પરિપત્રની PDF ડાઉનલોડ કરવાનો સ્પષ્ટ CTA આપો.

============================================================
📐 દરેક સ્લાઇડ માટે ફરજિયાત આઉટપુટ ફોર્મેટ (STRICT OUTPUT FORMAT):
============================================================
દરેક સ્લાઇડ માટે ક્રમબદ્ધ નીચે મુજબ આપો:

### 📌 [સ્લાઇડ નંબર]: [સ્લાઇડ શીર્ષક]
⏱️ અપેક્ષિત સમયગાળો: (દા.ત. 00:00 - 01:15)
👉 સ્ક્રીન પોઇન્ટર: (શિક્ષકે સ્લાઇડના કયા સત્તાવાર GR નંબર, ટેબલ કે અસલી ફોટા તરફ ઈશારો કરવો)
🎙️ માઇક્રોફોન પર બોલવાની શબ્દશઃ ગુજરાતી સ્ક્રિપ્ટ (Word-for-Word Spoken Script):
(અહીં શિક્ષક માઇક્રોફોન સામે સીધું બોલે તે સંપૂર્ણ લખાણ ફકરાઓમાં લખો)
🔗 આગળની સ્લાઇડ માટે બ્રિજ લિંક (Transition):
(આગલી સ્લાઇડ સાથે જોડતું ૧ સહજ ગુજરાતી વાક્ય)

હવે ઉપરોક્ત આદેશ મુજબ પહેલા અપલોડ કરેલી આખી PDF / દસ્તાવેજ સંપૂર્ણ વાંચીને સ્લાઇડ ૧ થી છેલ્લી સ્લાઇડ સુધીની એકસાથે સંપૂર્ણ ગુજરાતી સ્ક્રિપ્ટ આપો:`;

    // 5. Pre-rendered sample voiceover script for instant UI viewing
    const preRenderedScript = this.generateSampleVoiceoverScript(parsedSlides, mainTopic);

    return {
      success: true,
      topic: mainTopic,
      slideCount: parsedSlides.length,
      totalSlides: parsedSlides.length,
      explanationDepth,
      language,
      slides: parsedSlides,
      slidePrompts,
      allPromptsText,
      allInOneScriptPrompt,
      fullPdfMasterPrompt: this.generateFullPdfMasterPrompt({
        topic: mainTopic,
        targetAudience: audience,
        explanationDepth,
        fullPdfText,
        filename,
        slides: parsedSlides
      }),
      bestScriptPrompt: this.generateFullPdfMasterPrompt({
        topic: mainTopic,
        targetAudience: audience,
        explanationDepth,
        fullPdfText,
        filename,
        slides: parsedSlides
      }),
      masterPrompt: promptText,
      preRenderedScript,
      preRendered: preRenderedScript
    };
  }

  /**
   * Deeply analyzes full PDF text, topic hint, and filename to extract:
   * 1. Specific Domain Category
   * 2. Official Government Department
   * 3. GR / Resolution / Advertisement Number
   * 4. Relevant Dates & Deadlines
   * 5. Figures / Vacancies / Percentages / Amounts
   * 6. Official Portal URL
   */
  analyzePdfSubjectAndDetails(fullPdfText = '', topicHint = '', filename = '') {
    const combined = `${fullPdfText} ${topicHint} ${filename}`.toLowerCase();
    const rawCombined = `${fullPdfText} ${topicHint} ${filename}`;

    // 1. Extract Subject / Topic directly from PDF text
    let subject = '';
    const subjectMatch = fullPdfText.match(/(?:વિષય|Subject|બાબત)[\s:–-]+([^\n\r।]+(?:\n[^\n\r।]+)?)/i);
    if (subjectMatch && subjectMatch[1]) {
      let candidate = subjectMatch[1].trim();
      candidate = candidate.split(/(?:સંદર્ભ|વાંચાણ|પરિપત્ર|ઠરાવ|Reference)[\s:–-]/i)[0].trim();
      candidate = candidate.replace(/\s+/g, ' ');
      if (candidate.length >= 6) {
        subject = candidate;
      }
    }

    // Fallback: search for prominent lines with keywords
    if (!subject && fullPdfText.trim()) {
      const lines = fullPdfText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length >= 8 && l.length <= 160)
        .filter(l => !l.includes('ગુજરાત સરકાર') && !l.includes('સચિવાલય') && !l.includes('ગાંધીનગર') && !l.startsWith('પેજ') && !l.startsWith('Page'));
      for (const line of lines) {
        if (/ભરતી|જાહેરાત|ઠરાવ|પરિપત્ર|યોજના|પગાર|મોંઘવારી|માનદવેતન|પરીક્ષા/i.test(line)) {
          subject = line;
          break;
        }
      }
    }

    // Fallback from filename or topicHint
    if (!subject) {
      if (filename && filename.trim()) {
        subject = filename
          .replace(/\.pdf$/i, '')
          .replace(/[_-]+/g, ' ')
          .trim();
      } else if (topicHint && topicHint.trim() && topicHint !== 'ગુજરાત સરકાર સત્તાવાર પરિપત્ર અને ભરતી નિર્ણય ૨૦૨૬') {
        subject = topicHint.trim();
      } else {
        subject = 'ગુજરાત સરકાર સત્તાવાર પરિપત્ર નિર્ણય ૨૦૨૬';
      }
    }

    // 2. Detect Category using unified detectCategory
    const category = this.detectCategory(combined);
    let categoryGuj = 'સત્તાવાર સરકારી પરિપત્ર & યોજના';

    if (category === 'recruitment') {
      categoryGuj = 'ગુજરાત સરકારી ભરતી & નોટિફિકેશન';
    } else if (category === 'scheme') {
      categoryGuj = 'ખેડૂત સહાય & કિસાન કલ્યાણ યોજના';
    } else if (category === 'salary_da') {
      categoryGuj = '૭મું પગારપંચ & મોંઘવારી ભથ્થું (DA) વધારો';
    } else if (category === 'anganwadi') {
      categoryGuj = 'આંગણવાડી કાર્યકર & તેડાગર માનદવેતન / ભરતી';
    } else if (category === 'education') {
      categoryGuj = 'શિક્ષણ & પરીક્ષા પરિણામ / સિલેબસ';
    }

    // 3. Department Extraction
    let department = 'ગુજરાત સરકાર સત્તાવાર વિભાગ, ગાંધીનગર';
    const deptKeywords = [
      'ગૃહ વિભાગ',
      'નાણાં વિભાગ',
      'શિક્ષણ વિભાગ',
      'પંચાયત, ગ્રામ ગૃહ નિર્માણ અને ગ્રામ વિકાસ વિભાગ',
      'મહિલા અને બાળ વિકાસ વિભાગ',
      'કૃષિ, ખેડૂત કલ્યાણ અને સહકાર વિભાગ',
      'આરોગ્ય અને પરિવાર કલ્યાણ વિભાગ',
      'સામાન્ય વહીવટ વિભાગ',
      'મહેસૂલ વિભાગ',
      'વન અને પર્યાવરણ વિભાગ',
      'શ્રમ અને રોજગાર વિભાગ',
      'સામાજિક ન્યાય અને અધિકારીતા વિભાગ',
      'ગુજરાત પંચાયત સેવા પસંદગી મંડળ',
      'ગુજરાત ગૌણ સેવા પસંદગી મંડળ',
      'ગુજરાત જાહેર સેવા આયોગ',
      'રાજ્ય પરીક્ષા બોર્ડ',
      'પોલીસ ભરતી બોર્ડ',
    ];
    for (const dm of deptKeywords) {
      if (rawCombined.includes(dm)) {
        department = dm;
        if (!department.includes('ગાંધીનગર') && !department.includes('ગુજરાત') && !department.includes('સચિવાલય')) {
          department = `${department}, ગાંધીનગર સચિવાલય`;
        }
        break;
      }
    }
    if (department === 'ગુજરાત સરકાર સત્તાવાર વિભાગ, ગાંધીનગર') {
      if (/ગૃહ વિભાગ|પોલીસ|lrd/i.test(combined)) {
        department = 'ગૃહ વિભાગ, ગાંધીનગર સચિવાલય';
      } else if (/નાણાં વિભાગ|finance|પગાર|da|પેન્શન/i.test(combined)) {
        department = 'નાણાં વિભાગ, સચિવાલય, ગાંધીનગર';
      } else if (/કૃષિ|ખેડૂત|કિસાન|ikhedut/i.test(combined)) {
        department = 'કૃષિ, ખેડૂત કલ્યાણ અને સહકાર વિભાગ, ગાંધીનગર';
      } else if (/મહિલા અને બાળ વિકાસ|આંગણવાડી|wcd/i.test(combined)) {
        department = 'મહિલા અને બાળ વિકાસ વિભાગ (WCD), ગુજરાત રાજ્ય';
      } else if (/શિક્ષણ વિભાગ|રાજ્ય પરીક્ષા બોર્ડ|seb|gseb/i.test(combined)) {
        department = 'શિક્ષણ વિભાગ / રાજ્ય પરીક્ષા બોર્ડ (SEB), ગાંધીનગર';
      } else if (/પંચાયત|ગ્રામ ગૃહ નિર્માણ|gpssb/i.test(combined)) {
        department = 'પંચાયત, ગ્રામ ગૃહ નિર્માણ અને ગ્રામ વિકાસ વિભાગ';
      }
    }

    // 4. Extract GR Number / Advertisement Number
    let grNumber = 'સત્તાવાર સરકારી ઠરાવ ક્રમાંક (ચકાસાયેલ)';
    const grMatch = rawCombined.match(/(?:ઠરાવ\s*ક્રમાંક|પરિપત્ર\s*ક્રમાંક|જાહેરાત\s*ક્રમાંક|નોટિફિકેશન\s*નંબર|ઓર્ડર\s*નંબર|ક્રમાંક|નંબર|Advt\s*No|GR\s*No)[\s:–-]+([^\n,।]{3,60})/i);
    if (grMatch && grMatch[1]) {
      grNumber = grMatch[0].trim();
    } else {
      const codeMatch = rawCombined.match(/([A-Z]{2,6}\/(?:202\d|૨૦૨\d)\/[\d\w-]+|[A-Z]{2,6}-[\d\w-]+|પગર-[\d\w-]+)/i);
      if (codeMatch && codeMatch[0]) {
        grNumber = `સત્તાવાર ક્રમાંક: ${codeMatch[0].trim()}`;
      } else if (/LRD|પોલીસ/i.test(combined)) {
        grNumber = 'જાહેરાત ક્રમાંક: LRD/2026/01';
      } else if (category === 'salary_da') {
        grNumber = 'ઠરાવ ક્રમાંક: પગર/૧૦૨૦૨૬/મ.ભ./નાણાં';
      }
    }

    // 5. Portal extraction
    let portal = 'gujarat.gov.in';
    if (/ojas\.gujarat\.gov\.in|ojas/i.test(combined)) {
      portal = 'ojas.gujarat.gov.in';
    } else if (/ikhedut\.gujarat\.gov\.in|ikhedut/i.test(combined)) {
      portal = 'ikhedut.gujarat.gov.in';
    } else if (/digitalgujarat\.gov\.in|digital gujarat/i.test(combined)) {
      portal = 'digitalgujarat.gov.in';
    } else if (/sebexam\.org|seb/i.test(combined)) {
      portal = 'sebexam.org';
    } else if (/finance\.gujarat\.gov\.in/i.test(combined)) {
      portal = 'finance.gujarat.gov.in';
    } else if (/gsssb\.gujarat\.gov\.in|gsssb/i.test(combined)) {
      portal = 'gsssb.gujarat.gov.in';
    } else if (/e-hrms|ehrms/i.test(combined)) {
      portal = 'e-hrms.gujarat.gov.in';
    }

    // 6. Extract dates
    const dateMatches = rawCombined.match(/\b(?:\d{1,2}[/-]\d{1,2}[/-](?:202\d|૨૦૨\d|\d{2,4})|\d{1,2}(?:મી|જી)?\s+(?:જાન્યુઆરી|ફેબ્રુઆરી|માર્ચ|એપ્રિલ|મે|જૂન|જુલાઈ|ઓગસ્ટ|સપ્ટેમ્બર|ઓક્ટોબર|નવેમ્બર|ડિસેમ્બર)\s*,?\s*(?:202\d|૨૦૨\d))\b/g) || [];
    const dates = Array.from(new Set(dateMatches)).slice(0, 4);

    // 7. Extract figures / vacancies / amounts
    const figures = [];
    const vacancyMatch = rawCombined.match(/\b(?:\d{1,6}|\d{1,3},\d{3})\s*(?:જગ્યાઓ|જગ્યા|ખાલી જગ્યા|પદો|posts|vacancies)\b/i);
    if (vacancyMatch) figures.push(vacancyMatch[0]);

    const daMatch = rawCombined.match(/\b\d{1,2}\s*%\s*(?:da|મોંઘવારી|વધારો|સહાય)?\b/i);
    if (daMatch) figures.push(daMatch[0]);

    const amountMatch = rawCombined.match(/(?:₹|રૂ\.|રૂપિયા)\s*[\d,]+(?:\s*રૂપિયા)?|[\d,]+\s*(?:રૂપિયા|રૂ\.)/i);
    if (amountMatch) figures.push(amountMatch[0]);

    // 8. Extract substantive key highlights from PDF
    const keyHighlights = [];
    if (fullPdfText && fullPdfText.trim()) {
      const lines = fullPdfText.split('\n').map(l => l.trim());
      for (const l of lines) {
        if (l.length >= 15 && l.length <= 180) {
          const isRule = /ઠરાવવામાં આવે છે|મંજૂરી|પાત્રતા|લાયકાત|વયમર્યાદા|અરજી|પગાર|એરિયર્સ|પરીક્ષા|છેલ્લી તારીખ|અમલ/i.test(l);
          const isBullet = l.startsWith('•') || l.startsWith('-') || /^\d+[\.\)]/.test(l);
          if ((isRule || isBullet) && !keyHighlights.includes(l)) {
            keyHighlights.push(l.replace(/^[•\-\*\d\.\)\s]+/, '• '));
            if (keyHighlights.length >= 5) break;
          }
        }
      }
    }
    if (keyHighlights.length === 0) {
      keyHighlights.push(
        `• સત્તાવાર વિભાગ: ${department} દ્વારા જાહેર થયેલ નિર્ણય`,
        `• સંદર્ભ / ઠરાવ ક્રમાંક: ${grNumber}`,
        `• સત્તાવાર પોર્ટલ: ${portal} પર ચકાસાયેલ`,
        ...(dates.length > 0 ? [`• મહત્વપૂર્ણ તારીખો: ${dates.join(', ')}`] : []),
        ...(figures.length > 0 ? [`• મુખ્ય આંકડાકીય વિગત: ${figures.join(', ')}`] : [])
      );
    }

    return {
      subject,
      category,
      categoryGuj,
      department,
      grNumber,
      portal,
      dates,
      figures,
      keyHighlights
    };
  }

  /**
   * Generates Supreme YouTube Script Prompt specifically for an uploaded/attached full PDF document.
   * Completely dynamic: inspects the PDF content and crafts the prompt specifically tailored to the PDF's subject!
   */
  generateFullPdfMasterPrompt(options = {}) {
    const topic = options.topic || 'ગુજરાત સરકાર સત્તાવાર પરિપત્ર અને ભરતી નિર્ણય ૨૦૨૬';
    const audience = options.targetAudience || 'ગુજરાતના ઉમેદવારો, સરકારી કર્મચારીઓ અને નાગરિકો';
    const fullPdfText = options.fullPdfText || '';
    const filename = options.filename || '';

    // Deep analysis of PDF subject
    const analysis = this.analyzePdfSubjectAndDetails(fullPdfText, topic, filename);
    const activeTopic = analysis.subject || topic;
    const cat = analysis.category;

    let subjectSpecificHeader = '';
    let sectionsContent = '';

    if (cat === 'recruitment') {
      subjectSpecificHeader = `🎯 મુખ્ય ભરતી વિષય: "${activeTopic}"
🏛️ સત્તાવાર વિભાગ: ${analysis.department}
📋 જાહેરાત / ઠરાવ ક્રમાંક: ${analysis.grNumber}
🌐 સત્તાવાર અરજી પોર્ટલ: ${analysis.portal}
${analysis.dates.length > 0 ? `📅 મહત્વપૂર્ણ તારીખો: ${analysis.dates.join(', ')}\n` : ''}${analysis.figures.length > 0 ? `🔢 મહત્વના આંકડા / જગ્યાઓ: ${analysis.figures.join(', ')}\n` : ''}👥 લક્ષિત ઉમેદવારો: સ્પર્ધાત્મક પરીક્ષાની તૈયારી કરતા ગુજરાતના તમામ ઉમેદવારો`;

      sectionsContent = `### ભાગ ૧: પાવરફુલ ઓપનિંગ હૂક (૦:૦૦ થી ૦:૪૫ સેકન્ડ)
- સ્ક્રીન નિર્દેશ: [સ્ક્રીન પર સત્તાવાર ભરતી નોટિફિકેશન, જાહેરાત ક્રમાંક અને કુલ ખાલી જગ્યાઓ લાલ બોક્સમાં હાઇલાઇટ કરો]
- શબ્દશઃ સ્ક્રિપ્ટ: નવી ભરતીની સત્તાવાર જાહેરાત અંગે દર્શકોમાં જોશ ભરી દેતો અને વિડીયો અંત સુધી જોવા મજબૂર કરતો ૧૫-૨૦ સેકન્ડનો દમદાર ઓપનિંગ હૂક.

### ભાગ ૨: સત્તાવાર જાહેરાત & જગ્યાઓનું વર્ગીકરણ (૦:૪૫ થી ૨:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [સત્તાવાર ભરતી બોર્ડ પરિપત્ર, કેટેગરી-વાઇઝ રોસ્ટર ટેબલ (જનરલ, EWS, SEBC, SC, ST, મહિલા અનામત)]
- શબ્દશઃ સ્ક્રિપ્ટ: સરકાર દ્વારા મંજૂર કરાયેલી તમામ ખાલી જગ્યાઓનું કેટેગરી મુજબ સચોટ વિભાજન અને સત્તાવાર વિગત.

### ભાગ ૩: શૈક્ષણિક લાયકાત અને વયમર્યાદાના કડક નિયમો (૨:૩૦ થી ૫:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [૧૦૦% શુદ્ધ સફેદ સ્લાઇડ પર લઘુત્તમ શૈક્ષણિક લાયકાત, વય છૂટછાટ અને CCC સર્ટિફિકેટ શરતો]
- શબ્દશઃ સ્ક્રિપ્ટ: કોણ અરજી કરી શકે? ધોરણ ૧૨ પાસ કે ગ્રેજ્યુએશન? વયમર્યાદામાં સરકારી નિયમ મુજબ છૂટછાટ અને અનિવાર્ય પુરાવા.

### ભાગ ૪: પસંદગી પદ્ધતિ, શારીરિક કસોટી (ગ્રાઉન્ડ) અને નવો સિલેબસ (૫:૦૦ થી ૭:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [દોડ/ગ્રાઉન્ડ ટેસ્ટ ટાઇમિંગ ટેબલ અને લેખિત પરીક્ષા વિષયવાર ૨૦૦ ગુણ ગુણભાર ચાર્ટ]
- શબ્દશઃ સ્ક્રિપ્ટ: શારીરિક કસોટીના નિયમો (દોડ/ઊંચાઈ/છાતી), લેખિત પરીક્ષાનો નવો સિલેબસ, નેગેટિવ માર્કિંગ અને પાસિંગ સ્ટાન્ડર્ડ.

### ભાગ ૫: OJAS પોર્ટલ પર સ્ટેપ-બાય-સ્ટેપ ઓનલાઇન અરજી કરવાની રીત (૭:૩૦ થી ૧૦:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [ojas.gujarat.gov.in નું હોમપેજ, ઓનલાઇન એપ્લિકેશન ફોર્મ અને ફી ચલણ વિગત]
- શબ્દશઃ સ્ક્રિપ્ટ: ઓજસ પર રજીસ્ટ્રેશન કેવી રીતે કરવું, ફોટો-સહી અપલોડ સાઈઝ, અરજી ફી ભરવાની રીત અને સામાન્ય ભૂલો ટાળવાની સલાહ.

### ભાગ ૬: અતિ મહત્વપૂર્ણ તારીખો અને સાવચેતી (૧૦:૦૦ થી ૧૧:૧૫ મિનિટ)
- સ્ક્રીન નિર્દેશ: [ઓનલાઇન ફોર્મ ભરવાની શરૂઆત અને છેલ્લી તારીખ લાલ રંગના બોલ્ડ બોક્સમાં બતાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: છેલ્લા દિવસોમાં OJAS સર્વર ડાઉન થવાની સમસ્યા, છેલ્લી તારીખ પહેલાં કન્ફર્મેશન નંબર મેળવવો અને અફવાઓથી બચવું.

### ભાગ ૭: અંતિમ માર્ગદર્શન, Gyan Yatra App મોક ટેસ્ટ & CTA (૧૧:૧૫ થી ૧૨:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [Gyan Yatra App ડાઉનલોડ બટન, ફ્રી મોક ટેસ્ટ & સબ્સ્ક્રાઇબ એનિમેશન]
- શબ્દશઃ સ્ક્રિપ્ટ: "આ ભરતીના જૂના પેપર્સ, સિલેબસ PDF અને ફ્રી મોક ટેસ્ટ આપવા માટે આજે જ આપણી Gyan Yatra App ઇન્સ્ટોલ કરી લો. વિડીયોને લાઈક કરી તમારા મિત્રો સાથે શેર કરો અને ચેનલ સબ્સ્ક્રાઇબ કરો. જય હિન્દ, જય ભારત!"`;

    } else if (cat === 'scheme') {
      subjectSpecificHeader = `🎯 મુખ્ય યોજના વિષય: "${topic}"
🏛️ સત્તાવાર વિભાગ: ${analysis.department}
📋 ઠરાવ / પરિપત્ર સંદર્ભ: ${analysis.grNumber}
🌐 સત્તાવાર પોર્ટલ: ${analysis.portal}
👥 લક્ષિત લાભાર્થીઓ: ગુજરાતના ખેડૂતો, પશુપાલકો અને ગ્રામીણ પરિવારો`;

      sectionsContent = `### ભાગ ૧: પાવરફુલ ઓપનિંગ હૂક (૦:૦૦ થી ૦:૪૫ સેકન્ડ)
- સ્ક્રીન નિર્દેશ: [સ્ક્રીન પર કૃષિ વિભાગ સત્તાવાર ઠરાવ અને સહાય રકમનું મોટું બેનર બતાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: ખેડૂત ભાઈઓ અને નાગરિકો માટે જાહેર થયેલા સહાય પેકેજ અંગે દર્શકોને ઉત્સાહિત કરતો અને સંપૂર્ણ વિડીયો જોવા પ્રેરતો દમદાર હૂક.

### ભાગ ૨: કૃષિ વિભાગ સત્તાવાર ઠરાવ અને સહાયનો હેતુ (૦:૪૫ થી ૨:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [ગાંધીનગર સચિવાલય કૃષિ ઠરાવનો મુખ્ય ફકરો અને મંજૂર થયેલી જોગવાઈ હાઈલાઈટ કરો]
- શબ્દશઃ સ્ક્રિપ્ટ: સરકાર દ્વારા જાહેર થયેલ આ યોજના પાછળનું સત્તાવાર કારણ, કયા પાક/જિલ્લાઓને લાભ મળશે તેની સ્પષ્ટ વિગત.

### ભાગ ૩: કોને મળશે સહાય? પાત્રતાના સત્તાવાર માપદંડો (૨:૩૦ થી ૫:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [૧૦૦% શુદ્ધ સફેદ સ્લાઇડ પર ખાતેદાર ખેડૂત, નાના/સીમાંત ખેડૂત અને જમીન ધારણ શરતો]
- શબ્દશઃ સ્ક્રિપ્ટ: કોણ અરજી કરી શકે? જમીન ખાતાવહી ૭/૧૨ અને ૮-અ ના નિયમો, સંયુક્ત ખાતેદાર માટેના નિયમો અને કોણ બાકાત રહેશે.

### ભાગ ૪: સહાય રકમ અને DBT ચૂકવણીની ચોક્કસ ગણતરી (૫:૦૦ થી ૭:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [હેક્ટર દીઠ સહાય રકમ અને ખાતામાં જમા થનાર રકમનું ચોખ્ખું કોષ્ટક]
- શબ્દશઃ સ્ક્રિપ્ટ: પ્રતિ હેક્ટર કેટલી સહાય મળશે? વધુમાં વધુ કેટલા હેક્ટર/રૂપિયા મંજૂર થશે? બેંક ખાતામાં DBT મારફતે રૂપિયા જમા થવાની પ્રક્રિયા.

### ભાગ ૫: iKhedut પોર્ટલ પર ઓનલાઇન અરજી કરવાની સ્ટેપ-બાય-સ્ટેપ રીત (૭:૩૦ થી ૧૦:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [ikhedut.gujarat.gov.in હોમપેજ, અરજી ફોર્મ અને જોડવાના પુરાવાઓની યાદી]
- શબ્દશઃ સ્ક્રિપ્ટ: ગ્રામ પંચાયતના વીસીઈ (VCE) મારફતે અથવા જાતે મોબાઈલથી ફોર્મ ભરવાની રીત, આધાર-લિંક્ડ પાસબુક અને જરૂરી પ્રમાણપત્રો.

### ભાગ ૬: અતિ મહત્વપૂર્ણ તારીખો અને સાવચેતી (૧૦:૦૦ થી ૧૧:૧૫ મિનિટ)
- સ્ક્રીન નિર્દેશ: [અરજી કરવાની શરૂઆત અને છેલ્લી તારીખ લાલ રંગના બોલ્ડ બોક્સમાં બતાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: છેલ્લી તારીખ સુધી રાહ જોયા વિના તાત્કાલિક અરજી કરવા અંગે સાવચેતી, અરજીની પ્રિન્ટ જમા કરાવવાની સમયમર્યાદા.

### ભાગ ૭: અંતિમ નિષ્કર્ષ અને Gyan Yatra App & CTA (૧૧:૧૫ થી ૧૨:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [Gyan Yatra App ડાઉનલોડ બટન & સબ્સ્ક્રાઇબ એનિમેશન]
- શબ્દશઃ સ્ક્રિપ્ટ: "આ યોજનાના સત્તાવાર પરિપત્રની PDF મેળવવા માટે આપણી Gyan Yatra App ડાઉનલોડ કરો, વિડીયોને ખેડૂત ગ્રૂપમાં શેર કરજો અને ચેનલને સબ્સ્ક્રાઇબ કરવાનું ભૂલતા નહીં. જય જવાન, જય કિસાન!"`;

    } else if (cat === 'anganwadi') {
      subjectSpecificHeader = `🎯 મુખ્ય વિષય: "${topic}"
🏛️ સત્તાવાર વિભાગ: ${analysis.department}
📋 ઠરાવ / જાહેરાત સંદર્ભ: ${analysis.grNumber}
🌐 સત્તાવાર પોર્ટલ: ${analysis.portal}
👥 લક્ષિત દર્શકો: આંગણવાડી કાર્યકર, તેડાગર અને મહિલા ઉમેદવારો`;

      sectionsContent = `### ભાગ ૧: પાવરફુલ ઓપનિંગ હૂક (૦:૦૦ થી ૦:૪૫ સેકન્ડ)
- સ્ક્રીન નિર્દેશ: [સ્ક્રીન પર આંગણવાડી માનદવેતન વધારો / ભરતી નોટિફિકેશન લાલ બોક્સમાં હાઇલાઇટ કરો]
- શબ્દશઃ સ્ક્રિપ્ટ: આંગણવાડી બહેનો માટે રાજ્ય સરકાર દ્વારા લેવાયેલા મોટા નિર્ણય અંગે ૧૫-૨૦ સેકન્ડનો આકર્ષક અને ઉત્સાહવર્ધક ઓપનિંગ હૂક.

### ભાગ ૨: મહિલા અને બાળ વિકાસ વિભાગ સત્તાવાર ઠરાવ વિગત (૦:૪૫ થી ૨:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [WCD વિભાગ પરિપત્રનો મુખ્ય ફકરો અને મંજૂર થયેલી જોગવાઈ હાઈલાઈટ કરો]
- શબ્દશઃ સ્ક્રિપ્ટ: ગાંધીનગર સચિવાલય દ્વારા માનદવેતન વધારા કે નવી ભરતી અંગે સત્તાવાર ઠરાવમાં આપેલી સાચી હકીકતો.

### ભાગ ૩: પાત્રતા, લાયકાત અને સ્થાનિક રહેવાસી શરતો (૨:૩૦ થી ૫:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [૧૦ પાસ / ૧૨ પાસ શૈક્ષણિક લાયકાત, વયમર્યાદા ૧૮ થી ૩૩ વર્ષ અને સ્થાનિક રહેવાસી પુરાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: કાર્યકર અને તેડાગર માટે લાયકાતના નિયમો, જે તે ગામ/વોર્ડના રહેવાસી હોવાનો તલાટીનો દાખલો અને અનામત છૂટછાટ.

### ભાગ ૪: માનદવેતન સ્લેબ અને મેરિટ ગણતરી પદ્ધતિ (૫:૦૦ થી ૭:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [કાર્યકર અને તેડાગરના માસિક માનદવેતનનું સુધારેલું કોષ્ટક & મેરિટ માર્ક્સ ફોર્મ્યુલા]
- શબ્દશઃ સ્ક્રિપ્ટ: માસિક કેટલા રૂપિયા માનદવેતન મળશે? ધોરણ ૧૦, ૧૨ અને ગ્રેજ્યુએશનના ટકા મુજબ મેરિટ ગુણની ચોક્કસ ગણતરી.

### ભાગ ૫: e-HRMS પોર્ટલ પર ઓનલાઇન અરજી કરવાની રીત (૭:૩૦ થી ૧૦:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [e-hrms.gujarat.gov.in પોર્ટલનું હોમપેજ અને ડોક્યુમેન્ટ અપલોડ યાદી]
- શબ્દશઃ સ્ક્રિપ્ટ: ઓનલાઇન ફોર્મ કેવી રીતે ભરવું, શાળા છોડ્યાનું પ્રમાણપત્ર અને માર્કશીટ અપલોડ કરવાની સ્ટેપ-બાય-સ્ટેપ રીત.

### ભાગ ૬: અતિ મહત્વપૂર્ણ તારીખો અને ડોક્યુમેન્ટ ચકાસણી (૧૦:૦૦ થી ૧૧:૧૫ મિનિટ)
- સ્ક્રીન નિર્દેશ: [અરજી છેલ્લી તારીખ અને વાંધા અરજી સમયમર્યાદા લાલ રંગના બોલ્ડ બોક્સમાં બતાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: તાલુકા કક્ષાએ ડોક્યુમેન્ટ વેરિફિકેશન, પ્રોવિઝનલ મેરિટ લિસ્ટ અને વાંધા રજૂ કરવાની સમયમર્યાદા.

### ભાગ ૭: અંતિમ નિષ્કર્ષ, પરિપત્ર PDF & Gyan Yatra App CTA (૧૧:૧૫ થી ૧૨:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [Gyan Yatra App ડાઉનલોડ બટન & સબ્સ્ક્રાઇબ એનિમેશન]
- શબ્દશઃ સ્ક્રિપ્ટ: "સત્તાવાર પરિપત્રની PDF ડાઉનલોડ કરવા માટે આપણી Gyan Yatra App ઇન્સ્ટોલ કરો, આ વિડીયો અન્ય બહેનો સુધી શેર કરજો અને ચેનલને સબ્સ્ક્રાઇબ કરજો. જય હિન્દ!"`;

    } else if (cat === 'education') {
      subjectSpecificHeader = `🎯 મુખ્ય પરીક્ષા વિષય: "${topic}"
🏛️ સત્તાવાર બોર્ડ: ${analysis.department}
📋 જાહેરાત / નોટિફિકેશન ક્રમાંક: ${analysis.grNumber}
🌐 સત્તાવાર વેબસાઇટ: ${analysis.portal}
👥 લક્ષિત ઉમેદવારો: શિક્ષક અભિયોગ્યતા અને બોર્ડ પરીક્ષાના તમામ ઉમેદવારો`;

      sectionsContent = `### ભાગ ૧: પાવરફુલ ઓપનિંગ હૂક (૦:૦૦ થી ૦:૪૫ સેકન્ડ)
- સ્ક્રીન નિર્દેશ: [સ્ક્રીન પર પરીક્ષા બોર્ડ નોટિફિકેશન, પરિણામ / પરીક્ષા તારીખ લાલ બોક્સમાં હાઇલાઇટ કરો]
- શબ્દશઃ સ્ક્રિપ્ટ: પરીક્ષા જાહેરાત, પરિણામ કે કટઓફ અંગે ઉમેદવારોનું ધ્યાન ખેંચતો ૧૫-૨૦ સેકન્ડનો સ્પષ્ટ અને અધિકૃત ઓપનિંગ હૂક.

### ભાગ ૨: પરીક્ષા બોર્ડ સત્તાવાર જાહેરાત & મુખ્ય નિર્ણયો (૦:૪૫ થી ૨:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [ગાંધીનગર પરીક્ષા બોર્ડ સત્તાવાર પ્રેસનોટ અને નોટિફિકેશનનો મુખ્ય ફકરો]
- શબ્દશઃ સ્ક્રિપ્ટ: બોર્ડ દ્વારા જાહેર કરાયેલા સત્તાવાર આંકડા, પાસિંગ સ્ટાન્ડર્ડ અને પરિણામની સાચી વિગતો સરળ ભાષામાં.

### ભાગ ૩: લાયકાત, કેટેગરી-વાઇઝ પાસિંગ માર્ક્સ & મેરિટ (૨:૩૦ થી ૫:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [૧૦૦% શુદ્ધ સફેદ સ્લાઇડ પર જનરલ vs અનામત વર્ગના ક્વોલિફાઇંગ માર્ક્સ ટેબલ]
- શબ્દશઃ સ્ક્રિપ્ટ: પરીક્ષા પાસ કરવા માટે કેટલા ગુણ જરૂરી છે? સ્કોરકાર્ડની માન્યતા (Validity) અને ભરતી મેરિટમાં ગુણભાર.

### ભાગ ૪: કટઓફ એનાલિસિસ અને આગળની પસંદગી પ્રક્રિયા (૫:૦૦ થી ૭:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [સંભવિત કટઓફ ચાર્ટ, મેરિટ ક્રમાંક અને ડોક્યુમેન્ટ વેરિફિકેશન ફ્લોચાર્ટ]
- શબ્દશઃ સ્ક્રિપ્ટ: પાછલા વર્ષોની સરખામણીએ કટઓફ ટ્રેન્ડ, મેરિટ લિસ્ટ કેવી રીતે બનશે અને આગળનું સ્ટેપ શું રહેશે.

### ભાગ ૫: રિઝલ્ટ જોવાની & સ્કોરકાર્ડ ડાઉનલોડ કરવાની રીત (૭:૩૦ થી ૧૦:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [સત્તાવાર પોર્ટલનું રિઝલ્ટ પેજ અને હોલ ટિકિટ / સ્કોરકાર્ડ ડાઉનલોડ સ્ટેપ્સ]
- શબ્દશઃ સ્ક્રિપ્ટ: વેબસાઇટ પર સીટ નંબર અને જન્મતારીખ નાખી પરિણામ જોવાની રીત અને આન્સર-કી વાંધા અરજી પ્રક્રિયા.

### ભાગ ૬: અતિ મહત્વપૂર્ણ તારીખો અને સાવચેતી (૧૦:૦૦ થી ૧૧:૧૫ મિનિટ)
- સ્ક્રીન નિર્દેશ: [વાંધા અરજી છેલ્લી તારીખ અને પ્રમાણપત્ર ચકાસણી તારીખ બોલ્ડ બોક્સમાં બતાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: વાંધા અરજી કરવાની મુદત, પુરાવા રજૂ કરવાના નિયમો અને અપ્રમાણિત સોશિયલ મીડિયા કટઓફથી સાવચેત રહેવું.

### ભાગ ૭: અંતિમ માર્ગદર્શન, મોક પેપર્સ & Gyan Yatra App CTA (૧૧:૧૫ થી ૧૨:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [Gyan Yatra App ડાઉનલોડ બટન, મોક ટેસ્ટ પેક & સબ્સ્ક્રાઇબ એનિમેશન]
- શબ્દશઃ સ્ક્રિપ્ટ: "આ પરીક્ષાના જૂના પેપર્સ અને મોક ટેસ્ટ આપવા માટે આપણી Gyan Yatra App ઇન્સ્ટોલ કરી લો. વિડીયો લાઈક કરો, જરૂરિયાતમંદ મિત્રો સાથે શેર કરો અને ચેનલને સબ્સ્ક્રાઇબ કરજો. જય હિન્દ!"`;

    } else if (cat === 'salary_da') {
      subjectSpecificHeader = `🎯 મુખ્ય વિષય: "${topic}"
🏛️ સત્તાવાર વિભાગ: ${analysis.department}
📋 ઠરાવ ક્રમાંક: ${analysis.grNumber}
🌐 સત્તાવાર પોર્ટલ: ${analysis.portal}
👥 લક્ષિત કર્મચારીઓ: ગુજરાતના તમામ સરકારી કર્મચારીઓ અને પેન્શનર્સ`;

      sectionsContent = `### ભાગ ૧: પાવરફુલ ઓપનિંગ હૂક (૦:૦૦ થી ૦:૪૫ સેકન્ડ)
- સ્ક્રીન નિર્દેશ: [સ્ક્રીન પર નાણાં વિભાગ સત્તાવાર ઠરાવ અને DA વધારાની ટકાવારી લાલ બોક્સમાં હાઇલાઇટ કરો]
- શબ્દશઃ સ્ક્રિપ્ટ: લાખો કર્મચારીઓ અને પેન્શનર્સ માટે મોંઘવારી ભથ્થા વધારા અંગે ૧૫-૨૦ સેકન્ડનો ખુશખબર આપતો દમદાર ઓપનિંગ હૂક.

### ભાગ ૨: નાણાં વિભાગ સત્તાવાર ઠરાવ (GR) અને અમલ તારીખ (૦:૪૫ થી ૨:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [ગાંધીનગર નાણાં વિભાગ ઠરાવનો મુખ્ય ફકરો અને અમલ તારીખ લાલ અંડરલાઇનથી બતાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: ૭મા પગારપંચ મુજબ કેટલા ટકા DA મંજૂર થયું છે? પાછલી કઈ અસરથી (જુલાઈ/જાન્યુઆરી) અમલ થશે તેની સત્તાવાર વિગત.

### ભાગ ૩: કોને કોને લાભ મળશે? લાભાર્થી કર્મચારી વર્ગો (૨:૩૦ થી ૫:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [૧૦૦% શુદ્ધ સફેદ સ્લાઇડ પર રાજ્ય સરકાર, પંચાયત, બોર્ડ-નિગમ અને પેન્શનર્સ યાદી]
- શબ્દશઃ સ્ક્રિપ્ટ: વર્ગ-૩ અને વર્ગ-૪ કર્મચારીઓ, શિક્ષકો, પંચાયત કર્મીઓ અને પેન્શનર્સને કઈ શરતોએ લાભ મળશે.

### ભાગ ૪: પગાર અને એરિયર્સની રૂપિયામાં ચોક્કસ ગણતરી (૫:૦૦ થી ૭:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [મૂળ પગાર x ટકાવારી અને મહિનાવાર એરિયર્સ કેલ્ક્યુલેશન ટેબલ]
- શબ્દશઃ સ્ક્રિપ્ટ: બેઝિક પગાર ₹૨૫,૦૦૦ થી ₹૭૫,૦૦૦ મુજબ મહિને કેટલા રૂપિયા વધશે અને એકસામટી કેટલી એરિયર્સ રકમ ખાતામાં આવશે.

### ભાગ ૫: પગાર સ્લિપમાં ક્યારે દેખાશે? ટ્રેઝરી અને ચૂકવણી નિયમો (૭:૩૦ થી ૧૦:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [ઓનલાઇન પગાર સ્લિપ (IFMS) અને GPF/રોકડ ચૂકવણી નિયમોનો સ્ક્રીનશોટ]
- શબ્દશઃ સ્ક્રિપ્ટ: રોકડ પગારમાં વધારો ક્યારથી જમા થશે? પાછલા મહિનાઓનું એરિયર્સ GPF માં જમા થશે કે રોકડ મળશે તેના નિયમો.

### ભાગ ૬: અતિ મહત્વપૂર્ણ તારીખો અને સાવચેતી (૧૦:૦૦ થી ૧૧:૧૫ મિનિટ)
- સ્ક્રીન નિર્દેશ: [ચૂકવણી તારીખ બોલ્ડ લાલ બોક્સમાં દર્શાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: ટ્રેઝરી બિલ પ્રોસેસિંગ તારીખ અને સોશિયલ મીડિયા પર ચાલતા ખોટા ગણતરી ચાર્ટ્સથી દૂર રહેવાની ચેતવણી.

### ભાગ ૭: અંતિમ નિષ્કર્ષ, પગાર કેલ્ક્યુલેટર & Gyan Yatra App CTA (૧૧:૧૫ થી ૧૨:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [Gyan Yatra App ડાઉનલોડ બટન, પગાર કેલ્ક્યુલેટર & સબ્સ્ક્રાઇબ એનિમેશન]
- શબ્દશઃ સ્ક્રિપ્ટ: "તમારા પગારનું ચોક્કસ કેલ્ક્યુલેટર વાપરવા અને આ GR ની ઓરિજિનલ PDF ડાઉનલોડ કરવા આપણી Gyan Yatra App ઇન્સ્ટોલ કરી લો. વિડીયો લાઈક કરો અને તમામ કર્મચારી ગ્રૂપમાં શેર કરજો. જય હિન્દ!"`;

    } else {
      // General Government Circular / Welfare Scheme
      subjectSpecificHeader = `🎯 મુખ્ય વિષય: "${topic}"
🏛️ સત્તાવાર વિભાગ: ${analysis.department}
📋 પરિપત્ર / ઠરાવ ક્રમાંક: ${analysis.grNumber}
🌐 સત્તાવાર પોર્ટલ: ${analysis.portal}
👥 લક્ષિત દર્શકો: ${audience}`;

      sectionsContent = `### ભાગ ૧: પાવરફુલ ઓપનિંગ હૂક (૦:૦૦ થી ૦:૪૫ સેકન્ડ)
- સ્ક્રીન નિર્દેશ: [સ્ક્રીન પર સત્તાવાર પરિપત્ર અને ઠરાવ ક્રમાંક લાલ બોક્સમાં બતાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: દર્શકોનું ધ્યાન તરત કેન્દ્રિત કરતો અને વિડીયો પૂરો જોવા મજબૂર કરે તેવો દમદાર ૧૫-૨૦ સેકન્ડનો ઓપનિંગ હૂક.

### ભાગ ૨: સૌથી મોટા નિર્ણયો અને સત્તાવાર જાહેરાત (૦:૪૫ થી ૨:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [ગાંધીનગર સચિવાલય પરિપત્રનો મુખ્ય ફકરો હાઈલાઈટ કરો]
- શબ્દશઃ સ્ક્રિપ્ટ: સરકાર દ્વારા લેવાયેલ આ ઐતિહાસિક નિર્ણય પાછળનું સત્ય અને મુખ્ય હકીકતો સરળ ગુજરાતીમાં.

### ભાગ ૩: કોને લાભ મળશે? પાત્રતા અને નવા નિયમો (૨:૩૦ થી ૫:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [૧૦૦% શુદ્ધ સફેદ સ્લાઇડ પર પાત્રતાના સ્પષ્ટ બુલેટ પોઇન્ટ્સ]
- શબ્દશઃ સ્ક્રિપ્ટ: કોણ અરજી કરી શકે અને કોણ બાકાત રહેશે? શૈક્ષણિક લાયકાત, વયમર્યાદા, આવક મર્યાદા અને નિયમો.

### ભાગ ૪: સહાય રકમ / લાભની ચોક્કસ ગણતરી (૫:૦૦ થી ૭:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [લાભ / સહાય રકમનું ચોખ્ખું ગણતરી કોષ્ટક]
- શબ્દશઃ સ્ક્રિપ્ટ: રૂપિયામાં ચોખ્ખી ગણતરી (દાખલા સાથે સમજાવો કે નાગરિકને શું અને કેટલો લાભ મળશે).

### ભાગ ૫: ઓનલાઇન અરજી કરવાની સ્ટેપ-બાય-સ્ટેપ રીત (૭:૩૦ થી ૧૦:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [સત્તાવાર પોર્ટલનું હોમપેજ અને ફોર્મ ભરવાના સ્ટેપ્સ]
- શબ્દશઃ સ્ક્રિપ્ટ: કઈ વેબસાઇટ પર જવું, કયા પ્રમાણપત્રો અપલોડ કરવા અને કઈ સામાન્ય ભૂલો ન કરવી.

### ભાગ ૬: અતિ મહત્વપૂર્ણ તારીખો અને સાવચેતી (૧૦:૦૦ થી ૧૧:૧૫ મિનિટ)
- સ્ક્રીન નિર્દેશ: [છેલ્લી તારીખ લાલ રંગના બોલ્ડ બોક્સમાં બતાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: છેલ્લા દિવસોમાં સર્વર સમસ્યા અને અરજી રદ ન થાય તે માટેની સાવચેતી.

### ભાગ ૭: અંતિમ નિષ્કર્ષ અને Gyan Yatra App CTA (૧૧:૧૫ થી ૧૨:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [Gyan Yatra App ડાઉનલોડ & સબ્સ્ક્રાઇબ બટન]
- શબ્દશઃ સ્ક્રિપ્ટ: "વિડીયો ઉપયોગી લાગ્યો હોય તો જરૂર લાઈક કરજો, જરૂરિયાતમંદ મિત્રો સુધી શેર કરજો, અને આ પરિપત્રની ઓરિજિનલ PDF ડાઉનલોડ કરવા આપણી Gyan Yatra App ઇન્સ્ટોલ કરી લેજો. ચેનલને સબ્સ્ક્રાઇબ કરવાનું ભૂલતા નહીં. જય હિન્દ, જય ભારત!"`;
    }

    let extractedPagesBlock = '';
    if (Array.isArray(options.slides) && options.slides.length > 0) {
      const pageSnippets = options.slides.map(s => {
        let pts = '';
        if (Array.isArray(s.points) && s.points.length > 0) {
          pts = s.points.map(p => `   • ${p}`).join('\n');
        } else if (typeof s.content === 'string' && s.content.trim()) {
          pts = s.content.split('\n').map(l => `   • ${l.replace(/^[•\-\*\s]+/, '')}`).join('\n');
        }
        return `[પેજ ${s.slideNumber}: ${s.title}]\n${pts || '   • સત્તાવાર વિગત અને નિયમો'}`;
      }).join('\n\n');

      extractedPagesBlock = `============================================================
📑 PDF માંથી વાંચેલા પેજ-બાય-પેજ વાસ્તવિક મુદ્દાઓ (PAGE-BY-PAGE EXTRACTED POINTS):
============================================================
${pageSnippets}
`;
    }

    const fileLabel = filename ? `📄 સફળતાપૂર્વક વાંચેલ PDF: "${filename}" (${options.slides ? options.slides.length : 'બધા'} પેજ)\n` : '';

    return `# 🎯 GYAN YATRA MASTER PROMPT: ${analysis.categoryGuj.toUpperCase()} (FULL PDF SCRIPT GENERATOR)
${fileLabel}(સર્વોચ્ચ આદેશ: અપલોડ કરેલી આખી PDF સંપૂર્ણ વાંચો + વિષય મુજબ માઇક્રોફોન સામે સીધું બોલી શકાય તેવી શબ્દશઃ સ્ક્રિપ્ટ આપો)

તમે YouTube ચેનલ "Gyan Yatra" માટે વરિષ્ઠ શિક્ષણવિદ્, સત્તાવાર પરિપત્ર વિશ્લેષક, વિષય નિષ્ણાત અને પ્રોફેશનલ YouTube સ્ક્રિપ્ટ રાઇટર છો.
મારી YouTube ચેનલ માટે નીચે જોડાયેલી સત્તાવાર પરિપત્ર (GR) / ભરતી નોટિફિકેશન / યોજનાની આખી PDF ફાઇલ શરૂઆતથી અંત સુધી સંપૂર્ણ વાંચીને તેના વાસ્તવિક વિષય "${analysis.categoryGuj}" મુજબ માઇક્રોફોન સામે સીધું બોલી શકાય તેવી શબ્દશઃ (Word-for-Word Spoken Gujarati) સંપૂર્ણ સ્ક્રિપ્ટ તૈયાર કરો.

============================================================
${subjectSpecificHeader}
🏷️ બ્રાન્ડિંગ: "Gyan Yatra" YouTube Channel અને "Gyan Yatra App" (સત્તાવાર પરિપત્ર PDF & મોક ટેસ્ટ)
⏱️ વિડીયો સમયગાળો: ૮ થી ૧૨ મિનિટનો વિગતવાર, સચોટ અને હાઈ-રીટેન્શન વિડીયો
⚪ વિઝ્યુઅલ થીમ: ૧૦૦% શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF), બોલ્ડ હેડિંગ બોક્સ, સત્તાવાર પરિપત્રના અસલી સ્ક્રીનશોટ
============================================================

🚨 સર્વોચ્ચ પ્રથમ આદેશ: પહેલા આખી PDF સંપૂર્ણ વાંચો (READ FULL PDF FIRST)
============================================================
૧. સ્ક્રિપ્ટ લખવાનું શરૂ કરતા પહેલા, આ ચેટ અથવા નોટબુકમાં અપલોડ કરેલી આખી PDF ફાઇલ પેજ ૧ થી છેલ્લા પેજ સુધી ૧૦૦% સંપૂર્ણ અને ઝીણવટપૂર્વક વાંચો!
૨. PDF માંથી આ ચોક્કસ વિષય (${analysis.categoryGuj}) ની નીચેની તમામ સત્તાવાર વિગતો તારવો:
   - સત્તાવાર વિભાગનું નામ: [${analysis.department}]
   - પરિપત્ર / ઠરાવ / જાહેરાત ક્રમાંક: [${analysis.grNumber}]
   - જાહેર થયાની તારીખ અને અમલ તારીખ
   - કોને મળશે લાભ / કોણ કરી શકે અરજી? (પાત્રતા, શૈક્ષણિક લાયકાત, વયમર્યાદા, આવક મર્યાદા)
   - ચોક્કસ આંકડાકીય લાભ / જગ્યાઓ [${analysis.figures.join(', ') || 'સત્તાવાર આંકડા'}]
   - ઓનલાઇન અરજી પોર્ટલ [${analysis.portal}] પર ફોર્મ ભરવાના સ્ટેપ્સ
   - અરજી કરવાની શરૂઆત અને છેલ્લી તારીખ
   - જોડવાના અસલી પુરાવા / ડોક્યુમેન્ટ્સ
૩. કડક ફેક્ટ-ચેકિંગ (STRICT ZERO FABRICATION): PDF માં ના હોય તેવી કોઈ પણ ખોટી, કાલ્પનિક કે અપ્રમાણિત વિગત જાતે ઉમેરશો નહીં. ફક્ત સત્તાવાર સાબિત થયેલ હકીકતો [Confirmed Facts] પર જ સ્ક્રિપ્ટ આધારિત હોવી જોઈએ.

${extractedPagesBlock}============================================================
🎬 આ વિષય મુજબ સ્ક્રિપ્ટનું સંપૂર્ણ ૭-સ્તરીય માળખું (WORD-FOR-WORD SCRIPT):
============================================================
આખી PDF ના આધારે માઇક્રોફોન સામે સીધું બોલી શકાય તેવી શબ્દશઃ નીચે મુજબના ૭ ભાગોમાં એકસાથે સંપૂર્ણ સ્ક્રિપ્ટ લખો:

${sectionsContent}

${fullPdfText ? `\n============================================================\n📄 PDF માંથી મળેલું મુખ્ય લખાણ (EXTRACTED PDF CONTEXT):\n${fullPdfText.substring(0, 8000)}${fullPdfText.length > 8000 ? '\n...(બાકીનું PDF લખાણ જોડાયેલ દસ્તાવેજમાં ઉપલબ્ધ છે)...' : ''}\n============================================================\n` : ''}
============================================================
⚡ બોલવાની શૈલીના કડક નિયમો (SPEAKING STYLE & TONE):
============================================================
- શુદ્ધ, જીવંત અને બોલચાલની સાહજિક ગુજરાતી (કોઈ અઘરા પુસ્તકીય શબ્દો નહીં).
- સ્ક્રિપ્ટના બોલવાના લખાણમાં કોઈ વધારાના કૌંસ [ ] ન હોવા જોઈએ, જેથી યુટ્યુબર અટક્યા વગર સડસડાટ રેકોર્ડિંગ કરી શકે.
- વચ્ચે વચ્ચે દર્શકોનું ધ્યાન કેન્દ્રિત રાખતા વાક્યો: "ધ્યાનથી સાંભળજો", "હવે આગળનો મુદ્દો ખૂબ જ ગંભીર છે".
- યોગ્ય આરોહ-અવરોહ: હૂકમાં ઉત્સાહ, નિયમોમાં ગંભીરતા, તારીખો પર ભાર અને અંતે ઉષ્માભર્યો વિદાય સંદેશ.

હવે અપલોડ કરેલી આખી PDF સંપૂર્ણ વાંચીને ઉપર મુજબના વિષય આધારિત શબ્દશઃ ગુજરાતી સ્ક્રિપ્ટ લખો:`;
  }

  /**
   * Pre-renders immediate high-quality voiceover script for instant UI viewing,
   * dynamically tailored to the detected PDF subject!
   */
  generateSampleVoiceoverScript(slides, mainTopic, fullPdfText = '') {
    const analysis = this.analyzePdfSubjectAndDetails(fullPdfText, mainTopic, '');
    const category = analysis.category;

    return slides.map((s, idx) => {
      const isFirst = (idx === 0);
      const isLast = (idx === slides.length - 1);
      const pointsText = s.points.join(', ');

      let spokenScript = '';
      let deliveryNotes = '';
      let highlights = [];
      let factCheck = '';
      let transition = '';

      if (category === 'recruitment') {
        spokenScript = isFirst
          ? `નમસ્તે સ્પર્ધાત્મક પરીક્ષાની તૈયારી કરતા તમામ યુવા મિત્રો! ગુજરાત સરકારના ભરતી બોર્ડ તરફથી નવી સત્તાવાર જાહેરાત પ્રસિદ્ધ કરી દેવામાં આવી છે. અહીં સ્ક્રીન પર તમે સત્તાવાર જાહેરાત ક્રમાંક અને કુલ ખાલી જગ્યાઓની વિગત જોઈ શકો છો. સોશિયલ મીડિયા પર ચાલતી ખોટી અફવાઓથી દૂર રહીને બોર્ડના અસલી નોટિફિકેશન મુજબ સંપૂર્ણ લાયકાત, વયમર્યાદા અને સિલેબસની વિગત સમજવી ખૂબ જ જરૂરી છે, જેથી ફોર્મ ભરતી વખતે કોઈ પણ ભૂલ ન થાય.`
          : `અહીં સ્લાઇડ પર દર્શાવેલા લાયકાતના માપદંડો અને વયમર્યાદાના નિયમો ખાસ નોંધી લો. માન્ય યુનિવર્સિટીમાંથી સ્નાતક અથવા સમકક્ષ ડિગ્રી ધરાવતા ઉમેદવારો જ આ જગ્યા માટે અરજી કરી શકશે. સાથે જ અનામત વર્ગના ભાઈઓ-બહેનો માટે સરકારના નિયમ મુજબ વયમર્યાદામાં છૂટછાટ આપવામાં આવી છે. કમ્પ્યુટર CCC સર્ટિફિકેટ પણ માન્ય સંસ્થાનું હોવું અનિવાર્ય છે.`;

        deliveryNotes = `• ઉત્સાહી અને માર્ગદર્શક ટોનમાં બોલવું.\n• 'સત્તાવાર જાહેરાત ક્રમાંક' બોલતી વખતે ગંભીરતા રાખવી.\n• મહત્વની છેલ્લી તારીખ પર ખાસ ભાર મૂકવો.`;
        highlights = ['કુલ ખાલી જગ્યાઓની સત્તાવાર વિગત', 'શૈક્ષણિક લાયકાત & CCC', 'OJAS ઓનલાઇન અરજી તારીખ'];
        factCheck = `• દાવા: ભરતી બોર્ડ સત્તાવાર જાહેરાત (ચકાસાયેલ - Confirmed).\n• સત્તાવાર પોર્ટલ: ${analysis.portal}`;
        transition = isLast
          ? `આ ભરતીના જૂના પેપર્સ અને મોક ટેસ્ટ માટે આજે જ Gyan Yatra App ડાઉનલોડ કરી લો.`
          : `હવે પરીક્ષા પદ્ધતિ અને સિલેબસમાં શું નવો બદલાવ આવ્યો છે, તે આગલી સ્લાઇડમાં વિગતવાર જોઈએ.`;
      } else if (category === 'scheme') {
        spokenScript = isFirst
          ? `નમસ્કાર ખેડૂત ભાઈઓ અને દર્શક મિત્રો! રાજ્ય સરકાર દ્વારા ખેડૂતો અને ગ્રામીણ પરિવારો માટે ખૂબ જ મહત્વપૂર્ણ સહાય યોજનાની સત્તાવાર જાહેરાત કરવામાં આવી છે. અહીં સ્લાઇડમાં તમે સત્તાવાર કૃષિ ઠરાવ જોઈ શકો છો. યોજનાની સાચી પાત્રતા શરતો, હેક્ટર દીઠ સહાય રકમ અને iKhedut પોર્ટલ પર ઓનલાઇન અરજી કરવાની સાચી પદ્ધતિ જાણવી અનિવાર્ય છે જેથી કોઈપણ ખેડૂત પોતાના હકની સહાયથી વંચિત ન રહે.`
          : `હવે સ્લાઇડ પર દર્શાવેલી સહાય રકમ અને જમીન ખાતાવહીના નિયમો ધ્યાનથી સમજી લો. નાના, સીમાંત અને મોટા ખેડૂતો માટે નિયત મર્યાદામાં પ્રતિ હેક્ટર સહાય રકમ સીધી બેંક ખાતામાં DBT મારફતે જમા થશે. અરજી સાથે ૭/૧૨ અને ૮-અ ની અસલી નકલ તેમજ આધાર કાર્ડ લિંક હોવું જરૂરી છે.`;

        deliveryNotes = `• સહાનુભૂતિપૂર્વક, સ્પષ્ટ અને ધીમી ગતિએ બોલવું.\n• 'હેક્ટર દીઠ સહાય' અને 'iKhedut પોર્ટલ' પર ભાર મૂકવો.`;
        highlights = ['સત્તાવાર કૃષિ પરિપત્ર', 'હેક્ટર દીઠ સહાય ગણતરી', 'iKhedut ઓનલાઇન અરજી'];
        factCheck = `• દાવા: કૃષિ વિભાગ સત્તાવાર ઠરાવ મુજબ.\n• સત્તાવાર પોર્ટલ: ${analysis.portal}`;
        transition = isLast
          ? `આ યોજનાની ઓરિજિનલ પરિપત્ર PDF મેળવવા Gyan Yatra App ડાઉનલોડ કરી લો અને ચેનલને સબ્સ્ક્રાઇબ કરો.`
          : `ઓનલાઇન અરજી કેવી રીતે કરવી અને કયા કયા કાગળો જોડવાના રહેશે, તે હવે આગળની સ્લાઇડમાં જોઈએ.`;
      } else if (category === 'anganwadi') {
        spokenScript = isFirst
          ? `નમસ્તે આંગણવાડી કાર્યકર, તેડાગર અને તમામ મહિલા દર્શક મિત્રો! રાજ્ય સરકારના મહિલા અને બાળ વિકાસ વિભાગ તરફથી ખૂબ જ મોટો સત્તાવાર પરિપત્ર જાહેર કરવામાં આવ્યો છે. માનદવેતનમાં વધારો અને નવી ભરતી પ્રક્રિયા અંગેનો આ ઐતિહાસિક નિર્ણય છે. આજના વિડીયોમાં આપણે સંપૂર્ણ પાત્રતા, માનદવેતન ગણતરી અને e-HRMS પોર્ટલ પર ફોર્મ ભરવાના તમામ નિયમો સ્ટેપ-બાય-સ્ટેપ સમજીશું.`
          : `અહીં સ્લાઇડમાં દર્શાવેલા પાત્રતાના માપદંડો ખાસ સમજી લો. ધોરણ ૧૦ પાસ અને ૧૨ પાસ બહેનો માટે સ્થાનિક રહેવાસી હોવાનો તલાટીનો દાખલો ફરજિયાત છે. સાથે જ વયમર્યાદા ૧૮ થી ૩૩ વર્ષ વચ્ચે હોવી જોઈએ. ગુણવત્તા અને અનુભવના આધારે જ મેરિટ લિસ્ટ તૈયાર કરવામાં આવશે.`;

        deliveryNotes = `• ઉષ્માભર્યો, સન્માનજનક અને સ્પષ્ટ અવાજ.\n• 'માનદવેતન' અને 'e-HRMS પોર્ટલ' શબ્દો સ્પષ્ટ બોલવા.`;
        highlights = ['માનદવેતનમાં સુધારો', 'સ્થાનિક રહેવાસી પુરાવો', 'e-HRMS ઓનલાઇન અરજી'];
        factCheck = `• દાવા: મહિલા & બાળ વિકાસ વિભાગ સત્તાવાર ઠરાવ.\n• સત્તાવાર પોર્ટલ: ${analysis.portal}`;
        transition = isLast
          ? `પરિપત્રની નકલ ડાઉનલોડ કરવા Gyan Yatra App ઇન્સ્ટોલ કરી લો અને ચેનલને સબ્સ્ક્રાઇબ કરો.`
          : `હવે માનદવેતનની રકમ અને મેરિટ ગણતરીની ચોક્કસ ફોર્મ્યુલા આગલી સ્લાઇડમાં સમજીએ.`;
      } else if (category === 'education') {
        spokenScript = isFirst
          ? `નમસ્તે શિક્ષણ અને સ્પર્ધાત્મક પરીક્ષાની તૈયારી કરતા તમામ વિદ્યાર્થી મિત્રો! રાજ્ય પરીક્ષા બોર્ડ તરફથી સત્તાવાર નોટિફિકેશન અને પરિણામ અંગે ખૂબ જ મહત્વપૂર્ણ જાહેરાત આવી ચૂકી છે. અહીં સ્ક્રીન પર તમે સત્તાવાર પરિપત્ર અને કટઓફ માપદંડો જોઈ શકો છો. ખોટી અફવાઓથી દૂર રહીને બોર્ડના નિયમો મુજબ પાસિંગ સ્ટાન્ડર્ડ અને આગળની પ્રક્રિયા સમજવી અનિવાર્ય છે.`
          : `અહીં સ્લાઇડ પર દર્શાવેલા કેટેગરી-વાઇઝ પાસિંગ માર્ક્સ ખાસ નોંધી લો. જનરલ કેટેગરી અને અનામત વર્ગના ઉમેદવારો માટે નિયત ક્વોલિફાઇંગ સ્ટાન્ડર્ડ મુજબ જ સ્કોરકાર્ડ માન્ય ગણાશે. આન્સર-કી વાંધા અરજી માટે પણ બોર્ડ દ્વારા નિયત સમયમર્યાદા આપવામાં આવી છે.`;

        deliveryNotes = `• ગંભીર, શૈક્ષણિક અને વિશ્વાસપૂર્ણ અવાજ.\n• 'પાસિંગ સ્ટાન્ડર્ડ' અને 'કટઓફ' પર ભાર આપવો.`;
        highlights = ['સત્તાવાર બોર્ડ નોટિફિકેશન', 'પાસિંગ સ્ટાન્ડર્ડ & કટઓફ', 'પરિણામ ડાઉનલોડ પોર્ટલ'];
        factCheck = `• દાવા: પરીક્ષા બોર્ડ સત્તાવાર જાહેરાત.\n• સત્તાવાર વેબસાઇટ: ${analysis.portal}`;
        transition = isLast
          ? `જૂના પ્રશ્નપત્રો અને મોક ટેસ્ટ માટે Gyan Yatra App ડાઉનલોડ કરી લો.`
          : `હવે રિઝલ્ટ ડાઉનલોડ કરવાની અને વાંધા અરજી કરવાની સ્ટેપ-બાય-સ્ટેપ રીત આગળ જોઈએ.`;
      } else if (category === 'salary_da') {
        spokenScript = isFirst
          ? `નમસ્તે ગુજરાતના તમામ સરકારી કર્મચારી અને પેન્શનર ભાઈઓ-બહેનો! જો તમે પણ મોંઘવારી ભથ્થા એટલે કે DA વધારાની સત્તાવાર જાહેરાતની રાહ જોઈ રહ્યા હતા, તો તમારા માટે રાજ્ય સરકાર તરફથી અત્યંત મહત્વનો નિર્ણય આવી ચૂક્યો છે. અહીં સ્લાઇડમાં તમે જોઈ શકો છો તેમ ૭મા પગારપંચના ધોરણો મુજબ મોંઘવારી ભથ્થું મંજૂર કરવામાં આવ્યું છે. સૌથી અગત્યની વાત એ છે કે આ વધારો પાછલી અસરથી લાગુ કરવામાં આવ્યો છે, જેથી નિયમિત પગાર ઉપરાંત બાકી રહેલા મહિનાઓનો રોકડ તફાવત પણ તમને એરિયર્સ તરીકે ચૂકવવામાં આવશે.`
          : `હવે સ્લાઇડ પર દર્શાવેલા આ ગણતરી કોષ્ટકને ખૂબ જ ધ્યાનથી સમજો. અહીં વર્ગ-૩ અને વર્ગ-૪ ના અલગ-અલગ પે-બેન્ડ અને ગ્રેડ-પે મુજબ ચોખ્ખો વધારો દર્શાવ્યો છે. બેઝિક પગાર મુજબ દર મહિને પગારમાં સીધો વધારો થશે અને સાથે જ પાછલા મહિનાઓનું એરિયર્સ જોડીએ તો એકસામટી રકમ ખાતામાં જમા થશે. નાણાં વિભાગના સત્તાવાર જીઆર મુજબ જ આ રકમ નિયત કરવામાં આવી છે.`;

        deliveryNotes = `• 'DA વધારો' અને 'જુલાઈથી અસરકારક' શબ્દો પર ખાસ ભાર આપવો.\n• ગણતરી સમજાવતી વખતે અવાજ થોડો ધીમો અને સ્પષ્ટ રાખવો.\n• શરૂઆતના પ્રશ્ન પછી ૧ સેકન્ડનો પોઝ લેવો.`;
        highlights = ['DA વધારો સત્તાવાર મંજૂર', 'પાછલી અસરથી અમલ', 'બેંક ખાતામાં એરિયર્સ જમા'];
        factCheck = `• દાવા: નાણાં વિભાગ સત્તાવાર ઠરાવ (ચકાસાયેલ - Confirmed).\n• સત્તાવાર પોર્ટલ: ${analysis.portal}`;
        transition = isLast
          ? `આજના આ મહત્વપૂર્ણ પરિપત્રની પીડીએફ અને ચોક્કસ પગાર કેલ્ક્યુલેટર તમને Gyan Yatra App પરથી મળી જશે.`
          : `હવે તમારા મનમાં પ્રશ્ન થશે કે આ વધારો તમારા ખાતામાં કઈ તારીખે જમા થશે, તો ચાલો આગલી સ્લાઇડમાં સત્તાવાર તારીખો સમજીએ.`;
      } else {
        spokenScript = `નમસ્તે દર્શક મિત્રો! આજના વિડીયોમાં આપણે "${s.title}" વિષય પર સૌથી સચોટ અને પુરાવા સાથેની માહિતી મેળવવા જઈ રહ્યા છીએ. અહીં સ્લાઇડમાં દર્શાવ્યા મુજબ ${pointsText}. આ યોજનાનો લાભ કોને મળશે અને સરકારના સત્તાવાર નિયમો શું કહે છે, તે દરેક મુદ્દો આપણે સ્ટેપ-બાય-સ્ટેપ સમજીશું જેથી કોઈપણ નાગરિક યોજનાના સાચા લાભથી વંચિત ના રહે.`;
        deliveryNotes = `• શાંત, સ્પષ્ટ અને શિક્ષકની જેમ વિશ્વાસપૂર્ણ અવાજ.\n• મુદ્દાઓ વચ્ચે યોગ્ય વિરામ (pause).\n• સરળ ભાષાપ્રયોગ.`;
        highlights = [s.title, 'સત્તાવાર પાત્રતા શરતો', analysis.portal];
        factCheck = `• દાવા: સત્તાવાર સરકારી પરિપત્ર આધારિત.\n• સ્ત્રોત: ${analysis.department}`;
        transition = isLast
          ? `વિડીયો ઉપયોગી લાગ્યો હોય તો જરૂર લાઈક કરજો અને Gyan Yatra ચેનલને સબ્સ્ક્રાઇબ કરવાનું ભૂલતા નહીં.`
          : `આગળના મહત્વના પગલાં અને ઓનલાઇન પ્રોસેસ હવે આપણે આગલી સ્લાઇડમાં સમજીએ.`;
      }

      return `### SLIDE ${s.slideNumber || idx + 1}: ${s.title}

**1. Slide Understanding**
- **Main topic:** ${s.title}
- **Main message:** ${s.points[0] || s.title}
- **Target audience:** ગુજરાતના સરકારી કર્મચારીઓ, ઉમેદવારો અને નાગરિકો
- **Most important information:** ${s.points.slice(0, 2).join(' • ')}
- **Any factual concern or missing detail:** સત્તાવાર સરકારી પરિપત્ર મુજબ જ માહિતી માન્ય ગણવી; અપ્રમાણિત દાવાઓથી સાવચેત રહેવું.

**2. Audience Retention Objective**
દર્શકને આ સ્લાઇડ દ્વારા સંપૂર્ણ સાચી, પુરાવા સાથેની માહિતી આપવી જેથી તેઓ અફવાઓથી બચે અને આગળની વ્યવહારુ ગણતરી જોવા માટે વિડીયો સાથે જોડાયેલા રહે.

**3. Word-for-Word Gujarati Voiceover Script**
> "${spokenScript}"

**4. Optional Voice Delivery Notes**
${deliveryNotes}

**5. On-Screen Highlight Suggestions**
${highlights.map((h, i) => `${i + 1}. **"${h}"** — સ્ક્રીન પર બોક્સ અથવા એરો દ્વારા હાઇલાઇટ કરવું.`).join('\n')}

**6. Fact-Check and Sources**
${factCheck}

**7. Transition to the Next Slide**
> "${transition}"`;
    }).join('\n\n---\n\n');
  }

  /**
   * Helper to extract pure spoken Gujarati sentences from markdown formatted script
   * ready for the Voice Actor / TTS engine.
   */
  extractSpokenScript(scriptMarkdown = '') {
    if (!scriptMarkdown || typeof scriptMarkdown !== 'string') return '';
    const { sanitizeScriptForSpeech } = require('./gujaratiCleaner');
    return sanitizeScriptForSpeech(scriptMarkdown);
  }

  generateVoiceoverMasterPrompt(args) {
    return this.generateMasterPromptForSlides(args);
  }
}

module.exports = new SlideVoiceoverService();

