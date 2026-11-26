import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:file_picker/file_picker.dart';
import '../services/api_service.dart';

class WebStudioScreen extends StatefulWidget {
  final String? initialHash;
  final String? initialPath;
  final String? title;
  final String? subtitle;

  const WebStudioScreen({
    super.key,
    this.initialHash,
    this.initialPath,
    this.title,
    this.subtitle,
  });

  @override
  State<WebStudioScreen> createState() => _WebStudioScreenState();
}

class _WebStudioScreenState extends State<WebStudioScreen> {
  WebViewController? _controller;
  bool _isLoading = true;
  int _progress = 0;

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  void _initWebView() {
    String sub = '';
    if (widget.initialPath != null && widget.initialPath!.isNotEmpty) {
      sub = widget.initialPath!.startsWith('/') ? widget.initialPath! : '/${widget.initialPath}';
    } else if (widget.initialHash != null && widget.initialHash!.isNotEmpty) {
      sub = '#${widget.initialHash}';
    }
    final targetUrl = '${ApiService.baseUrl}$sub';

    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (p) => setState(() => _progress = p),
          onPageStarted: (_) => setState(() => _isLoading = true),
          onPageFinished: (_) => setState(() => _isLoading = false),
          onWebResourceError: (err) {
            debugPrint('[WebView Error]: ${err.description}');
          },
        ),
      );

    if (controller.platform is AndroidWebViewController) {
      final androidController = controller.platform as AndroidWebViewController;
      androidController.setMediaPlaybackRequiresUserGesture(false);
      androidController.setOnPlatformPermissionRequest((request) {
        request.grant();
      });
      androidController.setOnShowFileSelector((FileSelectorParams params) async {
        try {
          final files = await FilePicker.pickFiles(
            type: FileType.custom,
            allowedExtensions: ['pdf', 'pptx', 'ppt', 'png', 'jpg', 'jpeg'],
          );
          if (files.isNotEmpty) {
            return files
                .where((f) => f.path != null)
                .map((f) => Uri.file(f.path!).toString())
                .toList();
          }
        } catch (_) {}
        return [];
      });
    }

    controller.loadRequest(Uri.parse(targetUrl));
    _controller = controller;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        titleSpacing: 14,
        title: Row(
          children: [
            Text(widget.initialPath?.contains('preview') == true ? '🎬 ' : '🌐 ', style: const TextStyle(fontSize: 16)),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.title ?? 'GYAN YATRA WEB STUDIO',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A), letterSpacing: 0.5),
                ),
                Text(
                  widget.subtitle ?? 'લાઈવ વેબ પાઇપલાઇન • ૧૦૦% રિયલ ટાઈમ',
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600, color: Color(0xFF7C3AED)),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF475569), size: 20),
            tooltip: 'રીલોડ કરો',
            onPressed: () => _controller?.reload(),
          ),
        ],
        bottom: _isLoading
            ? PreferredSize(
                preferredSize: const Size.fromHeight(2),
                child: LinearProgressIndicator(
                  value: _progress > 0 ? _progress / 100.0 : null,
                  backgroundColor: const Color(0xFFF1F5F9),
                  valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF7C3AED)),
                  minHeight: 2,
                ),
              )
            : null,
      ),
      body: _controller != null ? WebViewWidget(controller: _controller!) : const SizedBox.shrink(),
    );
  }
}
