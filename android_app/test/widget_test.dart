import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/material.dart' show MaterialApp, ListView;
import 'package:myvoice_ai/main.dart';
import 'package:myvoice_ai/screens/chat_screen.dart';
import 'package:myvoice_ai/screens/analytics_screen.dart';
import 'package:myvoice_ai/screens/research_screen.dart';
import 'package:myvoice_ai/screens/settings_screen.dart';
import 'package:myvoice_ai/services/notebooklm_service.dart';
import 'package:myvoice_ai/services/slide_voiceover_service.dart';
import 'package:myvoice_ai/services/slide_maker_service.dart';

void main() {
  testWidgets('1. Gyan Yatra App smoke and navigation test', (WidgetTester tester) async {
    await tester.pumpWidget(const GyanYatraApp());
    expect(find.byType(GyanYatraApp), findsOneWidget);

    // Verify Title and Tabs
    expect(find.text('GYAN YATRA'), findsOneWidget);
    expect(find.text('આઈડિયા'), findsOneWidget);
    expect(find.text('સ્ક્રિપ્ટ'), findsOneWidget);
    expect(find.text('અવાજ'), findsOneWidget);
    expect(find.text('સ્લાઇડ્સ'), findsOneWidget);
    expect(find.text('SEO/ફોટો'), findsOneWidget);
    expect(find.text('શેર'), findsOneWidget);

    // Switch to Script Tab (Index 2)
    await tester.tap(find.text('સ્ક્રિપ્ટ'));
    await tester.pumpAndSettle();
    expect(find.textContaining('૩. સ્ક્રિપ્ટ રાઇટર'), findsOneWidget);
    expect(find.textContaining('PDF Master Script'), findsOneWidget);

    // Switch to Voice Tab (Index 2)
    await tester.tap(find.text('અવાજ'));
    await tester.pumpAndSettle();
    expect(find.text('🎭 ૧. અવાજ પસંદ કરો (Voice Profile)'), findsOneWidget);
    expect(find.text('👑 મારો અસલી અવાજ'), findsOneWidget);
    expect(find.text('👑 જાનકી ભટ્ટી (Cloned Female)'), findsOneWidget);

    // Switch to Slides Tab (Index 3)
    await tester.tap(find.text('સ્લાઇડ્સ'));
    await tester.pumpAndSettle();
    expect(find.text('GYAN YATRA 🎯'), findsOneWidget);

    // Switch to SEO Tab (Index 4)
    await tester.tap(find.text('SEO/ફોટો'));
    await tester.pumpAndSettle();
    expect(find.text('🚀 ૫. 1-ક્લિક SEO & શુદ્ધ સફેદ થંબનેલ સ્ટુડિયો'), findsOneWidget);
    expect(find.text('સ્માર્ટ થંબનેલ ૩-૪ ટેક્સ્ટ & કલર કોન્ટ્રાસ્ટ'), findsOneWidget);
    expect(find.text('૧. મુખ્ય વિષય (Main Topic)'), findsOneWidget);

    // Scroll to see titles
    await tester.drag(find.byType(ListView).first, const Offset(0, -600));
    await tester.pumpAndSettle();
    expect(find.text('🎯 હાઇ-CTR ગુજરાતી ટાઇટલ્સ (Titles)'), findsOneWidget);

    // Switch to Share Tab (Index 5)
    await tester.tap(find.text('શેર'));
    await tester.pumpAndSettle();
    expect(find.text('💾 ૬. વિડીયો પ્રોજેક્ટ પેકેજ સેન્ટર'), findsOneWidget);
    expect(find.text('WhatsApp પર શેર કરો'), findsOneWidget);
  });

  test('2. TopicItem Model Parsing & Scoring Verification', () {
    final rawJson = {
      'id': 'top_101',
      'topicGujarati': 'ગુજરાત નવી ટેકનોલોજી ૨૦૨૬',
      'category': 'tech',
      'whyViewersWatch': 'નવા AI ટૂલ્સ સમજવા',
      'targetAudience': 'ટેક ક્રિએટર્સ',
      'trendEvidence': 'Google Trends Top 1',
      'competitionLevel': 'Low',
      'suggestedFormat': '10 Min Video',
      'suggestedTitle': 'ગુજરાત ટેક અપડેટ',
      'searchKeywords': ['AI', 'Tech', 'Gujarat'],
      'thumbnailConcept': 'AI Robot + White BG',
      'scores': {
        'overall': 92,
        'searchDemand': 95,
        'freshness': 90,
        'competition': 88,
      },
      'masterPrompt': 'ટેક વિષય પર ગુજરાતી સ્ક્રિપ્ટ લખો.'
    };

    final topic = TopicItem.fromJson(rawJson);
    expect(topic.id, 'top_101');
    expect(topic.topicGujarati, 'ગુજરાત નવી ટેકનોલોજી ૨૦૨૬');
    expect(topic.overallScore, 92);
    expect(topic.searchDemandScore, 95);
    expect(topic.searchKeywords.length, 3);
    expect(topic.isSaved, false);
  });

  test('3. ScriptSectionItem & SlideItem Serialization', () {
    final section = ScriptSectionItem(
      sectionName: 'હૂક',
      timeRange: '0:00 - 1:00',
      content: 'નમસ્તે મિત્રો!',
      directorNotes: 'કેમેરા પર સ્માઈલ',
    );

    final json = section.toJson();
    expect(json['sectionName'], 'હૂક');
    expect(json['content'], 'નમસ્તે મિત્રો!');

    final reconstructed = ScriptSectionItem.fromJson(json);
    expect(reconstructed.sectionName, 'હૂક');
    expect(reconstructed.timeRange, '0:00 - 1:00');

    final slide = SlideItem(
      id: 1,
      title: 'મુખ્ય સ્લાઇડ',
      subtitle: 'ભાગ ૧',
      bulletPoints: ['મુદ્દો ૧', 'મુદ્દો ૨'],
      audioTime: '0:00 - 1:00',
      accentColor: '#DC2626',
    );

    final slideJson = slide.toJson();
    expect(slideJson['title'], 'મુખ્ય સ્લાઇડ');
    expect((slideJson['bulletPoints'] as List).length, 2);

    final reconstructedSlide = SlideItem.fromJson(slideJson);
    expect(reconstructedSlide.id, 1);
    expect(reconstructedSlide.bulletPoints[0], 'મુદ્દો ૧');
  });

  testWidgets('4. Navigation Drawer & Creator Tools verification', (WidgetTester tester) async {
    await tester.pumpWidget(const GyanYatraApp());
    expect(find.byType(GyanYatraApp), findsOneWidget);

    // Open drawer via hamburger icon
    final menuButton = find.byTooltip('મેનૂ');
    expect(menuButton, findsOneWidget);
    await tester.tap(menuButton);
    await tester.pumpAndSettle();

    // Verify Drawer items at top
    expect(find.text('પ્રોડક્શન પાઇપલાઇન (PIPELINE)'), findsOneWidget);
    expect(find.text('૧. આઈડિયા & 48h ટ્રેન્ડ'), findsOneWidget);
    expect(find.text('૨. સ્લાઇડ્સ (Tool 2)'), findsOneWidget);

    // Scroll to see creator tools
    await tester.drag(find.byType(ListView).last, const Offset(0, -250));
    await tester.pumpAndSettle();
    expect(find.text('ક્રિએટર એઆઈ ટૂલ્સ (CREATOR TOOLS)'), findsOneWidget);
    expect(find.text('ChatGPT આસિસ્ટન્ટ'), findsOneWidget);

    await tester.drag(find.byType(ListView).last, const Offset(0, -200));
    await tester.pumpAndSettle();
    expect(find.text('થંબનેલ ૩-૪ ટેક્સ્ટ & કલર સ્ટુડિયો'), findsOneWidget);

    // Scroll further down to see system & settings
    await tester.drag(find.byType(ListView).last, const Offset(0, -250));
    await tester.pumpAndSettle();
    expect(find.text('સેટિંગ્સ & API કી'), findsOneWidget);
  });

  testWidgets('5. Secondary Screens Rendering Smoke Tests', (WidgetTester tester) async {
    // Chat Screen
    await tester.pumpWidget(
      const MaterialApp(
        home: ChatScreen(serverUrl: 'http://localhost:5000'),
      ),
    );
    expect(find.text('✨ ChatGPT Creator Assistant'), findsOneWidget);

    // Analytics Screen
    await tester.pumpWidget(
      const MaterialApp(
        home: AnalyticsScreen(serverUrl: 'http://localhost:5000'),
      ),
    );
    expect(find.text('📈 48-Hour Views & Earnings'), findsOneWidget);

    // Research Screen
    await tester.pumpWidget(
      const MaterialApp(
        home: ResearchScreen(serverUrl: 'http://localhost:5000'),
      ),
    );
    expect(find.text('🔍 Competitor & Video Research'), findsOneWidget);

    // Settings Screen
    await tester.pumpWidget(
      const MaterialApp(
        home: SettingsScreen(currentServerUrl: 'http://localhost:5000'),
      ),
    );
    expect(find.text('⚙️ Settings & API Configuration'), findsOneWidget);
  });

  test('6. NotebookLM White PPT Prompt Generator Across 4 Required Domains', () {
    // 1. Gujarat Government Scheme
    final schemePrompt = NotebookLMService.generateLocalPrompt(
      topic: 'ગુજરાત સરકાર નવી કિસાન સહાય યોજના ૨૦૨૬: સહાય રકમ, પાત્રતા અને iKhedut અરજી',
      slideCount: '8-10',
    );
    expect(schemePrompt.domain, 'scheme');
    expect(schemePrompt.promptText.contains('#FFFFFF'), true);
    expect(schemePrompt.promptText.contains('SECTION A:'), true);
    expect(schemePrompt.promptText.contains('DEEP RESEARCH'), true);
    expect(schemePrompt.promptText.contains('SECTION B:'), true);
    expect(schemePrompt.promptText.contains('SOURCE CONTROL'), true);
    expect(schemePrompt.promptText.contains('SECTION C:'), true);
    expect(schemePrompt.promptText.contains('TOPIC-SPECIFIC SLIDE OUTLINE'), true);
    expect(schemePrompt.promptText.contains('SECTION D:'), true);
    expect(schemePrompt.promptText.contains('CLEAN WHITE VISUAL DESIGN'), true);
    expect(schemePrompt.promptText.contains('SECTION E:'), true);
    expect(schemePrompt.promptText.contains('AUTHENTIC REAL-WORLD PHOTOGRAPHS'), true);
    expect(schemePrompt.promptText.contains('SECTION F:'), true);
    expect(schemePrompt.promptText.contains('SLIDE-BY-SLIDE CONTENT'), true);
    expect(schemePrompt.promptText.contains('SECTION G:'), true);
    expect(schemePrompt.promptText.contains('LANGUAGE & AUDIENCE TONE'), true);
    expect(schemePrompt.promptText.contains('SECTION H:'), true);
    expect(schemePrompt.promptText.contains('QUALITY CONTROL'), true);
    expect(schemePrompt.promptText.contains('SECTION I:'), true);
    expect(schemePrompt.promptText.contains('FINAL GENERATION COMMAND'), true);
    expect(schemePrompt.promptText.contains('iKhedut'), true);
    expect(schemePrompt.previewSlides.length >= 6, true);

    // 2. Government Recruitment (Police / LRD)
    final policePrompt = NotebookLMService.generateLocalPrompt(
      topic: 'ગુજરાત પોલીસ કોન્સ્ટેબલ અને LRD ભરતી ૨૦૨૬: સત્તાવાર જાહેરાત, સિલેબસ અને લાયકાત',
      slideCount: '8-10',
    );
    expect(policePrompt.domain, 'recruitment');
    expect(policePrompt.promptText.contains('OJAS'), true);
    expect(policePrompt.promptText.contains('#FFFFFF'), true);
    expect(policePrompt.promptText.contains('NO 3D CARTOON'), true);

    // 3. Educational / Competitive Exam (TET / TAT)
    final examPrompt = NotebookLMService.generateLocalPrompt(
      topic: 'TET / TAT ૨૦૨૬ નવો પરીક્ષા સિલેબસ, પેપર પેટર્ન અને પાસિંગ માર્ક્સ',
      slideCount: '8-10',
    );
    expect(examPrompt.domain, 'education');
    expect(examPrompt.promptText.contains('GCERT'), true);
    expect(examPrompt.promptText.contains('#FFFFFF'), true);

    // 4. Technology or Business (AI & ChatGPT)
    final techPrompt = NotebookLMService.generateLocalPrompt(
      topic: 'આર્ટિફિશિયલ ઇન્ટેલિજન્સ (AI) અને ChatGPT થી ૨૦૨૬ માં ઓનલાઇન કમાણી',
      slideCount: '8-10',
    );
    expect(techPrompt.domain, 'technology');
    expect(techPrompt.promptText.contains('#FFFFFF'), true);
    expect(techPrompt.promptText.contains('SECTION A:'), true);
    expect(techPrompt.promptText.contains('SECTION I:'), true);

    // Verify Tool 1 (Content & Research Source Maker) & Tool 2 (16:9 White PPT & Best Real Photos)
    expect(schemePrompt.contentSourcePrompt.contains('તમે એક વરિષ્ઠ સંશોધન વિશ્લેષક'), true);
    expect(schemePrompt.contentSourcePrompt.contains('STRICT ZERO FABRICATION'), true);
    expect(schemePrompt.contentSourcePrompt.contains('NOTEBOOKLM AUDIO OVERVIEW'), true);
    expect(schemePrompt.pptDeckPrompt.contains('BEST REAL PHOTOS'), true);
    expect(schemePrompt.pptDeckPrompt.contains('#FFFFFF'), true);
  });

  test('7. Slide-by-Slide Gujarati YouTube Voiceover Script Expert Service Verification', () {
    final slides = [
      SlideVoiceoverItem(
        slideNumber: 1,
        title: 'ગુજરાત સરકાર કર્મચારી ૭મા પગારપંચ DA વધારો અને એરિયર્સ નિયમો',
        visual: 'ગાંધીનગર સચિવાલય ઠરાવ / સત્તાવાર પરિપત્ર',
        content: '• ૭મા પગારપંચ મુજબ મોંઘવારી ભથ્થામાં ૪% સીધો વધારો મંજૂર\n• પાછલી અસરથી એટલે કે જુલાઈથી અમલ થશે\n• બાકી રહેલા મહિનાઓનો રોકડ તફાવત એરિયર્સ તરીકે ખાતામાં જમા',
        timing: '00:00 - 01:30',
      ),
      SlideVoiceoverItem(
        slideNumber: 2,
        title: 'ગ્રેડ-પે મુજબ ચોખ્ખો પગાર વધારો અને એરિયર્સ ગણતરી કોષ્ટક',
        visual: 'વર્ગ-૩ અને વર્ગ-૪ કર્મચારીઓનું પે-મેટ્રિક્સ ડેટા ટેબલ',
        content: '• વર્ગ-૩: બેઝિક પગાર મુજબ દર મહિને ₹૧,૨૦૦ થી ₹૨,૨૦૦ નો વધારો\n• વર્ગ-૪: પંચાયત અને સચિવાલય કર્મીઓ માટે એરિયર્સ હપ્તા\n• પેન્શનર્સ માટે મોંઘવારી રાહત (DR) માં પણ સમાન વધારો લાગુ',
        timing: '01:30 - 03:00',
      ),
    ];

    final result = SlideVoiceoverService.generateMasterPrompt(
      slides: slides,
      overallTopic: 'ગુજરાત સરકાર કર્મચારી ૭મા પગારપંચ DA વધારો',
      targetAudience: 'ગુજરાતના સરકારી કર્મચારીઓ અને પેન્શનરો',
    );

    expect(result.success, true);
    expect(result.slideCount, 2);
    expect(result.masterPrompt.contains('GYAN YATRA — SLIDE-BY-SLIDE GUJARATI YOUTUBE VOICEOVER SCRIPT EXPERT'), true);
    expect(result.masterPrompt.contains('STRICT 7-SECTION FORMAT'), true);
    expect(result.masterPrompt.contains('1. Slide Understanding'), true);
    expect(result.masterPrompt.contains('2. Audience Retention Objective'), true);
    expect(result.masterPrompt.contains('3. Word-for-Word Gujarati Voiceover Script'), true);
    expect(result.masterPrompt.contains('4. Optional Voice Delivery Notes'), true);
    expect(result.masterPrompt.contains('5. On-Screen Highlight Suggestions'), true);
    expect(result.masterPrompt.contains('6. Fact-Check and Sources'), true);
    expect(result.masterPrompt.contains('7. Transition to the Next Slide'), true);
    expect(result.masterPrompt.contains('ZERO FABRICATION'), true);
    expect(result.masterPrompt.contains('COMPLETE VIDEO FLOW REQUIRED'), true);
    expect(result.masterPrompt.contains('Gyan Yatra App'), true);
    expect(result.preRenderedScript.contains('SLIDE 1:'), true);
    expect(result.preRenderedScript.contains('SLIDE 2:'), true);
  });

  test('8. Slide-Wise Engaging Script Prompt Generator (Section 9 Format & Explanation Depths)', () {
    // 5 Distinct Slide Types as required by Section 11:
    // 1. Government Scheme
    // 2. Recruitment & Eligibility
    // 3. Educational Concept
    // 4. Statistics / DA Table
    // 5. Official Resolution (GR) with visual document
    final slides = [
      SlideVoiceoverItem(
        slideNumber: 1,
        title: 'નવી કિસાન સહાય યોજના ૨૦૨૬: સહાય નિયમો',
        visual: 'કૃષિ વિભાગ ગુજરાત રાજ્ય સત્તાવાર ઠરાવ',
        content: '• ૩૩% થી વધુ નુકસાન પર હેક્ટર દીઠ ₹૪,૦૦૦ સહાય\n• વધુમાં વધુ ૨ હેક્ટર સુધી DBT થી ચૂકવણી\n• iKhedut પોર્ટલ પર ઓનલાઇન અરજી',
        timing: '00:00 - 01:30',
      ),
      SlideVoiceoverItem(
        slideNumber: 2,
        title: 'પોલીસ કોન્સ્ટેબલ અને LRD ભરતી: પાત્રતા અને શારીરિક કસોટી',
        visual: 'OJAS પોર્ટલ સત્તાવાર નોટિફિકેશન',
        content: '• ધોરણ ૧૨ પાસ લાયકાત અને ૧૮ થી ૩૩ વર્ષની વયમર્યાદા\n• પુરુષ ઉમેદવારો માટે ૫૦૦૦ મીટર અને મહિલાઓ માટે ૧૬૦૦ મીટર દોડ\n• OJAS પર અરજી પ્રક્રિયા',
        timing: '01:30 - 03:00',
      ),
      SlideVoiceoverItem(
        slideNumber: 3,
        title: 'TET-1 અને TET-2 પરીક્ષા પદ્ધતિ અને પાસિંગ માર્ક્સ',
        visual: 'SEB પરીક્ષા બોર્ડ સિલેબસ ચાર્ટ',
        content: '• કુલ ૧૫૦ ગુણનું પ્રશ્નપત્ર અને બાળ વિકાસ વિષય\n• જનરલ કેટેગરી ૬૦% અને અનામત ૫૫% લઘુત્તમ પાસિંગ\n• GCERT પુસ્તકો આધારિત પ્રશ્નો',
        timing: '03:00 - 04:30',
      ),
      SlideVoiceoverItem(
        slideNumber: 4,
        title: '૭મું પગારપંચ: DA વધારો અને એરિયર્સ કેલ્ક્યુલેશન ટેબલ',
        visual: 'નાણાં વિભાગ DA ગણતરી કોષ્ટક',
        content: '• ૪% મોંઘવારી ભથ્થા વધારો\n• વર્ગ-૩ અને વર્ગ-૪ કર્મચારીઓ માટે રોકડ એરિયર્સ\n• પેન્શનર્સ માટે DR સુધારો',
        timing: '04:30 - 06:00',
      ),
      SlideVoiceoverItem(
        slideNumber: 5,
        title: 'સત્તાવાર ઠરાવ (GR) ડાઉનલોડ અને આખરી નિષ્કર્ષ',
        visual: 'સચિવાલય પરિપત્ર PDF સ્કેન કોપી',
        content: '• નાણાં વિભાગ સત્તાવાર ઠરાવ નંબર\n• Gyan Yatra App પરથી સત્તાવાર PDF મેળવો\n• વિડિયો શેર અને ચેનલ સબ્સ્ક્રાઇબ કરો',
        timing: '06:00 - 07:30',
      ),
    ];

    // Generate with 'detailed' depth (default)
    final resultDetailed = SlideVoiceoverService.generateMasterPrompt(
      slides: slides,
      overallTopic: 'ગુજરાત સરકાર મોટા નિર્ણયો ૨૦૨૬',
      explanationDepth: 'detailed',
    );

    expect(resultDetailed.slidePrompts.length, 5);
    expect(resultDetailed.explanationDepth, 'detailed');
    expect(resultDetailed.allPromptsText.contains('SLIDE 1 — SCRIPT GENERATION PROMPT'), true);
    expect(resultDetailed.allPromptsText.contains('SLIDE 5 — SCRIPT GENERATION PROMPT'), true);

    // Verify Section 9 8-part required format for each slide
    for (int i = 0; i < resultDetailed.slidePrompts.length; i++) {
      final p = resultDetailed.slidePrompts[i];
      final prompt = p.promptText;

      expect(prompt.contains('SLIDE ${i + 1} — SCRIPT GENERATION PROMPT'), true);
      expect(prompt.contains('Slide heading:'), true);
      expect(prompt.contains('Slide information:'), true);
      expect(prompt.contains('Script-writing instructions:'), true);
      expect(prompt.contains('Language and tone:'), true);
      expect(prompt.contains('Engagement requirements:'), true);
      expect(prompt.contains('Accuracy requirements:'), true);
      expect(prompt.contains('Length requirements:'), true);
      expect(prompt.contains('Final instruction:'), true);
      expect(prompt.contains('Write the complete word-for-word spoken voice-over script for this slide, ready for recording.'), true);
      expect(prompt.contains('STRICT ZERO FABRICATION'), true);
      expect(p.recommendedWords, 150);
    }

    // Verify Inter-Slide Transitions:
    // Slide 1 has opening hook and bridge to Slide 2
    expect(resultDetailed.slidePrompts[0].promptText.contains('Opening Hook:'), true);
    expect(resultDetailed.slidePrompts[0].promptText.contains('Slide 2'), true);

    // Middle slides (Slide 2, 3, 4) transition from previous without repeating intro
    expect(resultDetailed.slidePrompts[1].promptText.contains('Transition from Previous Slide:'), true);
    expect(resultDetailed.slidePrompts[1].promptText.contains('DO NOT repeat the video introduction'), true);

    // Slide 5 has Concluding wrap-up
    expect(resultDetailed.slidePrompts[4].promptText.contains('Concluding wrap-up'), true);

    // Verify 'short' depth
    final resultShort = SlideVoiceoverService.generateMasterPrompt(
      slides: [slides[0]],
      overallTopic: 'કિસાન સહાય',
      explanationDepth: 'short',
    );
    expect(resultShort.slidePrompts[0].recommendedWords, 75);
    expect(resultShort.slidePrompts[0].estimatedDuration, '30 - 45 સેકન્ડ');

    // Verify 'extended' depth
    final resultExtended = SlideVoiceoverService.generateMasterPrompt(
      slides: [slides[0]],
      overallTopic: 'કિસાન સહાય',
      explanationDepth: 'extended',
    );
    expect(resultExtended.slidePrompts[0].recommendedWords, 250);
    expect(resultExtended.slidePrompts[0].estimatedDuration, '2 - 2.5 મિનિટ');

    // Verify single slide prompt regeneration
    final singleRegen = SlideVoiceoverService.generateSingleSlidePrompt(
      slide: slides[2],
      index: 2,
      totalSlides: 5,
      overallTopic: 'TET પરીક્ષા',
      explanationDepth: 'detailed',
    );
    expect(singleRegen.slideNumber, 3);
    expect(singleRegen.title, slides[2].title);
    expect(singleRegen.promptText.contains('SLIDE 3 — SCRIPT GENERATION PROMPT'), true);
  });

  test('9. Flutter Slide Maker Tool (Pure White Background, Heading Box & Bullet Points)', () {
    // Anganwadi slides test
    final anganwadiSlides = SlideMakerService.generateWhiteSlides(
      topic: 'ગુજરાત આંગણવાડી ભરતી અને માનદવેતન ૨૦૨૬',
      count: 5,
      headingBoxStyle: 'solid',
      accentColor: '#DC2626',
    );

    expect(anganwadiSlides.length, 5);
    for (final s in anganwadiSlides) {
      expect(s['bgColor'], '#FFFFFF'); // 100% Pure White Background
      expect(s['headingBoxStyle'], 'solid'); // Heading Box
      expect((s['bulletPoints'] as List).length >= 3, true); // Structured Bullet Points
      expect(s['title'].toString().isNotEmpty, true);
      expect(s['accentColor'], '#DC2626');
    }

    // Convert to SlideItem and verify model serialization
    final item = SlideItem.fromJson(anganwadiSlides[0]);
    expect(item.bgColor, '#FFFFFF');
    expect(item.headingBoxStyle, 'solid');
    expect(item.bulletPoints.length >= 3, true);

    final json = item.toJson();
    expect(json['bgColor'], '#FFFFFF');
    expect(json['headingBoxStyle'], 'solid');

    // DA slides test with outline heading box
    final daSlides = SlideMakerService.generateWhiteSlides(
      topic: 'ગુજરાત કર્મચારી ૫૩% મોંઘવારી ભથ્થું (DA)',
      count: 4,
      headingBoxStyle: 'outline',
      accentColor: '#2563EB',
    );

    expect(daSlides.length, 4);
    expect(daSlides[0]['headingBoxStyle'], 'outline');
    expect(daSlides[0]['bgColor'], '#FFFFFF');
    expect((daSlides[0]['bulletPoints'] as List).any((b) => b.toString().contains('DA') || b.toString().contains('મોંઘવારી')), true);
  });
}