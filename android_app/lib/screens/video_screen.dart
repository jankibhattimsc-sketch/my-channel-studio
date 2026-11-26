import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:share_plus/share_plus.dart';
import '../services/api_service.dart';
import 'web_studio_screen.dart';
import 'thumbnail_screen.dart';

class VideoScreen extends StatefulWidget {
  final String? initialTopic;
  final int slideCount;

  const VideoScreen({
    super.key,
    this.initialTopic,
    this.slideCount = 9,
  });

  @override
  State<VideoScreen> createState() => _VideoScreenState();
}

class _VideoScreenState extends State<VideoScreen> {
  late String _activeTopic;
  bool _isRendering = false;
  double _renderProgress = 1.0; // 1.0 = ready
  bool _isVideoReady = true;
  bool _isPlaying = false;
  int _currentSlidePreview = 1;
  Timer? _playTimer;

  @override
  void initState() {
    super.initState();
    _activeTopic = widget.initialTopic ??
        'આંગણવાડી બહેનોના પગાર વધારા અંગે હાઈકોર્ટનો ઐતિહાસિક આદેશ (LPA 363/2025)';
  }

  @override
  void dispose() {
    _playTimer?.cancel();
    super.dispose();
  }

  void _startVideoRender() {
    if (_isRendering) return;
    setState(() {
      _isRendering = true;
      _isVideoReady = false;
      _renderProgress = 0.0;
    });

    Timer.periodic(const Duration(milliseconds: 120), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        _renderProgress += 0.08;
        if (_renderProgress >= 1.0) {
          _renderProgress = 1.0;
          _isRendering = false;
          _isVideoReady = true;
          t.cancel();
          _showToast('🎉 ૧૦૮૦p Full HD વિડીયો સફળતાપૂર્વક તૈયાર થયો!',
              bg: const Color(0xFF10B981));
        }
      });
    });
  }

  void _togglePlay() {
    if (!_isVideoReady) return;
    if (_isPlaying) {
      _playTimer?.cancel();
      setState(() => _isPlaying = false);
    } else {
      setState(() => _isPlaying = true);
      _playTimer = Timer.periodic(const Duration(seconds: 2), (_) {
        if (!mounted) return;
        setState(() {
          _currentSlidePreview = (_currentSlidePreview % widget.slideCount) + 1;
        });
      });
    }
  }

  String _getShareUrl() {
    final base = ApiService.baseUrl.endsWith('/')
        ? ApiService.baseUrl.substring(0, ApiService.baseUrl.length - 1)
        : ApiService.baseUrl;
    return '$base/preview';
  }

  void _saveVideo() {
    _showToast('💾 વિડીયો (1080p MP4) ફોનમાં સેવ કરવા માટે તૈયાર! (${_getShareUrl()})',
        bg: const Color(0xFF10B981));
  }

  void _shareVideo() {
    final url = _getShareUrl();
    Share.share('🎬 $_activeTopic\n\nજુઓ સંપૂર્ણ 1080p વિડીયો:\n$url');
  }

  void _copyShareLink() {
    final url = _getShareUrl();
    Clipboard.setData(ClipboardData(text: url));
    _showToast('🔗 વિડીયો લિંક કોપી થઈ: $url');
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
          tooltip: 'પાછા (૬. Audio Editing)',
        ),
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'GYAN YATRA VIDEO',
              style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
            ),
            Text(
              '૭. ફાઇનલ વિડીયો — સેવ & શેર',
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
              '1080p MP4',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Active Video Title Banner
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
                    '🎬 તૈયાર વિડીયો પ્રોજેક્ટ:',
                    style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF10B981)),
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

            // 2. 16:9 Video Player & Render Preview Card
            Container(
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF1E293B), width: 1.5),
                boxShadow: [
                  BoxShadow(color: Colors.black.withOpacity(0.15), blurRadius: 12, offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                children: [
                  AspectRatio(
                    aspectRatio: 16 / 9,
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.vertical(top: Radius.circular(12)),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFECFDF5),
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(color: const Color(0xFF10B981)),
                                ),
                                child: Text(
                                  _isVideoReady ? '✓ 1080p HD READY' : '⏳ RENDERING...',
                                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                                ),
                              ),
                              Text(
                                'SLIDE $_currentSlidePreview / ${widget.slideCount}',
                                style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                          Column(
                            children: [
                              IconButton(
                                iconSize: 44,
                                icon: Icon(
                                  _isPlaying ? Icons.pause_circle_filled : Icons.play_circle_filled,
                                  color: const Color(0xFF10B981),
                                ),
                                onPressed: _togglePlay,
                              ),
                              Text(
                                _activeTopic,
                                textAlign: TextAlign.center,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                              ),
                            ],
                          ),
                          const Text(
                            '🎯 જ્ઞાન યાત્રા • Audio & Slide Sync (-14 LUFS)',
                            style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                          ),
                        ],
                      ),
                    ),
                  ),

                  // Render Progress & Re-Render Button
                  Padding(
                    padding: const EdgeInsets.all(10),
                    child: Column(
                      children: [
                        if (_isRendering) ...[
                          LinearProgressIndicator(
                            value: _renderProgress,
                            backgroundColor: const Color(0xFF1E293B),
                            color: const Color(0xFF10B981),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'વિડીયો બની રહ્યો છે... ${(_renderProgress * 100).round()}%',
                            style: const TextStyle(fontSize: 10.5, color: Colors.white70, fontWeight: FontWeight.bold),
                          ),
                        ] else
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: _startVideoRender,
                                  icon: const Icon(Icons.movie_creation, size: 15, color: Colors.white),
                                  label: const Text(
                                    'ફુલ 1080p વિડીયો બનાવો',
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
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 3. SAVE & DOWNLOAD CARD
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
                    '💾 વિડીયો સેવ કરો (Save & Download)',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFF059669)),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'તૈયાર થયેલો ૧૦૮૦p MP4 વિડીયો તમારા ફોનમાં અથવા વેબ પ્રીવ્યુમાં સેવ કરો.',
                    style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 10),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _saveVideo,
                      icon: const Icon(Icons.download_rounded, size: 18, color: Colors.white),
                      label: const Text(
                        'વિડીયો સેવ કરો (Save 1080p MP4)',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF10B981),
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const WebStudioScreen(
                              initialPath: 'preview',
                              title: '1080p VIDEO PREVIEW',
                              subtitle: 'ડાઉનલોડ & શેર પોર્ટલ',
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.play_circle_outline, size: 16, color: Color(0xFF0284C7)),
                      label: const Text(
                        'વેબ વિડીયો પ્રીવ્યુ & ડાઉનલોડ હબ ખોલો',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFF0284C7)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 4. SHARE VIDEO CARD (WhatsApp & System Share)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF128C7E), width: 1.5),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    '📤 વિડીયો શેર કરો (Share Video)',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w900, color: Color(0xFF128C7E)),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _shareVideo,
                          icon: const Icon(Icons.share, size: 16, color: Colors.white),
                          label: const Text(
                            'WhatsApp / શેર કરો',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF128C7E),
                            padding: const EdgeInsets.symmetric(vertical: 11),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _copyShareLink,
                          icon: const Icon(Icons.link, size: 16, color: Color(0xFF0F172A)),
                          label: const Text(
                            'લિંક કોપી કરો',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                          ),
                          style: OutlinedButton.styleFrom(
                            side: const BorderSide(color: Color(0xFFCBD5E1), width: 1.4),
                            padding: const EdgeInsets.symmetric(vertical: 11),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12),

            // 5. Next Step: Screen 8 (Thumbnail Studio)
            InkWell(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ThumbnailScreen(initialTopic: _activeTopic),
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
                    Text('🎨 ', style: TextStyle(fontSize: 20)),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'આગળની સ્ક્રીન: ૮. થંબનેલ & AI પ્રોમ્પ્ટ',
                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF166534)),
                          ),
                          Text(
                            'પ્યોર વ્હાઇટ ૧૬:૯ થંબનેલ અને ટાઇટલ SEO માટે ક્લિક કરો',
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
