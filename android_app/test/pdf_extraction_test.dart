import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:syncfusion_flutter_pdf/pdf.dart';
import 'package:myvoice_ai/services/slide_voiceover_service.dart';

void main() {
  test('10. PDF on-device text extraction and customized prompt generation test', () {
    // 1. Create a sample PDF document in memory with standard text
    final document = PdfDocument();
    final page = document.pages.add();
    page.graphics.drawString(
      'Gujarat Government Finance Department Gandhinagar. GR No: PGR-102026. Subject: 4 percent DA hike for government employees. Date: 18/10/2026.',
      PdfStandardFont(PdfFontFamily.helvetica, 12),
    );
    final List<int> bytesList = document.saveSync();
    document.dispose();
    final bytes = Uint8List.fromList(bytesList);

    // 2. Extract text on device using extractTextFromPdfBytes
    final extracted = SlideVoiceoverService.extractTextFromPdfBytes(bytes);
    expect(extracted.contains('PGR-102026'), true);
    expect(extracted.contains('Finance Department'), true);

    // 3. Test analysis with real Gujarati circular text
    final gujaratiText = '''ગુજરાત સરકાર નાણાં વિભાગ, ગાંધીનગર
ઠરાવ ક્રમાંક: પગર-૧૦૨૦૨૬-મ.ભ.-૧-ચ
તારીખ: ૧૮/૧૦/૨૦૨૬
વિષય: ૭મા પગારપંચ મુજબ મોંઘવારી ભથ્થામાં ૪% વધારો કરવા બાબત.
વાંચાણ: નાણાં વિભાગના અગાઉના ઠરાવો.

ઠરાવ:
રાજ્ય સરકારના કર્મચારીઓ અને પેન્શનર્સને મોંઘવારી ભથ્થામાં ૪% નો વધારો મંજૂર કરવામાં આવે છે.
આ વધારો ૧લી જુલાઈ ૨૦૨૬ થી પાછલી અસરથી અમલમાં આવશે.
બાકી રહેલ એરિયર્સ ત્રણ હપ્તામાં ચૂકવવામાં આવશે.''';

    final analysis = SlideVoiceoverService.analyzePdfSubjectAndDetails(
      fullPdfText: gujaratiText,
      filename: 'da_hike_circular.pdf',
    );
    expect(analysis['subject'].contains('૭મા પગારપંચ મુજબ મોંઘવારી ભથ્થામાં ૪% વધારો'), true);
    expect(analysis['department'].contains('નાણાં વિભાગ'), true);
    expect(analysis['category'], 'salary_da');
    expect(analysis['grNumber'].contains('પગર-૧૦૨૦૨૬'), true);

    // 4. Generate master prompt with this extracted text
    final prompt = SlideVoiceoverService.generateFullPdfMasterPrompt(
      fullPdfText: gujaratiText,
      filename: 'da_hike_circular.pdf',
    );
    expect(prompt.contains('૭મા પગારપંચ મુજબ મોંઘવારી ભથ્થામાં ૪% વધારો'), true);
    expect(prompt.contains('નાણાં વિભાગ'), true);
    expect(prompt.contains('પગર-૧૦૨૦૨૬'), true);
    expect(prompt.contains('EXTRACTED PDF TEXT'), true);
    expect(prompt.contains('CONFIRMED PDF DETAILS'), true);

    // 5. Test another domain: Police recruitment
    final policeText = '''ગુજરાત પોલીસ ભરતી બોર્ડ, ગૃહ વિભાગ, ગાંધીનગર
જાહેરાત ક્રમાંક: LRD/2026/01
તારીખ: ૧૫/૦૩/૨૦૨૬
વિષય: લોકરક્ષક અને પોલીસ કોન્સ્ટેબલ સંવર્ગની ૧૨,૪૭૨ જગ્યાઓ માટે સીધી ભરતી ૨૦૨૬.
ઓજસ પોર્ટલ: ojas.gujarat.gov.in પર ઓનલાઇન અરજી કરવાની રહેશે.
દોડ: પુરુષ ઉમેદવારો માટે ૫૦૦૦ મીટર ૨૫ મિનિટમાં.
છેલ્લી તારીખ: ૦૫/૦૪/૨૦૨૬.''';

    final policeAnalysis = SlideVoiceoverService.analyzePdfSubjectAndDetails(
      fullPdfText: policeText,
      filename: 'police_recruitment.pdf',
    );
    expect(policeAnalysis['subject'].contains('પોલીસ કોન્સ્ટેબલ સંવર્ગની ૧૨,૪૭૨ જગ્યાઓ'), true);
    expect(policeAnalysis['department'].contains('ગૃહ વિભાગ') || policeAnalysis['department'].contains('પોલીસ ભરતી બોર્ડ'), true);
    expect(policeAnalysis['category'], 'recruitment');
    expect(policeAnalysis['grNumber'].contains('LRD/2026/01'), true);

    final policePrompt = SlideVoiceoverService.generateFullPdfMasterPrompt(
      fullPdfText: policeText,
      filename: 'police_recruitment.pdf',
    );
    expect(policePrompt.contains('પોલીસ કોન્સ્ટેબલ'), true);
    expect(policePrompt.contains('LRD/2026/01'), true);
    expect(policePrompt.contains('EXTRACTED PDF TEXT'), true);
    expect(policePrompt.contains('શારીરિક કસોટી'), true);
  });
}
