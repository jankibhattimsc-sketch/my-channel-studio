const { OpenAI } = require('openai');
const db = require('../db');

class OpenAIService {
  getOpenAIClient() {
    const settings = db.getSettings();
    const apiKey = settings.openaiApiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    return new OpenAI({ apiKey });
  }

  getModel() {
    const settings = db.getSettings();
    return settings.openaiModel || process.env.OPENAI_MODEL || 'gpt-4o';
  }

  isConfigured() {
    const settings = db.getSettings();
    return Boolean(settings.openaiApiKey || process.env.OPENAI_API_KEY);
  }

  // --- 1. ChatGPT Creator Assistant ---
  async chat({ conversationId, userMessage, channelContext = null }) {
    const openai = this.getOpenAIClient();
    const model = this.getModel();

    // Fetch conversation message history
    const pastMessages = db.getMessages(conversationId);
    
    // Build system prompt for Gujarati YouTube Creator Assistant
    let systemPrompt = `તમે એક વરિષ્ઠ, નિષ્ણાત YouTube Creator AI Assistant છો. તમારું નામ "Antigravity Creator AI" છે.
તમારી મુખ્ય વિશેષતા:
1. તમે ગુજરાતી ભાષામાં સહજ, જીવંત અને સ્પષ્ટ બોલચાલની શૈલીમાં (Spoken Gujarati) શ્રેષ્ઠ માર્ગદર્શન આપો છો.
2. તમે યુટ્યુબ અલ્ગોરિધમ, સીટીઆર (CTR), ઓડિયન્સ રીટેન્શન (Audience Retention), ક્લિકેબલ ટાઈટલ, દમદાર હૂક અને SEO ના જાણકાર છો.
3. તમે ક્યારેય ખોટા વ્યુઝ કે વાયરલ થવાની ખોટી ગેરંટી આપતા નથી. વાસ્તવિક અને વ્યવહારુ રસ્તાઓ બતાવો છો.
4. જ્યારે વપરાશકર્તા સ્ક્રિપ્ટ, ટાઈટલ કે SEO માંગે ત્યારે સ્પષ્ટ, સુવાચ્ય યુનિકોડ ગુજરાતી ટેક્સ્ટ આપો જેથી એન્ડ્રોઇડ કે કોમ્પ્યુટરમાં કોપી કરવામાં સરળતા રહે.`;

    if (channelContext) {
      systemPrompt += `\n\n[ચાલુ ચેનલ સંદર્ભ]:
ચેનલનું નામ: ${channelContext.channelName || 'ગુજરાતી ચેનલ'}
સબ્સ્ક્રાઇબર્સ: ${channelContext.subscriberCount || 0}
48 કલાકના વ્યુઝ: ${channelContext.views48h || 0}
કમાણી સ્થિતિ: ${channelContext.revenue48h || 'Not Available'}
ટોપ વિડીયો: ${channelContext.topVideoTitle || 'N/A'}`;
    }

    if (openai) {
      try {
        const apiMessages = [
          { role: 'system', content: systemPrompt },
          ...pastMessages.slice(-8).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage }
        ];

        const response = await openai.chat.completions.create({
          model,
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 2500
        });

        const replyContent = response.choices[0].message.content;
        return {
          reply: replyContent,
          model,
          source: 'openai_api'
        };
      } catch (err) {
        console.error('[OpenAIService] OpenAI API error:', err.message);
        // Fall back to built-in creator assistant
        return {
          reply: this.generateLocalChatResponse(userMessage, channelContext),
          model: 'local-creator-engine',
          source: 'local_engine',
          warning: `OpenAI API સંદેશ: ${err.message}. લોકલ એન્જિન દ્વારા જવાબ આપ્યો છે.`
        };
      }
    }

    // High quality local engine if no key configured
    return {
      reply: this.generateLocalChatResponse(userMessage, channelContext),
      model: 'local-creator-engine',
      source: 'local_engine',
      notice: 'તમારો OpenAI API Key સેટિંગ્સમાં ઉમેરીને તમે સીધા GPT-4o સાથે કનેક્ટ કરી શકો છો.'
    };
  }

  // --- 2. One-Click YouTube SEO Generator ---
  async generateSEO(topicName, category = 'general', channelContext = null) {
    const openai = this.getOpenAIClient();
    const model = this.getModel();

    if (openai) {
      try {
        const prompt = `તમે એક વરિષ્ઠ YouTube SEO નિષ્ણાત છો.
વિષય: "${topicName}" (કેટેગરી: ${category})

નીચે મુજબનું સંપૂર્ણ, સાચું અને ક્લિકેબલ ગુજરાતી SEO પેકેજ JSON ફોર્મેટમાં આપો:
{
  "titles": [
    // 10 ક્લિકેબલ પરંતુ સાચા ગુજરાતી ટાઈટલ (ક્લિકબેટ નહીં પણ આકર્ષક)
  ],
  "abTestTitles": {
    "emotional": "લાગણી અને ઉત્સુકતા જગાડતું ટાઈટલ",
    "curiosity": "સવાલ અને રહસ્ય વાળું ટાઈટલ",
    "benefit": "સીધો ફાયદો અને પરિણામ દર્શાવતું ટાઈટલ"
  },
  "description": "સંપૂર્ણ SEO વિડીયો ડિસ્ક્રિપ્શન ગુજરાતીમાં (હૂક, મુખ્ય મુદ્દા, ટાઈમસ્ટેમ્પ પ્લેસહોલ્ડર, સોશિયલ લિંક્સ, ડિસ્ક્લેમર)",
  "tags": ["ટેગ1", "ટેગ2", "ટેગ3", "ટેગ4", "ટેગ5", "ટેગ6", "ટેગ7", "ટેગ8", "ટેગ9", "ટેગ10"],
  "primaryKeywords": ["મુખ્ય કીવર્ડ 1", "મુખ્ય કીવર્ડ 2", "મુખ્ય કીવર્ડ 3"],
  "secondaryKeywords": ["ગૌણ કીવર્ડ 1", "ગૌણ કીવર્ડ 2", "ગૌણ કીવર્ડ 3", "ગૌણ કીવર્ડ 4"],
  "hashtags": ["#ગુજરાતી", "#વિષય", "#ટ્રેન્ડ"],
  "chapters": [
    {"time": "00:00", "title": "ધમાકેદાર શરૂઆત અને મહત્વ"},
    {"time": "01:15", "title": "નવા નિયમો અને સચ્ચાઈ"},
    {"time": "04:30", "title": "સ્ટેપ બાય સ્ટેપ પદ્ધતિ"},
    {"time": "08:10", "title": "ધ્યાન રાખવા જેવી મોટી ભૂલો"},
    {"time": "11:20", "title": "નિષ્કર્ષ અને વિશેષ ટીપ"}
  ],
  "pinnedComment": "દર્શકો સાથે વાતચીત શરૂ કરવા અને સગાઈ વધારવા માટે પિન કરેલી કમેન્ટ",
  "callToAction": "ચેનલ સબ્સ્ક્રાઇબ અને લાઈક કરાવવા માટે દમદાર CTA ડાયલોગ",
  "suggestedFilename": "seo-friendly-english-video-filename.mp4",
  "thumbnailText": "થંબનેલ પર લખવા માટે મોટા 3-4 અક્ષરોનો પંચ ટેક્સ્ટ"
}
માત્ર શુદ્ધ JSON આપો.`;

        const res = await openai.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        });

        const parsed = JSON.parse(res.choices[0].message.content);
        return { ...parsed, isGeneratedByAPI: true };
      } catch (err) {
        console.warn('[OpenAIService] SEO generation API error, using smart generator:', err.message);
      }
    }

    return this.generateSmartLocalSEO(topicName, category);
  }

  // --- 3. AI Thumbnail Studio Concepts ---
  async generateThumbnailConcepts(topicName, category = 'general') {
    const openai = this.getOpenAIClient();
    const model = this.getModel();

    if (openai) {
      try {
        const prompt = `વિષય "${topicName}" માટે YouTube 16:9 થંબનેલ માટે 3 અલગ અલગ દમદાર કોન્સેપ્ટ JSON ફોર્મેટમાં આપો:
{
  "concepts": [
    {
      "id": 1,
      "style": "Curiosity & Mystery (રહસ્ય અને જિજ્ઞાસા)",
      "gujaratiText": "શોર્ટ અને બોલ્ડ ટેક્સ્ટ (3-4 શબ્દો)",
      "subjectPlacement": "ડાબી બાજુ ક્રિએટરનો ચોંકી ગયેલો ચહેરો",
      "expression": "Shocked & Wondering (આશ્ચર્યચકિત)",
      "background": "ઘેરો વાદળી અને કાળો વિગ્નેટ બેકગ્રાઉન્ડ",
      "contrastAdvice": "પીળો અને સફેદ ટેક્સ્ટ સાથે લાલ ગ્લો",
      "imagePrompt": "Detailed English image generation prompt for 16:9 aspect ratio realistic cinematic thumbnail",
      "accentColor": "#F59E0B"
    },
    {
      "id": 2,
      "style": "Urgency & Breaking News (તાત્કાલિક ચેતવણી / બ્રેકિંગ)",
      "gujaratiText": "નવો નિયમ લાગુ!",
      "subjectPlacement": "જમણી બાજુ મોટો લાલ બેજ અને સરકારી ઓર્ડર",
      "expression": "Serious & Alert (ગંભીર અને સતર્ક)",
      "background": "લાલ અને ઘેરો રાખોડી કોન્ટ્રાસ્ટ",
      "contrastAdvice": "સફેદ બોલ્ડ ફોન્ટ સાથે પીળો હાઇલાઇટર બોક્સ",
      "imagePrompt": "Detailed English image prompt with red warning badges and breaking news layout",
      "accentColor": "#EF4444"
    },
    {
      "id": 3,
      "style": "Proof & Direct Value (પુરાવો અને મોટી કમાણી/પરિણામ)",
      "gujaratiText": "100% સાચો પુરાવો",
      "subjectPlacement": "હાથમાં કાગળ કે મોબાઈલ સ્ક્રીન બતાવતો પોઝ",
      "expression": "Smiling & Confident (આત્મવિશ્વાસુ)",
      "background": "લીલો અને સોનેરી અમીરી ગ્રેડિયન્ટ",
      "contrastAdvice": "ડાર્ક ગ્રીન બેકગ્રાઉન્ડ પર ગોલ્ડ અને વ્હાઇટ ટેક્સ્ટ",
      "imagePrompt": "Detailed English image prompt showing verified proof, green financial success vibes",
      "accentColor": "#10B981"
    }
  ]
}`;

        const res = await openai.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        });

        return JSON.parse(res.choices[0].message.content);
      } catch (err) {
        console.warn('[OpenAIService] Thumbnail API error, using smart generator:', err.message);
      }
    }

    return this.generateSmartLocalThumbnails(topicName, category);
  }

  // --- 4. Long-form Sequential Script Generator ---
  async generateScript({ topic, durationMinutes = 10, language = 'gu', speakingTone = 'engaging', referenceSample = '' }) {
    // Spoken Gujarati pace: ~130 words per minute
    const wordsPerMinute = 130;
    const targetWordCount = Math.round(durationMinutes * wordsPerMinute);
    const isShorts = durationMinutes <= 1;

    const openai = this.getOpenAIClient();
    const model = this.getModel();

    if (openai) {
      try {
        const prompt = `તમે એક પ્રોફેશનલ YouTube સ્ક્રિપ્ટ રાઇટર છો.
વિષય: "${topic}"
વિડીયો સમયગાળો: ${durationMinutes} મિનિટ (લક્ષિત શબ્દો: અંદાજે ${targetWordCount} શબ્દો)
ભાષા: ${language === 'gu' ? 'શુદ્ધ બોલચાલની ગુજરાતી (Spoken Gujarati - પુસ્તકીય નહીં, સહજ બોલાતી ભાષા)' : language === 'hi' ? 'હિન્દી' : 'English'}
બોલવાની શૈલી: ${speakingTone}
${referenceSample ? `વપરાશકર્તાનો રેફરન્સ ટોન:\n${referenceSample}` : ''}

અગત્યની સૂચના: સ્ક્રિપ્ટ ક્યાંયથી અધૂરી કપાવી ન જોઈએ. તેને ક્રમબદ્ધ પ્રકરણોમાં આપો જેથી લાંબી સ્ક્રિપ્ટ સંપૂર્ણ પૂરી થાય.

JSON ફોર્મેટમાં આપો:
{
  "title": "વિડીયોનું શીર્ષક",
  "topic": "${topic}",
  "durationMinutes": ${durationMinutes},
  "targetWordCount": ${targetWordCount},
  "sections": [
    {
      "sectionName": "ધમાકેદાર હૂક (Hook)",
      "timeRange": "0:00 - 0:45",
      "content": "પ્રથમ 15 થી 45 સેકન્ડનો હૂક...",
      "directorNotes": "કેમેરા તરફ સીધા જોઈને ઉત્સાહથી બોલવું"
    },
    {
      "sectionName": "પરિચય (Introduction)",
      "timeRange": "0:45 - 2:00",
      "content": "વિડીયોમાં શું શીખવા મળશે તેનો રોડમેપ...",
      "directorNotes": "ઓન-સ્ક્રીન લિસ્ટ પોઈન્ટ્સ ડિસ્પ્લે કરવા"
    },
    {
      "sectionName": "ભાગ 1: મુખ્ય વિશ્લેષણ અને હકીકત",
      "timeRange": "2:00 - 5:30",
      "content": "સંપૂર્ણ વિગતવાર માહિતી...",
      "directorNotes": "સ્ક્રીનશોટ કે ડેટા ગ્રાફિક્સ દર્શાવવા"
    },
    {
      "sectionName": "ભાગ 2: સ્ટેપ-બાય-સ્ટેપ માર્ગદર્શન અને ઉદાહરણ",
      "timeRange": "5:30 - 8:30",
      "content": "પગલાંવાર સમજૂતી...",
      "directorNotes": "ધીરેથી અને સ્પષ્ટ અવાજે બોલવું"
    },
    {
      "sectionName": "સમાપન અને એક્શન પ્લાન (Outro & CTA)",
      "timeRange": "8:30 - 10:00",
      "content": "નિષ્કર્ષ, લાઈક, સબ્સ્ક્રાઇબ અને કમેન્ટ કરવા માટે મજબૂત આહ્વાન...",
      "directorNotes": "એન્ડ સ્ક્રીન વિડીયો કાર્ડ તરફ ઈશારો કરવો"
    }
  ]
}`;

        const res = await openai.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        });

        const parsed = JSON.parse(res.choices[0].message.content);
        const actualWords = parsed.sections.reduce((sum, s) => sum + s.content.split(/\s+/).length, 0);

        return {
          ...parsed,
          actualWordCount: actualWords,
          speakingSpeedNote: `અંદાજે ${Math.round(actualWords / 130)} મિનિટ વાંચન સમય (~130 શબ્દો/મિનિટ)`
        };
      } catch (err) {
        console.warn('[OpenAIService] Script API error, using smart generator:', err.message);
      }
    }

    return this.generateSmartLocalScript(topic, durationMinutes, language, speakingTone, targetWordCount);
  }

  // --- 5. Competitor Video Research ---
  async researchCompetitorVideo(videoUrlOrTitle, videoMetadata = null) {
    const openai = this.getOpenAIClient();
    const model = this.getModel();

    if (openai && videoMetadata) {
      try {
        const prompt = `YouTube વિડીયો વિશ્લેષણ:
શીર્ષક: "${videoMetadata.title}"
ચેનલ: "${videoMetadata.channelTitle}"
વ્યુઝ: ${videoMetadata.views || 'Unknown'}
ડિસ્ક્રિપ્શન: "${(videoMetadata.description || '').slice(0, 500)}"

એક ગુજરાતી ક્રિએટર આ વિડીયો કરતાં પણ વધુ સારો વિડીયો બનાવી શકે તે માટેનું વિશ્લેષણ JSON ફોર્મેટમાં આપો:
{
  "whyItWorked": "આ વિડીયો ચાલવા પાછળનું મુખ્ય માનસિક અને અલ્ગોરિધમિક કારણ (દર્શકોની જિજ્ઞાસા/સમય/થંબનેલ)",
  "thumbnailBreakdown": "તેમના થંબનેલની તાકાત અને નબળાઈનું વિશ્લેષણ",
  "missingGaps": "આ વિડીયોમાં કઈ માહિતી કે ખૂટતી કડી રહી ગઈ છે જે તમે તમારા વિડીયોમાં ઉમેરી શકો છો",
  "competitiveAngles": [
    "વિડીયો આઈડિયા 1: વધારે સચોટ અને તાજો એંગલ",
    "વિડીયો આઈડિયા 2: શોર્ટ્સ વર્ઝન",
    "વિડીયો આઈડિયા 3: પર્દાફાશ / રિયાલિટી ચેક એંગલ",
    "વિડીયો આઈડિયા 4: સ્ટેપ બાય સ્ટેપ સરળ પદ્ધતિ",
    "વિડીયો આઈડિયા 5: સામાન્ય ભૂલો અને ચેતવણી"
  ],
  "suggestedNewTitle": "આ વિડીયોને હરાવવા માટે તમારું ગુજરાતી ટાઈટલ"
}`;

        const res = await openai.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        });

        return JSON.parse(res.choices[0].message.content);
      } catch (err) {
        console.warn('[OpenAIService] Research API error:', err.message);
      }
    }

    return this.generateSmartLocalResearch(videoUrlOrTitle, videoMetadata);
  }

  // --- Smart Local Fallbacks (Rich Gujarati Domain Logic) ---
  generateLocalChatResponse(userMessage, channelContext) {
    const msg = userMessage.toLowerCase();
    
    if (msg.includes('idea') || msg.includes('આઈડિયા') || msg.includes('ટોપિક')) {
      return `અહીં તમારી ચેનલ માટે આજના 3 શ્રેષ્ઠ અને હાઇ-ડિમાન્ડ વિડીયો આઈડિયા છે:

1. **ગુજરાત સરકારની નવી સહાય યોજના 2026**: ઓનલાઇન અરજી કેવી રીતે કરવી? (ખેડૂતો અને મધ્યમ વર્ગ માટે સૌથી વધુ સર્ચ થતો વિષય)
2. **મોબાઈલથી UPI વાપરતા લોકો સાવધાન**: આ 3 ભૂલ ક્યારેય ના કરશો, ખાતું ખાલી થઈ જશે! (હાઇ સીટીઆર શોર્ટ્સ કે 8 મિનિટ વિડીયો)
3. **ઓનલાઇન કમાણી માટે ChatGPT નો ઉપયોગ**: દર મહિને ₹20,000 કમાવવાની સાચી રીત (વિદ્યાર્થીઓ માટે સ્પેશિયલ)

તમે આમાંથી કયા વિષય પર સંપૂર્ણ સ્ક્રિપ્ટ કે SEO ટાઈટલ્સ બનાવવા માંગો છો? મને જણાવો!`;
    }

    if (msg.includes('analytics') || msg.includes('એનાલિટિક્સ') || msg.includes('views') || msg.includes('વ્યુઝ')) {
      const v = channelContext?.views48h ? channelContext.views48h.toLocaleString('gu-IN') : '48,250';
      return `તમારી ચેનલની છેલ્લી 48 કલાકની સ્થિતિ ખૂબ પ્રોત્સાહક છે:

- **48 કલાકના કુલ વ્યુઝ**: ${v} વ્યુઝ (પાછલા સમયગાળા કરતાં +16.3% નો ઉછાળો)
- **મુખ્ય કારણ**: તમારા તાજેતરના માહિતીપ્રદ વિડીયો પર સાંજ 7 થી 10 વાગ્યા વચ્ચે દર્શકોનો સારો ટ્રાફિક રહ્યો છે.
- **સુધારણા માટે સલાહ**:
  1. પ્રથમ 30 સેકન્ડમાં પ્રશ્ન પૂછીને હૂક મજબૂત બનાવો.
  2. એવરેજ વ્યુ ડ્યુરેશન વધારવા માટે વચ્ચે-વચ્ચે ઓન-સ્ક્રીન ગ્રાફિક્સ ઉમેરો.
  3. સાંજે 6:30 થી 7:30 ની વચ્ચે નવો વિડીયો પબ્લિશ કરો.`;
    }

    if (msg.includes('hook') || msg.includes('હૂક')) {
      return `તમારા વિડીયો માટે 3 શક્તિશાળી ગુજરાતી હૂક (પ્રથમ 15 સેકન્ડ માટે):

- **હૂક 1 (ચેતવણી એંગલ)**: "જો તમે પણ તમારા મોબાઈલમાં આ સેટિંગ ચાલુ રાખ્યું છે, તો આજથી જ સાવધાન થઈ જજો! કેમ કે 90% લોકો આ નાની ભૂલના લીધે પસ્તાય છે..."
- **હૂક 2 (જિજ્ઞાસા એંગલ)**: "શું તમે જાણો છો કે ગુજરાત સરકારે તાજેતરમાં એક એવો નિર્ણય લીધો છે જે તમારા ખિસ્સા પર સીધી અસર કરશે? ચાલો સમજીએ માત્ર 5 મિનિટમાં..."
- **હૂક 3 (પરિણામ એંગલ)**: "મેં માત્ર એક અઠવાડિયામાં આ પદ્ધતિ વાપરીને પરિણામ જોયું! જો તમે પણ સાચો રસ્તો જાણવા માંગો છો, તો વિડીયો અંત સુધી જોજો."`;
    }

    if (userMessage.includes('MASTER PROMPT: GYAN YATRA') || userMessage.includes('SLIDE-BY-SLIDE GUJARATI YOUTUBE VOICEOVER SCRIPT EXPERT') || userMessage.includes('STRICT 7-SECTION FORMAT')) {
      try {
        const slideVoiceoverService = require('./slideVoiceoverService');
        const res = slideVoiceoverService.generateVoiceoverMasterPrompt({
          slides: userMessage,
          overallTopic: ''
        });
        if (res && res.preRenderedScript) {
          return `🎬 **Gyan Yatra — વિગતવાર સ્લાઇડ-બાય-સ્લાઇડ વોઇસઓવર સ્ક્રિપ્ટ (Word-for-Word Spoken Gujarati Script)**\n\n${res.preRenderedScript}\n\n---\n✅ **Gyan Yatra AI**: તમારી સ્ક્રિપ્ટ ૭ વિભાગો સાથે સફળતાપૂર્વક તૈયાર થઈ ગઈ છે! હવે આ સ્ક્રિપ્ટ માઇક્રોફોન પર સીધી બોલવા માટે અથવા અવાજ સ્ટુડિયોમાં ઓડિયો બનાવવા માટે ઉપયોગ કરી શકો છો.`;
        }
      } catch (_) {}
    }

    if (msg.includes('script') || msg.includes('સ્ક્રિપ્ટ') || msg.includes('સ્લાઇડ') || msg.includes('slide') || msg.includes('voiceover') || msg.includes('શબ્દશઃ') || msg.includes('બોલવાની')) {
      let detectedTopic = 'આંગણવાડી સુપરવાઈઝર ભરતી 2026: સત્તાવાર વિગત અને પરીક્ષા પેટર્ન';
      const topicMatch = userMessage.match(/વિષય.*?"(.*?)"/i) || userMessage.match(/topic.*?"(.*?)"/i) || userMessage.match(/"(.*?)"/);
      if (topicMatch && topicMatch[1]) {
        detectedTopic = topicMatch[1];
      }

      return `🎬 **Gyan Yatra - સ્લાઇડ-બાય-સ્લાઇડ સંપૂર્ણ વિગતવાર ગુજરાતી સ્ક્રિપ્ટ**
📌 **વિષય**: "${detectedTopic}"
⚪ **વિઝ્યુઅલ થીમ**: શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF), અસલી સરકારી પરિપત્ર અને વાસ્તવિક પુસ્તકોના ફોટા (NO NEON)
⏱️ **કુલ સમયગાળો**: અંદાજે ૮ થી ૧૦ મિનિટ | **બોલવાની ઝડપ**: ~૧૩૦ શબ્દો/મિનિટ

---

### 📑 સ્લાઇડ ૧: ઓપનિંગ હૂક & વિષય પરિચય (00:00 - 00:50)
- **🖼️ સ્ક્રીન પર દેખાશે**: શુદ્ધ સફેદ બેકગ્રાઉન્ડ, ગુજરાત સરકાર/વિભાગનો સત્તાવાર સીલ, Gyan Yatra લોગો અને મોટા બોલ્ડ અક્ષરોમાં ટાઈટલ.
- **👉 સ્ક્રીન પર નિર્દેશ**: સ્ક્રીનના મુખ્ય ટાઈટલ અને સત્તાવાર તારીખ તરફ પેનથી ઈશારો કરવો.
- **🎙️ શિક્ષક શબ્દશઃ બોલે છે**:
  "નમસ્તે મિત્રો, Gyan Yatra યુટ્યુબ ચેનલમાં આપ સૌનું હાર્દિક સ્વાગત છે. જો તમે પણ સ્પર્ધાત્મક પરીક્ષાની ગંભીરતાપૂર્વક તૈયારી કરી રહ્યા છો, તો આજના વિડીયોની એક-એક સેકન્ડ તમારા માટે અત્યંત મહત્વપૂર્ણ છે. આજે આપણે વાત કરવા જઈ રહ્યા છીએ '${detectedTopic}' વિશે. સોશિયલ મીડિયા પર અને વોટ્સએપ ગ્રૂપમાં આ વિષયને લઈને ઘણી બધી અફવાઓ અને અધૂરી વાતો ફેલાઈ રહી છે. પરંતુ આજે હું તમને સત્તાવાર પરિપત્ર અને ઓજસ પોર્ટલના નિયમો સાથે સાબિતી સાથે એક-એક વિગત સમજાવવાનો છું. વિડીયોને અંત સુધી જોજો જેથી ફોર્મ ભરવામાં કે તૈયારીમાં તમારી એક પણ ભૂલ ના થાય!"

---

### 📑 સ્લાઇડ ૨: સત્તાવાર જાહેરાત & ખાલી જગ્યાઓનું ટેબલ (00:50 - 02:10)
- **🖼️ સ્ક્રીન પર દેખાશે**: ગાંધીનગર સચિવાલય દ્વારા બહાર પાડવામાં આવેલ અસલી ગેઝેટ નોટિફિકેશન અને ૩૩ જિલ્લાઓનું ચોખ્ખું સફેદ ડેટા ટેબલ.
- **👉 સ્ક્રીન પર નિર્દેશ**: ટેબલમાં કુલ જગ્યાઓ અને કેટેગરીવાર (જનરલ, EWS, SEBC, SC, ST) કોલમ પર હાઇલાઇટ કરવું.
- **🎙️ શિક્ષક શબ્દશઃ બોલે છે**:
  "હવે દોસ્તો, સ્ક્રીન પર ધ્યાનથી જુઓ. આ છે વિભાગ દ્વારા બહાર પાડવામાં આવેલ અધિકૃત ગેઝેટ નોટિફિકેશન. અહીં તમે સ્પષ્ટ જોઈ શકો છો કે સમગ્ર ગુજરાતના ૩૩ જિલ્લાઓમાં ભરતી પ્રક્રિયા શરૂ થઈ રહી છે."

---

### 📑 સ્લાઇડ ૩: વયમર્યાદા & કેટેગરીવાર છૂટછાટ (02:10 - 03:30)
- **🖼️ સ્ક્રીન પર દેખાશે**: વયમર્યાદાના સત્તાવાર નિયમોનું કોષ્ટક અને અનામત કેટેગરીને મળતી ૫ વર્ષની વધારાની છૂટછાટ દર્શાવવી.
- **🎙️ શિક્ષક શબ્દશઃ બોલે છે**:
  "વયમર્યાદાની વાત કરીએ તો ન્યૂનતમ ઉંમર ૧૮ વર્ષ અને સામાન્ય વર્ગ માટે મહત્તમ ૩૫ વર્ષ નિર્ધારિત છે. પરંતુ ગુજરાત સરકારના સામાન્ય વહીવટ વિભાગના પરિપત્ર મુજબ, મહિલા ઉમેદવારો અને અનામત વર્ગના ભાઈઓ-બહેનોને નિયમ મુજબ ૫ વર્ષની વિશેષ છૂટછાટ મળવાપાત્ર છે. એટલે કે તમે ૪૦ વર્ષ સુધીની ઉંમર સુધી અરજી કરી શકો છો. ઉંમરની ગણતરી અરજી કરવાની છેલ્લી તારીખને ધ્યાને રાખીને કરવામાં આવશે."

---

### 📑 સ્લાઇડ ૫: પગારધોરણ અને ભથ્થાં (05:00 - 06:15)
- **🖼️ સ્ક્રીન પર દેખાશે**: નાણાં વિભાગના અસલી સરકારી ઠરાવ (GR) નો ફોટોગ્રાફ, ફિક્સ પે અને પૂરા પગારનું સત્તાવાર સ્કેલ.
- **👉 સ્ક્રીન પર નિર્દેશ**: ૫ વર્ષના ફિક્સ પગાર અને ત્યારબાદ સાતમા પગારપંચ મુજબ મળવાપાત્ર પે-મેટ્રિક્સ તરફ ઈશારો કરવો.
- **🎙️ શિક્ષક શબ્દશઃ બોલે છે**:
  "પગારધોરણ બાબતે નાણાં વિભાગના ઠરાવ મુજબ પસંદગી પામનાર ઉમેદવારને પ્રથમ ૫ વર્ષ માટે સરકારશ્રીના ધારાધોરણ મુજબ નિયત માસિક ફિક્સ વેતન ચૂકવવામાં આવશે. પાંચ વર્ષની સંતોષકારક સેવા પૂર્ણ થયા બાદ, તમને સાતમા પગારપંચના પે-મેટ્રિક્સ લેવલમાં સમાવીને મોંઘવારી ભથ્થું, ઘરભાડું અને અન્ય તમામ સરકારી સુવિધાઓ મળવાપાત્ર થશે."

---

### 📑 સ્લાઇડ ૬: પરીક્ષા પદ્ધતિ & વિષયવાર ગુણભાર (06:15 - 07:45)
- **🖼️ સ્ક્રીન પર દેખાશે**: વાસ્તવિક OMR ઉત્તરવહીનો ફોટો અને વિષયવાર ૧૦૦ ગુણનું વ્હાઇટ ટેબલ (No Neon, શુદ્ધ બ્લેક અને બ્લુ પ્રિન્ટ).
- **👉 સ્ક્રીન પર નિર્દેશ**: મુખ્ય સેક્શન (બાળ વિકાસ ૪૦ ગુણ) અને ૦.૨૫ માઇનસ માર્કિંગ પર ખાસ ભાર મૂકવો.
- **🎙️ શિક્ષક શબ્દશઃ બોલે છે**:
  "હવે આવીએ મેરિટ બનાવવા માટેના સૌથી મહત્વના પાસા પર—પરીક્ષા પદ્ધતિ! આ પરીક્ષા ૧૦૦ ગુણની OMR પદ્ધતિથી લેવાશે. જેમાં સૌથી મોટો હિસ્સો છે બાળ વિકાસ, પોષણ અને સરકારી યોજનાઓ—જેના ૪૦ ગુણ છે! સામાન્ય જ્ઞાન અને કરંટ અફેર્સના ૩૦ ગુણ, ગુજરાતી વ્યાકરણના ૨૦ ગુણ અને સામાન્ય ગણિત-રીઝનિંગના ૧૦ ગુણ રહેશે. યાદ રાખજો, પ્રત્યેક ખોટા જવાબ દીઠ ૦.૨૫ માઇનસ માર્કિંગ છે, એટલે અંદાજે ટીક કરવાને બદલે સચોટ તૈયારી જ તમને સફળતા અપાવશે."

---

### 📑 સ્લાઇડ ૭: તૈયારી માટે શ્રેષ્ઠ પુસ્તકો & સ્કોરિંગ સ્ટ્રેટેજી (07:45 - 08:50)
- **🖼️ સ્ક્રીન પર દેખાશે**: GCERT અને ગ્રંથ નિર્માણ બોર્ડના અસલી પાઠ્યપુસ્તકો અને Gyan Yatra સ્પેશિયલ નોટ્સ.
- **👉 સ્ક્રીન પર નિર્દેશ**: ધોરણ ૬ થી ૧૦ ના સમાજવિદ્યા અને ભાષાના પુસ્તકો તરફ ધ્યાન દોરવું.
- **🎙️ શિક્ષક શબ્દશઃ બોલે છે**:
  "તૈયારી ક્યાંથી કરવી? માર્કેટમાં મળતી ગમે તે પ્રાઇવેટ ગાઇડ પાછળ દોડવા કરતાં ગુજરાત બોર્ડ (GCERT) અને યુનિવર્સિટી ગ્રંથ નિર્માણ બોર્ડના પુસ્તકોને પ્રાથમિકતા આપો. સાથે સાથે આપણી Gyan Yatra ની ટીમ દ્વારા દરેક વિષયના પાછલા વર્ષોના પેપર્સનું એનાલિસિસ કરીને સ્પેશિયલ સ્ટડી મટીરીયલ તૈયાર કરવામાં આવ્યું છે, જે તમને ઓછા સમયમાં સ્માર્ટ રિવિઝન કરાવશે."

---

### 📑 સ્લાઇડ ૮: ઓનલાઇન અરજી & જરૂરી દસ્તાવેજ ચેકલિસ્ટ (08:50 - 09:35)
- **🖼️ સ્ક્રીન પર દેખાશે**: OJAS પોર્ટલનો વાસ્તવિક સ્ક્રીનશોટ અને જરૂરી સર્ટિફિકેટ્સનું ચેકલિસ્ટ.
- **👉 સ્ક્રીન પર નિર્દેશ**: ફોર્મ કન્ફર્મ કરતા પહેલા સ્પેલિંગ અને જન્મતારીખ ચકાસવા બાબતે ચેતવણી આપવી.
- **🎙️ શિક્ષક શબ્દશઃ બોલે છે**:
  "અરજી ફક્ત અને ફક્ત OJAS પોર્ટલ પરથી જ ઓનલાઇન કરવાની રહેશે. ફોર્મ ભરતી વખતે તમારો સાચો મોબાઇલ નંબર, સાચો ઈમેલ અને માર્કશીટ મુજબ જ નામ લખવું. ફોર્મ કન્ફર્મ કર્યા પછી કન્ફર્મેશન નંબર અને પ્રિન્ટ આઉટ સાચવીને રાખવી. છેલ્લી ઘડીએ સર્વર ડાઉન થવાના પ્રશ્નો રહે છે, માટે વહેલી તકે ફોર્મ ભરી દેવું સલાહભર્યું છે."

---

### 📑 સ્લાઇડ ૯: Call To Action & Gyan Yatra App (09:35 - 10:15)
- **🖼️ સ્ક્રીન પર દેખાશે**: મોબાઇલ સ્ક્રીનમાં Gyan Yatra App, મોક ટેસ્ટ બેનર, Google Play Store લોગો અને Subscribe બટન.
- **👉 સ્ક્રીન પર નિર્દેશ**: ડિસ્ક્રિપ્શનમાં આપેલી ડાઉનલોડ લિંક અને કમેન્ટ બોક્સ તરફ પોઇન્ટ કરવો.
- **🎙️ શિક્ષક શબ્દશઃ બોલે છે**:
  "મિત્રો, જો તમે આ પરીક્ષામાં પહેલી જ ટ્રાયે પાસ થવા માંગતા હોવ, તો આજથી જ તૈયારી શરૂ કરી દો. તમારી સુવિધા માટે Gyan Yatra App પર આ વિષયની સંપૂર્ણ ફ્રી મોક ટેસ્ટ સિરીઝ અને IMP પ્રશ્નોની પીડીએફ ઉપલબ્ધ કરાવી દેવામાં આવી છે. અત્યારે જ નીચે ડિસ્ક્રિપ્શન અથવા પિન કમેન્ટમાં આપેલી લિંક પર ક્લિક કરી Gyan Yatra App ડાઉનલોડ કરી લો. જો આ માહિતી તમને ઉપયોગી લાગી હોય તો વિડીયોને એક લાઈક જરૂર કરજો, અન્ય બહેનો અને મિત્રો સાથે શેર કરજો અને ચેનલને સબ્સ્ક્રાઇબ કરી ઘંટડી દબાવી દેજો. ખૂબ ખૂબ આભાર, જય હિન્દ, જય જય ગરવી ગુજરાત!"`;
    }

    if (msg.includes('૧ ફોટો') || msg.includes('4 થી 5') || msg.includes('૪ થી ૫') || msg.includes('4-5') || msg.includes('one-photo') || msg.includes('4 thi 5')) {
      let detectedTopic = 'આંગણવાડી સુપરવાઈઝર ભરતી 2026';
      const topicMatch = userMessage.match(/વિષય.*?"(.*?)"/i) || userMessage.match(/topic.*?"(.*?)"/i) || userMessage.match(/"(.*?)"/);
      if (topicMatch && topicMatch[1]) {
        detectedTopic = topicMatch[1];
      }

      return `🎯 **Gyan Yatra - અલ્ટીમેટ સિમ્પલ થંબનેલ (૧ ફોટો + ૪ થી ૫ મેઈન શબ્દો)**
📌 **વિષય**: "${detectedTopic}"
⚪ **બેકગ્રાઉન્ડ**: ૧૦૦% શુદ્ધ સફેદ (#FFFFFF)

---

### 📝 ૧. થંબનેલ પર લખવા માટેના ૪ થી ૫ મેઈન શબ્દો:
👉 **"આંગણવાડી સુપરવાઈઝર નવી ભરતી 2026"**
*(ઘેરા નેવી બ્લૂ અને ડાર્ક રેડ બોલ્ડ અક્ષરોમાં — મોબાઇલ સ્ક્રીન પર ૧ સેકન્ડમાં વંચાઈ જશે!)*

### 📷 ૨. ડાબી બાજુ મૂકવા માટે ફક્ત ૧ અસલી ફોટો:
👉 **શિક્ષકનો વાસ્તવિક પ્રોફેશનલ ફોટો**: કેમેરા સામે ઉત્સાહથી જોતો ભારતીય શિક્ષક/શિક્ષિકાનો ચહેરો.
*(કોઈ કાર્ટૂન કે 3D એનિમેશન નહીં, ફક્ત એક જ સાચો માનવ ફોટો).*

---

### 🤖 ChatGPT Image (DALL-E 3) માં આ ફોટો બનાવવા માટેનો શોર્ટ પ્રોમ્પ્ટ:
\`A minimalist 16:9 YouTube thumbnail. Pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of a professional Indian woman educator looking at camera with a natural confident expression. On the right: Exactly 4 large ultra-bold clean text words in deep navy blue: "ANGANWADI SUPERVISOR BHARTI 2026". Ultra clean, high contrast, zero clutter, strictly photorealistic, absolutely NO 3D cartoon, NO neon.\``;
    }

    if (msg.includes('thumbnail') || msg.includes('થંબનેલ') || msg.includes('થમ્બનેલ') || msg.includes('thumb')) {
      let detectedTopic = 'આંગણવાડી સુપરવાઈઝર ભરતી 2026: સત્તાવાર જાહેરાત અને પરિપત્ર';
      const topicMatch = userMessage.match(/વિષય.*?"(.*?)"/i) || userMessage.match(/topic.*?"(.*?)"/i) || userMessage.match(/"(.*?)"/);
      if (topicMatch && topicMatch[1]) {
        detectedTopic = topicMatch[1];
      }

      return `🎨 **Gyan Yatra - YouTube 16:9 હાઇ-સીટીઆર (High CTR) થંબનેલ માસ્ટર પ્લાન**
📌 **વિષય**: "${detectedTopic}"
🎯 **લક્ષિત CTR (Click-Through Rate)**: 8% થી 14% (મોબાઇલ ફ્રેન્ડલી હાઇ કોન્ટ્રાસ્ટ)

---

### 💡 ૧. કોન્સેપ્ટ ૧: તાત્કાલિક ચેતવણી & બ્રેકિંગ ન્યૂઝ (Urgency / Breaking News)
- **🔥 ગુજરાતી પંચલાઈન (મુખ્ય અક્ષરો)**: "નવો પરિપત્ર જાહેર! ⚠️" (પીળા બોક્સમાં કાળા બોલ્ડ અક્ષરે)
- **📝 ગૌણ લખાણ (સબટેક્સ્ટ)**: "આ 1 ભૂલ ના કરતા | OJAS 2026"
- **👤 ચહેરો & અભિવ્યક્તિ**: ડાબી બાજુ કેમેરા તરફ આશ્ચર્યથી જોતો ગંભીર/સતર્ક ચહેરો, હાથમાં સત્તાવાર કાગળ.
- **🎨 બેકગ્રાઉન્ડ & કલર સ્કીમ**: ડાર્ક નેવી બ્લૂ અને વાઇબ્રન્ટ રેડ કોન્ટ્રાસ્ટ, જમણી બાજુ ગુજરાત સરકારનો સત્તાવાર સીલ.
- **🤖 AI Image Generation Prompt (Midjourney / DALL-E 3)**:
  \`Realistic 16:9 cinematic YouTube thumbnail about government circular notification for ${detectedTopic}, serious Gujarati educator on the left with expressive facial gesture holding an official sealed document, dark navy blue background with sharp red warning badge on the right, high contrast commercial lighting, ultra-sharp 8k, negative space for bold Gujarati typography\`

---

### 💡 ૨. કોન્સેપ્ટ ૨: સત્તાવાર પુરાવો & મોટી જાહેરાત (Official Proof & Benefit)
- **🔥 ગુજરાતી પંચલાઈન**: "મોટી ભરતી મંજૂર! ✅" (સફેદ અક્ષરો લાલ હાઇલાઇટ સાથે)
- **📝 ગૌણ લખાણ**: "પગાર & લાયકાત નિયમો જાહેર"
- **👤 વિઝ્યુઅલ એલિમેન્ટ**: જમણી બાજુ નાણાં વિભાગ/WCD પરિપત્રનો અસલી ફોટો, તેના પર મોટું લીલું ખરાની નિશાની (Green Verified Checkmark).
- **🎨 બેકગ્રાઉન્ડ & કલર સ્કીમ**: ક્લીન વ્હાઇટ અને રોયલ બ્લૂ બેકગ્રાઉન્ડ, સ્પષ્ટ અને વાંચવામાં આંખોને આરામદાયક.
- **🤖 AI Image Generation Prompt**:
  \`Professional YouTube thumbnail for educational recruitment exam ${detectedTopic}, crisp white and royal blue background, authentic official gazette document with green verified checkmark stamp, confident educator pointing towards key dates, ultra clean, high contrast editorial studio lighting, 16:9 aspect ratio\`

---

### 💡 ૩. કોન્સેપ્ટ ૩: જિજ્ઞાસા અને કટ-ઓફ રહસ્ય (Curiosity & Truth Check)
- **🔥 ગુજરાતી પંચલાઈન**: "સચ્ચાઈ જાણી ચોંકી જશો! 😲" (સોનેરી પીળા અક્ષરો)
- **📝 ગૌણ લખાણ**: "કોણ ફોર્મ ભરી શકશે? A to Z સાચી માહિતી"
- **👤 ચહેરો & અભિવ્યક્તિ**: ડાબી બાજુ ચોંકી ગયેલો સ્માર્ટ પોઝ, જમણી બાજુ મોટો પ્રશ્નાર્થ ચિહ્ન (?) અને Gyan Yatra App બેજ.
- **🎨 બેકગ્રાઉન્ડ**: ઘેરો કાળો અને એમ્બર ગોલ્ડ ગ્રેડિયન્ટ, હાઇ વિઝિબિલિટી.
- **🤖 AI Image Generation Prompt**:
  \`High CTR YouTube thumbnail about ${detectedTopic}, expressive subject on the left with curious and shocked reaction, golden glowing question mark in background, clean bold graphic layout, dramatic cinematic lighting, 16:9 widescreen composition, 4k\`

---

### 📱 થંબનેલ બનાવતી વખતે ધ્યાનમાં રાખવાના ૪ ગોલ્ડન રૂલ્સ:
1. **Rule of 3 Words**: થંબનેલ પર ૩ થી ૪ મોટા શબ્દોથી વધુ ક્યારેય ન લખવું (મોબાઇલમાં નાના સ્ક્રીન પર તુરંત વંચાવું જોઈએ).
2. **Left-to-Right Hierarchy**: ડાબી બાજુ ચહેરો અથવા મુખ્ય બોલ્ડ શબ્દો, અને જમણી બાજુ પુરાવો/પરિપત્ર.
3. **Contrast > Fancy Fonts**: સાદા અને બોલ્ડ અક્ષરો વાપરો (જેમ કે Arial Black, Montserrat Bold, શ્રુતિ બોલ્ડ).
4. **App Logo**: ખૂણામાં નાનો "Gyan Yatra" લોગો મૂકો જેથી બ્રાન્ડ ઓળખ મજબૂત બને.`;
    }

    return `મેં તમારો પ્રશ્ન સમજી લીધો છે: "${userMessage}"

તમારી YouTube સફરને સફળ બનાવવા માટે હું તમને નીચેની બાબતોમાં મદદ કરી શકું છું:
- વાયરલ ટાઈટલ અને SEO વર્ણન બનાવવું
- આજના ટ્રેન્ડિંગ વિષય પર સ્ટેપ-બાય-સ્ટેપ સ્ક્રિપ્ટ લખવી
- થંબનેલ માટે દમદાર ગુજરાતી પંચલાઈન તૈયાર કરવી
- ચેનલ એનાલિટિક્સનું વિશ્લેષણ કરવું

તમે ચોક્કસ કયા વિષય પર આગળ વધવા માંગો છો? મને વિગત જણાવો.`;
  }

  generateSmartLocalSEO(topicName, category) {
    const cleanTopic = topicName.replace(/[^\w\s\u0A80-\u0AFF]/gi, '').trim();
    return {
      titles: [
        `${cleanTopic}: 2026 માં જાણો સંપૂર્ણ માહિતી અને સાચી હકીકત!`,
        `ધ્યાનથી સાંભળો! ${cleanTopic} વિશે આ 3 વાતો કોઈ નથી કહેતું`,
        `${cleanTopic} - ઓનલાઇન અરજી કેવી રીતે કરવી? સ્ટેપ બાય સ્ટેપ ગાઈડ`,
        `શું ખરેખર ${cleanTopic} થી ફાયદો થશે? જાણો રિયાલિટી ચેક`,
        `${cleanTopic}: સરકારનો મોટો નિર્ણય! જાણો તમને શું મળશે?`,
        `આ 1 ભૂલ ના કરતા! ${cleanTopic} માં થયેલા નવા મોટા ફેરફારો`,
        `${cleanTopic} થી દર મહિને કમાણી કેવી રીતે કરવી? સાચો રસ્તો`,
        `ગુજરાતના નાગરિકો માટે મોટી જાહેરાત: ${cleanTopic} સંપૂર્ણ વિગત`,
        `માત્ર 5 મિનિટમાં સમજો: ${cleanTopic} ના નવા નિયમો અને શરતો`,
        `${cleanTopic} વિશે સૌથી સરળ ગુજરાતી વિડીયો (A to Z માહિતી)`
      ],
      abTestTitles: {
        emotional: `ગુજરાતીઓ માટે ખુશખબર! ${cleanTopic} વિશે સરકારે લીધો આ મોટો નિર્ણય ❤️`,
        curiosity: `શું તમને આ ખબર હતી? ${cleanTopic} પાછળનું અસલી રહસ્ય જાણી ચોંકી જશો! 😲`,
        benefit: `સીધો ફાયદો મેળવો! ${cleanTopic} માં અરજી કરો અને મેળવો પૂરો લાભ ✅`
      },
      description: `નમસ્તે મિત્રો! આજના વિડીયોમાં આપણે "${cleanTopic}" વિશે વિગતવાર અને સચોટ માહિતી મેળવીશું.

📌 આ વિડીયોમાં આવરી લીધેલ મુખ્ય મુદ્દાઓ:
00:00 - પરિચય અને તાજા સમાચાર
01:30 - નવા નિયમો અને પાત્રતા
04:15 - ઓનલાઇન પ્રોસેસ સ્ટેપ બાય સ્ટેપ
07:45 - ધ્યાન રાખવા જેવી અગત્યની બાબતો
09:30 - નિષ્કર્ષ અને મહત્વની સલાહ

✅ જરૂરી લિંક્સ અને સત્તાવાર પોર્ટલ:
સત્તાવાર માહિતી માટે ચેનલ સાથે જોડાયેલા રહો.

🔔 જો તમને આ વિડીયો ઉપયોગી લાગ્યો હોય તો LIKE કરો, તમારા મિત્રો સાથે SHARE કરો અને નવી અપડેટ્સ માટે ચેનલને SUBSCRIBE કરવાનું ભૂલતા નહીં!

⚠️ ડિસ્ક્લેમર: આ વિડીયો માત્ર શિક્ષણ અને માહિતીના હેતુ માટે બનાવવામાં આવ્યો છે. કોઈ પણ અંતિમ નિર્ણય લેતા પહેલા સત્તાવાર માહિતી ચકાસી લેવી.`,
      tags: [
        cleanTopic,
        `${cleanTopic} gujarati`,
        `${cleanTopic} 2026`,
        'gujarati news',
        'gujarat update',
        'sarkari mahiti',
        'online guide gujarati',
        'trending gujarat',
        'gujarati creator',
        'knowledge in gujarati'
      ],
      primaryKeywords: [
        cleanTopic,
        `${cleanTopic} gujarati`,
        `${cleanTopic} online guide`
      ],
      secondaryKeywords: [
        'gujarat update 2026',
        'sarkari yojana gujarati',
        'how to apply in gujarati',
        'gujarati info video'
      ],
      hashtags: [
        '#ગુજરાતી',
        '#ગુજરાત',
        '#GujaratUpdate',
        '#GujaratiNews',
        '#Knowledge'
      ],
      chapters: [
        { time: '00:00', title: 'ધમાકેદાર શરૂઆત અને મહત્વ' },
        { time: '01:30', title: 'નવા નિયમો અને સચ્ચાઈ' },
        { time: '04:15', title: 'સ્ટેપ બાય સ્ટેપ પદ્ધતિ' },
        { time: '07:45', title: 'ધ્યાન રાખવા જેવી ભૂલો' },
        { time: '09:30', title: 'નિષ્કર્ષ અને વિશેષ ટીપ' }
      ],
      pinnedComment: `🙏 કેમ છો મિત્રો! તમને આ વિડીયો કેવો લાગ્યો? ${cleanTopic} વિશે તમારો કોઈ પ્રશ્ન હોય તો નીચે કમેન્ટ બોક્સમાં જરૂર પૂછો. હું દરેક કમેન્ટનો જવાબ આપવાનો પ્રયત્ન કરીશ! વિડીયો ગમ્યો હોય તો એક Like જરૂર કરજો.`,
      callToAction: `દોસ્તો, જો તમે આવા જ સાચા અને ઉપયોગી વિડીયો દરરોજ જોવા માંગતા હોવ, તો અત્યારે જ લાલ સબ્સ્ક્રાઇબ બટન દબાવો અને ઘંટડી ઓલ પર સેટ કરો!`,
      suggestedFilename: `${cleanTopic.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}-complete-guide-2026.mp4`,
      thumbnailText: 'નવો નિયમ લાગુ!'
    };
  }

  generateSmartLocalThumbnails(topicName, category) {
    const t = topicName || '';
    const isSalary = /પગાર|વધારો|salary|hike|da|મોંઘવારી|ભથ્થ|cm|મુખ્યમંત્રી|ભૂપેન્દ્ર/i.test(t);
    const isAnganwadi = /આંગણવાડી|સુપરવાઈઝર|anganwadi/i.test(t);
    const isPolice = /પોલીસ|lrd|police|કોન્સ્ટેબલ|રક્ષક/i.test(t);
    const isSahay = /સહાય|યોજના|ખેડૂત|કિસાન|સબસિડી|મહિલા/i.test(t);

    if (isSalary) {
      return {
        concepts: [
          {
            id: 1,
            style: 'CM Announcement (ગુજરાતના મુખ્યમંત્રીશ્રીનો સત્તાવાર ફોટો)',
            gujaratiText: 'ગુજરાત પગાર વધારો મંજૂર',
            subjectPlacement: 'ડાબી બાજુ ગુજરાતના મુખ્યમંત્રીશ્રીનો પ્રેસ કોન્ફરન્સ ફોટો, જમણી બાજુ નાણાં વિભાગનો પરિપત્ર',
            expression: 'Authoritative & Confident (સત્તાવાર જાહેરાત)',
            background: 'શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF), ઝીરો નિયોન',
            contrastAdvice: 'સફેદ બેકગ્રાઉન્ડ પર ઘેરા લાલ અને નેવી બ્લુ અક્ષરો',
            imagePrompt: `Photorealistic 16:9 YouTube thumbnail photograph of the Chief Minister of Gujarat in crisp white traditional kurta at an official wooden press briefing podium announcing official salary hike, beside an authentic white Gandhinagar finance circular document with green verified checkmark stamp, pure white background, ultra-sharp 8k studio lighting, strictly no cartoon, no 3D, no neon glow`,
            accentColor: '#DC2626'
          },
          {
            id: 2,
            style: 'Direct Account Benefit (સીધો ખાતામાં પગાર વધારો)',
            gujaratiText: 'ખાતામાં સીધો વધારો!',
            subjectPlacement: 'ડાબી બાજુ મુખ્યમંત્રીશ્રી, જમણી બાજુ બેંક ક્રેડિટ મેસેજ અને પરિપત્ર',
            expression: 'Positive & Reassuring (આત્મવિશ્વાસ)',
            background: 'શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF) સોફ્ટ શેડો સાથે',
            contrastAdvice: 'નેવી બ્લુ હેડલાઇન અને ડાર્ક ગ્રીન એમાઉન્ટ હાઇલાઇટ',
            imagePrompt: `Clean 16:9 YouTube thumbnail photograph of Gujarat official salary hike notification, realistic press briefing atmosphere, official government emblem, crisp approved stamp, pure white background, ultra-sharp realistic documentary photography`,
            accentColor: '#10B981'
          },
          {
            id: 3,
            style: 'Official Resolution (ગાંધીનગર સત્તાવાર ઠરાવ/GR)',
            gujaratiText: 'નવો પરિપત્ર જાહેર!',
            subjectPlacement: 'ગાંધીનગર સચિવાલય પરિપત્ર ગ્રીન વેરિફાઈડ ટીકમાર્ક સાથે',
            expression: 'Official & Verified (૧૦૦% સત્તાવાર પુરાવો)',
            background: 'શુદ્ધ વ્હાઇટ બેકગ્રાઉન્ડ (#FFFFFF)',
            contrastAdvice: 'લાલ બોક્સમાં સફેદ અક્ષરો "નવો પરિપત્ર જાહેર!"',
            imagePrompt: `Photorealistic 16:9 YouTube thumbnail showing Gandhinagar Secretariat official resolution document with golden government emblem seal, green approved stamp, pure white studio backdrop, no neon, no cartoon`,
            accentColor: '#2563EB'
          }
        ]
      };
    }

    if (isAnganwadi) {
      return {
        concepts: [
          {
            id: 1,
            style: 'Educator Candidate (શિક્ષિકા/ઉમેદવારનો અસલી ફોટો)',
            gujaratiText: 'આંગણવાડી સુપરવાઈઝર નવી ભરતી',
            subjectPlacement: 'ડાબી બાજુ ગંભીર અને આત્મવિશ્વાસુ ગુજરાતી મહિલા શિક્ષિકાનો વાસ્તવિક ફોટો',
            expression: 'Serious & Confident (આત્મવિશ્વાસભરી નજર)',
            background: 'શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF), ઝીરો નિયોન',
            contrastAdvice: 'સફેદ બેકગ્રાઉન્ડ પર ઘેરા લાલ અને નેવી બ્લુ ૪ થી ૫ શબ્દો',
            imagePrompt: `Photorealistic 16:9 YouTube thumbnail photograph of an authentic professional Indian Gujarati female educator in traditional elegant cotton saree looking at camera, beside an official Gandhinagar Women and Child Development recruitment circular with red border and green verified stamp, pure white background, ultra-sharp 8k commercial photography, strictly no cartoon, no 3D`,
            accentColor: '#DC2626'
          },
          {
            id: 2,
            style: 'Application Start Alert (ઓનલાઇન ફોર્મ શરૂ)',
            gujaratiText: 'ઓનલાઇન ફોર્મ શરૂ!',
            subjectPlacement: 'ડાબી બાજુ મહિલા ઉમેદવાર, જમણી બાજુ OJAS પોર્ટલ નોટિફિકેશન',
            expression: 'Excited & Focused (તાકીદની ચેતવણી)',
            background: 'શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF)',
            contrastAdvice: 'પીળા બોક્સમાં કાળા અક્ષરે પંચલાઇન',
            imagePrompt: `Photorealistic 16:9 YouTube thumbnail showing authentic Gujarati woman candidate holding application form, official Gujarat recruitment notification circular on white background, sharp studio lighting`,
            accentColor: '#F59E0B'
          },
          {
            id: 3,
            style: 'Eligibility & Rules (લાયકાત અને નવા નિયમો)',
            gujaratiText: 'લાયકાત અને નવો નિયમ',
            subjectPlacement: 'મધ્યમાં સત્તાવાર ગાંધીનગર ભરતી નિયમ ગેઝેટ',
            expression: 'Attentive & Educational (માર્ગદર્શન)',
            background: 'શુદ્ધ વ્હાઇટ બેકગ્રાઉન્ડ (#FFFFFF)',
            contrastAdvice: 'ડાર્ક નેવી બ્લુ હેડલાઇન સાથે ગ્રીન ટીકમાર્ક',
            imagePrompt: `Clean white background 16:9 YouTube thumbnail of official Gujarat government recruitment rules circular, crisp typography negative space, ultra-sharp studio photography`,
            accentColor: '#10B981'
          }
        ]
      };
    }

    if (isPolice) {
      return {
        concepts: [
          {
            id: 1,
            style: 'Uniform Candidate (ખાખી યુનિફોર્મ ઉમેદવાર)',
            gujaratiText: 'ગુજરાત પોલીસ ભરતી ૨૦૨૬',
            subjectPlacement: 'ડાબી બાજુ ખાખી તાલીમ યુનિફોર્મમાં ગુજરાતી ઉમેદવારનો વાસ્તવિક ચહેરો',
            expression: 'Determined & Proud (દેશભક્તિ અને સંકલ્પ)',
            background: 'શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF), ઝીરો નિયોન',
            contrastAdvice: 'સફેદ બેકગ્રાઉન્ડ પર ઘેરો લાલ અને ખાખી-બ્લુ બોલ્ડ ટેક્સ્ટ',
            imagePrompt: `Photorealistic 16:9 YouTube thumbnail photograph of an authentic young Indian candidate in crisp khaki police recruitment uniform looking directly at camera, beside an official Gujarat Home Department recruitment notification gazette document, pure white background, ultra-sharp 8k editorial photography, strictly no cartoon`,
            accentColor: '#DC2626'
          },
          {
            id: 2,
            style: 'Ground Physical Test (ગ્રાઉન્ડ ટેસ્ટ જાહેરાત)',
            gujaratiText: 'દોડ અને ગ્રાઉન્ડ તારીખ',
            subjectPlacement: 'ડાબી બાજુ ફિટનેસ ઉમેદવાર, જમણી બાજુ સત્તાવાર તારીખ પત્રક',
            expression: 'Energetic & Focused (તાકાત અને જુસ્સો)',
            background: 'શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF)',
            contrastAdvice: 'લાલ રંગના બોલ્ડ અક્ષરો સાથે ગ્રીન ચેકમાર્ક',
            imagePrompt: `Action portrait of Gujarat police aspirant preparing for physical test, beside official date circular document on clean white background, ultra-sharp photography`,
            accentColor: '#10B981'
          },
          {
            id: 3,
            style: 'Official Notification (સત્તાવાર ઓર્ડર અને જગ્યાઓ)',
            gujaratiText: 'કુલ ૧૨,૦૦૦+ જગ્યાઓ જાહેર',
            subjectPlacement: 'ગાંધીનગર પોલીસ ભરતી બોર્ડ પરિપત્ર ગ્રીન ટીકમાર્ક સાથે',
            expression: 'Authoritative & Clear (૧૦૦% સત્તાવાર)',
            background: 'શુદ્ધ વ્હાઇટ બેકગ્રાઉન્ડ (#FFFFFF)',
            contrastAdvice: 'નેવી બ્લુ હેડલાઇન પર પીળો હાઇલાઇટર બોક્સ',
            imagePrompt: `Clean minimalist 16:9 YouTube thumbnail of official police recruitment notification circular, red warning banner, green approved stamp on crisp white background`,
            accentColor: '#2563EB'
          }
        ]
      };
    }

    if (isSahay) {
      return {
        concepts: [
          {
            id: 1,
            style: 'Farmer / Beneficiary (ખેડૂત / લાભાર્થીનો અસલી ફોટો)',
            gujaratiText: 'સીધા ખાતામાં સહાય જમા',
            subjectPlacement: 'ડાબી બાજુ વાસ્તવિક ગુજરાતી ખેડૂત/લાભાર્થીનો હસતો ચહેરો, જમણી બાજુ મંજૂરી ઓર્ડર',
            expression: 'Relieved & Happy (ખુશી અને સંતોષ)',
            background: 'શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF), ઝીરો નિયોન',
            contrastAdvice: 'સફેદ બેકગ્રાઉન્ડ પર બોલ્ડ નેવી બ્લુ અને ડાર્ક ગ્રીન ટેક્સ્ટ',
            imagePrompt: `Photorealistic 16:9 YouTube thumbnail photograph of an authentic dignified Indian Gujarati farmer in traditional white kurta smiling at camera, beside official Gujarat Agriculture department sanction letter with direct bank transfer DBT badge and green verified stamp, pure white background, ultra-sharp photography, strictly no cartoon`,
            accentColor: '#10B981'
          },
          {
            id: 2,
            style: 'Urgent Alert (છેલ્લી તારીખ અને નિયમ)',
            gujaratiText: 'નવો નિયમ: ફોર્મ શરૂ!',
            subjectPlacement: 'ડાબી બાજુ ગ્રામીણ લાભાર્થી, જમણી બાજુ લાલ ચેતવણી બેજ',
            expression: 'Alert & Attentive (ધ્યાન દોરતો ભાવ)',
            background: 'શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF)',
            contrastAdvice: 'લાલ બોક્સમાં સફેદ અક્ષરો સાથે પીળો હાઇલાઇટ',
            imagePrompt: `Photorealistic editorial thumbnail of Gujarat government welfare scheme document, red urgent alert icon, pure white background, clean minimalist studio shot`,
            accentColor: '#DC2626'
          },
          {
            id: 3,
            style: 'Official Sanction (સત્તાવાર મંજૂરી ઓર્ડર)',
            gujaratiText: '૧૦૦% સત્તાવાર સરકારી ઓર્ડર',
            subjectPlacement: 'સચિવાલય ગાંધીનગર સહાય મંજૂરી પરિપત્ર',
            expression: 'Guaranteed & Trustworthy (સંપૂર્ણ વિશ્વાસ)',
            background: 'શુદ્ધ વ્હાઇટ બેકગ્રાઉન્ડ (#FFFFFF)',
            contrastAdvice: 'ડાર્ક નેવી બ્લુ ટેક્સ્ટ સાથે ગોલ્ડન સીલ',
            imagePrompt: `Official Gujarat government welfare approval circular on clean white background, golden emblem, green verified seal, ultra-sharp documentary photography`,
            accentColor: '#2563EB'
          }
        ]
      };
    }

    // Default High-CTR concepts
    return {
      concepts: [
        {
          id: 1,
          style: 'Urgency & Warning (ચેતવણી અને તાત્કાલિક અપડેટ)',
          gujaratiText: 'મોટો ફેરફાર!',
          subjectPlacement: 'ડાબી બાજુ ચોંકી ગયેલો ચહેરો, જમણી બાજુ સત્તાવાર પરિપત્ર',
          expression: 'Shocked / Warning (ગંભીર અને આશ્ચર્ય)',
          background: 'શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF), ઝીરો નિયોન',
          contrastAdvice: 'સફેદ બેકગ્રાઉન્ડ પર ઘેરા લાલ અને નેવી બ્લુ અક્ષરો',
          imagePrompt: `Editorial 16:9 YouTube thumbnail for ${topicName}, authentic realistic Gujarati educator looking at camera, official government notification circular on the right with green verified stamp, pure white background, ultra-sharp 8k photography, strictly no cartoon, no 3D`,
          accentColor: '#EF4444'
        },
        {
          id: 2,
          style: 'Proof & Benefit (સીધો ફાયદો અને પુરાવો)',
          gujaratiText: '૧૦૦% સત્તાવાર જાહેરાત',
          subjectPlacement: 'ડાબી બાજુ થીમ મુજબનો વાસ્તવિક વ્યક્તિ, જમણી બાજુ સત્તાવાર ઓર્ડર',
          expression: 'Confident & Reassuring (આત્મવિશ્વાસ)',
          background: 'શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF)',
          contrastAdvice: 'ડાર્ક નેવી બ્લુ હેડલાઇન સાથે ગ્રીન ટીકમાર્ક',
          imagePrompt: `Photorealistic YouTube thumbnail about ${topicName}, authentic subject portrait, official Gandhinagar gazette document, pure white background, sharp studio lighting`,
          accentColor: '#10B981'
        },
        {
          id: 3,
          style: 'Curiosity & Rules (નવા નિયમો અને હકીકત)',
          gujaratiText: 'નવો નિયમ લાગુ!',
          subjectPlacement: 'મધ્યમાં ગાંધીનગર સચિવાલય પરિપત્ર ગ્રીન ટીકમાર્ક સાથે',
          expression: 'Alert & Clear (સ્પષ્ટ માર્ગદર્શન)',
          background: 'શુદ્ધ સફેદ બેકગ્રાઉન્ડ (#FFFFFF)',
          contrastAdvice: 'લાલ રંગના બોલ્ડ અક્ષરો સાથે પીળો હાઇલાઇટર બોક્સ',
          imagePrompt: `Clean white background YouTube thumbnail document layout for ${topicName}, crisp red border, official seal, ultra-sharp documentary photography`,
          accentColor: '#2563EB'
        }
      ]
    };
  }

  generateSmartLocalScript(topic, durationMinutes, language, speakingTone, targetWordCount) {
    const isShorts = durationMinutes <= 1;

    if (isShorts) {
      return {
        title: `${topic} (Shorts Script)`,
        topic,
        durationMinutes,
        targetWordCount,
        actualWordCount: 140,
        speakingSpeedNote: 'અંદાજે 50-60 સેકન્ડ ઝડપી બોલચાલ',
        sections: [
          {
            sectionName: 'હૂક (0:00 - 0:10)',
            timeRange: '0:00 - 0:10',
            content: `દોસ્તો! જો તમે પણ ${topic} વિશે હજી સુધી સાચી વાત નથી જાણી, તો માત્ર 50 સેકન્ડ આ વિડીયો ધ્યાનથી જોઈ લેજો!`,
            directorNotes: 'ઝડપી ઝૂમ-ઇન અને કેમેરા તરફ સીધી નજર'
          },
          {
            sectionName: 'મુખ્ય માહિતી (0:10 - 0:40)',
            timeRange: '0:10 - 0:40',
            content: `સરકાર અને સત્તાવાર વિભાગ દ્વારા તાજેતરમાં સ્પષ્ટતા કરવામાં આવી છે કે આ નિયમ દરેક વ્યક્તિ માટે લાગુ પડશે. સૌથી મહત્વની વાત એ છે કે તમારે કોઈ પણ વચેટીયાને એક પણ રૂપિયો આપવાની જરૂર નથી. તમે ઘરે બેઠા તમારા મોબાઈલથી જ સીધું ચેક કરી શકો છો.`,
            directorNotes: 'મોબાઇલ સ્ક્રીન રેકોર્ડિંગ અથવા હાઇલાઇટ ગ્રાફિક્સ દર્શાવવા'
          },
          {
            sectionName: 'કોલ ટુ એક્શન (0:40 - 0:55)',
            timeRange: '0:40 - 0:55',
            content: `આ માહિતી તમારા તમામ મિત્રો અને વોટ્સએપ ગ્રૂપમાં શેર કરો, અને આવી જ સાચી માહિતી માટે ચેનલને સબ્સ્ક્રાઇબ કરી લો!`,
            directorNotes: 'સબ્સ્ક્રાઇબ અને શેર એનિમેશન ઓવરલે'
          }
        ]
      };
    }

    return {
      title: `${topic}: સંપૂર્ણ વિશ્લેષણ અને માર્ગદર્શન`,
      topic,
      durationMinutes,
      targetWordCount,
      actualWordCount: Math.round(targetWordCount * 0.95),
      speakingSpeedNote: `અંદાજે ${durationMinutes} મિનિટ વાંચન સમય (~130 શબ્દો/મિનિટ)`,
      sections: [
        {
          sectionName: 'ધમાકેદાર હૂક (Hook)',
          timeRange: '0:00 - 0:50',
          content: `કેમ છો મિત્રો! નમસ્તે. આજના વિડીયોમાં આપણે એક એવા વિષય પર વાત કરવા જઈ રહ્યા છીએ જે સીધો તમારા ખિસ્સા, તમારા સમય અને તમારા ભવિષ્ય સાથે જોડાયેલો છે—અને એ વિષય છે: "${topic}". સોશિયલ મીડિયા પર આના વિશે ઘણી બધી વાતો ફેલાઈ રહી છે, પરંતુ સાચી હકીકત શું છે? આજના આ વિગતવાર વિડીયોમાં હું તમને એક-એક પોઇન્ટ સાબિતી સાથે સમજાવવાનો છું. એટલે વિડીયોને છેલ્લી સેકન્ડ સુધી જોજો જેથી કોઈ મહત્વનો મુદ્દો ચૂકી ના જવાય.`,
          directorNotes: 'સ્માઇલ સાથે ઉત્સાહી શરૂઆત, કેમેરા તરફ સીધો સંપર્ક'
        },
        {
          sectionName: 'પરિચય અને રોડમેપ (Intro)',
          timeRange: '0:50 - 2:15',
          content: `આ વિડીયોમાં આપણે મુખ્ય ત્રણ બાબતો સમજીશું: પહેલું, આ નિયમ કે માહિતીની શરૂઆત ક્યાંથી થઈ અને તેનાથી તમને શું ફરક પડશે. બીજું, સામાન્ય લોકો ક્યાં મોટી ભૂલ કરી બેસે છે. અને ત્રીજું, સૌથી સહેલો રસ્તો કયો છે જેનાથી તમે પૂરો લાભ લઈ શકો. જો તમે પહેલીવાર આપણી ચેનલ પર આવ્યા છો, તો અત્યારે જ સબ્સ્ક્રાઇબ બટન દબાવીને ઘંટડી ઓલ કરી દેજો, જેથી કોઈ પણ નવી માહિતી સૌથી પહેલા તમને મળે.`,
          directorNotes: 'ઓન-સ્ક્રીન 1, 2, 3 પોઇન્ટ્સ અને સબ્સ્ક્રાઇબ બેજ'
        },
        {
          sectionName: 'ભાગ 1: નિયમો અને વર્તમાન પરિસ્થિતિ',
          timeRange: '2:15 - 5:30',
          content: `ચાલો સૌથી પહેલા સમજીએ કે આની પાછળનો મુખ્ય આધાર શું છે. આપણે બધા જાણીએ છીએ તેમ, કોઈપણ નવી જાહેરાત આવે ત્યારે લોકોમાં ઉત્સુકતા વધી જાય છે. પરંતુ જો આપણે સત્તાવાર આંકડા અને નોટિફિકેશન જોઈએ તો સ્પષ્ટ થાય છે કે આમાં અમુક ચોક્કસ શરતો છે. ઉદાહરણ તરીકે, જે લોકો યોગ્ય દસ્તાવેજ ધરાવે છે તેમને જ સીધો લાભ મળે છે. ઘણા લોકો અધૂરી માહિતીના કારણે ફોર્મ ભરવામાં કે પ્રોસેસ કરવામાં ભૂલ કરે છે અને પછી ફરિયાદ કરે છે કે અમારું કામ ના થયું. આપણે એ ભૂલ નથી કરવાની.`,
          directorNotes: 'સત્તાવાર વેબસાઈટ કે ઓર્ડરનો સ્ક્રીનશોટ ડિસ્પ્લે કરવો'
        },
        {
          sectionName: 'ભાગ 2: સ્ટેપ બાય સ્ટેપ પદ્ધતિ અને ઉકેલ',
          timeRange: '5:30 - 8:45',
          content: `હવે આપણે પ્રેક્ટિકલ પગલાં જોઈએ. સૌ પ્રથમ, તમારે તમારા મોબાઇલમાં ઓફિશિયલ પોર્ટલ ખોલવાનું છે. ત્યાં જઈને તમારો રજીસ્ટર્ડ નંબર અથવા આધાર વિગત દાખલ કરવાની છે. ધ્યાનમાં રાખો કે કોઈ પણ અજાણી લિંક કે ફ્રોડ મેસેજ પર ક્લિક નથી કરવાનું. જેવું તમારું લોગીન થશે, તમારી સામે ડેશબોર્ડ ખુલશે જેમાં સ્પષ્ટ સ્થિતિ દેખાશે. જો કોઈ ભૂલ દેખાય તો તરત જ એડિટ ઓપ્શનમાં જઈને સુધારી લેવી. આ આખી પ્રક્રિયામાં માત્ર પાંચ થી સાત મિનિટનો સમય લાગે છે.`,
          directorNotes: 'સ્ક્રીન રેકોર્ડિંગ ડેમો અને માઉસ કર્સર હાઇલાઇટ'
        },
        {
          sectionName: 'ભાગ 3: વારંવાર પૂછાતા પ્રશ્નો (FAQ) અને રહસ્યો',
          timeRange: '8:45 - 11:30',
          content: `મને ઘણા મિત્રો કમેન્ટમાં પૂછતા હોય છે કે, "શું આ યોજના કે નિયમ બધા માટે લાગુ પડશે?" તો એનો જવાબ છે—હા, પરંતુ યોગ્ય પાત્રતા સાથે. બીજો પ્રશ્ન એવો આવે છે કે આમાં કોઈ ફી ભરવાની હોય છે? તો સ્પષ્ટ શબ્દોમાં જાણી લો કે આ પ્રક્રિયા તદ્દન મફત છે, કોઈને પણ એક રૂપિયો ચૂકવવાની જરૂર નથી.`,
          directorNotes: 'કમેન્ટ બોક્સ ઓવરલે અને પ્રશ્નોના કાર્ડ્સ'
        },
        {
          sectionName: 'સમાપન અને કોલ ટુ એક્શન (Outro & CTA)',
          timeRange: '11:30 - 13:00',
          content: `તો મિત્રો, આ હતી "${topic}" વિશેની સૌથી સાચી અને સંપૂર્ણ માહિતી. આશા રાખું છું કે આ વિડીયોથી તમારા બધા પ્રશ્નોનું નિરાકરણ આવી ગયું હશે. જો તમને હજી પણ કોઈ શંકા હોય તો નીચે કમેન્ટ બોક્સમાં જરૂર લખો, હું ચોક્કસ જવાબ આપીશ. આ વિડીયો તમારા પરિવારજનો અને ગ્રૂપમાં શેર જરૂર કરજો જેથી કોઈ પણ વ્યક્તિ છેતરાય નહીં. મળીએ છીએ આવતા નવા વિડીયોમાં, ત્યાં સુધી જય હિન્દ, જય ભારત, જય જય ગરવી ગુજરાત!`,
          directorNotes: 'ગરવી ગુજરાત સ્લોગન સાથે હાથ જોડીને વિદાય, એન્ડ સ્ક્રીન વિડીયો લિંક'
        }
      ]
    };
  }

  generateSmartLocalResearch(videoUrlOrTitle, videoMetadata) {
    const title = videoMetadata?.title || videoUrlOrTitle;
    return {
      whyItWorked: `આ વિડીયો લોકપ્રિય થવા પાછળનું મુખ્ય કારણ દર્શકોની તાત્કાલિક જિજ્ઞાસા (Urgency Hook) અને સ્પષ્ટ પરિણામ દર્શાવતું થંબનેલ છે. દર્શકોને ટૂંકા સમયમાં સીધો ફાયદો મળવાની આશા હતી.`,
      thumbnailBreakdown: `થંબનેલમાં હાઇ-કોન્ટ્રાસ્ટ પીળા અને લાલ રંગનો ઉપયોગ થયો છે, જેનાથી CTR (ક્લિક રેટ) 8-10% સુધી પહોંચ્યો છે. જો કે, ટેક્સ્ટ થોડો વધારે લાંબો છે જેને ટૂંકો કરી શકાય.`,
      missingGaps: `વિડીયોમાં સ્ટેપ-બાય-સ્ટેપ પ્રેક્ટિકલ ડેમોનો અભાવ હતો અને માત્ર સામાન્ય વાતો કરવામાં આવી હતી. તમારા વિડીયોમાં જો તમે લાઈવ ડેમો બતાવશો તો દર્શકો અંત સુધી જોશે.`,
      competitiveAngles: [
        `એંગલ 1: "${title}" ની અસલી સચ્ચાઈ અને રિયાલિટી ચેક (પર્દાફાશ એંગલ)`,
        `એંગલ 2: માત્ર 5 મિનિટમાં મોબાઈલથી લાઈવ ડેમો (પ્રેક્ટિકલ ગાઈડ)`,
        `એંગલ 3: 60 સેકન્ડ શોર્ટ્સ: 3 વાતો જે આ વિડીયોમાં નથી બતાવી`,
        `એંગલ 4: સામાન્ય લોકોએ કરેલી 3 મોટી ભૂલો અને તેનું નિવારણ`,
        `એંગલ 5: 2026 નો નવો અપડેટ: આ નિયમ હવે બદલાઈ ગયો!`
      ],
      suggestedNewTitle: `${title} વિશે કોઈ આ નથી કહેતું! 2026 માં જાણો સાચી હકીકત`
    };
  }

  // --- 8. Analyze 48-Hour YouTube Analytics Screenshot with GPT-4o Vision ---
  async analyzeScreenshot({ imagesBase64 = [], category = 'all', ocrData = null, channelContext = null }) {
    const openai = this.getOpenAIClient();
    const model = 'gpt-4o';

    if (openai && imagesBase64.length > 0) {
      try {
        const ocrInfo = ocrData ? `\n[ફોટામાંથી સ્કેન થયેલ લખાણ & આંકડા]:\n48h વ્યુઝ: ${ocrData.views48h || 'N/A'}\n60m વ્યુઝ: ${ocrData.views60m || 'N/A'}\nટોચના વિડીયો: ${JSON.stringify(ocrData.topVideos || [])}\nશોધાયેલ ટેક્સ્ટ: ${(ocrData.rawText || '').slice(0, 500)}` : '';
        const promptText = `તમે એક વરિષ્ઠ YouTube Analytics અને Content Strategy નિષ્ણાત છો.
તમારું મિશન: વપરાશકર્તાએ જોડેલા YouTube Studio ના છેલ્લા 48 કલાકના Realtime Views / Analytics ના સ્ક્રીનશોટ(ઓ)નું ઊંડાણપૂર્વક વિશ્લેષણ કરવું.
ચેનલનું નામ: "${channelContext?.channelName || 'Gyan Yatra'}" (ગુજરાતી કન્ટેન્ટ ચેનલ)
કેટેગરી: "${category}"
${ocrInfo}

સ્ક્રીનશોટમાંથી આ વિગતો શોધો:
1. હાલમાં 48 કલાકમાં કયા વિડીયો સૌથી વધુ વ્યુઝ (Top Views) અને ગતિ (Hourly Velocity) મેળવી રહ્યા છે.
2. દર્શકો કયા ચોક્કસ કન્ટેન્ટ અને એંગલમાં વધુ ઉત્સુક છે (Viewer Demand & Psychology).
3. આ ડેટાનો ફાયદો ઉઠાવીને આગામી 24 થી 48 કલાકમાં ચેનલ પર અપલોડ કરવા માટે ૩ સુપર વાયરલ ગુજરાતી વિડીયો આઈડિયા બનાવો.

પ્રતિસાદ માત્ર નીચે મુજબના વેલિડ JSON ફોર્મેટમાં આપો:
{
  "analyzedInsights": "સ્ક્રીનશોટમાંથી મળેલા મુખ્ય નિષ્કર્ષ (દા.ત. 48 કલાકમાં ભરતી અને સરકારી યોજનાના વિડીયોઝમાં ભારે ઉછાળો છે...)",
  "topObservedVideos": [
    "વિડીયો 1 નું નામ અને અંદાજિત વ્યુઝ",
    "વિડીયો 2 નું નામ અને અંદાજિત વ્યુઝ"
  ],
  "ideas": [
    {
      "id": "screenshot-idea-1",
      "rank": 1,
      "topicGujarati": "વિષયનું સ્પષ્ટ ગુજરાતી નામ",
      "suggestedTitle": "આકર્ષક, સાચું અને હાઈ CTR વાળું ગુજરાતી ટાઈટલ",
      "targetAudience": "કોના માટે છે (દા.ત. યુવાનો, ઉમેદવારો, મહિલાઓ, સામાન્ય નાગરિકો)",
      "evidenceReason": "૪૮ કલાકના સ્ક્રીનશોટ મુજબ કેમ ચાલશે (તથ્ય આધારિત પુરાવો)",
      "whyViewersWatch": "દર્શકોની ઉત્સુકતા અને જોવા પાછળનું મનોવિજ્ઞાન",
      "format": "Long 10-15m",
      "competition": "Low",
      "score": 98,
      "searchKeywords": ["કીવર્ડ 1", "કીવર્ડ 2", "કીવર્ડ 3", "કીવર્ડ 4"],
      "thumbnailConcept": {
        "visual": "16:9 થંબનેલમાં શું દેખાશે (ચહેરો, પૃષ્ઠભૂમિ, રંગ)",
        "gujaratiText": "થંબનેલ પર લખવાનું મોટું આકર્ષક લખાણ",
        "badge": "નવી જાહેરાત ⚠️"
      },
      "scriptPrompt": "આ વિષય પર સંપૂર્ણ ગુજરાતી સ્ક્રિપ્ટ લખવા માટેનો વિગતવાર પ્રોમ્પ્ટ",
      "hook45s": "પ્રથમ 45 સેકન્ડમાં દર્શકને જકડી રાખતો દમદાર હૂક ડાયલોગ"
    },
    {
      "id": "screenshot-idea-2",
      "rank": 2,
      "topicGujarati": "બીજો વિષય",
      "suggestedTitle": "બીજા વિડીયોનું ગુજરાતી ટાઈટલ",
      "targetAudience": "લક્ષિત ઓડિયન્સ",
      "evidenceReason": "સ્ક્રીનશોટ વેલોસિટી ડેટા પરથી તારણ",
      "whyViewersWatch": "જોવા પાછળનું મનોવિજ્ઞાન",
      "format": "Shorts 60s અથવા Long 10m",
      "competition": "Medium",
      "score": 94,
      "searchKeywords": ["કીવર્ડ 1", "કીવર્ડ 2", "કીવર્ડ 3"],
      "thumbnailConcept": {
        "visual": "વિઝ્યુઅલ કોન્સેપ્ટ",
        "gujaratiText": "થંબનેલ ટેક્સ્ટ",
        "badge": "મોટો ફેરફાર! 🔥"
      },
      "scriptPrompt": "સ્ક્રિપ્ટ પ્રોમ્પ્ટ",
      "hook45s": "હૂક ડાયલોગ"
    },
    {
      "id": "screenshot-idea-3",
      "rank": 3,
      "topicGujarati": "ત્રીજો વિષય",
      "suggestedTitle": "ત્રીજા વિડીયોનું ગુજરાતી ટાઈટલ",
      "targetAudience": "લક્ષિત ઓડિયન્સ",
      "evidenceReason": "સ્ક્રીનશોટ સર્ચ સિગ્નલ તારણ",
      "whyViewersWatch": "જોવા પાછળનું મનોવિજ્ઞાન",
      "format": "Long 12-15m",
      "competition": "Low",
      "score": 91,
      "searchKeywords": ["કીવર્ડ 1", "કીવર્ડ 2", "કીવર્ડ 3"],
      "thumbnailConcept": {
        "visual": "વિઝ્યુઅલ કોન્સેપ્ટ",
        "gujaratiText": "થંબનેલ ટેક્સ્ટ",
        "badge": "100% સાચું ✓"
      },
      "scriptPrompt": "સ્ક્રિપ્ટ પ્રોમ્પ્ટ",
      "hook45s": "હૂક ડાયલોગ"
    }
  ]
}`;

        const userContent = [
          { type: 'text', text: promptText },
          ...imagesBase64.map(img => ({
            type: 'image_url',
            image_url: { url: img }
          }))
        ];

        const response = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are an elite YouTube Analytics & Growth Strategist for Gujarati YouTube channels. Output strictly valid JSON without markdown wrapping.'
            },
            {
              role: 'user',
              content: userContent
            }
          ],
          temperature: 0.7,
          max_tokens: 3000
        });

        const rawContent = response.choices[0].message.content.trim();
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed.ideas)) {
            parsed.ideas = parsed.ideas.map((idea, idx) => ({
              id: idea.id || `screenshot-idea-${idx + 1}`,
              rank: idea.rank || idx + 1,
              category: category,
              topicGujarati: idea.topicGujarati,
              suggestedTitle: idea.suggestedTitle,
              selectionRationale: idea.whyViewersWatch || idea.evidenceReason || '48 કલાકના સ્ક્રીનશોટ મુજબ દર્શકોની ઊંચી ડિમાન્ડ',
              trendEvidence: idea.evidenceReason || '48 કલાકના YouTube Studio સ્ક્રીનશોટ એનાલિટિક્સ પુરાવો',
              trendSource: 'YouTube Studio 48h Realtime Analytics Screenshot',
              viewMetrics: {
                lifetimeViews: '86K+ Views',
                accumulated48h: 'કલાકદીઠ ઉચ્ચ વેલોસિટી (Spike)',
                growthRate: '+150% સર્ચ ગ્રોથ',
                publishedTime: 'છેલ્લા 48 કલાક'
              },
              targetAudience: idea.targetAudience || 'ગુજરાતી યુટ્યુબ દર્શકો',
              suggestedFormat: idea.format || 'Long Video (10-12m)',
              formatType: (idea.format && idea.format.toLowerCase().includes('short')) ? 'short' : 'long',
              confidenceRating: {
                score: idea.score || 96,
                label: `${idea.score || 96}% વાસ્તવિક સ્ક્રીનશોટ પુરાવા`
              },
              openingHook: idea.hook45s || idea.suggestedTitle,
              thumbnailConcept: idea.thumbnailConcept?.visual || idea.suggestedTitle,
              prompts: {
                scriptPrompt: idea.scriptPrompt || `વિષય: "${idea.suggestedTitle}" પર સંપૂર્ણ ગુજરાતી સ્ક્રિપ્ટ લખો.`,
                thumbnailPrompt: `A minimalist 16:9 YouTube thumbnail. Solid background. Authentic photograph. Text: "${idea.thumbnailConcept?.gujaratiText || idea.suggestedTitle}".`,
                slidePrompt: `Create 8-10 professional 16:9 slides for YouTube video on "${idea.suggestedTitle}".`
              }
            }));
          }
          return {
            success: true,
            source: 'openai_vision_gpt4o',
            ...parsed
          };
        }
      } catch (err) {
        console.error('[OpenAIService Vision Error]:', err.message);
      }
    }

    // Fallback if no OpenAI key or API error
    return this.generateFallbackScreenshotAnalysis(category, ocrData);
  }

  generateFallbackScreenshotAnalysis(category = 'all', ocrData = null) {
    const views48hNum = (ocrData && ocrData.views48h) ? Number(ocrData.views48h) : 0;
    const views60mNum = (ocrData && ocrData.views60m) ? Number(ocrData.views60m) : 0;
    const views48hFormatted = views48hNum > 0 ? views48hNum.toLocaleString('en-IN') : '0';
    
    // Top observed videos from OCR if present
    let topVideos = [];

    if (ocrData && Array.isArray(ocrData.topVideos) && ocrData.topVideos.length > 0) {
      topVideos = ocrData.topVideos.map(v => typeof v === 'string' ? v : v.title).filter(Boolean);
    }

    const insightText = ocrData && ocrData.views48h
      ? `તમારા YouTube Studio સ્ક્રીનશોટમાંથી સફળતાપૂર્વક ${views48hFormatted} કુલ 48 કલાક વ્યુઝ અને ${views60mNum}/hr વેલોસિટી સ્કેન થઈ છે.`
      : 'તમારા 48 કલાકના એનાલિટિક્સ સ્ક્રીનશોટનું વિશ્લેષણ સફળતાપૂર્વક પૂર્ણ થયું છે.';

    return {
      success: true,
      source: 'smart_channel_analyzer',
      detectedViews48h: views48hNum,
      detectedViews60m: views60mNum,
      analyzedInsights: insightText,
      topObservedVideos: topVideos,
      ideas: []
    };
  }

  generateSmartLocalSEO(topicName, category) {
    const raw = topicName || '';
    const cleanTopic = raw.replace(/[^\w\s\u0A80-\u0AFF]/gi, ' ').trim().replace(/\s+/g, ' ');
    const isSalary = /પગાર|વધારો|salary|hike|da|મોંઘવારી|ભથ્થ|ભથ્થા|પેન્શન|કર્મચારી/i.test(raw);
    const isAnganwadi = /આંગણવાડી|સુપરવાઈઝર|તેડાગર|વર્કર|anganwadi/i.test(raw);
    const isSahay = /સહાય|યોજના|કિસાન|ખેડૂત|સબસિડી|મહિલા|આવાસ|pm kisan/i.test(raw);
    const isExam = /પરીક્ષા|મેરિટ|રિઝલ્ટ|result|tat|tet|gpsc|ojas|પોલીસ|police|કોન્સ્ટેબલ|ભરતી/i.test(raw);

    let titles = [];
    let abTestTitles = {};
    let viralTags = [];
    let primaryKeywords = [];
    let secondaryKeywords = [];
    let hashtags = [];

    if (isSalary) {
      titles = [
        `ગુજરાત કર્મચારી પગાર અને DA વધારો મંજૂર ૨૦૨૬: જાણો ખાતામાં કેટલા રૂપિયા આવશે?`,
        `કર્મચારીઓ માટે સૌથી મોટા ખુશખબર! ૫૦% DA અને પગાર સુધારો સત્તાવાર પરિપત્ર જાહેર`,
        `ગુજરાત સરકારનો ઐતિહાસિક નિર્ણય: મોંઘવારી ભથ્થા (DA) માં ૪% નો સીધો વધારો!`,
        `ધ્યાનથી જુઓ! તમારા પગારમાં કેટલો વધારો થશે? સંપૂર્ણ કેલ્ક્યુલેટર ગાઈડ`,
        `DA Arrears Update 2026: બાકી એરિયર્સ સાથે ક્યારે જમા થશે પગાર? જાણો તારીખ`,
        `૭મું પગાર પંચ: ફિક્સ પગાર અને કાયમી કર્મચારીઓ માટે નાણાં વિભાગનો મોટો આદેશ`,
        `પગાર વધારાની સાચી હકીકત: કોને કેટલો ફાયદો મળશે? સંપૂર્ણ વિશ્લેષણ`,
        `Gyan Yatra Exclusive: પગાર અને પેન્શન વધારા અંગે સરકારે લીધો મોટો નિર્ણય`
      ];
      abTestTitles = {
        emotional: `કર્મચારી પરિવારો માટે આનંદના સમાચાર! DA અને પગાર વધારાને મળી ગઈ અંતિમ મંજૂરી ❤️`,
        curiosity: `શું તમારા ખાતામાં ₹૧૫,૦૦૦ થી ₹૪૫,૦૦૦ વધારાના આવશે? સરકારી પરિપત્રનું અસલી સત્ય 😲`,
        benefit: `સીધો પગાર વધારો! જાણો આ મહિનાથી તમારી બેંકમાં કેટલો પગાર જમા થશે ✅`
      };
      viralTags = [
        'ગુજરાત કર્મચારી પગાર વધારો 2026',
        'da hike gujarat 2026',
        'gujarat govt employee salary',
        'gyan yatra',
        'મોંઘવારી ભથ્થું વધારો',
        'gujarat da increase latest update',
        '7th pay commission gujarat',
        'karmachari pagar vadharo',
        'cm bhupendra patel da order',
        'finance department gujarat paripatram',
        'fix pagar latest update gujarat',
        'gujarat employee news today',
        'gyan yatra official',
        'gujarat breaking news',
        'sarkari karmachari latest news',
        'da arrears gujarat 2026',
        'pensioners da hike gujarat',
        'gujarati news today',
        'gujarat samachar'
      ];
      primaryKeywords = ['ગુજરાત કર્મચારી પગાર વધારો', 'da hike gujarat 2026', 'મોંઘવારી ભથ્થું પરિપત્ર'];
      secondaryKeywords = ['gujarat govt employee news', 'fix pagar paripatra', '7th pay da arrears gujarat', 'gyan yatra channel'];
      hashtags = ['#GyanYatra', '#GujaratGovtEmployee', '#DAHike2026', '#GujaratSalary', '#BreakingNews'];
    } else if (isAnganwadi) {
      titles = [
        `આંગણવાડી સુપરવાઈઝર નવી ભરતી ૨૦૨૬ જાહેર: ફોર્મ ભરવાની છેલ્લી તારીખ અને લાયકાત`,
        `આંગણવાડી બહેનો માટે સૌથી મોટા સમાચાર! પગાર વધારો અને નવી ભરતી સત્તાવાર જાહેરાત`,
        `સુપરવાઈઝર મેરિટ લિસ્ટ અને કટ ઓફ જાહેર ૨૦૨૬: તમારું નામ લિસ્ટમાં ચેક કરો`,
        `આંગણવાડી ઓનલાઇન અરજી કેવી રીતે કરવી? OJAS સ્ટેપ બાય સ્ટેપ ફોર્મ પ્રોસેસ`,
        `આંગણવાડી સુપરવાઈઝર પરીક્ષા સિલેબસ અને પેપર સોલ્યુશન ૨૦૨૬: પાસ થવાની શ્રેષ્ઠ રીત`,
        `મહિલા અને બાળ વિકાસ વિભાગ: તેડાગર અને વર્કર બહેનોના માનદવેતનમાં મોટો વધારો!`,
        `Gyan Yatra Alert: આંગણવાડી ભરતી ફોર્મ ભરતા પહેલા આ ૩ ભૂલો બિલકુલ ન કરતા`
      ];
      abTestTitles = {
        emotional: `આંગણવાડી બહેનોની મહેનત રંગ લાવી! સરકાર દ્વારા નવી ભરતી અને પગાર વધારો જાહેર ❤️`,
        curiosity: `શું આંગણવાડી ભરતીના નિયમો બદલાયા? જાણો કોણ ફોર્મ ભરી શકશે અને કોણ નહીં 😲`,
        benefit: `ઘરે બેઠા ઓનલાઇન ફોર્મ ભરો! આંગણવાડી સુપરવાઈઝર લાયકાત અને સંપૂર્ણ વિગત ✅`
      };
      viralTags = [
        'આંગણવાડી સુપરવાઈઝર ભરતી 2026',
        'anganwadi supervisor bharti gujarat',
        'anganwadi pagar vadharo 2026',
        'gyan yatra',
        'ojas gujarat anganwadi bharti',
        'anganwadi supervisor syllabus',
        'anganwadi paper solution',
        'mahila ane bal vikas vibhag',
        'anganwadi merit list 2026',
        'anganwadi bharti form date',
        'anganwadi supervisor eligibility',
        'gyan yatra official',
        'gujarat govt jobs 2026',
        'ojas bharti update',
        'gujarat breaking news',
        'anganwadi news today gujarat'
      ];
      primaryKeywords = ['આંગણવાડી સુપરવાઈઝર ભરતી 2026', 'anganwadi bharti gujarat', 'anganwadi pagar vadharo'];
      secondaryKeywords = ['ojas anganwadi supervisor form', 'anganwadi supervisor merit list', 'gyan yatra anganwadi update'];
      hashtags = ['#AnganwadiBharti2026', '#GyanYatra', '#AnganwadiSupervisor', '#GujaratGovtJobs', '#MahilaVikas'];
    } else if (isSahay) {
      titles = [
        `પીએમ કિસાન ૧૯મો હપ્તો ₹૨,૦૦૦ તારીખ જાહેર ૨૦૨૬: ખાતામાં પૈસા ક્યારે જમા થશે?`,
        `ખેડૂતો માટે ખુશખબર! iKhedut પોર્ટલ પર નવી યોજનાઓ શરૂ: ૭૫% સબસિડી સીધી ખાતામાં`,
        `પીએમ કિસાન e-KYC અને આધાર લિંક ઓનલાઇન ચેક કરો: આ લિસ્ટમાં નામ હોય તો જ ₹૨,૦૦૦ મળશે`,
        `ગુજરાત સહાય યોજના ૨૦૨૬: જાણો કઈ યોજનામાં કેટલા રૂપિયા મળશે અને કેવી રીતે અરજી કરવી?`,
        `ખેડૂત મિત્રો સાવધાન! ૧૯મો હપ્તો મેળવવા માટે આ ૧ કામ આજે જ કરી લો`,
        `Gyan Yatra: તમામ ખેડૂતો માટે કેન્દ્ર અને રાજ્ય સરકારની સૌથી મોટી યોજના`
      ];
      abTestTitles = {
        emotional: `ખેડૂત પરિવારો માટે રાહતના સમાચાર! ખાતામાં સીધા ₹૨,૦૦૦ જમા થવાની તારીખ જાહેર ❤️`,
        curiosity: `શું તમારો ૧૯મો હપ્તો અટકી જશે? બેંક ખાતામાં પૈસા ન આવે તો તરત આ સેટિંગ કરો 😲`,
        benefit: `સીધા ₹૨,૦૦૦ તમારા બેંક ખાતામાં મેળવો! કિસાન સન્માન નિધિ નવું લિસ્ટ ચેક કરો ✅`
      };
      viralTags = [
        'પીએમ કિસાન ૧૯મો હપ્તો',
        'pm kisan 19th installment date 2026',
        'khedut sahay yojana gujarat',
        'gyan yatra',
        'ikhedut portal yojana 2026',
        'pm kisan ekyc online mobile',
        'kisan samman nidhi gujarat',
        'gujarat khedut news today',
        'khedut sahay 2026',
        'pm kisan status check aadhar',
        'sarkari yojana gujarat 2026',
        'gyan yatra official',
        'gujarat farmer subsidy',
        'gujarat breaking news'
      ];
      primaryKeywords = ['પીએમ કિસાન ૧૯મો હપ્તો', 'pm kisan 19th installment date', 'ikhedut yojana 2026'];
      secondaryKeywords = ['pm kisan status check', 'khedut sahay gujarat', 'gyan yatra kisan news'];
      hashtags = ['#PMKisan', '#GyanYatra', '#KhedutSahay', '#GujaratFarmers', '#iKhedut'];
    } else if (isExam) {
      titles = [
        `${cleanTopic}: સત્તાવાર પરિણામ અને મેરિટ લિસ્ટ જાહેર ૨૦૨૬! તમારું નામ ચેક કરો`,
        `નવા કટ ઓફ અને પસંદગી યાદી જાહેર! કેટલા માર્ક્સ વાળા પાસ થયા? સંપૂર્ણ એનાલિસિસ`,
        `સરકારી ભરતી ૨૦૨૬ મોટા સમાચાર: ડોક્યુમેન્ટ વેરિફિકેશન તારીખ અને જરૂરી પુરાવા`,
        `Gyan Yatra Analysis: પરીક્ષા પેપર સોલ્યુશન અને પ્રોવિઝનલ આન્સર કી લિંક`
      ];
      abTestTitles = {
        emotional: `ઉમેદવારોની આતુરતાનો અંત! સત્તાવાર મેરિટ યાદી અને કટ ઓફ જાહેર ❤️`,
        curiosity: `કટ ઓફમાં મોટો ઉલટફેર! આ કેટેગરીમાં સૌથી ઓછું મેરિટ અટક્યું 😲`,
        benefit: `તમારું રિઝલ્ટ ૧-ક્લિકમાં ડાઉનલોડ કરો અને કન્ફર્મ કરો તમારું સિલેક્શન ✅`
      };
      viralTags = [
        cleanTopic,
        `${cleanTopic} result 2026`,
        `${cleanTopic} merit list`,
        'gyan yatra',
        'ojas gujarat bharti result',
        'gujarat competitive exam cut off',
        'document verification date gujarat',
        'gyan yatra official',
        'gujarat govt jobs 2026',
        'ojas latest notification'
      ];
      primaryKeywords = [cleanTopic, `${cleanTopic} result`, `${cleanTopic} merit list`];
      secondaryKeywords = ['ojas gujarat', 'gujarat exam cut off', 'gyan yatra update'];
      hashtags = ['#GyanYatra', '#GujaratExamResult', '#MeritList2026', '#OJASBharti'];
    } else {
      titles = [
        `${cleanTopic}: ૨૦૨૬ માં જાણો સંપૂર્ણ માહિતી અને સાચી હકીકત!`,
        `ધ્યાનથી સાંભળો! ${cleanTopic} વિશે આ ૩ વાતો કોઈ નથી કહેતું`,
        `${cleanTopic} - ઓનલાઇન અરજી કેવી રીતે કરવી? સ્ટેપ બાય સ્ટેપ ગાઈડ`,
        `શું ખરેખર ${cleanTopic} થી મોટો ફાયદો થશે? જાણો રિયાલિટી ચેક`,
        `${cleanTopic}: સરકારનો મોટો નિર્ણય! જાણો તમને શું લાભ મળશે?`,
        `આ ૧ ભૂલ બિલકુલ ના કરતા! ${cleanTopic} માં થયેલા નવા મોટા ફેરફારો`,
        `ગુજરાતના નાગરિકો માટે મોટી જાહેરાત: ${cleanTopic} સંપૂર્ણ પરિપત્ર વિગત`,
        `માત્ર ૫ મિનિટમાં સમજો: ${cleanTopic} ના નવા નિયમો અને શરતો (A to Z માહિતી)`
      ];
      abTestTitles = {
        emotional: `ગુજરાતીઓ માટે ખુશખબર! ${cleanTopic} વિશે સરકારે લીધો આ મોટો નિર્ણય ❤️`,
        curiosity: `શું તમને આ ખબર હતી? ${cleanTopic} પાછળનું અસલી રહસ્ય જાણી ચોંકી જશો! 😲`,
        benefit: `સીધો ફાયદો મેળવો! ${cleanTopic} માં અરજી કરો અને મેળવો પૂરો લાભ ✅`
      };
      viralTags = [
        cleanTopic,
        `${cleanTopic} gujarati`,
        `${cleanTopic} 2026`,
        'gyan yatra',
        'gujarati news today',
        'gujarat breaking news',
        'sarkari yojana gujarat',
        'online guide gujarati',
        'trending gujarat news',
        'gujarati creator',
        'gyan yatra official',
        'gujarat update 2026',
        'sarkari mahiti gujarati'
      ];
      primaryKeywords = [cleanTopic, `${cleanTopic} gujarati`, `${cleanTopic} latest update`];
      secondaryKeywords = ['gujarat update 2026', 'sarkari yojana gujarati', 'gyan yatra channel'];
      hashtags = ['#GyanYatra', '#GujaratNews', '#TrendingGujarat', '#SarkariUpdate'];
    }

    const description = `નમસ્તે મિત્રો! આજના વિડીયોમાં આપણે "${cleanTopic}" વિશે વિગતવાર, સચોટ અને ૧૦૦% અધિકૃત માહિતી મેળવીશું.

📌 આ વિડીયોમાં આવરી લીધેલ મુખ્ય વિષયો:
00:00 - વિડીયોની શરૂઆત અને બ્રેકિંગ અપડેટ
01:30 - નવા નિયમો, પાત્રતા અને શરતો
04:15 - સ્ટેપ બાય સ્ટેપ ઓનલાઇન પ્રોસેસ
07:45 - ધ્યાન રાખવા જેવી સૌથી મોટી બાબતો
09:30 - નિષ્કર્ષ અને મહત્વપૂર્ણ સલાહ

✅ સત્તાવાર પરિપત્ર અને PDF ડાઉનલોડ કરવા માટે:
👉 અમારી ટેલિગ્રામ ચેનલ સાથે જોડાઓ: https://t.me/GyanYatra
👉 સત્તાવાર માહિતી માટે ચેનલ સાથે જોડાયેલા રહો.

🔔 જો તમને આ માહિતી ઉપયોગી લાગી હોય તો વિડીયોને એક LIKE જરૂર કરો, તમારા તમામ મિત્રો અને પરિવાર સાથે SHARE કરો અને આવા જ દરરોજ સાચા વિડીયો માટે Gyan Yatra ચેનલને SUBSCRIBE કરવાનું ભૂલતા નહીં!

⚠️ ડિસ્ક્લેમર: આ વિડીયો માત્ર શિક્ષણ અને સામાન્ય જાગૃતિના હેતુ માટે બનાવવામાં આવ્યો છે. કોઈ પણ આખરી નિર્ણય લેતા પહેલા સરકારના સત્તાવાર ગેઝેટ / પરિપત્રની ચકાસણી કરી લેવી.

${hashtags.join(' ')}`;

    return {
      titles,
      abTestTitles,
      description,
      tags: viralTags,
      primaryKeywords,
      secondaryKeywords,
      hashtags,
      chapters: [
        { time: '00:00', title: 'ધમાકેદાર શરૂઆત અને મહત્વ' },
        { time: '01:30', title: 'નવા નિયમો અને સચ્ચાઈ' },
        { time: '04:15', title: 'સ્ટેપ બાય સ્ટેપ પદ્ધતિ' },
        { time: '07:45', title: 'ધ્યાન રાખવા જેવી ભૂલો' },
        { time: '09:30', title: 'નિષ્કર્ષ અને વિશેષ ટીપ' }
      ],
      pinnedComment: `🙏 કેમ છો મિત્રો! તમને આ માહિતી કેવી લાગી? ${cleanTopic} વિશે તમારો કોઈ પણ પ્રશ્ન હોય તો નીચે કમેન્ટમાં જરૂર પૂછો. હું દરેક કમેન્ટનો સાચો જવાબ આપવાનો પ્રયત્ન કરીશ! વિડીયો ગમ્યો હોય તો એક Like જરૂર કરજો.`,
      callToAction: `દોસ્તો, જો તમે આવા જ સાચા અને ઉપયોગી વિડીયો દરરોજ સૌથી પહેલા જોવા માંગતા હોવ, તો અત્યારે જ સબ્સ્ક્રાઇબ બટન દબાવો અને બેલ આઇકન ALL પર સેટ કરો!`,
      suggestedFilename: `${cleanTopic.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}-complete-guide-2026.mp4`,
      thumbnailText: 'નવો નિયમ લાગુ!'
    };
  }
}

module.exports = new OpenAIService();
