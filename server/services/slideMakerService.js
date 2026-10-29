/**
 * Slide Maker Service
 * Generates structured 16:9 educational presentation slides with:
 * 1. 100% Perfect White Background (#FFFFFF)
 * 2. Prominent Heading Box (Solid or Bordered Frame)
 * 3. Structured Bullet Points with factual Gujarati government/educational details
 * 4. Audio Timing intervals
 */

class SlideMakerService {
  constructor() {
    this.defaultHeadingBoxStyle = 'solid'; // 'solid' | 'outline' | 'banner'
    this.defaultBgColor = '#FFFFFF';
    this.defaultAccentColor = '#DC2626'; // High-contrast Red
    this.defaultTextColor = '#0F172A'; // Deep Navy Slate
  }

  /**
   * Detect topic domain to generate realistic, factual slide decks
   */
  detectDomain(topic = '') {
    const t = topic.toLowerCase();
    if (t.includes('આંગણવાડી') || t.includes('તેડાગર') || t.includes('કાર્યકર') || t.includes('anganwadi')) {
      return 'anganwadi';
    }
    if (t.includes('મોંઘવારી') || t.includes('da') || t.includes('કર્મચારી') || t.includes('પેન્શન') || t.includes('પગાર') || t.includes('સાતમું પગાર')) {
      return 'da_employee';
    }
    if (t.includes('કિસાન') || t.includes('ખેડૂત') || t.includes('સહાય') || t.includes('યોજના') || t.includes('સબસીડી') || t.includes('ikhedut')) {
      return 'scheme';
    }
    if (t.includes('ભરતી') || t.includes('પરીક્ષા') || t.includes('tet') || t.includes('tat') || t.includes('પોલીસ') || t.includes('gpsc') || t.includes('ojas')) {
      return 'bharti_exam';
    }
    return 'general';
  }

  /**
   * Generate a complete slide deck for any topic with white background, heading box, and bullet points
   */
  generateWhiteSlides({
    topic = 'ગુજરાત સરકાર સત્તાવાર પરિપત્ર ૨૦૨૬',
    domain = null,
    slideCount = 5,
    headingBoxStyle = 'solid',
    accentColor = '#DC2626'
  } = {}) {
    const cleanTopic = (topic || 'ગુજરાત સરકાર સત્તાવાર પરિપત્ર ૨૦૨૬').trim();
    const detectedDomain = domain || this.detectDomain(cleanTopic);
    const boxStyle = ['solid', 'outline', 'banner'].includes(headingBoxStyle) ? headingBoxStyle : 'solid';
    const accent = accentColor || (detectedDomain === 'da_employee' ? '#2563EB' : detectedDomain === 'scheme' ? '#10B981' : '#DC2626');

    let templateSlides = [];

    switch (detectedDomain) {
      case 'anganwadi':
        templateSlides = [
          {
            title: `${cleanTopic}: સત્તાવાર જાહેરાત`,
            subtitle: 'મહિલા અને બાળ વિકાસ વિભાગ • ગાંધીનગર પરિપત્ર',
            bulletPoints: [
              'ગાંધીનગર સચિવાલય દ્વારા આંગણવાડી કાર્યકર અને તેડાગર માટે નવો ઠરાવ જાહેર',
              'રાજ્યભરમાં ખાલી પડેલી કુલ જગ્યાઓ અને જીલ્લાવાર વિગતો પ્રસિદ્ધ',
              'નવા નિયમ મુજબ ઓનલાઇન e-HRMS / OJAS પોર્ટલ મારફતે જ અરજીઓ સ્વીકારાશે'
            ],
            audioTime: '0:00 - 0:45',
            slideType: 'announcement'
          },
          {
            title: 'પાત્રતા અને શૈક્ષણિક લાયકાત (નવા નિયમો)',
            subtitle: 'વયમર્યાદા & સ્થાનિક રહેવાસી હોવાના નિયમો',
            bulletPoints: [
              'કાર્યકર બહેનો માટે લઘુત્તમ શૈક્ષણિક લાયકાત: ધોરણ ૧૨ પાસ ફરજિયાત',
              'તેડાગર બહેનો માટે લઘુત્તમ શૈક્ષણિક લાયકાત: ધોરણ ૧૦ પાસ નક્કી કરાઈ',
              'વયમર્યાદા: ૧૮ થી ૩૩ વર્ષ (અનામત કેટેગરીને સરકારી નિયમ મુજબ છૂટછાટ)',
              'જે તે ગામ / વોર્ડના સ્થાનિક કાયમી રહેવાસી હોવું અનિવાર્ય છે'
            ],
            audioTime: '0:45 - 1:30',
            slideType: 'eligibility'
          },
          {
            title: 'માનદવેતન & પગાર વધારો વિગતો',
            subtitle: 'માસિક ભથ્થું & પ્રોત્સાહક રકમમાં સુધારો',
            bulletPoints: [
              'કાર્યકર બહેનોનું નવું માસિક માનદવેતન: ₹૧૦,૦૦૦+ પ્રતિ માસ સંભવિત',
              'તેડાગર બહેનોનું નવું માસિક માનદવેતન: ₹૫,૫૦૦+ નક્કી કરાયું',
              'મોબાઇલ ભથ્થું, ઇન્ટરનેટ ચાર્જ અને પોષણ ટ્રેકર પ્રોત્સાહન અલગથી જમા થશે',
              'બેંક ખાતામાં દર મહિને સીધા DBT દ્વારા ચૂકવણી કરવામાં આવશે'
            ],
            audioTime: '1:30 - 2:15',
            slideType: 'financial'
          },
          {
            title: 'ઓનલાઇન ફોર્મ ભરવાની પ્રક્રિયા & તારીખો',
            subtitle: 'સત્તાવાર પોર્ટલ & મહત્વપૂર્ણ સમયમર્યાદા',
            bulletPoints: [
              'સત્તાવાર ઓનલાઇન પોર્ટલ: e-hrms.gujarat.gov.in પર રજીસ્ટ્રેશન થશે',
              'અરજી શરૂ થવાની સંભવિત તારીખ: ચાલુ માસની ૧૫ તારીખથી શરુઆત',
              'અરજી કરવાની છેલ્લી તારીખ: પરિપત્ર પ્રસિદ્ધ થયાના ૨૧ દિવસ સુધી',
              'ફોર્મ ભરતી વખતે તમામ અસલી ડોક્યુમેન્ટ સ્કેન કરી અપલોડ કરવાના રહેશે'
            ],
            audioTime: '2:15 - 3:00',
            slideType: 'process'
          },
          {
            title: 'જરૂરી ડોક્યુમેન્ટ્સ ચેકલિસ્ટ & સાવચેતી',
            subtitle: 'ખોટી અફવાઓથી બચો • સત્તાવાર માહિતી જ માનો',
            bulletPoints: [
              'શાળા છોડ્યાનું પ્રમાણપત્ર (LC), માર્કશીટ અને સ્થાનિક રહેઠાણનો દાખલો',
              'આવકનો દાખલો, જાતિનો દાખલો અને આધાર કાર્ડ લિંક હોવું જરૂરી',
              'કોઈપણ વચેટીયા કે એજન્ટને નાણાં આપવા નહિ, ભરતી ૧૦૦% મેરિટ આધારિત છે',
              'સહાયક હેલ્પલાઇન અને જિલ્લા પંચાયત કચેરીનો સંપર્ક સાધવો'
            ],
            audioTime: '3:00 - 3:45',
            slideType: 'warning'
          }
        ];
        break;

      case 'da_employee':
        templateSlides = [
          {
            title: `${cleanTopic}: કેબિનેટ નિર્ણય`,
            subtitle: 'નાણાં વિભાગ • ગાંધીનગર સત્તાવાર ઠરાવ ૨૦૨૬',
            bulletPoints: [
              'ગુજરાત સરકાર દ્વારા રાજ્યના કર્મચારીઓ અને પેન્શનર્સ માટે મોટો નિર્ણય',
              'કેન્દ્ર સરકારના ધોરણે મોંઘવારી ભથ્થામાં ૪% થી ૫% સુધીનો વધારો મંજૂર',
              'રાજ્યના ૫ લાખથી વધુ કર્મચારીઓ અને ૪.૫ લાખ પેન્શનર્સને સીધો ફાયદો થશે'
            ],
            audioTime: '0:00 - 0:45',
            slideType: 'announcement'
          },
          {
            title: 'DA વધારાની ટકાવારી અને નવો દર',
            subtitle: '૫૦% થી વધીને હવે ૫૩% કે ૫૪% સુધી પહોંચ્યો',
            bulletPoints: [
              'અત્યાર સુધી મળવાપાત્ર મોંઘવારી ભથ્થું: ૫૦% લેખે ચૂકવાતું હતું',
              'નવો સુધારેલો DA દર: ૫૩% થી ૫૪% અમલી બનાવવાની જાહેરાત',
              'સાતમા પગાર પંચ મુજબ બેઝિક પગાર પર સીધી નવી ટકાવારી લાગુ થશે',
              'પંચાયત, નગરપાલિકા અને ગ્રાન્ટ-ઇન-એઇડ કર્મચારીઓને પણ સમાન લાભ'
            ],
            audioTime: '0:45 - 1:30',
            slideType: 'calculation'
          },
          {
            title: 'એરિયર્સ ચૂકવણી & રોકડ જમા વિગત',
            subtitle: 'કેટલા મહિનાનું એરિયર્સ રોકડમાં મળશે?',
            bulletPoints: [
              'ગત મહિનાઓથી પાછલી અસરથી મોંઘવારી ભથ્થું લાગુ કરવામાં આવશે',
              'બાકી નીકળતા એરિયર્સની રકમ ૩ થી ૪ સમાન હપ્તામાં ચૂકવાશે',
              'આગામી માસના નિયમિત પગાર સાથે પ્રથમ હપ્તો રોકડમાં જમા થશે',
              'પેન્શનર્સને પેન્શન વિતરણ કરતી બેંક શાખા દ્વારા સીધું જમા કરાશે'
            ],
            audioTime: '1:30 - 2:15',
            slideType: 'financial'
          },
          {
            title: 'પગારમાં માસિક કેટલો ચોખ્ખો વધારો થશે?',
            subtitle: 'વર્ગ-૧ થી વર્ગ-૪ સુધીના કર્મચારીઓનો અંદાજિત ફાયદો',
            bulletPoints: [
              'વર્ગ-૪ કર્મચારીઓ: માસિક ₹૮૫૦ થી ₹૧,૪૦૦ સુધીનો ચોખ્ખો વધારો',
              'વર્ગ-૩ કર્મચારીઓ: માસિક ₹૧,૫૦૦ થી ₹૩,૨૦૦ સુધીનો માસિક ફાયદો',
              'વર્ગ-૨ અને વર્ગ-૧ અધિકારીઓ: માસિક ₹૪,૦૦૦ થી ₹૮,૫૦૦ સુધીનો વધારો',
              'HRA અને અન્ય આનુષંગિક ભથ્થાઓમાં પણ આપોઆપ વધારો લાગુ પડશે'
            ],
            audioTime: '2:15 - 3:00',
            slideType: 'comparison'
          },
          {
            title: 'સત્તાવાર પરિપત્ર ક્યાંથી ડાઉનલોડ કરવો?',
            subtitle: 'નાણાં વિભાગની સત્તાવાર વેબસાઇટ પર ઉપલબ્ધ',
            bulletPoints: [
              'નાણાં વિભાગનો સત્તાવાર GR finance.gujarat.gov.in પોર્ટલ પર મુકાયો',
              'પરિપત્ર ક્રમાંક અને નાણાકીય વર્ષ ૨૦૨૬-૨૭ ની જોગવાઈ ચકાસી લેવી',
              'કોઈપણ બિનસત્તાવાર અફવા કે ખોટા મેસેજ પર વિશ્વાસ ન કરવો',
              'સંપૂર્ણ માહિતી માટે જ્ઞાન યાત્રા ચેનલ સાથે જોડાયેલા રહો'
            ],
            audioTime: '3:00 - 3:45',
            slideType: 'conclusion'
          }
        ];
        break;

      case 'scheme':
        templateSlides = [
          {
            title: `${cleanTopic}: યોજના માર્ગદર્શિકા`,
            subtitle: 'કૃષિ અને ખેડૂત કલ્યાણ વિભાગ • સત્તાવાર યોજના',
            bulletPoints: [
              'ગુજરાતના ધરતીપુત્રો અને નાગરિકો માટે મહત્વપૂર્ણ સરકારી સહાય યોજના',
              'આર્થિક સુરક્ષા અને સબસિડી સહાય સીધી ખેડૂતોના બેંક ખાતામાં જમા',
              'i-Khedut અથવા ડીજીટલ ગુજરાત પોર્ટલ મારફતે પારદર્શક અરજી પ્રક્રિયા'
            ],
            audioTime: '0:00 - 0:45',
            slideType: 'announcement'
          },
          {
            title: 'સહાય રકમ & મળવાપાત્ર નાણાકીય લાભ',
            subtitle: 'હેક્ટર દીઠ સહાય & મહત્તમ મર્યાદાના નિયમો',
            bulletPoints: [
              'હેક્ટર દીઠ મળવાપાત્ર સહાય રકમ: ₹૬,૮૦૦ થી ₹૨૦,૦૦૦ સુધીની જોગવાઈ',
              'મહત્તમ ૨ હેક્ટર સુધીના ખાતેદાર ખેડૂત પરિવારને સહાયનો લાભ',
              'સહાયની રકમ ડાયરેક્ટ બેનિફિટ ટ્રાન્સફર (DBT) મારફતે સીધી ખાતામાં જમા',
              'રાજ્ય સરકાર અને એસડીઆરએફ (SDRF) બજેટમાંથી સહાય ચૂકવાશે'
            ],
            audioTime: '0:45 - 1:30',
            slideType: 'financial'
          },
          {
            title: 'કોને મળશે લાભ? (પાત્રતા અને શરતો)',
            subtitle: '૭/૧૨, ૮-અ જમીન ધારકો માટેના સત્તાવાર નિયમો',
            bulletPoints: [
              'ગુજરાત રાજ્યમાં પોતાની ખેતીની જમીન ધરાવતા તમામ ખાતેદાર ખેડૂતો',
              'જમીનના ૭/૧૨ અને ૮-અ માં નામ હોવું ફરજિયાત છે',
              'સંયુક્ત ખાતેદારના કિસ્સામાં અન્ય ખાતેદારોનું સંમતિપત્રક જરૂરી રહેશે',
              'નાના અને સીમાંત ખેડૂતોને પ્રથમ અગ્રતા આપવામાં આવશે'
            ],
            audioTime: '1:30 - 2:15',
            slideType: 'eligibility'
          },
          {
            title: 'ઓનલાઇન અરજી કરવાની સ્ટેપ-બાય-સ્ટેપ રીત',
            subtitle: 'ikhedut.gujarat.gov.in પોર્ટલ પરથી સરળ અરજી',
            bulletPoints: [
              'ગ્રામ પંચાયતના વીસીઇ (VCE) મારફતે અથવા જાતે પોર્ટલ પર અરજી કરી શકાશે',
              'આધાર કાર્ડ નંબર, બેંક પાસબુક અને જમીનની નકલ સાથે રાખવી',
              'અરજી સબમિટ કર્યા બાદ અરજી નંબરવાળી પ્રિન્ટ સાચવી રાખવી અનિવાર્ય',
              'અરજી મંજૂર થયાની સ્થિતિ (Status) ઓનલાઇન ટ્રેક કરી શકાશે'
            ],
            audioTime: '2:15 - 3:00',
            slideType: 'process'
          },
          {
            title: 'છેલ્લી તારીખ & ખેડૂત હેલ્પલાઇન નંબર',
            subtitle: 'સમયસર અરજી કરવી • સહાયથી વંચિત ન રહો',
            bulletPoints: [
              'ઓનલાઇન પોર્ટલ પર અરજી કરવાની છેલ્લી તારીખ ચાલુ માસની આખરી તારીખ',
              'કોઈપણ ટેકનિકલ પ્રશ્ન માટે કિસાન કૉલ સેન્ટર: ૧૮૦૦-૧૮૦-૧૫૫૧',
              'જિલ્લા ખેતીવાડી અધિકારીની કચેરી અથવા તાલુકા પંચાયતનો સંપર્ક કરો',
              'સરકારી યોજનાઓની અસલી માહિતી માટે જ્ઞાન યાત્રાને સબ્સ્ક્રાઇબ કરો'
            ],
            audioTime: '3:00 - 3:45',
            slideType: 'warning'
          }
        ];
        break;

      case 'bharti_exam':
        templateSlides = [
          {
            title: `${cleanTopic}: ભરતી સત્તાવાર નોટિફિકેશન`,
            subtitle: 'OJAS ગુજરાત • સત્તાવાર ભરતી બોર્ડ પરિપત્ર',
            bulletPoints: [
              'ગુજરાતના લાખો યુવાનો માટે સરકારી નોકરીની સુવર્ણ તક જાહેર',
              'વર્ગ-૩ ની મોટી સંખ્યામાં ખાલી જગ્યાઓ માટે સત્તાવાર વિગતવાર જાહેરાત',
              'ઓજસ પોર્ટલ (ojas.gujarat.gov.in) પર ઓનલાઇન અરજી પ્રક્રિયા શરૂ'
            ],
            audioTime: '0:00 - 0:45',
            slideType: 'announcement'
          },
          {
            title: 'કુલ ખાલી જગ્યાઓ અને કેટેગરીવાર બેઠકો',
            subtitle: 'બિનઅનામત, SEBC, EWS, SC, ST અને મહિલા અનામત',
            bulletPoints: [
              'કુલ ભરવાપાત્ર જગ્યાઓનું વર્ગીકરણ સત્તાવાર નોટિફિકેશનમાં પ્રસિદ્ધ',
              'મહિલા ઉમેદવારો માટે નિયમાનુસાર ૩૩% અનામત બેઠકો અનામત રખાઈ',
              'માજી સૈનિક અને દિવ્યાંગ ઉમેદવારો માટે નિયત ટકાવારી મુજબ અનામત',
              'દરેક કેટેગરીનું કટ-ઓફ અને બેઠકોની યાદી ચકાસીને જ અરજી કરવી'
            ],
            audioTime: '0:45 - 1:30',
            slideType: 'vacancy'
          },
          {
            title: 'શૈક્ષણિક લાયકાત અને વયમર્યાદા (Age Limit)',
            subtitle: 'લઘુત્તમ ધોરણ ૧૨ પાસ અથવા સ્નાતક (Graduation)',
            bulletPoints: [
              'શૈક્ષણિક લાયકાત: માન્ય યુનિવર્સિટીમાંથી ગ્રેજ્યુએટ અથવા ધોરણ ૧૨ પાસ',
              'લઘુત્તમ વયમર્યાદા: ૧૮ વર્ષ પૂર્ણ થયેલા હોવા જરૂરી',
              'મહત્તમ વયમર્યાદા: ૩૩ વર્ષ (અનામત કેટેગરીને ૫ વર્ષ સુધીની સરકારી છૂટછાટ)',
              'કોમ્પ્યુટર જ્ઞાન અંગેનું CCC પ્રમાણપત્ર અથવા ધોરણ ૧૦/૧૨ માં વિષય જરૂરી'
            ],
            audioTime: '1:30 - 2:15',
            slideType: 'eligibility'
          },
          {
            title: 'નવી પરીક્ષા પદ્ધતિ & સિલેબસ ગુણભાર',
            subtitle: 'CBRT / OMR પદ્ધતિ & પ્રિલિમ-મેઇન્સ પરીક્ષા માળખું',
            bulletPoints: [
              'પ્રિલિમિનરી પરીક્ષા: હેતુલક્ષી (MCQ) આધારિત ૧૦૦ ગુણનું પેપર',
              'ગુજરાતી વ્યાકરણ, સામાન્ય જ્ઞાન (GK), ગણિત-રીઝનિંગ અને કરંટ અફેર્સ',
              'ખોટા જવાબ માટે ૦.૨૫ નેગેટિવ માર્કિંગ પદ્ધતિ લાગુ રહેશે',
              'મુખ્ય પરીક્ષા (Mains) અથવા શારીરિક કસોટીના નિયમો ધ્યાને લેવા'
            ],
            audioTime: '2:15 - 3:00',
            slideType: 'exam_pattern'
          },
          {
            title: 'અરજી ફી, છેલ્લી તારીખ & તૈયારી ટીપ્સ',
            subtitle: 'સમયસર કન્ફર્મેશન મેળવી લેવું અનિવાર્ય',
            bulletPoints: [
              'જનરલ કેટેગરી માટે પરીક્ષા ફી: ₹૧૦૦ + પોસ્ટલ/ઓનલાઇન ચાર્જ',
              'અનામત વર્ગના તમામ ઉમેદવારો માટે ફીમાંથી સંપૂર્ણ મુક્તિ',
              'ઓનલાઇન અરજી કન્ફર્મ કર્યા બાદ કન્ફર્મેશન નંબર કાળજીપૂર્વક સાચવવો',
              'સચોટ અભ્યાસ સામગ્રી અને મોક ટેસ્ટ માટે જ્ઞાન યાત્રાને ફોલો કરો'
            ],
            audioTime: '3:00 - 3:45',
            slideType: 'warning'
          }
        ];
        break;

      default:
        templateSlides = [
          {
            title: `${cleanTopic}: સત્તાવાર અહેવાલ`,
            subtitle: 'જ્ઞાન યાત્રા સ્પેશિયલ એનાલિસિસ • ગુજરાત સમાચાર',
            bulletPoints: [
              `ગુજરાતના નાગરિકો અને દર્શકો માટે અતિ મહત્વપૂર્ણ અપડેટ`,
              `સરકારી પરિપત્ર અને સત્તાવાર સ્ત્રોતો આધારિત સંપૂર્ણ વિગતવાર માહિતી`,
              `આ વિડીયોમાં આપણે દરેક નિયમો અને વાસ્તવિકતા સરળ ભાષામાં સમજીશું`
            ],
            audioTime: '0:00 - 0:45',
            slideType: 'announcement'
          },
          {
            title: 'મુખ્ય નિયમો અને પાત્રતાના માપદંડો',
            subtitle: 'કોને લાગુ પડશે અને કયા ફેરફારો થયા છે?',
            bulletPoints: [
              'સરકાર દ્વારા નક્કી કરાયેલ તાજા નિયમો અને જોગવાઈઓ',
              'લાભાર્થીઓ અને અસરગ્રસ્ત વર્ગો માટે મહત્વના માપદંડો',
              'અગાઉના નિયમો સામે નવા સુધારાની તુલનાત્મક વિગત'
            ],
            audioTime: '0:45 - 1:30',
            slideType: 'rules'
          },
          {
            title: 'મળવાપાત્ર લાભો & નાણાકીય પાસું',
            subtitle: 'વાસ્તવિક આંકડા અને સરકારી બજેટ ફાળવણી',
            bulletPoints: [
              'નાગરિકોને મળવાપાત્ર સીધા અને આડકતરા ફાયદાઓનું વિશ્લેષણ',
              'બજેટ અને ભંડોળમાંથી કરવામાં આવેલ સત્તાવાર ફાળવણી',
              'ખાતામાં રકમ જમા થવા અંગેની સમયમર્યાદા અને પદ્ધતિ'
            ],
            audioTime: '1:30 - 2:15',
            slideType: 'benefits'
          },
          {
            title: 'ઓનલાઇન પ્રક્રિયા અને જરૂરી પગલાં',
            subtitle: 'સત્તાવાર પોર્ટલ પરથી માહિતી મેળવવાની પદ્ધતિ',
            bulletPoints: [
              'સત્તાવાર સરકારી પોર્ટલ પરથી ઓનલાઇન વેરિફિકેશન કરવાની રીત',
              'જરૂરી કાગળો અને પ્રમાણપત્રોની પ્રાથમિક ચકાસણી',
              'સમયમર્યાદામાં જરૂરી અરજી કે નોંધણી પૂર્ણ કરવાની સલાહ'
            ],
            audioTime: '2:15 - 3:00',
            slideType: 'process'
          },
          {
            title: 'મહત્વપૂર્ણ સાવચેતી અને સત્તાવાર સમર્થન',
            subtitle: 'અફવાઓથી દૂર રહો • સાચી માહિતી જ શેર કરો',
            bulletPoints: [
              'સોશિયલ મીડિયા પર ફરતા ફેક મેસેજ અને અફવાઓથી સાવચેત રહેવું',
              'માત્ર અધિકૃત સરકારી વેબસાઇટ કે પરિપત્રને જ સાચો માનવો',
              'કોઈપણ પ્રશ્ન હોય તો નીચે કોમેન્ટ બોક્સમાં જરૂર જણાવો'
            ],
            audioTime: '3:00 - 3:45',
            slideType: 'warning'
          }
        ];
        break;
    }

    // Limit or expand according to slideCount requested
    let resultSlides = templateSlides;
    if (slideCount && Number(slideCount) > 0) {
      const count = Math.min(Math.max(Number(slideCount), 3), 8);
      if (count < templateSlides.length) {
        // Pick first, middle and last
        resultSlides = templateSlides.slice(0, count);
        // Ensure last is concluding/warning
        if (count >= 3) {
          resultSlides[count - 1] = templateSlides[templateSlides.length - 1];
        }
      } else if (count > templateSlides.length) {
        // Expand with extra detail slides
        resultSlides = [...templateSlides];
        let extraIdx = 1;
        while (resultSlides.length < count) {
          resultSlides.splice(resultSlides.length - 1, 0, {
            title: `વિશેષ જોગવાઈ & સ્પષ્ટતા ભાગ #${extraIdx}`,
            subtitle: 'અગત્યના પરિપત્ર નિયમો & માર્ગદર્શિકા',
            bulletPoints: [
              'વિભાગીય વડા અને સચિવાલય દ્વારા જારી કરાયેલ વિશેષ સ્પષ્ટતા',
              'તમામ અરજદારો અને લાભાર્થીઓ માટે અગત્યની નોંધ',
              'આગામી દિવસોમાં જાહેર થનાર વધારાની વિગતો'
            ],
            audioTime: `${resultSlides.length * 45}s - ${(resultSlides.length + 1) * 45}s`,
            slideType: 'detail'
          });
          extraIdx++;
        }
      }
    }

    // Format all slides with explicit Pure White Background, Heading Box specs, and structured Bullets
    return resultSlides.map((slide, idx) => ({
      id: Date.now() + idx,
      slideNumber: idx + 1,
      title: slide.title,
      subtitle: slide.subtitle || '',
      bulletPoints: slide.bulletPoints || [],
      bgColor: '#FFFFFF', // 100% Pure White Background
      headingBoxStyle: boxStyle, // 'solid' | 'outline' | 'banner'
      accentColor: accent,
      textColor: this.defaultTextColor,
      audioTime: slide.audioTime || `${idx * 45}s - ${(idx + 1) * 45}s`,
      slideType: slide.slideType || 'general',
      visualNote: '૧૦૦% શુદ્ધ સફેદ બેકગ્રાઉન્ડ, સ્પષ્ટ હેડિંગ બોક્સ અને બોલ્ડ બુલેટ પોઇન્ટ્સ'
    }));
  }
}

module.exports = new SlideMakerService();
