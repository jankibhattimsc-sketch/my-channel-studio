import 'package:flutter/material.dart';
import '../services/api_service.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final TextEditingController _urlController = TextEditingController();
  bool _isChecking = false;
  String _statusMessage = '';
  bool _isSuccess = false;

  @override
  void initState() {
    super.initState();
    _urlController.text = ApiService.baseUrl;
    _checkServer();
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }

  Future<void> _checkServer() async {
    setState(() {
      _isChecking = true;
      _statusMessage = 'કનેક્શન ચકાસી રહ્યું છે...';
    });

    final ok = await ApiService.checkHealth();
    setState(() {
      _isChecking = false;
      _isSuccess = ok;
      _statusMessage = ok ? '✅ સર્વર સાથે સફળતાપૂર્વક કનેક્ટેડ છે!' : '❌ સર્વર સાથે સંપર્ક થઈ શક્યો નથી. URL તપાસો.';
    });
  }

  Future<void> _saveUrl() async {
    final newUrl = _urlController.text.trim();
    if (newUrl.isEmpty) return;

    await ApiService.updateBaseUrl(newUrl);
    await _checkServer();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('સર્વર URL સાચવાઈ ગયું!'),
          backgroundColor: Color(0xFF10B981),
        ),
      );
    }
  }

  void _resetToDefault() {
    _urlController.text = 'https://apparel-meetup-queen-typing.trycloudflare.com';
    _saveUrl();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('⚙️ સેટિંગ્સ & કનેક્શન', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 16)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Connection Status Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('📡 સર્વર કનેક્શન સ્ટેટસ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (_isChecking)
                      const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                    else
                      Icon(_isSuccess ? Icons.check_circle : Icons.error, color: _isSuccess ? const Color(0xFF10B981) : const Color(0xFFEF4444), size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _statusMessage,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: _isSuccess ? const Color(0xFF059669) : const Color(0xFFDC2626),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Server URL Form
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('🌐 સર્વર / ટનલ URL', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
                const SizedBox(height: 6),
                const Text(
                  'Cloudflare ટનલ અથવા સ્થાનિક IP એડ્રેસ સેટ કરો.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _urlController,
                  decoration: InputDecoration(
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    hintText: 'https://...',
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF7C3AED),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        icon: const Icon(Icons.save, size: 16),
                        label: const Text('સેવ કરો & ટેસ્ટ કરો', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        onPressed: _saveUrl,
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF64748B),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      onPressed: _resetToDefault,
                      child: const Text('ડિફોલ્ટ', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // App Info Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('ℹ️ એપ્લિકેશન વિગત', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A))),
                SizedBox(height: 8),
                Text('• નામ: Gyan Yatra Studio App', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                SizedBox(height: 4),
                Text('• વર્ઝન: v1.0.25 (સ્ક્રીન ૧: Idea Studio)', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                SizedBox(height: 4),
                Text('• ચેનલ: જ્ઞાન યાત્રા YouTube Creator', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
