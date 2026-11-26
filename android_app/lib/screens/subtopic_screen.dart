import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'slide_screen.dart';

class SubtopicItem {
  final int step;
  final String badge;
  final String title;
  final String focus;

  SubtopicItem({
    required this.step,
    required this.badge,
    required this.title,
    required this.focus,
  });
}

class SubtopicScreen extends StatefulWidget {
  final String? initialTopic;

  const SubtopicScreen({super.key, this.initialTopic});

  @override
  State<SubtopicScreen> createState() => _SubtopicScreenState();
}

class _SubtopicScreenState extends State<SubtopicScreen> {
  late final TextEditingController _topicController;

  late List<SubtopicItem> _subtopics;

  @override
  void initState() {
    super.initState();
    _topicController = TextEditingController(
      text: widget.initialTopic ?? 'આંગણવાડી પગાર વધારો હાઈકોર્ટ ચુકાદો',
    );
    _generateSubtopicsList(_topicController.text);
  }

  @override
  void dispose() {
    _topicController.dispose();
    super.dispose();
  }

  void _generateSubtopicsList(String baseTopic) {
    setState(() {
      _subtopics = [
        SubtopicItem(
          step: 1,
          badge: '🏛️ કાનૂની આદેશ',
          title: '$baseTopic અંગે હાઈકોર્ટનો ઐતિહાસિક આદેશ (LPA 363/2025 ચુકાદો)',
          focus: 'મૂળ કેસ અને કોર્ટનો સીધો નિર્દેશ',
        ),
        SubtopicItem(
          step: 2,
          badge: '⚖️ પગાર સરખામણી',
          title: 'કાર્યકર અને તેડાગર: જૂનું માનદ વેતન vs નવો સન્માનજનક પગાર સંપૂર્ણ સરખામણી',
          focus: 'જૂના અને નવા વેતન માળખા વચ્ચેનો તફાવત',
        ),
        SubtopicItem(
          step: 3,
          badge: '💰 ગણતરી ફોર્મ્યુલા',
          title: 'નવા વેતન માળખાની ગણતરી: લઘુતમ વેતન ધારા હેઠળ માસિક ₹૨૪,૮૦૦ પગાર કેવી રીતે મળશે?',
          focus: 'ચોક્કસ રૂપિયા અને નાણાકીય આંકડા',
        ),
        SubtopicItem(
          step: 4,
          badge: '📅 અમલ & એરિયર્સ',
          title: 'અમલીકરણની તારીખ અને એરિયર્સ (Arrears) ની જોગવાઈ: ક્યારથી મળશે બાકી રકમ?',
          focus: 'સમયમર્યાદા અને ખાતામાં જમા થવાની તારીખ',
        ),
        SubtopicItem(
          step: 5,
          badge: '🏢 સચિવાલય GR',
          title: 'ગાંધીનગર સચિવાલય GR પરિપત્ર અને નાણાં વિભાગ પ્રક્રિયા: સત્તાવાર ઓર્ડર PDF ડાઉનલોડ',
          focus: 'સત્તાવાર સરકારી ઠરાવ અને પુરાવા',
        ),
      ];
    });
  }

  String _getSubtopicsResearchPrompt() {
    final topic = _topicController.text.trim();
    return '''તમે ગુજરાતી YouTube એજ્યુકેશનલ વિડીયો કન્સલ્ટન્ટ છો.
મારો મુખ્ય વિષય છે: "$topic"

મારે આ એક જ મુખ્ય વિષયના આધારે શ્રેણીબદ્ધ ૫ અલગ-અલગ સબ-ટોપિક્સ (અનુસંધાન વિષયો) બનાવવા છે જેથી દર્શકો એક પછી એક બધા વિડીયો જુએ.
કૃપા કરીને આ વિષયના આધારે નીચે મુજબ ૫ વિશિષ્ટ વિષયો ગુજરાતીમાં આપો:

૧. વિષય ૧ (મૂળ આદેશ / બેકગ્રાઉન્ડ): કાનૂની પૃષ્ઠભૂમિ, હાઇકોર્ટ ઓર્ડર અથવા સરકારી નોટિફિકેશન
૨. વિષય ૨ (તુલના): જૂની સ્થિતિ vs નવી સ્થિતિ (માનદ વેતન vs લઘુતમ વેતન)
૩. વિષય ૩ (ગણતરી): ચોક્કસ નાણાકીય ગણતરી અને ₹૨૪,૮૦૦ માસિક ફોર્મ્યુલા
૪. વિષય ૪ (અમલીકરણ & એરિયર્સ): કઈ તારીખથી અમલ શરૂ થશે અને બાકી રકમ (Arrears) ની જોગવાઈ
૫. વિષય ૫ (સચિવાલય પ્રક્રિયા): સત્તાવાર GR પરિપત્ર, ઓર્ડર PDF અને આગામી પગલાં

દરેક વિષયનું આકર્ષક ગુજરાતી શીર્ષક અને ૧ મુખ્ય હાઈલાઈટ આપો.''';
  }

  void _copyPrompt() {
    Clipboard.setData(ClipboardData(text: _getSubtopicsResearchPrompt()));
    _showToast('૫ સબ-ટોપિક્સ રિસર્ચ પ્રોમ્પ્ટ કોપી થયો!');
  }

  void _showToast(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Text(msg, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          ],
        ),
        backgroundColor: const Color(0xFF0F172A),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _goToSlideScreen(String selectedTopic) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => SlideScreen(initialTopic: selectedTopic),
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
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
          tooltip: 'પાછા (૧. 48h આઈડિયા)',
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'GYAN YATRA SUB-TOPICS',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            ),
            Text(
              '૨. ૫ અનુસંધાન વિષયો રિસર્ચ',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF7C3AED)),
            ),
          ],
        ),
        actions: [
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              foregroundColor: Colors.white,
              elevation: 0,
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: const Icon(Icons.slideshow, size: 14),
            label: const Text('સ્લાઇડ્સ →', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
            onPressed: () => _goToSlideScreen(_subtopics.first.title),
          ),
          const SizedBox(width: 8),
        ],
      ),
      // Clean, zero bottom bar
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Topic Input Box
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8, offset: const Offset(0, 3)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '🎯 તમારો મુખ્ય વિષય લખો:',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _topicController,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    decoration: InputDecoration(
                      hintText: 'દા.ત. આંગણવાડી પગાર વધારો હાઈકોર્ટ ચુકાદો',
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8),
                        borderSide: const BorderSide(color: Color(0xFFCBD5E1)),
                      ),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _generateSubtopicsList(_topicController.text),
                      icon: const Icon(Icons.auto_awesome, size: 14, color: Colors.white),
                      label: const Text(
                        '૫ અનુસંધાન વિષયો અપડેટ કરો',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF7C3AED),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 2. Master Subtopics Search Prompt Card
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF7C3AED), width: 1.5),
                boxShadow: [
                  BoxShadow(color: const Color(0xFF7C3AED).withOpacity(0.08), blurRadius: 8, offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        '⚡ ChatGPT સબ-ટોપિક્સ પ્રોમ્પ્ટ',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF7C3AED)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF3E8FF),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          '૫ વિષયો ફોર્મ્યુલા',
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF7C3AED)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'આ પ્રોમ્પ્ટ કોપી કરીને ChatGPT માં નાખો, એટલે એ જ વિષયના અનુસંધાનમાં ૫ અલગ અલગ વિષયો આપશે:',
                    style: TextStyle(fontSize: 9.5, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Text(
                      _getSubtopicsResearchPrompt(),
                      style: const TextStyle(fontSize: 9.5, color: Color(0xFF334155), height: 1.35),
                      maxLines: 4,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _copyPrompt,
                      icon: const Icon(Icons.copy, size: 14, color: Colors.white),
                      label: const Text(
                        'પ્રોમ્પ્ટ કોપી કરો (ChatGPT માટે)',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF7C3AED),
                        padding: const EdgeInsets.symmetric(vertical: 9),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 3. The 5 Connected Sub-Topic Cards
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  '📚 આ વિષયના ૫ અનુસંધાન વિષયો:',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                ),
                Text(
                  '${_subtopics.length} વિષયો તૈયાર',
                  style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                ),
              ],
            ),

            const SizedBox(height: 8),

            Column(
              children: _subtopics.map((sub) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 4, offset: const Offset(0, 2)),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEDE9FE),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: const Color(0xFFDDD6FE)),
                            ),
                            child: Text(
                              sub.badge,
                              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF6D28D9)),
                            ),
                          ),
                          Text(
                            'વિષય ${sub.step} / ૫',
                            style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 5),
                      Text(
                        sub.title,
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0F172A), height: 1.3),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        '🎯 ફોકસ: ${sub.focus}',
                        style: const TextStyle(fontSize: 9, color: Color(0xFF64748B)),
                      ),
                      const Divider(height: 12, color: Color(0xFFF1F5F9)),
                      Row(
                        children: [
                          OutlinedButton.icon(
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: sub.title));
                              _showToast('વિષય કોપી થયો!');
                            },
                            icon: const Icon(Icons.copy, size: 12),
                            label: const Text('કોપી', style: TextStyle(fontSize: 10)),
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              side: const BorderSide(color: Color(0xFFCBD5E1)),
                            ),
                          ),
                          const Spacer(),
                          ElevatedButton.icon(
                            onPressed: () => _goToSlideScreen(sub.title),
                            icon: const Icon(Icons.slideshow, size: 12, color: Colors.white),
                            label: const Text('આના પર સ્લાઇડ બનાવો →', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF10B981),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              minimumSize: Size.zero,
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              elevation: 0,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 10),

            // 4. Next Screen Box (Screen 3: 16:9 Slides)
            InkWell(
              onTap: () => _goToSlideScreen(_subtopics.first.title),
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
                    Text('📑 ', style: TextStyle(fontSize: 20)),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('આગળની સ્ક્રીન: ૩. ૧૬:૯ સ્લાઇડ્સ & સ્લાઇડ પ્રોમ્પ્ટ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E40AF))),
                          Text('પ્યોર વ્હાઇટ સ્લાઇડ્સ, ChatGPT અને NotebookLM ઓપન કરવા ક્લિક કરો', style: TextStyle(fontSize: 9.5, color: Color(0xFF2563EB))),
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
