import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class SeoScreen extends StatefulWidget {
  final String? initialTopic;

  const SeoScreen({super.key, this.initialTopic});

  @override
  State<SeoScreen> createState() => _SeoScreenState();
}

class _SeoScreenState extends State<SeoScreen> {
  late String _activeTopic;
  int _selectedTitleIdx = 0;

  late List<String> _titles;
  late TextEditingController _descController;
  late TextEditingController _tagsController;

  @override
  void initState() {
    super.initState();
    _activeTopic = widget.initialTopic ??
        'આંગણવાડી બહેનોના પગાર વધારા અંગે હાઈકોર્ટનો ઐતિહાસિક આદેશ (LPA 363/2025)';

    _titles = [
      '$_activeTopic | નવો પગાર ₹૨૪,૮૦૦ & એરિયર્સ સંપૂર્ણ માહિતી 2026',
      'ખુશખબર! આંગણવાડી કાર્યકર અને તેડાગર બહેનોનો પગાર વધારો — ગુજરાત હાઇકોર્ટ ઓર્ડર',
      'ગુજરાત આંગણવાડી પગાર વધારો 2026: જૂનું vs નવું વેતન, GR પરિપત્ર & અમલ તારીખ',
    ];

    _descController = TextEditingController(
      text: '''🎯 $_activeTopic

આ વિડીયોમાં આપણે ગુજરાત હાઇકોર્ટના ઐતિહાસિક ચુકાદા (LPA 363/2025), નવા લઘુતમ વેતન મુજબ પગાર ગણતરી (₹૨૪,૮૦૦), અમલીકરણની તારીખ, એરિયર્સ અને ગાંધીનગર સચિવાલય GR પરિપત્રની સંપૂર્ણ વિગતવાર માહિતી સમજીશું.

⏱️ વિડીયો ટાઇમસ્ટેમ્પ્સ:
00:00 - હાઇકોર્ટનો ઐતિહાસિક ચુકાદો (LPA 363/2025)
01:15 - જૂનું માનદ વેતન vs નવો પગાર તફાવત
02:45 - ₹૨૪,૮૦૦ પગાર ગણતરી અને એરિયર્સ
04:10 - સચિવાલય GR પરિપત્ર અને ઓર્ડર PDF

⚠️ નોંધ: આ વિડીયો માત્ર શૈક્ષણિક અને સત્તાવાર માહિતી માટે છે. હંમેશા સત્તાવાર સરકારી પોર્ટલની ચકાસણી કરવી.

#GujaratNews #AnganwadiSalary #GyanYatra #HighCourtOrder #GujaratYojana''',
    );

    _tagsController = TextEditingController(
      text:
          'આંગણવાડી પગાર વધારો 2026, Gujarat Anganwadi Salary Hike, High Court LPA 363 2025, Anganwadi Worker Salary Gujarat, Tedagar Salary 2026, Gujarat Govt GR, Gyan Yatra, ગુજરાત સરકારી યોજના',
    );
  }

  @override
  void dispose() {
    _descController.dispose();
    _tagsController.dispose();
    super.dispose();
  }

  String _getSeoMasterPrompt() {
    return '''તમે ગુજરાતી YouTube SEO એક્સપર્ટ છો.
વિષય: "$_activeTopic"

આ વિડીયો માટે YouTube સર્ચમાં ટોપ પર રેન્ક થાય તેવું સંપૂર્ણ SEO પેકેજ આપો:
૧. ૩ હાઈ-CTR ગુજરાતી ટાઇટલ (૭૦ અક્ષરોની અંદર)
૨. ટાઇમસ્ટેમ્પ્સ અને સત્તાવાર ડિસ્ક્લેમર સાથે સંપૂર્ણ ગુજરાતી ડિસ્ક્રિપ્શન
૩. ૫ ટ્રેન્ડિંગ હેશટેગ (#)
૪. ૧૫ લોંગ-ટેઇલ અને શોર્ટ YouTube સર્ચ ટૅગ્સ (Comma-separated).''';
  }

  void _copyAllSeoPackage() {
    final pkg = '''📌 TITLE:
${_titles[_selectedTitleIdx]}

📝 DESCRIPTION:
${_descController.text}

🏷️ TAGS:
${_tagsController.text}''';
    Clipboard.setData(ClipboardData(text: pkg));
    _showToast('📦 સંપૂર્ણ Title + Description + Tags કોપી થયા!', bg: const Color(0xFF10B981));
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
          tooltip: 'પાછા (૮. થંબનેલ)',
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'GYAN YATRA SEO',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            ),
            Text(
              '૯. ટાઇટલ, ડિસ્ક્રિપ્શન & SEO',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.copy_all, color: Color(0xFF2563EB), size: 22),
            onPressed: _copyAllSeoPackage,
            tooltip: 'બધું SEO કોપી કરો',
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. High-CTR Gujarati Titles
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF2563EB), width: 1.4),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '🔥 ૧. હાઈ-CTR વાયરલ ટાઇટલ પસંદ કરો:',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF1E40AF)),
                  ),
                  const SizedBox(height: 8),
                  ...List.generate(_titles.length, (i) {
                    final sel = i == _selectedTitleIdx;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 6),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: sel ? const Color(0xFFEFF6FF) : const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: sel ? const Color(0xFF2563EB) : const Color(0xFFE2E8F0)),
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () => setState(() => _selectedTitleIdx = i),
                              child: Text(
                                _titles[i],
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: sel ? FontWeight.w900 : FontWeight.w600,
                                  color: const Color(0xFF0F172A),
                                ),
                              ),
                            ),
                          ),
                          IconButton(
                            icon: const Icon(Icons.copy, size: 16, color: Color(0xFF2563EB)),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: _titles[i]));
                              _showToast('ટાઇટલ ${i + 1} કોપી થયું!');
                            },
                          ),
                        ],
                      ),
                    );
                  }),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 2. YouTube Description Box
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
                        '📝 ૨. YouTube ડિસ્ક્રિપ્શન & ટાઇમસ્ટેમ્પ્સ:',
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                      ),
                      TextButton.icon(
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: _descController.text));
                          _showToast('ડિસ્ક્રિપ્શન કોપી થયું!');
                        },
                        icon: const Icon(Icons.copy, size: 14),
                        label: const Text('કોપી', style: TextStyle(fontSize: 10.5)),
                      ),
                    ],
                  ),
                  TextField(
                    controller: _descController,
                    maxLines: 6,
                    style: const TextStyle(fontSize: 11, height: 1.4),
                    decoration: InputDecoration(
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 3. Viral YouTube Tags
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
                        '🏷️ ૩. વાયરલ YouTube ટૅગ્સ (Tags):',
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                      ),
                      TextButton.icon(
                        onPressed: () {
                          Clipboard.setData(ClipboardData(text: _tagsController.text));
                          _showToast('બધા ટૅગ્સ કોપી થયા!');
                        },
                        icon: const Icon(Icons.copy, size: 14),
                        label: const Text('કોપી', style: TextStyle(fontSize: 10.5)),
                      ),
                    ],
                  ),
                  TextField(
                    controller: _tagsController,
                    maxLines: 3,
                    style: const TextStyle(fontSize: 11, height: 1.4),
                    decoration: InputDecoration(
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 4. ChatGPT SEO Master Prompt & Copy All
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF10B981), width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '⚡ ૪. ChatGPT SEO માસ્ટર પ્રોમ્પ્ટ & ઓલ-ઇન-વન કોપી',
                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: Color(0xFF059669)),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: _getSeoMasterPrompt()));
                            _showToast('SEO માસ્ટર પ્રોમ્પ્ટ કોપી થયો!');
                          },
                          icon: const Icon(Icons.copy, size: 14),
                          label: const Text('SEO પ્રોમ્પ્ટ', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Clipboard.setData(const ClipboardData(text: 'https://studio.youtube.com'));
                            _showToast('YouTube Studio લિંક કોપી થઈ!');
                          },
                          icon: const Icon(Icons.open_in_new, size: 14, color: Color(0xFFD71920)),
                          label: const Text('YT Studio', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFFD71920))),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _copyAllSeoPackage,
                      icon: const Icon(Icons.copy_all, size: 18, color: Colors.white),
                      label: const Text(
                        '📦 સંપૂર્ણ Title + Description + Tags કોપી કરો',
                        style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Colors.white),
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
            ),
          ],
        ),
      ),
    );
  }
}
