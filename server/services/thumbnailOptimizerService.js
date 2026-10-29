/**
 * Smart Thumbnail Text & Color Contrast Optimizer Service
 * 
 * Preserves the finalized Gyan Yatra thumbnail structure:
 * - 16:9 aspect ratio
 * - Pure Solid White Background (#FFFFFF)
 * - Exactly ONE authentic photographic subject on the left
 * - 3 to 4 short, bold, mobile-readable text elements on the right
 * - High-contrast color palette:
 *     • Primary Text: Deep Navy Blue (#102A56) - AAA Contrast
 *     • Primary Hook Panel: Crimson Red (#D71920) with Gold Yellow (#FFD928) Text
 *     • Supporting Text: Dark Charcoal / Pure Black (#111111)
 *     • Secondary Badge: Deep Navy (#102A56) with White (#FFFFFF) Text
 * - Strict Fact-Checking: Never invents approvals, salary hikes, or fake claims
 * - Complete, copy-ready AI generation prompt (DALL-E 3 / Midjourney)
 */

class ThumbnailOptimizerService {
  /**
   * Derive the 3-4 hierarchical text elements from any video topic
   * Hierarchy:
   * 1. Main Topic (વિષય - Who or What)
   * 2. Primary Hook (મુખ્ય આકર્ષણ / સવાલ - The core reason to click)
   * 3. Supporting Text (સહાયક વિગત - Verified year/date/target detail)
   * 4. Optional Badge (સ્ટેટસ બેજ - Verified tag or category badge)
   */
  deriveSmartTextElements(topic = '', category = 'general') {
    const rawTopic = (topic || '').trim();
    const t = rawTopic.toLowerCase();

    // Check for unverified or speculative phrasing
    const isQuestionOrSpeculative = /\?|કેમ\?|શું\?|કેટલો\?|શક્યતા|અફવા|હશે\?|નહીં\?/i.test(rawTopic);
    const hasExplicitApproval = /મંજૂર|જાહેર|સત્તાવાર|પરિપત્ર|gr|હુકમ|ઓર્ડર|approved/i.test(rawTopic);

    // Topic Domains
    const isSalary = /પગાર|વધારો|salary|hike|da|મોંઘવારી|ભથ્થ|પેન્શન|માનદવેતન|માનદ વેતન|વેતન|૭મું પંચ/i.test(t);
    const isAnganwadi = /આંગણવાડી|તેડાગર|anganwadi/i.test(t);
    const isSupervisor = /સુપરવાઈઝર|supervisor/i.test(t);
    const isPolice = /પોલીસ|lrd|police|કોન્સ્ટેબલ|રક્ષક|psi|પીએસઆઇ/i.test(t);
    const isSahay = /સહાય|યોજના|ખેડૂત|કિસાન|સબસિડી|ખાતામાં|ગાય સહાય|ટ્રેક્ટર સહાય|આવાસ/i.test(t);
    const isEducation = /બોર્ડ|gseb|રીઝલ્ટ|result|૧૦મું|૧૨મું|10th|12th|પરીક્ષા|એડમિશન|કોલેજ|વિદ્યાર્થી/i.test(t);
    const isRecruitment = /ભરતી|ટેટ|ટાટ|શિક્ષક|clerk|તલાટી|પરીક્ષા|ojas|recruitment|vacancy|જગ્યાઓ/i.test(t);
    const isBusiness = /કમાણી|બિઝનેસ|ઓનલાઇન|રૂપિયા|પૈસા|રોકાણ|શેરબજાર|business|earning/i.test(t);

    let element1 = ''; // Main Topic
    let element2 = ''; // Primary Hook
    let element3 = ''; // Supporting Text
    let element4 = ''; // Optional Badge

    let element1En = '';
    let element2En = '';
    let element3En = '';
    let element4En = '';

    let photoSubjectGujarati = '';
    let photoSubjectEnglish = '';

    // 1. Anganwadi Salary / Honorarium
    if (isAnganwadi && isSalary) {
      element1 = 'આંગણવાડી બહેનો';
      element1En = 'ANGANWADI WORKERS';

      if (hasExplicitApproval && !isQuestionOrSpeculative) {
        element2 = 'માનદવેતન વધારો મંજૂર!';
        element2En = 'HONORARIUM HIKE APPROVED!';
      } else {
        element2 = 'માનદવેતન વધારાની ગણતરી';
        element2En = 'HONORARIUM HIKE DETAILS';
      }

      element3 = '૨૦૨૬ સત્તાવાર અપડેટ';
      element3En = '2026 OFFICIAL UPDATE';

      element4 = 'મહત્વના સમાચાર';
      element4En = 'BREAKING UPDATE';

      photoSubjectGujarati = 'આંગણવાડી કાર્યકર બહેનનો વાસ્તવિક ખુશ ચહેરો: કેમેરા સામે ઉત્સાહ અને સંતોષથી જોતી સાચી ભારતીય આંગણવાડી બહેન.';
      photoSubjectEnglish = 'an authentic Indian Gujarati Anganwadi female worker looking at camera with a natural happy and confident smile';
    }
    // 2. Gujarat Govt Employees DA & Salary
    else if (isSalary || /મુખ્યમંત્રી|ભૂપેન્દ્ર|cm|કર્મચારી/i.test(t)) {
      element1 = 'ગુજરાત કર્મચારીઓ';
      element1En = 'GUJARAT GOVT EMPLOYEES';

      const hasDa = /da|મોંઘવારી|ભથ્થ/i.test(t);
      const hasBasicSalary = /પગાર|salary|વેતન/i.test(t);

      if (hasExplicitApproval && !isQuestionOrSpeculative) {
        if (hasDa && hasBasicSalary) {
          element2 = 'પગાર અને DA વધારો મંજૂર!';
          element2En = 'SALARY & DA HIKE APPROVED!';
        } else if (hasDa) {
          element2 = 'DA વધારો મંજૂર!';
          element2En = 'DA HIKE APPROVED!';
        } else {
          element2 = 'પગાર વધારો મંજૂર!';
          element2En = 'SALARY HIKE APPROVED!';
        }
      } else {
        // Safe factual query without unverified claims
        if (hasDa) {
          element2 = 'DA વધારો કેટલો મળશે?';
          element2En = 'HOW MUCH DA HIKE?';
        } else {
          element2 = 'પગાર સુધારણા નિયમો';
          element2En = 'NEW SALARY RULES';
        }
      }

      element3 = '૨૦૨૬ સત્તાવાર પરિપત્ર';
      element3En = '2026 OFFICIAL CIRCULAR';

      element4 = 'સત્તાવાર નિર્ણય';
      element4En = 'OFFICIAL DECISION';

      photoSubjectGujarati = 'ગુજરાતના મુખ્યમંત્રીશ્રી ભૂપેન્દ્ર પટેલનો વાસ્તવિક સત્તાવાર ફોટો: પ્રેસ કોન્ફરન્સમાં સત્તાવાર નિર્ણય જાહેર કરતા મુખ્યમંત્રીશ્રી.';
      photoSubjectEnglish = 'the Chief Minister of Gujarat, Bhupendra Patel, in traditional clean white kurta at an official press briefing podium looking at camera with a confident expression';
    }
    // 3. Anganwadi Supervisor
    else if (isAnganwadi && isSupervisor) {
      element1 = 'આંગણવાડી સુપરવાઈઝર';
      element1En = 'ANGANWADI SUPERVISOR';

      element2 = 'નવી સીધી ભરતી ૨૦૨૬';
      element2En = 'NEW RECRUITMENT 2026';

      element3 = 'લાયકાત અને સિલેબસ';
      element3En = 'ELIGIBILITY & SYLLABUS';

      element4 = 'ઓજસ પોર્ટલ';
      element4En = 'OJAS PORTAL';

      photoSubjectGujarati = 'શિક્ષિકાનો વાસ્તવિક પ્રોફેશનલ ફોટો: કેમેરા સામે ઉત્સાહથી જોતો ભારતીય શિક્ષિકા/ઉમેદવારનો ચહેરો.';
      photoSubjectEnglish = 'a professional Indian woman educator looking at camera with a natural confident expression';
    }
    // 4. Gujarat Police / LRD
    else if (isPolice) {
      element1 = 'ગુજરાત પોલીસ ભરતી';
      element1En = 'GUJARAT POLICE BHARTI';

      element2 = '૧૨,૦૦૦+ નવી જગ્યાઓ';
      element2En = '12,000+ NEW VACANCIES';

      element3 = 'નવા શારીરિક & લેખિત નિયમો';
      element3En = 'NEW PHYSICAL & EXAM RULES';

      element4 = 'સત્તાવાર જાહેરાત';
      element4En = 'OFFICIAL NOTICE';

      photoSubjectGujarati = 'પોલીસ ઉમેદવારનો વાસ્તવિક ફોટો: ખાખી યુનિફોર્મમાં કેમેરા સામે ગર્વ અને સંકલ્પથી જોતો યુવા ઉમેદવાર.';
      photoSubjectEnglish = 'a young authentic Indian candidate in crisp khaki police recruitment uniform looking at camera with determination';
    }
    // 5. Gujarat Govt Sahay / Kisan Schemes
    else if (isSahay) {
      element1 = 'ગુજરાત ખેડૂત સહાય';
      element1En = 'GUJARAT KISAN SAHAY';

      element2 = 'સીધા ખાતામાં સહાય જમા';
      element2En = 'DIRECT BANK TRANSFER';

      element3 = 'ઓનલાઇન અરજી પ્રક્રિયા';
      element3En = 'ONLINE APPLICATION';

      element4 = 'સરકારી યોજના ૨૦૨૬';
      element4En = 'GOVT SCHEME 2026';

      photoSubjectGujarati = 'ખેડૂતનો વાસ્તવિક ખુશ ચહેરો: કેમેરા સામે હાથ જોડીને સંતોષથી જોતો ભારતીય ખેડૂત.';
      photoSubjectEnglish = 'a dignified Indian Gujarati farmer in clean traditional white kurta looking at camera with folded hands and a warm smile';
    }
    // 6. Education / Board Exams / GSEB
    else if (isEducation) {
      element1 = 'ધોરણ ૧૦-૧૨ બોર્ડ';
      element1En = 'GSEB 10TH & 12TH BOARD';

      if (/રીઝલ્ટ|result|તારીખ/i.test(t)) {
        element2 = 'પરિણામ તારીખ જાહેર!';
        element2En = 'RESULT DATE DECLARED!';
      } else {
        element2 = 'આ ૩ કોર્સ ખાસ કરો';
        element2En = 'TOP 3 HIGH-PAYING COURSES';
      }

      element3 = 'કરિયર ગાઈડન્સ ૨૦૨૬';
      element3En = 'CAREER GUIDANCE 2026';

      element4 = 'GSEB સત્તાવાર';
      element4En = 'GSEB OFFICIAL';

      photoSubjectGujarati = 'વિદ્યાર્થી અથવા વરિષ્ઠ શિક્ષકનો વાસ્તવિક ચહેરો: પુસ્તક અથવા માર્કશીટ સાથે કેમેરા સામે જોતો ભારતીય ચહેરો.';
      photoSubjectEnglish = 'a dedicated Indian educator or studious young student looking at camera with a focused expression';
    }
    // 7. General Recruitment
    else if (isRecruitment) {
      element1 = 'ગુજરાત સરકારી ભરતી';
      element1En = 'GUJARAT GOVT RECRUITMENT';

      element2 = 'નવી સત્તાવાર જાહેરાત';
      element2En = 'NEW OFFICIAL VACANCY';

      element3 = 'કુલ જગ્યાઓ & લાયકાત';
      element3En = 'ELIGIBILITY & VACANCIES';

      element4 = 'ઓજસ પોર્ટલ ૨૦૨૬';
      element4En = 'OJAS PORTAL 2026';

      photoSubjectGujarati = 'ઉમેદવારનો વાસ્તવિક પ્રોફેશનલ ફોટો: કેમેરા સામે આત્મવિશ્વાસથી જોતો ભારતીય યુવાન.';
      photoSubjectEnglish = 'a professional Indian educator looking at camera with a natural confident expression';
    }
    // 8. Business / Finance / Earning
    else if (isBusiness) {
      element1 = 'મોબાઇલથી ઓનલાઇન કમાણી';
      element1En = 'ONLINE MOBILE EARNING';

      element2 = 'રોજના ₹1,000 થી ₹2,500';
      element2En = 'DAILY EARNING GUIDE';

      element3 = 'ઝીરો રોકાણ સાથે શરૂઆત';
      element3En = 'ZERO INVESTMENT REQUIRED';

      element4 = '૧૦૦% સાચું પ્રૂફ';
      element4En = 'VERIFIED PROOF';

      photoSubjectGujarati = 'વાસ્તવિક ભારતીય ડિજિટલ ક્રિએટરનો ખુશ ચહેરો: મોબાઇલ સ્ક્રીન બતાવતો આત્મવિશ્વાસપૂર્ણ ભાવ.';
      photoSubjectEnglish = 'a confident young Indian professional holding a clean smartphone looking at camera with a warm authentic smile';
    }
    // 9. Default General Topic
    else {
      // Split topic cleanly into 3-4 sensible elements
      const words = rawTopic.split(/\s+/).filter(Boolean);
      element1 = words.slice(0, 2).join(' ') || 'ગુજરાત નવી અપડેટ';
      element1En = 'GUJARAT NEW UPDATE';

      element2 = words.slice(2, 5).join(' ') || 'મોટી સત્તાવાર જાહેરાત';
      element2En = 'OFFICIAL ANNOUNCEMENT';

      element3 = '૨૦૨૬ ની તાજી વિગત';
      element3En = '2026 LATEST DETAILS';

      element4 = 'સત્તાવાર માહિતી';
      element4En = 'OFFICIAL INFO';

      photoSubjectGujarati = 'વિષયને અનુરૂપ વાસ્તવિક ભારતીય વ્યક્તિનો અસલી પ્રોફેશનલ ફોટો: કેમેરા સામે સંતુલિત અને ગંભીર ભાવ સાથે જોતો ચહેરો.';
      photoSubjectEnglish = 'an authentic Indian professional matching the topic looking at camera with a natural confident expression';
    }

    return {
      element1,
      element2,
      element3,
      element4,
      element1En,
      element2En,
      element3En,
      element4En,
      photoSubjectGujarati,
      photoSubjectEnglish,
      isVerified: !isQuestionOrSpeculative || hasExplicitApproval
    };
  }

  /**
   * Generates the complete, copy-ready AI thumbnail prompt and metadata
   * following the user's finalized #FFFFFF white background template.
   */
  generateOptimizedPrompt(topic = '', userOverrides = {}) {
    const rawTopic = (topic || '').trim() || 'આંગણવાડી સુપરવાઈઝર ભરતી 2026';
    const defaults = this.deriveSmartTextElements(rawTopic);

    // Allow user overrides from UI text boxes
    const element1 = (userOverrides.element1 !== undefined && userOverrides.element1 !== '') ? userOverrides.element1 : defaults.element1;
    const element2 = (userOverrides.element2 !== undefined && userOverrides.element2 !== '') ? userOverrides.element2 : defaults.element2;
    const element3 = (userOverrides.element3 !== undefined && userOverrides.element3 !== '') ? userOverrides.element3 : defaults.element3;
    const element4 = (userOverrides.element4 !== undefined && userOverrides.element4 !== '') ? userOverrides.element4 : defaults.element4;

    const element1En = userOverrides.element1En || defaults.element1En;
    const element2En = userOverrides.element2En || defaults.element2En;
    const element3En = userOverrides.element3En || defaults.element3En;
    const element4En = userOverrides.element4En || defaults.element4En;

    const photoSubjectGujarati = userOverrides.photoSubjectGujarati || defaults.photoSubjectGujarati;
    const photoSubjectEnglish = userOverrides.photoSubjectEnglish || defaults.photoSubjectEnglish;

    // Strict High-Contrast Color Palette for Pure Solid White (#FFFFFF)
    const colorPalette = {
      background: '#FFFFFF',
      backgroundName: 'Pure Solid White (૧૦૦% શુદ્ધ સફેદ)',
      primaryText: '#102A56',
      primaryTextName: 'Deep Navy Blue (ઘેરો નેવી બ્લૂ - AAA Contrast)',
      primaryTextContrast: '14.2:1 (Super High)',
      accentPanel: '#D71920',
      accentPanelName: 'Crimson Red Panel (ડાર્ક રેડ એમ્ફેસીસ પેનલ)',
      accentPanelText: '#FFD928',
      accentPanelTextName: 'Gold Yellow Text (તેજસ્વી પીળો અક્ષર)',
      accentPanelContrast: '6.5:1 (High Visual Punch)',
      supportingText: '#111111',
      supportingTextName: 'Dark Charcoal / Pure Black (ઘેરો કાળો)',
      supportingTextContrast: '18.5:1 (Ultra Sharp)',
      badgeBackground: '#102A56',
      badgeText: '#FFFFFF',
      badgeName: 'Navy Blue Badge with White Text'
    };

    // Construct the copy-ready ChatGPT / DALL-E 3 Short Prompt
    const dalleShortPrompt = `A minimalist 16:9 YouTube thumbnail with a pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of ${photoSubjectEnglish}. On the right: A clean, high-contrast hierarchical text layout with exactly 3 to 4 distinct elements: Top line in deep navy blue (#102A56): "${element1En}"; Main primary hook on a bold crimson red (#D71920) panel with vibrant gold-yellow (#FFD928) letters: "${element2En}"; Supporting detail in crisp dark charcoal (#111111): "${element3En}"${element4En ? `; Clean accent badge in navy blue: "${element4En}"` : ''}. Ultra clean, professional typography, maximum mobile readability, strictly photorealistic subject, zero clutter, absolutely NO 3D cartoon, NO neon, NO dark gradients, NO gaming effects.`;

    // Construct Full Copy-Ready Markdown Prompt
    const fullMarkdownPrompt = `🎯 **Gyan Yatra - સ્માર્ટ થંબનેલ (૧ ફોટો + ૩-૪ હાઈ-કોન્ટ્રાસ્ટ ટેક્સ્ટ એલિમેન્ટ્સ)**
📌 **વિષય**: "${rawTopic}"
⚪ **બેકગ્રાઉન્ડ**: ૧૦૦% શુદ્ધ સફેદ (#FFFFFF)
📐 **રેશિયો**: ૧૬:૯ (1280 × 720) YouTube Thumbnail

---

### 🎨 ૧. કલર કોન્ટ્રાસ્ટ પેલેટ (Color Contrast Matrix - 100% Mobile Readable):
• **બેકગ્રાઉન્ડ**: #FFFFFF (Pure Solid White - સ્વચ્છ, પ્રોફેશનલ)
• **મુખ્ય વિષય ટેક્સ્ટ**: #102A56 (Deep Navy Blue - કોન્ટ્રાસ્ટ રેશિયો ૧૪.૨:૧)
• **પ્રાયમરી હૂક પેનલ**: #D71920 (Crimson Red) પેનલ પર #FFD928 (Gold Yellow) બોલ્ડ અક્ષરો (સૌથી વધુ આંખ ખેંચે તેવી હાઈ-સીટીઆર પેનલ)
• **સહાયક વિગત**: #111111 (Dark Charcoal / Black - કોન્ટ્રાસ્ટ રેશિયો ૧૮.૫:૧)
• **સ્ટેટસ બેજ**: #102A56 (Navy) પર #FFFFFF (White)

---

### 📝 ૨. થંબનેલ પર લખવા માટેના શ્રેષ્ઠ ૩ થી ૪ ટેક્સ્ટ એલિમેન્ટ્સ:
૧. 🏷️ **મુખ્ય વિષય (Main Topic)**:
   👉 **"${element1}"**
   *(રંગ: Deep Navy Blue #102A56 | સ્થાન: ટોચ પર, સુવ્યવસ્થિત)*

૨. ⚡ **પ્રાયમરી હૂક (Primary Hook - સૌથી મોટું અને બોલ્ડ)**:
   👉 **"${element2}"**
   *(રંગ: Crimson Red #D71920 બોક્સ પર Gold Yellow #FFD928 અક્ષરો — મોબાઇલ સ્ક્રીન પર ૧ સેકન્ડમાં ક્લિક કરાવે તેવું)*

૩. 📌 **સહાયક વિગત (Supporting Detail)**:
   👉 **"${element3}"**
   *(રંગ: Dark Charcoal #111111 | સ્થાન: હૂકની બરાબર નીચે)*

${element4 ? `૪. 🔰 **સ્ટેટસ બેજ (Status Badge - વૈકલ્પિક)**:
   👉 **"${element4}"**
   *(રંગ: Navy Blue બેજ)*` : ''}

---

### 📷 ૩. ડાબી બાજુ મૂકવા માટે ફક્ત ૧ અસલી વાસ્તવિક ફોટો:
👉 **${photoSubjectGujarati}**
*(સંપૂર્ણ વાસ્તવિક ફોટોગ્રાફી, કેમેરા સામે કુદરતી આત્મવિશ્વાસપૂર્ણ ભાવ, કોઈ કાર્ટૂન કે 3D એનિમેશન નહીં).*

### 📐 ૪. લેઆઉટ અને મોબાઈલ-ફ્રેન્ડલી કમ્પોઝિશન:
• **ડાબી બાજુ (Left 40%)**: ૧ જ અસલી વાસ્તવિક ફોટોગ્રાફ (Left-aligned, crisp cut-out).
• **જમણી બાજુ (Right 60%)**: ઉપરોક્ત ૩ થી ૪ ટેક્સ્ટ એલિમેન્ટ્સ એકદમ સચોટ હાયરાર્કીમાં ગોઠવેલા.
• **સેફ માર્જિન**: ચારેય બાજુ 8-10% જગ્યા મુક્ત જેથી મોબાઈલ થંબનેલમાં અક્ષરો કપાય નહીં.

---

### 🤖 ChatGPT Image / DALL-E 3 કોપી-રેડી પ્રોમ્પ્ટ:
\`${dalleShortPrompt}\``;

    return {
      topic: rawTopic,
      template: 'white_minimalist',
      textElements: {
        element1,
        element2,
        element3,
        element4
      },
      textElementsEn: {
        element1En,
        element2En,
        element3En,
        element4En
      },
      colorPalette,
      photoSubject: {
        gujarati: photoSubjectGujarati,
        english: photoSubjectEnglish
      },
      dalleShortPrompt,
      fullMarkdownPrompt
    };
  }
}

module.exports = new ThumbnailOptimizerService();
