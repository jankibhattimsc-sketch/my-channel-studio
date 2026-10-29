/**
 * Multi-Project State Manager (v3)
 * Supports multiple isolated video projects:
 * Idea ➔ Slide ➔ Script ➔ Voice ➔ Editing ➔ Canva ➔ SEO ➔ Thumbnail
 * Auto-saves per-project and restores work upon reopening.
 */

const STORAGE_PROJECTS_KEY = 'gyan_yatra_projects_v3';
const STORAGE_ACTIVE_ID_KEY = 'gyan_yatra_active_project_id_v3';
const LEGACY_KEY = 'gyan_yatra_active_project';

export function createBlankProject(name = '', topic = '', category = 'સરકારી યોજના') {
  const pId = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const pTopic = topic || name || 'નવો વિડીયો વિષય ' + new Date().toLocaleDateString('gu-IN');
  const pName = name || pTopic;

  return {
    id: pId,
    name: pName,
    topic: pTopic,
    category: category,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    
    // 8 Core Tools State
    idea: {
      topic: pTopic,
      masterPrompt: '',
      notes: '',
      isCompleted: false
    },
    slide: {
      tool2Prompt: '',
      slideCount: '8-10',
      template: 'white-real',
      notes: '',
      slides: [
        {
          id: 1,
          title: pName,
          subtitle: 'સત્તાવાર નિર્ણય & વિગત',
          bulletPoints: ['મહત્વપૂર્ણ જાહેરાત પરિપત્ર', 'લાભાર્થી પાત્રતા અને નિયમો', 'ખાતામાં જમા થવાની તારીખ'],
          audioTime: '0:00 - 0:50',
          bgColor: '#FFFFFF',
          textColor: '#0F172A',
          accentColor: '#DC2626'
        }
      ],
      isCompleted: false
    },
    script: {
      title: pName + ': સત્તાવાર માહિતી',
      durationMinutes: 10,
      sections: [
        {
          sectionName: 'ધમાકેદાર શરૂઆત (Hook)',
          timeRange: '0:00 - 0:50',
          content: `નમસ્તે મિત્રો! આજના વિડીયોમાં આપણે વાત કરીશું "${pName}" વિશે. સત્તાવાર પરિપત્ર અને નિયમો જાહેર થઈ ગયા છે. સંપૂર્ણ વિગત આ વિડીયોમાં જોઈશું.`,
          directorNotes: 'કેમેરા તરફ સીધી નજર, પોઝિટિવ મુસ્કાન'
        },
        {
          sectionName: 'મુખ્ય સત્તાવાર વિગત',
          timeRange: '0:50 - 3:30',
          content: 'સત્તાવાર નિર્ણય મુજબ મહત્વના ફેરફાર અને નિયમો જાહેર કરવામાં આવ્યા છે. કોને લાભ મળશે અને શું પ્રક્રિયા છે તે વિગતવાર સમજીએ.',
          directorNotes: 'સ્ક્રીન પર પરિપત્ર અને પુરાવા દર્શાવવા'
        },
        {
          sectionName: 'લાભ અને ગણતરી',
          timeRange: '3:30 - 7:00',
          content: 'લાભાર્થીઓને સીધી ચૂકવણી અથવા લાભ મળશે. કોઈપણ વચેટીયાની વાતમાં આવવું નહીં, સત્તાવાર પોર્ટલ પરથી જ માહિતી મેળવવી.',
          directorNotes: 'ટેબલ અને કેલ્ક્યુલેશન ગ્રાફિક્સ'
        },
        {
          sectionName: 'સમાપન અને કોલ ટુ એક્શન',
          timeRange: '7:00 - 8:30',
          content: 'આ વિડીયો તમારા તમામ મિત્રો અને વોટ્સએપ ગ્રૂપમાં શેર કરજો. આપણી ચેનલ જ્ઞાન યાત્રાને સબ્સ્ક્રાઇબ કરી લેજો. જય હિન્દ, જય જય ગરવી ગુજરાત!',
          directorNotes: 'સબ્સ્ક્રાઇબ બટન અને વિદાય'
        }
      ],
      isCompleted: false
    },
    voice: {
      audioUrl: '',
      filename: '',
      provider: '👑 ElevenLabs STS v2 (My Real Voice)',
      notes: '',
      isCompleted: false
    },
    editing: {
      aspectRatio: '16:9',
      fps: '60fps',
      resolution: '1080p Full HD',
      musicStyle: 'સોફ્ટ ઇન્સ્પિરેશનલ ન્યૂઝ ટોન (Soft News Tone)',
      customNotes: '• Intro 0:50 સુધી હૂક રાખવો\n• વચ્ચે સ્લાઇડ ચેન્જ વખતે ડીંગ સાઉન્ડ\n• સરકારી પરિપત્ર પર હાઇલાઇટ યલો બોક્સ કરવું',
      checklist: {
        introHook: false,
        cutDeadSpace: false,
        addSlides: false,
        soundFx: false,
        colorCorrection: false,
        outroSubscribe: false
      },
      isCompleted: false
    },
    canva: {
      headline: pName,
      subtitle: 'સત્તાવાર પરિપત્ર & સંપૂર્ણ વિગત | જ્ઞાન યાત્રા',
      badgeText: '🔥 નવી જાહેરાત',
      designUrl: 'https://www.canva.com/create/youtube-thumbnails/',
      notes: '',
      isCompleted: false
    },
    seo: {
      title: `${pName} 2026: સત્તાવાર પરિપત્ર જાહેર!`,
      description: `સત્તાવાર નિર્ણય અને નવી વિગત આ વિડીયોમાં વિગતવાર સમજો.\n\n📌 મુખ્ય ટાઇમસ્ટેમ્પ:\n00:00 - પરિચય\n00:50 - સત્તાવાર વિગત\n03:30 - લાભાર્થી વિગત\n07:00 - સમાપન\n\n#GyanYatra #GujaratGovt #GujaratNews`,
      tags: `${pName.toLowerCase()}, gujarat news, gyan yatra, gujarat update 2026, official circular`,
      pinnedComment: `📌 સત્તાવાર પરિપત્ર અને ફોર્મ લિંક માટે કોમેન્ટ કરો અથવા ટેલિગ્રામ ગ્રૂપ જોઈન કરો! આપણી ચેનલ જ્ઞાન યાત્રાને સબ્સ્ક્રાઇબ કરો.`,
      isCompleted: false
    },
    thumbnail: {
      gujaratiWords: pName.length > 25 ? pName.substring(0, 25) : pName,
      photoSubject: 'સત્તાવાર જાહેરાત સંદર્ભ ફોટો',
      dalleShortPrompt: `A minimalist 16:9 YouTube thumbnail. Pure solid white background (#FFFFFF). On the left: One authentic real photograph related to ${pName}. On the right: Exactly 4 large bold text words in deep navy blue. High contrast, clean, photorealistic, zero clutter.`,
      notes: '',
      isCompleted: false
    }
  };
}

class ProjectStateManager {
  constructor() {
    this.projects = this.loadProjects();
    this.activeProjectId = this.loadActiveId();
    this.ensureActiveProject();
  }

  loadProjects() {
    try {
      const stored = localStorage.getItem(STORAGE_PROJECTS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }

      // Check legacy single project
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        try {
          const legObj = JSON.parse(legacy);
          const migrated = createBlankProject(legObj.topic || 'ગુજરાત કર્મચારી પગાર અને DA વધારો 2026', legObj.topic);
          if (legObj.script) migrated.script = { ...migrated.script, ...legObj.script };
          if (legObj.slides) migrated.slide.slides = legObj.slides;
          if (legObj.seo) migrated.seo = { ...migrated.seo, ...legObj.seo };
          if (legObj.thumbnail) migrated.thumbnail = { ...migrated.thumbnail, ...legObj.thumbnail };
          if (legObj.voiceAudio) migrated.voice = { ...migrated.voice, ...legObj.voiceAudio };
          return [migrated];
        } catch (e) {
          console.warn('Legacy migration failed:', e);
        }
      }
    } catch (e) {
      console.warn('Could not load projects list:', e);
    }

    // Default starter project
    const defaultProj = createBlankProject('ગુજરાત કર્મચારી પગાર અને DA વધારો 2026', 'ગુજરાત કર્મચારી પગાર અને DA વધારો 2026', 'સરકારી યોજના');
    return [defaultProj];
  }

  loadActiveId() {
    try {
      const id = localStorage.getItem(STORAGE_ACTIVE_ID_KEY);
      if (id && this.projects.some(p => p.id === id)) {
        return id;
      }
    } catch (e) {}
    return this.projects[0]?.id || '';
  }

  ensureActiveProject() {
    if (!this.projects || this.projects.length === 0) {
      const p = createBlankProject('મારો પ્રથમ પ્રોજેક્ટ', 'ગુજરાત નવી યોજના 2026');
      this.projects = [p];
      this.activeProjectId = p.id;
      this.saveProjects();
    } else if (!this.activeProjectId || !this.projects.some(p => p.id === this.activeProjectId)) {
      this.activeProjectId = this.projects[0].id;
      this.saveProjects();
    }
  }

  saveProjects() {
    try {
      localStorage.setItem(STORAGE_PROJECTS_KEY, JSON.stringify(this.projects));
      localStorage.setItem(STORAGE_ACTIVE_ID_KEY, this.activeProjectId);
      
      // Keep legacy active project synced for older components
      const active = this.getActiveProject();
      if (active) {
        const legacyFormat = {
          id: active.id,
          topic: active.topic || active.name,
          masterPrompt: active.idea?.masterPrompt || '',
          script: active.script,
          voiceAudio: active.voice,
          slides: active.slide?.slides || [],
          seo: active.seo,
          thumbnail: active.thumbnail,
          updatedAt: active.updatedAt
        };
        localStorage.setItem(LEGACY_KEY, JSON.stringify(legacyFormat));
      }

      window.dispatchEvent(new CustomEvent('projectsListUpdated', { detail: this.projects }));
      window.dispatchEvent(new CustomEvent('projectStateUpdated', { detail: active }));
    } catch (e) {
      console.warn('Could not save projects to localStorage:', e);
    }
  }

  getProjects() {
    return this.projects;
  }

  getActiveProjectId() {
    return this.activeProjectId;
  }

  getActiveProject() {
    let p = this.projects.find(item => item.id === this.activeProjectId);
    if (!p) {
      this.ensureActiveProject();
      p = this.projects[0];
    }
    return p;
  }

  // Alias for backwards compatibility
  getProject() {
    const active = this.getActiveProject();
    if (!active) return createBlankProject();
    return {
      ...active,
      topic: active.topic || active.name,
      slides: active.slide?.slides || [],
      voiceAudio: active.voice || {}
    };
  }

  getTopic() {
    const active = this.getActiveProject();
    return active ? (active.topic || active.name) : '';
  }

  setActiveProject(projectId) {
    if (this.projects.some(p => p.id === projectId)) {
      this.activeProjectId = projectId;
      this.saveProjects();
      return this.getActiveProject();
    }
    return null;
  }

  createProject(name, topic = '', category = 'સરકારી યોજના') {
    const newProj = createBlankProject(name, topic, category);
    this.projects.unshift(newProj);
    this.activeProjectId = newProj.id;
    this.saveProjects();
    return newProj;
  }

  renameProject(projectId, newName) {
    const p = this.projects.find(item => item.id === projectId);
    if (p) {
      p.name = newName.trim();
      p.topic = newName.trim();
      p.updatedAt = new Date().toISOString();
      if (p.idea) p.idea.topic = newName.trim();
      this.saveProjects();
      return true;
    }
    return false;
  }

  duplicateProject(projectId) {
    const orig = this.projects.find(item => item.id === projectId);
    if (!orig) return null;

    const copy = JSON.parse(JSON.stringify(orig));
    copy.id = 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    copy.name = orig.name + ' (કોપી)';
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = new Date().toISOString();

    const origIdx = this.projects.findIndex(item => item.id === projectId);
    this.projects.splice(origIdx + 1, 0, copy);
    this.activeProjectId = copy.id;
    this.saveProjects();
    return copy;
  }

  deleteProject(projectId) {
    if (this.projects.length <= 1) {
      alert('ઓછામાં ઓછો એક પ્રોજેક્ટ રહેવો જરૂરી છે! (Cannot delete the only project)');
      return false;
    }
    const idx = this.projects.findIndex(item => item.id === projectId);
    if (idx !== -1) {
      this.projects.splice(idx, 1);
      if (this.activeProjectId === projectId) {
        this.activeProjectId = this.projects[0].id;
      }
      this.saveProjects();
      return true;
    }
    return false;
  }

  updateActiveProject(updates) {
    const active = this.getActiveProject();
    if (!active) return null;

    Object.assign(active, updates);
    active.updatedAt = new Date().toISOString();
    this.saveProjects();
    return active;
  }

  // Update specific tool in active project
  updateTool(toolName, data) {
    const active = this.getActiveProject();
    if (!active) return;

    if (!active[toolName]) {
      active[toolName] = {};
    }
    active[toolName] = { ...active[toolName], ...data };
    active.updatedAt = new Date().toISOString();

    // Sync legacy properties
    if (toolName === 'idea' && data.topic) {
      active.topic = data.topic;
      active.name = data.topic;
    }
    if (toolName === 'slide' && data.slides) {
      active.slides = data.slides;
    }
    if (toolName === 'voice') {
      active.voiceAudio = active.voice;
    }

    this.saveProjects();
  }

  // Backwards compatibility methods
  setTopic(topic, masterPrompt = '') {
    this.updateTool('idea', { topic, masterPrompt });
    const active = this.getActiveProject();
    if (active) {
      active.topic = topic;
      active.name = topic;
      active.updatedAt = new Date().toISOString();
      this.saveProjects();
    }
  }

  setScript(scriptData) {
    this.updateTool('script', scriptData);
    const active = this.getActiveProject();
    if (active && scriptData.sections && scriptData.sections.length > 0) {
      const slides = scriptData.sections.map((sec, idx) => ({
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
      this.updateTool('slide', { slides });
    }
  }

  setVoiceAudio(audioData) {
    this.updateTool('voice', audioData);
  }

  setSlides(slides) {
    this.updateTool('slide', { slides });
  }

  setSEO(seoData) {
    this.updateTool('seo', seoData);
  }

  setThumbnail(thumbData) {
    this.updateTool('thumbnail', thumbData);
  }

  updateProject(updates) {
    return this.updateActiveProject(updates);
  }

  // Calculate project completion percentage (0 - 100%)
  getProjectProgress(proj) {
    if (!proj) return 0;
    let score = 0;
    const total = 8;

    if (proj.idea?.topic && proj.idea?.topic !== 'નવો વિડીયો વિષય') score++;
    if (proj.slide?.slides?.length > 1) score++;
    if (proj.script?.sections?.length > 1) score++;
    if (proj.voice?.audioUrl || proj.voice?.notes) score++;
    if (proj.editing?.customNotes || Object.values(proj.editing?.checklist || {}).some(v => v)) score++;
    if (proj.canva?.notes || proj.canva?.headline) score++;
    if (proj.seo?.title && proj.seo?.description) score++;
    if (proj.thumbnail?.gujaratiWords || proj.thumbnail?.dalleShortPrompt) score++;

    return Math.round((score / total) * 100);
  }

  // Export all projects as JSON for backup
  exportAllProjectsJSON() {
    return JSON.stringify({
      version: '3.0',
      exportedAt: new Date().toISOString(),
      activeProjectId: this.activeProjectId,
      projects: this.projects
    }, null, 2);
  }

  // Import projects from JSON
  importProjectsJSON(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (Array.isArray(data.projects) && data.projects.length > 0) {
        this.projects = data.projects;
        this.activeProjectId = data.activeProjectId || this.projects[0].id;
        this.saveProjects();
        return { success: true, count: this.projects.length };
      }
      return { success: false, error: 'અમાન્ય ફાઇલ ફોર્મેટ (Invalid JSON)' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Generates single clean export bundle text for active project
  generateCompleteExportText() {
    const p = this.getActiveProject();
    if (!p) return '';

    return `=======================================================
🎯 GYAN YATRA CREATOR STUDIO - વિડીયો પ્રોજેક્ટ પેકેજ
=======================================================
📁 પ્રોજેક્ટ નામ: ${p.name}
📌 વિષય (Topic): ${p.topic || p.name}
🕒 છેલ્લે સેવ કરેલ સમય: ${new Date(p.updatedAt).toLocaleString('gu-IN')}
📊 પ્રગતિ (Progress): ${this.getProjectProgress(p)}%

-------------------------------------------------------
💡 ૧. આઈડિયા (Idea & Topic):
-------------------------------------------------------
વિષય: ${p.idea?.topic || p.name}
નોંધ: ${p.idea?.notes || 'N/A'}

-------------------------------------------------------
📑 ૨. સ્લાઇડ્સ (Slides Outline):
-------------------------------------------------------
${(p.slide?.slides || []).map((s, i) => `[સ્લાઇડ #${i + 1}] ${s.title} (${s.audioTime || ''})
  - ${s.subtitle}
  - મુદ્દા: ${(s.bulletPoints || []).join(' | ')}
`).join('\n')}

-------------------------------------------------------
📝 ૩. સ્ક્રિપ્ટ (Video Script):
-------------------------------------------------------
શીર્ષક: ${p.script?.title || p.name}
સમય: ${p.script?.durationMinutes || 10} મિનિટ

${(p.script?.sections || []).map((sec, i) => `[${i + 1}. ${sec.sectionName} (${sec.timeRange || ''})]
${sec.content}
`).join('\n')}

-------------------------------------------------------
🎙️ ૪. મારો અવાજ (Voice Audio):
-------------------------------------------------------
ઓડિયો URL: ${p.voice?.audioUrl || 'N/A'}
ફાઇલ: ${p.voice?.filename || 'N/A'}
પ્રોવાઇડર: ${p.voice?.provider || 'ElevenLabs STS v2'}

-------------------------------------------------------
🎬 ૫. એડિટિંગ ગાઇડ (Editing Notes & Checklist):
-------------------------------------------------------
રેશિયો: ${p.editing?.aspectRatio || '16:9'} | ${p.editing?.fps || '60fps'} | ${p.editing?.resolution || '1080p'}
સંગીત: ${p.editing?.musicStyle || 'Soft News Tone'}
નોંધ:
${p.editing?.customNotes || 'N/A'}

-------------------------------------------------------
🎨 ૬. કેન્વા (Canva Graphics):
-------------------------------------------------------
હેડલાઇન: ${p.canva?.headline || p.name}
સબટાઇટલ: ${p.canva?.subtitle || ''}
બેજ: ${p.canva?.badgeText || ''}

-------------------------------------------------------
🚀 ૭. YOUTUBE SEO (Title, Description & Tags):
-------------------------------------------------------
[Title]:
${p.seo?.title || ''}

[Description]:
${p.seo?.description || ''}

[Tags]:
${p.seo?.tags || ''}

[Pinned Comment]:
${p.seo?.pinnedComment || ''}

-------------------------------------------------------
🖼️ ૮. થંબનેલ (Thumbnail Plan):
-------------------------------------------------------
શબ્દો: "${p.thumbnail?.gujaratiWords || ''}"
અસલી ફોટો: ${p.thumbnail?.photoSubject || ''}
DALL-E 3 શોર્ટ પ્રોમ્પ્ટ:
${p.thumbnail?.dalleShortPrompt || ''}

=======================================================
જ્ઞાન યાત્રા - Gujarati YouTube Creator Studio
=======================================================`;
  }
}

export const projectState = new ProjectStateManager();
