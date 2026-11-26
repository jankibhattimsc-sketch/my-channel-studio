import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import '../models/topic_model.dart';
import '../services/api_service.dart';
import 'slide_screen.dart';
import 'subtopic_screen.dart';

class IdeaScreen extends StatefulWidget {
  final Function(TopicIdea)? onTopicSelected;

  const IdeaScreen({super.key, this.onTopicSelected});

  @override
  State<IdeaScreen> createState() => _IdeaScreenState();
}

class _IdeaScreenState extends State<IdeaScreen> {
  final TextEditingController _subtopicInputController =
      TextEditingController(text: 'આંગણવાડી પગાર વધારો હાઈકોર્ટ ચુકાદો');

  String _promptMode = 'earning5'; // 'earning5' | 'viral10'
  bool _isLoading = false;
  bool _isServerConnected = false;
  String? _activeSelectedTopicName;

  List<TopicIdea> _directTopics = [];
  List<String> _subtopics = [
    'આંગણવાડી બહેનોના પગાર વધારા અંગે હાઈકોર્ટનો ઐતિહાસિક આદેશ (LPA 363/2025 ચુકાદો)',
    'આંગણવાડી કાર્યકર અને તેડાગર: જૂનું માનદ વેતન vs નવો સન્માનજનક પગાર સંપૂર્ણ સરખામણી',
    'નવા વેતન માળખાની ગણતરી: લઘુતમ વેતન ધારા હેઠળ માસિક ₹૨૪,૮૦૦ પગાર કેવી રીતે મળશે?',
    'અમલીકરણની તારીખ અને એરિયર્સ (Arrears) ની જોગવાઈ: ક્યારથી મળશે બાકી રકમ?',
    'ગાંધીનગર સચિવાલય GR પરિપત્ર અને નાણાં વિભાગ પ્રક્રિયા: સત્તાવાર ઓર્ડર PDF ડાઉનલોડ'
  ];

  @override
  void initState() {
    super.initState();
    _checkConnectionAndLoad();
  }

  @override
  void dispose() {
    _subtopicInputController.dispose();
    super.dispose();
  }

  Future<void> _checkConnectionAndLoad() async {
    setState(() => _isLoading = true);
    final isOnline = await ApiService.checkHealth();
    setState(() => _isServerConnected = isOnline);

    final list = await ApiService.getTrendingTopics(category: 'સરકારી યોજના');
    if (mounted) {
      setState(() {
        _directTopics = list.isNotEmpty ? list : _getDefaultDirectTopics();
        _isLoading = false;
      });
    }
  }

  List<TopicIdea> _getDefaultDirectTopics() {
    return [
      TopicIdea(
        id: 'd_1',
        title: 'આંગણવાડી પગાર વધારા પછી કેટલો પગાર મળશે? જૂના અને નવા માનદ વેતનની સરખામણી',
        category: 'સરકારી યોજના',
        views48h: '૪,૮૫૦ વ્યુઝ',
        rpm: '₹૨૨૦',
      ),
      TopicIdea(
        id: 'd_2',
        title: 'GSRTC Helper ભરતી 2026 – નવી કામચલાઉ યાદી અને ઉમેદવારોનું લિસ્ટ',
        category: 'ભરતી & નોકરી',
        views48h: '૫,૨૪૦ વ્યુઝ',
        rpm: '₹૨૪૫',
      ),
      TopicIdea(
        id: 'd_3',
        title: 'TET-2 પરીક્ષા 2026: પરીક્ષાની સંભવિત તારીખ, નોટિફિકેશન અને મહત્વની માહિતી',
        category: 'શિક્ષણ & પરીક્ષા',
        views48h: '૭,૧૨૦ વ્યુઝ',
        rpm: '₹૨૬૦',
      ),
      TopicIdea(
        id: 'd_4',
        title: 'TAT-HS 2026 સેફ સ્કોર કેટલો હોવો જોઈએ? કેટેગરી પ્રમાણે કટ ઓફ વિશ્લેષણ',
        category: 'શિક્ષણ & પરીક્ષા',
        views48h: '૩,૯૮૦ વ્યુઝ',
        rpm: '₹૨૧૦',
      ),
      TopicIdea(
        id: 'd_5',
        title: 'ગુજરાત કર્મચારી પગાર અને DA ૫૦% વધારો સત્તાવાર ઠરાવ અને નિયમો',
        category: 'કર્મચારી & પેન્શન',
        views48h: '૮,૪૦૦ વ્યુઝ',
        rpm: '₹૨૮૦',
      ),
    ];
  }

  String _getMasterPrompt() {
    if (_promptMode == 'viral10') {
      return '''MASTER PROMPT: GYAN YATRA – AI VIRAL TOPIC FINDER

ROLE:
You are an Elite YouTube Growth Strategist, YouTube Analytics Expert and Gujarati Content Research Specialist.

CHANNEL:
Name: Gyan Yatra
Handle: @gyan.yatra1
Niche: Gujarati Government News, Recruitment, Education, Government Schemes, Employees, Women, Farmers and Public Information.

YOUR MISSION:
Find EXACTLY 10 best potential YouTube video topics for this channel using the attached YouTube Studio Analytics screenshot of the LAST 48 HOURS (૪૮ કલાક).

Strict requirements:
- Analyze real metrics shown in the screenshot.
- Focus on topics that generated strong real views, high CTR and audience demand in the last 48 hours.
- Each topic must be in clean, natural Gujarati.
- High click-through potential, clear, authentic, educational and free of clickbait.
- Return EXACTLY 10 topics. No more, no less.
- Output ONLY topic names, numbered 1 to 10.
- No scripts. NO SCRIPTS. કોઈપણ પ્રકારની સ્ક્રિપ્ટ નહીં.
- NO section breakdowns. NO intros. NO explanations. NO hashtags.
- Output ONLY the 10 topic titles.

OUTPUT FORMAT:
1. [Gujarati Video Topic]
2. [Gujarati Video Topic]
...
10. [Gujarati Video Topic]''';
    }

    return '''MASTER PROMPT: GYAN YATRA – AI VIRAL TOPIC FINDER
(૪૮ કલાક સ્ક્રીનશોટ ➔ સૌથી વધુ Views પરથી ૫ શ્રેષ્ઠ કમાણી વાળા વિષયો / HIGH RPM)

ROLE:
You are an Elite YouTube Growth Strategist, YouTube Monetization & High-RPM Consultant, and Gujarati Content Research Specialist.

CHANNEL:
Name: Gyan Yatra
Handle: @gyan.yatra1
Niche: Gujarati Government News, Recruitment, Education, Government Schemes, 7th Pay Commission, DA Hikes, Financial Aid, Women, Farmers.

YOUR MISSION (૪૮ કલાક સ્ક્રીનશોટ એનાલિસિસ ➔ ૫ શ્રેષ્ઠ કમાણી વાળા વિષયો):
Analyze the attached YouTube Studio Analytics screenshot of the LAST 48 HOURS (૪૮ કલાક) to accomplish two sequential tasks:

પગલું ૧: સૌથી વધુ Views ધરાવતા વિડીયો શોધો (STEP 1: IDENTIFY HIGHEST VIEWS)
- સામે જોડેલા YouTube Studio ના 48-Hour Realtime Analytics screenshot માં જુઓ કે કયા વિડીયોમાં સૌથી વધારે Views (Highest Views / Peak Realtime Traffic) આવ્યા છે.
- તે ટોચના વિડીયોના મુખ્ય મુદ્દા, વિષય અને દર્શકોના રસ (Audience Interest) ને ચોક્કસ રીતે ઓળખો.

પગલું ૨: ૫ શ્રેષ્ઠ કમાણી વાળા વિષયો તૈયાર કરો (STEP 2: GENERATE 5 BEST HIGH-EARNING TOPICS)
- સૌથી વધુ Views મેળવનાર તે વિડીયોના આધારે, ચેનલ માટે સૌથી વધુ આવક / શ્રેષ્ઠ કમાણી (Best Earning / Maximum Revenue / High Ad RPM) કરાવે તેવા બરાબર ૫ નવા વિષયો બનાવો.

STRICT REQUIREMENTS:
- Focus strictly on the videos with the HIGHEST VIEWS from the 48-Hour screenshot.
- Turn that high viewer demand into EXACTLY 5 topics tailored for BEST EARNING / MAXIMUM REVENUE.
- Each topic must be in clean, authentic, compelling Gujarati.
- Return EXACTLY 5 topics.
- No scripts. NO SCRIPTS. કોઈપણ પ્રકારની સ્ક્રિપ્ટ નહીં.
- Output ONLY topic names, numbered 1 to 5.

OUTPUT FORMAT:
1. [Gujarati Video Topic] (શ્રેષ્ઠ કમાણી • Highest Views ➔ High RPM)
2. [Gujarati Video Topic] (શ્રેષ્ઠ કમાણી • Highest Views ➔ High RPM)
3. [Gujarati Video Topic] (શ્રેષ્ઠ કમાણી • Highest Views ➔ High RPM)
4. [Gujarati Video Topic] (શ્રેષ્ઠ કમાણી • Highest Views ➔ High RPM)
5. [Gujarati Video Topic] (શ્રેષ્ઠ કમાણી • Highest Views ➔ High RPM)''';
  }

  void _copyMasterPrompt() {
    Clipboard.setData(ClipboardData(text: _getMasterPrompt()));
    _showToast('📋 ૪૮h માસ્ટર પ્રોમ્પ્ટ કોપી થઈ ગયો!');
  }

  void _selectTopic(String title) {
    setState(() => _activeSelectedTopicName = title);
    _showToast('🎯 "$title" સક્રિય વિષય તરીકે પસંદ થયો!');
    if (widget.onTopicSelected != null) {
      widget.onTopicSelected!(
        TopicIdea(
          id: 'topic_${DateTime.now().millisecondsSinceEpoch}',
          title: title,
          category: 'સરકારી યોજના',
        ),
      );
    }
  }

  void _searchSubtopics() {
    final query = _subtopicInputController.text.trim();
    if (query.isEmpty) return;

    final lower = query.toLowerCase();
    List<String> list = [];

    if (lower.contains('ભરતી') || lower.contains('ojas') || lower.contains('gsrtc')) {
      list = [
        '$query: સત્તાવાર નોટિફિકેશન, કુલ જગ્યાઓ અને કેટેગરી વાઇઝ વિગત',
        '$query: શૈક્ષણિક લાયકાત, વયમર્યાદા અને જરૂરી ડોક્યુમેન્ટ્સ ચેકલિસ્ટ',
        '$query: માસિક પગાર ધોરણ અને ફિક્સ પે નિયમો ૨૦૨૬',
        '$query: પરીક્ષા પદ્ધતિ, સિલેબસ અને મેરિટ ગણતરી વિશ્લેષણ',
        '$query: OJAS પોર્ટલ પર ઓનલાઇન ફોર્મ ભરવાની સ્ટેપ-બાય-સ્ટેપ પદ્ધતિ'
      ];
    } else if (lower.contains('યોજના') || lower.contains('ખેડૂત') || lower.contains('આવાસ')) {
      list = [
        '$query: સત્તાવાર સરકારી પરિપત્ર અને નવા નિયમો જાહેર',
        '$query: કોને મળશે લાભ? પાત્રતા માપદંડો અને આવક મર્યાદા શરતો',
        '$query: સહાયની રકમ: સીધા બેંક ખાતામાં DBT દ્વારા કેટલા રૂપિયા જમા થશે?',
        '$query: જરૂરી પુરાવા અને ડોક્યુમેન્ટ્સની સંપૂર્ણ યાદી',
        '$query: ઓનલાઇન પોર્ટલ પરથી અરજી કરવાની સરળ પદ્ધતિ અને છેલ્લી તારીખ'
      ];
    } else {
      list = [
        '$query: સત્તાવાર પરિપત્ર અને તાજી નવીનતમ માહિતી',
        '$query: જૂના નિયમો vs નવા નિયમો તુલનાત્મક ફેરફાર',
        '$query: પાત્રતા, શરતો અને કોને કેટલો લાભ મળશે?',
        '$query: જરૂરી દસ્તાવેજો અને ઓનલાઇન પોર્ટલ અરજી પદ્ધતિ',
        '$query: સમયમર્યાદા, છેલ્લી તારીખ અને વારંવાર પૂછાતા પ્રશ્નો (FAQs)'
      ];
    }

    setState(() {
      _subtopics = list;
    });
    _showToast('🎉 ૫ નવા સબ-ટોપિક્સ તૈયાર થયા!');
  }

  void _showToast(String message) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
        duration: const Duration(seconds: 2),
        backgroundColor: const Color(0xFF0F172A),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        titleSpacing: 14,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Text('▶', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 8),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Gyan Yatra',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                ),
                Text(
                  '૧. 48h YouTube AI Studio',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF7C3AED)),
                ),
              ],
            ),
          ],
        ),
        actions: [
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF7C3AED),
              foregroundColor: Colors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: const Icon(Icons.hub, size: 14),
            label: const Text('૨. સબ-ટોપિક્સ →', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => SubtopicScreen(
                    initialTopic: _activeSelectedTopicName ?? _subtopics.first,
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 4),
          Container(
            margin: const EdgeInsets.symmetric(vertical: 14, horizontal: 4),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: _isServerConnected ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _isServerConnected ? const Color(0xFF10B981) : const Color(0xFFEF4444)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircleAvatar(radius: 3, backgroundColor: _isServerConnected ? const Color(0xFF10B981) : const Color(0xFFEF4444)),
                const SizedBox(width: 4),
                Text(
                  _isServerConnected ? 'Online' : 'Offline',
                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: _isServerConnected ? const Color(0xFF059669) : const Color(0xFFDC2626)),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF475569), size: 20),
            onPressed: _checkConnectionAndLoad,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          // 1. The 3 Action Buttons
          Row(
            children: [
              Expanded(
                flex: 12,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFD71920),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.copy, size: 14),
                  label: const Text('Copy Prompt', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  onPressed: _copyMasterPrompt,
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                flex: 10,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF102A56),
                    side: const BorderSide(color: Color(0xFF102A56), width: 1.2),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.open_in_new, size: 14),
                  label: const Text('YT Studio', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  onPressed: () {
                    Clipboard.setData(const ClipboardData(text: 'https://studio.youtube.com'));
                    _showToast('YouTube Studio લિંક કોપી થઈ!');
                  },
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                flex: 9,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF102A56),
                    side: const BorderSide(color: Color(0xFF102A56), width: 1.2),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.bolt, size: 14),
                  label: const Text('ChatGPT', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  onPressed: () {
                    Clipboard.setData(const ClipboardData(text: 'https://chatgpt.com'));
                    _showToast('ChatGPT લિંક કોપી થઈ!');
                  },
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // 2. Permanent AI Topic Research Master Prompt Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF102A56), width: 1.5),
              boxShadow: const [BoxShadow(color: Color(0x0F102A56), blurRadius: 10, offset: Offset(0, 4))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(color: const Color(0xFF102A56), borderRadius: BorderRadius.circular(4)),
                      child: const Text('કાયમી માસ્ટર પ્રોમ્પ્ટ', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF2F2),
                        border: Border.all(color: const Color(0xFFFECACA)),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        _promptMode == 'earning5' ? '💰 ૫ શ્રેષ્ઠ કમાણી વાળા વિષયો (High RPM)' : '⚡ ૧૦ વાયરલ વિષયો',
                        style: const TextStyle(color: Color(0xFFDC2626), fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'YouTube Studio 48-Hour Screenshot Analysis',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF102A56)),
                ),
                const SizedBox(height: 4),
                const Text(
                  'આ પ્રોમ્પ્ટ કોપી કરીને ChatGPT માં પેસ્ટ કરો અને YouTube Studio ના ૪૮ કલાકના એનાલિટિક્સનો સ્ક્રીનશોટ જોડો.',
                  style: TextStyle(fontSize: 10, color: Color(0xFF64748B), height: 1.4),
                ),
                const SizedBox(height: 10),

                // Mode switch
                Container(
                  padding: const EdgeInsets.all(3),
                  decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(8)),
                  child: Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _promptMode = 'earning5'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            decoration: BoxDecoration(
                              color: _promptMode == 'earning5' ? const Color(0xFF102A56) : Colors.transparent,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '💰 ૫ શ્રેષ્ઠ કમાણી વાળા',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: _promptMode == 'earning5' ? Colors.white : const Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ),
                      ),
                      Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _promptMode = 'viral10'),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            decoration: BoxDecoration(
                              color: _promptMode == 'viral10' ? const Color(0xFF102A56) : Colors.transparent,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              '⚡ ૧૦ વાયરલ વિષયો',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: _promptMode == 'viral10' ? Colors.white : const Color(0xFF64748B),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                // Prompt Box (preview)
                Container(
                  height: 100,
                  width: double.infinity,
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                  ),
                  child: SingleChildScrollView(
                    child: Text(
                      _getMasterPrompt(),
                      style: const TextStyle(fontSize: 10, height: 1.4, color: Color(0xFF1E293B), fontFamily: 'monospace'),
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                // Bottom actions of card
                Row(
                  children: [
                    Expanded(
                      flex: 12,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD71920),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                        ),
                        icon: const Icon(Icons.copy, size: 13),
                        label: const Text('Copy Master Prompt', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        onPressed: _copyMasterPrompt,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      flex: 10,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF102A56),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                        ),
                        icon: const Icon(Icons.auto_awesome, size: 13),
                        label: const Text('સીધા વિષયો', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        onPressed: () {
                          _showToast('🚀 ૪૮ કલાક ટ્રેન્ડ્સમાંથી ૫ શ્રેષ્ઠ વિષયો તૈયાર!');
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 3. Direct 48h Topics List
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Text('🔥 ', style: TextStyle(fontSize: 14)),
                        Text('૪૮ કલાક ડેટા આધારિત શ્રેષ્ઠ વિષયો', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(4)),
                      child: const Text('No Scripts', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ..._directTopics.map((t) {
                  final isSelected = t.title == _activeSelectedTopicName;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFFFAF5FF) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: isSelected ? const Color(0xFF7C3AED) : const Color(0xFFE2E8F0), width: isSelected ? 1.5 : 1),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(t.title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF0F172A), height: 1.35)),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF7C3AED),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                visualDensity: VisualDensity.compact,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                              ),
                              icon: const Icon(Icons.check_circle_outline, size: 12),
                              label: const Text('આ વિષય પસંદ કરો', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                              onPressed: () => _selectTopic(t.title),
                            ),
                            const SizedBox(width: 6),
                            OutlinedButton.icon(
                              style: OutlinedButton.styleFrom(
                                foregroundColor: const Color(0xFF475569),
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                visualDensity: VisualDensity.compact,
                                side: const BorderSide(color: Color(0xFFCBD5E1)),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                              ),
                              icon: const Icon(Icons.copy, size: 12),
                              label: const Text('કોપી', style: TextStyle(fontSize: 10)),
                              onPressed: () {
                                Clipboard.setData(ClipboardData(text: t.title));
                                _showToast('📋 વિષય કોપી થયો!');
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 4. Topic-Based 4-5 Sub-Topics Explorer Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF0284C7), width: 1.5),
              boxShadow: const [BoxShadow(color: Color(0x0F0284C7), blurRadius: 10, offset: Offset(0, 4))],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('🎯 વિષય પરથી ૪-૫ સબ-ટોપિક્સ શોધો', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0284C7))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFFF0F9FF), borderRadius: BorderRadius.circular(4)),
                      child: const Text('Live Search', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF0369A1))),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _subtopicInputController,
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                        decoration: InputDecoration(
                          hintText: 'દા.ત. GSRTC ભરતી...',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0284C7),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      onPressed: _searchSubtopics,
                      child: const Text('શોધો', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ..._subtopics.asMap().entries.map((entry) {
                  final idx = entry.key + 1;
                  final st = entry.value;
                  final isSelected = st == _activeSelectedTopicName;
                  return Container(
                    margin: const EdgeInsets.only(bottom: 6),
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFFFAF5FF) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(color: isSelected ? const Color(0xFF7C3AED) : const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('$idx. $st', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF0F172A), height: 1.3)),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF10B981),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                visualDensity: VisualDensity.compact,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                              ),
                              onPressed: () => _selectTopic(st),
                              child: const Text('આ વિષય પસંદ કરો', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold)),
                            ),
                            const SizedBox(width: 6),
                            OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                visualDensity: VisualDensity.compact,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                              ),
                              onPressed: () {
                                Clipboard.setData(ClipboardData(text: st));
                                _showToast('કોપી થયો!');
                              },
                              child: const Text('કોપી', style: TextStyle(fontSize: 9)),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),

          const SizedBox(height: 14),

          // 5. Next Step Callout (to Screen 2: Sub-Topics)
          InkWell(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => SubtopicScreen(
                    initialTopic: _activeSelectedTopicName ?? _subtopics.first,
                  ),
                ),
              );
            },
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F3FF),
                border: Border.all(color: const Color(0xFFDDD6FE), width: 1.5),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  Text('🔍 ', style: TextStyle(fontSize: 20)),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'આગળની સ્ક્રીન: ૨. ૫ અનુસંધાન વિષયો (સબ-ટોપિક્સ) રિસર્ચ',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF6D28D9),
                          ),
                        ),
                        Text(
                          'તમારો વિષય લખો અને તેના જ આધારે ૫ શ્રેષ્ઠ વિષયો મેળવવા અહીં ક્લિક કરો',
                          style: TextStyle(fontSize: 9.5, color: Color(0xFF7C3AED)),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.arrow_forward_ios, size: 14, color: Color(0xFF6D28D9)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
