import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class SettingsScreen extends StatefulWidget {
  final String currentServerUrl;
  final Function(String newUrl)? onServerUrlChanged;

  const SettingsScreen({
    super.key,
    required this.currentServerUrl,
    this.onServerUrlChanged,
  });

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _isLoading = true;
  bool _isSaving = false;
  String? _errorMessage;

  final TextEditingController _googleClientIdCtrl = TextEditingController();
  final TextEditingController _googleClientSecretCtrl = TextEditingController();
  final TextEditingController _googleRedirectUriCtrl = TextEditingController();
  final TextEditingController _openaiApiKeyCtrl = TextEditingController();
  final TextEditingController _serverUrlCtrl = TextEditingController();

  String _selectedModel = 'gpt-4o';
  bool _demoMode = true;
  bool _isGoogleConfigured = false;
  bool _isOpenAIConfigured = false;
  bool _isSecretConfigured = false;
  String _maskedOpenAiKey = '';

  List<String> _googleGuide = [];
  List<String> _openaiGuide = [];

  final List<String> _modelOptions = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'];

  @override
  void initState() {
    super.initState();
    _serverUrlCtrl.text = widget.currentServerUrl;
    _fetchSettings();
  }

  @override
  void dispose() {
    _googleClientIdCtrl.dispose();
    _googleClientSecretCtrl.dispose();
    _googleRedirectUriCtrl.dispose();
    _openaiApiKeyCtrl.dispose();
    _serverUrlCtrl.dispose();
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

  Future<void> _fetchSettings() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final res = await http.get(Uri.parse('${widget.currentServerUrl}/api/settings'));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true) {
          final s = (data['settings'] as Map<String, dynamic>?) ?? {};
          final status = (data['status'] as Map<String, dynamic>?) ?? {};
          final guides = (data['setupGuides'] as Map<String, dynamic>?) ?? {};

          if (mounted) {
            setState(() {
              _googleClientIdCtrl.text = s['googleClientIdFull']?.toString() ?? '';
              _googleRedirectUriCtrl.text = s['googleRedirectUri']?.toString() ?? 'http://localhost:5000/api/auth/google/callback';
              _isSecretConfigured = (s['googleClientSecretConfigured'] == true);
              _isOpenAIConfigured = (s['openaiApiKeyConfigured'] == true);
              _maskedOpenAiKey = s['openaiApiKeyMasked']?.toString() ?? '';
              _selectedModel = s['openaiModel']?.toString() ?? 'gpt-4o';
              _demoMode = s['demoMode'] == true;

              _isGoogleConfigured = (status['isGoogleConfigured'] == true);
              _googleGuide = List<String>.from(guides['google'] ?? []);
              _openaiGuide = List<String>.from(guides['openai'] ?? []);
              _isLoading = false;
            });
            return;
          }
        }
      }
      throw Exception('સર્વરથી સેટિંગ્સ ડેટા મળ્યો નથી.');
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _saveSettings() async {
    setState(() => _isSaving = true);

    // Save server URL locally first
    final cleanUrl = _serverUrlCtrl.text.trim();
    if (cleanUrl.isNotEmpty && cleanUrl != widget.currentServerUrl) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('gyan_yatra_server_url', cleanUrl);
      widget.onServerUrlChanged?.call(cleanUrl);
    }

    // Prepare payload for backend
    final payload = <String, dynamic>{
      'googleClientId': _googleClientIdCtrl.text.trim(),
      'googleRedirectUri': _googleRedirectUriCtrl.text.trim(),
      'openaiModel': _selectedModel,
      'demoMode': _demoMode,
    };

    if (_googleClientSecretCtrl.text.trim().isNotEmpty) {
      payload['googleClientSecret'] = _googleClientSecretCtrl.text.trim();
    }
    if (_openaiApiKeyCtrl.text.trim().isNotEmpty) {
      payload['openaiApiKey'] = _openaiApiKeyCtrl.text.trim();
    }

    try {
      final res = await http.post(
        Uri.parse('${_serverUrlCtrl.text.trim()}/api/settings'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload),
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['success'] == true) {
          _showSnack('સેટિંગ્સ સફળતાપૂર્વક સાચવવામાં આવી છે!');
          _fetchSettings();
          return;
        }
      }
      throw Exception('સેટિંગ્સ સેવ થઈ શકી નથી.');
    } catch (e) {
      _showSnack('ભૂલ: $e', isError: true);
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
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
              '⚙️ Settings & API Configuration',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            Text(
              'Google OAuth, YouTube Studio & OpenAI ChatGPT',
              style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
            ),
          ],
        ),
        actions: [
          TextButton.icon(
            style: TextButton.styleFrom(
              foregroundColor: Colors.white,
              backgroundColor: const Color(0xFFFF0000),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
            ),
            icon: _isSaving
                ? const SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.save, size: 16),
            label: const Text('સેવ કરો', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            onPressed: _isSaving ? null : _saveSettings,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: Color(0xFFFF0000)),
            )
          : ListView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              children: [
                if (_errorMessage != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 14),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFEF4444)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.warning, color: Color(0xFFEF4444), size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'ઓફલાઇન નોટિસ: ${_errorMessage!}',
                            style: const TextStyle(fontSize: 11, color: Colors.white),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Status Cards
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF131722),
                          borderRadius: BorderRadius.circular(10),
                          border: Border(
                            left: BorderSide(
                              color: _isGoogleConfigured ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                              width: 4,
                            ),
                            top: const BorderSide(color: Color(0xFF1E293B)),
                            right: const BorderSide(color: Color(0xFF1E293B)),
                            bottom: const BorderSide(color: Color(0xFF1E293B)),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Google / YouTube', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white)),
                            const SizedBox(height: 4),
                            Text(
                              _isGoogleConfigured ? '✓ સત્તાવાર API સક્રિય' : 'ડેમો મોડ ઉપલબ્ધ',
                              style: TextStyle(
                                fontSize: 10,
                                color: _isGoogleConfigured ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF131722),
                          borderRadius: BorderRadius.circular(10),
                          border: Border(
                            left: BorderSide(
                              color: _isOpenAIConfigured ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                              width: 4,
                            ),
                            top: const BorderSide(color: Color(0xFF1E293B)),
                            right: const BorderSide(color: Color(0xFF1E293B)),
                            bottom: const BorderSide(color: Color(0xFF1E293B)),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('OpenAI ChatGPT', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white)),
                            const SizedBox(height: 4),
                            Text(
                              _isOpenAIConfigured ? '✓ $_selectedModel' : 'બિલ્ટ-ઇન લોકલ મોડ',
                              style: TextStyle(
                                fontSize: 10,
                                color: _isOpenAIConfigured ? const Color(0xFF10B981) : const Color(0xFFF59E0B),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // Mobile Connection Card
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFF131722),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF38BDF8).withValues(alpha: 0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Text('📱', style: TextStyle(fontSize: 16)),
                          SizedBox(width: 8),
                          Text(
                            'મોબાઇલ સર્વર IP (PC Connection)',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        'ફોન અને લેપટોપ એક જ વાઇ-ફાઇ પર હોવા જોઈએ:',
                        style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: _serverUrlCtrl,
                        style: const TextStyle(fontSize: 13, color: Colors.white),
                        decoration: InputDecoration(
                          hintText: 'http://192.168.1.2:5000',
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
                            borderSide: const BorderSide(color: Color(0xFF38BDF8)),
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        children: [
                          ActionChip(
                            label: const Text('Wi-Fi (192.168.1.2)', style: TextStyle(fontSize: 11)),
                            backgroundColor: const Color(0xFF0A0D14),
                            onPressed: () {
                              setState(() => _serverUrlCtrl.text = 'http://192.168.1.2:5000');
                            },
                          ),
                          ActionChip(
                            label: const Text('Emulator (10.0.2.2)', style: TextStyle(fontSize: 11)),
                            backgroundColor: const Color(0xFF0A0D14),
                            onPressed: () {
                              setState(() => _serverUrlCtrl.text = 'http://10.0.2.2:5000');
                            },
                          ),
                          ActionChip(
                            label: const Text('Localhost', style: TextStyle(fontSize: 11)),
                            backgroundColor: const Color(0xFF0A0D14),
                            onPressed: () {
                              setState(() => _serverUrlCtrl.text = 'http://localhost:5000');
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // API Credentials Card
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
                          Text('🔑', style: TextStyle(fontSize: 16)),
                          SizedBox(width: 8),
                          Text(
                            'API Credentials (સુરક્ષિત સ્ટોરેજ)',
                            style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Google Client ID
                      const Text('Google OAuth 2.0 Client ID:', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _googleClientIdCtrl,
                        style: const TextStyle(fontSize: 12, color: Colors.white),
                        decoration: InputDecoration(
                          hintText: 'xxxxxx-xxxxxx.apps.googleusercontent.com',
                          hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                          filled: true,
                          fillColor: const Color(0xFF0A0D14),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Google Client Secret
                      const Text('Google OAuth 2.0 Client Secret:', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _googleClientSecretCtrl,
                        obscureText: true,
                        style: const TextStyle(fontSize: 12, color: Colors.white),
                        decoration: InputDecoration(
                          hintText: _isSecretConfigured ? '•••••••••••••••• (પહેલેથી સેટ કરેલ છે)' : 'Client Secret પેસ્ટ કરો',
                          hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                          filled: true,
                          fillColor: const Color(0xFF0A0D14),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Google Redirect URI
                      const Text('Google Cloud Console Authorized Redirect URI:', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _googleRedirectUriCtrl,
                              readOnly: true,
                              style: const TextStyle(fontSize: 11, color: Color(0xFF38BDF8)),
                              decoration: InputDecoration(
                                filled: true,
                                fillColor: const Color(0xFF0A0D14),
                                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          IconButton(
                            style: IconButton.styleFrom(backgroundColor: const Color(0xFF1E293B)),
                            icon: const Icon(Icons.copy, size: 16, color: Colors.white70),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: _googleRedirectUriCtrl.text));
                              _showSnack('Redirect URI કોપી થઈ ગયો!');
                            },
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // OpenAI API Key
                      const Text('OpenAI API Key (sk-...):', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _openaiApiKeyCtrl,
                        obscureText: true,
                        style: const TextStyle(fontSize: 12, color: Colors.white),
                        decoration: InputDecoration(
                          hintText: _isOpenAIConfigured ? '$_maskedOpenAiKey (પહેલેથી સેટ છે)' : 'sk-proj-xxxxxxxxxxxxxxxxxxxx',
                          hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                          filled: true,
                          fillColor: const Color(0xFF0A0D14),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // OpenAI Model Selection
                      const Text('OpenAI મોડેલ સિલેક્શન:', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0A0D14),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFF1E293B)),
                        ),
                        child: DropdownButtonHideUnderline(
                          child: DropdownButton<String>(
                            value: _selectedModel,
                            dropdownColor: const Color(0xFF131722),
                            isExpanded: true,
                            items: _modelOptions.map((m) {
                              return DropdownMenuItem<String>(
                                value: m,
                                child: Text(m, style: const TextStyle(fontSize: 12, color: Colors.white)),
                              );
                            }).toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => _selectedModel = val);
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Demo Mode Toggle Switch
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0A0D14),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFF1E293B)),
                        ),
                        child: Row(
                          children: [
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('ડેમો મોડ (Demo Channel Mode)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.white)),
                                  SizedBox(height: 2),
                                  Text(
                                    'ગૂગલ કે ઓપનએઆઈ કી વગર પણ તમામ ફીચર્સ કામ કરશે.',
                                    style: TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                                  ),
                                ],
                              ),
                            ),
                            Switch(
                              value: _demoMode,
                              activeThumbColor: const Color(0xFFFF0000),
                              onChanged: (val) => setState(() => _demoMode = val),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // Setup Guides Accordion
                if (_googleGuide.isNotEmpty)
                  Theme(
                    data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      backgroundColor: const Color(0xFF131722),
                      collapsedBackgroundColor: const Color(0xFF131722),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      collapsedShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      leading: const Text('📘', style: TextStyle(fontSize: 16)),
                      title: const Text(
                        'Google Cloud OAuth સેટઅપ ગાઈડ',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: List.generate(_googleGuide.length, (i) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Text(
                                  '${i + 1}. ${_googleGuide[i]}',
                                  style: const TextStyle(fontSize: 11, color: Color(0xFFCBD5E1), height: 1.4),
                                ),
                              );
                            }),
                          ),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: 10),

                if (_openaiGuide.isNotEmpty)
                  Theme(
                    data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                    child: ExpansionTile(
                      backgroundColor: const Color(0xFF131722),
                      collapsedBackgroundColor: const Color(0xFF131722),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      collapsedShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      leading: const Text('📗', style: TextStyle(fontSize: 16)),
                      title: const Text(
                        'OpenAI API સેટઅપ ગાઈડ',
                        style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      children: [
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: List.generate(_openaiGuide.length, (i) {
                              return Padding(
                                padding: const EdgeInsets.only(bottom: 6),
                                child: Text(
                                  '${i + 1}. ${_openaiGuide[i]}',
                                  style: const TextStyle(fontSize: 11, color: Color(0xFFCBD5E1), height: 1.4),
                                ),
                              );
                            }),
                          ),
                        ),
                      ],
                    ),
                  ),

                const SizedBox(height: 30),
              ],
            ),
    );
  }
}
