import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'seo_screen.dart';

class ThumbnailPreset {
  final String id;
  final String label;
  final String badge;
  final String photoIcon;
  final String photoSubject;
  final String catchWords;
  final String prompt;

  ThumbnailPreset({
    required this.id,
    required this.label,
    required this.badge,
    required this.photoIcon,
    required this.photoSubject,
    required this.catchWords,
    required this.prompt,
  });
}

class ThumbnailScreen extends StatefulWidget {
  final String? initialTopic;

  const ThumbnailScreen({super.key, this.initialTopic});

  @override
  State<ThumbnailScreen> createState() => _ThumbnailScreenState();
}

class _ThumbnailScreenState extends State<ThumbnailScreen> {
  late TextEditingController _topicCtrl;
  late TextEditingController _catchWordsCtrl;
  int _selectedPresetIdx = 0;

  late List<ThumbnailPreset> _presets;

  @override
  void initState() {
    super.initState();
    final topic = widget.initialTopic ??
        'આંગણવાડી બહેનોના પગાર વધારા અંગે હાઈકોર્ટનો ઐતિહાસિક આદેશ (LPA 363/2025)';
    _topicCtrl = TextEditingController(text: topic);

    _presets = [
      ThumbnailPreset(
        id: 'anganwadi',
        label: '👩‍🏫 આંગણવાડી/ભરતી',
        badge: 'સત્તાવાર ચુકાદો',
        photoIcon: '🏛️',
        photoSubject: 'ગુજરાત હાઇકોર્ટ સોલા / મહિલા અધિકારીનો વાસ્તવિક ફોટો',
        catchWords: 'પગાર ₹૨૪,૮૦૦! હાઇકોર્ટનો ઐતિહાસિક આદેશ',
        prompt:
            'A minimalist 16:9 YouTube thumbnail. Pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of an Indian female Anganwadi officer / Gujarat High Court building looking professional. On the right: Exactly 4 large ultra-bold clean text words in deep navy blue & crimson: "HIGH COURT ORDER ₹24,800". Ultra clean, high contrast, zero clutter, strictly photorealistic, NO 3D cartoon, NO neon.',
      ),
      ThumbnailPreset(
        id: 'da',
        label: '🏛️ DA/પગાર',
        badge: 'સત્તાવાર ઠરાવ',
        photoIcon: '🏢',
        photoSubject: 'ગુજરાત મુખ્યમંત્રીશ્રી / સચિવાલય સત્તાવાર પ્રેસ ફોટો',
        catchWords: '૫૦% DA મંજૂર! ખાતામાં આવશે ₹15,000 થી ₹45,000',
        prompt:
            'A minimalist 16:9 YouTube thumbnail. Pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of a senior Gujarat government official at an official press briefing. On the right: Exactly 4 large ultra-bold clean text words in deep navy blue: "GUJARAT SALARY DA 50% HIKE". Strictly photorealistic, zero clutter, NO 3D cartoon.',
      ),
      ThumbnailPreset(
        id: 'yojana',
        label: '🌾 સરકારી યોજના',
        badge: 'DBT સહાય',
        photoIcon: '💰',
        photoSubject: 'સરકારી યોજના લાભાર્થી / સત્તાવાર જાહેરાત ફોટો',
        catchWords: 'નવી સહાય જાહેર! ખાતામાં સીધા ₹૨,૦૦૦ જમા',
        prompt:
            'A minimalist 16:9 YouTube thumbnail. Pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of an Indian farmer/beneficiary smiling warmly in natural daylight. On the right: Exactly 4 large ultra-bold text words in navy blue: "GOVT SCHEME ₹2,000 DBT". Ultra clean, photorealistic, high contrast.',
      ),
      ThumbnailPreset(
        id: 'exam',
        label: '🎓 પરીક્ષા/મેરિટ',
        badge: 'ઓફિશિયલ નોટિસ',
        photoIcon: '📜',
        photoSubject: 'ગુજરાત પરીક્ષા બોર્ડ સત્તાવાર પરિણામ દસ્તાવેજ ફોટો',
        catchWords: 'સત્તાવાર મેરિટ લિસ્ટ જાહેર! કટ-ઓફ ચેક કરો',
        prompt:
            'A minimalist 16:9 YouTube thumbnail. Pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of an education board official at desk. On the right: Exactly 4 large ultra-bold clean text words in navy blue: "OFFICIAL MERIT LIST 2026". Photorealistic, zero clutter.',
      ),
    ];

    _catchWordsCtrl = TextEditingController(text: _presets[0].catchWords);
  }

  @override
  void dispose() {
    _topicCtrl.dispose();
    _catchWordsCtrl.dispose();
    super.dispose();
  }

  String _getMasterThumbnailPrompt() {
    final cur = _presets[_selectedPresetIdx];
    return '''વિષય: "${_topicCtrl.text.trim()}"
થંબનેલ ટેક્સ્ટ: "${_catchWordsCtrl.text.trim()}"

AI Image Prompt (Pure White 16:9):
${cur.prompt}''';
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
    final cur = _presets[_selectedPresetIdx];

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
          tooltip: 'પાછા (૭. Video)',
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'GYAN YATRA THUMBNAIL',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            ),
            Text(
              '૮. થંબનેલ & AI પ્રોમ્પ્ટ સ્ટુડિયો',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFA7F3D0)),
            ),
            alignment: Alignment.center,
            child: const Text(
              '16:9 WHITE',
              style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Preset Chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: List.generate(_presets.length, (i) {
                  final active = i == _selectedPresetIdx;
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      label: Text(_presets[i].label, style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold)),
                      selected: active,
                      selectedColor: const Color(0xFFECFDF5),
                      onSelected: (_) {
                        setState(() {
                          _selectedPresetIdx = i;
                          _catchWordsCtrl.text = _presets[i].catchWords;
                        });
                      },
                    ),
                  );
                }),
              ),
            ),

            const SizedBox(height: 10),

            // 2. Pure White 16:9 Live Thumbnail Preview Card
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFCBD5E1), width: 1.5),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.06), blurRadius: 10, offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                children: [
                  AspectRatio(
                    aspectRatio: 16 / 9,
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      color: Colors.white,
                      child: Row(
                        children: [
                          // Left: 1 Real Authentic Photo Subject
                          Expanded(
                            flex: 42,
                            child: Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFFF8FAFC),
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: const Color(0xFFCBD5E1)),
                              ),
                              padding: const EdgeInsets.all(6),
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(cur.photoIcon, style: const TextStyle(fontSize: 36)),
                                  const SizedBox(height: 4),
                                  Text(
                                    cur.photoSubject,
                                    textAlign: TextAlign.center,
                                    maxLines: 3,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          // Right: Bold Catchwords
                          Expanded(
                            flex: 58,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFDC2626),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    cur.badge,
                                    style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.white),
                                  ),
                                ),
                                Text(
                                  _catchWordsCtrl.text,
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF0F2B5C),
                                    height: 1.2,
                                  ),
                                ),
                                const Text(
                                  '16:9 Pure White • High CTR ✓',
                                  style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 3. Edit Catchwords & Topic
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('✍️ થંબનેલ પર લખવાના બોલ્ડ શબ્દો:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  TextField(
                    controller: _catchWordsCtrl,
                    onChanged: (_) => setState(() {}),
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    decoration: InputDecoration(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      filled: true,
                      fillColor: const Color(0xFFF8FAFC),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 4. AI Thumbnail Prompt Card
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
                    '🎨 AI Thumbnail Master Prompt (Pure White 16:9)',
                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: Color(0xFF059669)),
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
                      _getMasterThumbnailPrompt(),
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
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: _getMasterThumbnailPrompt()));
                            _showToast('🎨 થંબનેલ AI પ્રોમ્પ્ટ કોપી થયો!', bg: const Color(0xFF10B981));
                          },
                          icon: const Icon(Icons.copy, size: 14, color: Colors.white),
                          label: const Text('પ્રોમ્પ્ટ કોપી', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), elevation: 0),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: _getMasterThumbnailPrompt()));
                            _showToast('⚡ ChatGPT માટે પ્રોમ્પ્ટ કોપી થયો! (chatgpt.com)', bg: const Color(0xFF10A37F));
                          },
                          icon: const Icon(Icons.bolt, size: 14, color: Color(0xFF10A37F)),
                          label: const Text('ChatGPT ખોલો', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF10A37F))),
                          style: OutlinedButton.styleFrom(side: const BorderSide(color: Color(0xFF10A37F))),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () => _showToast('💾 થંબનેલ ડિઝાઇન સેવ થઈ!', bg: const Color(0xFF0284C7)),
                      icon: const Icon(Icons.save_alt, size: 14, color: Color(0xFF0284C7)),
                      label: const Text('થંબનેલ સેવ કરો', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0284C7))),
                      style: OutlinedButton.styleFrom(side: const BorderSide(color: Color(0xFF0284C7))),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 5. Next Step: Screen 9 (Title & SEO)
            InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => SeoScreen(initialTopic: _topicCtrl.text.trim()),
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
                    Text('🚀 ', style: TextStyle(fontSize: 20)),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'આગળની સ્ક્રીન: ૯. ટાઇટલ, ડિસ્ક્રિપ્શન & SEO',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E40AF)),
                          ),
                          Text(
                            'હાઈ-CTR ગુજરાતી ટાઇટલ, ડિસ્ક્રિપ્શન અને વાયરલ ટૅગ્સ માટે ક્લિક કરો',
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
