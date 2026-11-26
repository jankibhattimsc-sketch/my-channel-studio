import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'voice_screen.dart';

class ScriptSlideSection {
  final int slideNum;
  final String slideTitle;
  String scriptText;

  ScriptSlideSection({
    required this.slideNum,
    required this.slideTitle,
    required this.scriptText,
  });
}

class ScriptScreen extends StatefulWidget {
  final String? initialTopic;
  final List<String>? slideTitles;

  const ScriptScreen({
    super.key,
    this.initialTopic,
    this.slideTitles,
  });

  @override
  State<ScriptScreen> createState() => _ScriptScreenState();
}

class _ScriptScreenState extends State<ScriptScreen> {
  late String _activeTopic;
  String _toneMode = 'anchor'; // 'anchor' | 'friendly'
  int _selectedSlideIdx = 0;
  late List<ScriptSlideSection> _sections;
  late TextEditingController _scriptEditorController;

  @override
  void initState() {
    super.initState();
    _activeTopic = widget.initialTopic ??
        'આંગણવાડી બહેનોના પગાર વધારા અંગે હાઈકોર્ટનો ઐતિહાસિક આદેશ (LPA 363/2025)';
    _initDefaultSections();
    _scriptEditorController = TextEditingController(
      text: _sections[_selectedSlideIdx].scriptText,
    );
  }

  @override
  void dispose() {
    _scriptEditorController.dispose();
    super.dispose();
  }

  void _initDefaultSections() {
    final titles = widget.slideTitles ??
        [
          'ગુજરાત હાઇકોર્ટનો ઐતિહાસિક ચુકાદો',
          'કોર્ટના મહત્વના આદેશના મુખ્ય મુદ્દા',
          'નવા પગાર માળખાની સંપૂર્ણ ગણતરી',
          'ગાંધીનગર સચિવાલય GR પરિપત્ર',
          'અમલ ક્યારથી? એરિયર્સ જોગવાઈ',
          'આંગણવાડી સેવાની મહત્વની ભૂમિકા',
          'લાભ કોને મળશે? પાત્રતા નિયમો',
          'ઓનલાઇન સ્ટેટસ અને ઓર્ડર ડાઉનલોડ',
          'સંપૂર્ણ સારાંશ અને સાવચેતી',
        ];

    final defaultScripts = [
      'નમસ્કાર મિત્રો, જ્ઞાન યાત્રામાં આપનું સ્વાગત છે. ગુજરાતની હજારો આંગણવાડી કાર્યકર અને તેડાગર બહેનો માટે ગુજરાત હાઇકોર્ટની ડિવિઝન બેંચે LPA 363/2025 હેઠળ એક ઐતિહાસિક આદેશ આપ્યો છે. કોર્ટે સ્પષ્ટ નિર્દેશ કર્યો છે કે બહેનોને લઘુતમ વેતન મુજબ સન્માનજનક પગાર મળવો જ જોઈએ.',
      'કોર્ટના આ ચુકાદામાં સુપ્રીમ કોર્ટના અગાઉના આદેશોનો આધાર લઈને સ્પષ્ટ કરવામાં આવ્યું છે કે વર્ષોથી ચાલતી માનદ વેતન પ્રથા કાયમી કામગીરી સામે અયોગ્ય છે. કેન્દ્ર અને રાજ્ય સરકાર બંનેની સંયુક્ત જવાબદારી નક્કી કરીને સેવા સાતત્ય અને ગ્રેચ્યુઇટી અંગે પણ મહત્વનું અવલોકન કર્યું છે.',
      'હવે વાત કરીએ નવા પગાર માળખાની ગણતરી વિશે. જૂના માનદ વેતન મુજબ કાર્યકર બહેનોને ₹૧૦,૦૦૦ મળતા હતા, જે લઘુતમ વેતન ધારા મુજબ વધીને માસિક ₹૨૪,૮૦૦ સુધી પહોંચી શકે છે. જ્યારે તેડાગર બહેનોના પગારમાં પણ ₹૫,૫૦૦ થી વધીને ₹૧૮,૦૦૦ સુધીનો મોટો ફાયદો થવાની શક્યતા છે.',
      'આ ચુકાદા બાદ ગાંધીનગર સચિવાલય ખાતે મહિલા અને બાળ વિકાસ વિભાગ તેમજ નાણાં વિભાગમાં બજેટ જોગવાઈની પ્રક્રિયા તેજ બની છે. રાજ્યભરના ૫૩,૦૦૦ થી વધુ આંગણવાડી કેન્દ્રોને આવરી લેતો સત્તાવાર ઠરાવ એટલે કે GR ટૂંક સમયમાં બહાર પડી શકે છે.',
      'સૌથી મહત્વનો પ્રશ્ન એ છે કે નવો પગાર ક્યારથી લાગુ થશે અને એરિયર્સનું શું? હાઇકોર્ટે રાજ્ય સરકારને અમલીકરણ માટે ચોક્કસ સમયમર્યાદા આપી છે. પિટિશન દાખલ કર્યા તારીખથી બાકી નીકળતી એરિયર્સની રકમ પણ સીધી બહેનોના બેંક ખાતામાં જમા કરવાની જોગવાઈ છે.',
      'આંગણવાડી બહેનો માત્ર ભોજન કેન્દ્ર જ નથી ચલાવતી, પરંતુ પૂર્ણા યોજના, સગર્ભા બહેનોની આરોગ્ય નોંધણી, રસીકરણ અને સરકારના તમામ મહત્વના સર્વેમાં પાયાની ભૂમિકા નિભાવે છે. આ મહેનતને ધ્યાનમાં રાખીને જ કોર્ટે આ સન્માનજનક નિર્ણય સંભળાવ્યો છે.',
      'હવે જોઈએ કે આ લાભ કોને મળશે? ગુજરાત સરકાર હેઠળ નોંધાયેલી તમામ કાયમી કાર્યકર અને તેડાગર બહેનો આ માટે પાત્ર ગણાશે. નિવૃત્ત થયેલી બહેનો માટે ગ્રેચ્યુઇટી લાભ અને ડિજિટલ પોર્ટલ પર સર્વિસ બુક વેરિફિકેશન જરૂરી રહેશે.',
      'તમે ગુજરાત હાઇકોર્ટની સત્તાવાર વેબસાઇટ પર જઈને LPA 363/2025 ઓર્ડરની નકલ ડાઉનલોડ કરી શકો છો. ઉપરાંત WCD ગુજરાત પોર્ટલ અને જિલ્લા પંચાયત કચેરીએથી પણ સત્તાવાર પરિપત્રની માહિતી મેળવી શકાય છે.',
      'અંતમાં એટલું જ કહીશું કે સોશિયલ મીડિયા પર ફરતા કોઈ પણ ફેક મેસેજ પર વિશ્વાસ ન કરશો. માત્ર સરકારનો સત્તાવાર GR પરિપત્ર જ માન્ય ગણાશે. આવી જ સચોટ અને વિશ્વસનીય માહિતી માટે ચેનલને સબ્સ્ક્રાઇબ કરવાનું ભૂલશો નહીં. ધન્યવાદ!',
    ];

    _sections = List.generate(titles.length, (i) {
      return ScriptSlideSection(
        slideNum: i + 1,
        slideTitle: titles[i],
        scriptText: i < defaultScripts.length
            ? defaultScripts[i]
            : '${titles[i]} વિશે સંપૂર્ણ સચોટ માહિતી અને વિગતો.',
      );
    });
  }

  String _getScriptMasterPrompt() {
    final toneDesc = _toneMode == 'anchor'
        ? 'ગંભીર, સચોટ અને વિશ્વસનીય ગુજરાતી ન્યૂઝ એન્કર સ્ટાઇલ'
        : 'સરળ, મિત્રતાપૂર્ણ અને ગ્રામીણ દર્શકોને તરત સમજાય તેવી ગુજરાતી ભાષા';

    final slideLines = _sections
        .map((s) => '[સ્લાઇડ ${s.slideNum}] ${s.slideTitle}')
        .join('\n');

    return '''તમે ગુજરાતી YouTube એજ્યુકેશનલ ચેનલ "જ્ઞાન યાત્રા" ના સિનિયર સ્ક્રિપ્ટ રાઇટર છો.
વિષય: "$_activeTopic"
સ્ટાઇલ / ટોન: $toneDesc

નીચે આપેલી ${_sections.length} સ્લાઇડ્સ મુજબ સ્લાઇડ-બાય-સ્લાઇડ ગુજરાતી વોઇસઓવર સ્ક્રિપ્ટ લખો:
$slideLines

ખાસ નિયમો:
૧. દરેક સ્લાઇડ માટે [સ્લાઇડ ૧], [સ્લાઇડ ૨]... એમ અલગ હેડિંગ આપીને નીચે માત્ર બોલવાનું લખાણ (Voiceover) આપો.
૨. દરેક સ્લાઇડની સ્ક્રિપ્ટ ૪૦ થી ૬૦ શબ્દોની (૩૦-૪૦ સેકન્ડ બોલી શકાય તેવી) રાખો.
૩. બધી તારીખો, રકમ (₹) અને કેસ નંબર સ્પષ્ટ અને સાચા લખો.
૪. કોઈ બિનજરૂરી બ્રેકેટ કે સ્ટેજ ડિરેક્શન (જેમ કે [music], [pause]) ન લખો.''';
  }

  void _showToast(String msg, {Color bg = const Color(0xFF0F172A)}) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
        backgroundColor: bg,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _copyScriptPrompt() {
    Clipboard.setData(ClipboardData(text: _getScriptMasterPrompt()));
    _showToast('ChatGPT સ્ક્રિપ્ટ પ્રોમ્પ્ટ કોપી થયો!');
  }

  void _copyFullScript() {
    final full = _sections
        .map((s) => '[સ્લાઇડ ${s.slideNum}: ${s.slideTitle}]\n${s.scriptText}')
        .join('\n\n');
    Clipboard.setData(ClipboardData(text: full));
    _showToast('બધી ${_sections.length} સ્લાઇડ્સની સંપૂર્ણ સ્ક્રિપ્ટ કોપી થઈ!',
        bg: const Color(0xFF10B981));
  }

  void _openPasteScriptModal() {
    final pasteCtrl = TextEditingController();
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
                    '📥 ChatGPT સ્ક્રિપ્ટ પેસ્ટ કરો',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const Text(
                'ChatGPT માંથી આવેલી [સ્લાઇડ ૧] થી [સ્લાઇડ ૯] સ્ક્રિપ્ટ અહીં પેસ્ટ કરો:',
                style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: pasteCtrl,
                maxLines: 6,
                decoration: InputDecoration(
                  hintText: '[સ્લાઇડ ૧]\nનમસ્કાર મિત્રો...\n\n[સ્લાઇડ ૨]\n...',
                  hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  filled: true,
                  fillColor: const Color(0xFFF8FAFC),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    final raw = pasteCtrl.text.trim();
                    if (raw.isNotEmpty) {
                      _parsePastedScript(raw);
                    }
                    Navigator.pop(ctx);
                  },
                  icon: const Icon(Icons.save, color: Colors.white, size: 18),
                  label: const Text(
                    'સ્લાઇડ મુજબ સ્ક્રિપ્ટ સેવ કરો',
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
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

  void _parsePastedScript(String raw) {
    final regex = RegExp(r'\[(?:સ્લાઇડ|Slide)\s*\d+[^\]]*\]', caseSensitive: false);
    final parts = raw.split(regex).where((e) => e.trim().isNotEmpty).toList();
    setState(() {
      if (parts.length > 1) {
        for (int i = 0; i < _sections.length && i < parts.length; i++) {
          _sections[i].scriptText = parts[i].trim();
        }
      } else {
        _sections[_selectedSlideIdx].scriptText = raw;
      }
      _scriptEditorController.text = _sections[_selectedSlideIdx].scriptText;
    });
    _showToast('સ્ક્રિપ્ટ સફળતાપૂર્વક અપડેટ થઈ!', bg: const Color(0xFF10B981));
  }

  int _wordCount(String text) {
    return text.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
  }

  @override
  Widget build(BuildContext context) {
    final curSection = _sections[_selectedSlideIdx];
    final words = _wordCount(curSection.scriptText);
    final secEstimate = (words * 0.45).round().clamp(5, 300);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
          tooltip: 'પાછા (૩. સ્લાઇડ્સ)',
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'GYAN YATRA SCRIPT',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            ),
            Text(
              '૪. Script Writer & Prompts',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 12),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: const Color(0xFFEFF6FF),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFF93C5FD)),
            ),
            alignment: Alignment.center,
            child: Text(
              '${_sections.length} સ્લાઇડ્સ લિંક',
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF1E40AF)),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.copy_all, color: Color(0xFF2563EB), size: 20),
            onPressed: _copyFullScript,
            tooltip: 'સંપૂર્ણ સ્ક્રિપ્ટ કોપી કરો',
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Active Topic & Linked Slides Banner
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '🎯 સ્લાઇડ્સ સાથે જોડાયેલ વિષય:',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _activeTopic,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 2. ChatGPT Script Writing Master Prompt Card
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF2563EB), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF2563EB).withOpacity(0.08),
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
                        '✍️ ChatGPT સ્ક્રિપ્ટ માસ્ટર પ્રોમ્પ્ટ',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF1E40AF)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDBEAFE),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'Slide-Wise',
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF1D4ED8)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Tone Switch
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _toneMode = 'anchor'),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: _toneMode == 'anchor' ? const Color(0xFF2563EB) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '🎙️ ન્યૂઝ એન્કર',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.bold,
                                color: _toneMode == 'anchor' ? Colors.white : const Color(0xFF475569),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: InkWell(
                          onTap: () => setState(() => _toneMode = 'friendly'),
                          borderRadius: BorderRadius.circular(8),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 6),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: _toneMode == 'friendly' ? const Color(0xFF2563EB) : const Color(0xFFF1F5F9),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '😊 સરળ સમજૂતી',
                              style: TextStyle(
                                fontSize: 10.5,
                                fontWeight: FontWeight.bold,
                                color: _toneMode == 'friendly' ? Colors.white : const Color(0xFF475569),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Text(
                      _getScriptMasterPrompt(),
                      maxLines: 5,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 9.5, color: Color(0xFF334155), height: 1.35),
                    ),
                  ),
                  const SizedBox(height: 8),

                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _copyScriptPrompt,
                          icon: const Icon(Icons.copy, size: 14, color: Colors.white),
                          label: const Text(
                            'પ્રોમ્પ્ટ કોપી',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF2563EB),
                            elevation: 0,
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            _copyScriptPrompt();
                            Clipboard.setData(const ClipboardData(text: 'https://chatgpt.com'));
                            _showToast('⚡ ChatGPT લિંક & સ્ક્રિપ્ટ પ્રોમ્પ્ટ કોપી થયા!',
                                bg: const Color(0xFF10A37F));
                          },
                          icon: const Icon(Icons.bolt, size: 14, color: Color(0xFF10A37F)),
                          label: const Text(
                            'ChatGPT ખોલો',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF10A37F)),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFF10A37F), width: 1.2),
                            padding: const EdgeInsets.symmetric(vertical: 9),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: _openPasteScriptModal,
                      icon: const Icon(Icons.paste, size: 14, color: Color(0xFF7C3AED)),
                      label: const Text(
                        '📥 ChatGPT સ્ક્રિપ્ટ પેસ્ટ કરો',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF7C3AED)),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF7C3AED), width: 1.3),
                        padding: const EdgeInsets.symmetric(vertical: 9),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 3. Slide-Wise Script Viewer & Editor
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
                      const Text(
                        '📜 સ્લાઇડ મુજબ વોઇસઓવર સ્ક્રિપ્ટ:',
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                      ),
                      Text(
                        '~$secEstimate સેકન્ડ • $words શબ્દો',
                        style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  // Slide selector pills
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: List.generate(_sections.length, (idx) {
                        final active = idx == _selectedSlideIdx;
                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: InkWell(
                            onTap: () {
                              setState(() {
                                _selectedSlideIdx = idx;
                                _scriptEditorController.text = _sections[idx].scriptText;
                              });
                            },
                            borderRadius: BorderRadius.circular(6),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: active ? const Color(0xFF2563EB) : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: active ? const Color(0xFF2563EB) : const Color(0xFFCBD5E1),
                                ),
                              ),
                              child: Text(
                                'સ્લાઇડ ${idx + 1}',
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.bold,
                                  color: active ? Colors.white : const Color(0xFF475569),
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),

                  const SizedBox(height: 8),
                  Text(
                    '📌 ${curSection.slideTitle}',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E40AF)),
                  ),
                  const SizedBox(height: 6),

                  TextField(
                    controller: _scriptEditorController,
                    maxLines: 5,
                    onChanged: (val) {
                      setState(() {
                        _sections[_selectedSlideIdx].scriptText = val;
                      });
                    },
                    style: const TextStyle(fontSize: 11.5, color: Color(0xFF0F172A), height: 1.45),
                    decoration: InputDecoration(
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                      ),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                    ),
                  ),

                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: curSection.scriptText));
                            _showToast('સ્લાઇડ ${curSection.slideNum} ની સ્ક્રિપ્ટ કોપી થઈ!');
                          },
                          icon: const Icon(Icons.copy, size: 13),
                          label: Text('સ્લાઇડ ${curSection.slideNum} કોપી', style: const TextStyle(fontSize: 10.5)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _copyFullScript,
                          icon: const Icon(Icons.copy_all, size: 14, color: Colors.white),
                          label: const Text(
                            'બધી સ્ક્રિપ્ટ કોપી',
                            style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            elevation: 0,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 4. Next Step Banner (Screen 5: Voice Record Studio)
            InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => VoiceScreen(
                      initialTopic: _activeTopic,
                      slideTitles: _sections.map((s) => s.slideTitle).toList(),
                      slideScripts: _sections.map((s) => s.scriptText).toList(),
                    ),
                  ),
                );
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  border: Border.all(color: const Color(0xFF86EFAC), width: 1.5),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    Text('🎙️ ', style: TextStyle(fontSize: 20)),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'આગળની સ્ક્રીન: ૫. Voice Record (અવાજ રેકોર્ડિંગ)',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                          ),
                          Text(
                            'આ સ્ક્રિપ્ટ વાંચીને સ્લાઇડ-બાય-સ્લાઇડ અવાજ રેકોર્ડ કરવા ક્લિક કરો',
                            style: TextStyle(fontSize: 9.5, color: Color(0xFF15803D)),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.arrow_forward_ios, size: 14, color: Color(0xFF166534)),
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
