import 'package:flutter_test/flutter_test.dart';
import 'package:myvoice_ai/services/voice_actor_service.dart';
import 'package:myvoice_ai/services/google_tts_service.dart';

void main() {
  test('VoiceActorService transliterates English words to Gujarati phonetics', () {
    const raw = 'નમસ્તે મિત્રો, આજના world news વિડીયોમાં YouTube ચેનલ સબ્સ્ક્રાઇબ કરો અને link પર click કરી application form download કરો.';
    final cleaned = VoiceActorService.cleanGujaratiPhonetics(raw);

    // Verify zero English characters remain
    expect(RegExp(r'[a-zA-Z]').hasMatch(cleaned), false, reason: 'No Latin letters should remain in speech script: $cleaned');

    // Verify words are accurately transliterated
    expect(cleaned.contains('વર્લ્ડ'), true);
    expect(cleaned.contains('ન્યૂઝ'), true);
    expect(cleaned.contains('યુટ્યુબ'), true);
    expect(cleaned.contains('લિંક'), true);
    expect(cleaned.contains('ક્લિક'), true);
    expect(cleaned.contains('એપ્લિકેશન'), true);
    expect(cleaned.contains('ફોર્મ'), true);
    expect(cleaned.contains('ડાઉનલોડ'), true);
  });

  test('GoogleTtsService buildGujaratiSSML produces natural prosody without comma breaks', () {
    const raw = 'નમસ્તે મિત્રો, આજના વિડીયોમાં આપનું સ્વાગત છે. નવી સરકારી યોજના.';
    final ssml = GoogleTtsService.buildGujaratiSSML(
      rawText: raw,
      emotion: GujaratiVoiceEmotion.enthusiastic,
      userSpeed: 1.0,
    );

    // Verify NO break tags at commas
    expect(ssml.contains(', <break'), false, reason: 'SSML should not interrupt natural flow at commas');
    // Verify speak and prosody tags exist
    expect(ssml.startsWith('<speak><prosody rate="104%" pitch="+0.5st">'), true);
    expect(ssml.endsWith('</prosody></speak>'), true);
  });
}
