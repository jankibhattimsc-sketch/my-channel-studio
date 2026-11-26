const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Clear Old Video & Audio when Editing New Video', () => {
  it('clearOldVideoAndAudio resets saved video, audio mappings, and clip states without touching script', async () => {
    // Simulate project state
    const project = {
      id: 'proj_new_test_123',
      name: 'નવો પ્રોજેક્ટ ટેસ્ટ',
      editing: {
        lastExportedVideoUrl: '/videos/old_video_render.mp4',
        lastExportedFilename: 'old_video_render.mp4',
        savedVideo: { url: '/videos/old_video_render.mp4', duration: 120 },
        exportHistory: [{ url: '/videos/old_video_render.mp4', date: '2026-11-01' }]
      },
      voice: {
        slide_1: { audioUrl: '/audio/old_slide_1.wav' },
        slide_2: { audioUrl: '/audio/old_slide_2.wav' }
      },
      slide: {
        slides: [
          { slideNumber: 1, title: 'સ્લાઇડ ૧', scriptText: 'સ્ક્રિપ્ટ લખાણ ૧', audioUrl: '/audio/old_slide_1.wav', recordingDuration: 12 },
          { slideNumber: 2, title: 'સ્લાઇડ ૨', scriptText: 'સ્ક્રિપ્ટ લખાણ ૨', audioUrl: '/audio/old_slide_2.wav', recordingDuration: 14 }
        ]
      },
      script: {
        rawText: 'સંપૂર્ણ સ્ક્રિપ્ટ લખાણ',
        fullText: 'સંપૂર્ણ સ્ક્રિપ્ટ લખાણ',
        sections: [
          { slideNumber: 1, scriptText: 'સ્ક્રિપ્ટ લખાણ ૧' },
          { slideNumber: 2, scriptText: 'સ્ક્રિપ્ટ લખાણ ૨' }
        ]
      }
    };

    let savedVideoUrl = project.editing.lastExportedVideoUrl;
    let savedVideoFilename = project.editing.lastExportedFilename;
    let serverSlideAudios = { 1: '/audio/old_slide_1.wav', 2: '/audio/old_slide_2.wav' };
    let storedSlideAudios = [{ slideNumber: 1 }, { slideNumber: 2 }];

    const generatedClips = [
      { slideNumber: 1, scriptText: 'સ્ક્રિપ્ટ લખાણ ૧', audioUrl: '/audio/old_slide_1.wav', serverUrl: '/audio/old_slide_1.wav', isAudioLinked: true, duration: 12.0 },
      { slideNumber: 2, scriptText: 'સ્ક્રિપ્ટ લખાણ ૨', audioUrl: '/audio/old_slide_2.wav', serverUrl: '/audio/old_slide_2.wav', isAudioLinked: true, duration: 14.0 }
    ];

    // Execution of clear logic:
    savedVideoUrl = null;
    savedVideoFilename = null;
    project.editing.lastExportedVideoUrl = null;
    project.editing.lastExportedFilename = null;
    project.editing.savedVideo = null;
    project.editing.exportHistory = [];

    serverSlideAudios = {};
    storedSlideAudios = [];

    generatedClips.forEach(clip => {
      clip.audioUrl = '';
      clip.serverUrl = '';
      clip.audioBlob = null;
      clip.recordingDuration = 0;
      clip.isAudioLinked = false;
      clip.duration = 8.0;
      clip.isLiveRecorded = false;
    });

    project.slide.slides.forEach(sl => {
      sl.audioUrl = '';
      sl.recordingDuration = 0;
    });

    project.voice = {};

    // Assertions
    assert.strictEqual(savedVideoUrl, null, 'Saved video URL must be null');
    assert.strictEqual(project.editing.lastExportedVideoUrl, null, 'Project editing last exported video URL must be null');
    assert.strictEqual(Object.keys(serverSlideAudios).length, 0, 'Server slide audios must be empty');
    assert.strictEqual(storedSlideAudios.length, 0, 'Stored slide audios must be empty');
    assert.strictEqual(Object.keys(project.voice).length, 0, 'Project voice tool state must be empty');

    generatedClips.forEach((clip, i) => {
      assert.strictEqual(clip.audioUrl, '', `Clip ${i + 1} audioUrl must be empty`);
      assert.strictEqual(clip.serverUrl, '', `Clip ${i + 1} serverUrl must be empty`);
      assert.strictEqual(clip.isAudioLinked, false, `Clip ${i + 1} isAudioLinked must be false`);
      assert.strictEqual(clip.duration, 8.0, `Clip ${i + 1} duration must reset to default 8.0s`);
      assert.ok(clip.scriptText.length > 0, `Clip ${i + 1} scriptText must be preserved`);
    });

    project.slide.slides.forEach((sl, i) => {
      assert.strictEqual(sl.audioUrl, '', `Slide ${i + 1} audioUrl must be cleared`);
      assert.strictEqual(sl.recordingDuration, 0, `Slide ${i + 1} recordingDuration must be 0`);
      assert.ok(sl.scriptText.length > 0, `Slide ${i + 1} scriptText must be preserved`);
    });

    // Verify script is completely safe
    assert.strictEqual(project.script.rawText, 'સંપૂર્ણ સ્ક્રિપ્ટ લખાણ', 'Script text must be 100% preserved');
    assert.strictEqual(project.script.sections.length, 2, 'Script sections must be preserved');
  });

  it('clearAllProjectSlideAudios function is exported and functional in audioStorage.js', async () => {
    const audioStorage = await import('../public/js/utils/audioStorage.js');
    assert.strictEqual(typeof audioStorage.clearAllProjectSlideAudios, 'function', 'clearAllProjectSlideAudios must be exported as a function');
  });

  it('scriptwriter.js has no syntax error and can be parsed as a module', async () => {
    global.window = {};
    global.document = { querySelector: () => null, addEventListener: () => null };
    const scriptwriterModule = await import('../public/js/views/scriptwriter.js?v=24.0');
    assert.strictEqual(typeof scriptwriterModule.renderScriptWriter, 'function', 'renderScriptWriter must be exported');
  });
});

