import 'dart:convert';
import 'package:http/http.dart' as http;
import '../main.dart' show SlideItem;

class NotebookLMPromptResult {
  final bool success;
  final String topic;
  final String domain;
  final String contentSourcePrompt; // Tool 1: Content & Source Maker
  final String pptDeckPrompt;       // Tool 2: 16:9 White PPT & Best Real Photos
  final String promptText;          // Aliased to pptDeckPrompt
  final String scriptPromptText;    // Companion script
  final List<SlideItem> previewSlides;
  final List<String> researchQuestions;

  NotebookLMPromptResult({
    required this.success,
    required this.topic,
    required this.domain,
    required this.contentSourcePrompt,
    required this.pptDeckPrompt,
    required this.promptText,
    required this.scriptPromptText,
    required this.previewSlides,
    required this.researchQuestions,
  });
}

class NotebookLMService {
  static String classifyTopicDomain(String topic) {
    final t = topic.toLowerCase();

    if (RegExp(r'આંગણવાડી|તેડાગર|મુખ્ય સેવિકા|વર્કર્સ|anganwadi', caseSensitive: false).hasMatch(t)) {
      return 'anganwadi';
    }
    if (RegExp(r'યોજના|સહાય|સબસિડી|આવાસ|પેન્શન|કિસાન|ખેડૂત સહાય|ગાય સહાય|ટ્રેક્ટર|માનવ ગરિમા|સરસ્વતી સાધના|વ્હાલી દીકરી|કુવરબાઈ|મા અમૃતમ|આયુષ્માન|scheme|yojana', caseSensitive: false).hasMatch(t)) {
      return 'scheme';
    }
    if (RegExp(r'ભરતી|પોલીસ|કોન્સ્ટેબલ|lrd|psi|તલાટી|ક્લાર્ક|બિન સચિવાલય|gsssb|gpsc|ojas|recruitment|vacancy|નોકરી|જાહેરાત|જગ્યાઓ|વનરક્ષક|હાઈકોર્ટ', caseSensitive: false).hasMatch(t)) {
      return 'recruitment';
    }
    if (RegExp(r'પરીક્ષા|સિલેબસ|tet|tat|gseb|બોર્ડ|રીઝલ્ટ|result|પેપર|મોક ટેસ્ટ|કટ-ઓફ|cut-off|syllabus|exam|શિક્ષણ|વિદ્યાર્થી', caseSensitive: false).hasMatch(t)) {
      return 'education';
    }
    if (RegExp(r'ટેકનોલોજી|એઆઈ|ai|chatgpt|કોડિંગ|સોફ્ટવેર|કમ્પ્યુટર|મોબાઈલ|એપ|રોબોટ|ડેટા|સાયબર|technology|python|web|મશીન લર્નિંગ|ક્લાઉડ', caseSensitive: false).hasMatch(t)) {
      return 'technology';
    }
    if (RegExp(r'વેપાર|કમાણી|બિઝનેસ|રૂપિયા|પૈસા|રોકાણ|શેરબજાર|મ્યુચ્યુઅલ ફંડ|જીએસટી|business|earning|finance|startup|money|ઈ-કોમર્સ', caseSensitive: false).hasMatch(t)) {
      return 'business';
    }
    if (RegExp(r'ખેતી|કૃષિ|પાક|ખાતર|સિંચાઈ|બિયારણ|ઓર્ગેનિક|મંડી|એપીએમસી|agriculture|farming|બાગાયત', caseSensitive: false).hasMatch(t)) {
      return 'agriculture';
    }
    if (RegExp(r'વિજ્ઞાન|ઇતિહાસ|ભૂગોળ|બંધારણ|અવકાશ|ઇસરો|isro|સામાન્ય જ્ઞાન|gk|science|history|વારસો|પુરાતત્વ', caseSensitive: false).hasMatch(t)) {
      return 'science_history';
    }
    if (RegExp(r'સમાચાર|ન્યૂઝ|બજેટ|પરિપત્ર|નિયમ|સરકાર|જીઆર|gr|કરંટ અફેર્સ|current affairs|news|જાહેર નોટિસ|ઠરાવ', caseSensitive: false).hasMatch(t)) {
      return 'news_current_affairs';
    }

    return 'general';
  }

  static List<String> deriveResearchQuestions(String topic, String domain) {
    switch (domain) {
      case 'scheme':
        return [
          'આ યોજનાનો મૂળ ઉદ્દેશ્ય શું છે અને કયો સત્તાવાર સરકારી વિભાગ તેનું સંચાલન કરે છે?',
          'લાભાર્થી બનવા માટે પાત્રતાના ચોક્કસ માપદંડો (પાકું આવકમર્યાદા, નિયમો) શું છે?',
          'મળવાપાત્ર સહાયની ચોક્કસ રકમ (INR) અથવા સબસિડીના હપ્તાઓનું સાચું વિભાજન શું છે?',
          'અરજી કરવા માટે કયા સત્તાવાર દસ્તાવેજો (Documents checklist) અનિવાર્ય છે?',
          'ઓનલાઇન પોર્ટલ (Digital Gujarat / e-Samaj Kalyan / iKhedut) પર અરજી કરવાની સ્ટેપ-બાય-સ્ટેપ પદ્ધતિ શું છે?',
          'અરજી નામંજૂર થવાના સામાન્ય કારણો અને ફરિયાદ નિવારણ વ્યવસ્થા શું છે?'
        ];
      case 'recruitment':
        return [
          'ભરતી કરતી સત્તાવાર એજન્સી (GSSSB, GPSC, LRD) અને નોટિફિકેશન જાહેરાત ક્રમાંક શું છે?',
          'કુલ ખાલી જગ્યાઓ, કેટેગરીવાર અનામત અને જગ્યાઓનું સત્તાવાર વિભાજન શું છે?',
          'શૈક્ષણિક લાયકાત અને વયમર્યાદાની કટ-ઓફ તારીખના સત્તાવાર નિયમો શું છે?',
          'પગારધોરણ: ફિક્સ પે અને ત્યારબાદ નિયમિત પે-સ્કેલ અને ભથ્થાંની સચોટ વિગત શું છે?',
          'પરીક્ષા પદ્ધતિ (OMR/CBRT), માઇનસ માર્કિંગ અને સિલેબસ વિશ્લેષણ શું છે?',
          'ઓજસ (OJAS) પોર્ટલ પર ફોર્મ ભરતી વખતે કઈ ભૂલો ટાળવી જોઈએ?'
        ];
      case 'education':
        return [
          'પરીક્ષા આયોજક બોર્ડ અથવા સંસ્થા દ્વારા જાહેર કરાયેલ સત્તાવાર નોટિફિકેશન શું છે?',
          'પ્રશ્નપત્રનું માળખું, કુલ ગુણ, સમયગાળો અને નેગેટિવ માર્કિંગ શું છે?',
          'વિષયવાર અપેક્ષિત ગુણભાર (Topic-wise weightage) શું છે?',
          'પ્રમાણિત પાઠ્યપુસ્તકો (GCERT/NCERT) ના આધારે મુખ્ય સંદર્ભો શું છે?'
        ];
      case 'technology':
        return [
          'આ ટેકનોલોજીની મૂળભૂત વ્યાખ્યા અને ૨૦૨૬ માં તેનો વાસ્તવિક ઉપયોગ શું છે?',
          'તે કઈ ચોક્કસ સમસ્યા હલ કરે છે અને કાર્યક્ષમતામાં કેટલો વધારો કરે છે?',
          'સિસ્ટમ આર્કિટેક્ચર અને આંતરિક કાર્યપ્રણાલી કેવી રીતે કામ કરે છે?',
          'પ્રાયોગિક ફીચર્સ, મર્યાદાઓ અને શરૂઆત કરવા માટેનો સ્ટેપ-બાય-સ્ટેપ રોડમેપ શું છે?'
        ];
      case 'business':
        return [
          'આ બિઝનેસ મોડલની બજાર માંગ અને લક્ષિત ગ્રાહકો કોણ છે?',
          'આવક કેવી રીતે જનરેટ થાય છે (Unit Economics & Revenue Streams)?',
          'શરૂ કરવા માટે જરૂરી મૂડી, કાનૂની મંજૂરીઓ અને ખર્ચ વિભાજન શું છે?',
          'પ્રથમ ૩૦ દિવસમાં વ્યવસાય સ્થાપિત કરવા માટેનો એક્શન પ્લાન શું છે?'
        ];
      default:
        return [
          'આ વિષયનો મુખ્ય હેતુ, મહત્વ અને દર્શકો માટે પ્રાસંગિકતા શું છે?',
          'વિષયની મુખ્ય સંકલ્પનાઓ, વ્યાખ્યાઓ અને પાયાની હકીકતો શું છે?',
          'સત્તાવાર સ્ત્રોતો આધારિત મુખ્ય તારણો અને આગળનું પગલું શું છે?'
        ];
    }
  }

  static List<SlideItem> deriveSlideOutline(String topic, String domain) {
    switch (domain) {
      case 'scheme':
        return [
          SlideItem(
            id: 1,
            title: '$topic: સત્તાવાર માર્ગદર્શિકા',
            subtitle: 'શુદ્ધ સફેદ બેકગ્રાઉન્ડ • સત્તાવાર પરિપત્ર ફોટો',
            bulletPoints: [
              'ગુજરાત સરકાર દ્વારા જાહેર કરાયેલ યોજના',
              'કોને મળશે લાભ: લક્ષિત લાભાર્થીઓ',
              'સત્તાવાર પોર્ટલ અને નિયમો મુજબ સંપૂર્ણ સત્ય'
            ],
            audioTime: '0:00 - 1:15',
            accentColor: '#102A56',
          ),
          SlideItem(
            id: 2,
            title: 'પાત્રતાના સત્તાવાર માપદંડો',
            subtitle: 'લાભાર્થી નાગરિકોનો વાસ્તવિક ફોટો',
            bulletPoints: [
              'વાર્ષિક આવકમર્યાદા અને ગ્રામ્ય/શહેરી નિયમો',
              'ઉંમર અને કેટેગરી મુજબ મળવાપાત્ર છૂટછાટ',
              'પરિવાર દીઠ લાભાર્થીઓની મર્યાદા'
            ],
            audioTime: '1:15 - 2:45',
            accentColor: '#D71920',
          ),
          SlideItem(
            id: 3,
            title: 'મળવાપાત્ર સહાય & નાણાકીય લાભ',
            subtitle: 'નાણાં વિભાગના અસલી ઠરાવનો ફોટો',
            bulletPoints: [
              'કુલ સહાય રકમ અને સરકારી સબસિડીનું પ્રમાણ',
              'હપ્તાવイズ સહાય ચૂકવણી અને DBT ટ્રાન્સફર',
              'બેંક ખાતા સાથે આધાર લિંકેજ અનિવાર્ય'
            ],
            audioTime: '2:45 - 4:15',
            accentColor: '#102A56',
          ),
          SlideItem(
            id: 4,
            title: 'જરૂરી દસ્તાવેજોનું ચેકલિસ્ટ',
            subtitle: 'સરકારી પ્રમાણપત્રોનું ક્લીન ટેબલ',
            bulletPoints: [
              'આધાર કાર્ડ, રેશન કાર્ડ અને રહેઠાણ પુરાવો',
              'મામલતદાર/TDO નો આવકનો દાખલો',
              'બેંક પાસબુક નકલ અને પાસપોર્ટ ફોટો'
            ],
            audioTime: '4:15 - 5:45',
            accentColor: '#1D4ED8',
          ),
          SlideItem(
            id: 5,
            title: 'ઓનલાઇન અરજી & સ્ટેપ-બાય-સ્ટેપ ગાઇડ',
            subtitle: 'સત્તાવાર પોર્ટલ સ્ક્રીનશોટ અને ફ્લોચાર્ટ',
            bulletPoints: [
              'સત્તાવાર પોર્ટલ પર નવું રજીસ્ટ્રેશન',
              'ફોર્મમાં સાચી વિગતો ભરી દસ્તાવેજ અપલોડ',
              'કન્ફર્મેશન નંબર મેળવી અરજી સબમિટ'
            ],
            audioTime: '5:45 - 7:15',
            accentColor: '#102A56',
          ),
          SlideItem(
            id: 6,
            title: 'મુખ્ય તારણો & Gyan Yatra App',
            subtitle: 'સત્તાવાર લિંક્સ અને પીડીએફ ગાઇડ',
            bulletPoints: [
              'સત્તાવાર સરકારી પોર્ટલ પરથી જ અરજી કરવી',
              'કોઈપણ અફવાઓથી દૂર રહેવું',
              'Gyan Yatra App પરથી ફ્રી PDF મેળવો'
            ],
            audioTime: '7:15 - 8:30',
            accentColor: '#D71920',
          ),
        ];

      case 'recruitment':
        return [
          SlideItem(
            id: 1,
            title: '$topic: સત્તાવાર જાહેરાત',
            subtitle: 'ભરતી બોર્ડ સીલ • શુદ્ધ સફેદ બેકગ્રાઉન્ડ',
            bulletPoints: [
              'ભરતી બોર્ડ દ્વારા જાહેર નોટિફિકેશન ક્રમાંક',
              'કુલ ખાલી જગ્યાઓ અને અગત્યની તારીખો',
              'સત્તાવાર ગેઝેટ મુજબ વિગતવાર માહિતી'
            ],
            audioTime: '0:00 - 1:15',
            accentColor: '#102A56',
          ),
          SlideItem(
            id: 2,
            title: 'જગ્યાઓની વિગત & અનામત રોસ્ટર',
            subtitle: 'સત્તાવાર ગેઝેટનું ક્લીન ડેટા ટેબલ',
            bulletPoints: [
              'જનરલ, EWS, OBC/SEBC, SC, ST વિભાજન',
              'મહિલાઓ માટે ૩૩% અનામત અને માજી સૈનિક ક્વોટા',
              'જિલ્લાવાર ખાલી જગ્યાઓનું પ્રમાણ'
            ],
            audioTime: '1:15 - 2:45',
            accentColor: '#D71920',
          ),
          SlideItem(
            id: 3,
            title: 'શૈક્ષણિક લાયકાત & વયમર્યાદા',
            subtitle: 'માન્ય ડિગ્રી સર્ટિફિકેટ્સનો વાસ્તવિક ફોટો',
            bulletPoints: [
              'માન્ય યુનિવર્સિટીમાંથી સ્નાતક/સમકક્ષ ડિગ્રી',
              'કમ્પ્યુટર CCC સર્ટિફિકેટ નિયમ',
              'લઘુત્તમ-મહત્તમ વય અને છૂટછાટ નિયમો'
            ],
            audioTime: '2:45 - 4:15',
            accentColor: '#102A56',
          ),
          SlideItem(
            id: 4,
            title: 'પરીક્ષા પદ્ધતિ & સિલેબસ ગુણભાર',
            subtitle: 'વાસ્તવિક OMR શીટ અને સિલેબસ ચાર્ટ',
            bulletPoints: [
              'પ્રશ્નપત્રનું માળખું અને નેગેટિવ માર્કિંગ',
              'સામાન્ય જ્ઞાન, ગુજરાતી વ્યાકરણ અને ગણિત',
              'ક્વોલિફાઇંગ સ્કોર અને મેરિટ નિયમ'
            ],
            audioTime: '4:15 - 6:00',
            accentColor: '#1D4ED8',
          ),
          SlideItem(
            id: 5,
            title: 'OJAS ઓનલાઇન ફોર્મ & તૈયારી રણનીતિ',
            subtitle: 'OJAS પોર્ટલ સ્ક્રીનશોટ અને મોક ટેસ્ટ',
            bulletPoints: [
              'OJAS પર છેલ્લી તારીખ પહેલાં અરજી કરવી',
              'જરૂરી કાગળો તૈયાર રાખવા',
              'Gyan Yatra App પર મોક ટેસ્ટ આપો'
            ],
            audioTime: '6:00 - 8:00',
            accentColor: '#D71920',
          ),
        ];

      case 'technology':
      case 'business':
        return [
          SlideItem(
            id: 1,
            title: '$topic: સંપૂર્ણ વિશ્લેષણ ૨૦૨૬',
            subtitle: 'આધુનિક વર્કસ્ટેશન ફોટો • શુદ્ધ સફેદ બેકગ્રાઉન્ડ',
            bulletPoints: [
              '૨૦૨૬ માં આ વિષયનું વાસ્તવિક મહત્વ',
              'બજારમાં તકો અને કાર્યક્ષમતા વધારો',
              'વ્યવહારુ અને પુરાવા આધારિત વિશ્લેષણ'
            ],
            audioTime: '0:00 - 1:30',
            accentColor: '#102A56',
          ),
          SlideItem(
            id: 2,
            title: 'કાર્યપ્રણાલી & મૂળભૂત સિદ્ધાંતો',
            subtitle: 'ક્લીન આર્કિટેક્ચર / સિસ્ટમ ફ્લોચાર્ટ',
            bulletPoints: [
              'સિસ્ટમ કેવી રીતે અંદરથી કામ કરે છે',
              'મૂળભૂત ઇનપુટ, પ્રોસેસ અને આઉટપુટ મોડેલ',
              'પરંપરાગત રીતો કરતાં મુખ્ય તફાવત'
            ],
            audioTime: '1:30 - 3:30',
            accentColor: '#1D4ED8',
          ),
          SlideItem(
            id: 3,
            title: 'વાસ્તવિક ઉપયોગિતા & કેસ સ્ટડી',
            subtitle: 'વાસ્તવિક કાર્યસ્થળનો અસલી ફોટો',
            bulletPoints: [
              'ક્રિએટર્સ, પ્રોફેશનલ્સ અને વ્યવસાયો માટે લાભ',
              'સમય અને નાણાં બચાવવાના સાબિત ઉદાહરણો',
              'સાધનો અને ટૂલ્સની તુલના'
            ],
            audioTime: '3:30 - 5:30',
            accentColor: '#102A56',
          ),
          SlideItem(
            id: 4,
            title: 'સ્ટેપ-બાય-સ્ટેપ રોડમેપ & નિષ્કર્ષ',
            subtitle: 'એક્શન પ્લાન ટેબલ અને સંસાધનો',
            bulletPoints: [
              'પ્રથમ ૩૦ દિવસમાં શરૂઆત કરવાની રીત',
              'મર્યાદાઓ અને સાવચેતીની બાબતો',
              'Gyan Yatra ચેનલ સબ્સ્ક્રાઇબ કરો'
            ],
            audioTime: '5:30 - 7:30',
            accentColor: '#D71920',
          ),
        ];

      default:
        return [
          SlideItem(
            id: 1,
            title: '$topic: સંપૂર્ણ વિશ્લેષણ',
            subtitle: 'શુદ્ધ સફેદ બેકગ્રાઉન્ડ • પ્રમાણિત સ્ત્રોત',
            bulletPoints: [
              'વિષયની મુખ્ય પૃષ્ઠભૂમિ અને પ્રસ્તુતતા',
              'દર્શકો માટે શીખવા જેવી મહત્વની બાબતો',
              'અધિકૃત સ્ત્રોતો આધારિત રજૂઆત'
            ],
            audioTime: '0:00 - 1:30',
            accentColor: '#102A56',
          ),
          SlideItem(
            id: 2,
            title: 'પાયાની સંકલ્પનાઓ & નિયમો',
            subtitle: 'વાસ્તવિક દસ્તાવેજ ફોટો અને ડેટા ટેબલ',
            bulletPoints: [
              'વિષયના મુખ્ય સ્તંભો અને નિયમો',
              'સાબિત થયેલી હકીકતો અને પુરાવા',
              'ગેરસમજણો સામે સાચો ખુલાસો'
            ],
            audioTime: '1:30 - 4:00',
            accentColor: '#102A56',
          ),
          SlideItem(
            id: 3,
            title: 'મુખ્ય તારણો & Gyan Yatra સારાંશ',
            subtitle: 'સત્તાવાર પોર્ટલ લિંક્સ અને માર્ગદર્શન',
            bulletPoints: [
              'આજના વિષયના મુખ્ય સારાંશ મુદ્દાઓ',
              'પ્રમાણિત સંદર્ભો અને સ્ત્રોતો',
              'વિડીયો લાઇક કરો અને સબ્સ્ક્રાઇબ કરો'
            ],
            audioTime: '4:00 - 6:00',
            accentColor: '#D71920',
          ),
        ];
    }
  }

  static NotebookLMPromptResult generateLocalPrompt({
    required String topic,
    String templateId = 'white-real',
    String tool = 'notebooklm-slides',
    String slideCount = '8-10',
    String audience = 'job-seekers',
    bool includeBranding = true,
  }) {
    final rawTopic = topic.trim().isNotEmpty ? topic.trim() : 'ગુજરાત સરકાર નવી કિસાન સહાય યોજના ૨૦૨૬';
    final domain = classifyTopicDomain(rawTopic);
    final researchQuestions = deriveResearchQuestions(rawTopic, domain);
    final previewSlides = deriveSlideOutline(rawTopic, domain);

    final questionsText = researchQuestions.asMap().entries.map((e) => '   ${e.key + 1}. ${e.value}').join('\n');

    final outlineText = previewSlides.asMap().entries.map((entry) {
      final s = entry.value;
      final points = s.bulletPoints.map((p) => '      • $p').join('\n');
      return '''   [સ્લાઇડ ${entry.key + 1}]
   • સ્લાઇડ શીર્ષક (Slide Title): "${s.title}"
   • સ્ક્રીન પર વાસ્તવિક વિઝ્યુઅલ (Visual): ${s.subtitle}
   • મુખ્ય મુદ્દાઓ (Key Points):
$points
   • ઓડિયો ટાઇમિંગ: ${s.audioTime}''';
    }).join('\n\n');

    // Tool 1: NotebookLM Content & Source Generator Prompt
    final contentSourcePrompt = '''તમે એક વરિષ્ઠ સંશોધન વિશ્લેષક (Senior Research Analyst), સરકારી પરિપત્ર દસ્તાવેજ તજજ્ઞ (Official Government Document Archivist) અને શૈક્ષણિક કન્ટેન્ટ નિષ્ણાત છો.
ગૂગલ નોટબુકએલએમ (Google NotebookLM) માં "Sources" તરીકે ઉમેરવા માટે નીચે દર્શાવેલા વિષય પર સંપૂર્ણ, અધિકૃત, ઊંડાણપૂર્વક સંશોધન કરેલું અને પુરાવા આધારિત સોર્સ કન્ટેન્ટ ડૉક્યુમેન્ટ (Authoritative Research Knowledge Base) તૈયાર કરો.

🎯 સંશોધન વિષય (RESEARCH TOPIC): "$rawTopic"
📂 વિષય ક્ષેત્ર (DOMAIN): ${domain.toUpperCase()}
👥 લક્ષિત દર્શકો (AUDIENCE): ગુજરાતના ગંભીર સ્પર્ધાત્મક પરીક્ષાર્થીઓ અને નાગરિકો

================================================================================
📋 આ સોર્સ ડૉક્યુમેન્ટમાં નીચેના ૭ મુખ્ય વિભાગો સંપૂર્ણ અને વિગતવાર લખો:
================================================================================
૧. સત્તાવાર સંદર્ભ & પરિપત્ર વિગત (Official Circular/GR Number & Date)
૨. પાત્રતા અને માપદંડ કોષ્ટક (Eligibility Matrix: Age, Income, Degree)
૩. નાણાકીય સહાય / પગારધોરણનું ચોક્કસ ટેબલ (Financial Aid / Pay Scale Table)
૪. અનિવાર્ય દસ્તાવેજોનું ચેકલિસ્ટ (Checklist of verified documents)
૫. સ્ટેપ-બાય-સ્ટેપ ઓનલાઇન અરજી પ્રક્રિયા (Step-by-Step Portal Guide)
૬. સંભવિત ભૂલો, રિજેક્શનના કારણો & ફરિયાદ નિવારણ (Helpline)
૭. NOTEBOOKLM AUDIO OVERVIEW — ડીપ ડાઇવ પોડકાસ્ટ સંવાદ (Host 1 & Host 2 Discussion)

કાયદાકીય નિયમ: STRICT ZERO FABRICATION - કોઈ અપ્રમાણિત દાવા કે કાલ્પનિક પગાર વધારા લખવા નહીં!

હવે ઉપરોક્ત તમામ માળખા મુજબ સંપૂર્ણ, વિગતવાર ગુજરાતી સોર્સ કન્ટેન્ટ ડૉક્યુમેન્ટ લખો:''';

    // Tool 2: Master NotebookLM 16:9 White PPT Prompt with Best Real Photos
    final pptDeckPrompt = '''તમે એક વરિષ્ઠ સંશોધક (Senior Research Specialist), શૈક્ષણિક પ્રસ્તુતિ ડિઝાઇનર (Educational Presentation Designer) અને Google NotebookLM એક્સપર્ટ છો.
મારી YouTube ચેનલ "Gyan Yatra" માટે Google NotebookLM ના "Slide Deck" ફીચર દ્વારા "$rawTopic" વિષય પર શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF), બોલ્ડ હેડિંગ બોક્સ, શ્રેષ્ઠ અસલી ફોટોગ્રાફ્સ (BEST REAL PHOTOS) અને અધિકૃત વાસ્તવિક પુરાવાઓ સાથે સંપૂર્ણ સ્લાઇડ પ્રેઝન્ટેશન તૈયાર કરવા માટે નીચે મુજબનું કડક માળખું અનુસરો:

================================================================================
🎯 વિષય (TOPIC): "$rawTopic"
📂 વિષય ક્ષેત્ર (DOMAIN): ${domain.toUpperCase()}
👥 લક્ષિત દર્શકો (TARGET AUDIENCE): ગુજરાતના ગંભીર સ્પર્ધાત્મક પરીક્ષાર્થીઓ અને નાગરિકો
⏱️ સ્લાઇડ્સની સંખ્યા (SLIDE COUNT): $slideCount સ્લાઇડ્સ
${includeBranding ? '🏷️ બ્રાન્ડિંગ: Gyan Yatra Channel અને "Gyan Yatra App" (સ્લાઇડ ૧ અને અંતિમ સ્લાઇડમાં)' : ''}
================================================================================

================================================================================
SECTION A: ઊંડું સંશોધન માર્ગદર્શિકા (DEEP RESEARCH INSTRUCTIONS)
================================================================================
૧. સ્લાઇડ્સ બનાવતા પહેલા આ નોટબુકમાં ઉપલબ્ધ તમામ સત્તાવાર સ્ત્રોતો, પીડીએફ અને દસ્તાવેજોનું ઊંડાણપૂર્વક વિશ્લેષણ કરો.
૨. નીચે દર્શાવેલા મુખ્ય સંશોધન પ્રશ્નોના ચોક્કસ જવાબો સ્ત્રોતોમાંથી શોધી કાઢો:
$questionsText
૩. ફક્ત સત્તાવાર પોર્ટલ (.gov.in, .gujarat.gov.in, ojas, gseb, pib) અને અધિકૃત સંસ્થાઓના સ્ત્રોતોનો જ સંદર્ભ લો.
૪. પ્રકાશન તારીખો, પરિપત્ર અમલની તારીખો અને વર્તમાન સ્થિતિની કાળજીપૂર્વક ચકાસણી કરો.
૫. જો કોઈ વિગત નોટબુકના સ્ત્રોતોમાં ના મળે, તો અંદાજ લગાવ્યા વિના સંશોધન તંગી (Research Gap) સ્પષ્ટ જણાવો.

================================================================================
SECTION B: સ્ત્રોત ગુણવત્તા & ફેક્ટ-ચેકિંગ કડક નિયમો (SOURCE CONTROL & ACCURACY)
================================================================================
૧. STRICT ZERO FABRICATION: કોઈ પણ ખોટા, અપ્રમાણિત કે અનુમાનિત આંકડા, પગાર વધારા, તારીખો, પરિપત્રો કે ખાલી જગ્યાઓ ઉમેરવી નહીં.
૨. સત્તાવાર ગેઝેટ, નોટિફિકેશન નંબર અથવા GR ને જ માન્ય રાખવો.
૩. સાબિત થયેલ હકીકત [Confirmed] અને અંદાજ વચ્ચે સ્પષ્ટ ભેદરેખા રાખવી.
૪. દરેક મહત્વપૂર્ણ દાવા માટે સત્તાવાર સ્ત્રોતનું નામ અથવા પોર્ટલ રેફરન્સ દર્શાવવો.

================================================================================
SECTION C: વિષય-અનુકૂળ સ્લાઇડ આઉટલાઇન (TOPIC-SPECIFIC SLIDE OUTLINE)
================================================================================
આ વિષય "$rawTopic" ના આધારે નીચે મુજબનું સુયોજિત સ્લાઇડ માળખું તૈયાર કરો:

$outlineText

================================================================================
SECTION D: ફિક્સ્ડ વિઝ્યુઅલ ડિઝાઇન — શુદ્ધ સફેદ બેકગ્રાઉન્ડ (CLEAN WHITE VISUAL DESIGN)
================================================================================
૧. BACKGROUND: ફક્ત અને ફક્ત ૧૦૦% શુદ્ધ સફેદ (#FFFFFF) બેકગ્રાઉન્ડ રાખવું.
૨. HEADINGS: ઘેરો નેવી બ્લૂ (#0F172A અથવા #102A56) કલર, બોલ્ડ અક્ષરોમાં સાદા, સ્વચ્છ લંબચોરસ હેડિંગ બોક્સ (Simple Rectangular Box) માં મૂકવું.
૩. BODY TEXT: જેટ બ્લેક (#111111) અથવા ડાર્ક સ્લેટ (#334155), સ્પષ્ટ ફોન્ટ સાઇઝ.
૪. ACCENTS: હેડિંગ બોક્સ બોર્ડર માટે સંયમિત ડાર્ક રેડ (#B91C1C / #D71920) અથવા રોયલ બ્લૂ (#1D4ED8).
૫. STRICT NEGATIVES:
   ❌ STRICTLY NO DARK SLIDES: આખી સ્લાઇડમાં કાળો કે ડાર્ક બેકગ્રાઉન્ડ રાખવું નહીં!
   ❌ STRICTLY NO NEON: કોઈ પણ પ્રકારના નિયોન કલર્સ વાપરવા નહીં!
   ❌ STRICTLY NO GAMING/CYBER ART: કોઈ સાય-ફાઇ ગ્લો કે ગેમિંગ ગ્રાફિક્સ વાપરવા નહીં!
   ❌ STRICTLY NO FLASHY CORPORATE: ગંભીર શૈક્ષણિક પ્રસ્તુતિ જેવો દેખાવ હોવો જોઈએ.

================================================================================
SECTION E: વાસ્તવિક અસલી ફોટોગ્રાફ્સ (AUTHENTIC REAL-WORLD PHOTOGRAPHS)
================================================================================
૧. REAL PHOTOS ONLY: કાલ્પનિક 3D કાર્ટૂન કે એઆઈ ઈલસ્ટ્રેશન નહીં, પરંતુ શ્રેષ્ઠ વાસ્તવિક અસલી ફોટોગ્રાફ્સ (BEST REAL PHOTOS) સૂચવવા:
   - સરકારી નિર્ણય/કર્મચારી: ગુજરાતના મુખ્યમંત્રી ભૂપેન્દ્ર પટેલ સત્તાવાર પ્રેસ બ્રીફિંગ પોડિયમ પર અથવા ગાંધીનગર સચિવાલય પરિસર.
   - કિસાન યોજના: લીલાછમ ખેતરમાં ડ્રીપ ઇરીગેશન સાથે મહેનતુ ગુજરાતી ખેડૂતનો વાસ્તવિક અસલી ફોટો.
   - આંગણવાડી & મહિલા: સ્વચ્છ સાડી યુનિફોર્મમાં આંગણવાડી કાર્યકર બહેન બાળકોને પોષક આહાર આપતી વખતે.
   - પોલીસ & સંરક્ષણ: કડક ઇસ્ત્રી કરેલા ખાખી યુનિફોર્મ અને બેરેટ કેપ સાથે ગુજરાત પોલીસ કોન્સ્ટેબલ.
   - દસ્તાવેજ: અશોક સ્તંભ મોહર, લાલ સીલ અને સહી સાથેનો ગુજરાત સરકારનો અસલી પરિપત્ર (GR Notification).
   - પોર્ટલ: OJAS, iKhedut, Digital Gujarat પોર્ટલના અસલી સ્ક્રીનશોટ્સ.
૨. GUJARAT CONTEXT: સચિવાલય (ગાંધીનગર), સરકારી પરિપત્ર દસ્તાવેજ, વાસ્તવિક વર્ગખંડ અને સાચા ઉમેદવારો/લાભાર્થીઓ.
૩. જટિલ આંકડાઓ માટે સ્વચ્છ વ્હાઇટ ડેટા ટેબલ (Clean Tables) અથવા ટાઈમલાઈન વાપરવી.
૪. ❌ STRICTLY NO 3D CARTOON, NO ANIME, NO FAKE PLASTIC AI HUMANS, NO NEON.

================================================================================
SECTION F: સ્લાઇડ-બાય-સ્લાઇડ કન્ટેન્ટ & લેઆઉટ વિગત (SLIDE-BY-SLIDE CONTENT)
================================================================================
દરેક સ્લાઇડ માટે ૧ સ્પષ્ટ શીર્ષક સાદા બોક્સમાં, ૨ થી ૪ સંક્ષિપ્ત બુલેટ પોઇન્ટ્સ, ૧ વાસ્તવિક અસલી ફોટોગ્રાફ વિગત (Best Real Photo) અને સ્પીકર નોટ્સ આપવી.

================================================================================
SECTION G: ભાષા & શૈલી (LANGUAGE & AUDIENCE TONE)
================================================================================
૧. શુદ્ધ, કુદરતી અને વ્યાકરણબદ્ધ ગુજરાતી ભાષા.
૨. સરકારી અને શૈક્ષણિક પરિભાષાઓની સચોટ જાળવણી.
૩. અનુભવી શિક્ષક ક્લાસરૂમમાં સમજાવતા હોય તેવી પ્રભાવશાળી શૈલી.

================================================================================
SECTION H: અંતિમ ગુણવત્તા ચકાસણી (QUALITY CONTROL)
================================================================================
૧. કોઈ પણ સ્લાઇડમાં ડમી ટેક્સ્ટ (Lorem ipsum) રાખવું નહીં.
૨. સફેદ બેકગ્રાઉન્ડ પર કોન્ટ્રાસ્ટ ૧૦૦% સ્પષ્ટ વંચાય તે સુનિશ્ચિત કરવું.

================================================================================
SECTION I: NOTEBOOKLM સ્લાઇડ ડેક જનરેશન આદેશ (FINAL GENERATION COMMAND)
================================================================================
હવે ઉપરોક્ત તમામ નિયમો, ઊંડા સંશોધન પ્રશ્નો, સત્તાવાર સ્ત્રોત નિયંત્રણ અને ૧૦૦% શુદ્ધ સફેદ બેકગ્રાઉન્ડ માળખાના આધારે આ નોટબુકમાં જોડાયેલા સ્ત્રોતોમાંથી સ્લાઇડ ડેક (Slide Deck) તૈયાર કરો.''';

    final promptText = pptDeckPrompt;

    final scriptPromptText = '''તમે એક વરિષ્ઠ શિક્ષણવિદ્, સ્પર્ધાત્મક પરીક્ષા ફેકલ્ટી અને YouTube એજ્યુકેટર છો.
મારી YouTube ચેનલ "Gyan Yatra" માટે નીચે દર્શાવેલી મારી સ્લાઇડ્સના આધારે દરેક સ્લાઇડ મુજબ શબ્દશઃ (Word-for-Word) બોલવાની સંપૂર્ણ ગુજરાતી સ્ક્રિપ્ટ લખો:

વિષય: "$rawTopic"
વિઝ્યુઅલ નિયમ: શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF), અસલી સરકારી પરિપત્ર (STRICTLY NO NEON).

સ્લાઇડ્સ:
${previewSlides.asMap().entries.map((e) => 'સ્લાઇડ ${e.key + 1}: ${e.value.title} - ${e.value.subtitle}').join('\n')}

હવે સંપૂર્ણ સ્ક્રિપ્ટ ગુજરાતીમાં લખો:''';

    return NotebookLMPromptResult(
      success: true,
      topic: rawTopic,
      domain: domain,
      contentSourcePrompt: contentSourcePrompt,
      pptDeckPrompt: pptDeckPrompt,
      promptText: promptText,
      scriptPromptText: scriptPromptText,
      previewSlides: previewSlides,
      researchQuestions: researchQuestions,
    );
  }

  static Future<NotebookLMPromptResult> fetchOrGenerate({
    required String serverUrl,
    required String topic,
    String templateId = 'white-real',
    String tool = 'notebooklm-slides',
    String slideCount = '8-10',
    String audience = 'job-seekers',
    bool includeBranding = true,
  }) async {
    try {
      final uri = Uri.parse('$serverUrl/api/research/notebooklm-prompt');
      final res = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'topic': topic,
          'templateId': templateId,
          'tool': tool,
          'slideCount': slideCount,
          'audience': audience,
          'includeBranding': includeBranding,
        }),
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final rawSlides = (data['previewSlides'] as List? ?? []);
        final slides = rawSlides.asMap().entries.map((entry) {
          final m = entry.value as Map<String, dynamic>;
          final points = (m['points'] as List? ?? []).map((p) => p.toString()).toList();
          return SlideItem(
            id: entry.key + 1,
            title: m['title']?.toString() ?? 'સ્લાઇડ શીર્ષક',
            subtitle: m['visual']?.toString() ?? 'વાસ્તવિક ફોટો',
            bulletPoints: points,
            audioTime: '${entry.key * 2}:00 - ${(entry.key + 1) * 2}:00',
            accentColor: '#102A56',
          );
        }).toList();

        final qList = (data['researchQuestions'] as List? ?? []).map((q) => q.toString()).toList();

        final pptPrompt = data['pptDeckPrompt']?.toString() ?? data['promptText']?.toString() ?? '';
        final contentPrompt = data['contentSourcePrompt']?.toString() ?? data['scriptPromptText']?.toString() ?? '';

        return NotebookLMPromptResult(
          success: true,
          topic: data['topic']?.toString() ?? topic,
          domain: data['domain']?.toString() ?? 'general',
          contentSourcePrompt: contentPrompt,
          pptDeckPrompt: pptPrompt,
          promptText: pptPrompt,
          scriptPromptText: data['scriptPromptText']?.toString() ?? '',
          previewSlides: slides.isNotEmpty ? slides : deriveSlideOutline(topic, 'general'),
          researchQuestions: qList,
        );
      }
    } catch (_) {
      // Fallback locally
    }

    return generateLocalPrompt(
      topic: topic,
      templateId: templateId,
      tool: tool,
      slideCount: slideCount,
      audience: audience,
      includeBranding: includeBranding,
    );
  }
}
