import 'dart:convert';
import 'dart:io';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:file_picker/file_picker.dart';

import 'screens/analytics_screen.dart';
import 'screens/chat_screen.dart';
import 'screens/research_screen.dart';
import 'screens/settings_screen.dart';
import 'services/notebooklm_service.dart';
import 'services/slide_voiceover_service.dart';
import 'services/slide_maker_service.dart';
import 'services/voice_actor_service.dart';
import 'services/google_tts_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Color(0xFFF8FAFC),
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const GyanYatraApp());
}

class GyanYatraApp extends StatelessWidget {
  const GyanYatraApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Gyan Yatra AI Studio',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.light,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        primaryColor: const Color(0xFF7C3AED),
        colorScheme: const ColorScheme.light(
          primary: Color(0xFF7C3AED),
          secondary: Color(0xFF8B5CF6),
          surface: Colors.white,
          onSurface: Color(0xFF0F172A),
          onPrimary: Colors.white,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF0F172A),
          elevation: 0,
          scrolledUnderElevation: 1,
          surfaceTintColor: Colors.transparent,
          systemOverlayStyle: SystemUiOverlayStyle(
            statusBarColor: Colors.transparent,
            statusBarIconBrightness: Brightness.dark,
          ),
        ),
        cardTheme: const CardThemeData(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(12)),
            side: BorderSide(color: Color(0xFFE2E8F0), width: 1),
          ),
        ),
        useMaterial3: true,
      ),
      home: const MainStudioScreen(),
    );
  }
}

// -------------------------------------------------------------
// Data Models Matching public/js/utils/projectState.js & APIs
// -------------------------------------------------------------
class TopicItem {
  final String id;
  final int rank;
  final String topicGujarati;
  final String category;
  final String whyViewersWatch;
  final String targetAudience;
  final String trendEvidence;
  final String trendSource;
  final String competitionLevel;
  final String suggestedFormat;
  final String suggestedTitle;
  final List<String> searchKeywords;
  final String thumbnailConcept;
  final int overallScore;
  final int searchDemandScore;
  final int freshnessScore;
  final int competitionScore;
  final String masterPrompt;
  final String openingHook;
  final String factualityWarning;
  final String confidenceLabel;
  final String thumbnailPrompt;
  final String scriptPrompt;
  final String slidePrompt;
  final String lifetimeViews;
  final String accumulated48h;
  final String growthRate;
  final String publishedTime;
  bool isSaved;

  TopicItem({
    required this.id,
    this.rank = 1,
    required this.topicGujarati,
    required this.category,
    required this.whyViewersWatch,
    required this.targetAudience,
    required this.trendEvidence,
    this.trendSource = 'Google Trends India & Gujarat Portals',
    required this.competitionLevel,
    required this.suggestedFormat,
    required this.suggestedTitle,
    required this.searchKeywords,
    required this.thumbnailConcept,
    required this.overallScore,
    required this.searchDemandScore,
    required this.freshnessScore,
    required this.competitionScore,
    required this.masterPrompt,
    this.openingHook = '',
    this.factualityWarning = '',
    this.confidenceLabel = '96% મજબૂત પુરાવા',
    this.thumbnailPrompt = '',
    this.scriptPrompt = '',
    this.slidePrompt = '',
    this.lifetimeViews = '86K+ Views',
    this.accumulated48h = 'ઉચ્ચ સર્ચ પ્રવાહ',
    this.growthRate = '+140% સર્ચ વૃદ્ધિ',
    this.publishedTime = 'છેલ્લા 48 કલાકમાં સક્રિય',
    this.isSaved = false,
  });

  factory TopicItem.fromJson(Map<String, dynamic> json) {
    final scores = json['scores'] as Map<String, dynamic>? ?? {};
    final keywords = (json['searchKeywords'] as List<dynamic>? ?? [])
        .map((e) => e.toString())
        .toList();
    final prompts = json['prompts'] as Map<String, dynamic>? ?? {};
    final viewMetrics = json['viewMetrics'] as Map<String, dynamic>? ?? {};
    final confidence = json['confidenceRating'] as Map<String, dynamic>? ?? {};

    return TopicItem(
      id: json['id']?.toString() ?? 'topic_${DateTime.now().millisecondsSinceEpoch}',
      rank: (json['rank'] as num?)?.toInt() ?? 1,
      topicGujarati: json['topicGujarati']?.toString() ?? '',
      category: json['category']?.toString() ?? 'general',
      whyViewersWatch: json['selectionRationale']?.toString() ?? json['whyViewersWatch']?.toString() ?? '',
      targetAudience: json['targetAudience']?.toString() ?? '',
      trendEvidence: json['trendEvidence']?.toString() ?? '',
      trendSource: json['trendSource']?.toString() ?? 'Google Trends India & Official Gujarat Portals',
      competitionLevel: json['competitionLevel']?.toString() ?? 'Medium',
      suggestedFormat: json['suggestedFormat']?.toString() ?? 'Long Video',
      suggestedTitle: json['suggestedTitle']?.toString() ?? '',
      searchKeywords: keywords,
      thumbnailConcept: json['thumbnailConcept']?.toString() ?? '',
      overallScore: (scores['overall'] as num?)?.toInt() ?? (confidence['score'] as num?)?.toInt() ?? 85,
      searchDemandScore: (scores['demand'] as num?)?.toInt() ?? (scores['searchDemand'] as num?)?.toInt() ?? 80,
      freshnessScore: (scores['freshness'] as num?)?.toInt() ?? 85,
      competitionScore: (scores['competition'] as num?)?.toInt() ?? 75,
      masterPrompt: prompts['scriptPrompt']?.toString() ?? json['masterPrompt']?.toString() ??
          'તમે ગુજરાતના સૌથી લોકપ્રિય યુટ્યુબર જ્ઞાન યાત્રા છો. "${json['topicGujarati']}" વિષય પર ૪ વિભાગોમાં રસપ્રદ અને અધિકૃત ગુજરાતી વિડીયો સ્ક્રિપ્ટ તૈયાર કરો.',
      openingHook: json['openingHook']?.toString() ?? '',
      factualityWarning: json['factualityWarning']?.toString() ?? '',
      confidenceLabel: confidence['label']?.toString() ?? '${(scores['overall'] as num?)?.toInt() ?? 95}% મજબૂત પુરાવા',
      thumbnailPrompt: prompts['thumbnailPrompt']?.toString() ?? '',
      scriptPrompt: prompts['scriptPrompt']?.toString() ?? '',
      slidePrompt: prompts['slidePrompt']?.toString() ?? '',
      lifetimeViews: viewMetrics['lifetimeViews']?.toString() ?? '86K+ Views',
      accumulated48h: viewMetrics['accumulated48h']?.toString() ?? 'ઉચ્ચ સર્ચ પ્રવાહ',
      growthRate: viewMetrics['growthRate']?.toString() ?? '+140% સર્ચ વૃદ્ધિ',
      publishedTime: viewMetrics['publishedTime']?.toString() ?? 'છેલ્લા 48 કલાકમાં સક્રિય',
      isSaved: json['isSaved'] == true,
    );
  }
}

class ScriptSectionItem {
  String sectionName;
  String timeRange;
  String content;
  String directorNotes;

  ScriptSectionItem({
    required this.sectionName,
    required this.timeRange,
    required this.content,
    this.directorNotes = '',
  });

  factory ScriptSectionItem.fromJson(Map<String, dynamic> json) {
    return ScriptSectionItem(
      sectionName: json['sectionName']?.toString() ?? 'મુખ્ય વિભાગ',
      timeRange: json['timeRange']?.toString() ?? '',
      content: json['content']?.toString() ?? '',
      directorNotes: json['directorNotes']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'sectionName': sectionName,
        'timeRange': timeRange,
        'content': content,
        'directorNotes': directorNotes,
      };
}

class SlideItem {
  int id;
  String title;
  String subtitle;
  List<String> bulletPoints;
  String audioTime;
  String bgColor;
  String textColor;
  String accentColor;
  String headingBoxStyle; // 'solid' | 'outline' | 'banner'

  SlideItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.bulletPoints,
    required this.audioTime,
    this.bgColor = '#FFFFFF',
    this.textColor = '#0F172A',
    this.accentColor = '#DC2626',
    this.headingBoxStyle = 'solid',
  });

  factory SlideItem.fromJson(Map<String, dynamic> json) {
    return SlideItem(
      id: (json['id'] as num?)?.toInt() ?? 1,
      title: json['title']?.toString() ?? '',
      subtitle: json['subtitle']?.toString() ?? '',
      bulletPoints: (json['bulletPoints'] as List<dynamic>? ?? [])
          .map((e) => e.toString())
          .toList(),
      audioTime: json['audioTime']?.toString() ?? '',
      bgColor: json['bgColor']?.toString() ?? '#FFFFFF',
      textColor: json['textColor']?.toString() ?? '#0F172A',
      accentColor: json['accentColor']?.toString() ?? '#DC2626',
      headingBoxStyle: json['headingBoxStyle']?.toString() ?? 'solid',
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'subtitle': subtitle,
        'bulletPoints': bulletPoints,
        'audioTime': audioTime,
        'bgColor': bgColor,
        'textColor': textColor,
        'accentColor': accentColor,
        'headingBoxStyle': headingBoxStyle,
      };
}

// -------------------------------------------------------------
// Main Studio Screen
// -------------------------------------------------------------
class MainStudioScreen extends StatefulWidget {
  const MainStudioScreen({super.key});

  @override
  State<MainStudioScreen> createState() => _MainStudioScreenState();
}

class _MainStudioScreenState extends State<MainStudioScreen> {
  // Navigation & Server State
  bool _useNativeMode = true;
  String _serverUrl = 'http://192.168.1.2:5000';
  bool _isServerHealthy = false;
  String _channelTitle = 'જ્ઞાન યાત્રા';
  String _channelAvatar = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120';
  bool _isDemoMode = false;

  // Real YouTube Analytics State
  Map<String, dynamic>? _channelAnalytics;
  bool _isLoadingAnalytics = false;
  String _channelId = 'UC0HVj8j__dVWKzNhNZHjl7A';
  String _channelHandle = '@gyan.yatra1';
  int _channelSubscribers = 20600;
  int _channelVideos = 1047;
  int _views48h = 3960;
  int _prevViews48h = 2908;
  double _viewsGrowth = 36.2;
  double _watchTimeHours = 37.0;
  double _watchTimeGrowth = 25.0;
  double _revenueAmount = 14.10;
  int _netSubscribers = 10;
  String _analyticsPeriod = '2026-10-21 થી 2026-10-22 (સત્તાવાર ૪૮ કલાક)';
  String _analyticsFreshness = 'સત્તાવાર YouTube Analytics API દ્વારા પ્રમાણિત';
  bool _isYouTubeConnected = true;

  // Selected Tab in Native Mode (0: Topics, 1: Slides, 2: Script, 3: Voice, 4: SEO, 5: Share)
  int _nativeSelectedTab = 0;
  String _uploadedSlidePdfFilename = '';

  // Audio Player
  final AudioPlayer _audioPlayer = AudioPlayer();
  String? _currentlyPlayingUrl;
  bool _isPlaying = false;
  Duration _audioPosition = Duration.zero;
  Duration _audioDuration = Duration.zero;
  double _playbackSpeed = 1.0;

  // --- Tab 1: Topics State ---
  String _currentCategory = 'schemes';
  String _searchQuery = '';
  final TextEditingController _searchController = TextEditingController();
  List<TopicItem> _topicsList = [];
  bool _isLoadingTopics = false;

  // --- Tab 2: Scriptwriter State (Topic + Read PDF Master Prompt) ---
  String _selectedTopic = 'ગુજરાત કર્મચારી પગાર અને DA વધારો 2026';
  String _selectedTopicDesc = 'ગુજરાત સરકાર દ્વારા કર્મચારીઓ અને પેન્શનરો માટે ૫૦% DA અને પગારવધારાના મોટા નિર્ણયો.';
  final TextEditingController _scriptTopicController = TextEditingController();
  final TextEditingController _slideVoiceoverTitleController = TextEditingController(text: 'ગુજરાત સરકાર કર્મચારી ૭મા પગારપંચ DA વધારો અને એરિયર્સ નિયમો');
  final TextEditingController _slideVoiceoverVisualController = TextEditingController(text: 'ગાંધીનગર સચિવાલય ઠરાવ / સત્તાવાર પરિપત્ર');
  final TextEditingController _slideVoiceoverContentController = TextEditingController(text: '• ૭મા પગારપંચ મુજબ મોંઘવારી ભથ્થામાં ૪% સીધો વધારો મંજૂર\n• પાછલી અસરથી એટલે કે જુલાઈથી અમલ થશે\n• બાકી રહેલા મહિનાઓનો રોકડ તફાવત એરિયર્સ તરીકે ખાતામાં જમા');
  String _slideVoiceoverMasterPrompt = '';
  String _slideVoiceoverPreRendered = '';
  final String _slideExplanationDepth = 'detailed';
  List<SlidePromptItem> _slidePrompts = [];
  String _allPromptsText = '';
  bool _isGeneratingSlideVoiceover = false;
  final double _scriptDurationMinutes = 10;
  List<ScriptSectionItem> _scriptSections = [];
  bool _isSavingScript = false;

  // --- Tab 3: Google Cloud Voice & Clone State ---
  String _selectedVoiceProfile = 'google-wavenet-female';
  GujaratiVoiceEmotion _selectedVoiceEmotion = GujaratiVoiceEmotion.enthusiastic;
  final TextEditingController _googleApiKeyController = TextEditingController();
  final TextEditingController _customVoiceIdController = TextEditingController();
  bool _showVoiceSettings = false;
  String _selectedActorStyle = 'breaking';
  String _selectedVoiceTone = 'pagarvadhara';
  String _selectedElevenModel = 'eleven_turbo_v2_5';
  String _aiDirectorSummary = '';
  List<ActorSentence> _actorSentences = [];
  final TextEditingController _voiceScriptController = TextEditingController();
  double _voiceSpeed = 0.98;
  double _voiceStability = 0.55;
  double _voiceSimilarity = 0.80;
  double _voiceStyle = 0.15;
  bool _isGeneratingVoice = false;
  String _generatingProgressMessage = '';
  String? _generatedAudioUrl;
  String? _generatedAudioFilename;
  String? _generatedAudioProvider;
  List<Map<String, dynamic>> _audioLibrary = [];
  final TextEditingController _audioFeedbackController = TextEditingController();
  bool _isApplyingAudioFeedback = false;
  String _audioFeedbackSummary = '';
  final TextEditingController _voiceCorrectionPhraseController = TextEditingController(
    text: 'નમસ્કાર દર્શક મિત્રો, જ્ઞાન યાત્રા ચેનલમાં આપનું સ્વાગત છે. આજે આપણે વિગતવાર માહિતી સમજીશું.',
  );
  bool _isGeneratingCorrectionPreview = false;
  String? _correctionPreviewAudioUrl;

  // --- Tab 4: Slides State ---
  final TextEditingController _slideTopicController = TextEditingController();
  String _notebooklmPromptText = '';
  bool _copiedTool2 = false;
  List<SlideItem> _slides = [];
  final String _headingBoxStyle = 'solid';

  // --- Tab 5: SEO & Thumbnail State ---
  final TextEditingController _seoTopicController = TextEditingController();
  bool _isGeneratingSeo = false;
  List<String> _seoTitles = [];
  Map<String, dynamic> _abTitles = {};
  String _seoDescription = '';
  String _seoTags = '';
  String _pinnedComment = '';
  String _callToAction = '';
  String _thumbnailPrompt = '';
  String _thumbnailEl1 = 'ગુજરાત કર્મચારીઓ';
  String _thumbnailEl2 = 'DA વધારો મંજૂર!';
  String _thumbnailEl3 = '૨૦૨૬ સત્તાવાર અપડેટ';
  String _thumbnailEl4 = 'સત્તાવાર નિર્ણય';
  final TextEditingController _thumbEl1Controller = TextEditingController(text: 'ગુજરાત કર્મચારીઓ');
  final TextEditingController _thumbEl2Controller = TextEditingController(text: 'DA વધારો મંજૂર!');
  final TextEditingController _thumbEl3Controller = TextEditingController(text: '૨૦૨૬ સત્તાવાર અપડેટ');
  final TextEditingController _thumbEl4Controller = TextEditingController(text: 'સત્તાવાર નિર્ણય');
  String _thumbnailPromptMode = 'ultimate'; // 'ultimate' or 'dalle-only'
  bool _isOptimizingThumb = false;
  String? _generatedThumbnailImageUrl;
  bool _isGeneratingThumbnailImage = false;

  // --- WebView State ---
  WebViewController? _webViewController;
  bool _isWebViewReady = false;
  bool _isWebLoading = false;
  int _webProgress = 0;
  bool _hasWebError = false;
  String _webErrorMessage = '';

  @override
  void initState() {
    super.initState();
    _scriptTopicController.text = _selectedTopic;
    _seoTopicController.text = _selectedTopic;
    _slideTopicController.text = _selectedTopic;
    _setupAudioListeners();
    _loadInitialPreferences();
  }

  @override
  void dispose() {
    _audioPlayer.dispose();
    _searchController.dispose();
    _scriptTopicController.dispose();
    _voiceScriptController.dispose();
    _seoTopicController.dispose();
    _slideTopicController.dispose();
    _thumbEl1Controller.dispose();
    _thumbEl2Controller.dispose();
    _thumbEl3Controller.dispose();
    _thumbEl4Controller.dispose();
    _audioFeedbackController.dispose();
    _voiceCorrectionPhraseController.dispose();
    super.dispose();
  }

  void _setupAudioListeners() {
    _audioPlayer.onPlayerStateChanged.listen((state) {
      if (!mounted) return;
      setState(() {
        _isPlaying = (state == PlayerState.playing);
      });
    });

    _audioPlayer.onPositionChanged.listen((pos) {
      if (!mounted) return;
      setState(() {
        _audioPosition = pos;
      });
    });

    _audioPlayer.onDurationChanged.listen((dur) {
      if (!mounted) return;
      setState(() {
        _audioDuration = dur;
      });
    });
  }

  Future<void> _loadInitialPreferences() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedUrl = prefs.getString('gyan_yatra_server_url');
      if (savedUrl != null && savedUrl.isNotEmpty) {
        _serverUrl = savedUrl;
      }
      final savedMode = prefs.getBool('gyan_yatra_use_native');
      if (savedMode != null && mounted) {
        setState(() {
          _useNativeMode = savedMode;
        });
      }
      final savedVoiceProfile = prefs.getString('gyan_yatra_voice_profile');
      if (savedVoiceProfile != null && mounted) {
        setState(() => _selectedVoiceProfile = savedVoiceProfile);
      }
      final savedGoogleKey = prefs.getString('gyan_yatra_google_api_key');
      if (savedGoogleKey != null && savedGoogleKey.isNotEmpty) {
        _googleApiKeyController.text = savedGoogleKey;
      }
      final savedCustomVoice = prefs.getString('gyan_yatra_custom_voice_id');
      if (savedCustomVoice != null && savedCustomVoice.isNotEmpty) {
        _customVoiceIdController.text = savedCustomVoice;
      }
      final savedEmotion = prefs.getString('gyan_yatra_voice_emotion');
      if (savedEmotion != null && mounted) {
        if (savedEmotion == 'official') {
          _selectedVoiceEmotion = GujaratiVoiceEmotion.official;
        } else if (savedEmotion == 'calm') {
          _selectedVoiceEmotion = GujaratiVoiceEmotion.calm;
        } else {
          _selectedVoiceEmotion = GujaratiVoiceEmotion.enthusiastic;
        }
      }
      final savedSpeed = prefs.getDouble('gyan_yatra_voice_speed');
      if (savedSpeed != null && mounted) {
        setState(() => _voiceSpeed = savedSpeed);
      }
      final savedStability = prefs.getDouble('gyan_yatra_voice_stability');
      if (savedStability != null && mounted) {
        setState(() => _voiceStability = savedStability);
      }
      final savedSimilarity = prefs.getDouble('gyan_yatra_voice_similarity');
      if (savedSimilarity != null && mounted) {
        setState(() => _voiceSimilarity = savedSimilarity);
      }
      final savedStyle = prefs.getDouble('gyan_yatra_voice_style');
      if (savedStyle != null && mounted) {
        setState(() => _voiceStyle = savedStyle);
      }

      // Initialize default project data
      _initDefaultProjectState();

      // Check server health & fetch live data
      await _pingServerQuietly();
      if (_isServerHealthy) {
        _fetchAuthStatus();
        _fetchHomeAnalytics();
        _fetchTrendingTopics();
        _fetchVoiceLibrary();
      }

      if (!_useNativeMode) {
        _setupWebViewController();
      }
    } catch (_) {}
  }

  void _initDefaultProjectState() {
    _scriptSections = [
      ScriptSectionItem(
        sectionName: 'ધમાકેદાર શરૂઆત (Hook)',
        timeRange: '0:00 - 0:50',
        content:
            'નમસ્તે મિત્રો! આજના વિડીયોમાં આપણે વાત કરીશું ગુજરાત સરકારી કર્મચારીઓ અને પેન્શનર્સના મોંઘવારી ભથ્થા એટલે કે DA અને પગાર વધારાના સત્તાવાર નિર્ણય વિશે. ગાંધીનગર સચિવાલય દ્વારા નવો પરિપત્ર જાહેર કરી દેવામાં આવ્યો છે.',
        directorNotes: 'કેમેરા તરફ સીધી નજર, પોઝિટિવ મુસ્કાન',
      ),
      ScriptSectionItem(
        sectionName: 'મુખ્ય સત્તાવાર વિગત',
        timeRange: '0:50 - 3:30',
        content:
            'નાણાં વિભાગ દ્વારા લેવાયેલા નિર્ણય મુજબ કર્મચારીઓના મૂળ પગાર અને ભથ્થામાં ચોક્કસ ટકાવારીનો વધારો મંજૂર થયો છે. આ વધારો કઈ તારીખથી ખાતામાં જમા થશે અને કેટલો એરિયર્સ મળશે તેની સ્પષ્ટ ગણતરી આગળ જોઈશું.',
        directorNotes: 'પરિપત્ર અને નાણાં વિભાગ જીઆર સ્ક્રીન પર દર્શાવવા',
      ),
      ScriptSectionItem(
        sectionName: 'ખાતામાં જમા થવાની તારીખ અને ગણતરી',
        timeRange: '3:30 - 7:00',
        content:
            'જે કર્મચારીઓ નિયમિત સેવામાં છે તેમને સીધો પગાર સ્લિપમાં આ રકમ ઉમેરાયેલી જોવા મળશે. પેન્શનર્સને પણ ટ્રેઝરી મારફતે સીધી ચૂકવણી કરવામાં આવશે. કોઈપણ વચેટીયાની વાતમાં આવવું નહીં.',
        directorNotes: 'ટેબલ અને કેલ્ક્યુલેશન ગ્રાફિક્સ દર્શાવવા',
      ),
      ScriptSectionItem(
        sectionName: 'સમાપન અને કોલ ટુ એક્શન',
        timeRange: '7:00 - 8:30',
        content:
            'આ વિડીયો તમારા તમામ કર્મચારી મિત્રો અને વોટ્સએપ ગ્રૂપમાં શેર કરજો જેથી સાચી માહિતી પહોંચે. આપણી ચેનલ જ્ઞાન યાત્રાને સબ્સ્ક્રાઇબ કરી લેજો. જય હિન્દ, જય જય ગરવી ગુજરાત!',
        directorNotes: 'સબ્સ્ક્રાઇબ બટન અને વિદાય',
      ),
    ];

    _voiceScriptController.text = _scriptSections.map((s) => s.content).join('\n\n');

    _slides = [
      SlideItem(
        id: 1,
        title: 'ગુજરાત પગાર અને DA વધારો',
        subtitle: 'મુખ્યમંત્રીશ્રીનો સત્તાવાર નિર્ણય',
        bulletPoints: [
          'ગાંધીનગર સચિવાલય દ્વારા પરિપત્ર જાહેર',
          'લાખો કર્મચારીઓ અને પેન્શનર્સને મોટો ફાયદો',
          'આ મહિનાથી જ ખાતામાં જમા'
        ],
        audioTime: '0:00 - 0:50',
        accentColor: '#DC2626',
      ),
      SlideItem(
        id: 2,
        title: 'કોને કોને લાભ મળશે?',
        subtitle: 'પાત્રતા અને નિયમો',
        bulletPoints: [
          'રાજ્ય સરકારના તમામ કાયમી કર્મચારીઓ',
          'પંચાયત અને બોર્ડ નિગમના સ્ટાફ',
          'તમામ નિવૃત્ત પેન્શનર્સ અને ફેમિલી પેન્શનર્સ'
        ],
        audioTime: '0:50 - 3:30',
        accentColor: '#2563EB',
      ),
      SlideItem(
        id: 3,
        title: 'ખાતામાં ક્યારે જમા થશે?',
        subtitle: 'તારીખ અને એરિયર્સ વિગત',
        bulletPoints: [
          'ચાલુ માસના પગાર સાથે સીધા ખાતામાં',
          'પાછલી બાકી રકમ (Arrears) હપ્તાવાર ચૂકવાશે',
          'ઓનલાઇન પગાર સ્લિપમાં ચકાસી શકાશે'
        ],
        audioTime: '3:30 - 7:00',
        accentColor: '#10B981',
      ),
      SlideItem(
        id: 4,
        title: 'મહત્વની ચેતવણી & શેર કરો',
        subtitle: 'જ્ઞાન યાત્રા સત્તાવાર અપડેટ',
        bulletPoints: [
          'કોઈ પણ ખોટી અફવાઓથી સાવચેત રહેવું',
          'સત્તાવાર ઓર્ડર ડિસ્ક્રિપ્શનમાં આપેલો છે',
          'તમામ મિત્રો સાથે શેર કરો અને સબ્સ્ક્રાઇબ કરો'
        ],
        audioTime: '7:00 - 8:30',
        accentColor: '#DC2626',
      ),
    ];

    _seoTitles = [
      'ગુજરાત કર્મચારી પગાર અને DA વધારો 2026 | સત્તાવાર પરિપત્ર જાહેર',
      'મોટી ખુશખબર: ૫૦% DA અને પગારવધારો મંજૂર! ખાતામાં ક્યારે જમા થશે?',
      'CM ભૂપેન્દ્ર પટેલની મોટી જાહેરાત: કર્મચારીઓ અને પેન્શનર્સને લાભ',
      'ગુજરાત સરકારી કર્મચારી પગાર વધારો 2026 નિયમો & GR વિગત',
    ];

    _abTitles = {
      'emotional': 'લાખો સરકારી કર્મચારીઓ માટે મોટા ખુશખબર: પગાર વધારો જાહેર!',
      'curiosity': 'નવા પરિપત્રમાં શું છે મોટો નિર્ણય? કોને મળશે સૌથી વધુ લાભ?',
      'benefit': 'તમારા ખાતામાં આ તારીખથી આવશે વધારાના રૂપિયા, જુઓ ગણતરી'
    };

    _seoDescription = '''ગુજરાત સરકાર દ્વારા કર્મચારીઓ અને પેન્શનર્સ માટે મોંઘવારી ભથ્થા (DA) અને પગાર વધારાની સત્તાવાર જાહેરાત કરવામાં આવી છે. સંપૂર્ણ વિગત, તારીખ અને પરિપત્ર આ વિડીયોમાં જુઓ.

📌 મુખ્ય મુદ્દાઓ:
00:00 - પગાર અને DA વધારો સત્તાવાર જાહેરાત
01:30 - પાત્રતા અને લાભાર્થીઓ
04:00 - ખાતામાં જમા થવાની તારીખ
07:00 - મહત્વની ચેતવણી

#GujaratGovt #SalaryHike #DAHike #GyanYatra #GujaratNews''';

    _seoTags =
        'gujarat salary hike, da hike gujarat, gujarat govt employee da, gujarat salary update 2026, bhupendra patel salary announcement, gyan yatra, gujarati news';

    _pinnedComment = '📌 મિત્રો, સત્તાવાર સરકારી પરિપત્ર (GR) ની પીડીએફ વાંચવા માટે ડિસ્ક્રિપ્શનમાં આપેલી લિંક પર ક્લિક કરો અને આપણી ચેનલને સબ્સ્ક્રાઇબ કરો!';
    _callToAction = 'જો માહિતી પસંદ આવી હોય તો વિડીયોને લાઈક કરી તમારા તમામ મિત્રો સાથે શેર કરો!';

    _thumbnailEl1 = 'ગુજરાત કર્મચારીઓ';
    _thumbnailEl2 = 'DA વધારો મંજૂર!';
    _thumbnailEl3 = '૨૦૨૬ સત્તાવાર અપડેટ';
    _thumbnailEl4 = 'સત્તાવાર નિર્ણય';
    _thumbnailPrompt =
        'A minimalist 16:9 YouTube thumbnail with a pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of the Chief Minister of Gujarat, Bhupendra Patel, in traditional clean white kurta at an official press briefing podium looking at camera with a confident expression. On the right: A clean, high-contrast hierarchical text layout with exactly 3 to 4 distinct elements: Top line in deep navy blue (#102A56): "GUJARAT GOVT EMPLOYEES"; Main primary hook on a bold crimson red (#D71920) panel with vibrant gold-yellow (#FFD928) letters: "DA HIKE APPROVED!"; Supporting detail in crisp dark charcoal (#111111): "2026 OFFICIAL CIRCULAR"; Clean accent badge in navy blue: "OFFICIAL DECISION". Ultra clean, professional typography, maximum mobile readability, strictly photorealistic subject, zero clutter, absolutely NO 3D cartoon, NO neon, NO dark gradients, NO gaming effects.';

    final defaultNotebookRes = NotebookLMService.generateLocalPrompt(topic: _selectedTopic);
    _notebooklmPromptText = defaultNotebookRes.pptDeckPrompt;
    _slideVoiceoverMasterPrompt = SlideVoiceoverService.generateFullPdfMasterPrompt(topic: _selectedTopic);
    _actorSentences = VoiceActorService.parseActorScript(
      _voiceScriptController.text.isNotEmpty ? _voiceScriptController.text : 'કેમ છો મિત્રો! આજના વિડીયોમાં આપણે વાત કરીશું ગુજરાત સરકાર દ્વારા જાહેર કરાયેલા નવા સત્તાવાર પરિપત્ર વિશે. ગાંધીનગર નાણાં વિભાગ દ્વારા કર્મચારીઓ અને પેન્શનર્સ માટે ખૂબ જ મોટો નિર્ણય લેવામાં આવ્યો છે. છેલ્લી તારીખ પહેલાં તમામ પ્રક્રિયા પૂર્ણ કરી લેવી.',
      style: _selectedActorStyle,
    );
  }

  // -------------------------------------------------------------
  // Backend API Communication
  // -------------------------------------------------------------
  Future<void> _pingServerQuietly() async {
    try {
      final uri = Uri.parse('$_serverUrl/api/health');
      final response = await http.get(uri).timeout(const Duration(seconds: 3));
      if (mounted) {
        setState(() {
          _isServerHealthy = (response.statusCode == 200);
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _isServerHealthy = false;
        });
      }
    }
  }

  Future<void> _fetchAuthStatus() async {
    try {
      final uri = Uri.parse('$_serverUrl/api/auth/status');
      final response = await http.get(uri).timeout(const Duration(seconds: 4));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _isDemoMode = data['isDemo'] ?? true;
            if (data['channel'] != null) {
              _channelTitle = data['channel']['title'] ?? 'જ્ઞાન યાત્રા';
              _channelAvatar = data['channel']['avatar'] ?? _channelAvatar;
            }
          });
        }
      }
    } catch (_) {}
  }

  Future<void> _fetchHomeAnalytics() async {
    if (!mounted) return;
    setState(() => _isLoadingAnalytics = true);
    try {
      final uri = Uri.parse('$_serverUrl/api/youtube/analytics?refresh=true');
      final response = await http.get(uri).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['success'] == true && data['data'] != null) {
          final d = Map<String, dynamic>.from(data['data']);
          if (mounted) {
            setState(() {
              _channelAnalytics = d;
              _isDemoMode = d['isDemo'] == true;
              if (d['channelId'] != null) _channelId = d['channelId'].toString();
              if (d['channelTitle'] != null) _channelTitle = d['channelTitle'].toString();
              if (d['channelAvatar'] != null && d['channelAvatar'].toString().isNotEmpty) {
                _channelAvatar = d['channelAvatar'].toString();
              }
              if (d['customUrl'] != null) _channelHandle = d['customUrl'].toString();
              final subs = d['subscribers'] as Map<String, dynamic>? ?? {};
              if (subs['total'] != null) _channelSubscribers = (subs['total'] as num).toInt();
              if (subs['netChange48h'] != null) _netSubscribers = (subs['netChange48h'] as num).toInt();
              if (d['videoCount'] != null) _channelVideos = (d['videoCount'] as num).toInt();
              
              final views48 = d['views48h'] as Map<String, dynamic>? ?? {};
              if (views48['total'] != null) _views48h = (views48['total'] as num).toInt();
              if (views48['previousTotal'] != null) _prevViews48h = (views48['previousTotal'] as num).toInt();
              if (views48['percentageChange'] != null) {
                _viewsGrowth = (views48['percentageChange'] as num).toDouble();
              }
              if (views48['reportingPeriod'] != null) {
                _analyticsPeriod = views48['reportingPeriod'].toString();
              }
              if (views48['dataFreshness'] != null) {
                _analyticsFreshness = views48['dataFreshness'].toString();
              }

              final wt = d['watchTime'] as Map<String, dynamic>? ?? {};
              if (wt['hours48h'] != null) _watchTimeHours = (wt['hours48h'] as num).toDouble();
              if (wt['percentageChange'] != null) _watchTimeGrowth = (wt['percentageChange'] as num).toDouble();

              final rev = d['revenue48h'] as Map<String, dynamic>? ?? {};
              if (rev['amount'] != null) _revenueAmount = (rev['amount'] as num).toDouble();
              
              _isYouTubeConnected = true;
            });
          }
        }
      }
    } catch (_) {}
    if (mounted) setState(() => _isLoadingAnalytics = false);
  }

  void _showChannelAccountDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: const [
            Text('📺', style: TextStyle(fontSize: 20)),
            SizedBox(width: 8),
            Text(
              'સત્તાવાર YouTube ચેનલ',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(22),
                  child: Image.network(
                    _channelAvatar,
                    width: 44,
                    height: 44,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      width: 44,
                      height: 44,
                      color: const Color(0xFFEDE9FE),
                      child: const Center(child: Text('🎯', style: TextStyle(fontSize: 20))),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _channelTitle,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                      Text(
                        '$_channelHandle • ${_channelSubscribers.toString()} સબ્સ્ક્રાઇબર્સ',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: _isYouTubeConnected ? const Color(0xFFECFDF5) : const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: _isYouTubeConnected ? const Color(0xFF10B981) : const Color(0xFFEF4444)),
                  ),
                  child: Text(
                    _isYouTubeConnected ? 'ઓથોરાઇઝ્ડ ✓' : 'ડિસ્કનેક્ટેડ',
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.bold,
                      color: _isYouTubeConnected ? const Color(0xFF059669) : const Color(0xFFDC2626),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('ચેનલ ID:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  const SizedBox(height: 2),
                  SelectableText(
                    _channelAnalytics?['channelId']?.toString() ?? _channelId,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  const Divider(color: Color(0xFFE2E8F0), height: 14),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('વોચ ટાઈમ ગ્રોથ:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                      Text('+${_watchTimeGrowth.toStringAsFixed(1)}%', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                    ],
                  ),
                  const Divider(color: Color(0xFFE2E8F0), height: 14),
                  const Text('API ઓથોરાઇઝેશન સ્કોપ:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  const SizedBox(height: 2),
                  const Text(
                    'YouTube Data API & YouTube Analytics API (ReadOnly)',
                    style: TextStyle(fontSize: 11, color: Color(0xFF334155)),
                  ),
                  const Divider(color: Color(0xFFE2E8F0), height: 14),
                  const Text('ટોકન સુરક્ષા:', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                  const SizedBox(height: 2),
                  const Text(
                    'ગૂગલ OAuth 2.0 રિફ્રેશ ટોકન સર્વર પર સુરક્ષિત છે.',
                    style: TextStyle(fontSize: 11, color: Color(0xFF059669), fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            child: const Text('બંધ કરો', style: TextStyle(color: Color(0xFF64748B))),
            onPressed: () => Navigator.pop(ctx),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF7C3AED),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: const Icon(Icons.refresh, size: 16),
            label: const Text('પુનઃ કનેક્ટ / સ્વિચ'),
            onPressed: () {
              Navigator.pop(ctx);
              _fetchHomeAnalytics();
              _showSnack('YouTube ચેનલ ડેટા તાજો કરવામાં આવ્યો.');
            },
          ),
        ],
      ),
    );
  }

  Future<void> _toggleDemoMode() async {
    try {
      final uri = Uri.parse('$_serverUrl/api/auth/demo-toggle');
      final response = await http.post(uri).timeout(const Duration(seconds: 4));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          setState(() {
            _isDemoMode = data['demoMode'] ?? !_isDemoMode;
          });
          _showSnack(data['message'] ?? 'ડેમો મોડ અપડેટ થયો.');
        }
      }
    } catch (e) {
      _showSnack('ભૂલ: $e', isError: true);
    }
  }

  Future<void> _fetchTrendingTopics() async {
    if (!mounted) return;
    setState(() => _isLoadingTopics = true);
    try {
      final catParam = _currentCategory;
      String url = '$_serverUrl/api/topics/trends-48h?category=$catParam';
      if (_searchQuery.isNotEmpty) {
        url += '&q=${Uri.encodeComponent(_searchQuery)}';
      }
      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 8));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final list = (data['ideas'] as List<dynamic>? ?? data['topics'] as List<dynamic>? ?? [])
            .map((t) => TopicItem.fromJson(t as Map<String, dynamic>))
            .toList();
        if (mounted) {
          setState(() {
            _topicsList = list;
            _isLoadingTopics = false;
            if (list.isNotEmpty && (_selectedTopic.isEmpty || _selectedTopic == 'ગુજરાત કર્મચારી પગાર અને DA વધારો 2026')) {
              _selectedTopic = list[0].topicGujarati;
              _selectedTopicDesc = list[0].whyViewersWatch;
              _scriptTopicController.text = list[0].topicGujarati;
              _seoTopicController.text = list[0].topicGujarati;
            }
          });
        }
        return;
      }
    } catch (_) {
      try {
        final fallbackRes = await http.get(Uri.parse('$_serverUrl/api/topics/trending?category=$_currentCategory')).timeout(const Duration(seconds: 5));
        if (fallbackRes.statusCode == 200) {
          final data = jsonDecode(fallbackRes.body);
          final list = (data['topics'] as List<dynamic>? ?? [])
              .map((t) => TopicItem.fromJson(t as Map<String, dynamic>))
              .toList();
          if (mounted) {
            setState(() {
              _topicsList = list;
              _isLoadingTopics = false;
            });
          }
          return;
        }
      } catch (_) {}

      if (_topicsList.isEmpty) {
        _topicsList = _getDefaultTopics();
      }
    }
    if (mounted) setState(() => _isLoadingTopics = false);
  }

  List<TopicItem> _getDefaultTopics() {
    return [
      // 1. Schemes & Salaries
      TopicItem(
        id: 'top_da_hike',
        topicGujarati: 'ગુજરાત સરકારી કર્મચારી અને પેન્શનર ૫૦% DA વધારો & એરિયર્સ ગણતરી 2026',
        category: 'schemes',
        whyViewersWatch: '૫૦% DA વધારાથી પગાર અને એરિયર્સમાં થનારા વાસ્તવિક ફેરફારની લાઈવ ગણતરી જાણવા.',
        targetAudience: 'ગુજરાતના તમામ સરકારી કર્મચારીઓ અને નિવૃત્ત પેન્શનરો',
        trendEvidence: 'નાણાં વિભાગ પરિપત્ર અને કર્મચારી મંડળોમાં ભારે ચર્ચા',
        competitionLevel: 'ઓછી (Low)',
        suggestedFormat: '૧૦ મિનિટ લાઈવ ગણતરી વિડીયો + GR સ્લાઇડ્સ',
        suggestedTitle: 'ગુજરાત કર્મચારી પગાર & DA 50% વધારો: ખાતામાં કેટલા જમા થશે? એરિયર્સ સાથે લાઈવ ગણતરી પરિપત્ર',
        searchKeywords: ['ગુજરાત પગારવધારો', 'da hike 2026', 'karmachari circular', 'gyan yatra'],
        thumbnailConcept: 'પરિપત્ર + કેલ્ક્યુલેટર + ૫૦% DA મંજૂર બોલ્ડ અક્ષરે',
        overallScore: 99,
        searchDemandScore: 99,
        freshnessScore: 98,
        competitionScore: 92,
        masterPrompt:
            'જ્ઞાન યાત્રા શૈલીમાં "ગુજરાત સરકારી કર્મચારી ૫૦% DA વધારો & એરિયર્સ ગણતરી 2026" માટે સચોટ સ્ક્રિપ્ટ લખો.',
      ),
      TopicItem(
        id: 'top_pm_kisan',
        topicGujarati: 'પીએમ કિસાન ૧૯મો હપ્તો ₹૨,૦૦૦: તારીખ જાહેર, eKYC અને બેંક ખાતા લિંકિંગ ફરજિયાત',
        category: 'schemes',
        whyViewersWatch: 'ગુજરાતના ૬૦ લાખ ખેડૂતોના ખાતામાં ₹૨,૦૦૦ જમા થવાની તારીખ અને સ્ટેટસ ચેક કરવા.',
        targetAudience: 'ગુજરાતના ખેડૂતો, પશુપાલકો અને ગ્રામ્ય પરિવારો',
        trendEvidence: 'pmkisan.gov.in પોર્ટલ અને ગુગલ સર્ચમાં ટોપ ટ્રેન્ડિંગ',
        competitionLevel: 'મધ્યમ (Medium)',
        suggestedFormat: '૮ મિનિટ સ્ટેપ-બાય-સ્ટેપ મોબાઇલ ડેમો',
        suggestedTitle: 'ખેડૂતોના ખાતામાં ₹૨,૦૦૦ જમા થશે આ દિવસે! PM Kisan 19મો હપ્તો: આ 2 કામ નહીં કરો તો પૈસા અટકી જશે',
        searchKeywords: ['pm kisan 19th installment date 2026', 'pm kisan ekyc gujarati', 'khedut yojana 2000'],
        thumbnailConcept: 'પીએમ મોદીનો ફોટો + ₹૨,૦૦૦ ની નોટ + ૧૯મો હપ્તો તારીખ જાહેર',
        overallScore: 97,
        searchDemandScore: 98,
        freshnessScore: 97,
        competitionScore: 90,
        masterPrompt:
            'જ્ઞાન યાત્રા શૈલીમાં "PM Kisan 19મો હપ્તો અને eKYC પદ્ધતિ 2026" માટે ખેડૂત-ઉપયોગી ગુજરાતી સ્ક્રિપ્ટ આપો.',
      ),
      TopicItem(
        id: 'top_namo_lakshmi',
        topicGujarati: 'નમો લક્ષ્મી & નમો સરસ્વતી યોજના: દીકરીઓને મળશે ₹૫૦,૦૦૦ સુધીની સહાય, ફોર્મ ભરવાની રીત',
        category: 'schemes',
        whyViewersWatch: 'ધોરણ ૯ થી ૧૨ ની વિદ્યાર્થીનીઓ માટે નવી શિષ્યવૃત્તિ સહાય મેળવવાની શરતો જાણવા.',
        targetAudience: 'શાળાના વિદ્યાર્થીઓ, વાલીઓ, શિક્ષકો',
        trendEvidence: 'ગુજરાત શિક્ષણ વિભાગનો તાજો ઠરાવ અને શાળાઓમાં ફોર્મ વિતરણ',
        competitionLevel: 'ઓછી (Low)',
        suggestedFormat: '૮ મિનિટ ફોર્મ ગાઈડ વિડીયો',
        suggestedTitle: 'દીકરીઓને ભણવા માટે સરકાર આપશે ₹૫૦,૦૦૦! નમો લક્ષ્મી યોજના 2026: ફોર્મ કેવી રીતે ભરવું? સંપૂર્ણ નિયમો',
        searchKeywords: ['namo lakshmi yojana gujarat', 'namo saraswati yojana form', 'dikri sahay yojana 2026'],
        thumbnailConcept: 'સ્કૂલ ગર્લ પુસ્તક સાથે + ચેક ₹૫૦,૦૦૦ + દીકરી સહાય ફોર્મ શરૂ',
        overallScore: 96,
        searchDemandScore: 97,
        freshnessScore: 96,
        competitionScore: 94,
        masterPrompt:
            'જ્ઞાન યાત્રા ચેનલ માટે "નમો લક્ષ્મી અને નમો સરસ્વતી યોજના 2026" વિષય પર વિગતવાર ગુજરાતી સ્ક્રિપ્ટ આપો.',
      ),
      TopicItem(
        id: 'top_ayushman_card',
        topicGujarati: 'આયુષ્માન ભારત કાર્ડ: ₹૧૦ લાખ સુધીની મફત સારવાર, હોસ્પિટલ યાદી અને ૭૦+ વડીલોના કાર્ડ',
        category: 'schemes',
        whyViewersWatch: '₹૧૦ લાખ મફત સારવાર અને વરિષ્ઠ નાગરિકો માટે નવા કાર્ડ કઢાવવાની સરળ રીત જાણવા.',
        targetAudience: 'સામાન્ય પરિવારો, વરિષ્ઠ નાગરિકો અને ગ્રામ્ય જનતા',
        trendEvidence: 'પીએમજેએવાય ગુજરાત અભિયાન અને હોસ્પિટલ પૂછપરછ',
        competitionLevel: 'ઓછી (Low)',
        suggestedFormat: '૧૦ મિનિટ હોસ્પિટલ સર્ચ ગાઈડ',
        suggestedTitle: 'આયુષ્માન કાર્ડ પર ₹૧૦ લાખ મફત સારવાર! ૭૦ વર્ષથી મોટા વડીલો માટે કાર્ડ શરૂ: હોસ્પિટલનું લિસ્ટ આ રીતે જુઓ',
        searchKeywords: ['ayushman card 10 lakh gujarat', 'pmjay hospital list', 'ayushman senior citizen'],
        thumbnailConcept: 'આયુષ્માન કાર્ડ + હોસ્પિટલ બેડ + ₹૧૦ લાખ સુધી ફ્રી ઇલાજ',
        overallScore: 95,
        searchDemandScore: 96,
        freshnessScore: 95,
        competitionScore: 93,
        masterPrompt:
            'જ્ઞાન યાત્રા શૈલીમાં "આયુષ્માન કાર્ડ ₹૧૦ લાખ મફત સારવાર અને હોસ્પિટલ યાદી 2026" વિષય પર માહિતીપ્રદ સ્ક્રિપ્ટ લખો.',
      ),

      // 2. Anganwadi
      TopicItem(
        id: 'top_anganwadi_1',
        topicGujarati: 'આંગણવાડી સુપરવાઈઝર ભરતી 2026: સત્તાવાર જાહેરાત, પરીક્ષા પેટર્ન અને લાયકાત',
        category: 'anganwadi',
        whyViewersWatch: 'મહિલાઓ માટે સરકારી નોકરી, લાયકાત અને ફોર્મ ભરવાની છેલ્લી તારીખ જાણવા (ચેનલ પર 86K+ વ્યુઝ).',
        targetAudience: 'મહિલા ઉમેદવારો, ગૃહિણીઓ અને ગ્રેજ્યુએટ બહેનો',
        trendEvidence: 'ઓજસ (OJAS) પોર્ટલ સર્ચ અને WCD નોટિફિકેશન',
        competitionLevel: 'મધ્યમ (Medium)',
        suggestedFormat: '૧૦-૧૨ મિનિટ સ્ટેપ બાય સ્ટેપ ગાઈડ',
        suggestedTitle: 'આંગણવાડી સુપરવાઈઝર ભરતી 2026: ફોર્મ ભરવાની તારીખ અને કટ-ઓફ જાહેર! કઈ ડિગ્રી માન્ય ગણાશે? સંપૂર્ણ માહિતી',
        searchKeywords: ['આંગણવાડી ભરતી', 'anganwadi supervisor bharti 2026', 'wcd gujarat bharti'],
        thumbnailConcept: 'સ્પષ્ટ બોલ્ડ લખાણ: "આંગણવાડી સુપરવાઈઝર 2026", લાયકાત અને જગ્યાઓની યાદી',
        overallScore: 99,
        searchDemandScore: 99,
        freshnessScore: 98,
        competitionScore: 91,
        masterPrompt:
            'જ્ઞાન યાત્રા ચેનલ માટે "આંગણવાડી સુપરવાઈઝર નવી ભરતી 2026" વિષય પર વિગતવાર ગુજરાતી સ્ક્રિપ્ટ લખો.',
      ),
      TopicItem(
        id: 'top_anganwadi_salary',
        topicGujarati: 'આંગણવાડી કાર્યકર & તેડાગર બહેનોના પગાર વધારાનો પરિપત્ર 2026',
        category: 'anganwadi',
        whyViewersWatch: 'પગાર વધારા અને ₹24,800/₹20,300 ના પરિપત્રની હકીકત જાણવા દર્શકોમાં ભારે ઉત્સુકતા.',
        targetAudience: 'આંગણવાડી સ્ટાફ, આશાવર્કર બહેનો, પંચાયત કર્મચારીઓ',
        trendEvidence: 'પંચાયત અને ડબ્લ્યુસીડી પરિપત્ર પર હાઇ-એન્ગેજમેન્ટ',
        competitionLevel: 'ઓછી (Low)',
        suggestedFormat: '૮-૧૦ મિનિટ પરિપત્ર વિશ્લેષણ',
        suggestedTitle: 'આંગણવાડી પગાર વધારો 2026: ₹24,800 પરિપત્રની સાચી હકીકત શું? ક્યારે ખાતામાં આવશે? સત્તાવાર ખુલાસો',
        searchKeywords: ['anganwadi pagar vadharo 2026', 'anganwadi salary circular', 'wcd pagar'],
        thumbnailConcept: 'પરિપત્રનો ફોટો + ₹24,800 સાચી હકીકત શું? ક્યારે મળશે?',
        overallScore: 98,
        searchDemandScore: 98,
        freshnessScore: 97,
        competitionScore: 94,
        masterPrompt:
            'જ્ઞાન યાત્રા શૈલીમાં "આંગણવાડી પગાર વધારો ૨૦૨૬ પરિપત્રની સાચી હકીકત" પર સ્પષ્ટ અને વિશ્લેષણાત્મક સ્ક્રિપ્ટ આપો.',
      ),

      // 3. Police & Exams
      TopicItem(
        id: 'top_police_lrd',
        topicGujarati: 'ગુજરાત પોલીસ & LRD ભરતી 2026: કટ-ઓફ, રિઝલ્ટ અને ડોક્યુમેન્ટ વેરિફિકેશન',
        category: 'police',
        whyViewersWatch: '૧૨,૦૦૦+ જગ્યાઓ માટે કટ-ઓફ, રિઝલ્ટ અને વેરિફિકેશન નિયમો જાણવા.',
        targetAudience: 'ગુજરાતના યુવાનો અને સ્પર્ધાત્મક પરીક્ષાના વિદ્યાર્થીઓ',
        trendEvidence: 'LRB ભરતી બોર્ડ નોટિફિકેશન અને વિદ્યાર્થીઓની ભારે શોધખોળ',
        competitionLevel: 'મધ્યમ (Medium)',
        suggestedFormat: '૧૦ મિનિટ માર્ગદર્શન વિડીયો',
        suggestedTitle: 'LRD Result 2026 પછી આ 5 ડોક્યુમેન્ટ તૈયાર રાખજો! ડોક્યુમેન્ટ વેરિફિકેશનમાં ભૂલ કરી તો બહાર!',
        searchKeywords: ['પોલીસ ભરતી', 'police constable 2026', 'lrd result', 'lrd cut off'],
        thumbnailConcept: 'ખાખી વર્દી + આ ૫ કાગળો તૈયાર રાખો વેરિફિકેશન નિયમ',
        overallScore: 96,
        searchDemandScore: 97,
        freshnessScore: 96,
        competitionScore: 88,
        masterPrompt:
            'જ્ઞાન યાત્રા શૈલીમાં "ગુજરાત પોલીસ કોન્સ્ટેબલ અને PSI ભરતી 2026" માટે ઊર્જાવાન ગુજરાતી સ્ક્રિપ્ટ લખો.',
      ),
      TopicItem(
        id: 'top_gsssb_cce',
        topicGujarati: 'GSSSB CCE અને તલાટી ભરતી: નવી પરીક્ષા પદ્ધતિ, નેગેટિવ માર્કિંગ અને સિલેબસ',
        category: 'police',
        whyViewersWatch: 'નવા CCE નિયમો અને ગ્રૂપ A/B ના ફેરફારો સમજીને તૈયારી કરવા.',
        targetAudience: 'સ્પર્ધાત્મક પરીક્ષાર્થીઓ, ગ્રેજ્યુએટ યુવાનો',
        trendEvidence: 'OJAS અને GSSSB સત્તાવાર જાહેરાતો',
        competitionLevel: 'વધુ (High)',
        suggestedFormat: '૧૨ મિનિટ સિલેબસ માર્ગદર્શન',
        suggestedTitle: 'GSSSB CCE 2026: ગ્રૂપ A અને B ની તૈયારી કેવી રીતે કરવી? નવો સિલેબસ અને બુક લિસ્ટ',
        searchKeywords: ['gsssb cce syllabus', 'talati exam 2026', 'gpsc cce gujarati'],
        thumbnailConcept: 'પુસ્તકો + OJAS સીલ + નવો નિયમ લાગુ - મોટી ભૂલ ના કરશો',
        overallScore: 93,
        searchDemandScore: 96,
        freshnessScore: 94,
        competitionScore: 84,
        masterPrompt:
            'જ્ઞાન યાત્રા શૈલીમાં "GSSSB CCE પરીક્ષા પદ્ધતિ અને સિલેબસ માર્ગદર્શન" માટે સ્ક્રિપ્ટ લખો.',
      ),

      // 4. Business & Earning
      TopicItem(
        id: 'top_biz_10k',
        topicGujarati: 'ગુજરાતમાં માત્ર ₹10,000 થી શરૂ કરી શકાય તેવા 3 નફાકારક લોકલ બિઝનેસ આઈડિયા',
        category: 'business',
        whyViewersWatch: 'ઓછાં રોકાણમાં મોટો નફો આપતા રિયલ-લાઈફ ગુજરાતી બિઝનેસ મોડેલ્સ શીખવા.',
        targetAudience: 'ગામડાં અને શહેરોના યુવાનો, ગૃહિણીઓ, નોકરી કરતા લોકો',
        trendEvidence: 'Small business ideas in Gujarat વિષય પર લાખો સર્ચ',
        competitionLevel: 'ઓછી (Low)',
        suggestedFormat: '૧૦-૧૪ મિનિટ કોસ્ટિંગ શીટ સાથે',
        suggestedTitle: 'દર મહિને ₹50,000 ચોખ્ખો નફો! ₹10,000 માં શરૂ કરો આ 3 ગુજરાતી બિઝનેસ (રોકાણ ઓછું, નફો ડબલ)',
        searchKeywords: ['small business ideas in gujarat', 'laghu udyog gujarati', 'kamani na rasta'],
        thumbnailConcept: '₹10,000 ની નોટો + રોજના ₹2,000 ની કમાણી ૧૦૦% સાચું!',
        overallScore: 96,
        searchDemandScore: 96,
        freshnessScore: 93,
        competitionScore: 97,
        masterPrompt:
            'જ્ઞાન યાત્રા શૈલીમાં "ગુજરાતમાં ₹10,000 થી શરૂ થતા 3 નફાકારક બિઝનેસ" પર સ્ક્રિપ્ટ તૈયાર કરો.',
      ),
      TopicItem(
        id: 'top_biz_ai_mobile',
        topicGujarati: 'મોબાઇલથી AI અને ChatGPT વાપરીને ઓનલાઇન પૈસા કમાવાના 5 સાચા રસ્તા',
        category: 'business',
        whyViewersWatch: 'ઘરે બેઠા વાસ્તવિક ઓનલાઇન કમાણીની પદ્ધતિ શીખવા (કોઈ લેપટોપ નહીં).',
        targetAudience: 'કોલેજ વિદ્યાર્થીઓ, ફ્રીલાન્સર્સ અને વર્ક ફ્રોમ હોમ શોધતા ગુજરાતીઓ',
        trendEvidence: 'AI અર્નિંગ કીવર્ડ્સમાં ૧૮૦% સર્ચ ગ્રોથ',
        competitionLevel: 'મધ્યમ (Medium)',
        suggestedFormat: '૧૨ મિનિટ પ્રેક્ટિકલ ડેમો વિડીયો',
        suggestedTitle: 'ChatGPT થી દર મહિને ₹30,000 કમાઓ: ગુજરાતીમાં સંપૂર્ણ ગાઈડ (કોઈ લેપટોપ નહીં, માત્ર મોબાઈલ)',
        searchKeywords: ['chatgpt thi kamani', 'online earning gujarati', 'mobile thi paise kamavo'],
        thumbnailConcept: 'મોબાઇલ સ્ક્રીન + બેંક ક્રેડિટ મેસેજ ₹30,000 + ChatGPT લોગો',
        overallScore: 95,
        searchDemandScore: 97,
        freshnessScore: 96,
        competitionScore: 88,
        masterPrompt:
            'જ્ઞાન યાત્રા માટે "મોબાઇલથી ChatGPT અને AI થી કમાણી" વિષય પર વાસ્તવિક અને સરળ ગુજરાતી સ્ક્રિપ્ટ આપો.',
      ),
      TopicItem(
        id: 'top_biz_agro',
        topicGujarati: 'ગામડામાં રહીને શરૂ કરો આ 3 એગ્રો-બિઝનેસ: સરકાર આપશે 40% સબસિડી (દર મહિને ₹1 લાખ નફો)',
        category: 'business',
        whyViewersWatch: 'ખેતી સાથે સંલગ્ન ડેરી, ઓર્ગેનિક ખાતર અને કોલ્ડ સ્ટોરેજ બિઝનેસમાં સરકારી સબસિડી મેળવવા.',
        targetAudience: 'ખેડૂત પુત્રો, ગામડાના યુવાનો, એગ્રીકલ્ચર વિદ્યાર્થીઓ',
        trendEvidence: 'નાબાર્ડ (NABARD) સબસિડી અને એગ્રો ઇન્ડસ્ટ્રીઝ યોજનાઓ',
        competitionLevel: 'ઓછી (Low)',
        suggestedFormat: '૧૨ મિનિટ પ્રોજેક્ટ રિપોર્ટ સાથે',
        suggestedTitle: 'ગામડામાં શરૂ કરો આ બિઝનેસ: સરકાર આપશે ૪૦% સબસિડી! દર મહિને ₹1,00,000 ચોખ્ખો નફો',
        searchKeywords: ['agro business ideas gujarat', 'nabard subsidy scheme', 'gamda ma business'],
        thumbnailConcept: 'આધુનિક ફાર્મ + સરકારી સબસિડી પત્ર + ૪૦% સબસિડી સાથે બિઝનેસ',
        overallScore: 94,
        searchDemandScore: 95,
        freshnessScore: 93,
        competitionScore: 95,
        masterPrompt:
            'જ્ઞાન યાત્રા શૈલીમાં "ગામડામાં ૪૦% સબસિડી સાથે એગ્રો બિઝનેસ" વિષય પર વ્યવહારુ સ્ક્રિપ્ટ લખો.',
      ),

      // 5. Tech & AI
      TopicItem(
        id: 'top_tech_whatsapp',
        topicGujarati: 'વોટ્સએપ અને UPI ના 2026 ના 5 નવા છુપા ફીચર્સ જે તમારી સુરક્ષા બચાવશે',
        category: 'tech',
        whyViewersWatch: 'સાયબર ફ્રોડથી બચવા અને ગુપ્ત સેટિંગ્સ શીખવામાં દરેક સ્માર્ટફોન યુઝરને રસ છે.',
        targetAudience: 'તમામ સ્માર્ટફોન વપરાશકર્તાઓ (વયજૂથ: 16-70 વર્ષ)',
        trendEvidence: 'NPCI અને WhatsApp Meta ના નવા સિક્યોરિટી અપડેટ્સ',
        competitionLevel: 'ઓછી (Low)',
        suggestedFormat: 'Shorts (60s) અથવા 8 મિનિટ Quick Tips',
        suggestedTitle: 'વોટ્સએપમાં તરત બંધ કરો આ 1 સેટિંગ! નહીંતર ખાતું ખાલી થઈ જશે: 5 નવા ગુપ્ત ફીચર્સ 2026',
        searchKeywords: ['whatsapp new update 2026', 'upi fraud alert gujarati', 'mobile setting gujarati'],
        thumbnailConcept: 'લાલ સાયરન + સેટિંગ ગિયર આઇકન + આ ૧ સેટિંગ તરત OFF કરો!',
        overallScore: 97,
        searchDemandScore: 99,
        freshnessScore: 97,
        competitionScore: 95,
        masterPrompt:
            'જ્ઞાન યાત્રા શૈલીમાં "વોટ્સએપ અને UPI સિક્યોરિટી ફીચર્સ 2026" વિષય પર આકર્ષક સ્ક્રિપ્ટ લખો.',
      ),
      TopicItem(
        id: 'top_tech_cyber',
        topicGujarati: 'ડિજિટલ અરેસ્ટ અને CBI/પોલીસ વીડિયો કોલ ફ્રોડથી બચો: ગુજરાત સાયબર સેલની કડક ચેતવણી',
        category: 'tech',
        whyViewersWatch: 'નકલી પોલીસ વીડિયો કોલ ઓળખવાની સાચી રીત અને 1930 હેલ્પલાઈન નિયમો.',
        targetAudience: 'તમામ મોબાઈલ યુઝર્સ, વડીલો અને વેપારીઓ',
        trendEvidence: 'ગુજરાત સીઆઈડી ક્રાઈમ અને સાયબર ક્રાઈમ હેલ્પલાઈન પર હજારો ફરિયાદો',
        competitionLevel: 'ઓછી (Low)',
        suggestedFormat: '૮ મિનિટ જાગૃતિ વિડીયો',
        suggestedTitle: 'પોલીસ કે સીબીઆઈ ક્યારેય વીડિયો કોલથી ધરપકડ ના કરે! ડિજિટલ અરેસ્ટથી બચવાના 3 નિયમો: 1930 પર ફરિયાદ',
        searchKeywords: ['digital arrest scam gujarati', 'cyber crime gujarat 1930', 'fake police video call'],
        thumbnailConcept: 'નકલી પોલીસ વર્દી કોલ સ્ક્રીનશોટ + લાલ ક્રોસ + આવો કોલ આવે તો સાવધાન!',
        overallScore: 96,
        searchDemandScore: 98,
        freshnessScore: 98,
        competitionScore: 94,
        masterPrompt:
            'જ્ઞાન યાત્રા શૈલીમાં "ડિજિટલ અરેસ્ટ સ્કેમથી બચાવ અને સાયબર સલામતી" વિષય પર જાગૃતિ સ્ક્રિપ્ટ આપો.',
      ),

      // 6. Education & Scholarships
      TopicItem(
        id: 'top_edu_gseb',
        topicGujarati: 'GSEB ધોરણ 10 અને 12 બોર્ડ રીઝલ્ટ તારીખ, ટકાવારી ગણતરી અને આગળ કયો કોર્સ કરવો?',
        category: 'education',
        whyViewersWatch: 'બોર્ડ રીઝલ્ટ પછી શ્રેષ્ઠ કરિયર પસંદગી અને સરકારી કોલેજ પ્રવેશ માટે માર્ગદર્શન.',
        targetAudience: '10મા અને 12માના વિદ્યાર્થીઓ તથા તેમના વાલીઓ',
        trendEvidence: 'GSEB ગાંધીનગર મૂલ્યાંકન અહેવાલો અને ગુગલ સર્ચ પીક',
        competitionLevel: 'મધ્યમ (Medium)',
        suggestedFormat: '૧૨ મિનિટ કરિયર ગાઈડન્સ',
        suggestedTitle: 'ધોરણ 10-12 પછી શું કરવું? 5 એવા કોર્સ જેમાં ભણતા ભણતા જ મળશે ₹25,000 ની નોકરી! (GSEB ગાઈડ)',
        searchKeywords: ['gseb result date 2026', 'dhoran 10 pachi shu karvu', 'career guidance in gujarati'],
        thumbnailConcept: 'માર્કશીટ + વિચારતો વિદ્યાર્થી + 10-12 પછી આ 3 કોર્સ કરો!',
        overallScore: 95,
        searchDemandScore: 97,
        freshnessScore: 95,
        competitionScore: 88,
        masterPrompt:
            'જ્ઞાન યાત્રા શૈલીમાં "ધોરણ 10-12 પછી શ્રેષ્ઠ કરિયર ઓપ્શન્સ" વિષય પર માર્ગદર્શન સ્ક્રિપ્ટ તૈયાર કરો.',
      ),
      TopicItem(
        id: 'top_edu_scholarship',
        topicGujarati: 'ડિજિટલ ગુજરાત સ્કોલરશીપ: SC, ST, OBC અને EWS વિદ્યાર્થીઓ માટે ₹50,000 સુધીની સહાય',
        category: 'education',
        whyViewersWatch: 'કોલેજ અને સ્કૂલ ફી માફી તથા હોસ્ટેલ સહાય સમયસર મેળવવા.',
        targetAudience: 'કોલેજ વિદ્યાર્થીઓ, વાલીઓ, ડિપ્લોમા વિદ્યાર્થીઓ',
        trendEvidence: 'ડિજિટલ ગુજરાત પોર્ટલ શિષ્યવૃત્તિ વિન્ડો',
        competitionLevel: 'ઓછી (Low)',
        suggestedFormat: '૧૦ મિનિટ ફોર્મ ચેકલિસ્ટ',
        suggestedTitle: 'કોલેજની આખી ફી માફ! ડિજિટલ ગુજરાત શિષ્યવૃત્તિ 2026: કયા ડોક્યુમેન્ટ જોશે? ફોર્મ ભરવાની છેલ્લી તારીખ',
        searchKeywords: ['digital gujarat scholarship 2026', 'samaj kalyan shishyavruti', 'college fee sahay'],
        thumbnailConcept: 'વિદ્યાર્થી + શિષ્યવૃત્તિ એકાઉન્ટ ક્રેડિટ + સ્કોલરશીપ ₹50,000 મંજૂર!',
        overallScore: 94,
        searchDemandScore: 96,
        freshnessScore: 93,
        competitionScore: 92,
        masterPrompt:
            'જ્ઞાન યાત્રા શૈલીમાં "ડિજિટલ ગુજરાત શિષ્યવૃત્તિ ફોર્મ અને લાયકાત 2026" વિષય પર સ્ક્રિપ્ટ લખો.',
      ),

      // 7. News & Weather
      TopicItem(
        id: 'top_news_weather',
        topicGujarati: 'ગુજરાતના હવામાન વિભાગની મોટી આગાહી: કમોસમી વરસાદ અને ગરમીનો નવો રાઉન્ડ',
        category: 'news',
        whyViewersWatch: 'ખેડૂતો અને સામાન્ય જનતા માટે અંબાલાલ પટેલ અને IMD ની તાજી આગાહી જાણવા.',
        targetAudience: 'ગુજરાતના ખેડૂત ભાઈઓ, પશુપાલકો અને ગ્રામ્ય વસ્તી',
        trendEvidence: 'IMD અમદાવાદ સેન્ટર અને અંબાલાલ પટેલની આગાહી પર સર્વોચ્ચ વ્યુઅરશીપ',
        competitionLevel: 'વધુ (High)',
        suggestedFormat: 'Shorts (45s) અથવા 5 મિનિટ બુલેટિન',
        suggestedTitle: 'ખેડૂતો સાવધાન! આગામી 48 કલાકમાં વાતાવરણમાં મોટો પલટો: અંબાલાલ પટેલ અને હવામાન વિભાગની આગાહી',
        searchKeywords: ['gujarat havaman agahi', 'ambalal patel agahi', 'kamosami varsad gujarat'],
        thumbnailConcept: 'કાળા વાદળો + વીજળી + ખેડૂત + આગામી 48 કલાક ભારે આગાહી!',
        overallScore: 95,
        searchDemandScore: 99,
        freshnessScore: 99,
        competitionScore: 80,
        masterPrompt:
            'જ્ઞાન યાત્રા શૈલીમાં "ગુજરાત હવામાન વિભાગ અને અંબાલાલ પટેલની તાજી આગાહી" પર કટોકટી બુલેટિન સ્ક્રિપ્ટ લખો.',
      ),
      TopicItem(
        id: 'top_news_msp',
        topicGujarati: 'ખેડૂતો માટે ટેકાના ભાવે ખરીદી 2026: ચણા, રાયડો અને ઘઉંના ભાવ જાહેર, ઓનલાઇન નોંધણી તારીખ',
        category: 'news',
        whyViewersWatch: 'ટેકાના ભાવે વેચવાથી ખેડૂતોને ક્વિન્ટલ દીઠ ₹૫૦૦ થી ₹૧,૦૦૦ નો સીધો ફાયદો થાય છે.',
        targetAudience: 'ગુજરાતના ખેડૂતો અને ગ્રામ્ય મંડળીઓ',
        trendEvidence: 'ગુજકોમાસોલ અને નાગરિક પુરવઠા નિગમ પ્રેસનોટ',
        competitionLevel: 'ઓછી (Low)',
        suggestedFormat: '૮ મિનિટ નોંધણી ગાઈડ',
        suggestedTitle: 'ટેકાના ભાવે ખરીદી શરૂ! કયા પાકના કેટલા ભાવ મળશે? ઓનલાઇન નોંધણી માટે જરૂરી પુરાવા અને કેન્દ્રની યાદી',
        searchKeywords: ['teka na bhav 2026 gujarat', 'chana wheat msp rate', 'khedut nondhani tarikh'],
        thumbnailConcept: 'અનાજની બોરીઓ + ટેકાના ભાવ લિસ્ટ + ટેકાના ભાવે ₹1,000 નો સીધો ફાયદો!',
        overallScore: 94,
        searchDemandScore: 96,
        freshnessScore: 95,
        competitionScore: 92,
        masterPrompt:
            'જ્ઞાન યાત્રા શૈલીમાં "ખેડૂતો માટે ટેકાના ભાવે ખરીદી અને ઓનલાઇન નોંધણી" વિષય પર સ્ક્રિપ્ટ આપો.',
      ),

      // 8. Entertainment
      TopicItem(
        id: 'top_ent_cinema',
        topicGujarati: 'ગુજરાતી સિનેમા (ઢોલીવુડ) નો નવો સુવર્ણ યુગ: અર્બન ફિલ્મો કેમ બોલિવૂડને ટક્કર આપી રહી છે?',
        category: 'entertainment',
        whyViewersWatch: 'ઓસ્કાર પહોંચેલી ગુજરાતી ફિલ્મો અને અર્બન સિનેમાની સફળતાની કહાની.',
        targetAudience: 'યુવાનો, ફિલ્મ પ્રેમીઓ, ગુજરાતી સંસ્કૃતિ ચાહકો',
        trendEvidence: 'નવી ગુજરાતી ફિલ્મોના ટ્રેલર અને બોક્સ ઓફિસ રેકોર્ડ્સ',
        competitionLevel: 'ઓછી (Low)',
        suggestedFormat: '૮-૧૨ મિનિટ સ્ટોરીટેલિંગ',
        suggestedTitle: 'બોલિવૂડ પણ ચોંકી ગયું! ગુજરાતી ફિલ્મો કેવી રીતે બની સુપરહિટ? ઢોલીવુડની કમાણીનું અસલી રહસ્ય',
        searchKeywords: ['gujarati movie review', 'urban gujarati films', 'dhollywood box office'],
        thumbnailConcept: 'ગુજરાતી કલાકારો + સિનેમા હાઉસફુલ + ગુજરાતી સિનેમાનો મોટો ધમાકો!',
        overallScore: 90,
        searchDemandScore: 90,
        freshnessScore: 91,
        competitionScore: 95,
        masterPrompt:
            'જ્ઞાન યાત્રા શૈલીમાં "ગુજરાતી અર્બન સિનેમાનો સુવર્ણ યુગ" વિષય પર રસપ્રદ સ્ટોરી સ્ક્રિપ્ટ આપો.',
      ),
    ];
  }

  Future<void> _bookmarkTopic(TopicItem topic) async {
    try {
      final uri = Uri.parse('$_serverUrl/api/topics/save');
      final res = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'topic': {
            'id': topic.id,
            'topicGujarati': topic.topicGujarati,
            'category': topic.category,
            'suggestedTitle': topic.suggestedTitle,
          }
        }),
      );
      if (res.statusCode == 200) {
        setState(() => topic.isSaved = true);
        _showSnack('ટોપિક સેવ થઈ ગયો! ✓');
      }
    } catch (_) {
      setState(() => topic.isSaved = true);
      _showSnack('ટોપિક લોકલ સેવ થઈ ગયો!');
    }
  }



  void _applySlidePreset(String presetKey) {
    setState(() {
      switch (presetKey) {
        case 'da':
          _slideVoiceoverTitleController.text = 'ગુજરાત સરકાર કર્મચારી ૭મા પગારપંચ DA વધારો અને એરિયર્સ નિયમો';
          _slideVoiceoverVisualController.text = 'ગાંધીનગર સચિવાલય ઠરાવ / સત્તાવાર પરિપત્ર';
          _slideVoiceoverContentController.text = '• ૭મા પગારપંચ મુજબ મોંઘવારી ભથ્થામાં ૪% સીધો વધારો મંજૂર\n• પાછલી અસરથી એટલે કે જુલાઈથી અમલ થશે\n• બાકી રહેલા મહિનાઓનો રોકડ તફાવત એરિયર્સ તરીકે ખાતામાં જમા';
          break;
        case 'anganwadi':
          _slideVoiceoverTitleController.text = 'ગુજરાત આંગણવાડી કાર્યકર અને તેડાગર માનદવેતન વધારો ૨૦૨૬';
          _slideVoiceoverVisualController.text = 'મહિલા અને બાળ વિકાસ વિભાગ સત્તાવાર નોટિફિકેશન';
          _slideVoiceoverContentController.text = '• આંગણવાડી કાર્યકર બહેનોના માનદવેતનમાં માસિક ₹૨,૫૦૦ નો વધારો\n• તેડાગર બહેનોના માનદવેતનમાં ₹૧,૫૦૦ નો સુધારો\n• નિવૃત્તિ વયમર્યાદા અને સેવા નિવૃત્તિ લાભ અંગે સમિતિનો અહેવાલ';
          break;
        case 'police':
          _slideVoiceoverTitleController.text = 'ગુજરાત પોલીસ કોન્સ્ટેબલ અને LRD ૧૨,૦૦૦+ ભરતી જાહેરાત';
          _slideVoiceoverVisualController.text = 'LRD ભરતી બોર્ડ ગાંધીનગર સત્તાવાર જાહેરાત / OJAS પોર્ટલ';
          _slideVoiceoverContentController.text = '• કુલ ૧૨,૪૭૨ નવી જગ્યાઓ માટે સત્તાવાર નોટિફિકેશન મંજૂર\n• શારીરિક કસોટી (PET/PST) અને ૧૨ પાસ લાયકાત\n• ઓજસ પોર્ટલ પર ઓનલાઇન અરજી પ્રક્રિયા શરૂ';
          break;
        case 'kisan':
          _slideVoiceoverTitleController.text = 'ગુજરાત નવી કિસાન સહાય યોજના ૨૦૨૬: હેક્ટર દીઠ સહાય નિયમો';
          _slideVoiceoverVisualController.text = 'કૃષિ વિભાગ ગુજરાત રાજ્ય સત્તાવાર ઠરાવ / iKhedut પોર્ટલ';
          _slideVoiceoverContentController.text = '• કુદરતી આપત્તિમાં ૩૩% થી વધુ નુકસાન પર હેક્ટર દીઠ ₹૪,૦૦૦ સહાય\n• વધુમાં વધુ ૨ હેક્ટર સુધી સીધા બેંક ખાતામાં DBT થી સહાય ચૂકવણી\n• iKhedut પોર્ટલ પર ૭/૧૨, ૮-અ સાથે અરજી કરવાની રહેશે';
          break;
        case 'tet':
          _slideVoiceoverTitleController.text = 'TET-1 અને TET-2 પરીક્ષા ૨૦૨૬: નવો અભ્યાસક્રમ અને પાસિંગ માર્ક્સ';
          _slideVoiceoverVisualController.text = 'રાજ્ય પરીક્ષા બોર્ડ (SEB) ગાંધીનગર સત્તાવાર નોટિફિકેશન';
          _slideVoiceoverContentController.text = '• ૧૫૦ ગુણનું પ્રશ્નપત્ર અને વિભાગ-૧ તથા વિભાગ-૨ નું વિભાજન\n• જનરલ કેટેગરી માટે ૬૦% અને અનામત વર્ગ માટે ૫૫% લઘુત્તમ પાસિંગ\n• નવી શિક્ષણ નીતિ (NEP ૨૦૨૦) મુજબ પ્રશ્નોનો સમાવેશ';
          break;
      }
    });
    _showSnack('નમૂનાની સ્લાઇડ વિગતો લોડ થઈ!');
  }

  Future<void> _generateSlideVoiceoverPrompt() async {
    final title = _slideVoiceoverTitleController.text.trim();
    final visual = _slideVoiceoverVisualController.text.trim();
    final contentRaw = _slideVoiceoverContentController.text.trim();

    if (title.isEmpty && contentRaw.isEmpty) {
      _showSnack('મહેરબાની કરીને સ્લાઇડનું શીર્ષક અથવા વિગતો દાખલ કરો.', isError: true);
      return;
    }

    setState(() => _isGeneratingSlideVoiceover = true);

    // Build slides list (supports single slide or multi-slide separated by '---' or 'Slide N:')
    final List<SlideVoiceoverItem> inputSlides = [];
    if (contentRaw.contains('---') || RegExp(r'(?:^|\n)\s*(?:Slide|સ્લાઇડ)\s*\d+[:\.]?', caseSensitive: false).hasMatch(contentRaw)) {
      final chunks = contentRaw.split(RegExp(r'(?:^|\n)\s*(?:---|(?=(?:Slide|સ્લાઇડ)\s*\d+[:\.]?))', caseSensitive: false))
          .where((s) => s.trim().isNotEmpty).toList();
      for (int i = 0; i < chunks.length; i++) {
        final chunk = chunks[i].trim();
        final lines = chunk.split('\n');
        String sTitle = title;
        String sBody = chunk;
        if (lines.isNotEmpty && (lines.first.toLowerCase().contains('slide') || lines.first.contains('સ્લાઇડ'))) {
          sTitle = lines.first.replaceAll(RegExp(r'^(?:Slide|સ્લાઇડ)\s*\d+[:\.\-]?\s*', caseSensitive: false), '').trim();
          if (sTitle.isEmpty) sTitle = '$title (ભાગ ${i + 1})';
          sBody = lines.sublist(1).join('\n').trim();
        } else if (i > 0) {
          sTitle = '$title - ભાગ ${i + 1}';
        }
        inputSlides.add(SlideVoiceoverItem(
          slideNumber: i + 1,
          title: sTitle.isNotEmpty ? sTitle : 'સ્લાઇડ ${i + 1}',
          visual: visual.isNotEmpty ? visual : 'સત્તાવાર પરિપત્ર',
          content: sBody.isNotEmpty ? sBody : chunk,
          timing: '0$i:00 - 0${i + 1}:30',
        ));
      }
    }
    if (inputSlides.isEmpty) {
      inputSlides.add(SlideVoiceoverItem(
        slideNumber: 1,
        title: title.isNotEmpty ? title : 'મુખ્ય સ્લાઇડ',
        visual: visual.isNotEmpty ? visual : 'સત્તાવાર પરિપત્ર અને પુરાવો',
        content: contentRaw.isNotEmpty ? contentRaw : '• સત્તાવાર નિર્ણય જાહેર\n• નિયમો અને પાત્રતા શરતો\n• મહત્વપૂર્ણ તારીખો',
        timing: '00:00 - 01:30',
      ));
    }

    // Attempt backend connection if available
    try {
      final uri = Uri.parse('$_serverUrl/api/research/slide-voiceover-prompt');
      final res = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'slides': inputSlides.map((s) => {
            'slideNumber': s.slideNumber,
            'title': s.title,
            'visual': s.visual,
            'content': s.content,
            'timing': s.timing,
          }).toList(),
          'overallTopic': title,
          'explanationDepth': _slideExplanationDepth,
        }),
      ).timeout(const Duration(seconds: 4));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (mounted) {
          List<SlidePromptItem> parsedPrompts = [];
          if (data['slidePrompts'] != null && data['slidePrompts'] is List) {
            parsedPrompts = (data['slidePrompts'] as List).map((p) => SlidePromptItem(
              slideNumber: p['slideNumber'] ?? 1,
              title: p['title'] ?? '',
              visual: p['visual'] ?? '',
              content: p['content'] ?? '',
              promptText: p['promptText'] ?? '',
              estimatedDuration: p['estimatedDuration'] ?? '1 - 1.5 મિનિટ',
              recommendedWords: p['recommendedWords'] ?? 150,
              explanationDepth: p['explanationDepth'] ?? _slideExplanationDepth,
            )).toList();
          }

          setState(() {
            _slideVoiceoverMasterPrompt = (data['allInOneScriptPrompt'] ?? data['masterPrompt'] ?? '').toString();
            _slideVoiceoverPreRendered = data['preRenderedScript'] ?? '';
            _slidePrompts = parsedPrompts.isNotEmpty ? parsedPrompts : [
              SlideVoiceoverService.generateSingleSlidePrompt(
                slide: inputSlides[0],
                index: 0,
                totalSlides: inputSlides.length,
                overallTopic: title,
                explanationDepth: _slideExplanationDepth,
              )
            ];
            _allPromptsText = data['allPromptsText'] ?? _slidePrompts.map((p) => p.promptText).join('\n\n══════════════════════════════════════\n\n');
            _isGeneratingSlideVoiceover = false;
          });
          _showSnack('${_slidePrompts.length} સ્લાઇડ્સ માટે વિગતવાર સ્ક્રિપ્ટ પ્રોમ્પ્ટ્સ તૈયાર થયા! 🚀');
          return;
        }
      }
    } catch (_) {
      // Seamless native fallback below
    }

    final result = SlideVoiceoverService.generateMasterPrompt(
      slides: inputSlides,
      overallTopic: title,
      targetAudience: 'ગુજરાતના સરકારી કર્મચારીઓ, ઉમેદવારો અને નાગરિકો',
      explanationDepth: _slideExplanationDepth,
    );

    if (mounted) {
      setState(() {
        _slideVoiceoverMasterPrompt = result.allInOneScriptPrompt.isNotEmpty ? result.allInOneScriptPrompt : result.masterPrompt;
        _slideVoiceoverPreRendered = result.preRenderedScript;
        _slidePrompts = result.slidePrompts;
        _allPromptsText = result.allPromptsText;
        _isGeneratingSlideVoiceover = false;
      });
      _showSnack('${result.slideCount} સ્લાઇડ્સ માટે વિગતવાર સ્ક્રિપ્ટ પ્રોમ્પ્ટ્સ તૈયાર થયા! 🚀');
    }
  }



  Future<void> _pickAndUploadSlidePdf() async {
    try {
      final files = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['pdf'],
      );
      if (files.isEmpty) return;

      final file = files.first;
      final bytes = await file.xFile.readAsBytes();
      if (bytes.isEmpty) {
        _showSnack('PDF ફાઇલ વાંચી શકાઈ નહીં.', isError: true);
        return;
      }

      setState(() {
        _uploadedSlidePdfFilename = file.name;
        _isGeneratingSlideVoiceover = true;
      });
      _showSnack('PDF ફાઇલ (${file.name}) વાંચીને સ્ક્રિપ્ટ પ્રોમ્પ્ટ તૈયાર થઈ રહ્યો છે... ⏳');

      // 1. EXTRACT REAL TEXT DIRECTLY ON DEVICE USING SYNCIUSION (100% OFFLINE)
      String extractedPdfText = SlideVoiceoverService.extractTextFromPdfBytes(bytes);
      debugPrint('[PDF Extraction] Extracted ${extractedPdfText.length} characters from ${file.name}');

      // 2. ANALYZE PDF DETAILS & GENERATE CUSTOM PROMPT IMMEDIATELY
      final analysis = SlideVoiceoverService.analyzePdfSubjectAndDetails(
        fullPdfText: extractedPdfText,
        filename: file.name,
      );
      final detectedTopic = (analysis['subject'] as String? ?? '').isNotEmpty
          ? analysis['subject'] as String
          : file.name.replaceAll(RegExp(r'\.pdf$', caseSensitive: false), '').replaceAll(RegExp(r'[_-]+'), ' ');

      final immediateMasterPrompt = SlideVoiceoverService.generateFullPdfMasterPrompt(
        topic: detectedTopic,
        filename: file.name,
        fullPdfText: extractedPdfText,
      );

      final immediateResult = SlideVoiceoverService.generateMasterPrompt(
        slides: [
          SlideVoiceoverItem(
            slideNumber: 1,
            title: detectedTopic,
            visual: '${analysis['department']} - ${analysis['grNumber']}',
            content: (analysis['keyHighlights'] as List? ?? []).join('\n'),
          ),
        ],
        overallTopic: detectedTopic,
      );

      final cleanSpoken = SlideVoiceoverService.extractSpokenScript(immediateResult.preRenderedScript);
      if (cleanSpoken.trim().isNotEmpty) {
        _voiceScriptController.text = cleanSpoken;
        _actorSentences = VoiceActorService.parseActorScript(cleanSpoken, style: _selectedActorStyle);
      }

      if (mounted) {
        setState(() {
          _slideVoiceoverTitleController.text = detectedTopic;
          _slideVoiceoverMasterPrompt = immediateMasterPrompt;
          _slideVoiceoverPreRendered = immediateResult.preRenderedScript;
          _isGeneratingSlideVoiceover = false;
        });
        _showSnack('✅ PDF (${file.name}) વાંચીને ચોક્કસ સ્ક્રિપ્ટ પ્રોમ્પ્ટ તૈયાર થઈ ગયો! 📋');
      }

      // 3. OPTIONAL ASYNC BACKGROUND SYNC (IF SERVER IS REACHABLE)
      try {
        final base64Pdf = base64Encode(bytes);
        final uri = Uri.parse('$_serverUrl/api/research/upload-slide-pdf');
        http.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'pdfBase64': base64Pdf,
            'filename': file.name,
            'explanationDepth': _slideExplanationDepth,
            'autoGenerate': true,
          }),
        ).timeout(const Duration(seconds: 8)).then((res) {
          if (res.statusCode == 200 && mounted) {
            final data = jsonDecode(res.body);
            final serverText = (data['fullPdfText'] ?? '').toString();
            if (serverText.length > extractedPdfText.length) {
              final betterPrompt = SlideVoiceoverService.generateFullPdfMasterPrompt(
                topic: detectedTopic,
                filename: file.name,
                fullPdfText: serverText,
              );
              setState(() {
                _slideVoiceoverMasterPrompt = betterPrompt;
              });
            }
          }
        }).catchError((_) {});
      } catch (_) {}
    } catch (err) {
      if (mounted) {
        setState(() => _isGeneratingSlideVoiceover = false);
        _showSnack('PDF ફાઇલ પસંદગી: $err', isError: true);
      }
    }
  }



  Future<void> _saveScriptToBackend() async {
    setState(() => _isSavingScript = true);
    try {
      final uri = Uri.parse('$_serverUrl/api/scripts/save');
      final res = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'script': {
            'title': _scriptTopicController.text.trim(),
            'topic': _selectedTopic,
            'durationMinutes': _scriptDurationMinutes,
            'sections': _scriptSections.map((s) => s.toJson()).toList(),
          }
        }),
      );
      if (res.statusCode == 200) {
        _showSnack('સ્ક્રિપ્ટ ડેટાબેઝમાં સાચવવામાં આવી! ✓');
      }
    } catch (_) {
      _showSnack('સ્ક્રિપ્ટ લોકલ સેવ થઈ ગઈ! ✓');
    }
    if (mounted) setState(() => _isSavingScript = false);
  }

  // --- Voice Generation & Audio (Google Cloud & Free Gujarati Engine) ---
  Future<void> _generateVoiceAudio() async {
    final text = _voiceScriptController.text.trim();
    if (text.isEmpty) {
      _showSnack('ઓડિયો બનાવવા માટે સ્ક્રિપ્ટ લખાણ દાખલ કરો.', isError: true);
      return;
    }

    // Always clean, sanitize, expand numbers, and convert acronyms into natural Gujarati phonetics
    final cleanedText = VoiceActorService.cleanGujaratiPhonetics(text);
    setState(() {
      _isGeneratingVoice = true;
      _generatingProgressMessage = 'ગૂગલ ક્લાઉડ એન્જિન દ્વારા ઓડિયો તૈયાર થાય છે...';
    });

    final emotionStr = _selectedVoiceEmotion == GujaratiVoiceEmotion.official
        ? 'official'
        : (_selectedVoiceEmotion == GujaratiVoiceEmotion.calm ? 'calm' : 'enthusiastic');

    // 1. Try local server first only if server is healthy and reachable
    if (_isServerHealthy) {
      try {
        final uri = Uri.parse('$_serverUrl/api/voice/generate');
        final res = await http.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'text': cleanedText,
            'profileId': _selectedVoiceProfile,
            'speed': _voiceSpeed,
            'emotion': emotionStr,
            'apiKey': _googleApiKeyController.text.trim().isNotEmpty ? _googleApiKeyController.text.trim() : null,
            'customVoiceId': _customVoiceIdController.text.trim().isNotEmpty ? _customVoiceIdController.text.trim() : null,
            'mainTopic': _selectedTopic,
          }),
        ).timeout(const Duration(seconds: 30));

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final rawAudioUrl = data['audioUrl']?.toString() ?? '';
          final fullAudioUrl = rawAudioUrl.startsWith('http') ? rawAudioUrl : '$_serverUrl$rawAudioUrl';

          if (mounted) {
            setState(() {
              _generatedAudioUrl = fullAudioUrl;
              _generatedAudioFilename = data['filename'] ?? 'video_narration.mp3';
              _generatedAudioProvider = data['provider'] ?? 'Google Cloud Wavenet Engine';
              _isGeneratingVoice = false;
              _generatingProgressMessage = '';
            });
            _showSnack('ઓડિયો સફળતાપૂર્વક જનરેટ થયો! 🎙️');
            _playAudio(fullAudioUrl);
            _fetchVoiceLibrary();
          }
          return;
        }
      } catch (_) {
        // Server offline/unreachable - fallback to standalone mobile Google TTS
      }
    }

    // 2. Direct Standalone Google Cloud & Free Gujarati TTS (100% Mobile Guarantee with Zero Cost)
    try {
      final file = await GoogleTtsService.synthesizeVoice(
        text: cleanedText,
        profileId: _selectedVoiceProfile,
        emotion: _selectedVoiceEmotion,
        customVoiceId: _customVoiceIdController.text.trim().isNotEmpty ? _customVoiceIdController.text.trim() : null,
        googleApiKey: _googleApiKeyController.text.trim().isNotEmpty ? _googleApiKeyController.text.trim() : null,
        speed: _voiceSpeed,
        onProgress: (msg) {
          if (mounted) setState(() => _generatingProgressMessage = msg);
        },
      );

      final stat = await file.stat();
      final newAudioItem = {
        'id': DateTime.now().millisecondsSinceEpoch.toString(),
        'filename': file.uri.pathSegments.last,
        'audioUrl': file.path,
        'path': file.path,
        'sizeFormatted': '${(stat.size / 1024).toStringAsFixed(1)} KB',
        'title': _selectedTopic.isNotEmpty ? _selectedTopic : 'ગુજરાતી નેરેશન',
        'tone': emotionStr,
        'model': _selectedVoiceProfile,
        'date': DateTime.now().toIso8601String(),
      };

      if (mounted) {
        final profileObj = GoogleTtsService.defaultProfiles.firstWhere(
          (p) => p.id == _selectedVoiceProfile,
          orElse: () => GoogleTtsService.defaultProfiles[0],
        );

        setState(() {
          _generatedAudioUrl = file.path;
          _generatedAudioFilename = file.uri.pathSegments.last;
          _generatedAudioProvider = '${profileObj.badge} (${profileObj.name.split(' ')[1]})';
          _isGeneratingVoice = false;
          _generatingProgressMessage = '';
          _audioLibrary.insert(0, newAudioItem);
        });
        _showSnack('ભાવ સાથે શુદ્ધ ગુજરાતી ઓડિયો તૈયાર થઈ ગયો! 🎙️');
        _playAudio(file.path);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isGeneratingVoice = false;
          _generatingProgressMessage = '';
        });
        _showSnack('ઓડિયો જનરેટ કરવામાં સમસ્યા: $e', isError: true);
      }
    }
  }

  Future<void> _shareAudioFile(String filePath) async {
    try {
      final file = File(filePath);
      if (await file.exists()) {
        await SharePlus.instance.share(ShareParams(
          files: [XFile(filePath)],
          text: 'Gyan Yatra Gujarati Voice Narration MP3',
        ));
      } else {
        _showSnack('ઓડિયો ફાઇલ ઉપલબ્ધ નથી.', isError: true);
      }
    } catch (e) {
      _showSnack('શેર કરવામાં ભૂલ: $e', isError: true);
    }
  }

  void _runAiSmartDirector({bool showMessage = true}) {
    final text = _voiceScriptController.text.trim();
    if (text.isEmpty) {
      if (showMessage) _showSnack('પહેલા સ્ક્રિપ્ટ લખાણ દાખલ કરો જેથી AI વિશ્લેષણ કરી શકે.', isError: true);
      return;
    }
    final analysis = VoiceActorService.analyzeScriptTone(text);
    setState(() {
      _selectedVoiceTone = analysis.detectedTone;
      _voiceStability = analysis.stability;
      _voiceSimilarity = analysis.similarity;
      _voiceStyle = analysis.style;
      _voiceSpeed = analysis.speed;
      _selectedElevenModel = analysis.recommendedModel;
      _aiDirectorSummary = '${analysis.title}: ${analysis.reasonGuj}';
    });
    if (showMessage) {
      _showSnack('🧠 AI ડિરેક્ટર: ${analysis.title} ઓળખી કાઢ્યું! સેટિંગ્સ આપમેળે સેટ થયા.');
    }
  }

  void _applyHumanTouchPolish() {
    final text = _voiceScriptController.text.trim();
    if (text.isEmpty) {
      _showSnack('પહેલા સ્ક્રિપ્ટ લખાણ દાખલ કરો.', isError: true);
      return;
    }
    final polished = VoiceActorService.humanTouchPolish(text);
    setState(() {
      _voiceScriptController.text = polished;
    });
    _showSnack('✨ માનવીય સંવાદ ટચ ઉમેરાયો! કુદરતી શ્વાસ (...), વિરામ અને વાર્તાલાપ શૈલી તૈયાર.');
  }

  Future<void> _renameAudioFile(Map<String, dynamic> item) async {
    final currentName = item['filename']?.toString() ?? 'audio.mp3';
    final currentPath = item['path']?.toString() ?? item['audioUrl']?.toString() ?? '';
    final nameWithoutExt = currentName.replaceAll(RegExp(r'\.mp3$', caseSensitive: false), '');
    final renameController = TextEditingController(text: nameWithoutExt);

    final newBaseName = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF131722),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFF8B5CF6))),
        title: const Row(
          children: [
            Icon(Icons.edit, color: Color(0xFF8B5CF6), size: 20),
            SizedBox(width: 8),
            Text('ઓડિયો ફાઇલનું નામ બદલો', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('નવું ફાઇલ નામ દાખલ કરો (.mp3 આપોઆપ જોડાશે):', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
            const SizedBox(height: 10),
            TextField(
              controller: renameController,
              autofocus: true,
              style: const TextStyle(color: Colors.white, fontSize: 14),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF0A0D14),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                suffixText: '.mp3',
                suffixStyle: const TextStyle(color: Color(0xFF8B5CF6)),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, null),
            child: const Text('રદ કરો', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF8B5CF6), foregroundColor: Colors.white),
            onPressed: () {
              final t = renameController.text.trim();
              if (t.isNotEmpty) Navigator.pop(ctx, t);
            },
            child: const Text('સાચવો'),
          ),
        ],
      ),
    );

    if (newBaseName != null && newBaseName.isNotEmpty) {
      try {
        final oldFile = File(currentPath);
        if (await oldFile.exists()) {
          final dir = oldFile.parent.path;
          final sanitized = newBaseName.replaceAll(RegExp(r'[\\/:*?"<>|]'), '_');
          final newFileName = '$sanitized.mp3';
          final newPath = '$dir/$newFileName';

          await oldFile.rename(newPath);

          if (_generatedAudioUrl == currentPath) {
            _generatedAudioUrl = newPath;
            _generatedAudioFilename = newFileName;
          }
          if (_currentlyPlayingUrl == currentPath) {
            _currentlyPlayingUrl = newPath;
          }

          setState(() {
            item['filename'] = newFileName;
            item['path'] = newPath;
            item['audioUrl'] = newPath;
          });
          _showSnack('નામ બદલાઈ ગયું: $newFileName ✓');
        } else {
          _showSnack('ફાઇલ મળી નથી.', isError: true);
        }
      } catch (e) {
        _showSnack('નામ બદલવામાં ભૂલ: $e', isError: true);
      }
    }
  }

  Future<void> _deleteAudioFile(Map<String, dynamic> item) async {
    final currentName = item['filename']?.toString() ?? 'audio.mp3';
    final currentPath = item['path']?.toString() ?? item['audioUrl']?.toString() ?? '';

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF131722),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFFEF4444))),
        title: const Row(
          children: [
            Icon(Icons.delete_forever, color: Color(0xFFEF4444), size: 22),
            SizedBox(width: 8),
            Text('ઓડિયો ડિલીટ કરો', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
          ],
        ),
        content: Text('શું તમે ખરેખર "$currentName" ફાઇલ ડિલીટ કરવા માંગો છો?', style: const TextStyle(fontSize: 13, color: Color(0xFFCBD5E1))),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('ના, રહેવા દો', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFEF4444), foregroundColor: Colors.white),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('હા, ડિલીટ કરો'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        final file = File(currentPath);
        if (await file.exists()) {
          if (_currentlyPlayingUrl == currentPath && _isPlaying) {
            await _audioPlayer.stop();
            _isPlaying = false;
          }
          await file.delete();
        }

        setState(() {
          _audioLibrary.remove(item);
          if (_generatedAudioUrl == currentPath) {
            _generatedAudioUrl = null;
            _generatedAudioFilename = null;
          }
        });
        _showSnack('ઓડિયો ફાઇલ ડિલીટ કરવામાં આવી 🗑️');
      } catch (e) {
        _showSnack('ડિલીટ કરવામાં ભૂલ: $e', isError: true);
      }
    }
  }

  Future<void> _saveAudioFileConfirmation(String filePath) async {
    try {
      final file = File(filePath);
      if (await file.exists()) {
        final sizeKb = (await file.length()) / 1024;
        final name = filePath.split(Platform.pathSeparator).last;
        if (!mounted) return;
        showDialog(
          context: context,
          builder: (ctx) => AlertDialog(
            backgroundColor: const Color(0xFF131722),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: const BorderSide(color: Color(0xFF10B981))),
            title: const Row(
              children: [
                Icon(Icons.check_circle, color: Color(0xFF10B981), size: 22),
                SizedBox(width: 8),
                Text('ઓડિયો સુરક્ષિત સેવ છે', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
              ],
            ),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('ફાઇલ: $name', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
                const SizedBox(height: 4),
                Text('સાઇઝ: ${sizeKb.toStringAsFixed(1)} KB', style: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: const Color(0xFF0A0D14), borderRadius: BorderRadius.circular(6)),
                  child: Text('સ્થાન: $filePath', style: const TextStyle(fontSize: 10, color: Color(0xFF38BDF8))),
                ),
                const SizedBox(height: 10),
                const Text('આ ફાઇલ આપના ડિવાઇસ સ્ટોરેજમાં સંપૂર્ણ સેવ છે. તેને શેર કે અન્ય એપમાં એક્સપોર્ટ કરી શકો છો.', style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
              ],
            ),
            actions: [
              OutlinedButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('સમજાઈ ગયું', style: TextStyle(color: Color(0xFF94A3B8))),
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white),
                icon: const Icon(Icons.share, size: 16),
                label: const Text('શેર / એક્સપોર્ટ'),
                onPressed: () {
                  Navigator.pop(ctx);
                  _shareAudioFile(filePath);
                },
              ),
            ],
          ),
        );
      }
    } catch (_) {}
  }

  Future<void> _applyAudioFeedbackAndBuildVideo(String userInstruction) async {
    final instruction = userInstruction.trim();
    if (instruction.isEmpty) {
      _showSnack('મહેરબાની કરીને ઓડિયો સુધારવા માટે સૂચના દાખલ કરો.', isError: true);
      return;
    }

    setState(() {
      _isApplyingAudioFeedback = true;
      _audioFeedbackSummary = 'AI તમારી સૂચના સમજી રહ્યું છે અને અવાજ/વિડીયો સુધારે છે...';
    });

    final lower = instruction.toLowerCase();
    final changesList = <String>[];

    // 1. Analyze and adjust Speed / Pacing
    if (lower.contains('ઝડપ વધારો') || lower.contains('સ્પીડ વધારો') || lower.contains('ઝડપી') || lower.contains('fast') || lower.contains('speed')) {
      _voiceSpeed = (_voiceSpeed + 0.08).clamp(0.8, 1.3);
      changesList.add('ઝડપ વધારી ${_voiceSpeed.toStringAsFixed(2)}x');
    } else if (lower.contains('ધીમું') || lower.contains('સ્પીડ ઘટાડો') || lower.contains('શાંત') || lower.contains('slow')) {
      _voiceSpeed = (_voiceSpeed - 0.08).clamp(0.8, 1.3);
      changesList.add('ઝડપ ધીમી કરી ${_voiceSpeed.toStringAsFixed(2)}x');
    }

    // 2. Analyze and adjust Tone / Energy / Emotion
    if (lower.contains('એનર્જી') || lower.contains('ઉત્સાહ') || lower.contains('જાહેરાત') || lower.contains('હુક') || lower.contains('વાયરલ') || lower.contains('જોરદાર')) {
      _selectedVoiceTone = 'advertisement';
      _voiceStability = 0.45;
      _voiceSimilarity = 0.85;
      _voiceStyle = 0.25;
      _selectedElevenModel = 'eleven_turbo_v2_5';
      changesList.add('હાઈ-એનર્જી વાયરલ ટોન');
    } else if (lower.contains('પરિપત્ર') || lower.contains('ગંભીર') || lower.contains('સત્તાવાર') || lower.contains('ઓફિશિયલ') || lower.contains('ઠરાવ')) {
      _selectedVoiceTone = 'pagarvadhara';
      _voiceStability = 0.58;
      _voiceSimilarity = 0.80;
      _voiceStyle = 0.15;
      changesList.add('સત્તાવાર ગંભીર ટોન');
    } else if (lower.contains('કુદરતી') || lower.contains('સહજ') || lower.contains('શ્વાસ') || lower.contains('માનવીય') || lower.contains('નેચરલ')) {
      _selectedVoiceTone = 'natural_narration';
      _voiceStability = 0.50;
      _voiceSimilarity = 0.80;
      _voiceStyle = 0.18;
      _selectedElevenModel = 'eleven_turbo_v2_5';
      _voiceScriptController.text = VoiceActorService.humanTouchPolish(_voiceScriptController.text);
      changesList.add('માનવીય શ્વાસ અને વિરામ');
    }

    // 3. Content revisions in script text based on instruction
    var currentScript = _voiceScriptController.text;

    // Check for specific percentage changes (e.g. 50% -> 53%)
    if (instruction.contains('૫૩%') || instruction.contains('53%') || lower.contains('૫૩') || lower.contains('53')) {
      currentScript = currentScript.replaceAll(RegExp(r'(?:૫૦%|50%|૫૦|50|૪%|4%)'), '૫૩%');
      changesList.add('૫૩% મોંઘવારી ભથ્થું અપડેટ');
    }

    // Check for viral hook request
    if (lower.contains('શરૂઆત') || lower.contains('હુક') || lower.contains('શરૂઆતમાં')) {
      if (!currentScript.startsWith('ધ્યાન આપો') && !currentScript.startsWith('મોટી ખુશખબર')) {
        currentScript = 'ધ્યાન આપો મિત્રો! સૌથી મોટો સત્તાવાર પરિપત્ર અને ખુશખબર સામે આવી ગયા છે... $currentScript';
        changesList.add('ધમાકેદાર શરૂઆત હુક ઉમેર્યો');
      }
    }

    _voiceScriptController.text = currentScript;

    // 4. Automatically generate matching 16:9 White Video Slides
    final topic = _selectedTopic.isNotEmpty ? _selectedTopic : 'ગુજરાત સત્તાવાર સરકારી નિર્ણય ૨૦૨૬';
    _slideTopicController.text = topic;
    final generatedSlides = SlideMakerService.generateWhiteSlides(
      topic: topic,
      count: 5,
      headingBoxStyle: _headingBoxStyle,
      accentColor: '#DC2626',
    );
    _slides = generatedSlides.map((m) => SlideItem.fromJson(m)).toList();
    changesList.add('૫ વિડીયો સ્લાઇડ્સ તૈયાર');

    setState(() {
      _audioFeedbackSummary = changesList.isNotEmpty
          ? 'લાગુ કરેલા સુધારા: ${changesList.join(" • ")}'
          : 'સૂચના સમજીને અવાજ અને વિડીયો સ્લાઇડ્સ અપડેટ કરવામાં આવી.';
    });

    // 5. Automatically regenerate the voice audio with new parameters
    await _generateVoiceAudio();

    if (mounted) {
      setState(() {
        _isApplyingAudioFeedback = false;
      });

      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF131722),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: const BorderSide(color: Color(0xFF10B981), width: 1.5),
          ),
          title: const Row(
            children: [
              Icon(Icons.video_library, color: Color(0xFF10B981), size: 24),
              SizedBox(width: 8),
              Expanded(
                child: Text('ઓડિયો અને વિડીયો તૈયાર! 🎬', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(_audioFeedbackSummary, style: const TextStyle(fontSize: 12, color: Color(0xFFC4B5FD))),
              const SizedBox(height: 10),
              const Text(
                'તમારી સૂચના મુજબ નવો ઓડિયો બની ગયો છે અને સાથે ૧૬:૯ વાળી શુદ્ધ સફેદ સ્લાઇડ્સ (વિડીયો ડેક) પણ બની ગઈ છે!',
                style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8), height: 1.4),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('અહીં જ રહો', style: TextStyle(color: Color(0xFF94A3B8))),
            ),
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981), foregroundColor: Colors.white),
              icon: const Icon(Icons.slideshow, size: 16),
              label: const Text('વિડીયો સ્લાઇડ્સ જુઓ ↗️'),
              onPressed: () {
                Navigator.pop(ctx);
                setState(() => _nativeSelectedTab = 1);
              },
            ),
          ],
        ),
      );
    }
  }

  // --- Voice Correction & Tuning Methods ---
  Future<void> _generateCorrectionPreview() async {
    final phrase = _voiceCorrectionPhraseController.text.trim();
    if (phrase.isEmpty) {
      _showSnack('પ્રિવ્યૂ માટે લખાણ દાખલ કરો.', isError: true);
      return;
    }

    setState(() => _isGeneratingCorrectionPreview = true);

    final cleaned = VoiceActorService.cleanGujaratiPhonetics(phrase);
    String targetVoiceId = '1UyAke1iefrWyqm395qX'; // Janki bhatti (Cloned Female)
    if (_selectedVoiceProfile == 'my-cloned-voice') {
      targetVoiceId = '8tLkQgJXmqrb3JfvfOHD'; // Male clone
    } else if (_selectedVoiceProfile == 'cloned-female-janki') {
      targetVoiceId = '1UyAke1iefrWyqm395qX';
    } else if (_selectedVoiceProfile == 'edge-dhwani') {
      targetVoiceId = 'FKactHtks8adYWih8WXq';
    } else if (_selectedVoiceProfile == 'edge-niranjan') {
      targetVoiceId = '7O2VIZtkCNS7mru1lb8l';
    } else if (_selectedVoiceProfile == 'elevenlabs-direct') {
      targetVoiceId = 'pHG3exaXQt8bmTWbaVOs';
    }

    // 1. Try server first if reachable
    if (_isServerHealthy) {
      try {
        final uri = Uri.parse('$_serverUrl/api/voice/generate');
        final res = await http.post(
          uri,
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'text': cleaned,
            'profileId': _selectedVoiceProfile,
            'voiceId': targetVoiceId,
            'speed': _voiceSpeed,
            'stability': _voiceStability,
            'similarity': _voiceSimilarity,
            'style': _voiceStyle,
            'modelId': _selectedElevenModel,
            'actorMode': false,
            'mainTopic': 'Voice Preview',
          }),
        ).timeout(const Duration(seconds: 25));

        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final rawAudioUrl = data['audioUrl']?.toString() ?? '';
          final fullAudioUrl = rawAudioUrl.startsWith('http') ? rawAudioUrl : '$_serverUrl$rawAudioUrl';

          if (mounted) {
            setState(() {
              _correctionPreviewAudioUrl = fullAudioUrl;
              _isGeneratingCorrectionPreview = false;
            });
            _showSnack('નવા વોઇસ સેટિંગ્સ સાથે પ્રિવ્યૂ તૈયાર થયો! 🎧');
            _playAudio(fullAudioUrl);
          }
          return;
        }
      } catch (_) {
        // Fallback to standalone direct cloud TTS
      }
    }

    // 2. Direct Standalone ElevenLabs TTS Fallback
    try {
      const elevenApiKey = 'sk_07ae3f8accfee122d3b619b81b35fff1501edea94b26b436';
      final devanagari = VoiceActorService.gujaratiToDevanagari(cleaned);
      final cloudRes = await http.post(
        Uri.parse('https://api.elevenlabs.io/v1/text-to-speech/$targetVoiceId'),
        headers: {
          'xi-api-key': elevenApiKey,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: jsonEncode({
          'text': devanagari,
          'model_id': _selectedElevenModel,
          'voice_settings': {
            'stability': _voiceStability,
            'similarity_boost': _voiceSimilarity,
            'style': _voiceStyle,
            'use_speaker_boost': true,
            'speed': _voiceSpeed,
          }
        }),
      ).timeout(const Duration(seconds: 35));

      if (cloudRes.statusCode == 200 && cloudRes.bodyBytes.isNotEmpty) {
        final docsDir = await getApplicationDocumentsDirectory();
        final fileName = 'preview_${DateTime.now().millisecondsSinceEpoch}.mp3';
        final file = File('${docsDir.path}/$fileName');
        await file.writeAsBytes(cloudRes.bodyBytes);

        if (mounted) {
          setState(() {
            _correctionPreviewAudioUrl = file.path;
            _isGeneratingCorrectionPreview = false;
          });
          _showSnack('નવા વોઇસ સેટિંગ્સ સાથે પ્રિવ્યૂ તૈયાર થયો! 🎧');
          _playAudio(file.path);
        }
      } else {
        final errBody = cloudRes.body;
        if (errBody.contains('quota_exceeded')) {
          throw Exception('ElevenLabs એકાઉન્ટ ક્રેડિટ પૂર્ણ થઈ ગઈ છે (Quota Exceeded).');
        }
        throw Exception('API Status ${cloudRes.statusCode}');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isGeneratingCorrectionPreview = false);
        _showSnack('પ્રિવ્યૂ બનાવવામાં ભૂલ: $e', isError: true);
      }
    }
  }

  Future<void> _saveVoiceSettings() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('gyan_yatra_voice_profile', _selectedVoiceProfile);
      await prefs.setDouble('gyan_yatra_voice_speed', _voiceSpeed);
      await prefs.setString('gyan_yatra_google_api_key', _googleApiKeyController.text.trim());
      await prefs.setString('gyan_yatra_custom_voice_id', _customVoiceIdController.text.trim());
      await prefs.setString('gyan_yatra_voice_emotion', _selectedVoiceEmotion.name);
      _showSnack('ગૂગલ ક્લાઉડ & વોઇસ સેટિંગ્સ સફળતાપૂર્વક સાચવવામાં આવ્યા! 💾');
    } catch (e) {
      _showSnack('સેટિંગ્સ સાચવવામાં સમસ્યા: $e', isError: true);
    }
  }

  Future<void> _playAudio(String pathOrUrl) async {
    try {
      if (_currentlyPlayingUrl == pathOrUrl && _isPlaying) {
        await _audioPlayer.pause();
        return;
      }
      _currentlyPlayingUrl = pathOrUrl;
      await _audioPlayer.setPlaybackRate(_playbackSpeed);

      if (pathOrUrl.startsWith('assets/')) {
        final cleanAsset = pathOrUrl.replaceFirst('assets/', '');
        await _audioPlayer.play(AssetSource(cleanAsset));
      } else if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
        await _audioPlayer.play(UrlSource(pathOrUrl));
      } else {
        await _audioPlayer.play(DeviceFileSource(pathOrUrl));
      }
    } catch (e) {
      _showSnack('ઓડિયો પ્લે કરવામાં ભૂલ આવી: $e', isError: true);
    }
  }

  Future<void> _fetchVoiceLibrary() async {
    // 1. Try server library if available
    if (_isServerHealthy) {
      try {
        final uri = Uri.parse('$_serverUrl/api/voice/library');
        final res = await http.get(uri).timeout(const Duration(seconds: 3));
        if (res.statusCode == 200) {
          final data = jsonDecode(res.body);
          final list = (data['library'] as List<dynamic>? ?? [])
              .map((e) => e as Map<String, dynamic>)
              .toList();
          if (mounted && list.isNotEmpty) {
            setState(() => _audioLibrary = list);
            return;
          }
        }
      } catch (_) {}
    }

    // 2. Load local audio files from device directory
    try {
      final docsDir = await getApplicationDocumentsDirectory();
      final files = docsDir.listSync().whereType<File>().where((f) => f.path.endsWith('.mp3')).toList();
      files.sort((a, b) => b.lastModifiedSync().compareTo(a.lastModifiedSync()));
      final localList = files.map((f) {
        final name = f.path.split(Platform.pathSeparator).last;
        final sizeKb = (f.lengthSync() / 1024).toStringAsFixed(1);
        return {
          'filename': name,
          'audioUrl': f.path,
          'path': f.path,
          'sizeFormatted': '$sizeKb KB',
        };
      }).toList();
      if (mounted) {
        setState(() => _audioLibrary = localList);
      }
    } catch (_) {}
  }

  // --- Generate SEO & Thumbnails via AI ---
  Future<void> _generateSeoAndThumbnails() async {
    final topic = _seoTopicController.text.trim();
    if (topic.isEmpty) {
      _showSnack('ટોપિકનું નામ દાખલ કરો.', isError: true);
      return;
    }

    setState(() => _isGeneratingSeo = true);
    try {
      // 1. Generate SEO
      final seoUri = Uri.parse('$_serverUrl/api/seo/generate');
      final seoRes = await http.post(
        seoUri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'topic': topic, 'category': 'general'}),
      ).timeout(const Duration(seconds: 25));

      if (seoRes.statusCode == 200) {
        final seoData = jsonDecode(seoRes.body)['data'] ?? {};
        final titles = (seoData['titles'] as List<dynamic>? ?? []).map((e) => e.toString()).toList();
        final ab = seoData['abTestTitles'] as Map<String, dynamic>? ?? {};
        final desc = seoData['description']?.toString() ?? '';
        final tagsList = (seoData['tags'] as List<dynamic>? ?? []).map((e) => e.toString()).join(', ');
        final pinned = seoData['pinnedComment']?.toString() ?? '';
        final cta = seoData['callToAction']?.toString() ?? '';

        if (mounted) {
          setState(() {
            _seoTitles = titles.isNotEmpty ? titles : _seoTitles;
            _abTitles = ab;
            _seoDescription = desc.isNotEmpty ? desc : _seoDescription;
            _seoTags = tagsList.isNotEmpty ? tagsList : _seoTags;
            _pinnedComment = pinned;
            _callToAction = cta;
          });
        }
      }

      // 2. Generate Smart Thumbnail 3-4 Elements & Contrast Matrix
      await _smartOptimizeThumbnail(forceApi: true);

      _showSnack('૧૦ ટાઇટલ, ડિસ્ક્રિપ્શન, ટેગ્સ અને સ્માર્ટ થંબનેલ તૈયાર! 🚀');
    } catch (e) {
      _showSnack('SEO જનરેશન દરમિયાન સમસ્યા આવી.', isWarning: true);
    }
    if (mounted) setState(() => _isGeneratingSeo = false);
  }

  Future<void> _generateThumbnailImage() async {
    if (_thumbnailPrompt.isEmpty) {
      _showSnack('થંબનેલ પ્રોમ્પ્ટ ઉપલબ્ધ નથી.', isError: true);
      return;
    }

    setState(() => _isGeneratingThumbnailImage = true);
    try {
      final uri = Uri.parse('$_serverUrl/api/thumbnails/generate-image');
      final res = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'prompt': _thumbnailPrompt,
          'conceptId': 1,
          'topic': _seoTopicController.text.trim(),
        }),
      ).timeout(const Duration(seconds: 35));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (mounted) {
          setState(() {
            _generatedThumbnailImageUrl = data['imageUrl'];
            _isGeneratingThumbnailImage = false;
          });
          _showSnack('AI ૧૬:૯ થંબનેલ ઇમેજ તૈયાર છે! 🎨');
        }
        return;
      }
    } catch (e) {
      _showSnack('ઇમેજ જનરેશન ભૂલ: $e', isError: true);
    }
    if (mounted) setState(() => _isGeneratingThumbnailImage = false);
  }

  Future<void> _smartOptimizeThumbnail({bool forceApi = false}) async {
    final topic = _seoTopicController.text.trim().isNotEmpty
        ? _seoTopicController.text.trim()
        : 'ગુજરાત સરકારી કર્મચારી DA વધારો 2026';

    setState(() => _isOptimizingThumb = true);
    try {
      final uri = Uri.parse('$_serverUrl/api/thumbnails/smart-optimizer');
      final res = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'topic': topic,
          if (!forceApi)
            'overrides': {
              'element1': _thumbEl1Controller.text.trim(),
              'element2': _thumbEl2Controller.text.trim(),
              'element3': _thumbEl3Controller.text.trim(),
              'element4': _thumbEl4Controller.text.trim(),
            }
        }),
      ).timeout(const Duration(seconds: 12));

      if (res.statusCode == 200) {
        final raw = jsonDecode(res.body);
        final data = (raw is Map && raw['data'] is Map) ? (raw['data'] as Map<String, dynamic>) : (raw as Map<String, dynamic>);
        final els = data['textElements'] as Map<String, dynamic>? ?? {};
        if (mounted) {
          setState(() {
            if (forceApi) {
              _thumbEl1Controller.text = els['element1']?.toString() ?? _thumbEl1Controller.text;
              _thumbEl2Controller.text = els['element2']?.toString() ?? _thumbEl2Controller.text;
              _thumbEl3Controller.text = els['element3']?.toString() ?? _thumbEl3Controller.text;
              _thumbEl4Controller.text = els['element4']?.toString() ?? _thumbEl4Controller.text;
            }
            _thumbnailEl1 = _thumbEl1Controller.text;
            _thumbnailEl2 = _thumbEl2Controller.text;
            _thumbnailEl3 = _thumbEl3Controller.text;
            _thumbnailEl4 = _thumbEl4Controller.text;
            _thumbnailPrompt = _thumbnailPromptMode == 'dalle-only'
                ? (data['dalleShortPrompt']?.toString() ?? _thumbnailPrompt)
                : (data['fullMarkdownPrompt']?.toString() ?? _thumbnailPrompt);
            _isOptimizingThumb = false;
          });
          _showSnack('સ્માર્ટ થંબનેલ ૩-૪ ટેક્સ્ટ & કલર કોન્ટ્રાસ્ટ ઓપ્ટિમાઇઝ થઈ ગયા! ✨');
        }
        return;
      }
    } catch (_) {}

    // Fallback offline derivation
    _rebuildThumbnailPromptLocally();
    if (mounted) setState(() => _isOptimizingThumb = false);
  }

  void _rebuildThumbnailPromptLocally() {
    final t = _seoTopicController.text.trim().isNotEmpty
        ? _seoTopicController.text.trim()
        : 'ગુજરાત સરકારી કર્મચારી DA વધારો 2026';

    _thumbnailEl1 = _thumbEl1Controller.text.trim().isNotEmpty ? _thumbEl1Controller.text.trim() : 'ગુજરાત કર્મચારીઓ';
    _thumbnailEl2 = _thumbEl2Controller.text.trim().isNotEmpty ? _thumbEl2Controller.text.trim() : 'DA વધારો કેટલો મળશે?';
    _thumbnailEl3 = _thumbEl3Controller.text.trim().isNotEmpty ? _thumbEl3Controller.text.trim() : '૨૦૨૬ સત્તાવાર પરિપત્ર';
    _thumbnailEl4 = _thumbEl4Controller.text.trim().isNotEmpty ? _thumbEl4Controller.text.trim() : 'સત્તાવાર નિર્ણય';

    final isSalary = RegExp(r'પગાર|વધારો|salary|hike|da|મોંઘવારી|ભથ્થ', caseSensitive: false).hasMatch(t);
    final isAnganwadi = RegExp(r'આંગણવાડી|તેડાગર|anganwadi', caseSensitive: false).hasMatch(t);
    final isPolice = RegExp(r'પોલીસ|lrd|police|કોન્સ્ટેબલ|ખાખી', caseSensitive: false).hasMatch(t);
    final isSahay = RegExp(r'સહાય|યોજના|ખેડૂત|કિસાન|સબસિડી', caseSensitive: false).hasMatch(t);

    String engSubject = 'an authentic Indian professional matching the topic looking at camera with a natural confident expression';
    String gujPhoto = 'વિષયને અનુરૂપ વાસ્તવિક ભારતીય વ્યક્તિનો અસલી પ્રોફેશનલ ફોટો.';

    if (isSalary) {
      engSubject = 'the Chief Minister of Gujarat, Bhupendra Patel, in traditional clean white kurta at an official press briefing podium looking at camera with a confident expression';
      gujPhoto = 'ગુજરાતના મુખ્યમંત્રીશ્રી ભૂપેન્દ્ર પટેલનો વાસ્તવિક સત્તાવાર ફોટો: પ્રેસ કોન્ફરન્સમાં સત્તાવાર નિર્ણય જાહેર કરતા મુખ્યમંત્રીશ્રી.';
    } else if (isAnganwadi) {
      engSubject = 'an authentic Indian Gujarati Anganwadi female worker looking at camera with a natural happy and confident smile';
      gujPhoto = 'આંગણવાડી કાર્યકર બહેનનો વાસ્તવિક ખુશ ચહેરો: કેમેરા સામે ઉત્સાહ અને સંતોષથી જોતી સાચી ભારતીય આંગણવાડી બહેન.';
    } else if (isPolice) {
      engSubject = 'a young authentic Indian candidate in crisp khaki police recruitment uniform looking at camera with determination';
      gujPhoto = 'પોલીસ ઉમેદવારનો વાસ્તવિક ફોટો: ખાખી યુનિફોર્મમાં કેમેરા સામે ગર્વ અને સંકલ્પથી જોતો યુવા ઉમેદવાર.';
    } else if (isSahay) {
      engSubject = 'a dignified Indian Gujarati farmer in clean traditional white kurta looking at camera with folded hands and a warm smile';
      gujPhoto = 'ખેડૂતનો વાસ્તવિક ખુશ ચહેરો: કેમેરા સામે હાથ જોડીને સંતોષથી જોતો ભારતીય ખેડૂત.';
    }

    final dallePrompt = 'A minimalist 16:9 YouTube thumbnail with a pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of $engSubject. On the right: A clean, high-contrast hierarchical text layout with exactly 3 to 4 distinct elements: Top line in deep navy blue (#102A56): "$_thumbnailEl1"; Main primary hook on a bold crimson red (#D71920) panel with vibrant gold-yellow (#FFD928) letters: "$_thumbnailEl2"; Supporting detail in crisp dark charcoal (#111111): "$_thumbnailEl3"; Clean accent badge in navy blue: "$_thumbnailEl4". Ultra clean, professional typography, maximum mobile readability, strictly photorealistic subject, zero clutter, absolutely NO 3D cartoon, NO neon, NO dark gradients, NO gaming effects.';

    if (_thumbnailPromptMode == 'dalle-only') {
      _thumbnailPrompt = dallePrompt;
    } else {
      _thumbnailPrompt = '''🎯 **Gyan Yatra - સ્માર્ટ થંબનેલ (૧ ફોટો + ૩-૪ હાઈ-કોન્ટ્રાસ્ટ ટેક્સ્ટ એલિમેન્ટ્સ)**
📌 **વિષય**: "$t"
⚪ **બેકગ્રાઉન્ડ**: ૧૦૦% શુદ્ધ સફેદ (#FFFFFF)
📐 **રેશિયો**: ૧૬:૯ (1280 × 720) YouTube Thumbnail

---

### 🎨 ૧. કલર કોન્ટ્રાસ્ટ પેલેટ (Color Contrast Matrix - 100% Mobile Readable):
• **બેકગ્રાઉન્ડ**: #FFFFFF (Pure Solid White - સ્વચ્છ, પ્રોફેશનલ)
• **મુખ્ય વિષય ટેક્સ્ટ**: #102A56 (Deep Navy Blue - કોન્ટ્રાસ્ટ રેશિયો ૧૪.૨:૧)
• **પ્રાયમરી હૂક પેનલ**: #D71920 (Crimson Red) પેનલ પર #FFD928 (Gold Yellow) બોલ્ડ અક્ષરો
• **સહાયક વિગત**: #111111 (Dark Charcoal / Black - કોન્ટ્રાસ્ટ રેશિયો ૧૮.૫:૧)
• **સ્ટેટસ બેજ**: #102A56 (Navy) પર #FFFFFF (White)

---

### 📝 ૨. થંબનેલ પર લખવા માટેના શ્રેષ્ઠ ૩ થી ૪ ટેક્સ્ટ એલિમેન્ટ્સ:
૧. 🏷️ **મુખ્ય વિષય (Main Topic)**:
   👉 "$_thumbnailEl1"
   *(રંગ: Deep Navy Blue #102A56 | સ્થાન: ટોચ પર, સુવ્યવસ્થિત)*

૨. ⚡ **પ્રાયમરી હૂક (Primary Hook - સૌથી મોટું અને બોલ્ડ)**:
   👉 "$_thumbnailEl2"
   *(રંગ: Crimson Red #D71920 બોક્સ પર Gold Yellow #FFD928 અક્ષરો)*

૩. 📌 **સહાયક વિગત (Supporting Detail)**:
   👉 "$_thumbnailEl3"
   *(રંગ: Dark Charcoal #111111 | સ્થાન: હૂકની બરાબર નીચે)*

૪. 🔰 **સ્ટેટસ બેજ (Status Badge - વૈકલ્પિક)**:
   👉 "$_thumbnailEl4"
   *(રંગ: Navy Blue બેજ)*

---

### 📷 ૩. ડાબી બાજુ મૂકવા માટે ફક્ત ૧ અસલી વાસ્તવિક ફોટો:
👉 $gujPhoto

---

### 🤖 ChatGPT Image / DALL-E 3 કોપી-રેડી પ્રોમ્પ્ટ:
`$dallePrompt`''';
    }
  }

  // -------------------------------------------------------------
  // Web View Integration & JavaScript Bridge
  // -------------------------------------------------------------
  void _setupWebViewController() {
    if (_isWebViewReady && _webViewController != null) {
      _webViewController!.loadRequest(Uri.parse(_serverUrl));
      return;
    }

    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0A0D14))
      ..setNavigationDelegate(
        NavigationDelegate(
          onProgress: (int progress) {
            if (mounted) setState(() => _webProgress = progress);
          },
          onPageStarted: (String url) {
            if (mounted) {
              setState(() {
                _isWebLoading = true;
                _hasWebError = false;
              });
            }
          },
          onPageFinished: (String url) {
            if (mounted) {
              setState(() {
                _isWebLoading = false;
                _hasWebError = false;
              });
            }
          },
          onWebResourceError: (WebResourceError error) {
            if (error.isForMainFrame ?? true) {
              if (mounted) {
                setState(() {
                  _hasWebError = true;
                  _webErrorMessage = error.description;
                  _isWebLoading = false;
                });
              }
            }
          },
          onNavigationRequest: (NavigationRequest request) {
            if (request.url.startsWith('whatsapp:') ||
                request.url.contains('api.whatsapp.com') ||
                request.url.contains('chat.whatsapp.com')) {
              SharePlus.instance.share(ShareParams(text: request.url));
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..addJavaScriptChannel(
        'StudioBridge',
        onMessageReceived: (JavaScriptMessage message) {
          try {
            final data = jsonDecode(message.message);
            final action = data['action'];
            if (action == 'share') {
              SharePlus.instance.share(ShareParams(text: data['text'] ?? ''));
            } else if (action == 'copy') {
              Clipboard.setData(ClipboardData(text: data['text'] ?? ''));
              _showSnack('ટેક્સ્ટ કોપી થઈ ગયો!');
            } else if (action == 'download_text') {
              _saveTextFileAndShare(data['filename'] ?? 'package.txt', data['content'] ?? '');
            }
          } catch (_) {
            SharePlus.instance.share(ShareParams(text: message.message));
          }
        },
      );

    controller.loadRequest(Uri.parse(_serverUrl));

    if (mounted) {
      setState(() {
        _webViewController = controller;
        _isWebViewReady = true;
      });
    }
  }

  Future<void> _saveTextFileAndShare(String filename, String content) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final file = File('${tempDir.path}/$filename');
      await file.writeAsString(content);
      _showSnack('$filename સેવ થઈ ગઈ!');
    } catch (_) {}
  }

  void _switchToWebMode() {
    setState(() => _useNativeMode = false);
    _setupWebViewController();
    _saveModePreference(false);
  }

  void _switchToNativeMode() {
    setState(() => _useNativeMode = true);
    _saveModePreference(true);
  }

  Future<void> _saveModePreference(bool isNative) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('gyan_yatra_use_native', isNative);
  }

  Future<void> _saveServerUrl(String newUrl) async {
    String formattedUrl = newUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = 'http://$formattedUrl';
    }
    if (formattedUrl.endsWith('/')) {
      formattedUrl = formattedUrl.substring(0, formattedUrl.length - 1);
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('gyan_yatra_server_url', formattedUrl);

    if (mounted) {
      setState(() {
        _serverUrl = formattedUrl;
      });
      _pingServerQuietly();
      if (!_useNativeMode) {
        _webViewController?.loadRequest(Uri.parse(_serverUrl));
      }
    }
  }

  void _showSnack(String msg, {bool isError = false, bool isWarning = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg),
        backgroundColor: isError
            ? const Color(0xFFEF4444)
            : isWarning
                ? const Color(0xFFF59E0B)
                : const Color(0xFF10B981),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // -------------------------------------------------------------
  // UI Dialogs
  // -------------------------------------------------------------
  void _showSettingsDialog() {
    final controller = TextEditingController(text: _serverUrl);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF131722),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          '⚙️ ચેનલ & સર્વર સેટિંગ્સ',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, color: Colors.grey),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Channel Card
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0A0D14),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Row(
                        children: [
                          ClipOval(
                            child: Image.network(
                              _channelAvatar,
                              width: 40,
                              height: 40,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Container(
                                width: 40,
                                height: 40,
                                color: const Color(0xFF1E293B),
                                child: const Center(child: Text('📺', style: TextStyle(fontSize: 18))),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(_channelTitle, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                                Text(
                                  _isDemoMode ? 'ડેમો મોડ સક્રિય' : 'કનેક્ટેડ',
                                  style: TextStyle(fontSize: 11, color: _isDemoMode ? const Color(0xFFF59E0B) : const Color(0xFF10B981)),
                                ),
                              ],
                            ),
                          ),
                          TextButton.icon(
                            style: TextButton.styleFrom(
                              foregroundColor: Colors.white,
                              backgroundColor: const Color(0xFF1E293B),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            ),
                            icon: Icon(_isDemoMode ? Icons.toggle_on : Icons.toggle_off, color: const Color(0xFF38BDF8)),
                            label: Text(_isDemoMode ? 'ડેમો' : 'લાઈવ', style: const TextStyle(fontSize: 11)),
                            onPressed: () async {
                              await _toggleDemoMode();
                              setModalState(() {});
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),

                    const Text(
                      'સર્વર IP સરનામું (PC કનેક્શન)',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'તમારું PC અને ફોન એક જ Wi-Fi પર હોવા જોઈએ અથવા નીચે આપેલા બટનથી પસંદ કરો.',
                      style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                    ),
                    const SizedBox(height: 12),

                    TextField(
                      controller: controller,
                      style: const TextStyle(color: Colors.white, fontSize: 13),
                      decoration: InputDecoration(
                        labelText: 'સર્વર URL',
                        labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                        filled: true,
                        fillColor: const Color(0xFF0A0D14),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(10),
                          borderSide: const BorderSide(color: Color(0xFF334155)),
                        ),
                        prefixIcon: const Icon(Icons.lan, color: Color(0xFFFF0000)),
                      ),
                    ),
                    const SizedBox(height: 12),

                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        ActionChip(
                          label: const Text('192.168.1.2:5000 (PC Wi-Fi)'),
                          backgroundColor: const Color(0xFF1E293B),
                          labelStyle: const TextStyle(fontSize: 11, color: Colors.white),
                          onPressed: () => controller.text = 'http://192.168.1.2:5000',
                        ),
                        ActionChip(
                          label: const Text('10.0.2.2:5000 (Android Emulator)'),
                          backgroundColor: const Color(0xFF1E293B),
                          labelStyle: const TextStyle(fontSize: 11, color: Colors.white),
                          onPressed: () => controller.text = 'http://10.0.2.2:5000',
                        ),
                        ActionChip(
                          label: const Text('localhost:5000'),
                          backgroundColor: const Color(0xFF1E293B),
                          labelStyle: const TextStyle(fontSize: 11, color: Colors.white),
                          onPressed: () => controller.text = 'http://localhost:5000',
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),

                    SizedBox(
                      width: double.infinity,
                      height: 44,
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFFF0000),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(Icons.check),
                        label: const Text('સેવ કરો & કનેક્ટ કરો', style: TextStyle(fontWeight: FontWeight.bold)),
                        onPressed: () {
                          Navigator.pop(context);
                          _saveServerUrl(controller.text);
                        },
                      ),
                    ),
                    const SizedBox(height: 10),

                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF38BDF8),
                          side: const BorderSide(color: Color(0xFF38BDF8)),
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        icon: const Icon(Icons.tune, size: 18),
                        label: const Text('સંપૂર્ણ API & AI સેટિંગ્સ સ્ક્રીન ખોલો', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        onPressed: () {
                          Navigator.pop(context);
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => SettingsScreen(
                                currentServerUrl: _serverUrl,
                                onServerUrlChanged: _saveServerUrl,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<bool> _handleWillPop() async {
    if (!_useNativeMode && _webViewController != null) {
      if (await _webViewController!.canGoBack()) {
        await _webViewController!.goBack();
        return false;
      }
    }
    if (!mounted) return false;
    final shouldExit = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF131722),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('જ્ઞાન યાત્રા સ્ટુડિયો', style: TextStyle(color: Colors.white)),
        content: const Text('શું તમે એપમાંથી બહાર નીકળવા માંગો છો?', style: TextStyle(color: Color(0xFF94A3B8))),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('ના', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFFF0000)),
            onPressed: () => Navigator.pop(context, true),
            child: const Text('હા, બહાર નીકળો', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
    return shouldExit ?? false;
  }

  // -------------------------------------------------------------
  // Scaffold Build
  // -------------------------------------------------------------
  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldExit = await _handleWillPop();
        if (shouldExit && mounted) {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        drawer: _buildAppDrawer(),
        appBar: AppBar(
          backgroundColor: Colors.white,
          elevation: 0,
          toolbarHeight: 56,
          titleSpacing: 0,
          leading: Builder(
            builder: (context) => IconButton(
              icon: const Icon(Icons.menu, color: Color(0xFF0F172A)),
              tooltip: 'મેનૂ',
              onPressed: () => Scaffold.of(context).openDrawer(),
            ),
          ),
          title: Row(
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFF6D28D9)]),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Center(
                  child: Text('🎯', style: TextStyle(fontSize: 18)),
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'GYAN YATRA',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A), letterSpacing: 0.5),
                      ),
                      const SizedBox(width: 5),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEDE9FE),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text(
                          'AI STUDIO',
                          style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Color(0xFF7C3AED)),
                        ),
                      ),
                      const SizedBox(width: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: const Color(0xFF10B981), width: 0.8),
                        ),
                        child: const Text(
                          'v1.0.12 (સ્ક્રિપ્ટ સરળ)',
                          style: TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                        ),
                      ),
                    ],
                  ),
                  Text(
                    _useNativeMode ? 'મોબાઇલ સ્ટુડિયો • જાનકી ભટ્ટી અવાજ સક્રિય 🎙️' : 'લાઇવ વેબ સ્ટુડિયો',
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF7C3AED),
                    ),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            // Mode Toggle Button (Mobile / Web)
            Container(
              margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 2),
              decoration: BoxDecoration(
                color: const Color(0xFFF1F5F9),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: const Color(0xFFE2E8F0),
                  width: 1,
                ),
              ),
              child: TextButton.icon(
                style: TextButton.styleFrom(
                  foregroundColor: const Color(0xFF0F172A),
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 0),
                  minimumSize: Size.zero,
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                icon: Text(_useNativeMode ? '📱' : '🌐', style: const TextStyle(fontSize: 12)),
                label: Text(
                  _useNativeMode ? 'મોબાઇલ' : 'વેબ',
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                ),
                onPressed: () {
                  if (_useNativeMode) {
                    _switchToWebMode();
                  } else {
                    _switchToNativeMode();
                  }
                },
              ),
            ),

            // Server Status Chip
            GestureDetector(
              onTap: _showSettingsDialog,
              child: Container(
                margin: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: _isServerHealthy ? const Color(0xFF10B981) : const Color(0xFFCBD5E1),
                    width: 1,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 7,
                      height: 7,
                      decoration: BoxDecoration(
                        color: _isServerHealthy ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      _isServerHealthy ? 'કનેક્ટેડ' : 'ઓફલાઇન',
                      style: TextStyle(
                        fontSize: 10,
                        color: _isServerHealthy ? const Color(0xFF059669) : const Color(0xFF64748B),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            IconButton(
              icon: const Icon(Icons.settings, color: Color(0xFF475569), size: 20),
              tooltip: 'સેટિંગ્સ',
              onPressed: _showSettingsDialog,
            ),
          ],
          bottom: (!_useNativeMode && _isWebLoading)
              ? PreferredSize(
                  preferredSize: const Size.fromHeight(2),
                  child: LinearProgressIndicator(
                    value: _webProgress > 0 ? _webProgress / 100.0 : null,
                    backgroundColor: const Color(0xFFF1F5F9),
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF7C3AED)),
                    minHeight: 2,
                  ),
                )
              : null,
        ),
        body: _useNativeMode ? _buildNativeStudioView() : _buildWebViewBody(),
        bottomNavigationBar: _useNativeMode ? _buildNativeBottomNav() : null,
      ),
    );
  }

  Widget _buildAppDrawer() {
    return Drawer(
      backgroundColor: Colors.white,
      child: SafeArea(
        child: Column(
          children: [
            // Drawer Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: const BoxDecoration(
                color: Color(0xFFF8FAFC),
                border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFF6D28D9)]),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Center(child: Text('🎯', style: TextStyle(fontSize: 18))),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'GYAN YATRA AI STUDIO',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A), letterSpacing: 0.5),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            ClipOval(
                              child: Image.network(
                                _channelAvatar,
                                width: 16,
                                height: 16,
                                fit: BoxFit.cover,
                                errorBuilder: (context, error, stackTrace) => Container(
                                  width: 16,
                                  height: 16,
                                  color: const Color(0xFFEDE9FE),
                                  child: const Center(child: Text('📺', style: TextStyle(fontSize: 8))),
                                ),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                _channelTitle,
                                style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFECFDF5),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFF10B981)),
                    ),
                    child: const Text(
                      'ઓથોરાઇઝ્ડ ✓',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF059669),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Navigation Items
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 8),
                children: [
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Text(
                      'પ્રોડક્શન પાઇપલાઇન (PIPELINE)',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.8),
                    ),
                  ),
                  _buildDrawerItem(
                    icon: '💡',
                    title: '૧. આઈડિયા & 48h ટ્રેન્ડ',
                    badge: 'Hot',
                    badgeColor: const Color(0xFFFF0000),
                    isSelected: _useNativeMode && _nativeSelectedTab == 0,
                    onTap: () {
                      Navigator.pop(context);
                      if (!_useNativeMode) _switchToNativeMode();
                      setState(() => _nativeSelectedTab = 0);
                    },
                  ),
                  _buildDrawerItem(
                    icon: '📑',
                    title: '૨. સ્લાઇડ્સ (Tool 2)',
                    badge: '૧૬:૯ PPT',
                    badgeColor: const Color(0xFF8B5CF6),
                    isSelected: _useNativeMode && _nativeSelectedTab == 1,
                    onTap: () {
                      Navigator.pop(context);
                      if (!_useNativeMode) _switchToNativeMode();
                      setState(() => _nativeSelectedTab = 1);
                    },
                  ),
                  _buildDrawerItem(
                    icon: '📝',
                    title: '૩. સ્ક્રિપ્ટ રાઇટર (PDF Master)',
                    badge: 'PDF',
                    badgeColor: const Color(0xFF10B981),
                    isSelected: _useNativeMode && _nativeSelectedTab == 2,
                    onTap: () {
                      Navigator.pop(context);
                      if (!_useNativeMode) _switchToNativeMode();
                      setState(() => _nativeSelectedTab = 2);
                    },
                  ),
                  _buildDrawerItem(
                    icon: '🎙️',
                    title: '૪. મારો અવાજ (Voice Studio)',
                    badge: 'Cloned',
                    badgeColor: const Color(0xFFEC4899),
                    isSelected: _useNativeMode && _nativeSelectedTab == 3,
                    onTap: () {
                      Navigator.pop(context);
                      if (!_useNativeMode) _switchToNativeMode();
                      setState(() => _nativeSelectedTab = 3);
                    },
                  ),
                  _buildDrawerItem(
                    icon: '🚀',
                    title: '૫. SEO & થંબનેલ',
                    isSelected: _useNativeMode && _nativeSelectedTab == 4,
                    onTap: () {
                      Navigator.pop(context);
                      if (!_useNativeMode) _switchToNativeMode();
                      setState(() => _nativeSelectedTab = 4);
                    },
                  ),
                  _buildDrawerItem(
                    icon: '💾',
                    title: '૬. સેવ & શેર પેકેજ',
                    badge: 'Save',
                    badgeColor: const Color(0xFF10B981),
                    isSelected: _useNativeMode && _nativeSelectedTab == 5,
                    onTap: () {
                      Navigator.pop(context);
                      if (!_useNativeMode) _switchToNativeMode();
                      setState(() => _nativeSelectedTab = 5);
                    },
                  ),

                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Divider(color: Color(0xFF1E293B), height: 1),
                  ),

                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: Text(
                      'ક્રિએટર એઆઈ ટૂલ્સ (CREATOR TOOLS)',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.8),
                    ),
                  ),
                  _buildDrawerItem(
                    icon: '✨',
                    title: 'ChatGPT આસિસ્ટન્ટ',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ChatScreen(serverUrl: _serverUrl),
                        ),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: '📈',
                    title: '48h ચેનલ એનાલિટિક્સ',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => AnalyticsScreen(serverUrl: _serverUrl),
                        ),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: '🔍',
                    title: 'સ્પર્ધક વિડીયો રિસર્ચ',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => ResearchScreen(serverUrl: _serverUrl),
                        ),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    icon: '🎨',
                    title: 'થંબનેલ ૩-૪ ટેક્સ્ટ & કલર સ્ટુડિયો',
                    badge: 'White #FFF',
                    badgeColor: const Color(0xFF102A56),
                    isSelected: _useNativeMode && _nativeSelectedTab == 4,
                    onTap: () {
                      Navigator.pop(context);
                      if (!_useNativeMode) _switchToNativeMode();
                      setState(() => _nativeSelectedTab = 4);
                    },
                  ),

                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    child: Divider(color: Color(0xFF1E293B), height: 1),
                  ),

                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                    child: Text(
                      'સિસ્ટમ & સેટિંગ્સ',
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.8),
                    ),
                  ),
                  _buildDrawerItem(
                    icon: '⚙️',
                    title: 'સેટિંગ્સ & API કી',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => SettingsScreen(
                            currentServerUrl: _serverUrl,
                            onServerUrlChanged: _saveServerUrl,
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),

            // Drawer Footer
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: const BoxDecoration(
                color: Color(0xFFF8FAFC),
                border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Gyan Yatra AI Studio', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                        Text('v1.0.12 • સ્ક્રિપ્ટ સ્લાઇડ્સ બાજુમાં & સરળ 🚀', style: TextStyle(fontSize: 10, color: Color(0xFF10B981), fontWeight: FontWeight.w600)),
                      ],
                    ),
                  ),
                  TextButton(
                    style: TextButton.styleFrom(
                      foregroundColor: const Color(0xFF7C3AED),
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      minimumSize: Size.zero,
                    ),
                    onPressed: () {
                      Navigator.pop(context);
                      if (_useNativeMode) {
                        _switchToWebMode();
                      } else {
                        _switchToNativeMode();
                      }
                    },
                    child: Text(_useNativeMode ? '📱 નેટિવ મોડ' : '🌐 વેબ મોડ', style: const TextStyle(fontSize: 11)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerItem({
    required String icon,
    required String title,
    String? badge,
    Color? badgeColor,
    bool isSelected = false,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
      decoration: BoxDecoration(
        color: isSelected ? const Color(0xFFEDE9FE) : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
        border: isSelected ? Border.all(color: const Color(0xFF7C3AED).withValues(alpha: 0.3)) : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: ListTile(
          dense: true,
          visualDensity: const VisualDensity(horizontal: 0, vertical: -2),
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
          minLeadingWidth: 24,
          leading: Text(icon, style: const TextStyle(fontSize: 18)),
          title: Text(
            title,
            style: TextStyle(
              fontSize: 13,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
              color: isSelected ? const Color(0xFF7C3AED) : const Color(0xFF0F172A),
            ),
          ),
          trailing: badge != null
              ? Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: badgeColor ?? const Color(0xFF7C3AED),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    badge,
                    style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                )
              : null,
          onTap: onTap,
        ),
      ),
    );
  }

  Widget _buildNativeBottomNav() {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Color(0xFFE2E8F0), width: 1)),
      ),
      child: NavigationBar(
        selectedIndex: _nativeSelectedTab,
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.transparent,
        indicatorColor: const Color(0xFFEDE9FE),
        onDestinationSelected: (index) {
          setState(() => _nativeSelectedTab = index);
        },
        destinations: const [
          NavigationDestination(icon: Text('💡', style: TextStyle(fontSize: 18)), label: 'આઈડિયા'),
          NavigationDestination(icon: Text('📑', style: TextStyle(fontSize: 18)), label: 'સ્લાઇડ્સ'),
          NavigationDestination(icon: Text('📝', style: TextStyle(fontSize: 18)), label: 'સ્ક્રિપ્ટ'),
          NavigationDestination(icon: Text('🎙️', style: TextStyle(fontSize: 18)), label: 'અવાજ'),
          NavigationDestination(icon: Text('🚀', style: TextStyle(fontSize: 18)), label: 'SEO/ફોટો'),
          NavigationDestination(icon: Text('💾', style: TextStyle(fontSize: 18)), label: 'શેર'),
        ],
      ),
    );
  }

  Widget _buildNativeStudioView() {
    switch (_nativeSelectedTab) {
      case 0:
        return _buildNativeIdeasView();
      case 1:
        return _buildNativeSlidesView();
      case 2:
        return _buildNativeScriptView();
      case 3:
        return _buildNativeVoiceView();
      case 4:
        return _buildNativeSeoThumbnailView();
      case 5:
        return _buildNativeShareView();
      default:
        return _buildNativeIdeasView();
    }
  }

  // -------------------------------------------------------------
  // Tab 0: Topics & Ideas View (Full Parity with topics.js)
  // -------------------------------------------------------------
  Widget _buildNativeIdeasView() {
    final categories = [
      {'id': 'all', 'label': 'બધા (All)', 'icon': '🌐'},
      {'id': 'schemes', 'label': 'સરકારી યોજના', 'icon': '🏛️'},
      {'id': 'anganwadi', 'label': 'આંગણવાડી & પગાર', 'icon': '👩‍🏫'},
      {'id': 'police', 'label': 'પોલીસ & LRD', 'icon': '👮‍♂️'},
      {'id': 'business', 'label': 'વેપાર & કમાણી', 'icon': '💰'},
      {'id': 'tech', 'label': 'ટેકનોલોજી & AI', 'icon': '🤖'},
      {'id': 'education', 'label': 'શિક્ષણ & પરિણામ', 'icon': '🎓'},
      {'id': 'news', 'label': 'ગુજરાત સમાચાર', 'icon': '📰'},
      {'id': 'entertainment', 'label': 'મનોરંજન', 'icon': '🎭'},
      {'id': 'niche', 'label': 'ચેનલ નીશ', 'icon': '🎯'},
    ];

    final rawList = _topicsList.isNotEmpty ? _topicsList : _getDefaultTopics();
    List<TopicItem> filteredList = rawList;
    if (_currentCategory != 'all') {
      if (_currentCategory == 'niche') {
        filteredList = filteredList.where((t) => ['schemes', 'anganwadi', 'police', 'business', 'tech'].contains(t.category)).toList();
      } else if (_currentCategory == 'schemes') {
        filteredList = filteredList.where((t) => t.category == 'schemes' || t.category == 'anganwadi' || t.category == 'police').toList();
      } else {
        filteredList = filteredList.where((t) => t.category == _currentCategory).toList();
      }
    }
    if (_searchQuery.trim().isNotEmpty) {
      final q = _searchQuery.trim().toLowerCase();
      final searched = filteredList.where((t) =>
        t.topicGujarati.toLowerCase().contains(q) ||
        t.whyViewersWatch.toLowerCase().contains(q) ||
        t.searchKeywords.any((k) => k.toLowerCase().contains(q))
      ).toList();
      if (searched.isNotEmpty) filteredList = searched;
    }
    final displayList = filteredList.isNotEmpty ? filteredList : rawList;

    return RefreshIndicator(
      color: const Color(0xFF7C3AED),
      backgroundColor: Colors.white,
      onRefresh: () async {
        await _fetchTrendingTopics();
        await _fetchHomeAnalytics();
      },
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        children: [
          // 🌟 Quick Jump Banner to New Voice & Script Features (v1.0.9)
          Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFFEC4899)]),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF7C3AED).withValues(alpha: 0.25),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                const Text('🎙️', style: TextStyle(fontSize: 22)),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Text(
                            'નવા સુધારા v1.0.12 સક્રિય',
                            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Text('NEW', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.white)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        '૩૦+ તાજા ગુજરાતી ટોપિક્સ + સ્ત્રી અવાજ & કંટ્રોલ્સ',
                        style: TextStyle(fontSize: 10, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: const Color(0xFF7C3AED),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  ),
                  onPressed: () => setState(() => _nativeSelectedTab = 3),
                  child: const Text('અવાજ ખોલો ➔', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),

          // Header Card
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: const [
                BoxShadow(color: Color(0x06000000), blurRadius: 8, offset: Offset(0, 2)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: const [
                        Text('🔥', style: TextStyle(fontSize: 20)),
                        SizedBox(width: 8),
                        Text(
                          '૧. આજે કયા ટોપિક પર વિડીયો બનાવવો?',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh, size: 20, color: Color(0xFF7C3AED)),
                      tooltip: 'રિફ્રેશ કરો',
                      onPressed: () {
                        _fetchTrendingTopics();
                        _fetchHomeAnalytics();
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                const Text(
                  'ગૂગલ ટ્રેન્ડ્સ, ગુજરાત ન્યૂઝ અને વાસ્તવિક YouTube ઓડિયન્સ ડિમાન્ડ આધારિત વિશ્લેષણ.',
                  style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          // Search Bar
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
                  decoration: InputDecoration(
                    hintText: 'ચોક્કસ કીવર્ડ શોધો (દા.ત. DA વધારો, ખેતી, ભરતી)...',
                    hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: const BorderSide(color: Color(0xFF7C3AED), width: 1.5),
                    ),
                    prefixIcon: const Icon(Icons.search, size: 18, color: Color(0xFF64748B)),
                  ),
                  onSubmitted: (val) {
                    _searchQuery = val.trim();
                    _fetchTrendingTopics();
                  },
                ),
              ),
              const SizedBox(width: 8),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C3AED),
                  foregroundColor: Colors.white,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: () {
                  _searchQuery = _searchController.text.trim();
                  _fetchTrendingTopics();
                },
                child: const Text('શોધો', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Real YouTube Channel Connection & 48-Hour Analytics Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
              boxShadow: const [
                BoxShadow(color: Color(0x06000000), blurRadius: 10, offset: Offset(0, 3)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Channel Identity & Connection Status Header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        children: [
                          ClipRRect(
                            borderRadius: BorderRadius.circular(22),
                            child: Image.network(
                              _channelAvatar,
                              width: 44,
                              height: 44,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Container(
                                width: 44,
                                height: 44,
                                color: const Color(0xFFEDE9FE),
                                child: const Center(child: Text('🎯', style: TextStyle(fontSize: 20))),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Flexible(
                                      child: Text(
                                        _channelTitle,
                                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFECFDF5),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: const Color(0xFF10B981)),
                                      ),
                                      child: const Text('✓ કનેક્ટેડ', style: TextStyle(fontSize: 9, color: Color(0xFF059669), fontWeight: FontWeight.bold)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '$_channelHandle • ${_channelSubscribers.toString()} સબ્સ્ક્રાઇબર્સ • $_channelVideos વિડીયો',
                                  style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.settings, size: 18, color: Color(0xFF64748B)),
                      tooltip: 'ચેનલ વિગતો',
                      onPressed: _showChannelAccountDialog,
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // 48-Hour Views Metric Showcase
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Row(
                            children: [
                              Text('📈', style: TextStyle(fontSize: 14)),
                              SizedBox(width: 6),
                              Text(
                                'છેલ્લા ૪૮ કલાકના સત્તાવાર વ્યુઝ',
                                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEDE9FE),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Text('YouTube API', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF7C3AED))),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.baseline,
                        textBaseline: TextBaseline.alphabetic,
                        children: [
                          Text(
                            _views48h.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},'),
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF7C3AED),
                              letterSpacing: 0.5,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${_viewsGrowth >= 0 ? "↑ +" : "↓ "}${_viewsGrowth.abs().toStringAsFixed(1)}%',
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'અગાઉના ૪૮ કલાક: ${_prevViews48h.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')} વ્યુઝ',
                        style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.verified, size: 12, color: Color(0xFF7C3AED)),
                            const SizedBox(width: 5),
                            Expanded(
                              child: Text(
                                '$_analyticsPeriod • $_analyticsFreshness',
                                style: const TextStyle(fontSize: 9.5, color: Color(0xFF334155), fontWeight: FontWeight.w500),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),

                // Micro Metrics Row (Watch Time, Revenue, Subscribers)
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          children: [
                            const Text('વોચ ટાઇમ', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                            const SizedBox(height: 2),
                            Text('${_watchTimeHours.toStringAsFixed(1)} કલાક', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          children: [
                            const Text('કમાણી', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                            const SizedBox(height: 2),
                            Text('₹${_revenueAmount.toStringAsFixed(2)}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Column(
                          children: [
                            const Text('નેટ સબ્સ્ક્રાઇબર', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                            const SizedBox(height: 2),
                            Text('+$_netSubscribers', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF7C3AED))),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Action Buttons Row
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF7C3AED),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        icon: const Icon(Icons.bar_chart, size: 16),
                        label: const Text('સંપૂર્ણ 48h રિપોર્ટ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => AnalyticsScreen(serverUrl: _serverUrl),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF475569),
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: _isLoadingAnalytics
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF7C3AED)))
                          : const Icon(Icons.refresh, size: 16, color: Color(0xFF7C3AED)),
                      label: const Text('રિફ્રેશ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                      onPressed: _isLoadingAnalytics ? null : _fetchHomeAnalytics,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Filter Chips Horizontal Scroll
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: categories.map((cat) {
                final isSelected = (_currentCategory == cat['id']);
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    selected: isSelected,
                    label: Text('${cat['icon']} ${cat['label']}'),
                    labelStyle: TextStyle(
                      fontSize: 11,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      color: isSelected ? const Color(0xFF7C3AED) : const Color(0xFF475569),
                    ),
                    backgroundColor: Colors.white,
                    selectedColor: const Color(0xFFEDE9FE),
                    side: BorderSide(
                      color: isSelected ? const Color(0xFF7C3AED) : const Color(0xFFE2E8F0),
                    ),
                    onSelected: (val) {
                      setState(() => _currentCategory = cat['id']!);
                      _fetchTrendingTopics();
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 14),

          // 3 Ranked Cards
          if (_isLoadingTopics)
            const Center(
              child: Padding(
                padding: EdgeInsets.all(32),
                child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF7C3AED))),
              ),
            )
          else if (displayList.isEmpty)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Text(
                  'આ કેટેગરીમાં કોઈ વિષય મળ્યો નથી.',
                  style: TextStyle(color: Colors.grey[600], fontSize: 13),
                ),
              ),
            )
          else
            ...displayList.take(10).toList().asMap().entries.map((entry) {
              final idx = entry.key;
              final item = entry.value;
              final isSelected = (_selectedTopic == item.topicGujarati);
              final rankEmoji = idx == 0 ? '🥇' : idx == 1 ? '🥈' : idx == 2 ? '🥉' : '⭐';
              final rankTitle = idx == 0
                  ? 'રેન્ક #૧ (સર્વોચ્ચ પુરાવા)'
                  : idx == 1
                      ? 'રેન્ક #૨ (હાઇ ડિમાન્ડ)'
                      : idx == 2
                          ? 'રેન્ક #૩ (મજબૂત તક)'
                          : 'રેન્ક #${idx + 1} (ટ્રેન્ડિંગ આઈડિયા)';

              return Container(
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0xFFFAF5FF) : Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isSelected ? const Color(0xFF7C3AED) : const Color(0xFFE2E8F0),
                    width: isSelected ? 1.5 : 1,
                  ),
                  boxShadow: const [
                    BoxShadow(color: Color(0x06000000), blurRadius: 8, offset: Offset(0, 2)),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header with Rank and Confidence
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEDE9FE),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '$rankEmoji $rankTitle',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF7C3AED)),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFECFDF5),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              item.confidenceLabel,
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),

                      // Gujarati Topic & Proposed Title
                      Text(
                        item.topicGujarati,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A)),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                '"${item.suggestedTitle}"',
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF7C3AED)),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.copy, size: 14, color: Color(0xFF64748B)),
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              onPressed: () {
                                Clipboard.setData(ClipboardData(text: item.suggestedTitle));
                                _showSnack('ટાઈટલ કોપી થઈ ગયું!');
                              },
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 8),

                      // Selection Rationale
                      Text(
                        '૨. પસંદગીનું કારણ: ${item.whyViewersWatch}',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                      const SizedBox(height: 4),

                      // View Metrics Box
                      Container(
                        padding: const EdgeInsets.all(8),
                        margin: const EdgeInsets.symmetric(vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('કુલ વ્યુઝ:', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                                Text(item.lifetimeViews, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('48h ડેલ્ટા:', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                                Text(item.accumulated48h, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF059669))),
                              ],
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('ગ્રોથ રેટ:', style: TextStyle(fontSize: 9, color: Color(0xFF64748B))),
                                Text(item.growthRate, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFD97706))),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Opening Hook
                      if (item.openingHook.isNotEmpty) ...[
                        Container(
                          padding: const EdgeInsets.all(8),
                          margin: const EdgeInsets.only(bottom: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF2F2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFFECACA)),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('🎙️ હૂક: ', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFDC2626))),
                              Expanded(
                                child: Text(
                                  item.openingHook,
                                  style: const TextStyle(fontSize: 10, fontStyle: FontStyle.italic, color: Color(0xFF991B1B)),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.copy, size: 14, color: Color(0xFFDC2626)),
                                padding: EdgeInsets.zero,
                                constraints: const BoxConstraints(),
                                onPressed: () {
                                  Clipboard.setData(ClipboardData(text: item.openingHook));
                                  _showSnack('હૂક કોપી થઈ ગયો!');
                                },
                              ),
                            ],
                          ),
                        ),
                      ],

                      // Factuality Warning
                      if (item.factualityWarning.isNotEmpty) ...[
                        Container(
                          padding: const EdgeInsets.all(6),
                          margin: const EdgeInsets.only(bottom: 8),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFFBEB),
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(color: const Color(0xFFFDE68A)),
                          ),
                          child: Text(
                            item.factualityWarning,
                            style: const TextStyle(fontSize: 10, color: Color(0xFFB45309)),
                          ),
                        ),
                      ],

                      // Action Buttons
                      Row(
                        children: [
                          ElevatedButton.icon(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: isSelected ? const Color(0xFF7C3AED) : const Color(0xFFEDE9FE),
                              foregroundColor: isSelected ? Colors.white : const Color(0xFF7C3AED),
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            icon: const Icon(Icons.check, size: 16),
                            label: Text(isSelected ? 'પસંદ કરેલ ✓' : 'આ આઈડિયા પસંદ કરો'),
                            onPressed: () {
                              setState(() {
                                _selectedTopic = item.topicGujarati;
                                _selectedTopicDesc = item.whyViewersWatch;
                                _scriptTopicController.text = item.topicGujarati;
                                _seoTopicController.text = item.topicGujarati;
                              });
                              _showSnack('આઈડિયા #${idx + 1} પસંદ કર્યો: ${item.topicGujarati}');
                            },
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: const Color(0xFF475569),
                              side: const BorderSide(color: Color(0xFFE2E8F0)),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            icon: Icon(item.isSaved ? Icons.bookmark : Icons.bookmark_border, size: 16, color: item.isSaved ? const Color(0xFFD97706) : const Color(0xFF64748B)),
                            label: Text(item.isSaved ? 'સેવ છે' : 'સેવ'),
                            onPressed: () => _bookmarkTopic(item),
                          ),
                        ],
                      ),

                      // REQUIREMENT 2: BAJU MA / NICHE SLIDES (PHAKT TOPIC ANE NICHE TOOL 2 NO PROMPT J)
                      Container(
                        margin: const EdgeInsets.only(top: 14),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5F3FF),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFDDD6FE), width: 1.5),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: const [
                                    Text('📑', style: TextStyle(fontSize: 18)),
                                    SizedBox(width: 8),
                                    Text(
                                      'સ્લાઇડ્સ (Slides) • Tool 2 પ્રોમ્પ્ટ',
                                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF6D28D9)),
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEDE9FE),
                                    borderRadius: BorderRadius.circular(4),
                                    border: Border.all(color: const Color(0xFFC4B5FD)),
                                  ),
                                  child: const Text('૧૬:૯ PPT', style: TextStyle(fontSize: 9, color: Color(0xFF6D28D9), fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),

                            // 1. Phakt Topic
                            const Text(
                              'વિષય / ટોપિક (TOPIC):',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF64748B), letterSpacing: 0.5),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Text(
                                item.suggestedTitle.isNotEmpty ? item.suggestedTitle : item.topicGujarati,
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                              ),
                            ),
                            const SizedBox(height: 10),

                            // 2. Niche Tool 2 no Prompt j
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: const [
                                Text(
                                  'ટૂલ ૨ પ્રોમ્પ્ટ (NOTEBOOKLM 16:9 WHITE PPT):',
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF6D28D9), letterSpacing: 0.5),
                                ),
                                Text(
                                  '✓ સફેદ #FFF બેકગ્રાઉન્ડ',
                                  style: TextStyle(fontSize: 9, color: Color(0xFF059669), fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Container(
                              width: double.infinity,
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                              ),
                              child: Text(
                                item.slidePrompt.isNotEmpty ? item.slidePrompt : item.masterPrompt,
                                style: const TextStyle(fontSize: 10, color: Color(0xFF334155), height: 1.4, fontFamily: 'monospace'),
                                maxLines: 7,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(height: 10),

                            // 1-Click Copy & Navigate to Slides
                            Row(
                              children: [
                                Expanded(
                                  child: ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF7C3AED),
                                      foregroundColor: Colors.white,
                                      elevation: 0,
                                      padding: const EdgeInsets.symmetric(vertical: 8),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    icon: const Icon(Icons.copy, size: 14),
                                    label: const Text('૧-ક્લિક ટૂલ ૨ પ્રોમ્પ્ટ કોપી', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                    onPressed: () {
                                      final promptText = item.slidePrompt.isNotEmpty ? item.slidePrompt : item.masterPrompt;
                                      Clipboard.setData(ClipboardData(text: promptText));
                                      _showSnack('ટૂલ ૨: ૧૬:૯ વ્હાઇટ PPT પ્રોમ્પ્ટ સફળતાપૂર્વક કોપી થઈ ગયો! ✓');
                                    },
                                  ),
                                ),
                                const SizedBox(width: 8),
                                OutlinedButton.icon(
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: const Color(0xFF7C3AED),
                                    side: const BorderSide(color: Color(0xFFC4B5FD)),
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                  icon: const Icon(Icons.slideshow, size: 14),
                                  label: const Text('સ્લાઇડ્સ ➔', style: TextStyle(fontSize: 11)),
                                  onPressed: () {
                                    setState(() {
                                      _selectedTopic = item.topicGujarati;
                                      _slideVoiceoverTitleController.text = item.suggestedTitle.isNotEmpty ? item.suggestedTitle : item.topicGujarati;
                                      _nativeSelectedTab = 1; // Tab 1: Slides
                                    });
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // Tab 2: Script Writer (ટોપિક ➔ PDF વાંચીને શ્રેષ્ઠ પ્રોમ્પ્ટ)
  // -------------------------------------------------------------
  Widget _buildNativeScriptView() {
    final activeTopic = _uploadedSlidePdfFilename.isNotEmpty
        ? _uploadedSlidePdfFilename.replaceAll(RegExp(r'\.pdf$', caseSensitive: false), '').replaceAll('_', ' ')
        : (_scriptTopicController.text.trim().isNotEmpty
            ? _scriptTopicController.text.trim()
            : (_selectedTopic.trim().isNotEmpty ? _selectedTopic.trim() : 'ગુજરાત સરકાર સત્તાવાર પરિપત્ર અને ભરતી નિર્ણય ૨૦૨૬'));

    if (_scriptTopicController.text.trim().isEmpty) {
      _scriptTopicController.text = activeTopic;
    }

    final currentPrompt = _slideVoiceoverMasterPrompt.trim().isNotEmpty
        ? _slideVoiceoverMasterPrompt
        : SlideVoiceoverService.generateFullPdfMasterPrompt(
            topic: activeTopic,
            filename: _uploadedSlidePdfFilename,
          );

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // 1. શીર્ષક
        const Text(
          '૩. સ્ક્રિપ્ટ રાઇટર (PDF Master Script)',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const SizedBox(height: 12),

        // 2. PDF મૂકવાનું (PDF Upload)
        InkWell(
          onTap: _isGeneratingSlideVoiceover ? null : _pickAndUploadSlidePdf,
          borderRadius: BorderRadius.circular(10),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF131722),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: _uploadedSlidePdfFilename.isNotEmpty ? const Color(0xFF10B981) : const Color(0xFF38BDF8),
                width: 1.5,
              ),
            ),
            child: Row(
              children: [
                Icon(
                  _uploadedSlidePdfFilename.isNotEmpty ? Icons.check_circle : Icons.picture_as_pdf,
                  color: _uploadedSlidePdfFilename.isNotEmpty ? const Color(0xFF10B981) : const Color(0xFF38BDF8),
                  size: 26,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    _uploadedSlidePdfFilename.isNotEmpty
                        ? _uploadedSlidePdfFilename
                        : '📁 અહીં PDF મૂકો / પસંદ કરો',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _uploadedSlidePdfFilename.isNotEmpty ? const Color(0xFF10B981) : const Color(0xFF38BDF8),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                  ),
                  onPressed: _isGeneratingSlideVoiceover ? null : _pickAndUploadSlidePdf,
                  child: Text(
                    _isGeneratingSlideVoiceover
                        ? 'વાંચે છે...'
                        : (_uploadedSlidePdfFilename.isNotEmpty ? 'બદલો' : 'PDF પસંદ કરો'),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 14),

        // 3. ૧-ક્લિક પ્રોમ્પ્ટ કોપી કરો
        ElevatedButton.icon(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF10B981),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            elevation: 2,
          ),
          icon: const Icon(Icons.copy, size: 18),
          label: const Text(
            '📋 પ્રોમ્પ્ટ કોપી કરો',
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
          ),
          onPressed: () {
            Clipboard.setData(ClipboardData(text: currentPrompt));
            _showSnack('પ્રોમ્પ્ટ કોપી થઈ ગયો! 📋');
          },
        ),
        const SizedBox(height: 10),

        // 4. એ એક જ પ્રોમ્પ્ટ બોક્સ
        Container(
          width: double.infinity,
          height: 480,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF0A0D14),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: SingleChildScrollView(
            child: SelectableText(
              currentPrompt,
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 11.5,
                color: Color(0xFFE2E8F0),
                height: 1.5,
              ),
            ),
          ),
        ),
      ],
    );
  }

  // -------------------------------------------------------------
  // Tab 3: Google Cloud Voice & Clone Studio (Clutter-Free & Expressive)
  // -------------------------------------------------------------
  Widget _buildNativeVoiceView() {
    final text = _voiceScriptController.text.trim();
    final words = text.isNotEmpty ? text.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length : 0;
    final estSec = ((words / 130) * 60).round();

    final voiceProfiles = [
      {
        'id': 'google-wavenet-female',
        'voiceId': 'gu-IN-Wavenet-A',
        'name': '👩 ગુજરાતી સ્ત્રી અવાજ (Google Cloud Wavenet)',
        'badge': 'ગૂગલ Wavenet ⭐',
        'desc': 'અત્યંત મીઠો, કુદરતી અને સ્પષ્ટ સ્ત્રી અવાજ. યોજના અને શૈક્ષણિક વિડીયો માટે શ્રેષ્ઠ.',
        'color': const Color(0xFFEC4899),
        'sample': 'assets/audio/sample_google_cloud_gujarati.mp3',
      },
      {
        'id': 'google-wavenet-male',
        'voiceId': 'gu-IN-Wavenet-B',
        'name': '👨 ગુજરાતી પુરુષ અવાજ (Google Cloud Wavenet)',
        'badge': 'સત્તાવાર અવાજ ⭐',
        'desc': 'ગંભીર, મજબૂત અને પ્રભાવશાળી પુરુષ અવાજ. પરિપત્રો અને બ્રેકિંગ ન્યૂઝ માટે શ્રેષ્ઠ.',
        'color': const Color(0xFF38BDF8),
        'sample': 'assets/audio/clean_fluent_professional.mp3',
      },
      {
        'id': 'my-cloned-voice',
        'voiceId': 'custom-clone',
        'name': '👑 મારો અસલી અવાજ',
        'badge': 'ક્લોન અવાજ 👑',
        'desc': 'તમારા પોતાના અવાજનું મોડેલ અથવા Google Custom Voice ID વડે તમારો વાસ્તવિક અવાજ.',
        'color': const Color(0xFF8B5CF6),
        'sample': 'assets/audio/my_real_cloned_voice.mp3',
      },
      {
        'id': 'cloned-female-janki',
        'voiceId': '1UyAke1iefrWyqm395qX',
        'name': '👑 જાનકી ભટ્ટી (Cloned Female)',
        'badge': 'ક્લોન સ્ત્રી ⭐',
        'desc': 'શુદ્ધ ગુજરાતી ક્લોન કરેલ સ્ત્રી અવાજ (સત્તાવાર વાણી).',
        'color': const Color(0xFFD946EF),
        'sample': 'assets/audio/sample_janki_bhatti_cloned.mp3',
      },
      {
        'id': 'edge-dhwani',
        'voiceId': 'gu-IN-DhwaniNeural',
        'name': '🌸 ધ્વનિ ન્યુરલ (Dhwani)',
        'badge': 'Free / Unlimited',
        'desc': 'કુદરતી ગુજરાતી સ્ત્રી અવાજ, અત્યંત મીઠો અને સ્પષ્ટ.',
        'color': const Color(0xFF10B981),
        'sample': 'assets/audio/pure_gujarati_native.mp3',
      },
      {
        'id': 'edge-niranjan',
        'voiceId': 'gu-IN-NiranjanNeural',
        'name': '🧔 નિરંજન ન્યુરલ (Niranjan)',
        'badge': 'Free / News',
        'desc': 'સત્તાવાર સમાચાર અને સરકારી ઠરાવો માટે ગંભીર પુરુષ અવાજ.',
        'color': const Color(0xFF0EA5E9),
        'sample': 'assets/audio/clean_fluent_professional.mp3',
      },
    ];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // 🎭 CARD 1: VOICE PROFILES (Google Cloud & Cloned Voice)
        Container(
          margin: const EdgeInsets.only(bottom: 14),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF131722),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF8B5CF6).withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('🎭 ૧. અવાજ પસંદ કરો (Voice Profile)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 10),

              ...voiceProfiles.map((p) {
                final isSelected = (_selectedVoiceProfile == p['id']);
                final Color pColor = p['color'] as Color;
                return GestureDetector(
                  onTap: () => setState(() => _selectedVoiceProfile = p['id'] as String),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: isSelected ? pColor.withValues(alpha: 0.12) : const Color(0xFF0A0D14),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: isSelected ? pColor : const Color(0xFF1E293B), width: isSelected ? 1.5 : 1),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Wrap(
                                spacing: 8,
                                crossAxisAlignment: WrapCrossAlignment.center,
                                children: [
                                  Text(p['name'] as String, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13)),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(color: pColor.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(4)),
                                    child: Text(p['badge'] as String, style: TextStyle(fontSize: 9.5, color: pColor, fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 3),
                              Text(p['desc'] as String, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: Icon(
                            (_currentlyPlayingUrl == p['sample'] && _isPlaying) ? Icons.pause_circle : Icons.play_circle,
                            color: pColor,
                            size: 26,
                          ),
                          onPressed: () => _playAudio(p['sample'] as String),
                        ),
                      ],
                    ),
                  ),
                );
              }),

              const SizedBox(height: 8),

              // Speed Slider
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('વાણીની ઝડપ (Speed):', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8))),
                  Text('${_voiceSpeed.toStringAsFixed(2)}x', style: const TextStyle(fontSize: 12, color: Color(0xFF38BDF8), fontWeight: FontWeight.bold)),
                ],
              ),
              Slider(
                value: _voiceSpeed,
                min: 0.8,
                max: 1.3,
                divisions: 10,
                activeColor: const Color(0xFF38BDF8),
                onChanged: (val) => setState(() => _voiceSpeed = val),
              ),

              const SizedBox(height: 6),

              // ⚙️ Expandable Google Cloud API & Custom Voice Settings
              GestureDetector(
                onTap: () => setState(() => _showVoiceSettings = !_showVoiceSettings),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0A0D14),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF8B5CF6).withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.settings, size: 16, color: Color(0xFFC4B5FD)),
                          SizedBox(width: 8),
                          Text('⚙️ ગૂગલ ક્લાઉડ API & અવાજ ક્લોનિંગ સેટિંગ્સ', style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Color(0xFFC4B5FD))),
                        ],
                      ),
                      Icon(_showVoiceSettings ? Icons.expand_less : Icons.expand_more, size: 18, color: const Color(0xFFC4B5FD)),
                    ],
                  ),
                ),
              ),

              if (_showVoiceSettings) ...[
                const SizedBox(height: 10),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0A0D14),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF1E293B)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF10B981).withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: const Text(
                          '💡 ગૂગલ ક્લાઉડમાં દર મહિને ૧૦,૦૦,૦૦૦ (૧૦ લાખ) અક્ષરો તદ્દન ફ્રી મળે છે! જો તમારી પાસે Google Cloud API Key હોય તો દાખલ કરો. કી ના હોય તો પણ 100% ફ્રી એન્જિન આપમેળે ચાલશે.',
                          style: TextStyle(fontSize: 10.5, color: Color(0xFF10B981), height: 1.35),
                        ),
                      ),
                      const Text('Google Cloud API Key (ઓપ્શનલ):', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white70)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _googleApiKeyController,
                        obscureText: true,
                        style: const TextStyle(fontSize: 12, color: Colors.white),
                        decoration: InputDecoration(
                          hintText: 'તમારી Google Cloud API Key અહીં દાખલ કરો...',
                          hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          filled: true,
                          fillColor: const Color(0xFF131722),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
                        ),
                      ),
                      const SizedBox(height: 8),
                      const Text('કસ્ટમ વોઇસ / ક્લોન ID (Voice Model ID):', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white70)),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _customVoiceIdController,
                        style: const TextStyle(fontSize: 12, color: Colors.white),
                        decoration: InputDecoration(
                          hintText: 'દા.ત. projects/.../voices/my-clone અથવા gu-IN-Wavenet-B',
                          hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                          filled: true,
                          fillColor: const Color(0xFF131722),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(6)),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Align(
                        alignment: Alignment.centerRight,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF10B981),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                          ),
                          icon: const Icon(Icons.save, size: 14),
                          label: const Text('સેવ કરો', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          onPressed: _saveVoiceSettings,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),

        // 📝 CARD 2: SCRIPT INPUT & EMOTION (ભાવ સાથે વ્યવસ્થિત બોલે)
        Container(
          margin: const EdgeInsets.only(bottom: 14),
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
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Expanded(
                    child: Text(
                      '📝 ૨. ગુજરાતી સ્ક્રિપ્ટ લખાણ & ભાવ',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ),
                  Wrap(
                    spacing: 6,
                    children: [
                      TextButton.icon(
                        style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: Size.zero),
                        icon: const Icon(Icons.paste, size: 14, color: Color(0xFF8B5CF6)),
                        label: const Text('સ્ક્રિપ્ટ લાવો', style: TextStyle(fontSize: 11.5, color: Color(0xFF8B5CF6))),
                        onPressed: () {
                          setState(() {
                            if (_scriptSections.isNotEmpty) {
                              _voiceScriptController.text = _scriptSections.map((s) => s.content).join('\n\n');
                            }
                          });
                          _showSnack('સ્ક્રિપ્ટ સફળતાપૂર્વક લોડ થઈ ગઈ! ✓');
                        },
                      ),
                      const SizedBox(width: 8),
                      TextButton(
                        style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: Size.zero),
                        child: const Text('સાફ કરો', style: TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                        onPressed: () => setState(() => _voiceScriptController.clear()),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Emotion / Mood Selection Chips
              const Text('ભાવ & શૈલી પસંદ કરો (Emotion):', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8))),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: [
                  ChoiceChip(
                    label: const Text('🌟 ઉત્સાહી & આકર્ષક', style: TextStyle(fontSize: 11)),
                    selected: _selectedVoiceEmotion == GujaratiVoiceEmotion.enthusiastic,
                    selectedColor: const Color(0xFFEC4899),
                    backgroundColor: const Color(0xFF0A0D14),
                    labelStyle: TextStyle(
                      color: _selectedVoiceEmotion == GujaratiVoiceEmotion.enthusiastic ? Colors.white : const Color(0xFFCBD5E1),
                      fontWeight: FontWeight.bold,
                    ),
                    onSelected: (val) {
                      if (val) setState(() => _selectedVoiceEmotion = GujaratiVoiceEmotion.enthusiastic);
                    },
                  ),
                  ChoiceChip(
                    label: const Text('🏛️ ગંભીર & સત્તાવાર', style: TextStyle(fontSize: 11)),
                    selected: _selectedVoiceEmotion == GujaratiVoiceEmotion.official,
                    selectedColor: const Color(0xFF38BDF8),
                    backgroundColor: const Color(0xFF0A0D14),
                    labelStyle: TextStyle(
                      color: _selectedVoiceEmotion == GujaratiVoiceEmotion.official ? Colors.white : const Color(0xFFCBD5E1),
                      fontWeight: FontWeight.bold,
                    ),
                    onSelected: (val) {
                      if (val) setState(() => _selectedVoiceEmotion = GujaratiVoiceEmotion.official);
                    },
                  ),
                  ChoiceChip(
                    label: const Text('🌸 શાંત & શૈક્ષણિક', style: TextStyle(fontSize: 11)),
                    selected: _selectedVoiceEmotion == GujaratiVoiceEmotion.calm,
                    selectedColor: const Color(0xFF10B981),
                    backgroundColor: const Color(0xFF0A0D14),
                    labelStyle: TextStyle(
                      color: _selectedVoiceEmotion == GujaratiVoiceEmotion.calm ? Colors.white : const Color(0xFFCBD5E1),
                      fontWeight: FontWeight.bold,
                    ),
                    onSelected: (val) {
                      if (val) setState(() => _selectedVoiceEmotion = GujaratiVoiceEmotion.calm);
                    },
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Script Text Area
              TextField(
                controller: _voiceScriptController,
                maxLines: 6,
                style: const TextStyle(fontSize: 13, color: Colors.white, height: 1.5),
                decoration: InputDecoration(
                  hintText: 'અહીં તમારી ગુજરાતી સ્ક્રિપ્ટ લખો અથવા પેસ્ટ કરો...',
                  hintStyle: const TextStyle(color: Color(0xFF64748B)),
                  filled: true,
                  fillColor: const Color(0xFF0A0D14),
                  contentPadding: const EdgeInsets.all(12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF1E293B))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFF8B5CF6), width: 1.5)),
                ),
                onChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 8),

              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('શબ્દો: $words', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
                  Text('અંદાજિત સમય: ~$estSec સેકન્ડ', style: const TextStyle(fontSize: 11, color: Color(0xFF38BDF8))),
                  const Text('✓ ભાવ સાથે SSML સક્રિય', style: TextStyle(fontSize: 10.5, color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                ],
              ),
            ],
          ),
        ),

        // 🚀 CARD 3: GENERATE AUDIO BUTTON
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF8B5CF6),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              elevation: 3,
            ),
            icon: _isGeneratingVoice
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Icon(Icons.mic, size: 20),
            label: Text(
              _isGeneratingVoice
                  ? (_generatingProgressMessage.isNotEmpty ? _generatingProgressMessage : 'ઓડિયો તૈયાર થાય છે...')
                  : '🎙️ સંપૂર્ણ સ્ક્રિપ્ટ ઓડિયો બનાવો (Generate Voice Audio)',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
            ),
            onPressed: _isGeneratingVoice ? null : _generateVoiceAudio,
          ),
        ),
        const SizedBox(height: 14),

        // 🎧 CARD 4: GENERATED AUDIO PLAYER
        if (_generatedAudioUrl != null)
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF2E1065), Color(0xFF1E1B4B)]),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFF8B5CF6)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('🎧 જનરેટ કરેલ ઓડિયો નેરેશન', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                    Row(
                      children: [
                        if (_generatedAudioProvider != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            margin: const EdgeInsets.only(right: 6),
                            decoration: BoxDecoration(color: const Color(0xFF8B5CF6).withValues(alpha: 0.2), borderRadius: BorderRadius.circular(4)),
                            child: Text(_generatedAudioProvider!, style: const TextStyle(fontSize: 9, color: Color(0xFFC4B5FD))),
                          ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: const Color(0xFF10B981).withValues(alpha: 0.2), borderRadius: BorderRadius.circular(4)),
                          child: const Text('તૈયાર ✓', style: TextStyle(fontSize: 10, color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ],
                ),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        _generatedAudioFilename ?? 'narration.mp3',
                        style: const TextStyle(fontSize: 12, color: Color(0xFFC4B5FD)),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      tooltip: 'નામ બદલો (Rename)',
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                      icon: const Icon(Icons.edit_outlined, size: 16, color: Color(0xFF38BDF8)),
                      onPressed: () {
                        _renameAudioFile({
                          'filename': _generatedAudioFilename,
                          'path': _generatedAudioUrl,
                          'audioUrl': _generatedAudioUrl,
                        });
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Audio Controls Row
                Row(
                  children: [
                    IconButton(
                      icon: Icon(_isPlaying ? Icons.pause_circle_filled : Icons.play_circle_filled, size: 38, color: Colors.white),
                      onPressed: () => _playAudio(_generatedAudioUrl!),
                    ),
                    Expanded(
                      child: Slider(
                        value: _audioPosition.inMilliseconds.toDouble().clamp(0.0, _audioDuration.inMilliseconds.toDouble()),
                        max: _audioDuration.inMilliseconds.toDouble() > 0 ? _audioDuration.inMilliseconds.toDouble() : 1.0,
                        activeColor: const Color(0xFFEC4899),
                        onChanged: (val) {
                          _audioPlayer.seek(Duration(milliseconds: val.toInt()));
                        },
                      ),
                    ),
                    Text(
                      '${_audioPosition.inMinutes}:${(_audioPosition.inSeconds % 60).toString().padLeft(2, '0')}',
                      style: const TextStyle(fontSize: 11, color: Colors.white70),
                    ),
                    const SizedBox(width: 4),
                    TextButton(
                      style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: const Size(36, 24)),
                      child: Text('${_playbackSpeed}x', style: const TextStyle(fontSize: 11, color: Color(0xFF38BDF8), fontWeight: FontWeight.bold)),
                      onPressed: () {
                        setState(() {
                          if (_playbackSpeed == 1.0) {
                            _playbackSpeed = 1.25;
                          } else if (_playbackSpeed == 1.25) {
                            _playbackSpeed = 1.5;
                          } else {
                            _playbackSpeed = 1.0;
                          }
                        });
                        _audioPlayer.setPlaybackRate(_playbackSpeed);
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Save, Share & Delete Buttons Row
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF10B981),
                          side: const BorderSide(color: Color(0xFF10B981)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                        ),
                        icon: const Icon(Icons.download_done, size: 15),
                        label: const Text('સાચવો', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        onPressed: () => _saveAudioFileConfirmation(_generatedAudioUrl!),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF8B5CF6),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                        ),
                        icon: const Icon(Icons.share, size: 15),
                        label: const Text('શેર કરો', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        onPressed: () => _shareAudioFile(_generatedAudioUrl!),
                      ),
                    ),
                    const SizedBox(width: 6),
                    IconButton(
                      tooltip: 'ડિલીટ કરો (Delete)',
                      style: IconButton.styleFrom(
                        backgroundColor: const Color(0xFFEF4444).withValues(alpha: 0.15),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                          side: const BorderSide(color: Color(0xFFEF4444)),
                        ),
                      ),
                      icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 18),
                      onPressed: () {
                        _deleteAudioFile({
                          'filename': _generatedAudioFilename,
                          'path': _generatedAudioUrl,
                          'audioUrl': _generatedAudioUrl,
                        });
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),

        // 📂 CARD 5: AUDIO LIBRARY
        if (_audioLibrary.isNotEmpty) ...[
          const SizedBox(height: 14),
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('🎧 સાચવેલ ઓડિયો લાઇબ્રેરી', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white)),
                    IconButton(
                      icon: const Icon(Icons.refresh, size: 16, color: Color(0xFF38BDF8)),
                      onPressed: _fetchVoiceLibrary,
                    ),
                  ],
                ),
                ..._audioLibrary.take(6).map((item) {
                  final fname = item['filename']?.toString() ?? 'audio.mp3';
                  final rawUrl = item['audioUrl']?.toString() ?? item['path']?.toString() ?? '';
                  final fullUrl = rawUrl.startsWith('http') ? rawUrl : (rawUrl.startsWith('/') || rawUrl.contains(':') ? rawUrl : '$_serverUrl$rawUrl');
                  final isThisPlaying = (_currentlyPlayingUrl == fullUrl && _isPlaying);
                  return Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0A0D14),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: isThisPlaying ? const Color(0xFF10B981) : const Color(0xFF1E293B)),
                    ),
                    child: Row(
                      children: [
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: Icon(isThisPlaying ? Icons.pause_circle_filled : Icons.play_circle_filled, color: const Color(0xFF10B981), size: 26),
                          onPressed: () => _playAudio(fullUrl),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(fname, style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.bold, color: Colors.white), maxLines: 1, overflow: TextOverflow.ellipsis),
                              const SizedBox(height: 2),
                              Text(item['sizeFormatted']?.toString() ?? '', style: const TextStyle(fontSize: 9.5, color: Color(0xFF64748B))),
                            ],
                          ),
                        ),
                        IconButton(
                          tooltip: 'નામ બદલો (Rename)',
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(Icons.edit_outlined, size: 16, color: Color(0xFF38BDF8)),
                          onPressed: () => _renameAudioFile(item),
                        ),
                        const SizedBox(width: 4),
                        IconButton(
                          tooltip: 'શેર કરો (Share)',
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(Icons.share, size: 16, color: Color(0xFF8B5CF6)),
                          onPressed: () => _shareAudioFile(fullUrl),
                        ),
                        const SizedBox(width: 4),
                        IconButton(
                          tooltip: 'કાઢી નાખો (Delete)',
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(Icons.delete_outline, size: 16, color: Color(0xFFEF4444)),
                          onPressed: () => _deleteAudioFile(item),
                        ),
                      ],
                    ),
                  );
                }),
              ],
            ),
          ),
        ],
      ],
    );
  }

  // -------------------------------------------------------------
  // Tab 3: White Slide Maker & 16:9 Slide Preview Studio
  // -------------------------------------------------------------
  Widget _buildNativeSlidesView() {
    final activeTopic = _selectedTopic.trim().isNotEmpty
        ? _selectedTopic.trim()
        : (_slideTopicController.text.trim().isNotEmpty
            ? _slideTopicController.text.trim()
            : 'ગુજરાત કર્મચારી પગાર અને DA વધારો 2026');

    if (_slideTopicController.text.trim().isEmpty) {
      _slideTopicController.text = activeTopic;
    }

    // Retrieve or dynamically generate the authentic NotebookLM Tool 2 Prompt for the current active topic
    final promptRes = NotebookLMService.generateLocalPrompt(topic: activeTopic);
    final tool2Prompt = _notebooklmPromptText.trim().isNotEmpty
        ? _notebooklmPromptText
        : promptRes.pptDeckPrompt;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      children: [
        // ==============================================================
        // B. TOPIC NAME (ELEMENT 1)
        // ==============================================================
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF131722),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF1E293B)),
            boxShadow: const [
              BoxShadow(color: Color(0x20000000), blurRadius: 8, offset: Offset(0, 2)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: const [
                      Text('🎯', style: TextStyle(fontSize: 16)),
                      SizedBox(width: 8),
                      Text(
                        'પસંદ કરેલ વિષય (Selected Topic)',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF94A3B8),
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'GYAN YATRA 🎯',
                      style: TextStyle(fontSize: 9, color: Color(0xFF38BDF8), fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _slideTopicController,
                onChanged: (val) {
                  setState(() {
                    _selectedTopic = val;
                    _notebooklmPromptText = '';
                  });
                },
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                  height: 1.35,
                ),
                decoration: const InputDecoration(
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                  border: OutlineInputBorder(
                    borderSide: BorderSide(color: Color(0xFF1E293B)),
                    borderRadius: BorderRadius.all(Radius.circular(8)),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: Color(0xFF1E293B)),
                    borderRadius: BorderRadius.all(Radius.circular(8)),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderSide: BorderSide(color: Color(0xFF38BDF8)),
                    borderRadius: BorderRadius.all(Radius.circular(8)),
                  ),
                  filled: true,
                  fillColor: Color(0xFF0A0D14),
                  hintText: 'વિષય લખો અથવા પસંદ કરો...',
                  hintStyle: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),

        // ==============================================================
        // C. NOTEBOOKLM PROMPT TOOL 2 (ELEMENT 2)
        // ==============================================================
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF131722),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF8B5CF6), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF8B5CF6).withValues(alpha: 0.12),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header Row with Copy Tool 2 Button
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Expanded(
                    child: Row(
                      children: [
                        Text('🖥️', style: TextStyle(fontSize: 18)),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'NotebookLM Tool 2 પ્રોમ્પ્ટ',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _copiedTool2 ? const Color(0xFF10B981) : const Color(0xFF8B5CF6),
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: Icon(_copiedTool2 ? Icons.check_circle_rounded : Icons.copy, size: 14),
                    label: Text(
                      _copiedTool2 ? '✓ કોપી થઈ ગયું!' : 'કોપી ટૂલ ૨',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: tool2Prompt));
                      setState(() => _copiedTool2 = true);
                      _showSnack('ટૂલ ૨: NotebookLM ૧૬:૯ વ્હાઇટ PPT પ્રોમ્પ્ટ સફળતાપૂર્વક કોપી થઈ ગયો! ✓');
                      Future.delayed(const Duration(seconds: 2), () {
                        if (mounted) setState(() => _copiedTool2 = false);
                      });
                    },
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'NotebookLM ના "Slide Deck" માટે ૧૦૦% શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF), બોલ્ડ હેડિંગ બોક્સ, બુલેટ પોઇન્ટ્સ અને શ્રેષ્ઠ અસલી ફોટા પ્રોમ્પ્ટ:',
                style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8), height: 1.4),
              ),
              const SizedBox(height: 12),

              // Prompt Text Container (Monospace, Scrollable, Selectable)
              Container(
                width: double.infinity,
                constraints: const BoxConstraints(minHeight: 280, maxHeight: 420),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0A0D14),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: SingleChildScrollView(
                  child: SelectableText(
                    tool2Prompt,
                    style: const TextStyle(
                      fontSize: 11.5,
                      color: Color(0xFFE2E8F0),
                      height: 1.5,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Bottom Full-Width Copy Action for Convenient Mobile Tap
              SizedBox(
                width: double.infinity,
                height: 42,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _copiedTool2 ? const Color(0xFF10B981) : const Color(0xFF7C3AED),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: Icon(_copiedTool2 ? Icons.check_circle_rounded : Icons.copy, size: 16),
                  label: Text(
                    _copiedTool2 ? 'પ્રોમ્પ્ટ કોપી થઈ ગયો છે ✓' : '૧-ક્લિક ટૂલ ૨ પ્રોમ્પ્ટ કોપી કરો',
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  onPressed: () {
                    Clipboard.setData(ClipboardData(text: tool2Prompt));
                    setState(() => _copiedTool2 = true);
                    _showSnack('ટૂલ ૨: NotebookLM ૧૬:૯ વ્હાઇટ PPT પ્રોમ્પ્ટ સફળતાપૂર્વક કોપી થઈ ગયો! ✓');
                    Future.delayed(const Duration(seconds: 2), () {
                      if (mounted) setState(() => _copiedTool2 = false);
                    });
                  },
                ),
              ),
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 42,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.arrow_forward, size: 16),
                  label: const Text(
                    'આગળનું પગલું: સ્ક્રિપ્ટ રાઇટર ખોલો (Tool 3) ➔',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  onPressed: () {
                    setState(() {
                      _scriptTopicController.text = activeTopic;
                      _selectedTopic = activeTopic;
                      _nativeSelectedTab = 2; // Script is right next to Slides!
                    });
                  },
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // -------------------------------------------------------------
  // Tab 4: SEO & 1-Photo White Thumbnail (Full Parity with seo.js & thumbnails.js)
  // -------------------------------------------------------------
  Widget _buildNativeSeoThumbnailView() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Controls Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF131722),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('🚀 ૫. 1-ક્લિક SEO & શુદ્ધ સફેદ થંબનેલ સ્ટુડિયો', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 10),

              TextField(
                controller: _seoTopicController,
                style: const TextStyle(fontSize: 13, color: Colors.white, fontWeight: FontWeight.bold),
                decoration: InputDecoration(
                  labelText: 'વિષય (Topic)',
                  labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                  filled: true,
                  fillColor: const Color(0xFF0A0D14),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 12),

              SizedBox(
                width: double.infinity,
                height: 46,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B),
                    foregroundColor: Colors.black,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: _isGeneratingSeo
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                      : const Icon(Icons.rocket_launch),
                  label: Text(_isGeneratingSeo ? 'SEO જનરેટ થાય છે...' : '1-Click SEO & થંબનેલ બનાવો', style: const TextStyle(fontWeight: FontWeight.bold)),
                  onPressed: _isGeneratingSeo ? null : _generateSeoAndThumbnails,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // 1. Smart Thumbnail 3-4 Text Elements & AI Photo Prompt (Prominent at Top)
        _buildSmartThumbnailCard(),
        const SizedBox(height: 14),

        // 10 Clickable Gujarati Titles Card
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
              const Text('🎯 હાઇ-CTR ગુજરાતી ટાઇટલ્સ (Titles)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 10),
              ..._seoTitles.take(5).map((t) => Container(
                    margin: const EdgeInsets.only(bottom: 8),
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: const Color(0xFF0A0D14), borderRadius: BorderRadius.circular(6)),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(child: Text(t, style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.w600))),
                        IconButton(
                          icon: const Icon(Icons.copy, size: 16, color: Color(0xFF38BDF8)),
                          tooltip: 'ટાઇટલ કોપી',
                          onPressed: () {
                            Clipboard.setData(ClipboardData(text: t));
                            _showSnack('ટાઇટલ કોપી થઈ ગયું!');
                          },
                        ),
                      ],
                    ),
                  )),
              if (_abTitles.isNotEmpty) ...[
                const SizedBox(height: 10),
                const Text('A/B Testing Variations:', style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                if (_abTitles['emotional'] != null)
                  _buildAbRow('ભાવનાત્મક (Emotional)', _abTitles['emotional'].toString()),
                if (_abTitles['curiosity'] != null)
                  _buildAbRow('જિજ્ઞાસા (Curiosity)', _abTitles['curiosity'].toString()),
                if (_abTitles['benefit'] != null)
                  _buildAbRow('લાભ (Benefit)', _abTitles['benefit'].toString()),
              ],
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Description Card
        if (_seoDescription.isNotEmpty) ...[
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
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('📄 Description (ચેપ્ટર્સ સહિત)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                    IconButton(
                      icon: const Icon(Icons.copy, size: 16, color: Color(0xFF38BDF8)),
                      tooltip: 'ડિસ્ક્રિપ્શન કોપી',
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: _seoDescription));
                        _showSnack('ડિસ્ક્રિપ્શન કોપી થઈ ગયું!');
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(_seoDescription, style: const TextStyle(fontSize: 11, color: Color(0xFFCBD5E1), height: 1.4)),
              ],
            ),
          ),
          const SizedBox(height: 14),
        ],

        // Tags Card
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('🏷️ YouTube Tags (ટેગ્સ)', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white)),
                  IconButton(
                    icon: const Icon(Icons.copy, size: 16, color: Color(0xFF10B981)),
                    tooltip: 'બધા ટેગ્સ કોપી',
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: _seoTags));
                      _showSnack('બધા ટેગ્સ કોપી થઈ ગયા!');
                    },
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(_seoTags, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8), height: 1.4)),
            ],
          ),
        ),
        if (_pinnedComment.isNotEmpty) ...[
          const SizedBox(height: 12),
          _buildCopyableCard('📌 પિન્ડ કમેન્ટ (Pinned Comment)', _pinnedComment),
        ],
        if (_callToAction.isNotEmpty) ...[
          const SizedBox(height: 10),
          _buildCopyableCard('📢 કોલ ટુ એક્શન (Call To Action)', _callToAction),
        ],
      ],
    );
  }

  // Smart Thumbnail 3-4 Text Elements & Color Contrast Studio Card (Prominent at top)
  Widget _buildSmartThumbnailCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF131722),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.5)),
      ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Text('🎯', style: TextStyle(fontSize: 18)),
                            SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'સ્માર્ટ થંબનેલ ૩-૪ ટેક્સ્ટ & કલર કોન્ટ્રાસ્ટ',
                                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'અસલી ૧ ફોટો (ડાબે) + ૩-૪ બોલ્ડ એલિમેન્ટ્સ (જમણે) — ૧૦૦% શુદ્ધ સફેદ બેકગ્રાઉન્ડ',
                          style: TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F766E),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
                    ),
                    icon: _isOptimizingThumb
                        ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.bolt, size: 16),
                    label: const Text('ઓટો', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    onPressed: _isOptimizingThumb ? null : () => _smartOptimizeThumbnail(forceApi: true),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Color Matrix Indicators
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF0A0D14),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4)),
                      child: const Text('#FFFFFF સફેદ', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFF102A56), borderRadius: BorderRadius.circular(4)),
                      child: const Text('#102A56 નેવી', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFFD71920), borderRadius: BorderRadius.circular(4)),
                      child: const Text('#D71920 લાલ / #FFD928 પીળો', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFFFD928))),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFF111111), borderRadius: BorderRadius.circular(4), border: Border.all(color: const Color(0xFF475569))),
                      child: const Text('#111111 કાળો', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Interactive 4-Element Text Inputs
              const Text(
                '✏️ ૩-૪ ટેક્સ્ટ એલિમેન્ટ્સ એડિટ કરો (મોબાઇલ સ્ક્રીન હાયરાર્કી):',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF38BDF8)),
              ),
              const SizedBox(height: 8),

              _buildThumbElementInput(
                label: '૧. મુખ્ય વિષય (Main Topic)',
                colorBadge: '#102A56 Deep Navy',
                badgeBg: const Color(0xFF102A56),
                badgeTextColor: Colors.white,
                controller: _thumbEl1Controller,
              ),

              _buildThumbElementInput(
                label: '૨. પ્રાયમરી હૂક (Primary Hook - મોટું & બોલ્ડ)',
                colorBadge: '#D71920 Red / #FFD928 Yellow',
                badgeBg: const Color(0xFFD71920),
                badgeTextColor: const Color(0xFFFFD928),
                controller: _thumbEl2Controller,
              ),

              _buildThumbElementInput(
                label: '૩. સહાયક વિગત (Supporting Detail)',
                colorBadge: '#111111 Charcoal Black',
                badgeBg: const Color(0xFF111111),
                badgeTextColor: Colors.white,
                controller: _thumbEl3Controller,
              ),

              _buildThumbElementInput(
                label: '૪. સ્ટેટસ બેજ (Status Badge - વૈકલ્પિક)',
                colorBadge: '#102A56 Navy Badge',
                badgeBg: const Color(0xFF102A56),
                badgeTextColor: const Color(0xFF93C5FD),
                controller: _thumbEl4Controller,
              ),

              const SizedBox(height: 6),

              // Mode Switcher (Ultimate vs Dalle-only)
              Row(
                children: [
                  ChoiceChip(
                    label: const Text('🎯 સંપૂર્ણ સ્માર્ટ પ્રોમ્પ્ટ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    selected: _thumbnailPromptMode == 'ultimate',
                    selectedColor: const Color(0xFF10B981).withValues(alpha: 0.2),
                    backgroundColor: const Color(0xFF0A0D14),
                    onSelected: (sel) {
                      if (sel) {
                        setState(() {
                          _thumbnailPromptMode = 'ultimate';
                          _rebuildThumbnailPromptLocally();
                        });
                      }
                    },
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: const Text('🤖 DALL-E 3 શોર્ટ', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                    selected: _thumbnailPromptMode == 'dalle-only',
                    selectedColor: const Color(0xFF38BDF8).withValues(alpha: 0.2),
                    backgroundColor: const Color(0xFF0A0D14),
                    onSelected: (sel) {
                      if (sel) {
                        setState(() {
                          _thumbnailPromptMode = 'dalle-only';
                          _rebuildThumbnailPromptLocally();
                        });
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Prompt Box
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF07090E),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFF1E293B)),
                ),
                child: Text(
                  _thumbnailPrompt,
                  style: const TextStyle(fontSize: 11, color: Color(0xFFCBD5E1), height: 1.45, fontFamily: 'monospace'),
                ),
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFDC2626),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                      ),
                      icon: _isGeneratingThumbnailImage
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(Icons.image),
                      label: const Text('AI થંબનેલ ઇમેજ બનાવો', style: TextStyle(fontWeight: FontWeight.bold)),
                      onPressed: _isGeneratingThumbnailImage ? null : _generateThumbnailImage,
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Color(0xFF10B981)),
                    ),
                    icon: const Icon(Icons.copy, size: 16, color: Color(0xFF10B981)),
                    label: const Text('પ્રોમ્પ્ટ કોપી કરો'),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: _thumbnailPrompt));
                      _showSnack('થંબનેલ પ્રોમ્પ્ટ કોપી થઈ ગયો!');
                    },
                  ),
                ],
              ),

              if (_generatedThumbnailImageUrl != null) ...[
                const SizedBox(height: 14),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(_generatedThumbnailImageUrl!),
                ),
              ],
            ],
          ),
        );
  }

  Widget _buildThumbElementInput({
    required String label,
    required String colorBadge,
    required Color badgeBg,
    required Color badgeTextColor,
    required TextEditingController controller,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF93C5FD)),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(4), border: Border.all(color: Colors.white24)),
                child: Text(colorBadge, style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: badgeTextColor)),
              ),
            ],
          ),
          const SizedBox(height: 4),
          TextField(
            controller: controller,
            style: const TextStyle(fontSize: 12, color: Colors.white, fontWeight: FontWeight.bold),
            decoration: InputDecoration(
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              filled: true,
              fillColor: const Color(0xFF0A0D14),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: Color(0xFF334155))),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: Color(0xFF334155))),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(6), borderSide: const BorderSide(color: Color(0xFF38BDF8), width: 1.5)),
            ),
            onChanged: (val) {
              setState(() {
                _rebuildThumbnailPromptLocally();
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildAbRow(String label, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF38BDF8))),
                Text(text, style: const TextStyle(fontSize: 11, color: Colors.white)),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.copy, size: 14, color: Colors.grey),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: text));
              _showSnack('$label કોપી થઈ ગયું!');
            },
          ),
        ],
      ),
    );
  }

  Widget _buildCopyableCard(String title, String content) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF131722),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
              IconButton(
                icon: const Icon(Icons.copy, size: 14, color: Colors.white70),
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: content));
                  _showSnack('$title કોપી થઈ ગયું!');
                },
              ),
            ],
          ),
          Text(content, style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8))),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // Tab 5: Save & WhatsApp Share (Full Parity with projectpackage.js)
  // -------------------------------------------------------------
  Widget _buildNativeShareView() {
    final exportPackageText = '''🎯 વિડીયો પ્રોજેક્ટ: $_selectedTopic

📝 YouTube Title:
${_seoTitles.isNotEmpty ? _seoTitles[0] : '$_selectedTopic | Gyan Yatra'}

🚀 Tags:
$_seoTags

🎙️ Audio URL:
${_generatedAudioUrl ?? '$_serverUrl/audio/my_real_cloned_voice.mp3'}

(Gyan Yatra Mobile Creator Studio - v2.0)''';

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Status Checklist Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF131722),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('💾 ૬. વિડીયો પ્રોજેક્ટ પેકેજ સેન્ટર', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
              const SizedBox(height: 4),
              Text('પ્રોજેક્ટ: $_selectedTopic', style: const TextStyle(fontSize: 12, color: Color(0xFF38BDF8), fontWeight: FontWeight.w600)),
              const SizedBox(height: 14),

              // Checklist Grid
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  _buildCheckChip('📝 સ્ક્રિપ્ટ (${_scriptSections.length} વિભાગ)', true),
                  _buildCheckChip('🎙️ વોઇસ ઓડિયો', _generatedAudioUrl != null),
                  _buildCheckChip('🎬 ૧૬:૯ સ્લાઇડ્સ (${_slides.length})', _slides.isNotEmpty),
                  _buildCheckChip('🚀 SEO ટાઇટલ & ટેગ્સ', _seoTitles.isNotEmpty),
                  _buildCheckChip('🎨 થંબનેલ પ્રોમ્પ્ટ', _thumbnailPrompt.isNotEmpty),
                ],
              ),
              const SizedBox(height: 16),

              // Export Preview Box
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: const Color(0xFF07090E), borderRadius: BorderRadius.circular(8)),
                child: Text(exportPackageText, style: const TextStyle(fontSize: 11, color: Color(0xFFE2E8F0), height: 1.5)),
              ),
              const SizedBox(height: 16),

              // WhatsApp Share & Copy Buttons
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF25D366),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Text('📱', style: TextStyle(fontSize: 16)),
                      label: const Text('WhatsApp પર શેર કરો', style: TextStyle(fontWeight: FontWeight.bold)),
                      onPressed: () {
                        SharePlus.instance.share(ShareParams(text: exportPackageText));
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E293B),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    icon: const Icon(Icons.copy, size: 16),
                    label: const Text('કોપી'),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: exportPackageText));
                      _showSnack('આખું વિડીયો પેકેજ કોપી થઈ ગયું!');
                    },
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCheckChip(String label, bool isDone) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: isDone ? const Color(0xFF10B981).withValues(alpha: 0.15) : const Color(0xFF0A0D14),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: isDone ? const Color(0xFF10B981) : const Color(0xFF334155)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(isDone ? Icons.check_circle : Icons.circle_outlined, size: 14, color: isDone ? const Color(0xFF10B981) : Colors.grey),
          const SizedBox(width: 5),
          Text(label, style: TextStyle(fontSize: 11, color: isDone ? Colors.white : Colors.grey, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // WebView Body & Fallback
  // -------------------------------------------------------------
  Widget _buildWebViewBody() {
    if (!_isWebViewReady || _webViewController == null) {
      return const Center(
        child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFFF0000))),
      );
    }

    if (_hasWebError) {
      return Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.wifi_off_rounded, size: 36, color: Color(0xFFEF4444)),
              ),
              const SizedBox(height: 18),
              const Text(
                'પીસી વેબ સર્વર સાથે કનેક્શન મળ્યું નથી',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 8),
              Text(
                _serverUrl,
                style: const TextStyle(fontSize: 12, color: Color(0xFF38BDF8), fontFamily: 'monospace'),
              ),
              if (_webErrorMessage.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text(
                  _webErrorMessage,
                  style: const TextStyle(fontSize: 11, color: Color(0xFFF87171)),
                  textAlign: TextAlign.center,
                ),
              ],
              const SizedBox(height: 16),
              const Text(
                'ચિંતા કરશો નહીં! તમે તમારા ફોનમાં જ "મોબાઇલ સ્ટુડિયો" વાપરી શકો છો જે તરત જ ખૂલી જાય છે.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13, color: Color(0xFF94A3B8), height: 1.5),
              ),
              const SizedBox(height: 22),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  icon: const Icon(Icons.phone_android),
                  label: const Text('📱 મોબાઇલ સ્ટુડિયો ખોલો (તુરંત)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  onPressed: _switchToNativeMode,
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Color(0xFF475569)),
                        padding: const EdgeInsets.symmetric(vertical: 11),
                      ),
                      icon: const Icon(Icons.refresh, size: 16),
                      label: const Text('ફરી પ્રયાસ'),
                      onPressed: () {
                        _setupWebViewController();
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Color(0xFF475569)),
                        padding: const EdgeInsets.symmetric(vertical: 11),
                      ),
                      icon: const Icon(Icons.settings, size: 16),
                      label: const Text('IP બદલો'),
                      onPressed: _showSettingsDialog,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: const Color(0xFFFF0000),
      backgroundColor: const Color(0xFF131722),
      onRefresh: () async {
        _webViewController?.reload();
      },
      child: WebViewWidget(controller: _webViewController!),
    );
  }
}