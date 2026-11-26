import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../models/topic_model.dart';

class ApiService {
  static const String _defaultUrl = 'https://apparel-meetup-queen-typing.trycloudflare.com';
  static const String _keyServerUrl = 'gyan_server_url';

  static String _currentBaseUrl = _defaultUrl;

  static String get baseUrl => _currentBaseUrl;

  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_keyServerUrl);
      if (saved != null && saved.trim().isNotEmpty) {
        _currentBaseUrl = saved.trim().replaceAll(RegExp(r'/+$'), '');
      }
    } catch (_) {}
  }

  static Future<void> updateBaseUrl(String newUrl) async {
    final clean = newUrl.trim().replaceAll(RegExp(r'/+$'), '');
    if (clean.isNotEmpty) {
      _currentBaseUrl = clean;
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_keyServerUrl, clean);
      } catch (_) {}
    }
  }

  static Future<bool> checkHealth() async {
    try {
      final res = await http.get(Uri.parse('$_currentBaseUrl/api/health')).timeout(const Duration(seconds: 4));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// 48h Live Trending Topics from Server
  static Future<List<TopicIdea>> getTrendingTopics({String category = 'બધા'}) async {
    final catParam = category == 'બધા' ? 'સરકારી યોજના' : category;
    final url = Uri.parse('$_currentBaseUrl/api/topics/trends-48h?category=${Uri.encodeComponent(catParam)}');

    try {
      final res = await http.get(url).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = (data['topics'] as List<dynamic>? ?? []);
        if (list.isNotEmpty) {
          return list.map((item) => TopicIdea.fromJson(item as Map<String, dynamic>)).toList();
        }
      }
    } catch (_) {}

    // Fallback to trending endpoint
    try {
      final fallbackUrl = Uri.parse('$_currentBaseUrl/api/topics/trending?category=${Uri.encodeComponent(catParam)}');
      final res = await http.get(fallbackUrl).timeout(const Duration(seconds: 6));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = (data['topics'] as List<dynamic>? ?? []);
        if (list.isNotEmpty) {
          return list.map((item) => TopicIdea.fromJson(item as Map<String, dynamic>)).toList();
        }
      }
    } catch (_) {}

    // Offline default high-RPM Gujarati topics if server is offline
    return _getDefaultOfflineTopics(category);
  }

  /// AI Topic Generator (Top 5 High-RPM Ideas)
  static Future<List<TopicIdea>> generateViralTopics({String prompt = '', String category = 'સરકારી યોજના'}) async {
    final url = Uri.parse('$_currentBaseUrl/api/topics/generate-top5');
    try {
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'prompt': prompt.isNotEmpty ? prompt : 'ગુજરાત સરકાર નવી સરકારી યોજના ૨૦૨૬',
          'category': category,
        }),
      ).timeout(const Duration(seconds: 15));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = (data['topics'] as List<dynamic>? ?? []);
        if (list.isNotEmpty) {
          return list.map((item) => TopicIdea.fromJson(item as Map<String, dynamic>)).toList();
        }
      }
    } catch (_) {}

    return _getDefaultOfflineTopics(category);
  }

  /// Save Topic to Server & Local Memory
  static Future<bool> saveTopic(TopicIdea topic) async {
    try {
      final url = Uri.parse('$_currentBaseUrl/api/topics/save');
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'topic': topic.toJson(),
        }),
      ).timeout(const Duration(seconds: 6));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Get Saved Topics from Server
  static Future<List<TopicIdea>> getSavedTopics() async {
    try {
      final url = Uri.parse('$_currentBaseUrl/api/topics/saved');
      final res = await http.get(url).timeout(const Duration(seconds: 6));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final list = (data['topics'] as List<dynamic>? ?? []);
        return list.map((item) => TopicIdea.fromJson(item as Map<String, dynamic>)).toList();
      }
    } catch (_) {}
    return [];
  }

  /// Activate Topic in Central Repository (Syncs to all subsequent tools)
  static Future<bool> activateTopic(TopicIdea topic) async {
    try {
      final url = Uri.parse('$_currentBaseUrl/api/planner/topics');
      final res = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'topicId': topic.id,
          'topicName': topic.title,
          'category': topic.category,
          'priority': 'High',
        }),
      ).timeout(const Duration(seconds: 6));
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return false;
    }
  }

  static List<TopicIdea> _getDefaultOfflineTopics(String category) {
    return [
      TopicIdea(
        id: 'offline_1',
        title: 'ગુજરાત સરકાર નવી આવાસ યોજના ૨૦૨૬: ₹૧.૫૦ લાખ સહાય',
        category: 'સરકારી યોજના',
        summary: 'ગ્રામીણ અને શહેરી લાભાર્થીઓ માટે મકાન સહાય નિયમો અને ઓનલાઇન અરજી વિગત.',
        views48h: '૪,૮૫૦ વ્યુઝ',
        rpm: '₹૨૨૦',
      ),
      TopicIdea(
        id: 'offline_2',
        title: 'ખેડૂત તાર ફેન્સીંગ & સોલાર સબસિડી યોજના ૨૦૨૬ પરિપત્ર',
        category: 'ખેડૂત યોજના',
        summary: 'iKhedut પોર્ટલ પરથી સત્તાવાર સબસિડી સહાય અને જરૂરી પુરાવાઓની માહિતી.',
        views48h: '૫,૨૪૦ વ્યુઝ',
        rpm: '₹૧૯૫',
      ),
      TopicIdea(
        id: 'offline_3',
        title: 'ગુજરાત નવી સીધી ભરતી ૨૦૨૬: લાયકાત, વયમર્યાદા & સિલેબસ',
        category: 'ભરતી & નોકરી',
        summary: 'સત્તાવાર પરિપત્ર મુજબ ફોર્મ ભરવાની છેલ્લી તારીખ અને નિયમો.',
        views48h: '૬,૧૨૦ વ્યુઝ',
        rpm: '₹૨૬૦',
      ),
      TopicIdea(
        id: 'offline_4',
        title: 'વિધવા સહાય અને દિવ્યાંગ પેન્શન ૨૦૨૬ નવીનતમ વધારો પરિપત્ર',
        category: 'સરકારી યોજના',
        summary: 'માસિક પેન્શનમાં સરકારી વધારો અને ડીબીટી ખાતામાં જમા થવાની તારીખ.',
        views48h: '૩,૯૮૦ વ્યુઝ',
        rpm: '₹૨૧૦',
      ),
    ];
  }
}
