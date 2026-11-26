import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'script_screen.dart';

class SlideModel {
  int id;
  String badge;
  String title;
  String subtitle;
  List<String> bullets;
  String photoIcon;
  String photoCaption;

  SlideModel({
    required this.id,
    required this.badge,
    required this.title,
    required this.subtitle,
    required this.bullets,
    required this.photoIcon,
    required this.photoCaption,
  });
}

class SlideScreen extends StatefulWidget {
  final String? initialTopic;

  const SlideScreen({super.key, this.initialTopic});

  @override
  State<SlideScreen> createState() => _SlideScreenState();
}

class _SlideScreenState extends State<SlideScreen> {
  late String _activeTopic;
  int _currentSlideIndex = 0;
  String _promptMode = 'chatgpt'; // 'chatgpt' | 'notebooklm'

  // Photo presets mapping
  final Map<String, Map<String, String>> _photoPresets = {
    'highcourt': {'icon': '🏛️', 'caption': 'ગુજરાત હાઇકોર્ટ સોલા'},
    'courtorder': {'icon': '⚖️', 'caption': 'LPA 363/2025 ચુકાદો'},
    'sachivalaya': {'icon': '🏢', 'caption': 'સચિવાલય સ્વર્ણિમ સંકુલ'},
    'circular': {'icon': '🏛️', 'caption': 'સત્તાવાર GR પરિપત્ર'},
    'anganwadi_meal': {'icon': '🍲', 'caption': 'પૌષ્ટિક આહાર કેન્દ્ર'},
    'subsidy': {'icon': '💰', 'caption': 'DBT બેંક સહાય'},
    'portal': {'icon': '💻', 'caption': 'OJAS સત્તાવાર પોર્ટલ'},
    'dates': {'icon': '📅', 'caption': 'મહત્વપૂર્ણ તારીખો'},
    'rules': {'icon': '📜', 'caption': 'પાત્રતા અને સેવા નિયમો'},
  };

  late List<SlideModel> _slides;

  @override
  void initState() {
    super.initState();
    _activeTopic = widget.initialTopic ??
        'આંગણવાડી બહેનોના પગાર વધારા અંગે હાઈકોર્ટનો ઐતિહાસિક આદેશ (LPA 363/2025)';
    _initDefaultSlides();
  }

  void _initDefaultSlides() {
    _slides = [
      SlideModel(
        id: 1,
        badge: '🏛️ સત્તાવાર GR પરિપત્ર',
        title: 'ગુજરાત હાઇકોર્ટનો ઐતિહાસિક ચુકાદો',
        subtitle: 'આંગણવાડી બહેનો માટે મોટો નિર્ણય (LPA 363/2025)',
        bullets: [
          'હાઇકોર્ટની ડિવિઝન બેંચ (LPA 363/2025) દ્વારા ઐતિહાસિક આદેશ',
          'આંગણવાડી કાર્યકર અને તેડાગર બહેનોને કાયમી કર્મચારી ગણવા નિર્દેશ',
          'રાજ્ય સરકારને લઘુતમ વેતન ચૂકવવા માટે કડક સમયમર્યાદા અપાઈ',
        ],
        photoIcon: '🏛️',
        photoCaption: 'ગુજરાત હાઇકોર્ટ સોલા',
      ),
      SlideModel(
        id: 2,
        badge: '⚖️ LPA 363/2025 ચુકાદો',
        title: 'કોર્ટના મહત્વના આદેશના મુખ્ય મુદ્દા',
        subtitle: 'સુપ્રીમ કોર્ટના ચુકાદાનો સંદર્ભ અને અવલોકન',
        bullets: [
          'કેન્દ્ર અને રાજ્ય સરકારની સંયુક્ત જવાબદારી નક્કી કરાઈ',
          'માનદ વેતન પ્રથા કાયમી સેવાઓ સામે અયોગ્ય હોવાનું અવલોકન',
          'સેવા સાતત્ય, ગ્રેચ્યુઇટી અને પેન્શન હક્ક અંગે મહત્વનો નિર્દેશ',
        ],
        photoIcon: '⚖️',
        photoCaption: 'LPA 363/2025 ચુકાદો',
      ),
      SlideModel(
        id: 3,
        badge: '💰 નવું વેતન માળખું',
        title: 'નવા પગાર માળખાની સંપૂર્ણ ગણતરી',
        subtitle: 'જૂનું માનદ વેતન vs લઘુતમ વેતન ધારો',
        bullets: [
          'કાર્યકર બહેનો: ₹૧૦,૦૦૦ થી વધીને ₹૨૪,૮૦૦ સંભવિત પગાર',
          'તેડાગર બહેનો: ₹૫,૫૦૦ થી વધીને ₹૧૮,૦૦૦ સુધીનો ફાયદો',
          'DA (મોંઘવારી ભથ્થું) અને વાર્ષિક ઇન્ક્રીમેન્ટ લાગુ કરવાની માંગ',
        ],
        photoIcon: '💰',
        photoCaption: 'DBT બેંક સહાય',
      ),
      SlideModel(
        id: 4,
        badge: '🏢 સચિવાલય પ્રક્રિયા',
        title: 'ગાંધીનગર સચિવાલય GR પરિપત્ર',
        subtitle: 'મહિલા & બાળ વિકાસ અને નાણાં વિભાગની હિલચાલ',
        bullets: [
          'નાણાં વિભાગ દ્વારા બજેટ જોગવાઈ અને મંજૂરી પ્રક્રિયા શરૂ',
          'સત્તાવાર ઠરાવ (GR) ટૂંક સમયમાં જાહેર થવાની શક્યતા',
          'રાજ્યભરના ૫૩,૦૦૦ થી વધુ આંગણવાડી કેન્દ્રોને અસર થશે',
        ],
        photoIcon: '🏢',
        photoCaption: 'સચિવાલય સ્વર્ણિમ સંકુલ',
      ),
      SlideModel(
        id: 5,
        badge: '📅 અમલીકરણ તારીખ',
        title: 'અમલ ક્યારથી? એરિયર્સ જોગવાઈ',
        subtitle: 'ચુકાદા મુજબ બાકી રકમ (Arrears) ચૂકવણી',
        bullets: [
          'કોર્ટે રાજ્ય સરકારને અમલ માટે ચોક્કસ સમયમર્યાદા આપી છે',
          'પિટિશન દાખલ કર્યા તારીખથી એરિયર્સ ગણતરીની સ્પષ્ટતા',
          'ખાતામાં એકસાથે એરિયર્સ જમા થવાની પ્રક્રિયા',
        ],
        photoIcon: '📅',
        photoCaption: 'મહત્વપૂર્ણ તારીખો',
      ),
      SlideModel(
        id: 6,
        badge: '🍲 ભોજન & કેન્દ્ર કામગીરી',
        title: 'આંગણવાડી સેવાની મહત્વની ભૂમિકા',
        subtitle: 'બાળકો અને ધાત્રી માતાઓ માટે પાયાની સેવા',
        bullets: [
          'પૂર્ણા યોજના અને પૌષ્ટિક આહાર વિતરણનું પાયાનું કાર્ય',
          'સગર્ભા બહેનોની આરોગ્ય નોંધણી અને રસીકરણ વ્યવસ્થા',
          'કોવિડ અને સરકારી સર્વેમાં આગળ રહીને કરેલી કામગીરી',
        ],
        photoIcon: '🍲',
        photoCaption: 'પૌષ્ટિક આહાર કેન્દ્ર',
      ),
      SlideModel(
        id: 7,
        badge: '📜 પાત્રતા & નિયમો',
        title: 'લાભ કોને મળશે? પાત્રતા નિયમો',
        subtitle: 'કાર્યકર અને તેડાગર બહેનો માટે શરતો',
        bullets: [
          'ગુજરાત સરકાર હેઠળ નોંધાયેલ તમામ કાર્યકર અને તેડાગર બહેનો',
          'નિવૃત્ત થયેલ બહેનો માટે ગ્રેચ્યુઇટી લાભની સ્પષ્ટતા',
          'સર્વિસ બુક અને ડિજિટલ પોર્ટલ પર ડેટા વેરિફિકેશન',
        ],
        photoIcon: '📜',
        photoCaption: 'પાત્રતા અને સેવા નિયમો',
      ),
      SlideModel(
        id: 8,
        badge: '💻 ઓનલાઇન પોર્ટલ',
        title: 'ઓનલાઇન સ્ટેટસ અને ઓર્ડર ડાઉનલોડ',
        subtitle: 'હાઇકોર્ટ ઓર્ડર અને સરકારી પોર્ટલ વિગતો',
        bullets: [
          'ગુજરાત હાઇકોર્ટની સત્તાવાર વેબસાઇટ પરથી ઓર્ડર ડાઉનલોડ',
          'WCD ગુજરાત પોર્ટલ પર નોટિફિકેશન ટ્રેકિંગ સુવિધા',
          'જિલ્લા પંચાયત કક્ષાએ અરજી અને માર્ગદર્શન વ્યવસ્થા',
        ],
        photoIcon: '💻',
        photoCaption: 'OJAS સત્તાવાર પોર્ટલ',
      ),
      SlideModel(
        id: 9,
        badge: '🎯 નિષ્કર્ષ & સારાંશ',
        title: 'સંપૂર્ણ સારાંશ અને સાવચેતી',
        subtitle: 'અફવાઓથી બચો - માત્ર સત્તાવાર પરિપત્ર માન્ય',
        bullets: [
          'હાઇકોર્ટના આદેશથી કર્મચારીઓમાં ખુશીનો માહોલ',
          'સોશિયલ મીડિયા ફેક મેસેજથી સાવધ રહેવા સલાહ',
          'સત્તાવાર GR બહાર પડતાં જ ચેનલ પર સૌથી પહેલાં અપડેટ મળશે',
        ],
        photoIcon: '🏛️',
        photoCaption: 'સત્તાવાર GR પરિપત્ર',
      ),
    ];
  }

  String _getSlideSearchMasterPrompt() {
    if (_promptMode == 'chatgpt') {
      return '''તમે સરકારી ભરતી, યોજના અને કાયદાકીય ચુકાદા વિષય પર ૧૦૮૦p શૈક્ષણિક વિડીયો માટે પ્રોફેશનલ સ્લાઇડ ડિઝાઇનર છો.
વિષય: "$_activeTopic"

મારે આ વિષય પર ૯ શૈક્ષણિક સ્લાઇડ્સનું ૧૬:૯ પાવરપોઇન્ટ ડેક બનાવવું છે.
ખાસ શરતો:
૧. સ્લાઇડમાં કોઈ લાંબી સ્ક્રિપ્ટ કે બોલવાનું લખાણ રાખવું નથી (Strictly Zero Audio/Voice Scripts in slides).
૨. દરેક સ્લાઇડ ૧૬:૯ Pure White બેકગ્રાઉન્ડ માટે યોગ્ય હોવી જોઈએ.
૩. દરેક સ્લાઇડમાં:
   - સ્લાઇડ ક્રમ અને કેટેગરી બેજ (દા.ત. 🏛️ સત્તાવાર GR પરિપત્ર)
   - સ્પષ્ટ, આકર્ષક ગુજરાતી શીર્ષક (Title - મહત્તમ ૮ થી ૧૦ શબ્દો)
   - ગૌણ શીર્ષક (Subtitle)
   - માત્ર ૩ ટૂંકા, મુદ્દાસર બુલેટ પોઇન્ટ્સ (Bullets)
   - ૧ વાસ્તવિક ફોટો સૂચન (વાસ્તવિક સ્થળ, ઓફિસ, સરકારી પરિપત્ર અથવા કોર્ટ - No 3D cartoon, no neon)

કૃપા કરીને સ્લાઇડ ૧ થી ૯ ક્રમબદ્ધ ગુજરાતીમાં આપો.''';
    } else {
      return '''સંદર્ભ વિષય: "$_activeTopic"

NotebookLM સ્ત્રોત દસ્તાવેજો (GR પરિપત્ર, કોર્ટ ચુકાદો, પ્રેસ નોટ) માંથી માત્ર અધિકૃત માહિતી તારવીને ૯ સ્લાઇડ્સ માટે મુખ્ય ફેક્ટ્સ અને બુલેટ્સ અલગ તારવો:
- સ્લાઇડ ૧: ઐતિહાસિક પૃષ્ઠભૂમિ અને મૂળ વિવાદ
- સ્લાઇડ ૨: કોર્ટ અથવા સરકારનો તાજો નિર્ણય
- સ્લાઇડ ૩: નાણાકીય / પગાર / સહાય ગણતરી (જૂનું vs નવું)
- સ્લાઇડ ૪: સચિવાલય GR પરિપત્ર અને નિયમો
- સ્લાઇડ ૫: અમલીકરણ તારીખો અને એરિયર્સ જોગવાઈ
- સ્લાઇડ ૬: જમીની સ્તર પર કામગીરી અને મહત્ત્વ
- સ્લાઇડ ૭: લાભાર્થી પાત્રતા અને શરતો
- સ્લાઇડ ૮: પોર્ટલ અને ડાઉનલોડ પ્રક્રિયા
- સ્લાઇડ ૯: નિષ્કર્ષ અને સાવચેતી

શરત: સ્લાઇડ કન્ટેન્ટમાં સ્ક્રિપ્ટ મિક્સ ના કરશો, ફક્ત સ્વચ્છ ગુજરાતી પોઇન્ટ્સ આપો.''';
    }
  }

  void _copyPromptToClipboard() {
    final prompt = _getSlideSearchMasterPrompt();
    Clipboard.setData(ClipboardData(text: prompt));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Text(
              _promptMode == 'chatgpt'
                  ? 'ChatGPT સ્લાઇડ પ્રોમ્પ્ટ કોપી થયો!'
                  : 'NotebookLM સ્લાઇડ પ્રોમ્પ્ટ કોપી થયો!',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF0F172A),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _openPasteContentModal() {
    final controller = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            left: 16,
            right: 16,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    '📥 સ્લાઇડ કન્ટેન્ટ પેસ્ટ કરો',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'ChatGPT અથવા NotebookLM માંથી આવેલી સ્લાઇડ્સ અહીં પેસ્ટ કરો:',
                style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                maxLines: 6,
                decoration: InputDecoration(
                  hintText: '[સ્લાઇડ ૧]\nશીર્ષક: ...\nમુદ્દા: ...\n\n[સ્લાઇડ ૨]\n...',
                  hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                    borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                  ),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    final txt = controller.text.trim();
                    if (txt.isNotEmpty) {
                      _parseAndApplyPastedContent(txt);
                    }
                    Navigator.pop(ctx);
                  },
                  icon: const Icon(Icons.save, color: Colors.white, size: 18),
                  label: const Text(
                    'સ્લાઇડ્સ અપડેટ કરો',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  void _parseAndApplyPastedContent(String text) {
    // Basic parser for user pasted slides
    final lines = text.split('\n');
    String? curTitle;
    List<String> curBullets = [];

    for (final line in lines) {
      final trimmed = line.trim();
      if (trimmed.isEmpty) continue;

      if (trimmed.contains('શીર્ષક:') || trimmed.contains('Title:')) {
        curTitle = trimmed.split(':').sublist(1).join(':').trim();
      } else if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.startsWith('*')) {
        curBullets.add(trimmed.replaceFirst(RegExp(r'^[-•*]\s*'), ''));
      }
    }

    if (curTitle != null && mounted) {
      setState(() {
        _slides[_currentSlideIndex].title = curTitle!;
        if (curBullets.isNotEmpty) {
          _slides[_currentSlideIndex].bullets = curBullets;
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('સ્લાઇડ સફળતાપૂર્વક અપડેટ થઈ!'),
          backgroundColor: Color(0xFF10B981),
        ),
      );
    }
  }

  void _selectPhotoPreset(String key) {
    final preset = _photoPresets[key];
    if (preset != null && mounted) {
      setState(() {
        _slides[_currentSlideIndex].photoIcon = preset['icon']!;
        _slides[_currentSlideIndex].photoCaption = preset['caption']!;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentSlide = _slides[_currentSlideIndex];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
          tooltip: 'પાછા જાઓ (૧. 48h આઈડિયા)',
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'GYAN YATRA SLIDES',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w900,
                color: Color(0xFF0F172A),
                letterSpacing: 0.5,
              ),
            ),
            Text(
              '૧૬:૯ Slides & Slide Prompts',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: Color(0xFF10B981),
              ),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 12),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFA7F3D0)),
            ),
            alignment: Alignment.center,
            child: Text(
              '${_slides.length} સ્લાઇડ્સ',
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: Color(0xFF059669),
              ),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.copy, color: Color(0xFF10B981), size: 20),
            onPressed: _copyPromptToClipboard,
            tooltip: 'સ્લાઇડ પ્રોમ્પ્ટ કોપી કરો',
          ),
          const SizedBox(width: 8),
        ],
      ),
      // Clean, uncluttered body with NO bottom navigation bar
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Active Topic Banner
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '🎯 સક્રિય વિષય:',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF10B981),
                          ),
                        ),
                        Text(
                          _activeTopic,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF0F172A),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 2. Pure White 16:9 Presentation Slide Canvas
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.04),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // 16:9 Slide Canvas
                  AspectRatio(
                    aspectRatio: 16 / 9,
                    child: Container(
                      padding: const EdgeInsets.all(10),
                      color: Colors.white,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Top Header
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF1F5F9),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: const Color(0xFFCBD5E1)),
                                ),
                                child: Text(
                                  currentSlide.badge,
                                  style: const TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF334155),
                                  ),
                                ),
                              ),
                              Text(
                                'SLIDE ${currentSlide.id} OF ${_slides.length}',
                                style: const TextStyle(
                                  fontSize: 9,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF94A3B8),
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 6),

                          // Slide Content Body (Title, Bullets & Photo Box)
                          Expanded(
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Left 65%: Titles & Bullets
                                Expanded(
                                  flex: 65,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        currentSlide.title,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w900,
                                          color: Color(0xFF0F172A),
                                        ),
                                      ),
                                      Text(
                                        currentSlide.subtitle,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 9,
                                          fontWeight: FontWeight.bold,
                                          color: Color(0xFF0284C7),
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                                          children: currentSlide.bullets.map((bullet) {
                                            return Row(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                const Text(
                                                  '• ',
                                                  style: TextStyle(
                                                    color: Color(0xFF10B981),
                                                    fontWeight: FontWeight.bold,
                                                    fontSize: 10,
                                                  ),
                                                ),
                                                Expanded(
                                                  child: Text(
                                                    bullet,
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                    style: const TextStyle(
                                                      fontSize: 8.5,
                                                      color: Color(0xFF334155),
                                                      fontWeight: FontWeight.w600,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            );
                                          }).toList(),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),

                                const SizedBox(width: 8),

                                // Right 35%: Realistic Photo Visual Box
                                Expanded(
                                  flex: 35,
                                  child: AspectRatio(
                                    aspectRatio: 4 / 3,
                                    child: Container(
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFF8FAFC),
                                        borderRadius: BorderRadius.circular(6),
                                        border: Border.all(color: const Color(0xFFCBD5E1)),
                                      ),
                                      padding: const EdgeInsets.all(4),
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Text(
                                            currentSlide.photoIcon,
                                            style: const TextStyle(fontSize: 22),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            currentSlide.photoCaption,
                                            textAlign: TextAlign.center,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontSize: 7.5,
                                              fontWeight: FontWeight.bold,
                                              color: Color(0xFF475569),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // Slide Footer
                          const Divider(height: 8, color: Color(0xFFF1F5F9)),
                          const Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '🎯 જ્ઞાન યાત્રા એજ્યુકેશનલ સીરીઝ',
                                style: TextStyle(fontSize: 7.5, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold),
                              ),
                              Text(
                                'HD 1080p Presentation',
                                style: TextStyle(fontSize: 7.5, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Slide Controls Strip
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: const BoxDecoration(
                      color: Color(0xFFF8FAFC),
                      border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        ElevatedButton.icon(
                          onPressed: _currentSlideIndex > 0
                              ? () => setState(() => _currentSlideIndex--)
                              : null,
                          icon: const Text('◀️', style: TextStyle(fontSize: 10)),
                          label: const Text('અગાઉ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: const Color(0xFF0F172A),
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(6),
                              side: const BorderSide(color: Color(0xFFCBD5E1)),
                            ),
                          ),
                        ),

                        Text(
                          '${_currentSlideIndex + 1} / ${_slides.length}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF10B981),
                          ),
                        ),

                        ElevatedButton(
                          onPressed: _currentSlideIndex < _slides.length - 1
                              ? () => setState(() => _currentSlideIndex++)
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.white,
                            foregroundColor: const Color(0xFF0F172A),
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(6),
                              side: const BorderSide(color: Color(0xFFCBD5E1)),
                            ),
                          ),
                          child: const Row(
                            children: [
                              Text('આગળ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                              SizedBox(width: 4),
                              Text('▶️', style: TextStyle(fontSize: 10)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Slide Jump Pills (1..9)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    color: const Color(0xFFF8FAFC),
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: List.generate(_slides.length, (idx) {
                          final isActive = idx == _currentSlideIndex;
                          return Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: InkWell(
                              onTap: () => setState(() => _currentSlideIndex = idx),
                              borderRadius: BorderRadius.circular(6),
                              child: Container(
                                width: 28,
                                height: 28,
                                alignment: Alignment.center,
                                decoration: BoxDecoration(
                                  color: isActive ? const Color(0xFF10B981) : Colors.white,
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                    color: isActive ? const Color(0xFF10B981) : const Color(0xFFCBD5E1),
                                  ),
                                ),
                                child: Text(
                                  '${idx + 1}',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: isActive ? Colors.white : const Color(0xFF475569),
                                  ),
                                ),
                              ),
                            ),
                          );
                        }),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 3. Realistic Photo Visual Preset Selector
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '🖼️ આ સ્લાઇડ માટે વાસ્તવિક ફોટો બદલો:',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F172A),
                        ),
                      ),
                      Text(
                        'વાસ્તવિક ફોટા',
                        style: TextStyle(fontSize: 9, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _photoPresets.entries.map((entry) {
                        final key = entry.key;
                        final isSelected = currentSlide.photoIcon == entry.value['icon'];
                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: InkWell(
                            onTap: () => _selectPhotoPreset(key),
                            borderRadius: BorderRadius.circular(6),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFFF0FDF4) : const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: isSelected ? const Color(0xFF10B981) : const Color(0xFFE2E8F0),
                                  width: isSelected ? 1.5 : 1,
                                ),
                              ),
                              child: Text(
                                '${entry.value['icon']} ${entry.value['caption']!.split(' ').first}',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                  color: isSelected ? const Color(0xFF166534) : const Color(0xFF334155),
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 4. Slide Prompts Card (ChatGPT & NotebookLM)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF0284C7), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0284C7).withOpacity(0.08),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        '⚡ સ્લાઇડ કન્ટેન્ટ સર્ચ પ્રોમ્પ્ટ',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0284C7),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFECFDF5),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'No Scripts',
                          style: TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF059669),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),

                  // Prompt Mode Selector Tabs
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _promptMode = 'chatgpt'),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: _promptMode == 'chatgpt' ? const Color(0xFF0284C7) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '⚡ ChatGPT સ્લાઇડ',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: _promptMode == 'chatgpt' ? Colors.white : const Color(0xFF475569),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _promptMode = 'notebooklm'),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: _promptMode == 'notebooklm' ? const Color(0xFF0284C7) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '📓 NotebookLM',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: _promptMode == 'notebooklm' ? Colors.white : const Color(0xFF475569),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),

                  // Prompt Text Preview
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Text(
                      _getSlideSearchMasterPrompt(),
                      style: const TextStyle(
                        fontSize: 10,
                        color: Color(0xFF334155),
                        height: 1.4,
                      ),
                    ),
                  ),

                  const SizedBox(height: 10),

                  // Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _copyPromptToClipboard,
                          icon: const Icon(Icons.copy, size: 14, color: Colors.white),
                          label: const Text(
                            'પ્રોમ્પ્ટ કોપી કરો',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0284C7),
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _openPasteContentModal,
                          icon: const Icon(Icons.paste, size: 14, color: Color(0xFF10B981)),
                          label: const Text(
                            'કન્ટેન્ટ પેસ્ટ કરો',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF10B981), width: 1.5),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),

                  // Direct Tools Open (ChatGPT & NotebookLM)
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            _copyPromptToClipboard();
                            Clipboard.setData(const ClipboardData(text: 'https://chatgpt.com'));
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: const Text('⚡ ChatGPT લિંક કોપી થઈ & પ્રોમ્પ્ટ તૈયાર! (chatgpt.com)'),
                                backgroundColor: const Color(0xFF10A37F),
                                behavior: SnackBarBehavior.floating,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            );
                          },
                          icon: const Icon(Icons.bolt, size: 14, color: Color(0xFF10A37F)),
                          label: const Text(
                            '⚡ ChatGPT ખોલો',
                            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF10A37F)),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF10A37F), width: 1.2),
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            _copyPromptToClipboard();
                            Clipboard.setData(const ClipboardData(text: 'https://notebooklm.google.com'));
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: const Text('📓 NotebookLM લિંક કોપી થઈ & પ્રોમ્પ્ટ તૈયાર! (notebooklm.google.com)'),
                                backgroundColor: const Color(0xFF4285F4),
                                behavior: SnackBarBehavior.floating,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            );
                          },
                          icon: const Icon(Icons.book, size: 14, color: Color(0xFF4285F4)),
                          label: const Text(
                            '📓 NotebookLM ખોલો',
                            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF4285F4)),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF4285F4), width: 1.2),
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // 5. Next Step Strip (Screen 4: Script Writer)
            InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ScriptScreen(
                      initialTopic: _activeTopic,
                      slideTitles: _slides.map((s) => s.title).toList(),
                    ),
                  ),
                );
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  border: Border.all(color: const Color(0xFF93C5FD), width: 1.5),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    Text('📝 ', style: TextStyle(fontSize: 18)),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'આગળની સ્ક્રીન: ૪. Script Writer',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF1E40AF),
                            ),
                          ),
                          Text(
                            'સ્લાઇડ્સના આધારે ગુજરાતી સ્ક્રિપ્ટ અને પ્રોમ્પ્ટ જોવા ક્લિક કરો',
                            style: TextStyle(fontSize: 9.5, color: Color(0xFF2563EB)),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.arrow_forward_ios, size: 14, color: Color(0xFF1E40AF)),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
