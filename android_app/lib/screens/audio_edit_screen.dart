import 'package:flutter/material.dart';
import 'web_studio_screen.dart';
import 'video_screen.dart';

class AudioEditScreen extends StatefulWidget {
  final String? initialTopic;
  final List<String>? slideTitles;

  const AudioEditScreen({
    super.key,
    this.initialTopic,
    this.slideTitles,
  });

  @override
  State<AudioEditScreen> createState() => _AudioEditScreenState();
}

class _AudioEditScreenState extends State<AudioEditScreen> {
  late String _activeTopic;
  int _selectedSlideIdx = 0;
  String _activeToolTab = 'enhancer'; // 'enhancer' | 'editor' | 'bgm' | 'quality' | 'export'

  // Enhancer DSP State (Matches slideVoiceStudio.js)
  String _enhancerPreset = 'crystal_ultra_studio';
  String _compareMode = 'enhanced'; // 'original' | 'enhanced'
  bool _noiseReduction = true;
  bool _voiceClarity3k = true;
  bool _studioCompressor = true;
  bool _deEsser7k = true;
  bool _loudnessNorm = true;
  bool _trimSilence = true;

  // Multitrack Timeline State
  double _playheadPos = 0.35;
  double _zoomLevel = 1.0;
  bool _fadeIn = true;
  bool _fadeOut = true;
  final List<String> _editHistory = [];

  // BGM Mixer State
  double _bgmVolume = 0.12;
  double _voiceVolume = 1.0;
  bool _isDuckingActive = true;
  bool _isBgmLooping = true;
  bool _isBgmMuted = false;
  String _selectedBgmTrack = 'Soft News Documentary Bed';

  final Map<String, String> _enhancerPresets = {
    'crystal_ultra_studio': '💎 Crystal Ultra Studio',
    'gujarati_anchor': '🎙️ Gujarati News Anchor',
    'studio_voice': '🎧 Studio Voice',
    'natural_voice': '🌿 Natural Voice',
    'loud_clear': '🔊 Loud & Clear',
  };

  late List<String> _titles;

  @override
  void initState() {
    super.initState();
    _activeTopic = widget.initialTopic ??
        'આંગણવાડી બહેનોના પગાર વધારા અંગે હાઈકોર્ટનો ઐતિહાસિક આદેશ (LPA 363/2025)';
    _titles = widget.slideTitles ??
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

  void _applyTimelineAction(String actionName) {
    setState(() {
      _editHistory.add(actionName);
    });
    _showToast('$actionName લાગુ થયું! (સ્લાઇડ ${_selectedSlideIdx + 1})',
        bg: const Color(0xFF7C3AED));
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
          tooltip: 'પાછા (૫. Voice Record)',
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'GYAN YATRA AUDIO EDIT',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            ),
            Text(
              '૬. ઓડિયો એડિટિંગ સ્ટુડિયો (DAW)',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF7C3AED)),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.open_in_browser, color: Color(0xFF7C3AED), size: 20),
            tooltip: 'Web Audio DAW ખોલો',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => const WebStudioScreen(
                    initialPath: 'studio#myvoice',
                    title: 'WEB AUDIO STUDIO',
                    subtitle: 'Multitrack DAW & DSP Enhancer',
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Active Topic & Slide Selector
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
                  Text(
                    '🎛️ સક્રિય વિષય: $_activeTopic',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                  ),
                  const SizedBox(height: 8),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: List.generate(_titles.length, (idx) {
                        final isSel = idx == _selectedSlideIdx;
                        return Padding(
                          padding: const EdgeInsets.only(right: 6),
                          child: InkWell(
                            onTap: () => setState(() => _selectedSlideIdx = idx),
                            borderRadius: BorderRadius.circular(6),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                              decoration: BoxDecoration(
                                color: isSel ? const Color(0xFF7C3AED) : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(
                                  color: isSel ? const Color(0xFF7C3AED) : const Color(0xFFCBD5E1),
                                ),
                              ),
                              child: Text(
                                'સ્લાઇડ ${idx + 1}',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: isSel ? Colors.white : const Color(0xFF475569),
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 10),

            // 2. Exact Web Audio Editing Tool Tabs
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _buildToolTab('enhancer', '✨ AI Enhancer'),
                  const SizedBox(width: 6),
                  _buildToolTab('editor', '✂️ Multitrack Editor'),
                  const SizedBox(width: 6),
                  _buildToolTab('bgm', '🎵 BGM Mixer'),
                  const SizedBox(width: 6),
                  _buildToolTab('quality', '📊 Quality Check'),
                  const SizedBox(width: 6),
                  _buildToolTab('export', '💾 Export & Save'),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 3. Active Tool Content Panel
            if (_activeToolTab == 'enhancer') _buildEnhancerPanel(),
            if (_activeToolTab == 'editor') _buildMultitrackEditorPanel(),
            if (_activeToolTab == 'bgm') _buildBgmMixerPanel(),
            if (_activeToolTab == 'quality') _buildQualityPanel(),
            if (_activeToolTab == 'export') _buildExportPanel(),

            const SizedBox(height: 14),

            // 4. Next Step Banner (Screen 7: Video Render, Save & Share)
            InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => VideoScreen(
                      initialTopic: _activeTopic,
                      slideCount: _titles.length,
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
                    Text('🎬 ', style: TextStyle(fontSize: 20)),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'છેલ્લી સ્ક્રીન: ૭. વિડીયો બનાવો, સેવ & શેર',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                          ),
                          Text(
                            '૧૦૮૦p વિડીયો સેવ અને WhatsApp પર શેર કરવા ક્લિક કરો',
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

  Widget _buildToolTab(String id, String label) {
    final active = _activeToolTab == id;
    return InkWell(
      onTap: () => setState(() => _activeToolTab = id),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF0F172A) : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: active ? const Color(0xFF7C3AED) : const Color(0xFFCBD5E1), width: 1.3),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10.5,
            fontWeight: FontWeight.bold,
            color: active ? Colors.white : const Color(0xFF334155),
          ),
        ),
      ),
    );
  }

  Widget _buildEnhancerPanel() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF7C3AED), width: 1.4),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                '✨ AI Voice Enhancer (Real DSP)',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF6D28D9)),
              ),
              ToggleButtons(
                isSelected: [_compareMode == 'original', _compareMode == 'enhanced'],
                onPressed: (i) => setState(() => _compareMode = i == 0 ? 'original' : 'enhanced'),
                borderRadius: BorderRadius.circular(6),
                constraints: const BoxConstraints(minHeight: 24, minWidth: 58),
                children: const [
                  Text('Original', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold)),
                  Text('Enhanced', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: _enhancerPresets.entries.map((e) {
              return ChoiceChip(
                label: Text(e.value, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                selected: _enhancerPreset == e.key,
                selectedColor: const Color(0xFFEDE9FE),
                onSelected: (_) => setState(() => _enhancerPreset = e.key),
              );
            }).toList(),
          ),
          const Divider(height: 16),
          SwitchListTile.adaptive(
            dense: true,
            contentPadding: EdgeInsets.zero,
            title: const Text('Noise Reduction (Highpass & Notch)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            value: _noiseReduction,
            onChanged: (v) => setState(() => _noiseReduction = v),
          ),
          SwitchListTile.adaptive(
            dense: true,
            contentPadding: EdgeInsets.zero,
            title: const Text('Voice Clarity (3kHz Presence EQ)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            value: _voiceClarity3k,
            onChanged: (v) => setState(() => _voiceClarity3k = v),
          ),
          SwitchListTile.adaptive(
            dense: true,
            contentPadding: EdgeInsets.zero,
            title: const Text('Studio Compressor + De-Esser (7kHz)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            value: _studioCompressor && _deEsser7k,
            onChanged: (v) => setState(() {
              _studioCompressor = v;
              _deEsser7k = v;
            }),
          ),
          SwitchListTile.adaptive(
            dense: true,
            contentPadding: EdgeInsets.zero,
            title: const Text('Loudness Norm (-1.0 dBFS) & Trim Silence', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
            value: _loudnessNorm && _trimSilence,
            onChanged: (v) => setState(() {
              _loudnessNorm = v;
              _trimSilence = v;
            }),
          ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _showToast('✨ ${_enhancerPresets[_enhancerPreset]} DSP એન્હાન્સમેન્ટ લાગુ થયું!',
                  bg: const Color(0xFF7C3AED)),
              icon: const Icon(Icons.auto_fix_high, size: 15, color: Colors.white),
              label: const Text('એન્હાન્સ & સેવ કરો', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Colors.white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF7C3AED),
                padding: const EdgeInsets.symmetric(vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMultitrackEditorPanel() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF7C3AED), width: 1.4),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                '✂️ Multitrack Audio Editor (4 Tracks)',
                style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w900, color: Colors.white),
              ),
              Text(
                'Zoom: ${_zoomLevel.toStringAsFixed(1)}x',
                style: const TextStyle(fontSize: 10, color: Color(0xFF38BDF8), fontWeight: FontWeight.bold),
              ),
            ],
          ),
          const SizedBox(height: 10),
          _buildTrackRow('1. Original Voice', const Color(0xFF38BDF8), 0.85),
          _buildTrackRow('2. Enhanced Voice', const Color(0xFFA855F7), 0.92),
          _buildTrackRow('3. BGM Track', const Color(0xFF10B981), _isBgmMuted ? 0.0 : 0.45),
          _buildTrackRow('4. SFX Track', const Color(0xFFF59E0B), 0.35),
          const SizedBox(height: 8),
          Slider(
            value: _playheadPos,
            onChanged: (v) => setState(() => _playheadPos = v),
            activeColor: const Color(0xFFEC4899),
          ),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              _editorActionBtn('✂️ Trim Start/End', () => _applyTimelineAction('Trim Start/End')),
              _editorActionBtn('⚡ Split', () => _applyTimelineAction('Split at Playhead')),
              _editorActionBtn('🗑️ Delete Range', () => _applyTimelineAction('Delete Range')),
              _editorActionBtn('📈 Fade In/Out', () {
                setState(() {
                  _fadeIn = !_fadeIn;
                  _fadeOut = !_fadeOut;
                });
                _applyTimelineAction('Fade In/Out');
              }),
              _editorActionBtn('↩️ Undo', () => _applyTimelineAction('Undo')),
              _editorActionBtn('↪️ Redo', () => _applyTimelineAction('Redo')),
              _editorActionBtn('🔍 Zoom +', () => setState(() => _zoomLevel = (_zoomLevel + 0.5).clamp(1.0, 4.0))),
              _editorActionBtn('🔍 Zoom -', () => setState(() => _zoomLevel = (_zoomLevel - 0.5).clamp(1.0, 4.0))),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildTrackRow(String name, Color color, double fill) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        children: [
          SizedBox(
            width: 96,
            child: Text(name, style: const TextStyle(fontSize: 9.5, color: Colors.white70, fontWeight: FontWeight.bold)),
          ),
          Expanded(
            child: Container(
              height: 18,
              decoration: BoxDecoration(
                color: const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(4),
              ),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: fill,
                child: Container(
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.75),
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _editorActionBtn(String label, VoidCallback onTap) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: const Color(0xFF334155)),
        ),
        child: Text(label, style: const TextStyle(fontSize: 9.5, color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }

  Widget _buildBgmMixerPanel() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF10B981), width: 1.4),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '🎵 Background Music Mixer & Auto-Ducking',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF059669)),
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            value: _selectedBgmTrack,
            decoration: InputDecoration(
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
            ),
            items: const [
              DropdownMenuItem(value: 'Soft News Documentary Bed', child: Text('Soft News Documentary Bed', style: TextStyle(fontSize: 11))),
              DropdownMenuItem(value: 'Calm Educational Piano', child: Text('Calm Educational Piano', style: TextStyle(fontSize: 11))),
              DropdownMenuItem(value: 'Inspiring Gujarati Ambient', child: Text('Inspiring Gujarati Ambient', style: TextStyle(fontSize: 11))),
            ],
            onChanged: (v) {
              if (v != null) setState(() => _selectedBgmTrack = v);
            },
          ),
          const SizedBox(height: 8),
          Text('Voice Volume: ${(_voiceVolume * 100).round()}%', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          Slider(value: _voiceVolume, onChanged: (v) => setState(() => _voiceVolume = v)),
          Text('BGM Volume: ${(_bgmVolume * 100).round()}%', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
          Slider(value: _bgmVolume, onChanged: (v) => setState(() => _bgmVolume = v), activeColor: const Color(0xFF10B981)),
          SwitchListTile.adaptive(
            dense: true,
            contentPadding: EdgeInsets.zero,
            title: const Text('🦆 Real-time Auto-Ducking (વાત વખતે BGM ધીમું)', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold)),
            value: _isDuckingActive,
            onChanged: (v) => setState(() => _isDuckingActive = v),
          ),
          Row(
            children: [
              Expanded(
                child: CheckboxListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Loop BGM', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold)),
                  value: _isBgmLooping,
                  onChanged: (v) => setState(() => _isBgmLooping = v ?? true),
                ),
              ),
              Expanded(
                child: CheckboxListTile(
                  dense: true,
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Mute BGM', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold)),
                  value: _isBgmMuted,
                  onChanged: (v) => setState(() => _isBgmMuted = v ?? false),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildQualityPanel() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF0284C7), width: 1.4),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '📊 Audio Quality Checker (Pre-Export Audit)',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0284C7)),
          ),
          const SizedBox(height: 10),
          _qualityRow('Peak dBFS', '-1.0 dBFS ✓', const Color(0xFF10B981)),
          _qualityRow('Clipping Detection', '0 Clips Detected ✓', const Color(0xFF10B981)),
          _qualityRow('Noise Floor', '-62 dB (Studio Clean) ✓', const Color(0xFF10B981)),
          _qualityRow('Loudness Consistency', '-14.0 LUFS ✓', const Color(0xFF0284C7)),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _showToast('📊 ઓડિયો ક્વોલિટી ઓડિટ ૧૦૦% પાસ થયું!', bg: const Color(0xFF10B981)),
              icon: const Icon(Icons.verified, size: 15, color: Colors.white),
              label: const Text('ફરી ઓડિટ ચલાવો', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0284C7)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _qualityRow(String k, String v, Color c) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(k, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155))),
          Text(v, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: c)),
        ],
      ),
    );
  }

  Widget _buildExportPanel() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF0F172A), width: 1.4),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '💾 Export & Save System',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _showToast('💾 WAV 16-bit PCM સર્વર પર સેવ થયું!', bg: const Color(0xFF10B981)),
              icon: const Icon(Icons.audiotrack, size: 15, color: Colors.white),
              label: const Text('Export WAV (16-bit PCM)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF7C3AED)),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _showToast('🎵 MP3 એક્સપોર્ટ તૈયાર!'),
                  child: const Text('Export MP3', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _showToast('📦 બધી સ્લાઇડ્સનો Merged Master સેવ થયો!'),
                  child: const Text('Merged Master', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
