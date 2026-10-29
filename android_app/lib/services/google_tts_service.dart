import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'voice_actor_service.dart';

const String AUDIO_TONE_PROMPT = "Read the following Gujarati government job news in a warm, natural, conversational voice, like an experienced news presenter, not a fake TV-anchor voice. Start with an enthusiastic, clear voice to grab attention. For recruitment news: be optimistic, energetic and encouraging, with slight emphasis on number of vacancies, eligibility and last date. For salary hike/DA/allowance news: be happy, excited and reassuring, and say amounts, percentages and effective dates clearly and slightly slower. When mentioning last dates, warnings or important notices: become a little serious and urgent. End with a warm, friendly closing. Keep a medium pace with natural pauses at commas and full stops. Pronounce English words like DA, GPSC, OJAS clearly. Read only the script text below exactly as written, do not add or remove any words, and do not read these instructions aloud.";

/// Gujarati Emotion / Tone Style
enum GujaratiVoiceEmotion {
  enthusiastic, // ઉત્સાહી અને આકર્ષક (YouTube News, Hooks, Updates)
  official,     // ગંભીર અને સત્તાવાર (GRs, Notifications, Schemes)
  calm,         // શાંત અને શૈક્ષણિક (Teaching, Forms, Steps)
}

/// Google Cloud Voice Definition
class GoogleVoiceProfile {
  final String id;
  final String name;
  final String voiceId;
  final String gender;
  final String badge;
  final String description;
  final bool isClone;

  const GoogleVoiceProfile({
    required this.id,
    required this.name,
    required this.voiceId,
    required this.gender,
    required this.badge,
    required this.description,
    this.isClone = false,
  });
}

/// Standalone Google Cloud & Free TTS Service for Flutter Android
class GoogleTtsService {
  static const List<GoogleVoiceProfile> defaultProfiles = [
    GoogleVoiceProfile(
      id: 'google-wavenet-female',
      name: '👩 ગુજરાતી સ્ત્રી અવાજ (Google Cloud Wavenet)',
      voiceId: 'gu-IN-Wavenet-A',
      gender: 'female',
      badge: 'ગૂગલ Wavenet ⭐',
      description: 'અત્યંત મીઠો, સ્પષ્ટ અને કુદરતી સ્ત્રી અવાજ. સરકારી યોજના અને શૈક્ષણિક વિડીયો માટે શ્રેષ્ઠ.',
    ),
    GoogleVoiceProfile(
      id: 'google-wavenet-male',
      name: '👨 ગુજરાતી પુરુષ અવાજ (Google Cloud Wavenet)',
      voiceId: 'gu-IN-Wavenet-B',
      gender: 'male',
      badge: 'સત્તાવાર અવાજ ⭐',
      description: 'ગંભીર, મજબૂત અને પ્રભાવશાળી પુરુષ અવાજ. બ્રેકિંગ ન્યૂઝ અને પરિપત્રો માટે શ્રેષ્ઠ.',
    ),
    GoogleVoiceProfile(
      id: 'google-clone-custom',
      name: '👑 મારો ક્લોન કરેલ અવાજ (Custom Voice Clone)',
      voiceId: 'custom-clone',
      gender: 'custom',
      badge: 'ક્લોન અવાજ 👑',
      description: 'તમારા પોતાના અવાજનું મોડેલ અથવા Google Custom Voice ID વડે તમારો વાસ્તવિક અવાજ.',
      isClone: true,
    ),
    GoogleVoiceProfile(
      id: 'google-standard-female',
      name: '🌸 સ્ટાન્ડર્ડ સ્ત્રી અવાજ (Google Standard)',
      voiceId: 'gu-IN-Standard-A',
      gender: 'female',
      badge: '100% Free',
      description: 'ઝડપી અને સ્પષ્ટ સામાન્ય ગુજરાતી અવાજ.',
    ),
    GoogleVoiceProfile(
      id: 'google-standard-male',
      name: '🧔 સ્ટાન્ડર્ડ પુરુષ અવાજ (Google Standard)',
      voiceId: 'gu-IN-Standard-B',
      gender: 'male',
      badge: '100% Free',
      description: 'સ્પષ્ટ સામાન્ય પુરુષ અવાજ.',
    ),
  ];

  /// Builds natural SSML with emotional inflection and authentic Gujarati pauses
  static String buildGujaratiSSML({
    required String rawText,
    required GujaratiVoiceEmotion emotion,
    double userSpeed = 1.0,
  }) {
    // 1. Clean phonetics (expand numbers to Gujarati words, clean symbols)
    final cleaned = VoiceActorService.cleanGujaratiPhonetics(rawText);

    // 2. Determine rate and pitch according to emotion (smooth natural modulation)
    double rateMultiplier = userSpeed;
    String pitch = '+0st';

    switch (emotion) {
      case GujaratiVoiceEmotion.enthusiastic:
        rateMultiplier *= 1.04;
        pitch = '+0.5st';
        break;
      case GujaratiVoiceEmotion.official:
        rateMultiplier *= 0.98;
        pitch = '-0.5st';
        break;
      case GujaratiVoiceEmotion.calm:
        rateMultiplier *= 1.00;
        pitch = '+0st';
        break;
    }

    final ratePercent = (rateMultiplier * 100).toInt();

    // 3. Clean XML characters
    String ssmlText = cleaned
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&apos;');

    // Natural fluid speech: Allow Google's neural acoustic model to breathe naturally at commas without hard breaks.
    // Only insert a gentle breath pause at full sentence ends and paragraph breaks.
    ssmlText = ssmlText.replaceAll(RegExp(r'[.!?।]\s*'), '.\n<break time="220ms"/>');
    ssmlText = ssmlText.replaceAll(RegExp(r'\n{2,}'), '\n<break time="350ms"/>');

    return '<speak><prosody rate="$ratePercent%" pitch="$pitch">$ssmlText</prosody></speak>';
  }

  /// Synthesizes audio using Google Cloud Text-to-Speech API or Free Google Engine
  static Future<File> synthesizeVoice({
    required String text,
    required String profileId,
    required GujaratiVoiceEmotion emotion,
    String? customVoiceId,
    String? googleApiKey,
    double speed = 1.0,
    void Function(String msg)? onProgress,
  }) async {
    // If AUDIO_TONE_PROMPT was prepended, strip it so the engine only speaks the user's actual Gujarati script
    String actualScript = text;
    if (actualScript.startsWith(AUDIO_TONE_PROMPT)) {
      actualScript = actualScript.substring(AUDIO_TONE_PROMPT.length).trim();
    }

    final cleanText = VoiceActorService.cleanGujaratiPhonetics(actualScript);
    if (cleanText.trim().isEmpty) {
      throw Exception('ઓડિયો જનરેટ કરવા માટે લખાણ દાખલ કરો.');
    }

    // Determine target Google voice
    String voiceName = 'gu-IN-Wavenet-A';
    if (profileId == 'google-wavenet-male') {
      voiceName = 'gu-IN-Wavenet-B';
    } else if (profileId == 'google-standard-female') {
      voiceName = 'gu-IN-Standard-A';
    } else if (profileId == 'google-standard-male') {
      voiceName = 'gu-IN-Standard-B';
    } else if (profileId == 'google-clone-custom') {
      voiceName = (customVoiceId != null && customVoiceId.trim().isNotEmpty)
          ? customVoiceId.trim()
          : 'gu-IN-Wavenet-B';
    }

    onProgress?.call('ગૂગલ ક્લાઉડ એન્જિન સાથે કનેક્ટ થાય છે...');

    // 1. If Google API Key is provided, call official Google Cloud Text-to-Speech API
    if (googleApiKey != null && googleApiKey.trim().isNotEmpty) {
      try {
        final ssml = buildGujaratiSSML(rawText: cleanText, emotion: emotion, userSpeed: speed);
        final apiKey = googleApiKey.trim();
        final url = Uri.parse('https://texttospeech.googleapis.com/v1/text:synthesize?key=$apiKey');

        final body = jsonEncode({
          'input': {'ssml': ssml},
          'voice': {
            'languageCode': 'gu-IN',
            'name': voiceName,
          },
          'audioConfig': {
            'audioEncoding': 'MP3',
            'speakingRate': speed.clamp(0.25, 4.0),
          }
        });

        final res = await http.post(
          url,
          headers: {'Content-Type': 'application/json'},
          body: body,
        ).timeout(const Duration(seconds: 40));

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          if (data['audioContent'] != null) {
            final bytes = base64Decode(data['audioContent'] as String);
            return await _saveAudioFile(bytes);
          }
        } else {
          final errJson = jsonDecode(res.body);
          final msg = errJson['error']?['message'] ?? 'Status ${res.statusCode}';
          print('Google Cloud API Error ($msg). Falling back to Free Google Engine...');
        }
      } catch (e) {
        print('Google Cloud API exception ($e). Falling back to Free Google Engine...');
      }
    }

    // 2. Free Google Engine Fallback (Zero Config, 100% Free & Unlimited)
    onProgress?.call('ગૂગલ ફ્રી એન્જિન દ્વારા ભાવ સાથે ઓડિયો તૈયાર થાય છે...');
    return await _synthesizeFreeGoogleEngine(cleanText, onProgress);
  }

  /// Synthesizes long text for free via Google chunk synthesis with 0 cost
  static Future<File> _synthesizeFreeGoogleEngine(
    String text,
    void Function(String msg)? onProgress,
  ) async {
    final chunks = _splitIntoGoogleChunks(text);
    final List<int> fullBytes = [];

    for (int i = 0; i < chunks.length; i++) {
      final chunk = chunks[i];
      if (chunks.length > 1) {
        onProgress?.call('ઓડિયો તૈયાર થાય છે... ભાગ ${i + 1}/${chunks.length}');
      }

      final encoded = Uri.encodeComponent(chunk);
      final url = Uri.parse('https://translate.google.com/translate_tts?ie=UTF-8&q=$encoded&tl=gu&client=tw-ob');

      final res = await http.get(
        url,
        headers: {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'},
      ).timeout(const Duration(seconds: 30));

      if (res.statusCode == 200 && res.bodyBytes.isNotEmpty) {
        fullBytes.addAll(res.bodyBytes);
      } else {
        throw Exception('ગૂગલ ઓડિયો ડાઉનલોડ કરવામાં સમસ્યા આવી (${res.statusCode})');
      }

      // Small breather between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        await Future.delayed(const Duration(milliseconds: 150));
      }
    }

    if (fullBytes.isEmpty) {
      throw Exception('ઓડિયો ડેટા ખાલી આવ્યો હતો.');
    }

    return await _saveAudioFile(Uint8List.fromList(fullBytes));
  }

  /// Splits Gujarati text cleanly at sentence boundaries (Never at commas)
  /// This ensures every synthesized chunk has complete, natural, and fluent intonation.
  static List<String> _splitIntoGoogleChunks(String text, {int maxChars = 180}) {
    if (text.trim().isEmpty) return [];

    // Split on full sentence endings and newlines
    final rawSentences = text
        .split(RegExp(r'(?<=[.!?।\n])\s*'))
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();

    if (rawSentences.isEmpty) return [text.trim()];

    final chunks = <String>[];
    String currentChunk = '';

    for (final sentence in rawSentences) {
      if (sentence.length > maxChars) {
        // If a single sentence is unusually long, split only at natural space boundaries
        if (currentChunk.isNotEmpty) {
          chunks.add(currentChunk.trim());
          currentChunk = '';
        }
        final words = sentence.split(RegExp(r'\s+'));
        String wordChunk = '';
        for (final w in words) {
          if ((wordChunk + (wordChunk.isEmpty ? '' : ' ') + w).length <= maxChars) {
            wordChunk += (wordChunk.isEmpty ? '' : ' ') + w;
          } else {
            if (wordChunk.isNotEmpty) chunks.add(wordChunk.trim());
            wordChunk = w;
          }
        }
        if (wordChunk.isNotEmpty) chunks.add(wordChunk.trim());
      } else if ((currentChunk + (currentChunk.isEmpty ? '' : ' ') + sentence).length <= maxChars) {
        currentChunk += (currentChunk.isEmpty ? '' : ' ') + sentence;
      } else {
        if (currentChunk.isNotEmpty) chunks.add(currentChunk.trim());
        currentChunk = sentence;
      }
    }

    if (currentChunk.trim().isNotEmpty) {
      chunks.add(currentChunk.trim());
    }

    return chunks.isNotEmpty ? chunks : [text.trim()];
  }

  /// Saves audio bytes to local documents directory as an MP3 file
  static Future<File> _saveAudioFile(Uint8List bytes) async {
    final docsDir = await getApplicationDocumentsDirectory();
    final fileName = 'gyan_yatra_voice_${DateTime.now().millisecondsSinceEpoch}.mp3';
    final file = File('${docsDir.path}/$fileName');
    await file.writeAsBytes(bytes);
    return file;
  }
}
