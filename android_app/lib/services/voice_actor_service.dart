/// Voice Actor Sentence Representation
class ActorSentence {
  final int id;
  final String text;
  final String vocalDeliveryText;
  final String toneType;
  final String badgeGuj;
  final int badgeColorValue;
  final double pitch;
  final double rate;
  final int pauseAfterMs;

  const ActorSentence({
    required this.id,
    required this.text,
    required this.vocalDeliveryText,
    required this.toneType,
    required this.badgeGuj,
    required this.badgeColorValue,
    required this.pitch,
    required this.rate,
    required this.pauseAfterMs,
  });
}

/// AI Script Director Analysis Result
class ScriptDirectorAnalysis {
  final String detectedTone;
  final String title;
  final String recommendedModel;
  final double stability;
  final double similarity;
  final double style;
  final double speed;
  final String reasonGuj;

  const ScriptDirectorAnalysis({
    required this.detectedTone,
    required this.title,
    required this.recommendedModel,
    required this.stability,
    required this.similarity,
    required this.style,
    required this.speed,
    required this.reasonGuj,
  });

  String get detectedCategoryGuj => title;
  double get recommendedStability => stability;
  double get recommendedSimilarity => similarity;
  double get recommendedStyle => style;
  double get recommendedSpeed => speed;
}

/// Voice Actor Service for Dart / Android
/// Provides offline script understanding, Aaroh-Avroh modulation,
/// phonetic cleanups, and Master Actor Prompt generation.
class VoiceActorService {
  static const List<String> _units = [
    '', 'એક', 'બે', 'ત્રણ', 'ચાર', 'પાંચ', 'છ', 'સાત', 'આઠ', 'નવ', 'દસ',
    'અગિયાર', 'બાર', 'તેર', 'ચૌદ', 'પંદર', 'સોળ', 'સત્તર', 'અઢાર', 'ઓગણીસ', 'વીસ',
    'એકવીસ', 'બાવીસ', 'તેવીસ', 'ચોવીસ', 'પચીસ', 'છવ્વીસ', 'સત્તાવીસ', 'અઠ્ઠાવીસ', 'ઓગણત્રીસ', 'ત્રીસ',
    'એકત્રીસ', 'બત્રીસ', 'તેત્રીસ', 'ચોત્રીસ', 'પાંત્રીસ', 'છત્રીસ', 'સાડત્રીસ', 'અડત્રીસ', 'ઓગણચાલીસ', 'ચાલીસ',
    'એકતાલીસ', 'બેતાલીસ', 'તેતાલીસ', 'ચુંમાલીસ', 'પિસ્તાલીસ', 'છેતાલીસ', 'સુડતાલીસ', 'અડતાલીસ', 'ઓગણપચાસ', 'પચાસ',
    'એકાવન', 'બાવન', 'તેપન', 'ચોપન', 'પંચાવન', 'છપ્પન', 'સત્તાવન', 'અઠ્ઠાવન', 'ઓગણસાઠ', 'સાઠ',
    'એકસઠ', 'બાસઠ', 'તેસઠ', 'ચોસઠ', 'પાંસઠ', 'છાસઠ', 'સડસઠ', 'અડસઠ', 'અગણોસિત્તેર', 'સિત્તેર',
    'એકોતેર', 'બોતેર', 'તોતેર', 'ચોતેર', 'પંચોતેર', 'છોતેર', 'સંતોતેર', 'ઈઠોતેર', 'ઓગણએંસી', 'એંસી',
    'એક્યાસી', 'બ્યાસી', 'ત્યાસી', 'ચોર્યાસી', 'પંચાસી', 'છ્યાસી', 'સિત્યાસી', 'અઠ્યાસી', 'નેવ્યાસી', 'નેવું',
    'એકાણું', 'બાણું', 'ત્રાણું', 'ચોરાણું', 'પંચાણું', 'છન્નું', 'સત્તાણું', 'અઠ્ઠાણું', 'નવ્વાણું'
  ];

  static const List<String> _months = [
    '', 'જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન',
    'જુલાઈ', 'ઓગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'
  ];

  static String numberToGujaratiWords(int n) {
    n = n.abs();
    if (n == 0) return 'શૂન્ય';
    if (n < 100) return _units[n];
    if (n < 1000) {
      final h = n ~/ 100;
      final rem = n % 100;
      final hStr = h == 1 ? 'એકસો' : '${_units[h]}સો';
      return rem > 0 ? '$hStr ${_units[rem]}' : hStr;
    }
    if (n < 100000) {
      final th = n ~/ 1000;
      final rem = n % 1000;
      final thStr = '${numberToGujaratiWords(th)} હજાર';
      return rem > 0 ? '$thStr ${numberToGujaratiWords(rem)}' : thStr;
    }
    if (n < 10000000) {
      final lk = n ~/ 100000;
      final rem = n % 100000;
      final lkStr = '${numberToGujaratiWords(lk)} લાખ';
      return rem > 0 ? '$lkStr ${numberToGujaratiWords(rem)}' : lkStr;
    }
    final cr = n ~/ 10000000;
    final rem = n % 10000000;
    final crStr = '${numberToGujaratiWords(cr)} કરોડ';
    return rem > 0 ? '$crStr ${numberToGujaratiWords(rem)}' : crStr;
  }

  /// Strips presentation metadata, timestamps, visual cues, and markdown formatting
  static String sanitizeScriptForSpeech(String text) {
    if (text.trim().isEmpty) return '';
    var res = text;

    // 1. Blockquote quotes extraction if present
    final quoteMatches = <String>[];
    final qRegex = RegExp(r'>\s*["“]([^"”]+)["”]');
    for (final m in qRegex.allMatches(res)) {
      final val = m.group(1);
      if (val != null && val.trim().isNotEmpty) {
        quoteMatches.add(val.trim());
      }
    }
    if (quoteMatches.isNotEmpty) {
      res = quoteMatches.join('\n\n');
    }

    // 2. Remove markdown headings
    res = res.replaceAll(RegExp(r'^[ \t]*#{1,6}[^\n]*', multiLine: true), '');

    // 3. Remove metadata / visual cue markers
    res = res.replaceAll(RegExp(r'^[ \t]*(?:👉|🔗|⏱️|🎙️|📌|🎯|📊|👥|🏷️|⚪|🚨|🎬|📋|⚡|📐)\s*[^\n]*', multiLine: true), '');
    res = res.replaceAll(RegExp(r'^[ \t]*[-*•]?\s*(?:સ્ક્રીન\s*નિર્દેશ|સ્ક્રીન\s*પોઇન્ટર|સ્ક્રીન\s*દિગ્દર્શન|વિઝ્યુઅલ|પુરાવો|On-Screen|Visual)[^\n]*', caseSensitive: false, multiLine: true), '');
    res = res.replaceAll(RegExp(r'^[ \t]*[-*•]?\s*(?:શબ્દશઃ સ્ક્રિપ્ટ|માઇક્રોફોન પર બોલવાની|સમયગાળો|બ્રિજ લિંક|મુખ્ય સંદેશ|લક્ષિત દર્શકો|Slide Understanding|Audience Retention|Voice Delivery Notes|On-Screen Highlight|Fact-Check)[^\n:]*:\s*', caseSensitive: false, multiLine: true), '');

    // 4. Remove parenthetical timestamps
    res = res.replaceAll(RegExp(r'\([૦-૯\d:\s\-–—]+(?:સેકન્ડ|મિનિટ)?\)', caseSensitive: false), '');
    res = res.replaceAll(RegExp(r'\[[૦-૯\d:\s\-–—]+(?:સેકન્ડ|મિનિટ)?\]', caseSensitive: false), '');

    // 5. Remove stage directions inside brackets
    res = res.replaceAll(RegExp(r'\[[^\]]+\]'), '');

    // 6. Clean markdown symbols
    res = res.replaceAll(RegExp(r'[*_~`>]'), '');

    // 7. Strip surrounding quotes from lines
    res = res.replaceAll(RegExp(r'^[ \t]*["“\u0027]|["”\u0027][ \t]*$', multiLine: true), '');

    // 8. Multiple newlines
    res = res.replaceAll(RegExp(r'\n{3,}'), '\n\n');

    return res.trim();
  }

  static String cleanGujaratiPhonetics(String text) {
    if (text.isEmpty) return '';
    var res = sanitizeScriptForSpeech(text);

    // Digits normalization
    const gujDigits = '૦૧૨૩૪૫૬૭૮૯';
    for (int i = 0; i < 10; i++) {
      res = res.replaceAll(gujDigits[i], '$i');
    }

    // Remove commas in numbers (e.g. 52,500 or 52, 500 -> 52500)
    final commaRegex = RegExp(r'(\d+),\s*(\d+)');
    while (commaRegex.hasMatch(res)) {
      res = res.replaceAllMapped(commaRegex, (m) => '${m.group(1)}${m.group(2)}');
    }

    // Land records
    res = res.replaceAll(RegExp(r'\b7\/12\b'), 'સાત બાર');
    res = res.replaceAll(RegExp(r'\b8\s*[-/]?\s*[Aઅa]\b', caseSensitive: false), 'આઠ અ');

    // Dates (DD/MM/YYYY or DD-MM-YYYY)
    res = res.replaceAllMapped(RegExp(r'\b([0-3]?\d)[\/\-]([0-1]?\d)[\/\-](\d{2,4})\b'), (m) {
      final day = int.tryParse(m.group(1) ?? '0') ?? 0;
      final month = int.tryParse(m.group(2) ?? '0') ?? 0;
      var year = int.tryParse(m.group(3) ?? '0') ?? 0;
      if (year < 100) year += 2000;
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return '${numberToGujaratiWords(day)} ${_months[month]} ${numberToGujaratiWords(year)}';
      }
      return m.group(0)!;
    });

    // Currency and percent to Gujarati words
    res = res.replaceAllMapped(RegExp(r'(?:₹|રૂ\.|Rs\.?|INR)\s*(\d+)', caseSensitive: false), (m) {
      final val = int.tryParse(m.group(1) ?? '0') ?? 0;
      return '${numberToGujaratiWords(val)} રૂપિયા';
    });

    res = res.replaceAllMapped(RegExp(r'\b(\d+)\s*(?:રૂપિયા|રૂ|rs)\b', caseSensitive: false), (m) {
      final val = int.tryParse(m.group(1) ?? '0') ?? 0;
      return '${numberToGujaratiWords(val)} રૂપિયા';
    });

    res = res.replaceAllMapped(RegExp(r'(\d+)\s*%'), (m) {
      final val = int.tryParse(m.group(1) ?? '0') ?? 0;
      return '${numberToGujaratiWords(val)} ટકા';
    });

    res = res.replaceAllMapped(RegExp(r'\b(\d+)\b'), (m) {
      final val = int.tryParse(m.group(1) ?? '0') ?? 0;
      if (val <= 99999999) return numberToGujaratiWords(val);
      return m.group(0)!;
    });

    // Common Exam & Government Abbreviations
    res = res.replaceAll(RegExp(r'\b(?:GPSC|G\.P\.S\.C\.)\b', caseSensitive: false), 'જી.પી.એસ.સી.');
    res = res.replaceAll(RegExp(r'\b(?:GSSSB|G\.S\.S\.S\.B\.)\b', caseSensitive: false), 'જી.એસ.એસ.એસ.બી.');
    res = res.replaceAll(RegExp(r'\b(?:GPSSB|G\.P\.S\.S\.B\.)\b', caseSensitive: false), 'જી.પી.એસ.એસ.બી.');
    res = res.replaceAll(RegExp(r'\b(?:LRD|L\.R\.D\.)\b', caseSensitive: false), 'એલ.આર.ડી.');
    res = res.replaceAll(RegExp(r'\b(?:OJAS|ojas)\b', caseSensitive: false), 'ઓજસ');
    res = res.replaceAll(RegExp(r'\b(?:TET|T\.E\.T\.)\b', caseSensitive: false), 'ટેટ');
    res = res.replaceAll(RegExp(r'\b(?:TAT|T\.A\.T\.)\b', caseSensitive: false), 'ટાટ');
    res = res.replaceAll(RegExp(r'\b(?:SEB|S\.E\.B\.)\b', caseSensitive: false), 'એસ.ઈ.બી.');
    res = res.replaceAll(RegExp(r'\b(?:GSEB|G\.S\.E\.B\.)\b', caseSensitive: false), 'જી.એસ.ઈ.બી.');
    res = res.replaceAll(RegExp(r'\b(?:CCC|C\.C\.C\.)\b', caseSensitive: false), 'સી.સી.સી.');
    res = res.replaceAll(RegExp(r'\b(?:EWS|E\.W\.S\.)\b', caseSensitive: false), 'ઈ.ડબલ્યુ.એસ.');
    res = res.replaceAll(RegExp(r'\b(?:OBC|O\.B\.C\.)\b', caseSensitive: false), 'ઓ.બી.સી.');
    res = res.replaceAll(RegExp(r'\b(?:SC)\b'), 'એસ.સી.');
    res = res.replaceAll(RegExp(r'\b(?:ST)\b'), 'એસ.ટી.');
    res = res.replaceAll(RegExp(r'\b(?:DBT|D\.B\.T\.)\b', caseSensitive: false), 'ડી.બી.ટી.');
    res = res.replaceAll(RegExp(r'\b(?:PM|P\.M\.)\b'), 'પી.એમ.');
    res = res.replaceAll(RegExp(r'\b(?:CM|C\.M\.)\b'), 'સી.એમ.');
    res = res.replaceAll(RegExp(r'\b(?:UPSC|U\.P\.S\.C\.)\b', caseSensitive: false), 'યુ.પી.એસ.સી.');
    res = res.replaceAll(RegExp(r'\b(?:DA|D\.A\.)\b'), 'ડી.એ. એટલે કે મોંઘવારી ભથ્થું');
    res = res.replaceAll(RegExp(r'\b(?:GR|G\.R\.)\b'), 'સરકારી ઠરાવ');
    res = res.replaceAll(RegExp(r'\b(?:PDF|P\.D\.F\.)\b', caseSensitive: false), 'પી.ડી.એફ.');
    res = res.replaceAll(RegExp(r'\b(?:PPT|P\.P\.T\.)\b', caseSensitive: false), 'પી.પી.ટી.');
    res = res.replaceAll(RegExp(r'\b(?:KYC)\b', caseSensitive: false), 'કે.વાય.સી.');
    res = res.replaceAll(RegExp(r'\b(?:OTP)\b', caseSensitive: false), 'ઓ.ટી.પી.');
    res = res.replaceAll(RegExp(r'\b(?:YouTube)\b', caseSensitive: false), 'યુટ્યુબ');
    res = res.replaceAll(RegExp(r'\b(?:Website)\b', caseSensitive: false), 'વેબસાઇટ');
    res = res.replaceAll(RegExp(r'\b(?:Online)\b', caseSensitive: false), 'ઓનલાઇન');
    res = res.replaceAll(RegExp(r'\b(?:Subscribe)\b', caseSensitive: false), 'સબ્સ્ક્રાઇબ');
    res = res.replaceAll(RegExp(r'\b(?:Video|Videos)\b', caseSensitive: false), 'વિડીયો');
    res = res.replaceAll(RegExp(r'\b(?:વિડિઓ)\b'), 'વિડીયો');

    // Ensure Gujarati loanwords stay in natural Gujarati script (Never Latin)
    res = res.replaceAll(RegExp(r'\b(?:Screen|screen)\b'), 'સ્ક્રીન');
    res = res.replaceAll(RegExp(r'\b(?:Script|script)\b'), 'સ્ક્રિપ્ટ');

    // Convert ALL English words to natural Gujarati phonetics (Never spell letter-by-letter)
    res = convertEnglishToGujaratiPhonetics(res);

    // Natural cadence without choppy comma overload
    res = injectCadenceAndStress(res);

    return res.trim();
  }

  /// Comprehensive English to Gujarati word dictionary
  static const Map<String, String> _englishToGujarati = {
    'world': 'વર્લ્ડ',
    'word': 'વર્ડ',
    'words': 'વર્ડ્સ',
    'youtube': 'યુટ્યુબ',
    'channel': 'ચેનલ',
    'channels': 'ચેનલ્સ',
    'video': 'વિડીયો',
    'videos': 'વિડીયોઝ',
    'audio': 'ઓડિયો',
    'voice': 'વોઇસ',
    'script': 'સ્ક્રિપ્ટ',
    'screen': 'સ્ક્રીન',
    'online': 'ઓનલાઇન',
    'offline': 'ઓફલાઇન',
    'website': 'વેબસાઇટ',
    'link': 'લિંક',
    'links': 'લિંક્સ',
    'click': 'ક્લિક',
    'button': 'બટન',
    'update': 'અપડેટ',
    'updates': 'અપડેટ્સ',
    'new': 'ન્યુ',
    'news': 'ન્યૂઝ',
    'breaking': 'બ્રેકિંગ',
    'today': 'આજે',
    'welcome': 'વેલકમ',
    'subscribe': 'સબ્સ્ક્રાઇબ',
    'subscriber': 'સબ્સ્ક્રાઇબર',
    'subscribers': 'સબ્સ્ક્રાઇબર્સ',
    'like': 'લાઇક',
    'likes': 'લાઇક્સ',
    'share': 'શેર',
    'comment': 'કમેન્ટ',
    'comments': 'કમેન્ટ્સ',
    'bell': 'બેલ',
    'icon': 'આઇકન',
    'press': 'પ્રેસ',
    'download': 'ડાઉનલોડ',
    'upload': 'અપલોડ',
    'form': 'ફોર્મ',
    'apply': 'એપ્લાય',
    'application': 'એપ્લિકેશન',
    'portal': 'પોર્ટલ',
    'step': 'સ્ટેપ',
    'steps': 'સ્ટેપ્સ',
    'free': 'ફ્રી',
    'mobile': 'મોબાઇલ',
    'phone': 'ફોન',
    'number': 'નંબર',
    'notification': 'નોટિફિકેશન',
    'date': 'તારીખ',
    'last': 'લાસ્ટ',
    'scheme': 'સ્કીમ',
    'government': 'સરકાર',
    'exam': 'એક્ઝામ',
    'result': 'રિઝલ્ટ',
    'results': 'રિઝલ્ટ્સ',
    'hall': 'હોલ',
    'ticket': 'ટિકિટ',
    'admit': 'એડમિટ',
    'card': 'કાર્ડ',
    'process': 'પ્રોસેસ',
    'details': 'વિગતો',
    'check': 'ચેક',
    'status': 'સ્ટેટસ',
    'salary': 'પગાર',
    'pension': 'પેન્શન',
    'money': 'રૂપિયા',
    'cash': 'કેશ',
    'bank': 'બેંક',
    'account': 'એકાઉન્ટ',
    'document': 'ડોક્યુમેન્ટ',
    'documents': 'ડોક્યુમેન્ટ્સ',
    'pdf': 'પીડીએફ',
    'id': 'આઈડી',
    'login': 'લોગિન',
    'password': 'પાસવર્ડ',
    'otp': 'ઓટીપી',
    'kyc': 'કેવાયસી',
    'pan': 'પાન',
    'aadhaar': 'આધાર',
    'aadhar': 'આધાર',
    'service': 'સર્વિસ',
    'services': 'સર્વિસીસ',
    'center': 'સેન્ટર',
    'office': 'ઓફિસ',
    'computer': 'કમ્પ્યુટર',
    'laptop': 'લેપટોપ',
    'setting': 'સેટિંગ',
    'settings': 'સેટિંગ્સ',
    'student': 'સ્ટુડન્ટ',
    'students': 'સ્ટુડન્ટ્સ',
    'teacher': 'ટીચર',
    'teachers': 'ટીચર્સ',
    'school': 'સ્કૂલ',
    'college': 'કોલેજ',
    'board': 'બોર્ડ',
    'university': 'યુનિવર્સિટી',
    'friends': 'મિત્રો',
    'hello': 'હેલો',
    'hi': 'હાય',
    'bye': 'બાય',
    'thanks': 'થેન્ક્સ',
    'thank': 'થેન્ક',
    'please': 'પ્લીઝ',
    'sir': 'સર',
    'madam': 'મેડમ',
    'alert': 'એલર્ટ',
    'short': 'શોર્ટ',
    'shorts': 'શોર્ટ્સ',
    'reel': 'રીલ',
    'reels': 'રીલ્સ',
    'trending': 'ટ્રેન્ડિંગ',
    'viral': 'વાયરલ',
    'live': 'લાઇવ',
    'stream': 'સ્ટ્રીમ',
    'watch': 'વોચ',
    'time': 'ટાઇમ',
    'best': 'બેસ્ટ',
    'super': 'સુપર',
    'special': 'સ્પેશિયલ',
    'good': 'ગુડ',
    'morning': 'મોર્નિંગ',
    'evening': 'ઇવનિંગ',
    'night': 'નાઇટ',
    'ai': 'એ આઈ',
    'chatgpt': 'ચેટ જીપીટી',
    'gemini': 'જેમિની',
    'google': 'ગૂગલ',
    'facebook': 'ફેસબુક',
    'whatsapp': 'વોટ્સએપ',
    'instagram': 'ઇન્સ્ટાગ્રામ',
    'telegram': 'ટેલિગ્રામ',
    'sms': 'એસએમએસ',
    'message': 'મેસેજ',
    'call': 'કૉલ',
    'help': 'હેલ્પ',
    'helpline': 'હેલ્પલાઇન',
    'wifi': 'વાઇફાઇ',
    'internet': 'ઇન્ટરનેટ',
    'sim': 'સિમ',
    'recharge': 'રિચાર્જ',
    'data': 'ડેટા',
    'speed': 'સ્પીડ',
    'network': 'નેટવર્ક',
    'description': 'ડિસ્ક્રિપ્શન',
    'box': 'બોક્સ',
    'info': 'ઇન્ફો',
    'information': 'માહિતી',
    'list': 'લિસ્ટ',
    'rules': 'નિયમો',
    'eligibility': 'લાયકાત',
    'merit': 'મેરિટ',
    'cut': 'કટ',
    'off': 'ઓફ',
    'bonus': 'બોનસ',
    'budget': 'બજેટ',
    'subsidy': 'સબસિડી',
    'loan': 'લોન',
    'tax': 'ટેક્સ',
    'income': 'આવક',
    'certificate': 'સર્ટિફિકેટ',
    'smart': 'સ્માર્ટ',
    'tablet': 'ટેબ્લેટ',
    'photo': 'ફોટો',
    'image': 'ઇમેજ',
    'file': 'ફાઇલ',
    'folder': 'ફોલ્ડર',
    'copy': 'કોપી',
    'paste': 'પેસ્ટ',
    'delete': 'ડિલીટ',
    'save': 'સેવ',
    'edit': 'એડિટ',
    'view': 'વ્યુ',
    'start': 'સ્ટાર્ટ',
    'stop': 'સ્ટોપ',
    'next': 'નેક્સ્ટ',
    'back': 'બેક',
    'done': 'ડન',
    'success': 'સક્સેસ',
    'error': 'એરર',
    'problem': 'પ્રોબ્લેમ',
    'solution': 'સોલ્યુશન',
    'tips': 'ટિપ્સ',
    'tricks': 'ટ્રિક્સ',
    'guide': 'ગાઇડ',
    'tutorial': 'ટ્યુટોરિયલ',
    'creator': 'ક્રિએટર',
    'studio': 'સ્ટુડિયો',
    'policy': 'પોલિસી',
    'review': 'રિવ્યુ',
    'star': 'સ્ટાર'
  };

  /// Transliterates English words into natural Gujarati phonetics so TTS never spells letter-by-letter
  static String convertEnglishToGujaratiPhonetics(String text) {
    if (text.isEmpty) return '';
    return text.replaceAllMapped(RegExp(r'[A-Za-z]+'), (m) {
      final raw = m.group(0)!;
      final lower = raw.toLowerCase();
      if (_englishToGujarati.containsKey(lower)) {
        return _englishToGujarati[lower]!;
      }
      return _transliteratePhoneticFallback(lower);
    });
  }

  /// Rule-based phonetic transliteration for any unlisted English word
  static String _transliteratePhoneticFallback(String word) {
    var res = word;

    // Multi-letter replacements
    res = res.replaceAll(RegExp(r'tion\b'), 'શન');
    res = res.replaceAll(RegExp(r'sion\b'), 'ઝન');
    res = res.replaceAll(RegExp(r'ture\b'), 'ચર');
    res = res.replaceAll(RegExp(r'tch'), 'ચ');
    res = res.replaceAll(RegExp(r'ch'), 'ચ');
    res = res.replaceAll(RegExp(r'sh'), 'શ');
    res = res.replaceAll(RegExp(r'th'), 'થ');
    res = res.replaceAll(RegExp(r'ph'), 'ફ');
    res = res.replaceAll(RegExp(r'wh'), 'વ');
    res = res.replaceAll(RegExp(r'ck'), 'ક');
    res = res.replaceAll(RegExp(r'kh'), 'ખ');
    res = res.replaceAll(RegExp(r'gh'), 'ઘ');
    res = res.replaceAll(RegExp(r'bh'), 'ભ');
    res = res.replaceAll(RegExp(r'dh'), 'ધ');
    res = res.replaceAll(RegExp(r'jh'), 'ઝ');
    res = res.replaceAll(RegExp(r'ng\b'), 'ંગ');
    res = res.replaceAll(RegExp(r'nk\b'), 'ન્ક');

    // Vowel clusters
    res = res.replaceAll(RegExp(r'ee'), 'ી');
    res = res.replaceAll(RegExp(r'ea'), 'ી');
    res = res.replaceAll(RegExp(r'oo'), 'ૂ');
    res = res.replaceAll(RegExp(r'ou'), 'આઉ');
    res = res.replaceAll(RegExp(r'ow\b'), 'ઓ');
    res = res.replaceAll(RegExp(r'ai'), 'એ');
    res = res.replaceAll(RegExp(r'ay\b'), 'એ');
    res = res.replaceAll(RegExp(r'all\b'), 'ઓલ');
    res = res.replaceAll(RegExp(r'aw'), 'ઓ');
    res = res.replaceAll(RegExp(r'oi'), 'ઓય');
    res = res.replaceAll(RegExp(r'oy\b'), 'ઓય');

    // Single consonants
    res = res.replaceAll('b', 'બ');
    res = res.replaceAll(RegExp(r'c(?=[eiy])'), 'સ');
    res = res.replaceAll('c', 'ક');
    res = res.replaceAll('d', 'ડ');
    res = res.replaceAll('f', 'ફ');
    res = res.replaceAll(RegExp(r'g(?=[eiy]\b)'), 'જ');
    res = res.replaceAll('g', 'ગ');
    res = res.replaceAll('h', 'હ');
    res = res.replaceAll('j', 'જ');
    res = res.replaceAll('k', 'ક');
    res = res.replaceAll('l', 'લ');
    res = res.replaceAll('m', 'મ');
    res = res.replaceAll('n', 'ન');
    res = res.replaceAll('p', 'પ');
    res = res.replaceAll('q', 'ક');
    res = res.replaceAll('r', 'ર');
    res = res.replaceAll('s', 'સ');
    res = res.replaceAll('t', 'ટ');
    res = res.replaceAll('v', 'વ');
    res = res.replaceAll('w', 'વ');
    res = res.replaceAll('x', 'ક્સ');
    res = res.replaceAll(RegExp(r'y(?=[aeiou])'), 'ય');
    res = res.replaceAll(RegExp(r'y\b'), 'ી');
    res = res.replaceAll('z', 'ઝ');

    // Basic vowels
    res = res.replaceAll(RegExp(r'a\b'), 'ા');
    res = res.replaceAll('a', 'ા');
    res = res.replaceAll(RegExp(r'e\b'), '');
    res = res.replaceAll('e', 'ે');
    res = res.replaceAll('i', 'િ');
    res = res.replaceAll('o', 'ો');
    res = res.replaceAll('u', 'ુ');

    return res.isNotEmpty ? res : word;
  }

  /// Injects natural cadence (લય) and vocal stress (ભાર) for YouTube narration.
  static String injectCadenceAndStress(String text) {
    if (text.isEmpty) return '';
    var res = text;

    // 1. Stress injection (ભાર): High-impact news announcements receive emphasis punctuation
    res = res.replaceAll(RegExp(r'(સૌથી મોટા ખુશખબર|મોટા ખુશખબર|મોટો નિર્ણય|સત્તાવાર જાહેરાત|સત્તાવાર પરિપત્ર|નવો પરિપત્ર|ધ્યાન આપો)(?=[,.\s]|$)'), r'$1!');
    res = res.replaceAll(RegExp(r'!{2,}'), '!');

    // 2. Clean duplicate punctuation (avoid choppy breaks)
    res = res.replaceAll(RegExp(r',\s*,'), ',');
    res = res.replaceAll(RegExp(r'!\s*,'), '!');
    res = res.replaceAll(RegExp(r',\s*!'), '!');
    res = res.replaceAll(RegExp(r'\s+'), ' ');

    return res.trim();
  }

  /// Converts Gujarati script to Devanagari script for ElevenLabs.
  /// ElevenLabs has native acoustic models for Devanagari, producing
  /// 100% natural, crisp Indic pronunciation for Gujarati words without accent or slurring.
  static String gujaratiToDevanagari(String text) {
    if (text.isEmpty) return '';
    final buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      final code = text.codeUnitAt(i);
      // Crucial: Gujarati 'ળ' (0x0AB3) mapped to Devanagari 'ळ' (0x0933) causes micro-stuttering/hesitation
      // in ElevenLabs Indic models because ळ is a rare Marathi-only consonant.
      // Mapping 'ળ' to standard Indic 'ल' (0x0932) produces 100% smooth, natural, liquid Gujarati flow without hesitation!
      if (code == 0x0AB3) {
        buffer.writeCharCode(0x0932);
      } else if (code >= 0x0A81 && code <= 0x0AF9) {
        buffer.writeCharCode(code - 0x0180);
      } else {
        buffer.writeCharCode(code);
      }
    }
    return buffer.toString();
  }

  /// Splits long script text into natural sentence-level chunks
  /// to guarantee support for unlimited audio length without API limits.
  static List<String> splitTextIntoSafeChunks(String text, {int maxChars = 800}) {
    if (text.isEmpty) return [];
    final sentences = text
        .split(RegExp(r'(?<=[.!?।\n])\s+'))
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();

    final List<String> chunks = [];
    var current = '';

    for (final s in sentences) {
      if ((current.isNotEmpty ? '$current $s' : s).length > maxChars) {
        if (current.isNotEmpty) chunks.add(current);
        current = s;
      } else {
        current = current.isNotEmpty ? '$current $s' : s;
      }
    }
    if (current.isNotEmpty) chunks.add(current);
    return chunks.isNotEmpty ? chunks : [text];
  }

  /// AI Auto-Director: Analyzes the script vocabulary and automatically
  /// determines the best vocal tone, delivery parameters, and model.
  static ScriptDirectorAnalysis analyzeScriptTone(String text) {
    if (text.isEmpty) {
      return const ScriptDirectorAnalysis(
        detectedTone: 'natural_narration',
        title: '🎙️ કુદરતી માનવીય સંવાદ',
        recommendedModel: 'eleven_turbo_v2_5',
        stability: 0.48,
        similarity: 0.82,
        style: 0.18,
        speed: 1.00,
        reasonGuj: 'કુદરતી વાર્તાલાપ શૈલી આપમેળે પસંદ કરી.',
      );
    }

    final isAd = RegExp(r'(?:ધ્યાન આપો|હમણાં જ|સબ્સ્ક્રાઇબ|લિંક|ઓફર|રોકેટ|જોરદાર|ખાસ|સ્પેશિયલ|ઓનલાઇન ખરીદો)', caseSensitive: false).hasMatch(text);
    final isUrgent = RegExp(r'(?:છેલ્લી તારીખ|ભૂલ ના કરતા|સાવધાન|ચેતવણી|તાકીદ|ધ્યાનમાં રાખવું|છેલ્લી ઘડી)', caseSensitive: false).hasMatch(text);
    final isOfficial = RegExp(r'(?:પરિપત્ર|ઠરાવ|નાણાં વિભાગ|સરકાર|પગારપંચ|મોંઘવારી ભથ્થું|DA|GR|જીઆર|સત્તાવાર|નિયમ|આદેશ)', caseSensitive: false).hasMatch(text);

    if (isAd) {
      return const ScriptDirectorAnalysis(
        detectedTone: 'advertisement',
        title: '📣 જાહેરાત & વાયરલ હુક',
        recommendedModel: 'eleven_turbo_v2_5',
        stability: 0.42,
        similarity: 0.85,
        style: 0.25,
        speed: 1.06,
        reasonGuj: 'પ્રમોશનલ / જાહેરાતી સ્ક્રિપ્ટ જણાઈ હોવાથી હાઈ-એનર્જી વાયરલ પંચ આપમેળે લાગુ કર્યો!',
      );
    } else if (isUrgent) {
      return const ScriptDirectorAnalysis(
        detectedTone: 'pagarvadhara',
        title: '⚠️ તાકીદ & મહત્વની ચેતવણી',
        recommendedModel: 'eleven_turbo_v2_5',
        stability: 0.50,
        similarity: 0.82,
        style: 0.20,
        speed: 0.96,
        reasonGuj: 'છેલ્લી તારીખ અને ચેતવણી જણાઈ હોવાથી તાકીદનો ભારપૂર્વક અવાજ પસંદ કર્યો!',
      );
    } else if (isOfficial) {
      return const ScriptDirectorAnalysis(
        detectedTone: 'pagarvadhara',
        title: '📢 સત્તાવાર સરકારી પરિપત્ર',
        recommendedModel: 'eleven_multilingual_v2',
        stability: 0.55,
        similarity: 0.80,
        style: 0.15,
        speed: 0.98,
        reasonGuj: 'સરકારી પરિપત્ર અને નિયમો જણાયા હોવાથી ગંભીર અધિકૃત ટોન પસંદ કર્યો!',
      );
    } else {
      return const ScriptDirectorAnalysis(
        detectedTone: 'natural_narration',
        title: '🎙️ કુદરતી માનવીય સંવાદ',
        recommendedModel: 'eleven_turbo_v2_5',
        stability: 0.48,
        similarity: 0.82,
        style: 0.18,
        speed: 1.00,
        reasonGuj: 'કુદરતી વાર્તાલાપ શૈલી આપમેળે પસંદ કરી!',
      );
    }
  }

  /// Converts stiff teleprompter reading into living, breathing YouTube creator speech
  static String humanTouchPolish(String text) {
    if (text.isEmpty) return '';
    var res = text;

    // Convert rigid greetings to warm human openers
    res = res.replaceAll(RegExp(r'(?:નમસ્તે|કેમ છો)\s+મિત્રો[!.]?'), 'નમસ્તે મિત્રો! ');
    
    // Add natural breathing pauses before transition phrases
    res = res.replaceAll(RegExp(r'\s+(અને હા|યાદ રાખજો|ખાસ વાત|ધ્યાનથી જુઓ)\s+'), r'... $1, ');
    
    // Inject breathing pauses before bridge clauses
    res = res.replaceAll(RegExp(r'\s+(પરંતુ|તેમજ|ત્યારબાદ|જેમાં|એટલે કે)\s+'), r', $1, ');

    // Clean duplicate punctuation
    res = res.replaceAll(RegExp(r',\s*,'), ',');
    res = res.replaceAll(RegExp(r'!\s*,'), '!');
    res = res.replaceAll(RegExp(r'\.{4,}'), '...');
    res = res.replaceAll(RegExp(r'\s+'), ' ');

    return res.trim();
  }

  /// Parses text into sentences annotated with Aaroh-Avroh badges and intonations
  static List<ActorSentence> parseActorScript(String rawText, {String style = 'breaking'}) {
    final cleaned = cleanGujaratiPhonetics(rawText);
    if (cleaned.isEmpty) return [];

    final rawSentences = cleaned
        .split(RegExp(r'(?<=[.!?।\n])\s+'))
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();

    final List<ActorSentence> list = [];

    for (int i = 0; i < rawSentences.length; i++) {
      final sentence = rawSentences[i];
      final isQuestion = sentence.contains('?');
      final isHook = (i == 0) || RegExp(r'(?:નમસ્તે|કેમ છો|મિત્રો|ખુશખબર|મોટો નિર્ણય|ધ્યાન આપો)', caseSensitive: false).hasMatch(sentence);
      final isOfficial = RegExp(r'(?:પરિપત્ર|ઠરાવ|સરકાર|નાણાં વિભાગ|સત્તાવાર|નિયમ|જીઆર|GR|જાહેરનામું)', caseSensitive: false).hasMatch(sentence);
      final isDeadline = RegExp(r'(?:છેલ્લી તારીખ|અરજી કરવાની|ધ્યાનમાં રાખવું|ચેતવણી|ભૂલ ના કરતા)', caseSensitive: false).hasMatch(sentence);
      final isClosing = (i >= rawSentences.length - 2) || RegExp(r'(?:સબ્સ્ક્રાઇબ|શેર કરો|લાઈક|જય હિન્દ|જય ભારત)', caseSensitive: false).hasMatch(sentence);
      final hasNumbers = RegExp(r'(?:રૂપિયા|હજાર|લાખ|કરોડ|ટકા|તારીખ)').hasMatch(sentence);

      var toneType = 'neutral';
      var badgeGuj = 'સામાન્ય શૈલી';
      var badgeColorValue = 0xFF94A3B8;
      var pitch = 1.0;
      var rate = 1.0;
      var pauseAfterMs = 280;

      if (isHook) {
        toneType = 'aaroh_hook';
        badgeGuj = '↗️ આરોહ (ઉત્સાહ & હૂક)';
        badgeColorValue = 0xFFF59E0B;
        pitch = style == 'shorts' ? 1.20 : 1.14;
        rate = style == 'shorts' ? 1.08 : 1.03;
        pauseAfterMs = 350;
      } else if (isQuestion) {
        toneType = 'aaroh_question';
        badgeGuj = '↗️ આરોહ (પ્રશ્નાર્થ ભાવ)';
        badgeColorValue = 0xFFEC4899;
        pitch = 1.18;
        rate = 1.02;
        pauseAfterMs = 400;
      } else if (isDeadline) {
        toneType = 'urgency';
        badgeGuj = '⚠️ ભારપૂર્વક (ચેતવણી/તારીખ)';
        badgeColorValue = 0xFFEF4444;
        pitch = 1.05;
        rate = 0.95;
        pauseAfterMs = 450;
      } else if (isOfficial) {
        toneType = 'avroh_authority';
        badgeGuj = '↘️ અવરોહ (સત્તાવાર ગંભીરતા)';
        badgeColorValue = 0xFF38BDF8;
        pitch = 0.90;
        rate = 0.94;
        pauseAfterMs = 380;
      } else if (hasNumbers) {
        toneType = 'avroh_numbers';
        badgeGuj = '⏸️ સ્પષ્ટ આંકડાકીય વિરામ';
        badgeColorValue = 0xFF10B981;
        pitch = 1.02;
        rate = 0.92;
        pauseAfterMs = 450;
      } else if (isClosing) {
        toneType = 'warm_closing';
        badgeGuj = '🤝 ઉષ્માભર્યો ઉપસંહાર';
        badgeColorValue = 0xFF8B5CF6;
        pitch = 1.04;
        rate = 0.98;
        pauseAfterMs = 500;
      }

      final vocalDelivery = sentence;

      list.add(ActorSentence(
        id: i + 1,
        text: sentence,
        vocalDeliveryText: vocalDelivery,
        toneType: toneType,
        badgeGuj: badgeGuj,
        badgeColorValue: badgeColorValue,
        pitch: pitch,
        rate: rate,
        pauseAfterMs: pauseAfterMs,
      ));
    }

    return list;
  }

  /// Generates the Master Actor Prompt for NotebookLM / ElevenLabs / ChatGPT Voice
  static String generateMasterVoiceActorPrompt({
    required String topic,
    String style = 'breaking',
    required String scriptText,
  }) {
    final cleaned = cleanGujaratiPhonetics(scriptText);

    return '''# MASTER PROMPT: GYAN YATRA — PROFESSIONAL GUJARATI VOICE ACTOR & NARRATOR

## ભૂમિકા (Your Role):
તમે એક ટોચના, અનુભવી ગુજરાતી વૉઇસ ઓવર એક્ટર (Voice Actor) અને સિનિયર ન્યૂઝ એન્કર છો. નીચે આપેલી સ્ક્રિપ્ટ અથવા PDF ને સૌથી પહેલા એક સાચા અભિનેતાની જેમ સંપૂર્ણ વાંચો અને સમજો.

## વિષય (Topic):
$topic

## કડક અભિનેતા સૂચનાઓ (Strict Voice Acting Directives):
1. **પહેલા સ્ક્રિપ્ટ સમજો (Read Full Script First)**: સીધું બોલવાને બદલે પહેલા દરેક વાક્યનો સંદર્ભ, મહત્વ અને દર્શકો સાથેનો સંબંધ સમજો.
2. **સ્પષ્ટ ઉચ્ચારણ (Crystal Clear Pronunciation)**: શુદ્ધ કાઠિયાવાડી/ગુજરાતી નેટિવ ઉચ્ચારણ. DA ને "મોંઘવારી ભથ્થું એટલે કે ડી.એ.", GR ને "સરકારી ઠરાવ", PDF ને "પી.ડી.એફ." સ્પષ્ટ બોલવું.
3. **આરોહ-અવરોહનું કડક પાલન (Aaroh-Avroh Modulation)**:
   - ↗️ આરોહ (Rising Pitch): પ્રશ્નો અને ઉત્સાહિત સમાચાર વખતે ઉચ્ચ પીચ.
   - ↘️ અવરોહ (Falling Pitch): સત્તાવાર સરકારી પરિપત્ર અને નિયમો વખતે ઊંડો, શાંત અને ગંભીર અવાજ.
   - ⏸️ નાટકીય વિરામ (Micro-Pauses): રકમ, તારીખ કે શરતો બોલતા પહેલાં સહજ વિરામ.
4. **માનવીય સંવાદ (Zero Robotic)**: રોબોટિક નહીં, જીવંત વક્તાની જેમ બોલો.

## બોલવા માટેની સંપૂર્ણ સ્ક્રિપ્ટ (Spoken Script to Narrate):
${cleaned.isNotEmpty ? cleaned : 'અહીં તમારી પસંદ કરેલી સ્ક્રિપ્ટ આવશે...'}

---
ઉપર આપેલી સ્ક્રિપ્ટને શુદ્ધ ગુજરાતી ઉચ્ચારો અને આરોહ-અવરોહ સાથે બોલો.''';
  }
}
