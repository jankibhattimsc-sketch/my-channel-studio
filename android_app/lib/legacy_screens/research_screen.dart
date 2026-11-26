import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:share_plus/share_plus.dart';

class ResearchScreen extends StatefulWidget {
  final String serverUrl;

  const ResearchScreen({super.key, required this.serverUrl});

  @override
  State<ResearchScreen> createState() => _ResearchScreenState();
}

class _ResearchScreenState extends State<ResearchScreen> {
  final TextEditingController _urlController = TextEditingController(
    text: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  );
  bool _isAnalyzing = false;
  Map<String, dynamic>? _report;
  List<dynamic> _history = [];

  @override
  void initState() {
    super.initState();
    _fetchHistory();
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  void _showSnack(String msg, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError ? const Color(0xFFEF4444) : const Color(0xFF10B981),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _fetchHistory() async {
    try {
      final res = await http.get(Uri.parse('${widget.serverUrl}/api/research/history'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['history'] is List) {
          if (mounted) {
            setState(() {
              _history = data['history'];
            });
          }
        }
      }
    } catch (_) {}
  }

  Future<void> _pasteFromClipboard() async {
    final data = await Clipboard.getData(Clipboard.kTextPlain);
    if (data != null && data.text != null && data.text!.isNotEmpty) {
      setState(() {
        _urlController.text = data.text!.trim();
      });
      _showSnack('લિંક પેસ્ટ થઈ ગઈ!');
    }
  }

  Future<void> _analyzeVideo() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) {
      _showSnack('કૃપા કરીને YouTube વિડીયો લિંક દાખલ કરો.', isError: true);
      return;
    }

    setState(() {
      _isAnalyzing = true;
    });

    try {
      final res = await http.post(
        Uri.parse('${widget.serverUrl}/api/research/video'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'url': url}),
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true && data['report'] != null) {
          if (mounted) {
            setState(() {
              _report = Map<String, dynamic>.from(data['report']);
              _isAnalyzing = false;
            });
            _fetchHistory();
            _showSnack('વિડીયો વિશ્લેષણ તૈયાર છે!');
            return;
          }
        }
      }

      throw Exception('સર્વરથી વિશ્લેષણ પ્રાપ્ત થઈ શક્યું નથી.');
    } catch (e) {
      if (mounted) {
        setState(() {
          _isAnalyzing = false;
        });
        _showSnack('ભૂલ: $e', isError: true);
      }
    }
  }

  void _shareAnalysis() {
    if (_report == null) return;
    final meta = (_report!['videoMetadata'] as Map<String, dynamic>?) ?? {};
    final ana = (_report!['analysis'] as Map<String, dynamic>?) ?? {};
    final fiveAngles = (ana['fiveAngles'] as List<dynamic>?) ?? [];

    final buffer = StringBuffer();
    buffer.writeln('🎯 *જ્ઞાન યાત્રા - YouTube વિડીયો વિશ્લેષણ રિપોર્ટ*');
    buffer.writeln('--------------------------------------------------');
    buffer.writeln('📹 વિડીયો: ${meta['title'] ?? ''}');
    buffer.writeln('👤 ચેનલ: ${meta['channelTitle'] ?? ''}');
    buffer.writeln('🔗 લિંક: ${meta['url'] ?? ''}');
    buffer.writeln('');
    buffer.writeln('🚀 *શા માટે વાયરલ થયો?*');
    buffer.writeln(ana['whyViral'] ?? '');
    buffer.writeln('');
    buffer.writeln('🎨 *થંબનેલ રણનીતિ:*');
    buffer.writeln(ana['thumbnailStrategy'] ?? '');
    buffer.writeln('');
    buffer.writeln('💡 *5 ઓરિજિનલ ગુજરાતી નવા એંગલ:*');
    for (int i = 0; i < fiveAngles.length; i++) {
      buffer.writeln('${i + 1}. ${fiveAngles[i]}');
    }
    buffer.writeln('');
    buffer.writeln('🎯 *ઓડિયન્સ રીટેન્શન:*');
    buffer.writeln(ana['retentionSecrets'] ?? '');

    SharePlus.instance.share(ShareParams(text: buffer.toString()));
  }

  void _copyAnalysis() {
    if (_report == null) return;
    final meta = (_report!['videoMetadata'] as Map<String, dynamic>?) ?? {};
    final ana = (_report!['analysis'] as Map<String, dynamic>?) ?? {};
    final fiveAngles = (ana['fiveAngles'] as List<dynamic>?) ?? [];

    final buffer = StringBuffer();
    buffer.writeln('🎯 જ્ઞાન યાત્રા - YouTube વિડીયો વિશ્લેષણ રિપોર્ટ');
    buffer.writeln('વિડીયો: ${meta['title'] ?? ''}');
    buffer.writeln('ચેનલ: ${meta['channelTitle'] ?? ''}');
    buffer.writeln('\n[શા માટે વાયરલ થયો?]\n${ana['whyViral'] ?? ''}');
    buffer.writeln('\n[થંબનેલ રણનીતિ]\n${ana['thumbnailStrategy'] ?? ''}');
    buffer.writeln('\n[5 ઓરિજિનલ ગુજરાતી નવા એંગલ]');
    for (int i = 0; i < fiveAngles.length; i++) {
      buffer.writeln('${i + 1}. ${fiveAngles[i]}');
    }
    buffer.writeln('\n[ઓડિયન્સ રીટેન્શન]\n${ana['retentionSecrets'] ?? ''}');

    Clipboard.setData(ClipboardData(text: buffer.toString()));
    _showSnack('સંપૂર્ણ વિશ્લેષણ કોપી થઈ ગયું!');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0D14),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A0D14),
        elevation: 0,
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '🔍 Competitor & Video Research',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            Text(
              'સ્પર્ધક વિડીયો વિશ્લેષણ અને 5 નવા ગુજરાતી એંગલ',
              style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
            ),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // URL Input Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF131722),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF1E293B)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'YouTube વિડીયો લિંક પેસ્ટ કરો',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _urlController,
                  style: const TextStyle(fontSize: 13, color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'https://www.youtube.com/watch?v=...',
                    hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                    filled: true,
                    fillColor: const Color(0xFF0A0D14),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFF1E293B)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFF1E293B)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Color(0xFFFF0000)),
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1E293B),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      ),
                      icon: const Icon(Icons.paste, size: 16),
                      label: const Text('પેસ્ટ (Paste)', style: TextStyle(fontSize: 12)),
                      onPressed: _pasteFromClipboard,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFF0000),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        ),
                        icon: _isAnalyzing
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Icon(Icons.bolt, size: 18),
                        label: Text(
                          _isAnalyzing ? 'વિશ્લેષણ થઈ રહ્યું છે...' : 'વિશ્લેષણ કરો (Analyze)',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                        onPressed: _isAnalyzing ? null : _analyzeVideo,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'નોંધ: આ વિશ્લેષણ માત્ર સત્તાવાર જાહેર માહિતી (Public Data) પર આધારિત છે.',
                  style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          if (_isAnalyzing)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 40),
                child: Column(
                  children: [
                    CircularProgressIndicator(color: Color(0xFFFF0000)),
                    SizedBox(height: 16),
                    Text('વિડીયો મેટાડેટા અને સ્પર્ધાત્મક વિશ્લેષણ થઈ રહ્યું છે...', style: TextStyle(color: Color(0xFF94A3B8))),
                  ],
                ),
              ),
            ),

          if (_report != null && !_isAnalyzing) _buildReportView(),

          if (_report == null && !_isAnalyzing && _history.isNotEmpty) ...[
            const SizedBox(height: 10),
            Row(
              children: [
                const Text('🕒', style: TextStyle(fontSize: 16)),
                const SizedBox(width: 8),
                const Text(
                  'અગાઉના વિશ્લેષણો (Past Research)',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ],
            ),
            const SizedBox(height: 10),
            ...List.generate(_history.length, (index) {
              final item = _history[index];
              final meta = (item['videoMetadata'] as Map<String, dynamic>?) ?? {};
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF131722),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                  leading: ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: Image.network(
                      meta['thumbnail']?.toString() ?? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120',
                      width: 60,
                      height: 36,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(width: 60, height: 36, color: const Color(0xFF1E293B)),
                    ),
                  ),
                  title: Text(
                    meta['title']?.toString() ?? 'સંશોધન રીપોર્ટ',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  subtitle: Text(
                    meta['channelTitle']?.toString() ?? '',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                  ),
                  trailing: const Icon(Icons.arrow_forward_ios, size: 12, color: Colors.grey),
                  onTap: () {
                    setState(() {
                      _report = Map<String, dynamic>.from(item);
                    });
                  },
                ),
              );
            }),
          ],

          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildReportView() {
    final meta = (_report!['videoMetadata'] as Map<String, dynamic>?) ?? {};
    final ana = (_report!['analysis'] as Map<String, dynamic>?) ?? {};
    final fiveAngles = (ana['fiveAngles'] as List<dynamic>?) ?? [];

    final title = meta['title']?.toString() ?? 'અજ્ઞાત શીર્ષક';
    final channel = meta['channelTitle']?.toString() ?? 'અજ્ઞાત ચેનલ';
    final thumb = meta['thumbnail']?.toString() ?? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=480';
    final views = meta['views'] != null ? meta['views'].toString() : 'જાહેર';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Video Header Card
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF131722),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Image.network(
                    thumb,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      color: const Color(0xFF1E293B),
                      child: const Icon(Icons.video_library, size: 48, color: Colors.grey),
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                title,
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white, height: 1.4),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Text(
                    'ચેનલ: $channel',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF38BDF8), fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    '• $views વ્યુઝ',
                    style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                      icon: const Icon(Icons.share, size: 16),
                      label: const Text('WhatsApp પર શેર', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                      onPressed: _shareAnalysis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E293B),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                    icon: const Icon(Icons.copy, size: 16),
                    label: const Text('કોપી', style: TextStyle(fontSize: 12)),
                    onPressed: _copyAnalysis,
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // 4 Analysis Cards
        _buildAnalysisCard(
          icon: '🚀',
          title: 'શા માટે વાયરલ થયો? (Viral Breakdown)',
          content: ana['whyViral']?.toString() ?? 'વિશ્લેષણ ઉપલબ્ધ નથી.',
          accentColor: const Color(0xFFFF0000),
        ),
        const SizedBox(height: 12),

        _buildAnalysisCard(
          icon: '🎨',
          title: 'થંબનેલ રણનીતિ (Thumbnail Psychology)',
          content: ana['thumbnailStrategy']?.toString() ?? 'વિશ્લેષણ ઉપલબ્ધ નથી.',
          accentColor: const Color(0xFFF59E0B),
        ),
        const SizedBox(height: 12),

        // 5 Fresh Gujarati Angles
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF131722),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Text('💡', style: TextStyle(fontSize: 16)),
                  SizedBox(width: 8),
                  Text(
                    '5 ઓરિજિનલ ગુજરાતી નવા એંગલ',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                ],
              ),
              const SizedBox(height: 4),
              const Text(
                'તમારી ચેનલ માટે આ વિષયને વધુ આકર્ષક બનાવવાના 5 વિકલ્પો:',
                style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
              ),
              const SizedBox(height: 12),
              ...List.generate(fiveAngles.length, (index) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 20,
                        height: 20,
                        decoration: BoxDecoration(
                          color: const Color(0xFF38BDF8).withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: Center(
                          child: Text(
                            '${index + 1}',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF38BDF8)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          fiveAngles[index].toString(),
                          style: const TextStyle(fontSize: 12, color: Colors.white, height: 1.4),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],
          ),
        ),
        const SizedBox(height: 12),

        _buildAnalysisCard(
          icon: '🎯',
          title: 'ઓડિયન્સ રીટેન્શન સિક્રેટ્સ (Retention)',
          content: ana['retentionSecrets']?.toString() ?? 'વિશ્લેષણ ઉપલબ્ધ નથી.',
          accentColor: const Color(0xFF10B981),
        ),
      ],
    );
  }

  Widget _buildAnalysisCard({
    required String icon,
    required String title,
    required String content,
    required Color accentColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF131722),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(icon, style: const TextStyle(fontSize: 16)),
              const SizedBox(width: 8),
              Text(
                title,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            content,
            style: const TextStyle(fontSize: 12, color: Color(0xFFCBD5E1), height: 1.45),
          ),
        ],
      ),
    );
  }
}
