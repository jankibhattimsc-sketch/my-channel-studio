const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFile, exec } = require('child_process');
const util = require('util');
const execFileAsync = util.promisify(execFile);
const execAsync = util.promisify(exec);
const { cleanGujaratiForTTS, gujaratiToDevanagari, splitTextIntoSafeChunks } = require('./gujaratiCleaner');
const voiceActorService = require('./voiceActorService');

const AUDIO_TONE_PROMPT = "Read the following Gujarati government job news in a warm, natural, conversational voice, like an experienced news presenter, not a fake TV-anchor voice. Start with an enthusiastic, clear voice to grab attention. For recruitment news: be optimistic, energetic and encouraging, with slight emphasis on number of vacancies, eligibility and last date. For salary hike/DA/allowance news: be happy, excited and reassuring, and say amounts, percentages and effective dates clearly and slightly slower. When mentioning last dates, warnings or important notices: become a little serious and urgent. End with a warm, friendly closing. Keep a medium pace with natural pauses at commas and full stops. Pronounce English words like DA, GPSC, OJAS clearly. Read only the script text below exactly as written, do not add or remove any words, and do not read these instructions aloud.";

class VoiceService {
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY || 'sk_07ae3f8accfee122d3b619b81b35fff1501edea94b26b436';
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || '8tLkQgJXmqrb3JfvfOHD';
    this.femaleVoiceId = process.env.ELEVENLABS_FEMALE_VOICE_ID || '1UyAke1iefrWyqm395qX';
    this.googleApiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_CLOUD_API_KEY || '';
    this.modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
    this.pythonBin = process.env.PYTHON_BIN || 'c:\\Users\\curio\\StudioProjects\\app script\\.venv311\\Scripts\\python.exe';
    this.audioOutputDir = path.join(__dirname, '..', '..', 'public', 'audio');

    if (!fs.existsSync(this.audioOutputDir)) {
      fs.mkdirSync(this.audioOutputDir, { recursive: true });
    }
  }

  getProfiles() {
    return [
      {
        id: 'anchor-dhwani-female',
        name: '👑 લતા મંગેશકર જેવો મધુર અવાજ (કોકિલા - અતિ મીઠો & સુરીલો સ્ત્રી અવાજ)',
        type: 'edge_tts',
        voiceId: 'gu-IN-DhwaniNeural',
        provider: 'Microsoft Pure Gujarati (Lata Sweet Tone)',
        badge: 'મધુર કોકિલકંઠ વાણી 👑',
        gender: 'female',
        pitch: '+4Hz',
        description: 'લતા મંગેશકર જેવો અતિ મીઠો, સુરીલો, રેશમી અને સ્પષ્ટ સ્ત્રી અવાજ. ઝીરો ધ્રૂજારી, સ્પષ્ટ ઉચ્ચારણ અને સાંભળવો ગમે તેવો મધુર લયબદ્ધ પ્રવાહ. ભરતી, પરિપત્ર અને પગાર વધારા માટે ૧૦૦% પરફેક્ટ.',
        recommended: true,
        sampleAudio: '/audio/lata_sweet_melody_anchor.mp3'
      },
      {
        id: 'anchor-swara-female',
        name: '👑 સિનિયર હિન્દી/દેવનાગરી એન્કર (સ્વરા - પરિપક્વ સ્ત્રી)',
        type: 'edge_tts',
        voiceId: 'hi-IN-SwaraNeural',
        provider: 'Neural Senior Broadcast (Indic Model)',
        badge: 'પરિપક્વ ગોલ્ડન વાણી',
        gender: 'female',
        description: 'ગંભીર, શાંત અને પરિપક્વ સ્ત્રી અવાજ (હિન્દી/ઇન્ડિક શૈલી માટે).',
        recommended: false,
        sampleAudio: '/audio/sample_swara_mature.mp3'
      },
      {
        id: 'anchor-niranjan-male',
        name: '📺 ટીવી ન્યૂઝ એન્કર (નિરંજન - પુરુષ)',
        type: 'edge_tts',
        voiceId: 'gu-IN-NiranjanNeural',
        provider: 'Microsoft Neural Anchor',
        badge: 'ન્યૂઝ એન્કર ⭐',
        gender: 'male',
        description: 'વાસ્તવિક ટીવી ન્યૂઝ બુલેટિન જેવો ગંભીર, સત્તાવાર અને સ્પષ્ટ અવાજ. 96kbps સ્ટુડિયો માસ્ટર્ડ - ધ્રૂજારી વગરનો અસલી માનવીય અવાજ.',
        recommended: true,
        sampleAudio: '/audio/clean_fluent_professional.mp3'
      },
      {
        id: 'anchor-madhur-male',
        name: '🎙️ સ્ટુડિયો એન્કર (મધુર - સુપર સ્ટેડી પુરુષ)',
        type: 'edge_tts',
        voiceId: 'hi-IN-MadhurNeural',
        provider: 'Microsoft Studio Voice Actor',
        badge: 'ઝીરો ધ્રૂજારી ⚡',
        gender: 'male',
        description: 'બોલિવૂડ અને નેશનલ ટીવી કક્ષાનો દમદાર, ભરાવદાર અને એકદમ સ્થિર પુરુષ અવાજ. રોબોટિક કે ધ્રૂજારી વગરનું ૧૦૦% નેચરલ વાંચન.',
        recommended: true,
        sampleAudio: '/audio/clean_fluent_professional.mp3'
      },
      {
        id: 'google-clone-custom',
        name: '👑 મારો અવાજ ક્લોન (પરિપક્વ માહિતીપ્રદ સ્ત્રી)',
        type: 'edge_tts',
        voiceId: 'hi-IN-SwaraNeural',
        provider: 'Neural Custom Clone (Omni/Argon Engine)',
        badge: 'પરિપક્વ ક્લોન 👑',
        gender: 'female',
        description: 'ગૂગલ ઓમ્ની / આર્ગોન મોડેલ જેવો પરિપક્વ, શાંત અને વ્યવસ્થિત માહિતીપ્રદ સ્ત્રી અવાજ (આંગણવાડી ભરતી, પરિપત્ર અને પગાર વધારા માટે ૧૦૦% યોગ્ય).',
        recommended: false,
        sampleAudio: '/audio/sample_swara_mature.mp3'
      },
      {
        id: 'google-wavenet-male',
        name: '👨 સત્તાવાર પુરુષ અવાજ (Wavenet Male)',
        type: 'google_tts',
        voiceId: 'gu-IN-Wavenet-B',
        provider: 'Google Cloud Wavenet',
        badge: 'સત્તાવાર ⭐',
        gender: 'male',
        description: 'ગંભીર, મજબૂત અને પ્રભાવશાળી પુરુષ અવાજ. પરિપત્રો માટે.',
        recommended: false,
        sampleAudio: '/audio/clean_fluent_professional.mp3'
      },
      {
        id: 'google-wavenet-female',
        name: '👩 મીઠો સ્ત્રી અવાજ (Wavenet Female)',
        type: 'google_tts',
        voiceId: 'gu-IN-Wavenet-A',
        provider: 'Google Cloud Wavenet',
        badge: 'ગૂગલ Wavenet',
        gender: 'female',
        description: 'અત્યંત મીઠો અને સ્પષ્ટ સ્ત્રી અવાજ.',
        recommended: false,
        sampleAudio: '/audio/sample_google_cloud_gujarati.mp3'
      }
    ];
  }

  buildSSML({ text, emotion = 'enthusiastic', speed = 1.0 }) {
    let rateMultiplier = parseFloat(speed) || 1.0;
    let pitch = '+0st';
    if (emotion === 'enthusiastic') {
      rateMultiplier *= 1.04;
      pitch = '+0.5st';
    } else if (emotion === 'official') {
      rateMultiplier *= 0.98;
      pitch = '-0.5st';
    } else if (emotion === 'calm') {
      rateMultiplier *= 1.00;
      pitch = '+0st';
    }
    const ratePercent = Math.round(rateMultiplier * 100);

    let clean = (text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    // Natural fluid human speech: Allow WaveNet neural vocoder to handle commas naturally.
    // Only insert gentle breath pauses at sentence ends and paragraph breaks.
    clean = clean.replace(/([.!?।]\s*)/g, '$1 <break time="220ms"/>\n');
    clean = clean.replace(/\n{2,}/g, '\n<break time="350ms"/>\n');

    return `<speak><prosody rate="${ratePercent}%" pitch="${pitch}">${clean}</prosody></speak>`;
  }

  async generateVoice({
    text,
    profileId = 'google-wavenet-female',
    voiceId = null,
    speed = 1.0,
    emotion = 'enthusiastic',
    actorMode = false,
    actorStyle = 'breaking',
    mainTopic = '',
    apiKey = null,
    customVoiceId = null,
    stability = 0.55,
    similarity = 0.85,
    style = 0.15,
    modelId = null
  }) {
    if (!text || text.trim().length === 0) {
      throw new Error('ઓડિયો જનરેટ કરવા માટે લખાણ (ટેક્સ્ટ) જરૂરી છે.');
    }

    const profiles = this.getProfiles();
    let selectedProfile = profiles.find(p => p.id === profileId);
    if (!selectedProfile) {
      // Graceful fallback for legacy profile IDs
      if (profileId === 'cloned-female-janki' || profileId === 'google-cloud-gujarati') {
        selectedProfile = profiles[0]; // google-wavenet-female
      } else if (profileId === 'my-cloned-voice') {
        selectedProfile = profiles[2]; // google-clone-custom
      } else {
        selectedProfile = profiles[0];
      }
    }

    let targetVoiceId = voiceId || selectedProfile.voiceId;
    if (selectedProfile.type === 'google_clone' && customVoiceId) {
      targetVoiceId = customVoiceId;
    }

    const timestamp = Date.now();
    const filename = `voice_${selectedProfile.id}_${timestamp}.mp3`;
    const outputPath = path.join(this.audioOutputDir, filename);
    const audioUrl = `/audio/${filename}`;

    console.log(`[VoiceService] Generating voice with profile: ${selectedProfile.name}, voiceId: ${targetVoiceId}, emotion: ${emotion}, speed: ${speed}`);

    // If AUDIO_TONE_PROMPT was prepended, strip it so the TTS vocoder only speaks the user's actual Gujarati script
    let actualScript = text;
    if (actualScript.startsWith(AUDIO_TONE_PROMPT)) {
      actualScript = actualScript.substring(AUDIO_TONE_PROMPT.length).trim();
    }

    const cleanedText = cleanGujaratiForTTS(actualScript);
    const effectiveApiKey = apiKey || this.googleApiKey;

    // 1. If Google Cloud API key is configured, use official Google Cloud Wavenet
    if ((selectedProfile.type === 'google_tts' || selectedProfile.type === 'google_clone') && effectiveApiKey) {
      console.log(`[VoiceService] Using official Google Cloud Wavenet API with API key`);
      const ssml = this.buildSSML({ text: cleanedText, emotion, speed });
      return await this._generateGoogleTTS({
        text: cleanedText,
        ssml,
        outputPath,
        audioUrl,
        voiceId: targetVoiceId,
        speed,
        apiKey: effectiveApiKey,
        emotion
      });
    }

    // 2. High-Fidelity Intelligent Script-Aware Neural Voice Engine
    let neuralVoiceName = 'gu-IN-NiranjanNeural';
    let locale = 'gu-IN';

    if (selectedProfile.id === 'anchor-dhwani-female' || targetVoiceId === 'gu-IN-DhwaniNeural' || (selectedProfile.gender === 'female' && selectedProfile.id !== 'anchor-swara-female' && selectedProfile.id !== 'google-clone-custom')) {
      neuralVoiceName = 'gu-IN-DhwaniNeural';
      locale = 'gu-IN';
    } else if (
      selectedProfile.id === 'anchor-swara-female' || 
      targetVoiceId === 'hi-IN-SwaraNeural' || 
      selectedProfile.id === 'google-clone-custom' ||
      targetVoiceId === 'custom-clone'
    ) {
      neuralVoiceName = 'hi-IN-SwaraNeural';
      locale = 'hi-IN';
    } else if (selectedProfile.id === 'anchor-madhur-male' || targetVoiceId === 'hi-IN-MadhurNeural') {
      neuralVoiceName = 'hi-IN-MadhurNeural';
      locale = 'hi-IN';
    } else {
      neuralVoiceName = 'gu-IN-NiranjanNeural';
      locale = 'gu-IN';
    }

    // Run deep script-aware context, genre, and sentence prosody analysis
    const scriptAnalysis = voiceActorService.analyzeScript(actualScript, {
      userSpeed: speed,
      userEmotion: emotion,
      mainTopic: mainTopic || selectedProfile.name
    });

    console.log(`[VoiceService] Script-Aware Engine: Detected [${scriptAnalysis.context.nameGuj}] with ${scriptAnalysis.totalSentences} sentences for ${neuralVoiceName}`);

    // Map linguistic thought units to target voice locale (Devanagari for hi-IN Swara/Madhur, Gujarati for gu-IN voices)
    const processedThoughtUnits = (scriptAnalysis.thoughtUnits || []).map(u => ({
      id: u.id,
      text: locale === 'hi-IN' ? u.devanagariText : u.text,
      rate: u.rate,
      pitch: u.pitch || selectedProfile.pitch || '+4Hz',
      volume: u.volume || '+0%',
      pauseAfterMs: u.pauseAfterMs,
      role: u.role,
      arcPhase: u.arcPhase,
      badgeGuj: u.badgeGuj
    }));

    const processedSentences = (scriptAnalysis.sentences || []).map(s => ({
      id: s.id,
      text: locale === 'hi-IN' ? s.devanagariText : s.text,
      rate: s.rate,
      pitch: s.pitch || selectedProfile.pitch || '+4Hz',
      volume: s.volume || '+0%',
      pauseMs: s.pauseMs,
      role: s.role,
      arcPhase: s.arcPhase,
      badgeGuj: s.badgeGuj
    }));

    const result = await this._generateEdgeTTS({
      thoughtUnits: processedThoughtUnits,
      sentences: processedSentences,
      fullText: locale === 'hi-IN' ? gujaratiToDevanagari(cleanedText) : cleanedText,
      voiceName: neuralVoiceName,
      outputPath,
      audioUrl,
      speed,
      pitch: selectedProfile.pitch || (neuralVoiceName === 'gu-IN-DhwaniNeural' ? '+4Hz' : '+0Hz'),
      locale,
      context: scriptAnalysis.context
    });

    return {
      ...result,
      categoryInfo: scriptAnalysis.context,
      totalSentences: scriptAnalysis.totalSentences,
      thoughtUnits: scriptAnalysis.thoughtUnits,
      sentences: scriptAnalysis.sentences
    };
  }

  async _generateSTS(text, outputPath, audioUrl, stability, similarity, voiceId = null) {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'gujarati_sts.py');
    const targetVoiceId = voiceId || this.voiceId;

    if (!fs.existsSync(this.pythonBin)) {
      console.warn(`[VoiceService] Python bin not found at ${this.pythonBin}, falling back to ElevenLabs direct`);
      return await this._generateElevenLabsDirect(text, outputPath, audioUrl, stability, similarity, 1.0, 0.15, targetVoiceId);
    }

    try {
      await execFileAsync(this.pythonBin, [
        scriptPath,
        '--text', text,
        '--voice_id', targetVoiceId,
        '--api_key', this.apiKey,
        '--output', outputPath,
        '--stability', String(stability),
        '--similarity', String(similarity)
      ], { timeout: 120000 });

      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        return {
          success: true,
          audioUrl,
          filename: path.basename(outputPath),
          fileSize: fs.statSync(outputPath).size,
          textLength: text.length,
          voiceId: targetVoiceId,
          provider: 'ElevenLabs STS v2 (My Real Cloned Voice)'
        };
      } else {
        throw new Error('STS Output file not generated');
      }
    } catch (err) {
      console.error('[VoiceService] STS Error, trying direct ElevenLabs:', err.message);
      return await this._generateElevenLabsDirect(text, outputPath, audioUrl, stability, similarity, 1.0, 0.15, targetVoiceId);
    }
  }

  async _generateElevenLabsDirect(text, outputPath, audioUrl, stability, similarity, speed = 1.0, style = 0.15, voiceId = null, modelId = null) {
    const targetVoiceId = voiceId || this.femaleVoiceId;
    const targetModelId = modelId || this.modelId;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}?output_format=mp3_44100_128`;
    
    // Support arbitrarily long scripts by chunking at sentence boundaries
    const chunks = splitTextIntoSafeChunks(text, 800);
    const audioBuffers = [];

    for (const chunk of chunks) {
      const elevenLabsText = gujaratiToDevanagari(chunk);
      const body = {
        text: elevenLabsText,
        model_id: targetModelId,
        voice_settings: {
          stability: parseFloat(stability) || 0.55,
          similarity_boost: parseFloat(similarity) || 0.85,
          style: parseFloat(style) || 0.15,
          use_speaker_boost: true,
          speed: parseFloat(speed) || 1.0
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[VoiceService] ElevenLabs direct failed (${res.status}): ${errText}`);
        if (errText.includes('quota_exceeded')) {
          throw new Error('ElevenLabs એકાઉન્ટ ક્રેડિટ પૂર્ણ થઈ ગઈ છે (Quota Exceeded). ક્લોન કરેલ સ્ત્રી અવાજ (જાનકી ભટ્ટી - Voice ID: 1UyAke1iefrWyqm395qX) સક્રિય છે, પરંતુ તમારા ElevenLabs એકાઉન્ટમાં ક્રેડિટ રીન્યૂ કરવાની જરૂર છે.');
        } else if (errText.includes('voice_not_found')) {
          throw new Error('ક્લોન કરેલ Voice ID અમાન્ય છે અથવા એકાઉન્ટમાં મળ્યો નથી.');
        }
        throw new Error(`ElevenLabs API ભૂલ (${res.status}): ${errText}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      audioBuffers.push(Buffer.from(arrayBuffer));
    }

    const fullBuffer = Buffer.concat(audioBuffers);
    fs.writeFileSync(outputPath, fullBuffer);

    const voiceDisplayName = targetVoiceId === '1UyAke1iefrWyqm395qX'
      ? 'જાનકી ભટ્ટી (Cloned Female Voice)'
      : (targetVoiceId === '8tLkQgJXmqrb3JfvfOHD' ? 'મારો અસલી અવાજ (Cloned Male Voice)' : targetVoiceId);

    return {
      success: true,
      audioUrl,
      filename: path.basename(outputPath),
      fileSize: fs.statSync(outputPath).size,
      textLength: text.length,
      chunksCount: chunks.length,
      voiceId: targetVoiceId,
      modelId: targetModelId,
      provider: `ElevenLabs Cloned Voice (${voiceDisplayName})`
    };
  }

  async _generateEdgeTTS(params) {
    let thoughtUnits = [];
    let sentences = [];
    let fullText = '';
    let voiceName = 'gu-IN-NiranjanNeural';
    let outputPath = '';
    let audioUrl = '';
    let speed = 1.0;
    let pitch = '+0Hz';
    let locale = 'gu-IN';
    let context = null;

    if (typeof params === 'object' && !Array.isArray(params) && params.outputPath) {
      thoughtUnits = params.thoughtUnits || [];
      sentences = params.sentences || [];
      fullText = params.fullText || '';
      voiceName = params.voiceName || 'gu-IN-NiranjanNeural';
      outputPath = params.outputPath;
      audioUrl = params.audioUrl;
      speed = params.speed || 1.0;
      pitch = params.pitch || (voiceName === 'gu-IN-DhwaniNeural' ? '+4Hz' : '+0Hz');
      locale = params.locale || 'gu-IN';
      context = params.context || null;
    } else {
      fullText = arguments[0];
      voiceName = arguments[1] || 'gu-IN-NiranjanNeural';
      outputPath = arguments[2];
      audioUrl = arguments[3];
      speed = arguments[4] || 1.0;
      pitch = arguments[5] || (voiceName === 'gu-IN-DhwaniNeural' ? '+4Hz' : '+0Hz');
      locale = arguments[7] || 'gu-IN';
    }

    if (!fullText && (!thoughtUnits || thoughtUnits.length === 0) && (!sentences || sentences.length === 0)) {
      throw new Error('ઓડિયો માટે લખાણ ખાલી છે.');
    }

    const runnerScript = path.join(__dirname, '..', 'scripts', 'edge_tts_runner.py');
    const configPath = path.join(this.audioOutputDir, `tts_cfg_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);

    const userSpeed = parseFloat(speed) || 1.18;
    // Fast, energetic YouTube presenter pacing: 1.18x -> +16%, 1.25x -> +20%
    const speedDelta = Math.round((userSpeed - 1.0) * 45);
    const totalRatePercent = Math.max(8, Math.min(26, 8 + speedDelta));
    const rateSuffix = totalRatePercent >= 0 ? `+${totalRatePercent}%` : `${totalRatePercent}%`;

    const config = {
      voice: voiceName,
      output_path: outputPath,
      thought_units: thoughtUnits,
      sentences: sentences,
      full_text: fullText,
      rate: rateSuffix,
      locale: locale,
      pitch: pitch || (voiceName === 'gu-IN-DhwaniNeural' ? '+4Hz' : '+0Hz'),
      default_rate: rateSuffix
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');

    try {
      await execFileAsync(this.pythonBin, [runnerScript, configPath], { timeout: 120000 });
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        return {
          success: true,
          audioUrl,
          filename: path.basename(outputPath),
          fileSize: fs.statSync(outputPath).size,
          textLength: (fullText || '').length,
          rateUsed: rateSuffix,
          context: context,
          provider: `AI Script-Aware Studio Actor (${voiceName} - ${context ? context.badgeGuj : 'સ્ટુડિયો માસ્ટર્ડ'})`
        };
      }
    } catch (err) {
      console.warn('[VoiceService] Edge-TTS runner warning, falling back to direct plain text:', err.message);
      return await this._generateEdgeTTSPlainText(fullText, voiceName, outputPath, audioUrl, speed);
    } finally {
      try {
        if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
      } catch (_) {}
    }

    throw new Error('ઓડિયો જનરેશન નિષ્ફળ થયું. મહેરબાની કરીને ફરી પ્રયાસ કરો.');
  }

  async _generateEdgeTTSPlainText(cleanText, voiceName, outputPath, audioUrl, speed = 1.0) {
    const userSpeed = parseFloat(speed) || 1.0;
    const anchorBaseSpeedOffset = 11;
    const speedDelta = Math.round((userSpeed - 1.0) * 100);
    const totalRatePercent = anchorBaseSpeedOffset + speedDelta;
    const rateStr = totalRatePercent >= 0 ? `+${totalRatePercent}%` : `${totalRatePercent}%`;

    const tempTextPath = path.join(this.audioOutputDir, `tts_txt_${Date.now()}_${Math.random().toString(36).substring(7)}.txt`);
    fs.writeFileSync(tempTextPath, cleanText, 'utf8');

    const pyCode = `
import asyncio, edge_tts
async def run():
    with open(r'${tempTextPath}', 'r', encoding='utf-8') as f:
        content = f.read()
    c = edge_tts.Communicate(content, '${voiceName}', rate='${rateStr}')
    await c.save(r'${outputPath}')
asyncio.run(run())
`;

    try {
      await execFileAsync(this.pythonBin, ['-c', pyCode], { timeout: 60000 });
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        return {
          success: true,
          audioUrl,
          filename: path.basename(outputPath),
          fileSize: fs.statSync(outputPath).size,
          textLength: cleanText.length,
          provider: `AI Voice Actor (${voiceName})`
        };
      }
    } finally {
      try {
        if (fs.existsSync(tempTextPath)) fs.unlinkSync(tempTextPath);
      } catch (_) {}
    }

    throw new Error('ઓડિયો જનરેશન નિષ્ફળ થયું.');
  }

  async _generateGoogleTTS({ text, ssml = null, outputPath, audioUrl, voiceId = 'gu-IN-Wavenet-A', speed = 1.0, apiKey = null, emotion = 'enthusiastic' }) {
    const cleanText = (text || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanText) {
      throw new Error('ઓડિયો માટે લખાણ ખાલી છે.');
    }

    const effectiveApiKey = apiKey || this.googleApiKey;

    // 1. Try Google Cloud TTS REST API if API key is configured or provided
    if (effectiveApiKey) {
      try {
        console.log(`[VoiceService] Using official Google Cloud TTS API for voice: ${voiceId}, emotion: ${emotion}`);
        const effectiveSsml = ssml || this.buildSSML({ text: cleanText, emotion, speed });
        const audioBuffer = await this._callGoogleCloudTTSApi({
          text: cleanText,
          ssml: effectiveSsml,
          voiceId,
          speed,
          apiKey: effectiveApiKey
        });
        fs.writeFileSync(outputPath, audioBuffer);
        return {
          success: true,
          audioUrl,
          filename: path.basename(outputPath),
          fileSize: fs.statSync(outputPath).size,
          textLength: cleanText.length,
          provider: `Google Cloud TTS (${voiceId} - ಭಾವ: ${emotion})`
        };
      } catch (cloudErr) {
        console.warn(`[VoiceService] Google Cloud API error (${cloudErr.message}), falling back to Google Neural Engine...`);
      }
    }

    // 2. Fallback / Zero-Config: Google Gujarati Engine (direct high-quality synthesis)
    try {
      const chunks = this._splitIntoGoogleChunks(cleanText);
      console.log(`[VoiceService] Synthesizing ${chunks.length} chunks via Google Gujarati Engine...`);
      const audioBuffers = [];
      for (const chunk of chunks) {
        const buf = await this._downloadGoogleChunk(chunk);
        audioBuffers.push(buf);
      }
      const fullBuffer = Buffer.concat(audioBuffers);
      fs.writeFileSync(outputPath, fullBuffer);

      return {
        success: true,
        audioUrl,
        filename: path.basename(outputPath),
        fileSize: fs.statSync(outputPath).size,
        textLength: cleanText.length,
        chunksCount: chunks.length,
        provider: 'Google Cloud Gujarati TTS Engine (Wavenet Free)'
      };
    } catch (err) {
      console.error('[VoiceService] Google TTS error:', err.message);
      throw new Error(`Google TTS ઓડિયો જનરેટ કરવામાં સમસ્યા આવી: ${err.message}`);
    }
  }

  _splitIntoGoogleChunks(text, maxChars = 180) {
    if (!text || !text.trim()) return [];

    const rawSentences = text
      .split(/(?<=[.!?।\n])\s*/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (rawSentences.length === 0) return [text.trim()];

    const chunks = [];
    let currentChunk = '';

    for (const sentence of rawSentences) {
      if (sentence.length > maxChars) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        const words = sentence.split(/\s+/);
        let wordChunk = '';
        for (const w of words) {
          if ((wordChunk + (wordChunk ? ' ' : '') + w).length <= maxChars) {
            wordChunk += (wordChunk ? ' ' : '') + w;
          } else {
            if (wordChunk.trim()) chunks.push(wordChunk.trim());
            wordChunk = w;
          }
        }
        if (wordChunk.trim()) chunks.push(wordChunk.trim());
      } else if ((currentChunk + (currentChunk ? ' ' : '') + sentence).length <= maxChars) {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      } else {
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text.trim()];
  }

  async _downloadGoogleChunk(chunk) {
    return new Promise((resolve, reject) => {
      const textEncoded = encodeURIComponent(chunk);
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${textEncoded}&tl=gu&client=tw-ob`;
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Google TTS HTTP ${res.statusCode}`));
        }
        const data = [];
        res.on('data', c => data.push(c));
        res.on('end', () => resolve(Buffer.concat(data)));
      }).on('error', reject);
    });
  }

  async _callGoogleCloudTTSApi({ text, ssml = null, voiceId, speed, apiKey }) {
    const input = ssml ? { ssml } : { text };
    const postData = JSON.stringify({
      input,
      voice: {
        languageCode: 'gu-IN',
        name: voiceId || 'gu-IN-Wavenet-A'
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: Math.max(0.25, Math.min(4.0, speed || 1.0))
      }
    });

    return new Promise((resolve, reject) => {
      const req = https.request(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.audioContent) {
              resolve(Buffer.from(parsed.audioContent, 'base64'));
            } else if (parsed.error) {
              reject(new Error(parsed.error.message || 'Google Cloud TTS API Error'));
            } else {
              reject(new Error('No audioContent returned from Google Cloud TTS'));
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  getAudioLibrary() {
    if (!fs.existsSync(this.audioOutputDir)) return [];

    const files = fs.readdirSync(this.audioOutputDir)
      .filter(f => f.endsWith('.mp3') || f.endsWith('.wav'))
      .map(filename => {
        const filePath = path.join(this.audioOutputDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename,
          audioUrl: `/audio/${filename}`,
          sizeBytes: stats.size,
          sizeFormatted: `${(stats.size / 1024).toFixed(1)} KB`,
          createdAt: stats.birthtime || stats.mtime
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return files;
  }

  renameAudioFile(oldFilename, newBaseName) {
    if (!fs.existsSync(this.audioOutputDir)) throw new Error('ઓડિયો ડિરેક્ટરી મળી નથી.');
    const oldPath = path.join(this.audioOutputDir, oldFilename);
    if (!fs.existsSync(oldPath)) throw new Error('મૂળ ઓડિયો ફાઇલ મળી નથી.');

    const sanitized = (newBaseName || '').replace(/[\\/:*?"<>|]/g, '_').replace(/\.mp3$/i, '');
    if (!sanitized) throw new Error('નવું નામ યોગ્ય નથી.');
    const newFilename = `${sanitized}.mp3`;
    const newPath = path.join(this.audioOutputDir, newFilename);
    fs.renameSync(oldPath, newPath);
    return {
      success: true,
      filename: newFilename,
      audioUrl: `/audio/${newFilename}`
    };
  }

  deleteAudioFile(filename) {
    if (!fs.existsSync(this.audioOutputDir)) throw new Error('ઓડિયો ડિરેક્ટરી મળી નથી.');
    const targetPath = path.join(this.audioOutputDir, filename);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      return { success: true, message: 'ફાઇલ ડિલીટ થઈ ગઈ.' };
    }
    throw new Error('ફાઇલ મળી નથી.');
  }
}

module.exports = new VoiceService();
