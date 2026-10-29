const { cleanGujaratiForTTS, numberToGujaratiWords, gujaratiToDevanagari } = require('./gujaratiCleaner');

/**
 * World-Class Script-Aware Human-Like Acting Voice Engine
 * 
 * Functions like a professional speech AI engineer, voice director, and speech prosody specialist:
 * 1. Deep script understanding before speech generation (genre, communicative intent, dramatic arc).
 * 2. Narrative progression mapping (Hook -> Context -> Climax/Approval -> Dense Data -> Caution/Warning -> Closing).
 * 3. Dynamic actor-level prosody shaping (Speaking Rate, Pitch Inflection in Hz/semitones, Relative Volume/Energy).
 * 4. Distinct dramatic beat preservation: sentences with different emotional intent NEVER get blurred into a flat block!
 * 5. Full audible acoustic contrast between positive news (+6Hz), serious caveats (-4Hz), firm warnings (-2Hz), and questions (+8Hz).
 * 6. 100% fluent, standard Gujarati pronunciation for numbers, percentages, dates, and government acronyms.
 */
class VoiceActorService {
  /**
   * Stage A: Intelligently detects the topic, genre, and delivery personality of the complete script.
   */
  detectScriptContext(text) {
    if (!text || typeof text !== 'string') {
      return {
        category: 'general_analysis',
        badgeGuj: '📰 સામાન્ય સમાચાર & વિશ્લેષણ',
        nameGuj: 'સામાન્ય સમાચાર',
        description: 'સંતુલિત, સત્તાવાર અને સાંભળવામાં સરળ પ્રસ્તુતિ.',
        baseRateOffset: 0,
        basePitchOffset: 0,
        defaultEmotion: 'official'
      };
    }

    const t = text.toLowerCase();

    // Scoring weights for context detection
    let scores = {
      recruitment_announcement: 0,
      salary_financial: 0,
      breaking_news: 0,
      government_scheme: 0,
      educational_lesson: 0,
      audience_interaction: 0,
      general_analysis: 1
    };

    // 1. Recruitment keywords
    const recruitMatches = t.match(/(?:ભરતી|જગ્યા|ઓજસ|ojas|gpsc|gsssb|gpssb|tet|tat|ઉમેદવાર|લાયકાત|વય\s*મર્યાદા|છેલ્લી\s*તારીખ|ફોર્મ|જાહેરાત\s*ક્રમાંક|અરજી|મેરિટ|પરીક્ષા\s*તારીખ|ખાલી\s*પદો|સિલેક્શન|નોકરી)/gi);
    if (recruitMatches) scores.recruitment_announcement += recruitMatches.length * 2.8;

    // 2. Salary / Financial keywords
    const salaryMatches = t.match(/(?:પગાર|માનદ\s*વેતન|ભથ્થું|મોંઘવારી|ડી\.એ\.|da|નાણાં\s*વિભાગ|સાતમો\s*પગાર|પગારપંચ|એરિયર્સ|ખાતામાં|રકમ|રૂપિયા|પગારવધારો|વેતનવધારો|પેન્શન|ગ્રેચ્યુઇટી|હપ્તો|ઇઝાફો)/gi);
    if (salaryMatches) scores.salary_financial += salaryMatches.length * 3.2;

    // 3. Breaking News keywords
    const breakingMatches = t.match(/(?:બ્રેકિંગ|તાજા\s*સમાચાર|મોટી\s*અપડેટ|સૌથી\s*મોટા\s*સમાચાર|ગાંધીનગરથી\s*સમાચાર|તાત્કાલિક|લાઈવ|હમણાં\s*જ|ધમાકેદાર|અત્યારની|વિસ્ફોટક|ખાસ\s*અહેવાલ|ચેતવણી)/gi);
    if (breakingMatches) scores.breaking_news += breakingMatches.length * 3.0;

    // 4. Government Scheme keywords
    const schemeMatches = t.match(/(?:યોજના|સહાય|સબસિડી|જનકલ્યાણ|ખેડૂત\s*સહાય|મહિલા\s*કલ્યાણ|આવાસ|શિષ્યવૃત્તિ|લાભાર્થી|અરજી\s*પોર્ટલ|દસ્તાવેજ|રેશન|આધાર\s*કાર્ડ|ડીબીટી|dbt|લાભ\s*મળશે|ખાતામાં\s*જમા)/gi);
    if (schemeMatches) scores.government_scheme += schemeMatches.length * 2.6;

    // 5. Educational / Exam Lesson keywords
    const eduMatches = t.match(/(?:પાઠ|સમજૂતી|પ્રશ્ન|ઉત્તર|વિષય|અભ્યાસક્રમ|યાદ\s*રાખો|નિયમ|ઉદાહરણ|વિદ્યાર્થીઓ|તૈયારી|શોર્ટકટ|મહત્વના\s*મુદ્દા|પ્રકરણ|જનરલ\s*નોલેજ|જીકે|કરન્ટ\s*અફેર્સ|સ્ટેપ\s*બાય\s*સ્ટેપ)/gi);
    if (eduMatches) scores.educational_lesson += eduMatches.length * 2.6;

    // 6. Audience Interaction keywords
    const questionMatches = t.match(/(?:\?|શું\s*તમે|કેમ\s*છો|તમારો\s*અભિપ્રાય|કોમેન્ટ\s*કરો|તમને\s*ખબર\s*છે|વિચારો|શેર\s*કરજો|સબ્સ્ક્રાઇબ)/gi);
    if (questionMatches && questionMatches.length >= 2) {
      scores.audience_interaction += questionMatches.length * 2.0;
    }

    // Find highest scoring category
    let bestCat = 'general_analysis';
    let maxScore = 0;
    for (const [cat, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestCat = cat;
      }
    }

    const categoryProfiles = {
      recruitment_announcement: {
        category: 'recruitment_announcement',
        badgeGuj: '📢 સરકારી ભરતી & ઓજસ જાહેરાત',
        nameGuj: 'સરકારી ભરતી',
        description: 'સત્તાવાર, સ્પષ્ટ અને માહિતીપ્રદ વાણી. ખાલી જગ્યાઓ, પાત્રતા અને છેલ્લી તારીખ પર કુદરતી ભાર.',
        baseRateOffset: 2,
        basePitchOffset: 1,
        defaultEmotion: 'official'
      },
      salary_financial: {
        category: 'salary_financial',
        badgeGuj: '💰 પગાર વધારો & નાણાકીય જાહેરાત',
        nameGuj: 'પગાર વધારો & DA',
        description: 'ઉષ્માભરી, ઉત્સાહપ્રેરક અને આત્મવિશ્વાસપૂર્ણ વાણી. નાણાકીય રકમ અને ટકાવારી પર સ્પષ્ટ અને ધીમી રજૂઆત.',
        baseRateOffset: 1,
        basePitchOffset: 2,
        defaultEmotion: 'enthusiastic'
      },
      breaking_news: {
        category: 'breaking_news',
        badgeGuj: '💥 બ્રેકિંગ ન્યૂઝ બુલેટિન',
        nameGuj: 'બ્રેકિંગ ન્યૂઝ',
        description: 'હાઇ એલર્ટ, ગતિશીલ, સત્તાવાર તાકીદ અને પ્રભાવશાળી બુલેટિન રજૂઆત.',
        baseRateOffset: 4,
        basePitchOffset: 1,
        defaultEmotion: 'official'
      },
      government_scheme: {
        category: 'government_scheme',
        badgeGuj: '🏛️ સરકારી જનકલ્યાણ યોજના & સહાય',
        nameGuj: 'સરકારી યોજના',
        description: 'જનમિત્ર જેવી સરળ, સદ્ભાવપૂર્ણ અને સહજ સમજાવટ. ખેડૂત-લાભાર્થી માટે સુગમ વાણી.',
        baseRateOffset: 1,
        basePitchOffset: 1,
        defaultEmotion: 'enthusiastic'
      },
      educational_lesson: {
        category: 'educational_lesson',
        badgeGuj: '🎓 શૈક્ષણિક પાઠ & સરળ સમજૂતી',
        nameGuj: 'શિક્ષણ & તૈયારી',
        description: 'મુદ્દાસર, ધીરજવાન, પ્રેરક અને સહજ શૈક્ષણિક વાણી. રસપ્રદ સ્ટેપ-બાય-સ્ટેપ સમજૂતી.',
        baseRateOffset: 0,
        basePitchOffset: 0,
        defaultEmotion: 'calm'
      },
      audience_interaction: {
        category: 'audience_interaction',
        badgeGuj: '🤝 દર્શક સંવાદ & પ્રશ્નોત્તરી',
        nameGuj: 'સંવાદ & પ્રશ્નો',
        description: 'જીવંત વાતચીત, પ્રશ્નાર્થ લહેકો અને દર્શકો સાથે આત્મીય જોડાણ.',
        baseRateOffset: 2,
        basePitchOffset: 2,
        defaultEmotion: 'enthusiastic'
      },
      general_analysis: {
        category: 'general_analysis',
        badgeGuj: '📰 સામાન્ય સમાચાર & પરિપત્ર',
        nameGuj: 'સમાચાર વિશ્લેષણ',
        description: 'સંતુલિત, સત્તાવાર, વાતચીત જેવી અને કુદરતી ન્યૂઝ પ્રસ્તુતિ.',
        baseRateOffset: 1,
        basePitchOffset: 0,
        defaultEmotion: 'official'
      }
    };

    return categoryProfiles[bestCat] || categoryProfiles.general_analysis;
  }

  /**
   * Stage B & C: Comprehensive Script-Aware Dramatic Analysis
   * Identifies exact communicative intentions and builds distinct dramatic actor beats.
   */
  analyzeScript(rawText, options = {}) {
    const {
      style = null,
      userSpeed = 1.0,
      userEmotion = 'enthusiastic',
      mainTopic = ''
    } = options;

    if (!rawText || rawText.trim().length === 0) {
      return {
        success: false,
        error: 'સ્ક્રિપ્ટ લખાણ ખાલી છે.'
      };
    }

    // 1. Clean and phonetically optimize text
    const cleanedText = cleanGujaratiForTTS(rawText);

    // 2. Intelligent Context & Genre Detection
    const context = this.detectScriptContext(cleanedText);

    // 3. Segment into genuine grammatical sentences (preserving numbers & abbreviations)
    const rawSentences = cleanedText
      .split(/(?<=[.!?।])\s+(?=[^\d])/g)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const totalSentencesCount = Math.max(1, rawSentences.length);
    const userSpeedOffset = Math.round((parseFloat(userSpeed || 1.0) - 1.0) * 35);

    // 4. Analyze each sentence for communicative intent & narrative arc position
    const analyzedSentences = [];

    rawSentences.forEach((sentence, index) => {
      const positionRatio = index / totalSentencesCount; // 0.0 to 1.0
      const isFirst = index === 0;
      const isLast = index >= totalSentencesCount - 1;
      const isSecond = index === 1;

      // Crucial: Detect Negation / Unconfirmed / Rumor Warning first!
      const hasNegationOrUnconfirmed = /(?:કોઈ\s*(?:પણ\s*)?(?:સત્તાવાર\s*)?(?:જાહેરાત|નિર્ણય|પરિપત્ર|ઠરાવ|મંજૂરી)\s*(?:નથી|નથી\s*થઈ|કરવામાં\s*આવી\s*નથી)|અફવા|નકારવામાં|ખોટા\s*સમાચાર|હજી\s*સુધી\s*કોઈ|પુષ્ટિ\s*નથી|સત્તાવાર\s*સમર્થન\s*નથી|સ્પષ્ટતા\s*નથી|અનિશ્ચિત|હાલમાં\s*આ\s*અંગે\s*કોઈ)/i.test(sentence);

      // Question detection (explicit ? or strong question structure)
      const isQuestion = sentence.includes('?') || /(?:^|\s)(?:શું\s*તમે|કેમ\s*છો|તમને\s*ખબર\s*છે|વિચારો|તમારો\s*અભિપ્રાય|કોમેન્ટ\s*કરો|શું\s*ખરેખર)(?:$|\s|[.,!?])/i.test(sentence);

      // Numbers & dense figures
      const hasNumbers = /(?:રૂપિયા|હજાર|લાખ|કરોડ|ટકા|તારીખ|નંબર|જગ્યા|પદો|પગાર|વેતન|\d+)/.test(sentence);

      // Firm Warning & Deadline Alert
      const isFirmWarning = /(?:ખાસ\s*ચકાસી|ધ્યાન\s*રાખજો|ભૂલ\s*ના\s*કરતા|છેલ્લી\s*તારીખ|સમય\s*મર્યાદા|રદ\s*થઈ\s*શકે|ફરજિયાત|યાદ\s*રાખવું|ચેતવણી|સાવધાન|લાયકાત\s*અને\s*છેલ્લી)/i.test(sentence);

      // Positive Hook / Attention Grabber
      const isPositiveHook = (isFirst || (isSecond && /(?:નમસ્તે|કેમ છો|મિત્રો|ખુશખબર|મોટા સમાચાર|મહત્વના સમાચાર|આનંદના સમાચાર)/i.test(sentence))) && !hasNegationOrUnconfirmed && !isQuestion;

      // Major Official Announcement (ONLY when not negated/unconfirmed)
      const isOfficialDecision = /(?:પરિપત્ર|ઠરાવ|સરકાર|નાણાં વિભાગ|સત્તાવાર|નિયમ|જીઆર|જાહેરનામું|મંજૂરી|કેબિનેટ|મંજૂર)/i.test(sentence) && !hasNegationOrUnconfirmed && !isQuestion;

      // Eligibility & Rules
      const isEligibility = /(?:લાયકાત|વય મર્યાદા|શરતો|ધોરણ|અરજી ફી|પાસ|ડિગ્રી|સહાય મળવાપાત્ર|અભ્યાસક્રમ)/i.test(sentence) && !hasNegationOrUnconfirmed;

      // Transition / Bridge
      const isTransition = /(?:હવે વાત કરીએ|આગળ જોઈએ|આ ઉપરાંત|સાથે સાથે|બીજી તરફ|વિગતવાર સમજીએ|ખાસ નોંધ)/i.test(sentence);

      // Warm Closing & CTA
      const isClosing = (isLast || /(?:સબ્સ્ક્રાઇબ|શેર કરો|લાઈક|જય હિન્દ|જય ભારત|કોમેન્ટ કરો|ધન્યવાદ|આભાર)/i.test(sentence)) && !isPositiveHook;

      let role = 'explanation';
      let badgeGuj = 'વિગતવાર સમજૂતી';
      let arcPhase = 'DEVELOPMENT';
      let pitchHz = 2; // neutral anchor
      let ratePercent = 6 + (context.baseRateOffset || 0) + userSpeedOffset;
      let pauseMs = 200;

      // Stage B Performance Intent Classification with Genuine Audible Acoustic Contrast
      if (hasNegationOrUnconfirmed) {
        // Example B: Serious, restrained, factual, lower-pitched delivery
        role = 'serious_caveat';
        arcPhase = 'SERIOUS_FACTUAL';
        badgeGuj = '⚖️ ગંભીર સ્પષ્ટતા & સજાગતા';
        ratePercent -= 14; // Slower, restrained
        pitchHz = -4;      // Noticeable drop into grave, serious vocal register
        pauseMs = 280;
      } else if (isQuestion) {
        // Example D: Curious, conversational rising interrogative lift
        role = 'audience_question';
        arcPhase = 'AUDIENCE_ENGAGEMENT';
        badgeGuj = '❓ પ્રશ્નાર્થ સંવાદ & કુતૂહલ';
        ratePercent += 2;
        pitchHz = 8;       // High interrogative lift inviting engagement
        pauseMs = 250;
      } else if (isFirmWarning) {
        // Example C: Firm, cautionary warning
        role = 'firm_warning';
        arcPhase = 'CAUTION_ALERT';
        badgeGuj = '⚠️ સજાગતા & સમય મર્યાદા ચેતવણી';
        ratePercent -= 8;  // Deliberate cautionary pacing
        pitchHz = -2;      // Firm, grounded caution
        pauseMs = 260;
      } else if (isPositiveHook) {
        // Example A: Positive, engaging salary/recruitment hook
        role = 'positive_hook';
        arcPhase = 'HOOK_ENGAGEMENT';
        badgeGuj = '↗️ ઉત્સાહપૂર્ણ હૂક & ધ્યાન આકર્ષણ';
        ratePercent += 8;  // Energetic momentum
        pitchHz = 6;       // Smiling, warm, confident projection
        pauseMs = 260;
      } else if (isOfficialDecision && positionRatio < 0.6) {
        role = 'major_announcement';
        arcPhase = 'CLIMAX_ANNOUNCEMENT';
        badgeGuj = '🏛️ સત્તાવાર મંજૂરી & મોટો નિર્ણય';
        ratePercent += 4;
        pitchHz = 4;
        pauseMs = 240;
      } else if (hasNumbers) {
        role = 'dense_data';
        arcPhase = 'FACTUAL_DETAILS';
        badgeGuj = '📊 આંકડાકીય વિગત (સચોટ & સ્પષ્ટ)';
        ratePercent -= 8;  // Deliberately measured for data clarity
        pitchHz = -1;      // Grounded, reassuring pitch
        pauseMs = 240;
      } else if (isEligibility) {
        role = 'eligibility_rules';
        arcPhase = 'PRACTICAL_GUIDELINES';
        badgeGuj = '📋 નિયમો & પાત્રતા શરતો';
        ratePercent -= 4;
        pitchHz = 1;
        pauseMs = 200;
      } else if (isTransition) {
        role = 'transition';
        arcPhase = 'BRIDGE_TRANSITION';
        badgeGuj = '➡️ વિષય સંક્રમણ (બ્રિજ)';
        ratePercent += 2;
        pitchHz = 3;
        pauseMs = 200;
      } else if (isClosing) {
        role = 'warm_closing';
        arcPhase = 'HEARTFELT_OUTRO';
        badgeGuj = '🤝 ઉષ્માભર્યો ઉપસંહાર & વિનંતી';
        ratePercent += 4;
        pitchHz = 3;
        pauseMs = 0;
      } else {
        role = 'balanced_statement';
        arcPhase = 'NARRATIVE_FLOW';
        badgeGuj = 'સ્વસ્થ પ્રસ્તુતિ';
        ratePercent += 0;
        pitchHz = 2;
        pauseMs = 200;
      }

      // Bound rates and pitches safely within TTS vocoder range
      ratePercent = Math.max(-14, Math.min(22, ratePercent));
      pitchHz = Math.max(-5, Math.min(9, pitchHz));

      const pitchStr = pitchHz >= 0 ? `+${pitchHz}Hz` : `${pitchHz}Hz`;
      const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;
      const devanagariText = gujaratiToDevanagari(sentence);

      analyzedSentences.push({
        id: index + 1,
        text: sentence,
        devanagariText,
        role,
        arcPhase,
        badgeGuj,
        pitchHz,
        pitch: pitchStr,
        ratePercent,
        rate: rateStr,
        volume: '+0%',
        pauseMs
      });
    });

    // 5. Build Distinct Dramatic Actor Beats
    // Sentences with DIFFERENT emotional intentions are strictly separated so the voice switches performance!
    const thoughtUnits = this.groupIntoDramaticActorBeats(cleanedText, context, userSpeedOffset, analyzedSentences);

    return {
      success: true,
      context,
      totalSentences: analyzedSentences.length,
      originalText: rawText,
      cleanedText,
      sentences: analyzedSentences,
      thoughtUnits
    };
  }

  /**
   * Stage C: Groups sentences into Distinct Dramatic Actor Beats.
   * Crucial Principle: When the emotional intention changes (e.g. from Positive Hook to Serious Caveat,
   * or from Factual Details to an Audience Question), it MUST create an independent performance beat.
   * Only sentences sharing the exact same role and compatible tone are allowed to be merged.
   */
  groupIntoDramaticActorBeats(cleanedText, context, userSpeedOffset, analyzedSentences = []) {
    if (!analyzedSentences || analyzedSentences.length === 0) {
      return [];
    }

    const thoughtUnits = [];
    let currentBeatSentences = [];
    let currentRole = null;

    analyzedSentences.forEach((s, idx) => {
      // Determine if this sentence requires its own distinct dramatic beat
      const isStandoutRole = (
        s.role === 'serious_caveat' ||
        s.role === 'audience_question' ||
        s.role === 'firm_warning' ||
        s.role === 'positive_hook' ||
        s.role === 'warm_closing'
      );

      // If role changes or is a standout dramatic shift, flush current beat
      if (currentBeatSentences.length > 0 && (s.role !== currentRole || isStandoutRole)) {
        thoughtUnits.push(this._createBeatUnit(thoughtUnits.length + 1, currentBeatSentences, idx === analyzedSentences.length));
        currentBeatSentences = [];
      }

      currentBeatSentences.push(s);
      currentRole = s.role;

      // If standalone standout beat, flush immediately so it remains pure
      if (isStandoutRole) {
        thoughtUnits.push(this._createBeatUnit(thoughtUnits.length + 1, currentBeatSentences, idx === analyzedSentences.length - 1));
        currentBeatSentences = [];
        currentRole = null;
      }
    });

    if (currentBeatSentences.length > 0) {
      thoughtUnits.push(this._createBeatUnit(thoughtUnits.length + 1, currentBeatSentences, true));
    }

    return thoughtUnits;
  }

  _createBeatUnit(id, sentencesList, isLast) {
    const primarySentence = sentencesList[0];
    const combinedText = sentencesList.map(s => s.text).join(' ');

    return {
      id,
      text: combinedText,
      devanagariText: gujaratiToDevanagari(combinedText),
      role: primarySentence.role,
      arcPhase: primarySentence.arcPhase,
      badgeGuj: primarySentence.badgeGuj,
      pitch: primarySentence.pitch,
      rate: primarySentence.rate,
      ratePercent: primarySentence.ratePercent,
      pitchHz: primarySentence.pitchHz,
      volume: primarySentence.volume || '+0%',
      pauseAfterMs: isLast ? 0 : primarySentence.pauseMs
    };
  }

  /**
   * Backwards-compatible wrapper that returns full actor package
   */
  prepareActorScript(rawText, options = {}) {
    const analysis = this.analyzeScript(rawText, options);
    if (!analysis.success) return analysis;

    let ssmlInner = '';
    let actorSpacedScript = '';

    analysis.thoughtUnits.forEach((u, idx) => {
      ssmlInner += `<prosody pitch="${u.pitch}" rate="${u.rate}">${u.text}</prosody>\n<break time="${u.pauseAfterMs}ms"/>\n`;
      const punct = (u.text.endsWith('.') || u.text.endsWith('!') || u.text.endsWith('?')) ? '' : '.';
      actorSpacedScript += u.text + punct + (idx < analysis.thoughtUnits.length - 1 ? '\n\n' : '');
    });

    const masterActorPrompt = this.generateMasterVoiceActorPrompt({
      mainTopic: options.mainTopic || analysis.context.nameGuj,
      style: options.style || analysis.context.category,
      cleanedText: analysis.cleanedText,
      totalSentences: analysis.totalSentences,
      contextBadge: analysis.context.badgeGuj
    });

    return {
      success: true,
      context: analysis.context,
      originalText: rawText,
      cleanedText: analysis.cleanedText,
      cleanSpokenText: analysis.cleanedText,
      actorSpacedScript: actorSpacedScript.trim(),
      ssmlInner: ssmlInner.trim(),
      actorSentences: analysis.sentences,
      sentences: analysis.sentences,
      thoughtUnits: analysis.thoughtUnits,
      totalSentences: analysis.totalSentences,
      defaultStylePitch: analysis.thoughtUnits[0]?.pitch || '+4Hz',
      defaultStyleRateOffset: analysis.context.baseRateOffset,
      masterActorPrompt
    };
  }

  /**
   * Generates the Master Actor Prompt for NotebookLM / ElevenLabs Projects / ChatGPT Voice
   */
  generateMasterVoiceActorPrompt(options = {}) {
    const {
      mainTopic = 'સત્તાવાર સરકારી પરિપત્ર અને ભરતી',
      style = 'recruitment_announcement',
      cleanedText = '',
      contextBadge = '📢 સરકારી ભરતી જાહેરાત'
    } = options;

    return `# MASTER PROMPT: SCRIPT-AWARE HUMAN ACTING VOICE ENGINE

## ભૂમિકા (Your Role):
તમે એક પ્રખ્યાત ગુજરાતી વૉઇસ એક્ટર અને ન્યૂઝ પ્રેઝન્ટર છો. સ્ક્રિપ્ટ માત્ર વાંચવાની નથી, પરંતુ તેના વાસ્તવિક અર્થ અને ભાવપ્રવાહ મુજબ જીવંત અવાજમાં અભિનય કરવાનો છે.

## વિષય અને શૈલી (Topic & Genre):
- શૈલી: ${contextBadge}
- વિષય: ${mainTopic}

## અભિનય માર્ગદર્શિકા (Voice Acting Directives):
1. **નાટકીય આરોહ-અવરોહ (Dramatic Prosody Arc)**:
   - ખુશખબર કે હૂકમાં ઉત્સાહપૂર્ણ અને આકર્ષક આરોહ (+6Hz).
   - અનિશ્ચિત સમાચાર કે ગંભીર બાબતોમાં ગંભીર, ધીમી અને નીચી પિચ (-4Hz).
   - ચેતવણી કે છેલ્લી તારીખમાં દમદાર અને સાવચેતીભરી વાણી (-2Hz).
   - પ્રશ્નો પૂછતી વખતે કુદરતી પ્રશ્નાર્થ લહેકો (+8Hz).
2. **આંકડા અને નાણાકીય રકમ (Numbers & Precision)**:
   - રૂપિયા, તારીખ, ટકાવારી અને ખાલી જગ્યાઓના આંકડા બોલતી વખતે ગતિ સહેજ ધીમી કરો અને સ્પષ્ટ શબ્દોમાં બોલો.
3. **કુદરતી શ્વાસ વિરામ (Natural Breathing Pauses)**:
   - રોબોટિક કે ખેંચાયેલા અવાજ વગર, ૨૪૦ થી ૩૦૦ મિલિસેકન્ડના કુદરતી વિરામ સાથે અસ્ખલિત પ્રવાહ જાળવો.

---

## સ્ક્રિપ્ટ લખાણ (Spoken Script to Narrate):
${cleanedText || 'અહીં સ્ક્રિપ્ટ લખાણ આવશે...'}
`;
  }
}

module.exports = new VoiceActorService();
