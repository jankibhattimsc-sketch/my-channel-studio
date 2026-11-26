const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');

/**
 * Normalizes text for matching
 */
function normalizeText(str) {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .replace(/[\s\-_.,/:|"'`!?()\[\]]+/g, '')
    .trim();
}

/**
 * GET /api/preview/projects
 * Returns all previewable projects with status of video, audio, slides, script
 */
router.get('/projects', (req, res) => {
  try {
    const projectsMap = new Map();
    const videosDir = path.join(__dirname, '..', '..', 'public', 'videos');
    const audioDir = path.join(__dirname, '..', '..', 'public', 'audio');

    // 1. Gather files from public/videos/
    const videoFiles = [];
    if (fs.existsSync(videosDir)) {
      const files = fs.readdirSync(videosDir)
        .filter(f => f.endsWith('.mp4') && !f.startsWith('raw_'))
        .map(f => {
          const fullPath = path.join(videosDir, f);
          const stat = fs.statSync(fullPath);
          return {
            filename: f,
            url: `/videos/${f}`,
            size: stat.size,
            mtime: stat.mtime
          };
        })
        .sort((a, b) => b.mtime - a.mtime);
      videoFiles.push(...files);
    }

    // 2. Load from db.data.topicVideos
    const topicVideos = db.data.topicVideos || {};
    for (const [key, vRec] of Object.entries(topicVideos)) {
      if (!vRec || !vRec.videoUrl) continue;
      const title = vRec.topicName || vRec.title || key;
      const cleanId = String(vRec.projectId || key).trim();
      if (!projectsMap.has(cleanId)) {
        projectsMap.set(cleanId, {
          id: cleanId,
          title: title,
          category: vRec.category || 'સરકારી યોજના & ભરતી',
          videoUrl: vRec.videoUrl,
          videoFilename: vRec.filename || path.basename(vRec.videoUrl),
          hasVideo: true,
          hasAudio: false,
          hasSlides: false,
          hasScript: false,
          slidesCount: vRec.slidesCount || 0,
          updatedAt: vRec.createdAt || new Date().toISOString()
        });
      }
    }

    // 3. Load from db.data.centralTopics
    const centralTopics = db.getCentralTopics ? db.getCentralTopics() : (db.data.centralTopics || []);
    centralTopics.forEach(ct => {
      const tid = ct.topicId || ct.id;
      if (!tid) return;
      const existing = projectsMap.get(tid);
      const ctStages = (db.data.topicProductionStages && db.data.topicProductionStages[tid]) || {};
      const ctVideo = (db.data.topicVideos && db.data.topicVideos[tid]) || ct.videos || null;
      const ctScript = (db.data.topicScripts && db.data.topicScripts[tid]) || null;
      const ctSlides = (db.data.topicSlides && db.data.topicSlides[tid]) || null;

      const videoUrl = ctVideo?.videoUrl || (existing ? existing.videoUrl : null);

      projectsMap.set(tid, {
        id: tid,
        title: ct.topicName || ct.title || (existing ? existing.title : 'ગુજરાત સામાન્ય જ્ઞાન'),
        category: ct.category || 'સરકારી યોજના & ભરતી',
        videoUrl: videoUrl,
        videoFilename: videoUrl ? path.basename(videoUrl) : null,
        hasVideo: Boolean(videoUrl || ctStages.videoEditing),
        hasAudio: Boolean(ctStages.voiceRecording),
        hasSlides: Boolean(ctSlides || ctStages.slideCreation),
        hasScript: Boolean(ctScript || ctStages.scriptWriting),
        slidesCount: ctSlides ? (Array.isArray(ctSlides) ? ctSlides.length : (ctSlides.slides?.length || 0)) : 0,
        updatedAt: ct.updatedAt || ct.createdAt || (existing ? existing.updatedAt : new Date().toISOString())
      });
    });

    // 4. Load from db.data.topics (saved topics)
    const savedTopics = db.getTopics ? db.getTopics() : (db.data.topics || []);
    savedTopics.forEach(st => {
      const sid = st.id;
      if (!sid || projectsMap.has(sid)) return;
      projectsMap.set(sid, {
        id: sid,
        title: st.topic || st.title || 'સામાન્ય જ્ઞાન વિષય',
        category: st.category || 'શિક્ષણ & ભરતી',
        videoUrl: null,
        videoFilename: null,
        hasVideo: false,
        hasAudio: false,
        hasSlides: false,
        hasScript: false,
        slidesCount: 0,
        updatedAt: st.updatedAt || st.createdAt || new Date().toISOString()
      });
    });

    // 5. Check if recent mp4 video files can be matched to any project without videoUrl
    if (videoFiles.length > 0) {
      for (const [pid, pObj] of projectsMap.entries()) {
        if (!pObj.videoUrl) {
          const normTitle = normalizeText(pObj.title);
          const normId = normalizeText(pObj.id);
          const matched = videoFiles.find(vf => {
            const normF = normalizeText(vf.filename);
            return (normId.length >= 6 && normF.includes(normId)) ||
                   (normTitle.length >= 10 && normF.includes(normTitle.substring(0, 15)));
          });
          if (matched) {
            pObj.videoUrl = matched.url;
            pObj.videoFilename = matched.filename;
            pObj.hasVideo = true;
          }
        }
      }
    }

    // 6. If latest_video.mp4 exists, ensure there's at least an active entry for it if map is small
    const latestFile = videoFiles.find(vf => vf.filename === 'latest_video.mp4');
    if (latestFile && !projectsMap.has('latest_active_video')) {
      projectsMap.set('latest_active_video', {
        id: 'latest_active_video',
        title: 'તાજો એક્સપોર્ટ થયેલો વિડીયો (Latest Exported Video)',
        category: 'સૌથી છેલ્લો વિડીયો',
        videoUrl: '/videos/latest_video.mp4',
        videoFilename: 'latest_video.mp4',
        hasVideo: true,
        hasAudio: true,
        hasSlides: true,
        hasScript: true,
        slidesCount: 9,
        updatedAt: latestFile.mtime.toISOString()
      });
    }

    // Sort projects: projects with video first, then by updatedAt
    const list = Array.from(projectsMap.values()).sort((a, b) => {
      if (a.hasVideo && !b.hasVideo) return -1;
      if (!a.hasVideo && b.hasVideo) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    res.json({
      success: true,
      projects: list,
      total: list.length,
      videoFiles: videoFiles.slice(0, 8)
    });
  } catch (err) {
    console.error('[Preview API projects error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/preview/project-data
 * Returns full project package (video, slides, script, audios, thumbnail, SEO)
 */
router.get('/project-data', (req, res) => {
  try {
    const { id, topic, videoFile } = req.query;
    const cleanId = String(id || '').trim();
    const cleanTopic = String(topic || '').trim();
    const cleanVideoFile = String(videoFile || '').trim();

    const result = {
      id: cleanId || 'project_' + Date.now(),
      title: cleanTopic || 'ગુજરાતી શૈક્ષણિક વિડીયો પ્રેઝન્ટેશન',
      category: 'સરકારી યોજના અને સામાન્ય જ્ઞાન',
      videoUrl: null,
      videoFilename: null,
      slides: [],
      script: { fullText: '', sections: [] },
      slideAudios: {},
      seo: {
        title: cleanTopic || 'Gyan Yatra Gujarati Video',
        description: 'જ્ઞાન યાત્રા ચેનલ દ્વારા સ્પર્ધાત્મક પરીક્ષાઓ અને સામાન્ય જ્ઞાન માટે ખાસ બનાવેલ ૧૦૮૦p વિડીયો.',
        tags: ['Gyan Yatra', 'Gujarati Video', 'Gujarat Exam 2026', 'Educational'],
        hashtags: ['#GyanYatra', '#GujaratiGK', '#Exam2026']
      },
      thumbnailUrl: null,
      updatedAt: new Date().toISOString()
    };

    // 1. Locate video
    const videosDir = path.join(__dirname, '..', '..', 'public', 'videos');
    if (cleanVideoFile) {
      const sanitized = path.basename(cleanVideoFile);
      if (fs.existsSync(path.join(videosDir, sanitized))) {
        result.videoUrl = `/videos/${sanitized}`;
        result.videoFilename = sanitized;
      }
    }

    // Check DB topicVideos
    if (!result.videoUrl && cleanId && db.data.topicVideos && db.data.topicVideos[cleanId]) {
      const rec = db.data.topicVideos[cleanId];
      result.videoUrl = rec.videoUrl;
      result.videoFilename = rec.filename || (rec.videoUrl ? path.basename(rec.videoUrl) : null);
      if (rec.topicName) result.title = rec.topicName;
    }

    // Check central topics
    if (cleanId && db.getCentralTopicById) {
      const ctBundle = db.getCentralTopicById(cleanId);
      if (ctBundle && ctBundle.topic) {
        result.title = ctBundle.topic.topicName || ctBundle.topic.title || result.title;
        result.category = ctBundle.topic.category || result.category;

        if (ctBundle.videos && ctBundle.videos.videoUrl && !result.videoUrl) {
          result.videoUrl = ctBundle.videos.videoUrl;
          result.videoFilename = ctBundle.videos.filename || path.basename(ctBundle.videos.videoUrl);
        }

        if (ctBundle.slides) {
          result.slides = Array.isArray(ctBundle.slides) ? ctBundle.slides : (ctBundle.slides.slides || []);
        }

        if (ctBundle.scripts) {
          result.script = {
            fullText: ctBundle.scripts.fullText || ctBundle.scripts.scriptText || '',
            sections: ctBundle.scripts.sections || []
          };
        }

        if (ctBundle.seo) {
          result.seo = {
            ...result.seo,
            ...ctBundle.seo
          };
        }

        if (ctBundle.thumbnails && ctBundle.thumbnails.url) {
          result.thumbnailUrl = ctBundle.thumbnails.url;
        }
      }
    }

    // Check scripts table
    if ((!result.script.fullText || result.script.sections.length === 0) && cleanId) {
      const savedScript = db.getLatestScriptByProjectId ? db.getLatestScriptByProjectId(cleanId) : null;
      if (savedScript) {
        result.script = {
          fullText: savedScript.fullText || savedScript.rawText || '',
          sections: savedScript.sections || []
        };
        if (!result.title || result.title.includes('ગુજરાતી શૈક્ષણિક')) {
          result.title = savedScript.title || savedScript.topic || result.title;
        }
      }
    }

    // Check slide audios in public/audio/
    const audioDir = path.join(__dirname, '..', '..', 'public', 'audio');
    if (fs.existsSync(audioDir) && cleanId) {
      const cleanPid = cleanId.replace(/[^a-zA-Z0-9_-]/g, '');
      const files = fs.readdirSync(audioDir);
      for (let sNum = 1; sNum <= 15; sNum++) {
        // Pattern 1: project-specific audio
        const pAudio = files.find(f => f.includes(`slide_${sNum}`) && cleanPid.length >= 4 && f.includes(cleanPid));
        if (pAudio) {
          result.slideAudios[sNum] = {
            url: `/audio/${pAudio}`,
            original: `/audio/${pAudio}`,
            enhanced: `/audio/${pAudio}`
          };
        }
      }
    }

    // Fallback: If no video found, check for latest_video.mp4
    if (!result.videoUrl) {
      const latestPath = path.join(videosDir, 'latest_video.mp4');
      if (fs.existsSync(latestPath)) {
        result.videoUrl = '/videos/latest_video.mp4';
        result.videoFilename = 'latest_video.mp4';
      }
    }

    // Fallback slides: If empty, construct default slide structure from script sections or generate clean template
    if (!result.slides || result.slides.length === 0) {
      if (result.script.sections && result.script.sections.length > 0) {
        result.slides = result.script.sections.map((sec, idx) => ({
          slideNumber: sec.slideNumber || (idx + 1),
          title: sec.title || `${result.title} - ભાગ ${idx + 1}`,
          subtitle: `જ્ઞાન યાત્રા સ્પેશિયલ પ્રેઝન્ટેશન`,
          bullets: [
            sec.scriptText ? sec.scriptText.substring(0, 120) + '...' : 'મુખ્ય માહિતી અને વિગત',
            'સંપૂર્ણ પ્રશ્નોત્તરી અને પરીક્ષાલક્ષી વિશ્લેષણ'
          ],
          scriptText: sec.scriptText || ''
        }));
      } else {
        // Provide standard 9-slide layout matching Gyan Yatra standards
        result.slides = [
          {
            slideNumber: 1,
            title: result.title,
            subtitle: 'સંપૂર્ણ વિશ્લેષણ અને પરીક્ષાલક્ષી પ્રશ્નોત્તરી',
            bullets: [
              'નવીનતમ પરિપત્ર અને સત્તાવાર જાહેરાત',
              'ઉમેદવારો માટે ખૂબ જ અગત્યની માહિતી',
              'તમામ નિયમો અને યોગ્યતા માપદંડ'
            ],
            scriptText: `નમસ્કાર મિત્રો, જ્ઞાન યાત્રા ચેનલમાં આપ સૌનું હાર્દિક સ્વાગત છે. આજે આપણે ${result.title} વિશે સંપૂર્ણ વિગતવાર માહિતી મેળવીશું.`
          },
          {
            slideNumber: 2,
            title: 'પરીક્ષાનું માળખું અને અગત્યના નિયમો',
            subtitle: 'વિષયવાર ગુણભાર અને વિશ્લેષણ',
            bullets: [
              'નવા પરીક્ષા પેપર પદ્ધતિ મુજબ પ્રશ્નો',
              'ઓનલાઇન અરજી તથા ફી ભરવાની તારીખો',
              'પાસ થવા માટે લઘુત્તમ ગુણની મર્યાદા'
            ],
            scriptText: `આ મુદ્દો પરીક્ષાની દ્રષ્ટિએ ખૂબ જ અગત્યનો છે. દરેક ઉમેદવારે અભ્યાસક્રમ અને ગુણભાર યોગ્ય રીતે સમજી લેવો જોઈએ.`
          },
          {
            slideNumber: 3,
            title: 'સૌથી મહત્વપૂર્ણ પ્રશ્ન ૧',
            subtitle: 'વારંવાર પુછાતો પ્રશ્ન અને જવાબ',
            bullets: [
              'પ્રશ્ન: પરીક્ષામાં કયા વિષય પરથી સૌથી વધુ પ્રશ્નો પૂછાય છે?',
              'સાચો જવાબ: સામાન્ય જ્ઞાન અને શિક્ષણના સિદ્ધાંતો',
              'વિશેષ નોંધ: પાછલા વર્ષોના પેપર સોલ્યુશન જરૂર જોવા.'
            ],
            scriptText: `આ પ્રશ્ન અગાઉની પરીક્ષાઓમાં વારંવાર પૂછાયો છે. તેનો સાચો જવાબ સામાન્ય જ્ઞાન અને બાળ મનોવિજ્ઞાન છે.`
          },
          {
            slideNumber: 4,
            title: 'સૌથી મહત્વપૂર્ણ પ્રશ્ન ૨',
            subtitle: 'ગુણ મેળવવા માટે ખાસ ટિપ્સ',
            bullets: [
              'સમય વ્યવસ્થાપન કેવી રીતે કરવું?',
              'નેગેટિવ માર્કિંગથી બચવાની સાચી રીત',
              'દરેક વિભાગ માટે સમય મર્યાદા નક્કી કરો'
            ],
            scriptText: `પરીક્ષા હોલમાં સમયનું સંચાલન સૌથી વધુ મહત્વનું સાબિત થાય છે. પહેલા સહેલા પ્રશ્નો અટેમ્પ્ટ કરવા.`
          },
          {
            slideNumber: 5,
            title: 'સંપૂર્ણ નિષ્કર્ષ અને તૈયારી પ્લાન',
            subtitle: 'જ્ઞાન યાત્રા ચેનલ સાથે સફળતા તરફ',
            bullets: [
              'રોજ ૨ કલાક રિવિઝન અને મોક ટેસ્ટ',
              'સત્તાવાર પુસ્તકો અને સંદર્ભ સાહિત્ય',
              'વિડીયો ગમ્યો હોય તો લાઈક અને શેર કરો'
            ],
            scriptText: `મિત્રો, જો તમે આ પદ્ધતિથી તૈયારી કરશો તો ચોક્કસપણે સફળતા મળશે. આવા જ મહત્વના વિડીયો જોવા માટે જ્ઞાન યાત્રા ચેનલને સબ્સ્ક્રાઇબ કરો. આભાર!`
          }
        ];
      }
    }

    res.json({
      success: true,
      project: result
    });
  } catch (err) {
    console.error('[Preview API project-data error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/preview/sync-project
 * Syncs project data from client localStorage into server database
 */
router.post('/sync-project', (req, res) => {
  try {
    const { project } = req.body;
    if (!project || (!project.id && !project.topic && !project.name)) {
      return res.status(400).json({ success: false, error: 'Project data is required' });
    }

    const pid = String(project.id || 'proj_' + Date.now()).trim();
    const title = project.topic || project.name || 'નવો પ્રોજેક્ટ';
    const category = project.category || 'શિક્ષણ & ભરતી';

    // Store into db.data
    if (!db.data.topicSlides) db.data.topicSlides = {};
    if (!db.data.topicScripts) db.data.topicScripts = {};
    if (!db.data.topicSEO) db.data.topicSEO = {};

    if (project.slides && Array.isArray(project.slides)) {
      db.data.topicSlides[pid] = project.slides;
    }

    if (project.script) {
      db.data.topicScripts[pid] = project.script;
    }

    if (project.seo) {
      db.data.topicSEO[pid] = project.seo;
    }

    if (project.savedVideo || project.videoUrl) {
      if (!db.data.topicVideos) db.data.topicVideos = {};
      db.data.topicVideos[pid] = {
        videoUrl: project.savedVideo || project.videoUrl,
        filename: path.basename(project.savedVideo || project.videoUrl),
        topicName: title,
        category: category,
        createdAt: new Date().toISOString()
      };
    }

    db.save();

    res.json({
      success: true,
      message: 'પ્રોજેક્ટ સફળતાપૂર્વક પ્રીવ્યુ સર્વર સાથે સિન્ક થયો.',
      projectId: pid
    });
  } catch (err) {
    console.error('[Preview API sync-project error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
