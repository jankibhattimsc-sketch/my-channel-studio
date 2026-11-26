import 'dart:async';
import 'package:flutter/material.dart';
import 'web_studio_screen.dart';
import 'audio_edit_screen.dart';

class VoiceSlideTake {
  final int slideNum;
  final String slideTitle;
  final String scriptText;
  bool isRecorded;
  int durationSeconds;
  String presetName;
  bool isEnhanced;

  VoiceSlideTake({
    required this.slideNum,
    required this.slideTitle,
    required this.scriptText,
    this.isRecorded = false,
    this.durationSeconds = 0,
    this.presetName = 'Gujarati News Anchor',
    this.isEnhanced = false,
  });
}

class VoiceScreen extends StatefulWidget {
  final String? initialTopic;
  final List<String>? slideTitles;
  final List<String>? slideScripts;

  const VoiceScreen({
    super.key,
    this.initialTopic,
    this.slideTitles,
    this.slideScripts,
  });

  @override
  State<VoiceScreen> createState() => _VoiceScreenState();
}

class _VoiceScreenState extends State<VoiceScreen> {
  late String _activeTopic;
  int _selectedSlideIdx = 0;
  late List<VoiceSlideTake> _takes;

  bool _isRecording = false;
  bool _isPaused = false;
  int _elapsedSeconds = 0;
  Timer? _timer;

  String _selectedPreset = 'anchor'; // 'anchor' | 'studio' | 'natural' | 'loud'
  bool _noiseReduction = true;
  bool _voiceClarity = true;
  bool _loudnessNorm = true;

  final Map<String, String> _presetLabels = {
    'anchor': '🎙️ Gujarati News Anchor',
    'studio': '🎧 Studio Voice',
    'natural': '🌿 Natural Voice',
    'loud': '🔊 Loud & Clear',
  };

  @override
  void initState() {
    super.initState();
    _activeTopic = widget.initialTopic ??
        'આંગણવાડી બહેનોના પગાર વધારા અંગે હાઈકોર્ટનો ઐતિહાસિક આદેશ (LPA 363/2025)';
    _initTakes();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _initTakes() {
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

    final scripts = widget.slideScripts ??
        [
          'નમસ્કાર મિત્રો, જ્ઞાન યાત્રામાં આપનું સ્વાગત છે. ગુજરાતની હજારો આંગણવાડી કાર્યકર અને તેડાગર બહેનો માટે ગુજરાત હાઇકોર્ટની ડિવિઝન બેંચે LPA 363/2025 હેઠળ એક ઐતિહાસિક આદેશ આપ્યો છે.',
          'કોર્ટના આ ચુકાદામાં સ્પષ્ટ કરવામાં આવ્યું છે કે વર્ષોથી ચાલતી માનદ વેતન પ્રથા કાયમી કામગીરી સામે અયોગ્ય છે.',
          'નવા પગાર માળખા મુજબ કાર્યકર બહેનોને ₹૧૦,૦૦૦ થી વધીને ₹૨૪,૮૦૦ સુધીનો પગાર મળવાપાત્ર બની શકે છે.',
          'ગાંધીનગર સચિવાલય ખાતે મહિલા અને બાળ વિકાસ વિભાગ તેમજ નાણાં વિભાગમાં GR પરિપત્રની પ્રક્રિયા શરૂ થઈ છે.',
          'હાઇકોર્ટે રાજ્ય સરકારને અમલીકરણ માટે ચોક્કસ સમયમર્યાદા અને એરિયર્સ ચૂકવણીનો નિર્દેશ આપ્યો છે.',
          'આંગણવાડી બહેનો પૂર્ણા યોજના, સગર્ભા બહેનોની આરોગ્ય નોંધણી અને સરકારી સર્વેમાં પાયાની ભૂમિકા નિભાવે છે.',
          'ગુજરાત સરકાર હેઠળ નોંધાયેલી તમામ કાયમી કાર્યકર અને તેડાગર બહેનો આ લાભ માટે પાત્ર ગણાશે.',
          'ગુજરાત હાઇકોર્ટની સત્તાવાર વેબસાઇટ પર જઈને LPA 363/2025 ઓર્ડરની નકલ ડાઉનલોડ કરી શકો છો.',
          'અંતમાં માત્ર સરકારના સત્તાવાર GR પરિપત્ર પર જ વિશ્વાસ રાખવો. ચેનલને સબ્સ્ક્રાઇબ કરવાનું ભૂલશો નહીં!',
        ];

    _takes = List.generate(titles.length, (i) {
      return VoiceSlideTake(
        slideNum: i + 1,
        slideTitle: titles[i],
        scriptText: i < scripts.length ? scripts[i] : titles[i],
      );
    });
  }

  void _startRecording() {
    _timer?.cancel();
    setState(() {
      _isRecording = true;
      _isPaused = false;
      _elapsedSeconds = 0;
    });
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _isRecording && !_isPaused) {
        setState(() => _elapsedSeconds++);
      }
    });
  }

  void _togglePause() {
    if (!_isRecording) return;
    setState(() => _isPaused = !_isPaused);
  }

  void _stopAndSave() {
    _timer?.cancel();
    final duration = _elapsedSeconds > 0 ? _elapsedSeconds : 1;
    setState(() {
      _isRecording = false;
      _isPaused = false;
      _takes[_selectedSlideIdx].isRecorded = true;
      _takes[_selectedSlideIdx].durationSeconds = duration;
      _takes[_selectedSlideIdx].presetName = _presetLabels[_selectedPreset] ?? 'Gujarati News Anchor';
    });
    _showToast('સ્લાઇડ ${_selectedSlideIdx + 1} નો અવાજ સેવ થયો ($duration સેકન્ડ)!',
        bg: const Color(0xFF10B981));
  }

  void _retakeRecording() {
    _timer?.cancel();
    setState(() {
      _isRecording = false;
      _isPaused = false;
      _elapsedSeconds = 0;
      _takes[_selectedSlideIdx].isRecorded = false;
      _takes[_selectedSlideIdx].isEnhanced = false;
      _takes[_selectedSlideIdx].durationSeconds = 0;
    });
    _showToast('ફરીથી રેકોર્ડ કરવા તૈયાર!');
  }

  void _applyEnhancement() {
    if (!_takes[_selectedSlideIdx].isRecorded) {
      _showToast('પહેલાં આ સ્લાઇડનો અવાજ રેકોર્ડ કરો!', bg: const Color(0xFFEF4444));
      return;
    }
    setState(() {
      _takes[_selectedSlideIdx].isEnhanced = true;
      _takes[_selectedSlideIdx].presetName = _presetLabels[_selectedPreset] ?? 'Gujarati News Anchor';
    });
    _showToast('✨ ${_presetLabels[_selectedPreset]} એન્હાન્સમેન્ટ લાગુ થયું!',
        bg: const Color(0xFF7C3AED));
  }

  String _formatTimer(int secs) {
    final m = (secs ~/ 60).toString().padLeft(2, '0');
    final s = (secs % 60).toString().padLeft(2, '0');
    return '$m:$s';
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
    final cur = _takes[_selectedSlideIdx];
    final recordedCount = _takes.where((t) => t.isRecorded).length;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
          tooltip: 'પાછા (૪. Script Writer)',
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'GYAN YATRA VOICE',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            ),
            Text(
              '૫. સ્લાઇડ ઓડિયો રેકોર્ડર',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFEC4899)),
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.symmetric(vertical: 12),
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
            decoration: BoxDecoration(
              color: const Color(0xFFFDF2F8),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: const Color(0xFFFBCFE8)),
            ),
            alignment: Alignment.center,
            child: Text(
              '$recordedCount / ${_takes.length} રેકોર્ડ',
              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFBE185D)),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.open_in_browser, color: Color(0xFF7C3AED), size: 20),
            tooltip: 'Web Voice Studio ખોલો',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const WebStudioScreen(
                    initialPath: 'studio#myvoice',
                    title: 'WEB VOICE STUDIO',
                    subtitle: 'Live Mic & DSP Enhancer',
                  ),
                ),
              );
            },
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Active Topic Banner
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
                    '🎙️ પ્રેઝન્ટેશન સ્લાઇડ્સ સામે રાખીને સ્લાઇડ-બાય-સ્લાઇડ અવાજ રેકોર્ડ કરો:',
                    style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFFEC4899)),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _activeTopic,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 10),

            // 2. Slide Selector Pills with Recorded Checkmarks
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: List.generate(_takes.length, (idx) {
                  final t = _takes[idx];
                  final isSel = idx == _selectedSlideIdx;
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: InkWell(
                      onTap: () {
                        if (_isRecording) return;
                        setState(() => _selectedSlideIdx = idx);
                      },
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: isSel
                              ? const Color(0xFF7C3AED)
                              : (t.isRecorded ? const Color(0xFFECFDF5) : Colors.white),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: isSel
                                ? const Color(0xFF7C3AED)
                                : (t.isRecorded ? const Color(0xFF10B981) : const Color(0xFFCBD5E1)),
                          ),
                        ),
                        child: Text(
                          '${t.isRecorded ? "✓ " : ""}સ્લાઇડ ${idx + 1}',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.bold,
                            color: isSel
                                ? Colors.white
                                : (t.isRecorded ? const Color(0xFF059669) : const Color(0xFF475569)),
                          ),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),

            const SizedBox(height: 10),

            // 3. Slide + Verbatim Teleprompter Script Card (Exact Web Layout)
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
                      Expanded(
                        child: Text(
                          '📌 સ્લાઇડ ${cur.slideNum}: ${cur.slideTitle}',
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                        ),
                      ),
                      if (cur.isRecorded)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFECFDF5),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            '✓ ${cur.durationSeconds}s સેવ',
                            style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFCBD5E1)),
                    ),
                    child: Text(
                      cur.scriptText,
                      style: const TextStyle(fontSize: 12, color: Color(0xFF0F172A), height: 1.5, fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 4. Professional Live Voice Recorder Panel (First & Primary - Exact Web Functions)
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: _isRecording ? const Color(0xFFEF4444) : const Color(0xFF7C3AED),
                  width: 1.5,
                ),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(
                            _isRecording ? Icons.fiber_manual_record : Icons.mic,
                            color: _isRecording ? const Color(0xFFEF4444) : const Color(0xFF38BDF8),
                            size: 16,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _isRecording
                                ? (_isPaused ? 'PAUSED' : 'RECORDING LIVE...')
                                : 'LIVE VOICE RECORDER',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w900,
                              color: _isRecording ? const Color(0xFFF87171) : const Color(0xFF38BDF8),
                            ),
                          ),
                        ],
                      ),
                      Text(
                        _formatTimer(_isRecording ? _elapsedSeconds : cur.durationSeconds),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Recorder Controls
                  Row(
                    children: [
                      if (!_isRecording)
                        Expanded(
                          flex: 2,
                          child: ElevatedButton.icon(
                            onPressed: _startRecording,
                            icon: const Icon(Icons.mic, size: 16, color: Colors.white),
                            label: const Text('રેકોર્ડ શરૂ કરો', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Colors.white)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFEC4899),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        )
                      else ...[
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: _togglePause,
                            icon: Icon(_isPaused ? Icons.play_arrow : Icons.pause, size: 16, color: Colors.amber),
                            label: Text(_isPaused ? 'ફરી શરૂ' : 'થોભો', style: const TextStyle(fontSize: 11, color: Colors.amber, fontWeight: FontWeight.bold)),
                            style: OutlinedButton.styleFrom(
                              side: const BorderSide(color: Colors.amber),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _stopAndSave,
                            icon: const Icon(Icons.stop, size: 16, color: Colors.white),
                            label: const Text('સ્ટોપ & સેવ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF10B981),
                              padding: const EdgeInsets.symmetric(vertical: 10),
                            ),
                          ),
                        ),
                      ],
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: _retakeRecording,
                        icon: const Icon(Icons.refresh, size: 14, color: Colors.white70),
                        label: const Text('Retake', style: TextStyle(fontSize: 10.5, color: Colors.white70)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white24),
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 5. AI Voice Enhancer & One-Click Presets (Exact Web Presets)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF7C3AED), width: 1.3),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '✨ AI વોઇસ એન્હાન્સર (One-Click Presets)',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF6D28D9)),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: _presetLabels.entries.map((entry) {
                      final active = _selectedPreset == entry.key;
                      return ChoiceChip(
                        label: Text(entry.value, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                        selected: active,
                        selectedColor: const Color(0xFFEDE9FE),
                        onSelected: (_) => setState(() => _selectedPreset = entry.key),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Checkbox(
                            value: _noiseReduction,
                            onChanged: (v) => setState(() => _noiseReduction = v ?? true),
                            visualDensity: VisualDensity.compact,
                          ),
                          const Text('Noise Cut', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      Row(
                        children: [
                          Checkbox(
                            value: _voiceClarity,
                            onChanged: (v) => setState(() => _voiceClarity = v ?? true),
                            visualDensity: VisualDensity.compact,
                          ),
                          const Text('3kHz Clarity', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      Row(
                        children: [
                          Checkbox(
                            value: _loudnessNorm,
                            onChanged: (v) => setState(() => _loudnessNorm = v ?? true),
                            visualDensity: VisualDensity.compact,
                          ),
                          const Text('-1dBFS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _applyEnhancement,
                      icon: const Icon(Icons.auto_fix_high, size: 15, color: Colors.white),
                      label: const Text(
                        'અવાજ એન્હાન્સ & સેવ કરો',
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

            // 6. Next Step: Screen 6 (Audio Editing Studio)
            InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => AudioEditScreen(
                      initialTopic: _activeTopic,
                      slideTitles: _takes.map((t) => t.slideTitle).toList(),
                    ),
                  ),
                );
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF5F3FF),
                  border: Border.all(color: const Color(0xFFC4B5FD), width: 1.5),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Row(
                  children: [
                    Text('🎛️ ', style: TextStyle(fontSize: 20)),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'આગળની સ્ક્રીન: ૬. Audio Editing Studio (DAW)',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF5B21B6)),
                          ),
                          Text(
                            'AI Enhancer, Trim/Split, BGM Mixer & Quality Check માટે ક્લિક કરો',
                            style: TextStyle(fontSize: 9.5, color: Color(0xFF7C3AED)),
                          ),
                        ],
                      ),
                    ),
                    Icon(Icons.arrow_forward_ios, size: 14, color: Color(0xFF5B21B6)),
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
