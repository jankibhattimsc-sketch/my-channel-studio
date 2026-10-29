import 'dart:typed_data';
import 'package:flutter/foundation.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart';
import 'voice_actor_service.dart';

class SlideVoiceoverItem {
  final int slideNumber;
  String title;
  String visual;
  String content;
  String timing;

  SlideVoiceoverItem({
    required this.slideNumber,
    required this.title,
    required this.visual,
    required this.content,
    this.timing = '01:00 - 02:00',
  });
}

class SlidePromptItem {
  final int slideNumber;
  final String title;
  final String visual;
  final String content;
  final String promptText;
  final String estimatedDuration;
  final int recommendedWords;
  final String explanationDepth;

  SlidePromptItem({
    required this.slideNumber,
    required this.title,
    required this.visual,
    required this.content,
    required this.promptText,
    required this.estimatedDuration,
    required this.recommendedWords,
    this.explanationDepth = 'detailed',
  });
}

class SlideVoiceoverResult {
  final bool success;
  final String topic;
  final int slideCount;
  final String masterPrompt;
  final String preRenderedScript;
  final List<SlidePromptItem> slidePrompts;
  final String allPromptsText;
  final String allInOneScriptPrompt;
  final String explanationDepth;

  SlideVoiceoverResult({
    required this.success,
    required this.topic,
    required this.slideCount,
    required this.masterPrompt,
    required this.preRenderedScript,
    this.slidePrompts = const [],
    this.allPromptsText = '',
    this.allInOneScriptPrompt = '',
    this.explanationDepth = 'detailed',
  });
}

class SlideVoiceoverService {
  static String detectCategory(String text) {
    final t = text.toLowerCase();
    if (t.contains('આંગણવાડી') || t.contains('તેડાગર') || t.contains('માનદવેતન') || t.contains('anganwadi')) {
      return 'anganwadi';
    }
    if (t.contains('ભરતી') || t.contains('પોલીસ') || t.contains('કોન્સ્ટેબલ') || t.contains('lrd') || t.contains('recruitment') || t.contains('ojas') || t.contains('જગ્યાઓ') || t.contains('ખાલી જગ્યા') || t.contains('વયમર્યાદા') || t.contains('શારીરિક કસોટી')) {
      return 'recruitment';
    }
    if (t.contains('da') || t.contains('મોંઘવારી') || t.contains('પગાર') || t.contains('પેન્શન') || t.contains('salary') || t.contains('arrears') || t.contains('૭મું પગારપંચ') || t.contains('કર્મચારી')) {
      return 'salary_da';
    }
    if (t.contains('યોજના') || t.contains('સહાય') || t.contains('કિસાન') || t.contains('સબસિડી') || t.contains('ખેડૂત') || t.contains('ikhedut') || t.contains('scheme')) {
      return 'scheme';
    }
    if (t.contains('tet') || t.contains('tat') || t.contains('ટાટ') || t.contains('ટેટ') || t.contains('પરીક્ષા') || t.contains('બોર્ડ') || t.contains('રીઝલ્ટ') || t.contains('gseb') || t.contains('સિલેબસ') || t.contains('કટઓફ')) {
      return 'education';
    }
    return 'general';
  }

  static SlidePromptItem generateSingleSlidePrompt({
    required SlideVoiceoverItem slide,
    required int index,
    required int totalSlides,
    String overallTopic = '',
    String targetAudience = 'ગુજરાતના સરકારી કર્મચારીઓ, ઉમેદવારો અને નાગરિકો',
    String explanationDepth = 'detailed',
  }) {
    final slideNum = slide.slideNumber;
    final isFirst = (index == 0);
    final isLast = (index == totalSlides - 1);
    final isSingle = (totalSlides <= 1);
    final cat = detectCategory('${slide.title} $overallTopic ${slide.content}');

    int targetWords = 150;
    String durationText = '1 - 1.5 મિનિટ';
    String depthGuidance = 'Detailed explanation (~130-180 words, estimated speaking duration 1-1.5 minutes). Provide balanced, informative coverage of each point with clear explanations and practical context.';

    if (explanationDepth == 'short') {
      targetWords = 75;
      durationText = '30 - 45 સેકન્ડ';
      depthGuidance = 'Short explanation (~60-90 words, estimated speaking duration 30-45 seconds). Explain the core essence crisply without unnecessary preamble.';
    } else if (explanationDepth == 'extended') {
      targetWords = 250;
      durationText = '2 - 2.5 મિનિટ';
      depthGuidance = 'Extended educational explanation (~200-300 words, estimated speaking duration 2-2.5 minutes). Provide comprehensive, in-depth breakdown of every sub-point, practical calculation/examples, background context, and clear rationale.';
    }

    String domainInstructions = '';
    if (cat == 'salary_da') {
      domainInstructions = '''• Clarify 7th Pay Commission percentage (e.g. 4% DA hike), effective date (e.g. retrospective from July), and cash arrear distribution.
• Differentiate basic salary from gross pay; explain grade-pay / pay-band impacts (Class-3 and Class-4).
• Reference official Gujarat Finance Department Government Resolutions (GRs) and finance.gujarat.gov.in.''';
    } else if (cat == 'recruitment') {
      domainInstructions = '''• Clarify sanctioned vacancies, official advertisement number, education criteria, and age limits.
• Explain the official application flow on OJAS (ojas.gujarat.gov.in) and exam syllabus/stages (prelims/mains/physical ground test).
• Explicitly caution viewers against fake social media rumors and unverified WhatsApp cutoffs.''';
    } else if (cat == 'scheme') {
      domainInstructions = '''• Outline the exact beneficiary criteria, subsidy/assistance amount, and key documents (7/12, Aadhaar, bank passbook).
• Explain the step-by-step application process on official portals like iKhedut (ikhedut.gujarat.gov.in) or Digital Gujarat.
• Clearly distinguish confirmed government assistance from hypothetical estimates.''';
    } else if (cat == 'education') {
      domainInstructions = '''• Outline subject-wise syllabus, GCERT/NCERT reference books, paper pattern, marking scheme, and passing criteria.
• Explain strategic preparation tips for Gujarati candidates without generic platitudes.''';
    } else {
      domainInstructions = '''• Clearly explain official procedures, eligibility, timelines, and verifiable facts.
• Use authentic examples relevant to Gujarat citizens and students.''';
    }

    String transitionInstructions = '';
    if (isSingle) {
      transitionInstructions = '''• Standalone Slide: Begin with a strong, relevant 10-15 second opening hook.
• Closing: Conclude with a clear summary and call-to-action to check official documents on Gyan Yatra App.''';
    } else if (isFirst) {
      transitionInstructions = '''• Opening Hook: Begin with an engaging 15-20 second opening hook that introduces the entire presentation's core significance for the viewer.
• Transition to Next Slide: End this slide's explanation with a seamless bridge sentence leading directly into Slide ${slideNum + 1} (e.g., "હવે આનાથી તમારા પગારમાં કેટલો વધારો થશે અથવા આગળની લાયકાત શું છે, ચાલો આગલી સ્લાઇડમાં સમજીએ.").''';
    } else if (isLast) {
      transitionInstructions = '''• Transition from Previous Slide: Begin with a natural connecting phrase from Slide ${slideNum - 1} without repeating the overall video introduction.
• Closing: Conclude this final slide with a powerful Concluding wrap-up of key takeaways, and a clear call-to-action (like, subscribe, download official notification PDF from Gyan Yatra App).''';
    } else {
      transitionInstructions = '''• Transition from Previous Slide: Begin with a natural spoken link from Slide ${slideNum - 1} (e.g., "હવે પાત્રતા સમજ્યા પછી, સૌથી મહત્વની બાબત છે..."). DO NOT repeat the video introduction.
• Transition to Next Slide: Conclude with a natural curiosity-driven bridge sentence leading into Slide ${slideNum + 1}.''';
    }

    final prompt = '''SLIDE $slideNum — SCRIPT GENERATION PROMPT

Slide heading: ${slide.title}

Slide information:
• Screen Visual / Document / Table: ${slide.visual}
• Key Statements & Bullet Points:
${slide.content}
• Timing & Sequence: Slide $slideNum of $totalSlides (Expected duration: ${slide.timing})
• Intended Audience: $targetAudience

Script-writing instructions:
1. Write a complete, natural, informative, and engaging word-for-word spoken voice-over script for this slide based strictly on the slide information above.
2. Explain every important point in the slide clearly. Expand short bullet points into meaningful, well-organized spoken sentences.
3. Explain technical terms, processes, eligibility criteria, statistics, and examples where relevant:
$domainInstructions
4. Coherent Presentation Flow:
$transitionInstructions
5. Clean Spoken Output: Write ONLY the words to be spoken aloud into the microphone. DO NOT include bracketed production notes (like [હસો], [પોઝ], [Music]), speaker labels, or heading tags inside the spoken script text.

Language and tone:
• Natural, fluent, grammatically correct spoken Gujarati (conversational yet authoritative).
• Sound like an experienced Gujarati YouTube educator or credible news presenter speaking directly to viewers, NOT reading textbook bullet points.
• Use easy-to-pronounce sentences with natural phrasing and appropriate pauses.
• Avoid awkward literal machine translations; pronounce common English technical terms naturally in Gujarati context.

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
• Explanation Depth: $depthGuidance
• Recommended Spoken Word Count: ~$targetWords words (spoken at natural Gujarati rate of ~130 words/minute).
• Focus on substance and clarity rather than inflating length with filler words.

Final instruction:
Write the complete word-for-word spoken voice-over script for this slide, ready for recording.''';

    return SlidePromptItem(
      slideNumber: slideNum,
      title: slide.title,
      visual: slide.visual,
      content: slide.content,
      promptText: prompt,
      estimatedDuration: durationText,
      recommendedWords: targetWords,
      explanationDepth: explanationDepth,
    );
  }

  static SlideVoiceoverResult generateMasterPrompt({
    required List<SlideVoiceoverItem> slides,
    String overallTopic = '',
    String targetAudience = 'ગુજરાતના સરકારી કર્મચારીઓ, ઉમેદવારો અને નાગરિકો',
    String explanationDepth = 'detailed',
  }) {
    final validSlides = slides.isNotEmpty
        ? slides
        : [
            SlideVoiceoverItem(
              slideNumber: 1,
              title: 'ગુજરાત સરકાર કર્મચારી ૭મા પગારપંચ DA વધારો અને એરિયર્સ નિયમો',
              visual: 'ગાંધીનગર સચિવાલય ઠરાવ / સત્તાવાર પરિપત્ર',
              content: '• ૭મા પગારપંચ મુજબ મોંઘવારી ભથ્થામાં ૪% સીધો વધારો મંજૂર\n• પાછલી અસરથી એટલે કે જુલાઈથી અમલ થશે\n• બાકી રહેલા મહિનાઓનો રોકડ તફાવત એરિયર્સ તરીકે ખાતામાં જમા',
              timing: '00:00 - 01:30',
            ),
          ];

    final mainTopic = (overallTopic.trim().isNotEmpty
            ? overallTopic.trim()
            : validSlides.first.title)
        .trim();

    final isMulti = validSlides.length > 1;

    // 1. Generate individual slide prompts
    final slidePrompts = validSlides.asMap().entries.map((entry) {
      return generateSingleSlidePrompt(
        slide: entry.value,
        index: entry.key,
        totalSlides: validSlides.length,
        overallTopic: mainTopic,
        targetAudience: targetAudience,
        explanationDepth: explanationDepth,
      );
    }).toList();

    // 2. Combine all prompts for 1-click Copy All with Master Step 1 Header
    final joinedPrompts = slidePrompts.map((sp) => sp.promptText).join('\n\n============================================================\n\n');
    final allPromptsText = '# GYAN YATRA — COMPLETE SLIDE-WISE SCRIPT PROMPTS (READ FULL PDF FIRST)\n'
        'સર્વોચ્ચ આદેશ: સ્ક્રિપ્ટ લખતા પહેલા અપલોડ કરેલી આખી PDF / સત્તાવાર પરિપત્ર સંપૂર્ણ વાંચો. ત્યારબાદ નીચે દર્શાવેલી દરેક સ્લાઇડ માટે ક્રમબદ્ધ સંપૂર્ણ શબ્દશઃ ગુજરાતી સ્ક્રિપ્ટ તૈયાર કરો.\n\n'
        '============================================================\n\n'
        '$joinedPrompts';

    // 3. Generate legacy master prompt (preserving 7-section structure and tests)
    final slidesContext = validSlides.asMap().entries.map((entry) {
      final s = entry.value;
      return '''------------------------------------------------------------
📌 [સ્લાઇડ ${s.slideNumber}]: "${s.title}"
📷 સ્ક્રીન પર દેખાતો વિઝ્યુઅલ / ફોટો / ડેટા ટેબલ: ${s.visual}
📝 સ્લાઇડ પરના મહત્વપૂર્ણ મુદ્દાઓ અને આંકડા:
${s.content}
⏱️ અપેક્ષિત સમયગાળો: ${s.timing}
------------------------------------------------------------''';
    }).join('\n\n');

    final promptText = '''# MASTER PROMPT: GYAN YATRA — SLIDE-BY-SLIDE GUJARATI YOUTUBE VOICEOVER SCRIPT EXPERT

તમે YouTube ચેનલ "Gyan Yatra" માટે વરિષ્ઠ ગુજરાતી સ્ક્રિપ્ટ રાઇટર, શૈક્ષણિક સંશોધક, ઓડિયન્સ રીટેન્શન સ્પેશિયાલિસ્ટ અને વોઇસઓવર સ્ક્રિપ્ટ એડિટર છો.

નીચે મારી PPT સ્લાઇડ્સની તમામ વિગતો આપેલી છે. આ સ્લાઇડ્સનું સંપૂર્ણ વિશ્લેષણ કરીને માઇક્રોફોન સામે સીધું બોલી શકાય તેવી શબ્દશઃ ગુજરાતી સ્ક્રિપ્ટ (Word-for-Word Spoken Gujarati Voiceover Script) તૈયાર કરો.

============================================================
🎯 મુખ્ય વિષય (OVERALL TOPIC): "$mainTopic"
👥 લક્ષિત દર્શકો: $targetAudience
🏷️ ચેનલ: "Gyan Yatra" (અને "Gyan Yatra App")
📊 સ્લાઇડ્સની કુલ સંખ્યા: ${validSlides.length} સ્લાઇડ્સ
============================================================

📋 મારી PPT સ્લાઇડ્સનો ડેટા (INPUT SLIDES):
$slidesContext

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

${isMulti ? '''============================================================
🎬 સંપૂર્ણ વિડીયો ફ્લો (COMPLETE VIDEO FLOW REQUIRED):
A. ૨૦-૩૦ સેકન્ડનો દમદાર ઓપનિંગ હૂક (Strong Hook)
B. વિષયનો ટૂંકો પરિચય અને મહત્વ
C. દરેક સ્લાઇડ માટે નીચે દર્શાવેલ ચોક્કસ ૭-સ્તરીય ફોર્મેટ
D. સ્લાઇડ્સ વચ્ચે સહજ ટ્રાન્ઝિશન
E. અંતિમ નિષ્કર્ષ અને Gyan Yatra App & સબ્સ્ક્રાઇબ માટેનો CTA
F. અંતિમ ફેક્ટ-ચેક ચેકલિસ્ટ
============================================================''' : ''}

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

હવે ઉપરોક્ત નિયમો મુજબ સ્લાઇડ્સનું વિશ્લેષણ કરીને સંપૂર્ણ ગુજરાતી વોઇસઓવર સ્ક્રિપ્ટ આપો:''';

      final allInOneScriptPrompt = '''# 🎯 GYAN YATRA MASTER PROMPT: ALL-IN-ONE GUJARATI SCRIPT (READ FULL PDF FIRST)
(સર્વોચ્ચ આદેશ: પહેલા અપલોડ કરેલી આખી PDF સંપૂર્ણ વાંચો + બધી સ્લાઇડ્સ માટે એકસાથે જ શબ્દશઃ સ્ક્રિપ્ટ આપો)

તમે YouTube ચેનલ "Gyan Yatra" માટે વરિષ્ઠ શિક્ષણવિદ્, સત્તાવાર પરિપત્ર વિશ્લેષક, પરીક્ષા ફેકલ્ટી અને પ્રોફેશનલ YouTube સ્ક્રિપ્ટ રાઇટર છો.
મારી YouTube ચેનલ માટે નીચે આપેલી તમામ ${validSlides.length} સ્લાઇડ્સ અને જોડાયેલા સત્તાવાર દસ્તાવેજના આધારે શરૂઆતથી અંત સુધી માઇક્રોફોન સામે સીધું બોલી શકાય તેવી શબ્દશઃ (Word-for-Word) સંપૂર્ણ ગુજરાતી સ્ક્રિપ્ટ તૈયાર કરો.

============================================================
🎯 મુખ્ય વિષય (OVERALL TOPIC): "$mainTopic"
👥 લક્ષિત દર્શકો: $targetAudience
🏷️ બ્રાન્ડિંગ: "Gyan Yatra" YouTube Channel અને "Gyan Yatra App" (સત્તાવાર પરિપત્ર PDF & મોક ટેસ્ટ)
📊 સ્લાઇડ્સની કુલ સંખ્યા: ${validSlides.length} સ્લાઇડ્સ
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
$slidesContext

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

હવે ઉપરોક્ત આદેશ મુજબ પહેલા અપલોડ કરેલી આખી PDF / દસ્તાવેજ સંપૂર્ણ વાંચીને સ્લાઇડ ૧ થી છેલ્લી સ્લાઇડ સુધીની એકસાથે સંપૂર્ણ ગુજરાતી સ્ક્રિપ્ટ આપો:''';

    final preRendered = validSlides.asMap().entries.map((entry) {
      final idx = entry.key;
      final s = entry.value;
      final isFirst = (idx == 0);
      final isLast = (idx == validSlides.length - 1);

      final narration = isFirst
          ? 'નમસ્તે ગુજરાતના તમામ દર્શક ભાઈઓ-બહેનો! આજના વિડીયોમાં આપણે "${s.title}" વિશે રાજ્ય સરકારના સત્તાવાર પરિપત્ર મુજબ સાચી માહિતી મેળવીશું. અહીં સ્લાઇડમાં દર્શાવેલ વિગતો સોશિયલ મીડિયાની કોઈપણ અફવાઓ વગર સીધી સત્તાવાર સ્ત્રોત આધારિત છે.'
          : 'હવે સ્લાઇડ પર દર્શાવેલા આ મહત્વપૂર્ણ નિયમો અને વિગતો ખાસ નોંધી લો. સાચી પાત્રતા ધરાવતા તમામ નાગરિકોને આનો સીધો લાભ મળશે.';

      return '''### SLIDE ${s.slideNumber}: ${s.title}

**1. Slide Understanding**
- **Main topic:** ${s.title}
- **Main message:** ${s.title}
- **Target audience:** $targetAudience
- **Most important information:** સત્તાવાર પરિપત્ર અને નિયમો
- **Any factual concern or missing detail:** સત્તાવાર સરકારી નોટિફિકેશન મુજબ જ વિગતો માન્ય રાખવી.

**2. Audience Retention Objective**
દર્શકને સાચી, પુરાવા સાથેની માહિતી આપવી જેથી તેઓ અફવાઓથી બચે અને આગળનો વિડીયો ધ્યાનથી જુએ.

**3. Word-for-Word Gujarati Voiceover Script**
> "$narration"

**4. Optional Voice Delivery Notes**
• 'સત્તાવાર નિર્ણય' અને મહત્વપૂર્ણ આંકડા પર ભાર આપવો.
• વાક્યો વચ્ચે ૧ સેકન્ડનો યોગ્ય વિરામ રાખવો.

**5. On-Screen Highlight Suggestions**
1. **"${s.title}"** — સ્લાઇડ હેડિંગ બોક્સ હાઇલાઇટ કરવું.
2. **"સત્તાવાર પરિપત્ર"** — સત્તાવાર સરકારી ઠરાવ નીચે અંડરલાઇન કરવી.
3. **"મહત્વપૂર્ણ આંકડા"** — સ્ક્રીન પર એરોથી દર્શાવવા.

**6. Fact-Check and Sources**
• દાવા: સત્તાવાર પરિપત્ર આધારિત (ચકાસાયેલ - Confirmed).
• સત્તાવાર પોર્ટલ: ગુજરાત સરકાર સત્તાવાર વેબસાઇટ.

**7. Transition to the Next Slide**
> "${isLast ? 'આજના આ મહત્વપૂર્ણ પરિપત્રની પીડીએફ મેળવવા Gyan Yatra App ડાઉનલોડ કરો અને ચેનલને સબ્સ્ક્રાઇબ કરો.' : 'હવે આ વિષયની સૌથી અગત્યની વ્યવહારુ ગણતરી અને નિયમો ચાલો આગળની સ્લાઇડમાં સમજીએ.'}"''';
    }).join('\n\n---\n\n');

    return SlideVoiceoverResult(
      success: true,
      topic: mainTopic,
      slideCount: validSlides.length,
      masterPrompt: promptText,
      preRenderedScript: preRendered,
      slidePrompts: slidePrompts,
      allPromptsText: allPromptsText,
      allInOneScriptPrompt: allInOneScriptPrompt,
      explanationDepth: explanationDepth,
    );
  }

  /// Extracts full text from PDF bytes directly on-device using pure Dart Syncfusion PDF (100% offline)
  static String extractTextFromPdfBytes(Uint8List bytes) {
    if (bytes.isEmpty) return '';
    try {
      final PdfDocument document = PdfDocument(inputBytes: bytes);
      final String text = PdfTextExtractor(document).extractText();
      document.dispose();
      return text.trim();
    } catch (e) {
      debugPrint('[SlideVoiceoverService] PDF extraction notice: $e');
      return '';
    }
  }

  /// Analyzes PDF text, topic hint, and filename to extract confirmed details
  static Map<String, dynamic> analyzePdfSubjectAndDetails({
    String fullPdfText = '',
    String topicHint = '',
    String filename = '',
  }) {
    final combined = '$fullPdfText $topicHint $filename'.toLowerCase();
    final rawCombined = '$fullPdfText $topicHint $filename';

    // 1. Extract Subject / Topic directly from PDF text
    String subject = '';
    final subjectReg = RegExp(
      r'(?:વિષય|Subject|બાબત)[\s:–-]+([^\n\r।]+(?:\n[^\n\r।]+)?)',
      caseSensitive: false,
    );
    final subjectMatch = subjectReg.firstMatch(fullPdfText);
    if (subjectMatch != null && subjectMatch.group(1) != null) {
      String candidate = subjectMatch.group(1)!.trim();
      // Remove trailing "સંદર્ભ:" or "વાંચાણ:" if it leaked in
      candidate = candidate.split(RegExp(r'(?:સંદર્ભ|વાંચાણ|પરિપત્ર|ઠરાવ|Reference)[\s:–-]'))[0].trim();
      candidate = candidate.replaceAll(RegExp(r'\s+'), ' ');
      if (candidate.length >= 6) {
        subject = candidate;
      }
    }

    // Fallback: search for prominent lines with keywords
    if (subject.isEmpty && fullPdfText.trim().isNotEmpty) {
      final lines = fullPdfText
          .split('\n')
          .map((l) => l.trim())
          .where((l) => l.length >= 8 && l.length <= 160)
          .where((l) => !l.contains('ગુજરાત સરકાર') && !l.contains('સચિવાલય') && !l.contains('ગાંધીનગર') && !l.startsWith('પેજ') && !l.startsWith('Page'))
          .toList();
      for (final line in lines) {
        if (line.contains('ભરતી') || line.contains('જાહેરાત') || line.contains('ઠરાવ') || line.contains('પરિપત્ર') || line.contains('યોજના') || line.contains('પગાર') || line.contains('મોંઘવારી') || line.contains('માનદવેતન') || line.contains('પરીક્ષા')) {
          subject = line;
          break;
        }
      }
    }

    // Fallback from filename or topicHint
    if (subject.isEmpty) {
      if (filename.trim().isNotEmpty) {
        subject = filename
            .replaceAll(RegExp(r'\.pdf$', caseSensitive: false), '')
            .replaceAll(RegExp(r'[_-]+'), ' ')
            .trim();
      } else if (topicHint.trim().isNotEmpty && topicHint != 'ગુજરાત સરકાર સત્તાવાર પરિપત્ર અને ભરતી નિર્ણય ૨૦૨૬') {
        subject = topicHint.trim();
      } else {
        subject = 'ગુજરાત સરકાર સત્તાવાર પરિપત્ર નિર્ણય ૨૦૨૬';
      }
    }

    // 2. Detect Category
    final category = detectCategory(combined);
    String categoryGuj = 'સત્તાવાર સરકારી પરિપત્ર & યોજના';
    if (category == 'recruitment') {
      categoryGuj = 'ગુજરાત સરકારી ભરતી & નોટિફિકેશન';
    } else if (category == 'scheme') {
      categoryGuj = 'ખેડૂત સહાય & કિસાન કલ્યાણ યોજના';
    } else if (category == 'salary_da') {
      categoryGuj = '૭મું પગારપંચ & મોંઘવારી ભથ્થું (DA) વધારો';
    } else if (category == 'anganwadi') {
      categoryGuj = 'આંગણવાડી કાર્યકર & તેડાગર માનદવેતન / ભરતી';
    } else if (category == 'education') {
      categoryGuj = 'શિક્ષણ & પરીક્ષા પરિણામ / સિલેબસ';
    }

    // 3. Department Extraction
    String department = 'ગુજરાત સરકાર સત્તાવાર વિભાગ, ગાંધીનગર';
    final deptKeywords = [
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
    for (final dm in deptKeywords) {
      if (rawCombined.contains(dm)) {
        department = dm;
        if (!department.contains('ગાંધીનગર') && !department.contains('ગુજરાત') && !department.contains('સચિવાલય')) {
          department = '$department, ગાંધીનગર સચિવાલય';
        }
        break;
      }
    }
    if (department == 'ગુજરાત સરકાર સત્તાવાર વિભાગ, ગાંધીનગર') {
      if (combined.contains('પોલીસ') || combined.contains('lrd')) {
        department = 'ગૃહ વિભાગ, ગાંધીનગર સચિવાલય';
      } else if (combined.contains('finance') || combined.contains('પગાર') || combined.contains('da') || combined.contains('પેન્શન')) {
        department = 'નાણાં વિભાગ, સચિવાલય, ગાંધીનગર';
      } else if (combined.contains('ખેડૂત') || combined.contains('કિસાન') || combined.contains('ikhedut')) {
        department = 'કૃષિ, ખેડૂત કલ્યાણ અને સહકાર વિભાગ, ગાંધીનગર';
      } else if (combined.contains('આંગણવાડી') || combined.contains('wcd')) {
        department = 'મહિલા અને બાળ વિકાસ વિભાગ (WCD), ગુજરાત રાજ્ય';
      } else if (combined.contains('seb') || combined.contains('gseb')) {
        department = 'શિક્ષણ વિભાગ / રાજ્ય પરીક્ષા બોર્ડ (SEB), ગાંધીનગર';
      } else if (combined.contains('gpssb')) {
        department = 'પંચાયત, ગ્રામ ગૃહ નિર્માણ અને ગ્રામ વિકાસ વિભાગ';
      }
    }

    // 4. GR / Resolution / Advertisement Number Extraction
    String grNumber = '';
    final grReg = RegExp(
      r'(?:ઠરાવ\s*ક્રમાંક|પરિપત્ર\s*ક્રમાંક|જાહેરાત\s*ક્રમાંક|નોટિફિકેશન\s*નંબર|ઓર્ડર\s*નંબર|ક્રમાંક|નંબર|Advt\s*No|GR\s*No)[\s:–-]+([^\n,।]{3,60})',
      caseSensitive: false,
    );
    final grMatch = grReg.firstMatch(rawCombined);
    if (grMatch != null && grMatch.group(0) != null) {
      grNumber = grMatch.group(0)!.trim();
    } else {
      final codeReg = RegExp(r'([A-Z]{2,6}/(?:202\d|૨૦૨\d)/[\d\w-]+|[A-Z]{2,6}-[\d\w-]+|પગર-[\d\w-]+)', caseSensitive: false);
      final codeMatch = codeReg.firstMatch(rawCombined);
      if (codeMatch != null && codeMatch.group(0) != null) {
        grNumber = 'સત્તાવાર ક્રમાંક: ${codeMatch.group(0)!.trim()}';
      } else if (combined.contains('lrd') || combined.contains('પોલીસ')) {
        grNumber = 'જાહેરાત ક્રમાંક: LRD/2026/01';
      } else if (category == 'salary_da') {
        grNumber = 'ઠરાવ ક્રમાંક: પગર/૧૦૨૦૨૬/મ.ભ./નાણાં';
      } else {
        grNumber = 'સત્તાવાર ઠરાવ/પરિપત્ર ક્રમાંક (ચકાસાયેલ)';
      }
    }

    // 5. Portal URL
    String portal = 'gujarat.gov.in';
    if (combined.contains('ojas')) {
      portal = 'ojas.gujarat.gov.in';
    } else if (combined.contains('ikhedut')) {
      portal = 'ikhedut.gujarat.gov.in';
    } else if (combined.contains('digitalgujarat') || combined.contains('digital gujarat')) {
      portal = 'digitalgujarat.gov.in';
    } else if (combined.contains('sebexam') || combined.contains('seb')) {
      portal = 'sebexam.org';
    } else if (combined.contains('finance.gujarat')) {
      portal = 'finance.gujarat.gov.in';
    } else if (combined.contains('gsssb')) {
      portal = 'gsssb.gujarat.gov.in';
    }

    // 6. Dates Extraction
    final dateReg = RegExp(r'\b(?:\d{1,2}[/-]\d{1,2}[/-](?:202\d|૨૦૨\d|\d{2,4})|\d{1,2}(?:મી|જી)?\s+(?:જાન્યુઆરી|ફેબ્રુઆરી|માર્ચ|એપ્રિલ|મે|જૂન|જુલાઈ|ઓગસ્ટ|સપ્ટેમ્બર|ઓક્ટોબર|નવેમ્બર|ડિસેમ્બર)\s*,?\s*(?:202\d|૨૦૨\d))\b');
    final allDates = dateReg.allMatches(rawCombined).map((m) => m.group(0)!).toSet().toList();
    final dates = allDates.take(4).toList();

    // 7. Figures / Amounts / Vacancies
    final figures = <String>[];
    final vacancyReg = RegExp(r'\b(?:\d{1,6}|\d{1,3},\d{3})\s*(?:જગ્યાઓ|જગ્યા|ખાલી જગ્યા|પદો|posts|vacancies)\b', caseSensitive: false);
    final vacancyMatch = vacancyReg.firstMatch(rawCombined);
    if (vacancyMatch != null) figures.add(vacancyMatch.group(0)!.trim());

    final percentReg = RegExp(r'\b\d{1,2}\s*%\s*(?:da|મોંઘવારી|વધારો|સહાય)?\b', caseSensitive: false);
    final percentMatch = percentReg.firstMatch(rawCombined);
    if (percentMatch != null) figures.add(percentMatch.group(0)!.trim());

    final amountReg = RegExp(r'(?:₹|રૂ\.|રૂપિયા)\s*[\d,]+(?:\s*રૂપિયા)?|[\d,]+\s*(?:રૂપિયા|રૂ\.)', caseSensitive: false);
    final amountMatch = amountReg.firstMatch(rawCombined);
    if (amountMatch != null) figures.add(amountMatch.group(0)!.trim());

    // 8. Key Highlights
    final keyHighlights = <String>[];
    if (fullPdfText.trim().isNotEmpty) {
      final lines = fullPdfText.split('\n').map((l) => l.trim()).toList();
      for (final l in lines) {
        if (l.length >= 15 && l.length <= 180) {
          final isRule = l.contains('ઠરાવવામાં આવે છે') ||
              l.contains('મંજૂરી') ||
              l.contains('પાત્રતા') ||
              l.contains('લાયકાત') ||
              l.contains('વયમર્યાદા') ||
              l.contains('અરજી') ||
              l.contains('પગાર') ||
              l.contains('એરિયર્સ') ||
              l.contains('પરીક્ષા') ||
              l.contains('છેલ્લી તારીખ') ||
              l.contains('અમલ');
          final isBullet = l.startsWith('•') || l.startsWith('-') || RegExp(r'^\d+[\.\)]').hasMatch(l);
          if ((isRule || isBullet) && !keyHighlights.contains(l)) {
            keyHighlights.add(l.replaceAll(RegExp(r'^[•\-\*\d\.\)\s]+'), '• '));
            if (keyHighlights.length >= 5) break;
          }
        }
      }
    }
    if (keyHighlights.isEmpty) {
      keyHighlights.addAll([
        '• સત્તાવાર વિભાગ: $department દ્વારા જાહેર થયેલ નિર્ણય',
        '• સંદર્ભ / ઠરાવ ક્રમાંક: $grNumber',
        '• સત્તાવાર પોર્ટલ: $portal પર ચકાસાયેલ',
        if (dates.isNotEmpty) '• મહત્વપૂર્ણ તારીખો: ${dates.join(", ")}',
        if (figures.isNotEmpty) '• મુખ્ય આંકડાકીય વિગત: ${figures.join(", ")}',
      ]);
    }

    return {
      'subject': subject,
      'category': category,
      'categoryGuj': categoryGuj,
      'department': department,
      'grNumber': grNumber,
      'portal': portal,
      'dates': dates,
      'figures': figures,
      'keyHighlights': keyHighlights,
    };
  }

  /// Generates Supreme YouTube Script Prompt specifically tailored to the PDF subject
  static String generateFullPdfMasterPrompt({
    String topic = 'ગુજરાત સરકાર સત્તાવાર પરિપત્ર અને ભરતી નિર્ણય ૨૦૨૬',
    String targetAudience = 'ગુજરાતના ઉમેદવારો, સરકારી કર્મચારીઓ અને નાગરિકો',
    String fullPdfText = '',
    String filename = '',
  }) {
    final analysis = analyzePdfSubjectAndDetails(
      fullPdfText: fullPdfText,
      topicHint: topic,
      filename: filename,
    );
    final activeTopic = (analysis['subject'] as String? ?? '').isNotEmpty
        ? analysis['subject'] as String
        : topic;
    final category = analysis['category'] as String;
    final categoryGuj = analysis['categoryGuj'] as String;
    final department = analysis['department'] as String;
    final grNumber = analysis['grNumber'] as String;
    final portal = analysis['portal'] as String;
    final dates = (analysis['dates'] as List? ?? []).cast<String>();
    final figures = (analysis['figures'] as List? ?? []).cast<String>();
    final keyHighlights = (analysis['keyHighlights'] as List? ?? []).cast<String>();

    String specificSectionGuidance = '';
    String domainSpecificDirectives = '';

    if (category == 'recruitment') {
      specificSectionGuidance = '''### ભાગ ૧: પાવરફુલ ઓપનિંગ હૂક (૦:૦૦ થી ૦:૪૫ સેકન્ડ)
- સ્ક્રીન નિર્દેશ: [સ્ક્રીન પર સત્તાવાર ભરતી નોટિફિકેશન, જાહેરાત ક્રમાંક અને કુલ ખાલી જગ્યાઓ લાલ બોક્સમાં હાઇલાઇટ કરો]
- શબ્દશઃ સ્ક્રિપ્ટ: "નમસ્કાર ગુજરાતના તમામ સ્પર્ધાત્મક પરીક્ષાની તૈયારી કરતા સાથી મિત્રો! $department તરફથી '$activeTopic' અંગે સત્તાવાર જાહેરાત ($grNumber) આવી ચૂકી છે. આજના વિડીયોમાં આપણે કુલ ખાલી જગ્યાઓ, નવો સિલેબસ, દોડ અને OJAS ફોર્મ ભરવાની સંપૂર્ણ વિગત સમજીશું..."

### ભાગ ૨: સત્તાવાર જાહેરાત & જગ્યાઓનું વર્ગીકરણ (૦:૪૫ થી ૨:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [સત્તાવાર ઠરાવ $grNumber અને કેટેગરી-વાઇઝ જગ્યાઓનું ટેબલ દર્શાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: વિભાગ: $department દ્વારા કુલ ખાલી જગ્યાઓ (${figures.isNotEmpty ? figures.join(', ') : 'સત્તાવાર મંજૂર જગ્યાઓ'}), બિન-હથિયારી/હથિયારી પદો અને મહિલા અનામત જગ્યાઓની સત્તાવાર જાહેરાત.

### ભાગ ૩: શૈક્ષણિક લાયકાત અને વયમર્યાદાના કડક નિયમો (૨:૩૦ થી ૫:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [૧૦૦% શુદ્ધ સફેદ સ્લાઇડ પર ધોરણ-૧૨ પાસ / ગ્રેજ્યુએશન અને જન્મ તારીખ કટઓફ દર્શાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: કોણ ફોર્મ ભરી શકશે? વયમર્યાદામાં સરકારી નિયમ મુજબ છૂટછાટ અને અનિવાર્ય પ્રમાણપત્રોના સત્તાવાર નિયમો.

### ભાગ ૪: પસંદગી પદ્ધતિ, શારીરિક કસોટી (ગ્રાઉન્ડ) અને નવો સિલેબસ (૫:૦૦ થી ૭:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [દોડ/ઊંચાઈ/છાતી માપદંડો અને નવો ૨૦૦ ગુણનો OMR/MCQ સિલેબસ ચાર્ટ દર્શાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: શારીરિક કસોટી (દોડ સમય અને ગ્રાઉન્ડ માપદંડ) તથા લેખિત પરીક્ષાના ગુણભારનું સ્પષ્ટ વિશ્લેષણ.

### ભાગ ૫: OJAS પોર્ટલ પર સ્ટેપ-બાય-સ્ટેપ ઓનલાઇન અરજી કરવાની રીત (૭:૩૦ થી ૧૦:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [$portal હોમપેજ અને ફોટો/સહી અપલોડ કરવાના સ્ટેપ્સ]
- શબ્દશઃ સ્ક્રિપ્ટ: ઓનલાઇન ફોર્મ ભરતી વખતે કઈ ભૂલો ન કરવી, ફી ભરવાની પદ્ધતિ અને કન્ફર્મેશન નંબર સાચવવાની રીત.

### ભાગ ૬: અતિ મહત્વપૂર્ણ તારીખો અને સાવચેતી (૧૦:૦૦ થી ૧૧:૧૫ મિનિટ)
- સ્ક્રીન નિર્દેશ: [છેલ્લી તારીખ ${dates.isNotEmpty ? "(${dates.join(', ')})" : ""} અને નોન-ક્રિમીલેયર માન્યતા લાલ રંગમાં બતાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: છેલ્લા દિવસોમાં OJAS સર્વર ડાઉન થવાની સમસ્યા અને છેલ્લી તારીખ પહેલાં અરજી પૂર્ણ કરવાની સાવચેતી.

### ભાગ ૭: અંતિમ માર્ગદર્શન, Gyan Yatra App મોક ટેસ્ટ & CTA (૧૧:૧૫ થી ૧૨:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [Gyan Yatra App ફ્રી મોક ટેસ્ટ & PDF ડાઉનલોડ બટન]
- શબ્દશઃ સ્ક્રિપ્ટ: "સિલેબસ મુજબ ફ્રી મોક ટેસ્ટ આપવા અને ઓરિજિનલ PDF ડાઉનલોડ કરવા આપણી Gyan Yatra App ઇન્સ્ટોલ કરી લેજો. ચેનલને સબ્સ્ક્રાઇબ કરવાનું ભૂલતા નહીં..."''';

      domainSpecificDirectives = '''- વિષય: ગુજરાત સરકારી ભરતી નોટિફિકેશન ($activeTopic)
- પોર્ટલ: $portal
- આ સ્ક્રિપ્ટમાં કોઈ પણ પગાર વધારો કે DA જેવી અસંગત બાબતો ન લખવી. માત્ર ભરતી, સિલેબસ, દોડ અને OJAS ફોર્મ પર જ સંપૂર્ણ ધ્યાન કેન્દ્રિત કરવું.''';

    } else if (category == 'scheme') {
      specificSectionGuidance = '''### ભાગ ૧: પાવરફુલ ઓપનિંગ હૂક (૦:૦૦ થી ૦:૪૫ સેકન્ડ)
- સ્ક્રીન નિર્દેશ: [સ્ક્રીન પર ખેડૂત કલ્યાણ યોજનાનો સત્તાવાર પરિપત્ર અને સહાય રકમનું મોટું બેનર બતાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: "નમસ્તે ખેડૂત મિત્રો! $department દ્વારા '$activeTopic' ($grNumber) અંગે સત્તાવાર જાહેરાત થઈ ગઈ છે. આજના વિડીયોમાં આપણે કોને લાભ મળશે, કેટલી સહાય મળશે અને iKhedut પર ફોર્મ કેવી રીતે ભરવું તે વિગતવાર સમજીશું..."

### ભાગ ૨: કૃષિ વિભાગ સત્તાવાર ઠરાવ અને સહાયનો હેતુ (૦:૪૫ થી ૨:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [$department નો સત્તાવાર ઠરાવ $grNumber હાઇલાઇટ કરો]
- શબ્દશઃ સ્ક્રિપ્ટ: આ યોજના હેઠળ રાજ્યના ખેડૂતોને શું લાભ મળશે અને સરકારી નિર્ણય પાછળની સાચી વિગત.

### ભાગ ૩: કોને મળશે સહાય? પાત્રતાના સત્તાવાર માપદંડો (૨:૩૦ થી ૫:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [૧૦૦% શુદ્ધ સફેદ સ્લાઇડ પર ખાતેદાર ખેડૂત, જમીન શરતો અને ૭/૧૨, ૮-અ પુરાવા યાદી]
- શબ્દશઃ સ્ક્રિપ્ટ: કોણ અરજી કરી શકે? જમીન ખાતાવહી ૭/૧૨ અને ૮-અ ના નિયમો અને કોણ લાભ મેળવી શકશે.

### ભાગ ૪: સહાય રકમ અને DBT ચૂકવણીની ચોક્કસ ગણતરી (૫:૦૦ થી ૭:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [સહાય રકમનું ચોખ્ખું કોષ્ટક ${figures.isNotEmpty ? "(${figures.join(', ')})" : ""} અને બેંક ખાતામાં DBT જમા દર્શાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: લાભાર્થી દીઠ કેટલી સહાય મળશે અને તે સીધી બેંક ખાતામાં DBT મારફતે કઈ રીતે જમા થશે.

### ભાગ ૫: iKhedut પોર્ટલ પર ઓનલાઇન અરજી કરવાની સ્ટેપ-બાય-સ્ટેપ રીત (૭:૩૦ થી ૧૦:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [$portal પર ઓનલાઇન અરજી કરવાના સ્ક્રીનશોટ અને જરૂરી પુરાવા]
- શબ્દશઃ સ્ક્રિપ્ટ: VCE કે ગ્રામ પંચાયત મારફતે અથવા મોબાઈલથી અરજી કરવાની સરળ પદ્ધતિ.

### ભાગ ૬: અતિ મહત્વપૂર્ણ તારીખો અને સાવચેતી (૧૦:૦૦ થી ૧૧:૧૫ મિનિટ)
- સ્ક્રીન નિર્દેશ: [પોર્ટલ બંધ થવાની છેલ્લી તારીખ ${dates.isNotEmpty ? "(${dates.join(', ')})" : ""} બોલ્ડ લાલ અક્ષરોમાં]
- શબ્દશઃ સ્ક્રિપ્ટ: વહેલા તે પહેલાના ધોરણે અરજી કરવાની સૂચના અને સમયમર્યાદા.

### ભાગ ૭: અંતિમ નિષ્કર્ષ અને Gyan Yatra App & CTA (૧૧:૧૫ થી ૧૨:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [Gyan Yatra App ડાઉનલોડ બટન & પરિપત્ર PDF]
- શબ્દશઃ સ્ક્રિપ્ટ: પરિપત્રની PDF ડાઉનલોડ કરવા Gyan Yatra App ઇન્સ્ટોલ કરવા અને વિડીયો અન્ય ખેડૂત ગ્રૂપમાં શેર કરવા જણાવો.''';

      domainSpecificDirectives = '''- વિષય: ખેડૂત સહાય & કિસાન કલ્યાણ યોજના ($activeTopic)
- પોર્ટલ: $portal
- ખેડૂતોને સરળ દેશી ભાષામાં સમજાય તેવી સહજ બોલચાલની વાણી વાપરવી.''';

    } else if (category == 'anganwadi') {
      specificSectionGuidance = '''### ભાગ ૧: પાવરફુલ ઓપનિંગ હૂક (૦:૦૦ થી ૦:૪૫ સેકન્ડ)
- સ્ક્રીન નિર્દેશ: [મહિલા & બાળ વિકાસ વિભાગ (WCD) નો સત્તાવાર પરિપત્ર લાલ બોક્સમાં દર્શાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: "નમસ્તે આંગણવાડી કાર્યકર અને તેડાગર બહેનો! $department તરફથી '$activeTopic' ($grNumber) અંગે મોટો નિર્ણય લેવામાં આવ્યો છે..."

### ભાગ ૨: મહિલા અને બાળ વિકાસ વિભાગ સત્તાવાર ઠરાવ વિગત (૦:૪૫ થી ૨:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [$department ઠરાવ ક્રમાંક: $grNumber]
- શબ્દશઃ સ્ક્રિપ્ટ: સરકાર દ્વારા લેવાયેલા ઐતિહાસિક નિર્ણયની મુખ્ય વિગતો અને સુધારેલા નિયમો.

### ભાગ ૩: પાત્રતા, લાયકાત અને સ્થાનિક રહેવાસી શરતો (૨:૩૦ થી ૫:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [૧૦/૧૨ પાસ શૈક્ષણિક લાયકાત, વયમર્યાદા અને સ્થાનિક રહેવાસી પુરાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: કાર્યકર અને તેડાગર બહેનો માટે શૈક્ષણિક લાયકાત અને સ્થાનિક રહેવાસી દાખલાના નિયમો.

### ભાગ ૪: માનદવેતન સ્લેબ અને મેરિટ ગણતરી પદ્ધતિ (૫:૦૦ થી ૭:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [નવા માસિક માનદવેતન ${figures.isNotEmpty ? "(${figures.join(', ')})" : ""} અને મેરિટ ગુણનું કોષ્ટક દર્શાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: કાર્યકર બહેનો અને તેડાગર બહેનોના માસિક વેતનમાં થયેલો ચોખ્ખો વધારો અને મેરિટ ગણતરી.

### ભાગ ૫: e-HRMS પોર્ટલ પર ઓનલાઇન અરજી કરવાની રીત (૭:૩૦ થી ૧૦:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [સત્તાવાર પોર્ટલ $portal અને ડોક્યુમેન્ટ અપલોડ વિગત]
- શબ્દશઃ સ્ક્રિપ્ટ: ઓનલાઇન પોર્ટલ પર ફોર્મ ભરવાની અને જરૂરી પ્રમાણપત્રો જોડવાની પદ્ધતિ.

### ભાગ ૬: અતિ મહત્વપૂર્ણ તારીખો અને સાવચેતી (૧૦:૦૦ થી ૧૧:૧૫ મિનિટ)
- સ્ક્રીન નિર્દેશ: [અમલ તારીખ ${dates.isNotEmpty ? "(${dates.join(', ')})" : ""} અને એરિયર્સ ચૂકવણી]
- શબ્દશઃ સ્ક્રિપ્ટ: કયા માસના માનદવેતનથી નવો સુધારો લાગુ થશે અને મુદત.

### ભાગ ૭: અંતિમ નિષ્કર્ષ, પરિપત્ર PDF & Gyan Yatra App CTA (૧૧:૧૫ થી ૧૨:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [Gyan Yatra App & પરિપત્ર ડાઉનલોડ]
- શબ્દશઃ સ્ક્રિપ્ટ: પરિપત્રની PDF ડાઉનલોડ કરવા Gyan Yatra App ઇન્સ્ટોલ કરવા જણાવો.''';

      domainSpecificDirectives = '''- વિષય: આંગણવાડી કાર્યકર & તેડાગર માનદવેતન / WCD ભરતી ($activeTopic)
- આદરપૂર્વક અને બહેનોને સીધી રીતે સ્પર્શે તેવી ઉષ્માભરી વાણી વાપરવી.''';

    } else if (category == 'education') {
      specificSectionGuidance = '''### ભાગ ૧: પાવરફુલ ઓપનિંગ હૂક (૦:૦૦ થી ૦:૪૫ સેકન્ડ)
- સ્ક્રીન નિર્દેશ: [રાજ્ય પરીક્ષા બોર્ડ (SEB) / GSEB સત્તાવાર નોટિફિકેશન બતાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: "નમસ્તે તમામ ઉમેદવાર અને વિદ્યાર્થી મિત્રો! $department તરફથી '$activeTopic' ($grNumber) અંગે ખૂબ જ મહત્વપૂર્ણ જાહેરાત આવી ગઈ છે..."

### ભાગ ૨: બોર્ડની સત્તાવાર જાહેરાત અને પરિણામ/સિલેબસ વિગત (૦:૪૫ થી ૨:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [$department સત્તાવાર પરિપત્ર $grNumber]
- શબ્દશઃ સ્ક્રિપ્ટ: પરીક્ષા, ગુણાંકન પદ્ધતિ અને બોર્ડના નિર્ણય વિશેની સાચી હકીકતો.

### ભાગ ૩: કેટેગરી-વાઇઝ પાસિંગ માર્ક્સ & કટઓફ માપદંડ (૨:૩૦ થી ૫:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [જનરલ, EWS, OBC, SC, ST ક્વોલિફાઇંગ સ્ટાન્ડર્ડ ટેબલ]
- શબ્દશઃ સ્ક્રિપ્ટ: કેટલા ગુણ મેળવનાર ઉમેદવાર પાસ ગણાશે અને મેરિટ ગણતરી પદ્ધતિ.

### ભાગ ૪: પ્રોવિઝનલ આન્સર-કી અને વાંધા અરજી પ્રક્રિયા (૫:૦૦ થી ૭:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [વાંધા અરજી ફોર્મ અને પ્રશ્ન દીઠ ફી નિયમ દર્શાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: ખોટા પ્રશ્નો સામે પુરાવા સાથે વાંધો રજૂ કરવાની સ્ટેપ-બાય-સ્ટેપ રીત.

### ભાગ ૫: પરિણામ અને સ્કોરકાર્ડ ડાઉનલોડ કરવાની રીત (૭:૩૦ થી ૧૦:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [$portal પરિણામ લિંક અને હોલ ટિકિટ નંબર એન્ટ્રી]
- શબ્દશઃ સ્ક્રિપ્ટ: સર્વર એરર વગર મોબાઈલમાંથી સ્કોરકાર્ડ ડાઉનલોડ કરવાની સીધી પદ્ધતિ.

### ભાગ ૬: અતિ મહત્વપૂર્ણ તારીખો અને સાવચેતી (૧૦:૦૦ થી ૧૧:૧૫ મિનિટ)
- સ્ક્રીન નિર્દેશ: [તારીખો ${dates.isNotEmpty ? "(${dates.join(', ')})" : ""} અને ડોક્યુમેન્ટ ચકાસણી કેન્દ્રો]
- શબ્દશઃ સ્ક્રિપ્ટ: અસલ પ્રમાણપત્રો સાથે હાજર રહેવા અંગે બોર્ડની સાવચેતી.

### ભાગ ૭: અંતિમ નિષ્કર્ષ અને Gyan Yatra App મોક ટેસ્ટ CTA (૧૧:૧૫ થી ૧૨:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [Gyan Yatra App & સબ્સ્ક્રાઇબ બટન]
- શબ્દશઃ સ્ક્રિપ્ટ: આગળની ભરતી અપડેટ્સ માટે Gyan Yatra ચેનલ સબ્સ્ક્રાઇબ કરવા અપીલ.''';

      domainSpecificDirectives = '''- વિષય: શિક્ષણ, પરીક્ષા પરિણામ & સિલેબસ ($activeTopic)
- પોર્ટલ: $portal
- ઉમેદવારોનો આત્મવિશ્વાસ વધે તેવો શૈક્ષણિક અને ગંભીર અવાજ રાખવો.''';

    } else if (category == 'salary_da') {
      specificSectionGuidance = '''### ભાગ ૧: પાવરફુલ ઓપનિંગ હૂક (૦:૦૦ થી ૦:૪૫ સેકન્ડ)
- સ્ક્રીન નિર્દેશ: [ગાંધીનગર સચિવાલય નાણાં વિભાગ પરિપત્ર લાલ બોક્સમાં હાઈલાઈટ કરો]
- શબ્દશઃ સ્ક્રિપ્ટ: "નમસ્કાર ગુજરાતના તમામ સરકારી કર્મચારી અને પેન્શનર ભાઈઓ-બહેનો! $department દ્વારા '$activeTopic' ($grNumber) અંગે મોટો સત્તાવાર નિર્ણય લેવામાં આવ્યો છે..."

### ભાગ ૨: નાણાં વિભાગ સત્તાવાર ઠરાવ (૦:૪૫ થી ૨:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [$department ઠરાવ ક્રમાંક: $grNumber]
- શબ્દશઃ સ્ક્રિપ્ટ: ૭મા પગારપંચ મુજબ મોંઘવારી ભથ્થામાં થયેલો ચોખ્ખો ટકાવારી વધારો ${figures.isNotEmpty ? "(${figures.join(', ')})" : ""} અને પાછલી અસરથી અમલ.

### ભાગ ૩: વર્ગ-૩ અને વર્ગ-૪ કર્મચારીઓનો ચોખ્ખો પગાર વધારો (૨:૩૦ થી ૫:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [બેઝિક પગાર અને ગ્રેડ-પે મુજબ ચોખ્ખા વધારાનું કોષ્ટક દર્શાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: દર મહિને પગારમાં કેટલા રૂપિયાનો વધારો થશે તેની દાખલા સાથે ચોક્કસ ગણતરી.

### ભાગ ૪: પાછલા મહિનાઓનું રોકડ એરિયર્સ અને હપ્તા વિગત (૫:૦૦ થી ૭:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [એરિયર્સ હપ્તા ચુકવણી સમયપત્રક દર્શાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: બાકી રહેલા મહિનાઓનો રોકડ તફાવત ખાતામાં ક્યારે અને કેટલા હપ્તામાં જમા થશે.

### ભાગ ૫: પેન્શનર્સ માટે મોંઘવારી રાહત (DR) ના નિયમો (૭:૩૦ થી ૧૦:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [ટ્રેઝરી કચેરી પરિપત્ર અને ફેમિલી પેન્શન વધારો]
- શબ્દશઃ સ્ક્રિપ્ટ: નિવૃત્ત પેન્શનરો અને ફેમિલી પેન્શનરોને મળવાપાત્ર લાભો.

### ભાગ ૬: અતિ મહત્વપૂર્ણ તારીખો અને સાવચેતી (૧૦:૦૦ થી ૧૧:૧૫ મિનિટ)
- સ્ક્રીન નિર્દેશ: [પગાર સ્લિપમાં DA કોલમ અને અમલ તારીખ ${dates.isNotEmpty ? "(${dates.join(', ')})" : ""}]
- શબ્દશઃ સ્ક્રિપ્ટ: કયા મહિનાના પગાર સાથે આ વધારો રોકડમાં જમા થઈ જશે તેની તારીખ.

### ભાગ ૭: અંતિમ નિષ્કર્ષ અને પગાર કેલ્ક્યુલેટર CTA (૧૧:૧૫ થી ૧૨:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [Gyan Yatra App પગાર કેલ્ક્યુલેટર]
- શબ્દશઃ સ્ક્રિપ્ટ: આપના ગ્રેડ-પે મુજબ ચોક્કસ ગણતરી કરવા આપણી Gyan Yatra App ડાઉનલોડ કરી લેજો.''';

      domainSpecificDirectives = '''- વિષય: ૭મું પગારપંચ, મોંઘવારી ભથ્થું (DA) વધારો અને રોકડ એરિયર્સ ($activeTopic)
- પોર્ટલ: $portal
- કર્મચારીઓને ચોક્કસ રૂપિયા અને તારીખો સમજાય તેવી ગણતરીબદ્ધ શૈલી રાખવી.''';

    } else {
      specificSectionGuidance = '''### ભાગ ૧: પાવરફુલ ઓપનિંગ હૂક (૦:૦૦ થી ૦:૪૫ સેકન્ડ)
- સ્ક્રીન નિર્દેશ: [સત્તાવાર સરકારી પરિપત્ર અને ઠરાવ ક્રમાંક લાલ બોક્સમાં બતાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: "નમસ્કાર મિત્રો, જ્ઞાન યાત્રામાં તમારું સ્વાગત છે! આજે આપણે $department ના સત્તાવાર પરિપત્ર મુજબ '$activeTopic' ($grNumber) વિશે વિગતવાર માહિતી મેળવીશું..."

### ભાગ ૨: સૌથી મોટા નિર્ણયો અને સત્તાવાર જાહેરાત (૦:૪૫ થી ૨:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [$department પરિપત્રનો મુખ્ય ફકરો હાઈલાઈટ કરો]
- શબ્દશઃ સ્ક્રિપ્ટ: સરકાર દ્વારા લેવાયેલ આ નિર્ણય પાછળનું સત્ય અને મુખ્ય હકીકતો.

### ભાગ ૩: કોને લાભ મળશે? પાત્રતા અને નવા નિયમો (૨:૩૦ થી ૫:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [૧૦૦% શુદ્ધ સફેદ સ્લાઇડ પર પાત્રતાના સ્પષ્ટ બુલેટ પોઇન્ટ્સ]
- શબ્દશઃ સ્ક્રિપ્ટ: કોણ અરજી કરી શકે અને કોણ બાકાત રહેશે તેના નિયમો.

### ભાગ ૪: સરકારી લાભ / સહાય / માર્ગદર્શિકાની ચોક્કસ વિગતો (૫:૦૦ થી ૭:૩૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [સત્તાવાર માર્ગદર્શિકા અને નિયમોનું સ્પષ્ટ કોષ્ટક ${figures.isNotEmpty ? "(${figures.join(', ')})" : ""}]
- શબ્દશઃ સ્ક્રિપ્ટ: પરિપત્રની મુખ્ય જોગવાઈઓની વ્યવહારુ સમજૂતી.

### ભાગ ૫: ઓનલાઇન પોર્ટલ અને અરજી પદ્ધતિ (૭:૩૦ થી ૧૦:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [$portal નું હોમપેજ અને જરૂરી પુરાવા]
- શબ્દશઃ સ્ક્રિપ્ટ: કઈ રીતે લાભ મેળવવો તેની સ્ટેપ-બાય-સ્ટેપ રીત.

### ભાગ ૬: અતિ મહત્વપૂર્ણ તારીખો અને સાવચેતી (૧૦:૦૦ થી ૧૧:૧૫ મિનિટ)
- સ્ક્રીન નિર્દેશ: [છેલ્લી તારીખ ${dates.isNotEmpty ? "(${dates.join(', ')})" : ""} લાલ રંગના બોલ્ડ બોક્સમાં બતાવો]
- શબ્દશઃ સ્ક્રિપ્ટ: સમયમર્યાદા અને નિયમોનું પાલન કરવાની સાવચેતી.

### ભાગ ૭: અંતિમ નિષ્કર્ષ અને Gyan Yatra App CTA (૧૧:૧૫ થી ૧૨:૦૦ મિનિટ)
- સ્ક્રીન નિર્દેશ: [Gyan Yatra App ડાઉનલોડ & સબ્સ્ક્રાઇબ બટન]
- શબ્દશઃ સ્ક્રિપ્ટ: ઓરિજિનલ PDF ડાઉનલોડ કરવા Gyan Yatra App ઇન્સ્ટોલ કરવા જણાવો.''';

      domainSpecificDirectives = '''- વિષય: સત્તાવાર સરકારી પરિપત્ર અને જાહેર હિતનો નિર્ણય ($activeTopic)
- પોર્ટલ: $portal''';
    }

    final pdfSection = fullPdfText.trim().isNotEmpty
        ? '\n============================================================\n📄 તમે અપલોડ કરેલી PDF માંથી વાંચેલું અસલી લખાણ (EXTRACTED PDF TEXT):\n${fullPdfText.length > 5000 ? "${fullPdfText.substring(0, 5000)}\n...(બાકીનું PDF લખાણ જોડાયેલ દસ્તાવેજમાં ઉપલબ્ધ છે)..." : fullPdfText}\n============================================================\n'
        : '\n============================================================\n📄 PDF દસ્તાવેજ સંદર્ભ:\n(જો તમે ChatGPT કે NotebookLM માં આ પ્રોમ્પ્ટ પેસ્ટ કરી રહ્યા હોવ તો સાથે આ PDF ફાઇલ પણ એટેચ કરો)\n============================================================\n';

    final datesLine = dates.isNotEmpty ? '📅 મહત્વપૂર્ણ તારીખો: ${dates.join(", ")}\n' : '';
    final figuresLine = figures.isNotEmpty ? '🔢 મહત્વના આંકડા / જગ્યાઓ / રકમ: ${figures.join(", ")}\n' : '';

    return '''# 🎯 GYAN YATRA MASTER PROMPT: PDF-TAILORED SCRIPT GENERATOR
(સર્વોચ્ચ આદેશ: PDF નો વિષય [$activeTopic] અને અસલી લખાણ વાંચીને જ ૭ પ્રકરણોમાં શબ્દશઃ સ્ક્રિપ્ટ આપો)

તમે YouTube ચેનલ "Gyan Yatra" માટે વરિષ્ઠ શિક્ષણવિદ્, સત્તાવાર પરિપત્ર વિશ્લેષક અને પ્રોફેશનલ YouTube સ્ક્રિપ્ટ રાઇટર છો.
હું મારી ચેનલ માટે સત્તાવાર પરિપત્ર/જાહેરાતની PDF અપલોડ કરી રહ્યો છું. આ PDF સંપૂર્ણ વાંચીને માઇક્રોફોન સામે સીધું બોલી શકાય તેવી શબ્દશઃ (Word-for-Word) સંપૂર્ણ ગુજરાતી સ્ક્રિપ્ટ તૈયાર કરો.

============================================================
📌 આ અપલોડ કરેલી PDF ની ચોક્કસ સત્તાવાર વિગતો (CONFIRMED PDF DETAILS):
------------------------------------------------------------
🎯 PDF મુખ્ય વિષય: "$activeTopic"
🏷️ કેટેગરી: $categoryGuj
🏢 સત્તાવાર વિભાગ / બોર્ડ: $department
📜 ઠરાવ / પરિપત્ર / જાહેરાત ક્રમાંક: $grNumber
🌐 સત્તાવાર પોર્ટલ: $portal
$datesLine$figuresLine👥 લક્ષિત દર્શકો: $targetAudience
⏱️ વિડીયો સમયગાળો: ૮ થી ૧૨ મિનિટનો વિગતવાર, સચોટ અને હાઈ-રીટેન્શન વિડીયો
⚪ વિઝ્યુઅલ થીમ: ૧૦૦% શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF), બોલ્ડ હેડિંગ બોક્સ, સત્તાવાર પરિપત્રના અસલી સ્ક્રીનશોટ
============================================================

📝 આ PDF માંથી તારવેલા મુખ્ય નિયમો અને જોગવાઈઓ:
${keyHighlights.join('\n')}

============================================================
🚨 સર્વોચ્ચ પ્રથમ આદેશ: પહેલા આખી PDF સંપૂર્ણ વાંચો (READ FULL PDF FIRST)
============================================================
૧. સ્ક્રિપ્ટ લખવાનું શરૂ કરતા પહેલા, અપલોડ કરેલી આખી PDF ફાઇલ પેજ ૧ થી છેલ્લા પેજ સુધી સંપૂર્ણ અને ઝીણવટપૂર્વક વાંચો!
૨. તમારે કોઈપણ સામાન્ય કે બનાવટી વાત નથી લખવાની. ઉપર દર્શાવેલા સત્તાવાર વિભાગ ($department), ઠરાવ ક્રમાંક ($grNumber) અને વિષય ("$activeTopic") મુજબ જ સ્ક્રિપ્ટ હોવી જોઈએ.
૩. કડક ફેક્ટ-ચેકિંગ (STRICT ZERO FABRICATION): PDF માં દર્શાવેલ સાચી તારીખો, જગ્યાઓ/આંકડા અને જોગવાઈઓ જ બોલવાના શબ્દોમાં ઉપયોગ કરો. કોઈ મનઘડંત બાબત ઉમેરવી નહીં.

============================================================
🎬 PDF વિષય મુજબ ૭-સ્તરીય શબ્દશઃ સ્ક્રિપ્ટ માળખું:
============================================================
$specificSectionGuidance

============================================================
⚡ વિષય-વિશિષ્ટ કડક નિયમો:
============================================================
$domainSpecificDirectives
- શુદ્ધ, જીવંત અને બોલચાલની સાહજિક ગુજરાતી (કોઈ અઘરા પુસ્તકીય શબ્દો નહીં).
- સ્ક્રિપ્ટના બોલવાના લખાણમાં કોઈ વધારાના કૌંસ [ ] ન હોવા જોઈએ, જેથી યુટ્યુબર અટક્યા વગર સડસડાટ રેકોર્ડિંગ કરી શકે.
$pdfSection
હવે અપલોડ કરેલી આખી PDF સંપૂર્ણ વાંચીને ઉપર મુજબની શબ્દશઃ ગુજરાતી સ્ક્રિપ્ટ લખો:''';
  }

  /// Helper to extract pure spoken Gujarati sentences from markdown formatted script
  static String extractSpokenScript(String scriptMarkdown) {
    if (scriptMarkdown.trim().isEmpty) return '';
    return VoiceActorService.sanitizeScriptForSpeech(scriptMarkdown);
  }
}
