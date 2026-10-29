/**
 * Global Video Project State Manager
 * Seamlessly connects: Topic ➔ Script ➔ Voice Audio ➔ Slides ➔ SEO & Thumbnail ➔ Save & Share
 */

const STORAGE_KEY = 'gyan_yatra_active_project';

const defaultProject = {
  id: 'proj_' + Date.now(),
  topic: 'ગુજરાત કર્મચારી પગાર અને DA વધારો 2026',
  masterPrompt: '',
  script: {
    title: 'ગુજરાત કર્મચારી પગાર અને DA વધારો 2026: સત્તાવાર નિર્ણય',
    durationMinutes: 10,
    sections: [
      {
        sectionName: 'ધમાકેદાર શરૂઆત (Hook)',
        timeRange: '0:00 - 0:50',
        content: 'નમસ્તે મિત્રો! આજના વિડીયોમાં આપણે વાત કરીશું ગુજરાત સરકારી કર્મચારીઓ અને પેન્શનર્સના મોંઘવારી ભથ્થા એટલે કે DA અને પગાર વધારાના સત્તાવાર નિર્ણય વિશે. ગાંધીનગર સચિવાલય દ્વારા નવો પરિપત્ર જાહેર કરી દેવામાં આવ્યો છે.',
        directorNotes: 'કેમેરા તરફ સીધી નજર, પોઝિટિવ મુસ્કાન'
      },
      {
        sectionName: 'મુખ્ય સત્તાવાર વિગત',
        timeRange: '0:50 - 3:30',
        content: 'નાણાં વિભાગ દ્વારા લેવાયેલા નિર્ણય મુજબ કર્મચારીઓના મૂળ પગાર અને ભથ્થામાં ચોક્કસ ટકાવારીનો વધારો મંજૂર થયો છે. આ વધારો કઈ તારીખથી ખાતામાં જમા થશે અને કેટલો એરિયર્સ મળશે તેની સ્પષ્ટ ગણતરી આગળ જોઈશું.',
        directorNotes: 'પરિપત્ર અને નાણાં વિભાગ જીઆર સ્ક્રીન પર દર્શાવવા'
      },
      {
        sectionName: 'ખાતામાં જમા થવાની તારીખ અને ગણતરી',
        timeRange: '3:30 - 7:00',
        content: 'જે કર્મચારીઓ નિયમિત સેવામાં છે તેમને સીધો પગાર સ્લિપમાં આ રકમ ઉમેરાયેલી જોવા મળશે. પેન્શનર્સને પણ ટ્રેઝરી મારફતે સીધી ચૂકવણી કરવામાં આવશે. કોઈપણ વચેટીયાની વાતમાં આવવું નહીં.',
        directorNotes: 'ટેબલ અને કેલ્ક્યુલેશન ગ્રાફિક્સ દર્શાવવા'
      },
      {
        sectionName: 'સમાપન અને કોલ ટુ એક્શન',
        timeRange: '7:00 - 8:30',
        content: 'આ વિડીયો તમારા તમામ કર્મચારી મિત્રો અને વોટ્સએપ ગ્રૂપમાં શેર કરજો જેથી સાચી માહિતી પહોંચે. આપણી ચેનલ જ્ઞાન યાત્રાને સબ્સ્ક્રાઇબ કરી લેજો. જય હિન્દ, જય જય ગરવી ગુજરાત!',
        directorNotes: 'સબ્સ્ક્રાઇબ બટન અને વિદાય'
      }
    ]
  },
  voiceAudio: {
    audioUrl: '/audio/my_real_cloned_voice.mp3',
    filename: 'my_real_cloned_voice.mp3',
    provider: '👑 ElevenLabs STS v2 (My Real Voice)'
  },
  slides: [
    {
      id: 1,
      title: 'ગુજરાત પગાર અને DA વધારો',
      subtitle: 'મુખ્યમંત્રીશ્રીનો સત્તાવાર નિર્ણય',
      bulletPoints: [
        'ગાંધીનગર સચિવાલય દ્વારા પરિપત્ર જાહેર',
        'લાખો કર્મચારીઓ અને પેન્શનર્સને મોટો ફાયદો',
        'આ મહિનાથી જ ખાતામાં જમા'
      ],
      audioTime: '0:00 - 0:50',
      bgColor: '#FFFFFF',
      textColor: '#0F172A',
      accentColor: '#DC2626'
    },
    {
      id: 2,
      title: 'કોને કોને લાભ મળશે?',
      subtitle: 'પાત્રતા અને નિયમો',
      bulletPoints: [
        'રાજ્ય સરકારના તમામ કાયમી કર્મચારીઓ',
        'પંચાયત અને બોર્ડ નિગમના સ્ટાફ',
        'તમામ નિવૃત્ત પેન્શનર્સ અને ફેમિલી પેન્શનર્સ'
      ],
      audioTime: '0:50 - 3:30',
      bgColor: '#FFFFFF',
      textColor: '#0F172A',
      accentColor: '#2563EB'
    },
    {
      id: 3,
      title: 'ખાતામાં ક્યારે જમા થશે?',
      subtitle: 'તારીખ અને એરિયર્સ વિગત',
      bulletPoints: [
        'ચાલુ માસના પગાર સાથે સીધા ખાતામાં',
        'પાછલી બાકી રકમ (Arrears) હપ્તાવાર ચૂકવાશે',
        'ઓનલાઇન પગાર સ્લિપમાં ચકાસી શકાશે'
      ],
      audioTime: '3:30 - 7:00',
      bgColor: '#FFFFFF',
      textColor: '#0F172A',
      accentColor: '#10B981'
    },
    {
      id: 4,
      title: 'મહત્વની ચેતવણી & શેર કરો',
      subtitle: 'જ્ઞાન યાત્રા સત્તાવાર અપડેટ',
      bulletPoints: [
        'કોઈ પણ ખોટી અફવાઓથી સાવચેત રહેવું',
        'સત્તાવાર ઓર્ડર ડિસ્ક્રિપ્શનમાં આપેલો છે',
        'તમામ મિત્રો સાથે શેર કરો અને સબ્સ્ક્રાઇબ કરો'
      ],
      audioTime: '7:00 - 8:30',
      bgColor: '#FFFFFF',
      textColor: '#0F172A',
      accentColor: '#DC2626'
    }
  ],
  seo: {
    title: 'ગુજરાત કર્મચારી પગાર અને DA વધારો મંજૂર 2026: સત્તાવાર પરિપત્ર જાહેર!',
    description: `ગુજરાત સરકાર દ્વારા કર્મચારીઓ અને પેન્શનર્સ માટે મોંઘવારી ભથ્થા (DA) અને પગાર વધારાની સત્તાવાર જાહેરાત કરવામાં આવી છે. સંપૂર્ણ વિગત, તારીખ અને પરિપત્ર આ વિડીયોમાં જુઓ.

📌 મુખ્ય મુદ્દાઓ:
00:00 - પગાર અને DA વધારો સત્તાવાર જાહેરાત
01:30 - પાત્રતા અને લાભાર્થીઓ
04:00 - ખાતામાં જમા થવાની તારીખ
07:00 - મહત્વની ચેતવણી

#GujaratGovt #SalaryHike #DAHike #GyanYatra #GujaratNews`,
    tags: 'gujarat salary hike, da hike gujarat, gujarat govt employee da, gujarat salary update 2026, bhupendra patel salary announcement, gyan yatra, gujarati news'
  },
  thumbnail: {
    gujaratiWords: 'પગાર અને DA વધારો મંજૂર',
    photoSubject: 'ગુજરાતના મુખ્યમંત્રીશ્રી ભૂપેન્દ્ર પટેલનો વાસ્તવિક સત્તાવાર ફોટો',
    dalleShortPrompt: 'A minimalist 16:9 YouTube thumbnail. Pure solid white background (#FFFFFF). On the left: Exactly ONE real authentic photograph of the Chief Minister of Gujarat, Bhupendra Patel, in traditional clean white kurta at an official press briefing podium looking at camera with a confident expression. On the right: Exactly 4 large ultra-bold clean text words in deep navy blue: "GUJARAT SALARY DA HIKE". Ultra clean, high contrast, zero clutter, strictly photorealistic, absolutely NO 3D cartoon, NO neon.'
  },
  updatedAt: new Date().toISOString()
};

class ProjectStateManager {
  constructor() {
    this.project = this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return { ...defaultProject, ...JSON.parse(data) };
      }
    } catch (e) {
      console.warn('Could not load project state:', e);
    }
    return { ...defaultProject };
  }

  save() {
    try {
      this.project.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.project));
      window.dispatchEvent(new CustomEvent('projectStateUpdated', { detail: this.project }));
    } catch (e) {
      console.warn('Could not save project state:', e);
    }
  }

  getProject() {
    return this.project;
  }

  updateProject(updates) {
    this.project = { ...this.project, ...updates };
    this.save();
    return this.project;
  }

  setTopic(topic, masterPrompt = '') {
    this.project.topic = topic;
    if (masterPrompt) this.project.masterPrompt = masterPrompt;
    this.save();
  }

  setScript(scriptData) {
    this.project.script = scriptData;
    // Automatically generate slide outlines if sections exist
    if (scriptData.sections && scriptData.sections.length > 0) {
      this.project.slides = scriptData.sections.map((sec, idx) => ({
        id: idx + 1,
        title: sec.sectionName,
        subtitle: sec.timeRange || `ભાગ ${idx + 1}`,
        bulletPoints: sec.content
          .split(/[.।!]/)
          .map(s => s.trim())
          .filter(s => s.length > 10)
          .slice(0, 3),
        audioTime: sec.timeRange || '',
        bgColor: '#FFFFFF',
        textColor: '#0F172A',
        accentColor: idx === 0 ? '#DC2626' : idx === 1 ? '#2563EB' : '#10B981'
      }));
    }
    this.save();
  }

  setVoiceAudio(audioData) {
    this.project.voiceAudio = audioData;
    this.save();
  }

  setSlides(slides) {
    this.project.slides = slides;
    this.save();
  }

  setSEO(seoData) {
    this.project.seo = seoData;
    this.save();
  }

  setThumbnail(thumbData) {
    this.project.thumbnail = thumbData;
    this.save();
  }

  // Generates single clean export bundle text
  generateCompleteExportText() {
    const p = this.project;
    return `=======================================================
🎯 GYAN YATRA CREATOR STUDIO - વિડીયો પ્રોજેક્ટ પેકેજ
=======================================================
📌 વિષય (Topic): ${p.topic}
🕒 સેવ કરેલ સમય: ${new Date(p.updatedAt).toLocaleString('gu-IN')}

-------------------------------------------------------
📝 ૧. સ્ક્રિપ્ટ (Video Script):
-------------------------------------------------------
શીર્ષક: ${p.script.title || p.topic}
કુલ સમય: ${p.script.durationMinutes || 10} મિનિટ

${(p.script.sections || []).map((sec, i) => `[${i + 1}. ${sec.sectionName} (${sec.timeRange || ''})]
${sec.content}
`).join('\n')}

-------------------------------------------------------
🎙️ ૨. ઓડિયો નેરેશન (Voice Audio):
-------------------------------------------------------
ઓડિયો URL: ${p.voiceAudio?.audioUrl || 'N/A'}
ફાઇલ નામ: ${p.voiceAudio?.filename || 'N/A'}
પ્રોવાઇડર: ${p.voiceAudio?.provider || 'ElevenLabs STS v2 (My Real Cloned Voice)'}

-------------------------------------------------------
🎬 ૩. સ્લાઇડ્સ માળખું (Slide-by-Slide Outline):
-------------------------------------------------------
${(p.slides || []).map((s, i) => `સ્લાઇડ #${i + 1}: ${s.title} (${s.audioTime || ''})
- ${s.subtitle}
- મુદ્દાઓ:
  * ${(s.bulletPoints || []).join('\n  * ')}
`).join('\n')}

-------------------------------------------------------
🚀 ૪. YOUTUBE SEO (Title, Description & Tags):
-------------------------------------------------------
[Title]:
${p.seo.title}

[Description]:
${p.seo.description}

[Tags]:
${p.seo.tags}

-------------------------------------------------------
🎨 ૫. થંબનેલ પ્લાન (1 Photo + 4 Words Pure White):
-------------------------------------------------------
મેઈન શબ્દો: "${p.thumbnail?.gujaratiWords || ''}"
અસલી ફોટો: ${p.thumbnail?.photoSubject || ''}
DALL-E 3 શોર્ટ પ્રોમ્પ્ટ:
${p.thumbnail?.dalleShortPrompt || ''}

=======================================================
જ્ઞાન યાત્રા - Gujarati YouTube Creator Studio
=======================================================`;
  }
}

export const projectState = new ProjectStateManager();
