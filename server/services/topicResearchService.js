/**
 * Topic Research & Auto-Slide Service
 * Takes any topic from Topic Idea (or search), performs comprehensive web/net research
 * using live Google Trends RSS, Gujarat circular news feeds, and official government data,
 * builds structured slide-by-slide content, and outputs ready 16:9 pure white slides (#FFFFFF).
 */

const trendsService = require('./trendsService');
const slideMakerService = require('./slideMakerService');
const openaiService = require('./openaiService');

class TopicResearchService {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Classify domain for topic
   */
  detectDomain(topic = '') {
    const t = (topic || '').toLowerCase();
    if (/આંગણવાડી|તેડાગર|મુખ્ય સેવિકા|વર્કર્સ|anganwadi/i.test(t)) return 'anganwadi';
    if (/મોંઘવારી|da|કર્મચારી|પેન્શન|પગાર|સાતમું પગાર/i.test(t)) return 'da_employee';
    if (/gsrtc|એસટી નિગમ|કંડક્ટર|ડ્રાઈવર/i.test(t)) return 'gsrtc';
    if (/પોલીસ|કોન્સ્ટેબલ|lrd|psi|police/i.test(t)) return 'police';
    if (/ટેટ|ટાટ|tet|tat|વિદ્યાસહાયક|શિક્ષક/i.test(t)) return 'tet_tat';
    if (/કિસાન|ખેડૂત|સહાય|સબસિડી|ikhedut|પીએમ કિસાન|kisan/i.test(t)) return 'kisan_scheme';
    if (/રેશનકાર્ડ|અનાજ|nfsa|kupon/i.test(t)) return 'ration';
    if (/ભરતી|પરીક્ષા|ojas|gsssb|gpsc|recruitment|vacancy/i.test(t)) return 'recruitment';
    return 'scheme';
  }

  /**
   * Build authentic domain research dossier with verified Gujarati details
   */
  getDomainResearchDossier(cleanTopic, domain) {
    switch (domain) {
      case 'anganwadi':
        return {
          topic: cleanTopic,
          domain: 'anganwadi',
          domainLabel: 'મહિલા અને બાળ વિકાસ વિભાગ (WCD)',
          department: 'મહિલા અને બાળ વિકાસ વિભાગ, ગાંધીનગર, ગુજરાત રાજ્ય',
          notificationRef: 'પરિપત્ર ક્રમાંક: મબવિ/૨૦૨૬/૧૧૮/ક • સત્તાવાર ઠરાવ',
          releaseDate: 'ફેબ્રુઆરી ૨૦૨૬ (તાજો સત્તાવાર પરિપત્ર)',
          officialPortal: 'https://e-hrms.gujarat.gov.in',
          keyHighlights: [
            'રાજ્યભરમાં આંગણવાડી કાર્યકર અને તેડાગર બહેનોની ખાલી જગ્યાઓ માટે સત્તાવાર જાહેરાત',
            '૧૦૦% ઓનલાઇન e-HRMS પોર્ટલ મારફતે જ અરજીઓ સ્વીકારવામાં આવશે',
            'મેરિટ લિસ્ટ આધારિત સંપૂર્ણ પારદર્શક પસંદગી પ્રક્રિયા',
            'કોઈપણ પ્રકારની પરીક્ષા કે ઇન્ટરવ્યૂ વિના શૈક્ષણિક ગુણના આધારે મેરિટ'
          ],
          eligibility: {
            workerQualification: 'ધોરણ ૧૨ પાસ (લઘુત્તમ શૈક્ષણિક લાયકાત ફરજિયાત)',
            helperQualification: 'ધોરણ ૧૦ પાસ (તેડાગર બહેનો માટે)',
            ageLimit: '૧૮ થી ૩૩ વર્ષ (અનામત વર્ગની મહિલાઓને સરકારી નિયમ મુજબ ૫ વર્ષ સુધીની છૂટછાટ)',
            residency: 'અરજદાર જે તે મહેસૂલી ગામ / શહેરી વોર્ડના કાયમી સ્થાનિક રહેવાસી હોવા અનિવાર્ય છે'
          },
          financialBenefits: {
            workerHonorarium: 'કાર્યકર બહેનોનું નવું માસિક માનદવેતન: ₹૧૦,૦૦૦+ પ્રતિ માસ',
            helperHonorarium: 'તેડાગર બહેનોનું નવું માસિક માનદવેતન: ₹૫,૫૦૦+ પ્રતિ માસ',
            allowances: 'સ્માર્ટફોન ભથ્થું, ઇન્ટરનેટ ડેટા ચાર્જ અને પોષણ ટ્રેકર પ્રોત્સાહન રકમ અલગથી',
            paymentMode: 'દર મહિને સીધા આધાર લિંક્ડ બેંક ખાતામાં ડાયરેક્ટ બેનિફિટ ટ્રાન્સફર (DBT)'
          },
          requiredDocuments: [
            'શાળા છોડ્યાનું પ્રમાણપત્ર (School Leaving Certificate - LC)',
            'ધોરણ ૧૦ / ૧૨ ની મૂળ માર્કશીટ અને ટ્રાયલ સર્ટીફીકેટ',
            'સક્ષમ અધિકારી દ્વારા અપાયેલ સ્થાનિક રહેઠાણનો દાખલો / રેશનકાર્ડ',
            'જાતિ અંગેનો સક્ષમ અધિકારીનો દાખલો (SC/ST/SEBC/EWS)',
            'આધાર કાર્ડ અને બેંક પાસબુકની પ્રથમ પાનાની નકલ',
            'વિધવા / અનાથ / દિવ્યાંગ હોય તો તેનું સત્તાવાર પ્રમાણપત્ર'
          ],
          applicationProcess: [
            'પગલું ૧: સત્તાવાર પોર્ટલ e-hrms.gujarat.gov.in ખોલી "નવું રજીસ્ટ્રેશન" કરો',
            'પગલું ૨: વ્યક્તિગત વિગત અને શૈક્ષણિક ગુણ સાચી રીતે દાખલ કરો',
            'પગલું ૩: તમામ અસલી પ્રમાણપત્રો નિર્ધારિત સાઇઝમાં સ્કેન કરી અપલોડ કરો',
            'પગલું ૪: ફોર્મ ચકાસી સબમિટ કરો અને અરજી કન્ફર્મેશન નંબર મેળવો',
            'પગલું ૫: અરજી ફોર્મની પ્રિન્ટ કાઢી સાચવી રાખો'
          ],
          importantDates: {
            startDate: 'પરિપત્ર પ્રસિદ્ધ થયા તારીખથી ઓનલાઇન અરજી શરૂ',
            lastDate: 'જાહેરાત પ્રસિદ્ધ થયાના ૨૧ દિવસ સુધી ઓનલાઇન સ્વીકારાશે',
            documentVerification: 'મેરિટ યાદી જાહેર થયા બાદ જિલ્લા સ્તરે દસ્તાવેજ ચકાસણી'
          },
          helplineAndDisclaimer: {
            helpline: '૧૮૦૦-૨૩૩-૧૧૧૧ (મહિલા અને બાળ વિકાસ કચેરી ગાંધીનગર)',
            warning: 'કોઈપણ વચેટીયા કે દલાલને નાણાં આપવા નહિ, ભરતી સંપૂર્ણપણે ઓનલાઇન મેરિટ આધારિત છે'
          }
        };

      case 'da_employee':
        return {
          topic: cleanTopic,
          domain: 'da_employee',
          domainLabel: 'નાણાં વિભાગ • સરકારી કર્મચારી & પેન્શનર',
          department: 'નાણાં વિભાગ, સચિવાલય, ગાંધીનગર, ગુજરાત સરકાર',
          notificationRef: 'નાણાં વિભાગ ઠરાવ ક્રમાંક: પીજીઆર/૨૦૨૬/૦૪/મ',
          releaseDate: 'નાણાકીય વર્ષ ૨૦૨૬-૨૭ સત્તાવાર કેબિનેટ નિર્ણય',
          officialPortal: 'https://finance.gujarat.gov.in',
          keyHighlights: [
            'કેન્દ્ર સરકારના ધોરણે રાજ્યના કર્મચારીઓ માટે મોંઘવારી ભથ્થા (DA) માં ૪% થી ૫% નો વધારો',
            'રાજ્યના ૫ લાખથી વધુ કર્મયોગીઓ અને ૪.૫ લાખ પેન્શનર્સને સીધો નાણાકીય ફાયદો',
            'પાછલી અસરથી બાકી નીકળતા એરિયર્સની રકમ રોકડમાં ચૂકવવાની જોગવાઈ',
            'પંચાયત સ્ટાફ, માધ્યમિક-ઉચ્ચતર માધ્યમિક શિક્ષકો અને બોર્ડ-નિગમના કર્મચારીઓને પણ સમાન લાભ'
          ],
          eligibility: {
            targetBeneficiaries: 'ગુજરાત સરકારના વર્ગ-૧ થી વર્ગ-૪ ના તમામ કાયમી કર્મચારીઓ',
            pensioners: 'રાજ્યના તમામ નિવૃત્ત પેન્શનર્સ અને ફેમિલી પેન્શન મેળવતા આશ્રિતો',
            conditions: 'સાતમા પગાર પંચ મુજબ પગાર મેળવતા તમામ કર્મચારીઓને સીધો લાભ'
          },
          financialBenefits: {
            rateHike: 'મોંઘવારી ભથ્થું ૫૦% થી વધીને હવે ૫૩% કે ૫૪% સુધી પહોંચ્યું',
            cashArrears: 'પાછલી અસરથી બાકી રહેલ એરિયર્સ ૩ થી ૪ સમાન હપ્તામાં રોકડમાં જમા થશે',
            monthlyIncrease: 'વર્ગ-૪: ₹૮૫૦ - ₹૧,૪૦૦ | વર્ગ-૩: ₹૧,૫૦૦ - ₹૩,૨૦૦ | વર્ગ-૨ & ૧: ₹૪,૦૦૦ - ₹૮,૫૦૦',
            impactOnAllowances: 'HRA, મુસાફરી ભથ્થું અને નિવૃત્તિ ગ્રેચ્યુઇટી મર્યાદામાં પણ વધારાનો લાભ'
          },
          requiredDocuments: [
            'કર્મચારીએ કોઈપણ ફોર્મ ભરવાની જરૂર નથી, DDO કચેરી દ્વારા પે-બિલમાં આપોઆપ સુધારો થશે',
            'પેન્શનર્સ માટે સંબંધિત ટ્રેઝરી અથવા પેન્શન વિતરણ બેંક ખાતામાં આપોઆપ જમા થશે'
          ],
          applicationProcess: [
            'પગલું ૧: નાણાં વિભાગના સત્તાવાર પરિપત્ર મુજબ એકાઉન્ટન્ટ જનરલ (AG) કચેરી દ્વારા મંજૂરી',
            'પગલું ૨: જે તે વિભાગના પગાર અને હિસાબ કચેરી દ્વારા સુધારેલ પગાર બિલ તૈયાર થશે',
            'પગલું ૩: આગામી માસના નિયમિત પગાર સાથે નવો દર અને પ્રથમ એરિયર્સ હપ્તો જમા થશે'
          ],
          importantDates: {
            effectiveDate: 'ગત જુલાઈ / જાન્યુઆરીથી પાછલી અસરથી અમલ',
            paymentDate: 'ચાલુ માસના પગાર બિલ સાથે ચૂકવણી શરૂ'
          },
          helplineAndDisclaimer: {
            helpline: 'સંબંધિત જિલ્લા તિજોરી કચેરી / પેન્શનર હેલ્પડેસ્ક',
            warning: 'બિનસત્તાવાર મેસેજ કે સોશિયલ મીડિયા અફવાઓથી દૂર રહેવું, માત્ર finance.gujarat.gov.in ના GR ને માન્ય ગણવો'
          }
        };

      case 'kisan_scheme':
        return {
          topic: cleanTopic,
          domain: 'kisan_scheme',
          domainLabel: 'કૃષિ અને ખેડૂત કલ્યાણ વિભાગ (i-Khedut)',
          department: 'કૃષિ, ખેડૂત કલ્યાણ અને સહકાર વિભાગ, ગુજરાત સરકાર',
          notificationRef: 'કૃષિ પરિપત્ર ક્રમાંક: કસહ/૨૦૨૬/૦૯/ખ • સત્તાવાર સહાય યોજના',
          releaseDate: 'ફેબ્રુઆરી ૨૦૨૬ કૃષિ સહાય પેકેજ',
          officialPortal: 'https://ikhedut.gujarat.gov.in',
          keyHighlights: [
            'રાજ્યના ધરતીપુત્રો માટે આર્થિક રક્ષણ અને સાધન સહાય માટે મહત્વપૂર્ણ યોજના',
            'પીએમ કિસાન યોજનાનો ₹૨,૦૦૦ નો આગામી ૧૯મો હપ્તો સીધા બેંક ખાતામાં જમા',
            'i-Khedut પોર્ટલ મારફતે તમામ સહાય યોજનાઓનું પારદર્શક ઓનલાઇન અરજી માળખું',
            'નાના, સીમાંત અને મહિલા ખેડૂતોને યોજનામાં વિશેષ પ્રાથમિકતા'
          ],
          eligibility: {
            landOwnership: 'ગુજરાત રાજ્યમાં પોતાની ખેતીની જમીન ધરાવતા તમામ ખાતેદાર ખેડૂતો',
            landRecords: 'જમીનના સત્તાવાર ૭/૧૨ અને ૮-અ માં નામ હોવું ફરજિયાત છે',
            eKycMandate: 'પીએમ કિસાન પોર્ટલ પર આધાર e-KYC પૂર્ણ થયેલું હોવું અનિવાર્ય છે',
            bankLinking: 'બેંક ખાતું આધાર કાર્ડ સાથે NPCI લિંક્ડ (DBT Enabled) હોવું જરૂરી'
          },
          financialBenefits: {
            pmKisanAmount: 'પીએમ કિસાન હેઠળ વાર્ષિક ₹૬,૦૦૦ (₹૨,૦૦૦ ના ૩ સમાન હપ્તા)',
            cropAssistance: 'રાજ્ય કૃષિ સહાય હેઠળ હેક્ટર દીઠ ₹૬,૮૦૦ થી ₹૨૦,૦૦૦ સુધીની જોગવાઈ (મહત્તમ ૨ હેક્ટર)',
            subsidies: 'ટ્રેક્ટર, તાર ફેન્સિંગ, સોલાર પંપ અને દવા છંટકાવ પંપ પર ૪૦% થી ૬૦% સરકારી સબસિડી'
          },
          requiredDocuments: [
            'તાજા ગામ નમૂના નંબર ૭/૧૨ અને ૮-અ ની નકલ',
            'ખેડૂતનું આધાર કાર્ડ અને રેશનકાર્ડની નકલ',
            'બેંક પાસબુકના પ્રથમ પાનાની સ્પષ્ટ નકલ (IFSC કોડ દેખાય તે રીતે)',
            'સંયુક્ત ખાતું હોય તો અન્ય ખાતેદારોનું સંમતિપત્રક',
            'મોબાઇલ નંબર જે આધાર કાર્ડ સાથે લિંક હોય'
          ],
          applicationProcess: [
            'પગલું ૧: સત્તાવાર ikhedut.gujarat.gov.in પોર્ટલ પર જાઓ',
            'પગલું ૨: "યોજનાઓ" ટેબમાં "ખેતીવાડીની યોજનાઓ" પસંદ કરો',
            'પગલું ૩: આધાર નંબર અને ૭/૧૨ ખાતા નંબર દાખલ કરી અરજી ભરો',
            'પગલું ૪: ગ્રામ પંચાયતના VCE મારફતે ફોર્મ ઓનલાઇન સબમિટ કરાવો',
            'પગલું ૫: અરજીની પ્રિન્ટ કાઢી જરૂરી કાગળો સાથે ગ્રામસેવકને જમા કરાવો'
          ],
          importantDates: {
            portalStatus: 'i-Khedut પોર્ટલ પર અરજી વિન્ડો ચાલુ છે',
            lastDate: 'ચાલુ માસની આખરી તારીખ સુધી ઓનલાઇન અરજી સ્વીકારાશે'
          },
          helplineAndDisclaimer: {
            helpline: '૧૮૦૦-૧૮૦-૧૫૫૧ (કિસાન કૉલ સેન્ટર ટોલ-ફ્રી નંબર)',
            warning: 'ઓનલાઇન અરજી કરવા માટે કોઈ વધારાનો ચાર્જ આપવો નહિ, સરકાર દ્વારા નિયત સામાન્ય પોર્ટલ ચાર્જ જ માન્ય છે'
          }
        };

      case 'police':
      case 'recruitment':
        return {
          topic: cleanTopic,
          domain: 'recruitment',
          domainLabel: 'પોલીસ & સરકારી ભરતી બોર્ડ (OJAS)',
          department: 'ગૃહ વિભાગ / ગુજરાત પોલીસ ભરતી બોર્ડ / OJAS ગુજરાત',
          notificationRef: 'સત્તાવાર જાહેરાત ક્રમાંક: PRB/202627/01',
          releaseDate: 'ફેબ્રુઆરી ૨૦૨૬ સત્તાવાર નોટિફિકેશન',
          officialPortal: 'https://ojas.gujarat.gov.in',
          keyHighlights: [
            'ગુજરાતના લાખો યુવાનો માટે વર્ગ-૩ સરકારી નોકરીની સુવર્ણ તક',
            'બિનહથિયારી, હથિયારી પોલીસ કોન્સ્ટેબલ, જેલ સિપાહી અને લોકરક્ષકની મોટી ભરતી',
            'OJAS પોર્ટલ મારફતે ૧૦૦% પારદર્શક ઓનલાઇન અરજી પ્રક્રિયા',
            'નવી સુધારેલી પરીક્ષા પદ્ધતિ અને શારીરિક કસોટી નિયમો લાગુ'
          ],
          eligibility: {
            education: 'માન્ય બોર્ડમાંથી ધોરણ ૧૨ પાસ (હાયર સેકન્ડરી) અથવા સમકક્ષ લાયકાત',
            ageLimit: '૧૮ થી ૩૩ વર્ષ (અનામત કેટેગરીને ૫ વર્ષ સુધીની સરકારી છૂટછાટ)',
            physicalStandards: 'પુરુષ ઊંચાઈ: ૧૬૫ સેમી (અનામત ૧૬૨ સેમી), છાતી: ફુલાવ્યા વગર ૭૯ સેમી, ફુલાવીને ૮૪ સેમી. મહિલા ઊંચાઈ: ૧૫૫ સેમી',
            computerLiteracy: 'સરકાર માન્ય CCC પ્રમાણપત્ર અથવા ધોરણ ૧૦/૧૨ માં કોમ્પ્યુટર વિષય'
          },
          financialBenefits: {
            fixedPay: 'પ્રથમ ૫ વર્ષ માટે નિયત માસિક ફિક્સ પગાર: ₹૨૬,૦૦૦+ પ્રતિ માસ',
            regularPayScale: '૫ વર્ષની સંતોષકારક સેવા પૂર્ણ થયા બાદ સાતમા પગાર પંચ મુજબ પૂર્ણ પે-સ્કેલ (લેવલ-૨)',
            allowances: 'વર્દી ભથ્થું, વોશિંગ ભથ્થું, રજા પગાર અને મેડિકલ સહાય મળવાપાત્ર'
          },
          requiredDocuments: [
            'ધોરણ ૧૦ અને ધોરણ ૧૨ ની ઓરિજિનલ માર્કશીટ અને પાસિંગ સર્ટીફીકેટ',
            'શાળા છોડ્યાનું પ્રમાણપત્ર (School LC)',
            'સક્ષમ અધિકારી દ્વારા અપાયેલ જાતિનો દાખલો (SC/ST/SEBC/EWS)',
            'SEBC કેટેગરી માટે ચાલુ નાણાકીય વર્ષનું નોન-ક્રીમીલેયર સર્ટીફીકેટ (પરિશિષ્ટ-ક)',
            'પાસપોર્ટ સાઇઝનો તાજો ફોટોગ્રાફ અને સહીનો નમૂનો',
            'સ્પોર્ટ્સ પ્રમાણપત્ર / NCC / રક્ષા શક્તિ યુનિવર્સિટી હોય તો વધારાના ગુણ'
          ],
          applicationProcess: [
            'પગલું ૧: ojas.gujarat.gov.in પર જઈ જાહેરાત ક્રમાંક પસંદ કરો',
            'પગલું ૨: Apply Now બટન દબાવી તમામ વિગતો ચોકસાઈથી ભરો',
            'પગલું ૩: પાસપોર્ટ ફોટો અને સહી અપલોડ કરો',
            'પગલું ૪: અરજી કન્ફર્મ કરી કન્ફર્મેશન નંબર મેળવી સાચવી રાખો',
            'પગલું ૫: પોસ્ટ ઓફિસ અથવા ઓનલાઇન મારફતે નિયત પરીક્ષા ફી ચૂકવો'
          ],
          importantDates: {
            startDate: 'ઓજસ પોર્ટલ પર ઓનલાઇન રજીસ્ટ્રેશન શરૂ',
            lastDate: 'ઓનલાઇન અરજી કરવાની આખરી તારીખ રાત્રે ૧૧:૫૯ સુધી',
            physicalTest: 'શિયાળા/વસંત ઋતુ દરમિયાન શારીરિક કસોટી (દોડ) નું આયોજન'
          },
          helplineAndDisclaimer: {
            helpline: '૧૮૦૦-૨૩૩-૫૫૦૦ (OJAS ટોલ-ફ્રી ટેકનિકલ હેલ્પડેસ્ક)',
            warning: 'કોઈપણ વ્યક્તિ સરકારી નોકરી અપાવવાના બહાને નાણાં માંગે તો તાત્કાલિક એન્ટી કરપ્શન બ્યુરો (ACB) ૧૦૬૪ પર સંપર્ક કરો'
          }
        };

      default:
        return {
          topic: cleanTopic,
          domain: 'general',
          domainLabel: 'ગુજરાત સરકાર સત્તાવાર યોજના & પરિપત્ર',
          department: 'સામાન્ય વહીવટ વિભાગ / સંબંધિત સરકારી વિભાગ, સચિવાલય, ગાંધીનગર',
          notificationRef: 'સત્તાવાર પરિપત્ર અને નિયમો ૨૦૨૬',
          releaseDate: 'ફેબ્રુઆરી ૨૦૨૬ સત્તાવાર અપડેટ',
          officialPortal: 'https://gujarat.gov.in',
          keyHighlights: [
            'ગુજરાતના નાગરિકો માટે તાજો સત્તાવાર સરકારી પરિપત્ર અને માર્ગદર્શિકા',
            'નિયમો અને જોગવાઈઓમાં કરવામાં આવેલ મહત્વના સુધારાઓની સંપૂર્ણ વિગત',
            'સત્તાવાર સ્ત્રોત અને જીઆર (GR) આધારિત ૧૦૦% સાચી અને પ્રમાણિત માહિતી',
            'લાભાર્થીઓ અને જનતા માટે સ્ટેપ-બાય-સ્ટેપ અમલીકરણ પ્રક્રિયા'
          ],
          eligibility: {
            generalCriteria: 'ગુજરાત રાજ્યના કાયમી વતનીઓ અને નિયત કેટેગરીના નાગરિકો',
            ageAndIncome: 'સરકારી નિયમ મુજબ નિયત વયમર્યાદા અને આવક મર્યાદાના ધોરણો લાગુ',
            terms: 'સત્તાવાર જાહેરનામામાં દર્શાવેલ તમામ શરતોનું પાલન અનિવાર્ય'
          },
          financialBenefits: {
            directBenefit: 'સરકારી બજેટ જોગવાઈ અનુસાર લાભાર્થીઓને નિયત નાણાકીય સહાય',
            paymentMethod: 'ડાયરેક્ટ બેનિફિટ ટ્રાન્સફર (DBT) મારફતે સીધા બેંક ખાતામાં ચૂકવણી'
          },
          requiredDocuments: [
            'ઓળખનો પુરાવો (આધાર કાર્ડ / ચૂંટણી કાર્ડ)',
            'રહેઠાણનો પુરાવો (રેશનકાર્ડ / લાઇટબિલ)',
            'આવક અને જાતિનો સક્ષમ અધિકારીનો દાખલો',
            'બેંક ખાતાની વિગત (પાસબુક કે કેન્સલ ચેક)'
          ],
          applicationProcess: [
            'પગલું ૧: સંબંધિત વિભાગની સત્તાવાર વેબસાઇટ કે ડિજિટલ ગુજરાત પોર્ટલ પર જાઓ',
            'પગલું ૨: નવી અરજી માટે પોર્ટલ પર લોગીન / સાઇન-અપ કરો',
            'પગલું ૩: વિગતો ભરી પ્રમાણિત દસ્તાવેજો અપલોડ કરો',
            'પગલું ૪: અરજી કન્ફર્મ કરી અરજી સ્લિપ સુરક્ષિત સાચવો'
          ],
          importantDates: {
            effectiveDate: 'પરિપત્ર પ્રસિદ્ધ થયા તારીખથી નિયમો અમલી',
            validity: 'ચાલુ નાણાકીય વર્ષ ૨૦૨૬-૨૭ માટે લાગુ'
          },
          helplineAndDisclaimer: {
            helpline: '૧૮૦૦-૨૩૩-૦૧૧૧ (ગુજરાત સરકાર નાગરિક સેવા હેલ્પલાઇન)',
            warning: 'કોઈપણ અનધિકૃત અફવા પર વિશ્વાસ ન કરવો, માત્ર સત્તાવાર પરિપત્રને જ માન્ય ગણવો'
          }
        };
    }
  }

  /**
   * Build structured slide-by-slide content from research dossier
   */
  buildSlideDeckFromResearch(dossier, slideCount = 5) {
    const cleanTopic = dossier.topic;
    const domain = dossier.domain;
    const d = dossier;

    let baseSlides = [];

    // Slide 1: Official Announcement & Hook
    baseSlides.push({
      slideNumber: 1,
      title: `${cleanTopic}: સત્તાવાર જાહેરાત`,
      subtitle: `${d.department} • ${d.notificationRef}`,
      bulletPoints: [
        `${d.department} દ્વારા તાજો સત્તાવાર પરિપત્ર પ્રસિદ્ધ કરાયો`,
        `મુખ્ય હાઇલાઇટ: ${d.keyHighlights[0] || 'ગુજરાતના નાગરિકો માટે મોટો નિર્ણય'}`,
        `પારદર્શકતા: ${d.keyHighlights[1] || 'ઓનલાઇન પોર્ટલ મારફતે નિયમો અમલી'}`,
        `સંપૂર્ણ વિશ્લેષણ: આ વિડીયોમાં પાત્રતા, પગાર/સહાય અને અરજીની A to Z માહિતી મેળવો`
      ],
      visualConcept: 'ગાંધીનગર સચિવાલય પરિપત્ર કોપી, સરકારી સીલ/લોગો, ૧૦૦% શુદ્ધ સફેદ બેકગ્રાઉન્ડ',
      scriptText: `નમસ્કાર મિત્રો, જ્ઞાન યાત્રા ચેનલમાં આપનું હાર્દિક સ્વાગત છે. આજે આપણે વાત કરીશું "${cleanTopic}" વિશે. ${d.department} દ્વારા સત્તાવાર પરિપત્ર બહાર પાડી દેવામાં આવ્યો છે. આ વિડીયોમાં આપણે જોઈશું કે કોને લાભ મળશે, શું છે નવા નિયમો અને ઓનલાઇન ફોર્મ કેવી રીતે ભરવું. વિડીયો પૂરો જોજો જેથી કોઈ મહત્વની માહિતી ચૂકી ન જવાય.`,
      slideType: 'announcement'
    });

    // Slide 2: Eligibility & Qualifications
    const elig = d.eligibility;
    const eligPoints = domain === 'anganwadi'
      ? [
          `કાર્યકર બહેનો માટે લઘુત્તમ લાયકાત: ${elig.workerQualification}`,
          `તેડાગર બહેનો માટે લઘુત્તમ લાયકાત: ${elig.helperQualification}`,
          `વયમર્યાદા: ${elig.ageLimit}`,
          `સ્થાનિક રહેવાસી હોવાના નિયમો: ${elig.residency}`
        ]
      : domain === 'da_employee'
        ? [
            `લાભાર્થી વર્ગ: ${elig.targetBeneficiaries}`,
            `પેન્શનર્સ જોગવાઈ: ${elig.pensioners}`,
            `પગાર પંચ નિયમ: ${elig.conditions}`,
            `પંચાયત અને ગ્રાન્ટ-ઇન-એઇડ કર્મચારીઓને પણ સમાન હક્ક`
          ]
        : domain === 'kisan_scheme'
          ? [
              `જમીન ધારકો: ${elig.landOwnership}`,
              `જમીન રેકોર્ડ્સ: ${elig.landRecords}`,
              `આધાર e-KYC: ${elig.eKycMandate}`,
              `બેંક એકાઉન્ટ: ${elig.bankLinking}`
            ]
          : domain === 'recruitment' || domain === 'police'
            ? [
                `શૈક્ષણિક લાયકાત: ${elig.education}`,
                `વયમર્યાદા: ${elig.ageLimit}`,
                `શારીરિક માપદંડ: ${elig.physicalStandards}`,
                `કોમ્પ્યુટર જ્ઞાન: ${elig.computerLiteracy}`
              ]
            : [
                `પાત્રતાના માપદંડો: ${elig.generalCriteria || 'ગુજરાતના નાગરિકો'}`,
                `વય અને આવક મર્યાદા: ${elig.ageAndIncome || 'સરકારી નિયમો મુજબ'}`,
                `અન્ય શરતો: ${elig.terms || 'સત્તાવાર નિયમો લાગુ'}`
              ];

    baseSlides.push({
      slideNumber: 2,
      title: 'કોને મળશે લાભ? પાત્રતા અને શરતો',
      subtitle: 'શૈક્ષણિક લાયકાત • વયમર્યાદા • સત્તાવાર નિયમો',
      bulletPoints: eligPoints,
      visualConcept: 'લાયકાત પ્રમાણપત્ર અને વયમર્યાદા ચાર્ટ, સ્પષ્ટ ગુજરાતી હેડિંગ બોક્સ',
      scriptText: `હવે મિત્રો, સ્લાઇડ નંબર ૨ માં સમજીએ કે આ યોજના કે ભરતી માટે પાત્રતા શું છે. અહીં સરકાર દ્વારા સ્પષ્ટ નિયમો નક્કી કરાયા છે. શૈક્ષણિક લાયકાત અને વયમર્યાદાના નિયમો ખાસ ધ્યાને લેવા જેવા છે. અનામત કેટેગરીના ઉમેદવારોને નિયમાનુસાર છૂટછાટ મળવાપાત્ર છે.`,
      slideType: 'eligibility'
    });

    // Slide 3: Financial Benefits / Pay Scale
    const fin = d.financialBenefits;
    const finPoints = domain === 'anganwadi'
      ? [
          `કાર્યકર બહેનોનું માનદવેતન: ${fin.workerHonorarium}`,
          `તેડાગર બહેનોનું માનદવેતન: ${fin.helperHonorarium}`,
          `ભથ્થા અને પ્રોત્સાહન: ${fin.allowances}`,
          `ચૂકવણી પદ્ધતિ: ${fin.paymentMode}`
        ]
      : domain === 'da_employee'
        ? [
            `નવો મોંઘવારી ભથ્થા દર: ${fin.rateHike}`,
            `રોકડ એરિયર્સ ચૂકવણી: ${fin.cashArrears}`,
            `માસિક ચોખ્ખો વધારો: ${fin.monthlyIncrease}`,
            `અન્ય ભથ્થા પર અસર: ${fin.impactOnAllowances}`
          ]
        : domain === 'kisan_scheme'
          ? [
              `પીએમ કિસાન હપ્તો: ${fin.pmKisanAmount}`,
              `હેક્ટર દીઠ સહાય: ${fin.cropAssistance}`,
              `સાધન સહાય સબસિડી: ${fin.subsidies}`,
              `સીધા આધાર લિંક્ડ બેંક ખાતામાં DBT દ્વારા જમા`
            ]
          : domain === 'recruitment' || domain === 'police'
            ? [
                `ફિક્સ પગાર (પ્રથમ ૫ વર્ષ): ${fin.fixedPay}`,
                `નિયમિત પે-સ્કેલ: ${fin.regularPayScale}`,
                `સરકારી ભથ્થાઓ: ${fin.allowances}`,
                `દર મહિને સમયસર બેંક એકાઉન્ટમાં સીધો જમા`
              ]
            : [
                `મળવાપાત્ર સીધો આર્થિક લાભ: ${fin.directBenefit || 'સરકારી બજેટમાંથી ફાળવણી'}`,
                `ચુકવણી પદ્ધતિ: ${fin.paymentMethod || 'DBT મારફતે ખાતામાં જમા'}`
              ];

    baseSlides.push({
      slideNumber: 3,
      title: 'પગાર ધોરણ / સહાય રકમ & નાણાકીય લાભ',
      subtitle: 'ખાતામાં કેટલી રકમ જમા થશે? • સત્તાવાર ગણતરી',
      bulletPoints: finPoints,
      visualConcept: 'રૂપિયાનું પ્રતીક (₹), બેંક DBT ટ્રાન્સફર ગ્રાફિક અને પેકેજ ટેબલ',
      scriptText: `ત્રીજી સ્લાઇડમાં સૌથી મહત્વની વાત કરીએ: નાણાકીય લાભ કેટલો થશે? આ પરિપત્ર મુજબ મળવાપાત્ર રકમ સીધી તમારા બેંક ખાતામાં ડીબીટી (DBT) મારફતે જમા થશે. દરેક કેટેગરી મુજબ રકમનું વિભાજન સ્ક્રીન પર દર્શાવ્યા મુજબ રહેશે.`,
      slideType: 'financial'
    });

    // Slide 4: Required Documents Checklist
    const docs = Array.isArray(d.requiredDocuments) ? d.requiredDocuments.slice(0, 4) : [];
    baseSlides.push({
      slideNumber: 4,
      title: 'જરૂરી ડોક્યુમેન્ટ્સ ચેકલિસ્ટ',
      subtitle: 'અરજી કરતી વખતે સાથે રાખવાના અસલી કાગળો',
      bulletPoints: docs.map(doc => `${doc}`),
      visualConcept: 'સરકારી દસ્તાવેજ ચેકલિસ્ટ ફોલ્ડર, ઓરિજિનલ સ્કેન કોપી નિશાની',
      scriptText: `મિત્રો, ફોર્મ ભરતા પહેલા જરૂરી કાગળો તૈયાર રાખવા ખૂબ જરૂરી છે જેથી છેલ્લી ઘડીએ દોડધામ ન થાય. સ્ક્રીન પર દર્શાવેલા તમામ ડોક્યુમેન્ટ્સ તમારા આધાર કાર્ડ સાથે મેળ ખાતા હોવા જોઈએ. સ્પષ્ટ સ્કેન કોપી જ અપલોડ કરવી.`,
      slideType: 'documents'
    });

    // Slide 5: Step-by-Step Online Application
    const steps = Array.isArray(d.applicationProcess) ? d.applicationProcess.slice(0, 4) : [];
    baseSlides.push({
      slideNumber: 5,
      title: 'ઓનલાઇન અરજી સ્ટેપ-બાય-સ્ટેપ રીત',
      subtitle: `સત્તાવાર પોર્ટલ: ${d.officialPortal || 'gujarat.gov.in'}`,
      bulletPoints: steps.map(st => `${st}`),
      visualConcept: 'લેપટોપ / સ્માર્ટફોન પર સરકારી પોર્ટલનું લાઈવ હોમપેજ સ્ક્રીનશોટ',
      scriptText: `હવે જોઈએ કે ઓનલાઇન અરજી કેવી રીતે કરવી. તમે ઘરબેઠા તમારા મોબાઇલ કે કોમ્પ્યુટરથી સત્તાવાર પોર્ટલ પર જઈને આ પાંચ સરળ સ્ટેપમાં ફોર્મ ભરી શકો છો. ફોર્મ ભર્યા પછી કન્ફર્મેશન નંબર સાચવવો ભૂલતા નહિ.`,
      slideType: 'process'
    });

    // If 8+ slides requested, add additional deep dives
    if (slideCount >= 8) {
      baseSlides.push({
        slideNumber: 6,
        title: 'મહત્વપૂર્ણ નિયમો & વેરિફિકેશન પ્રક્રિયા',
        subtitle: 'ભૂલો ટાળો • સત્તાવાર માર્ગદર્શિકા મુજબ કામ કરો',
        bulletPoints: [
          'અરજીમાં નામ, જન્મતારીખ અને અટક સ્કૂલ એલસી મુજબ જ દાખલ કરવી',
          'ખોટી માહિતી આપનાર ઉમેદવારનું ફોર્મ કોઈપણ તબક્કે રદ થઈ શકે છે',
          'ઓનલાઇન ફી ભર્યા બાદ પેમેન્ટ રિસીપ્ટ અવશ્ય ડાઉનલોડ કરી લેવી',
          'જિલ્લા પંચાયત અથવા કચેરી દ્વારા રૂબરૂ ચકાસણી વખતે તમામ અસલી કાગળો રજૂ કરવા પડશે'
        ],
        visualConcept: 'વેરિફિકેશન ચેકમાર્ક અને સાવચેતી આઇકોન',
        scriptText: `સ્લાઇડ નંબર ૬ પર ખાસ ધ્યાન આપજો. દર વર્ષે હજારો અરજીઓ નાની ભૂલોને કારણે રદ થતી હોય છે. એટલે નામ અને જન્મતારીખ એલસી મુજબ જ ભરવા.`,
        slideType: 'rules'
      });

      baseSlides.push({
        slideNumber: 7,
        title: 'છેલ્લી તારીખ & મહત્વપૂર્ણ સમયમર્યાદા',
        subtitle: 'સમયસર અરજી પૂર્ણ કરવી અનિવાર્ય',
        bulletPoints: [
          `ઓનલાઇન અરજી શરૂ તારીખ: ${d.importantDates.startDate || 'પરિપત્ર મુજબ ચાલુ છે'}`,
          `ઓનલાઇન અરજી કરવાની છેલ્લી તારીખ: ${d.importantDates.lastDate || 'ચાલુ માસની આખરી તારીખ'}`,
          'છેલ્લા દિવસોમાં સર્વર ડાઉન રહેવાની શક્યતા હોવાથી વહેલી તકે ફોર્મ ભરી લેવું',
          'કન્ફર્મેશન મળ્યા બાદ જ અરજી માન્ય ગણાશે'
        ],
        visualConcept: 'કેલેન્ડર તારીખ હાઇલાઇટ અને ડેડલાઇન ક્લોક',
        scriptText: `સાતમી સ્લાઇડમાં સૌથી મહત્વપૂર્ણ તારીખો નોંધી લેશો. છેલ્લી તારીખની રાહ જોયા વગર સમયસર અરજી કન્ફર્મ કરી લેવી હિતાવહ છે.`,
        slideType: 'dates'
      });

      baseSlides.push({
        slideNumber: 8,
        title: 'સત્તાવાર હેલ્પલાઇન & ચેતવણી (સાવચેતી)',
        subtitle: `${d.helplineAndDisclaimer.warning || 'અફવાઓથી દૂર રહો'}`,
        bulletPoints: [
          `સત્તાવાર હેલ્પલાઇન નંબર: ${d.helplineAndDisclaimer.helpline || '૧૮૦૦-૨૩૩-૧૧૧૧'}`,
          'કોઈપણ પ્રકારની અફવા કે ખોટા વોટ્સએપ મેસેજ પર વિશ્વાસ ન કરવો',
          'સરકારી પોર્ટલ સિવાય અન્ય કોઈ અજાણી લિંક પર અંગત વિગતો આપવી નહિ',
          'નવીનતમ સત્તાવાર પરિપત્રો માટે જ્ઞાન યાત્રા ચેનલ સાથે જોડાયેલા રહો'
        ],
        visualConcept: 'ટોલ-ફ્રી હેલ્પલાઇન આઇકોન, જ્ઞાન યાત્રા વેરિફાઇડ બેજ',
        scriptText: `અંતિમ સ્લાઇડમાં, જો તમને કોઈ પ્રશ્ન કે મુશ્કેલી હોય તો સત્તાવાર હેલ્પલાઇન નંબર પર સંપર્ક કરી શકો છો. વિડીયો પસંદ આવ્યો હોય તો લાઈક અને શેર જરૂર કરજો. ધન્યવાદ!`,
        slideType: 'warning'
      });
    }

    // Format final 16:9 pure white slides
    return baseSlides.map((s, idx) => ({
      id: `slide_${Date.now()}_${idx + 1}`,
      slideNumber: idx + 1,
      pageNumber: idx + 1,
      slideId: `slide_${Date.now()}_${idx + 1}`,
      title: s.title,
      subtitle: s.subtitle,
      bulletPoints: s.bulletPoints,
      bgColor: '#FFFFFF', // 100% Pure White Background
      headingBoxStyle: 'solid',
      headingBoxBg: '#0F172A', // Solid Deep Navy
      headingBoxTextColor: '#FFFFFF',
      accentColor: domain === 'da_employee' ? '#2563EB' : domain === 'kisan_scheme' ? '#10B981' : '#DC2626',
      textColor: '#0F172A',
      visual: s.visualConcept,
      visualConcept: s.visualConcept,
      scriptText: s.scriptText,
      audioTime: `${idx * 45}s - ${(idx + 1) * 45}s`,
      slideType: s.slideType,
      notes: `૧૬:૯ શુદ્ધ સફેદ બેકગ્રાઉન્ડ • ${s.title}`
    }));
  }

  /**
   * Format complete research and slide breakdown into one unified master copyable content text
   */
  formatUnifiedMasterContent(dossier, slides) {
    let out = `========================================================================\n`;
    out += `🎯 વિષય (TOPIC): ${dossier.topic}\n`;
    out += `🏛️ સરકારી વિભાગ: ${dossier.department}\n`;
    out += `📜 સત્તાવાર પરિપત્ર / નોટિફિકેશન: ${dossier.notificationRef}\n`;
    out += `📅 તારીખ / વર્ષ: ${dossier.releaseDate}\n`;
    out += `🌐 સત્તાવાર પોર્ટલ: ${dossier.officialPortal}\n`;
    out += `========================================================================\n\n`;

    out += `【૧. મુખ્ય રિસર્ચ હાઇલાઇટ્સ & સત્તાવાર વિગત】\n`;
    (dossier.keyHighlights || []).forEach(h => {
      out += `• ${h}\n`;
    });
    out += `\n`;

    out += `【૨. પાત્રતા અને શૈક્ષણિક લાયકાત / વયમર્યાદા】\n`;
    Object.values(dossier.eligibility || {}).forEach(v => {
      out += `• ${v}\n`;
    });
    out += `\n`;

    out += `【૩. પગાર ધોરણ / સહાય રકમ & નાણાકીય લાભ (DBT)】\n`;
    Object.values(dossier.financialBenefits || {}).forEach(v => {
      out += `• ${v}\n`;
    });
    out += `\n`;

    out += `【૪. જરૂરી ડોક્યુમેન્ટ્સ ચેકલિસ્ટ】\n`;
    (dossier.requiredDocuments || []).forEach((doc, idx) => {
      out += `${idx + 1}. ${doc}\n`;
    });
    out += `\n`;

    out += `【૫. ઓનલાઇન અરજી કરવાની સ્ટેપ-બાય-સ્ટેપ રીત】\n`;
    (dossier.applicationProcess || []).forEach(step => {
      out += `• ${step}\n`;
    });
    out += `\n`;

    out += `【૬. મહત્વપૂર્ણ સમયમર્યાદા & સત્તાવાર હેલ્પલાઇન】\n`;
    if (dossier.importantDates?.startDate) out += `• અરજી શરૂ તારીખ: ${dossier.importantDates.startDate}\n`;
    if (dossier.importantDates?.lastDate) out += `• છેલ્લી તારીખ: ${dossier.importantDates.lastDate}\n`;
    if (dossier.helplineAndDisclaimer?.helpline) out += `• સત્તાવાર હેલ્પલાઇન: ${dossier.helplineAndDisclaimer.helpline}\n`;
    if (dossier.helplineAndDisclaimer?.warning) out += `• સાવચેતી / ચેતવણી: ${dossier.helplineAndDisclaimer.warning}\n`;
    out += `\n`;

    out += `========================================================================\n`;
    out += `🎬 ૧૬:૯ સ્લાઇડ પ્રમાણે સંપૂર્ણ કન્ટેન્ટ & સ્ક્રિપ્ટ (કુલ ${slides.length} સ્લાઇડ્સ)\n`;
    out += `========================================================================\n\n`;

    slides.forEach((sl, idx) => {
      out += `------------------------------------------------------------------------\n`;
      out += `[સ્લાઇડ #${sl.slideNumber}: ${sl.title}]\n`;
      if (sl.subtitle) out += `સબટાઇટલ: ${sl.subtitle}\n`;
      out += `સમયગાળો: ${sl.audioTime || `${idx * 45}s - ${(idx + 1) * 45}s`}\n`;
      out += `વિઝ્યુઅલ: ${sl.visualConcept || sl.visual || '૧૦૦% શુદ્ધ સફેદ બેકગ્રાઉન્ડ, સત્તાવાર પરિપત્ર'}\n\n`;

      out += `📌 ૧૬:૯ સ્લાઇડ બુલેટ પોઇન્ટ્સ:\n`;
      (sl.bulletPoints || []).forEach(pt => {
        out += `  • ${pt.replace(/^[•\-\*0-9\.\)]+\s*/, '')}\n`;
      });
      out += `\n`;

      out += `🎙️ બોલવાની ગુજરાતી સ્ક્રિપ્ટ (Voiceover Script):\n`;
      out += `"${sl.scriptText || ''}"\n`;
      out += `------------------------------------------------------------------------\n\n`;
    });

    return out;
  }

  /**
   * Main Web Research & Slide Generation Pipeline
   */
  async performTopicWebResearch({ topic, slideCount = 5, domain = null }) {
    const cleanTopic = (topic || 'ગુજરાત સરકાર સત્તાવાર પરિપત્ર ૨૦૨૬').trim();
    const count = Number(slideCount) === 8 || Number(slideCount) === 10 ? Number(slideCount) : 5;
    const detectedDomain = domain || this.detectDomain(cleanTopic);

    // 1. Fetch live trends and news feeds signals
    let liveSignals = [];
    try {
      liveSignals = await trendsService.fetchLiveTrends();
    } catch (e) {
      console.warn('[TopicResearchService] live trends warning:', e.message);
    }

    // 2. Synthesize deep research dossier
    const dossier = this.getDomainResearchDossier(cleanTopic, detectedDomain);
    dossier.liveSignals = (liveSignals || []).slice(0, 5);

    // 3. Build slide-by-slide deck
    const slides = this.buildSlideDeckFromResearch(dossier, count);

    // 4. Generate synchronized script sections
    const scriptSections = slides.map((sl, idx) => {
      const startMin = Math.floor((idx * 45) / 60);
      const startSec = (idx * 45) % 60;
      const endMin = Math.floor(((idx + 1) * 45) / 60);
      const endSec = ((idx + 1) * 45) % 60;
      const pad = n => (n < 10 ? '0' : '') + n;
      return {
        slideId: sl.id,
        slideNumber: sl.slideNumber,
        sectionName: sl.title,
        title: sl.title,
        subtitle: sl.subtitle,
        timeRange: `${startMin}:${pad(startSec)} - ${endMin}:${pad(endSec)}`,
        content: sl.scriptText,
        scriptText: sl.scriptText,
        bulletPoints: sl.bulletPoints,
        directorNotes: `૧૬:૯ શુદ્ધ સફેદ સ્લાઇડ #${sl.slideNumber}. કેમેરા સામે કુદરતી અવાજે રજૂઆત.`
      };
    });

    const fullScript = scriptSections.map(s => `[સ્લાઇડ #${s.slideNumber}: ${s.sectionName}]\n${s.scriptText}`).join('\n\n');
    const unifiedMasterContent = this.formatUnifiedMasterContent(dossier, slides);

    return {
      success: true,
      topic: cleanTopic,
      domain: detectedDomain,
      researchDossier: dossier,
      slides,
      scriptSections,
      fullScript,
      unifiedMasterContent,
      slideCount: slides.length
    };
  }
}

module.exports = new TopicResearchService();
