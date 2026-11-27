const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const db = require('../db');

const ROOT_DIR = path.join(__dirname, '..', '..');
const VENV_PYTHON = path.join(ROOT_DIR, '.venv_avatar', 'Scripts', 'python.exe');
const RUNNER_SCRIPT = path.join(ROOT_DIR, 'ai_engines', 'run_talking_avatar.py');
const SADTALKER_DIR = path.join(ROOT_DIR, 'ai_engines', 'SadTalker');
const JOBS_BASE_DIR = path.join(ROOT_DIR, 'data', 'avatar_jobs');
const VIDEOS_OUT_DIR = path.join(ROOT_DIR, 'public', 'videos');
const AUDIO_DIR = path.join(ROOT_DIR, 'public', 'audio');

const jobs = new Map();

function ensureDirs() {
  fs.mkdirSync(JOBS_BASE_DIR, { recursive: true });
  fs.mkdirSync(VIDEOS_OUT_DIR, { recursive: true });
}

function getStatus() {
  const pythonOk = fs.existsSync(VENV_PYTHON);
  const runnerOk = fs.existsSync(RUNNER_SCRIPT);
  const ckptDir = path.join(SADTALKER_DIR, 'checkpoints');
  const gfpDir = path.join(SADTALKER_DIR, 'gfpgan', 'weights');

  const ckpt256 = fs.existsSync(path.join(ckptDir, 'SadTalker_V0.0.2_256.safetensors'));
  const ckpt512 = fs.existsSync(path.join(ckptDir, 'SadTalker_V0.0.2_512.safetensors'));
  const map109 = fs.existsSync(path.join(ckptDir, 'mapping_00109-model.pth.tar'));
  const map229 = fs.existsSync(path.join(ckptDir, 'mapping_00229-model.pth.tar'));
  const gfpganOk = fs.existsSync(path.join(gfpDir, 'GFPGANv1.4.pth'));

  const ready = Boolean(pythonOk && runnerOk && ckpt256 && map109 && map229 && ffmpegPath);
  return {
    ready,
    pythonOk,
    runnerOk,
    ffmpegOk: Boolean(ffmpegPath),
    checkpoints: {
      model256: ckpt256,
      model512: ckpt512,
      mapping109: map109,
      mapping229: map229,
      gfpgan: gfpganOk
    }
  };
}

function decodeDataUrl(dataUrl, workDir, baseName, fallbackExt) {
  const str = String(dataUrl || '');
  const match = str.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) {
    throw new Error(`Invalid base64 data URL for ${baseName}`);
  }
  const mime = match[1].toLowerCase();
  let ext = fallbackExt;
  if (mime.includes('jpeg') || mime.includes('jpg')) ext = '.jpg';
  else if (mime.includes('png')) ext = '.png';
  else if (mime.includes('webp')) ext = '.webp';
  else if (mime.includes('wav')) ext = '.wav';
  else if (mime.includes('mpeg') || mime.includes('mp3')) ext = '.mp3';
  else if (mime.includes('webm')) ext = '.webm';
  else if (mime.includes('ogg')) ext = '.ogg';
  else if (mime.includes('mp4') || mime.includes('m4a')) ext = '.m4a';

  const outPath = path.join(workDir, `${baseName}${ext}`);
  fs.writeFileSync(outPath, Buffer.from(match[2], 'base64'));
  return outPath;
}

function resolveSavedAudioPath(audioUrl) {
  const clean = String(audioUrl || '').split('?')[0].replace(/^\/+/, '');
  const candidate = path.resolve(ROOT_DIR, 'public', clean);
  if (candidate.startsWith(path.resolve(ROOT_DIR, 'public')) && fs.existsSync(candidate)) {
    return candidate;
  }
  throw new Error('પસંદ કરેલ સેવ કરેલો ઓડિયો મળ્યો નહીં.');
}

function runProcess(exe, args, { cwd, onLog } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(exe, args, { cwd: cwd || ROOT_DIR, windowsHide: true });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      const txt = chunk.toString();
      stdout += txt;
      if (onLog) txt.split(/\r?\n/).filter(Boolean).forEach(l => onLog(l));
    });
    proc.stderr.on('data', (chunk) => {
      const txt = chunk.toString();
      stderr += txt;
      if (onLog) txt.split(/\r?\n/).filter(Boolean).forEach(l => onLog(l));
    });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.slice(-800) || stdout.slice(-800) || `Process exited with code ${code}`));
    });
  });
}

async function getMediaDurationSec(filePath) {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-i', filePath], { windowsHide: true });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', () => {
      const m = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
      if (m) {
        const sec = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
        return resolve(Math.max(1, sec));
      }
      resolve(5);
    });
    proc.on('error', () => resolve(5));
  });
}

function even(n) {
  return Math.max(2, Math.floor(n / 2) * 2);
}

async function composeStudioVideo({ rawAvatarVideo, productPaths, layout, aspect, finalOutPath, onLog }) {
  const hasProducts = Array.isArray(productPaths) && productPaths.length > 0;
  const dims = aspect === '9:16'
    ? { w: 720, h: 1280 }
    : (aspect === '1:1' ? { w: 1080, h: 1080 } : { w: 1280, h: 720 });

  if (!hasProducts && aspect === 'raw') {
    await runProcess(ffmpegPath, [
      '-y', '-i', rawAvatarVideo,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
      finalOutPath
    ], { onLog });
    return;
  }

  if (!hasProducts || layout === 'full') {
    const filter = `[0:v]scale=${dims.w}:${dims.h}:force_original_aspect_ratio=increase,crop=${dims.w}:${dims.h},boxblur=24:6[bg];` +
      `[0:v]scale=${dims.w}:${dims.h}:force_original_aspect_ratio=decrease[fg];` +
      `[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[vout]`;
    await runProcess(ffmpegPath, [
      '-y', '-i', rawAvatarVideo,
      '-filter_complex', filter,
      '-map', '[vout]', '-map', '0:a?',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
      '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
      finalOutPath
    ], { onLog });
    return;
  }

  const dur = await getMediaDurationSec(rawAvatarVideo);
  const perSlide = Math.max(1.5, dur / productPaths.length);

  if (layout === 'split') {
    const isVertical = aspect === '9:16';
    const spkW = isVertical ? dims.w : even(dims.w / 2);
    const spkH = isVertical ? even(dims.h / 2) : dims.h;
    const prodW = isVertical ? dims.w : (dims.w - spkW);
    const prodH = isVertical ? (dims.h - spkH) : dims.h;

    const inputs = ['-y'];
    const prodFilters = [];
    productPaths.forEach((p, idx) => {
      inputs.push('-loop', '1', '-t', perSlide.toFixed(3), '-i', p);
      prodFilters.push(
        `[${idx}:v]scale=${prodW}:${prodH}:force_original_aspect_ratio=decrease,pad=${prodW}:${prodH}:(ow-iw)/2:(oh-ih)/2:color=#0f172a,setsar=1,fps=25[p${idx}]`
      );
    });
    const spkIdx = productPaths.length;
    inputs.push('-i', rawAvatarVideo);

    const concatInputs = productPaths.map((_, i) => `[p${i}]`).join('');
    const stackOp = isVertical ? 'vstack=inputs=2' : 'hstack=inputs=2';
    const filter =
      prodFilters.join(';') + ';' +
      `${concatInputs}concat=n=${productPaths.length}:v=1:a=0,fps=25[prod];` +
      `[${spkIdx}:v]scale=${spkW}:${spkH}:force_original_aspect_ratio=increase,crop=${spkW}:${spkH},setsar=1,fps=25[spk];` +
      `[spk][prod]${stackOp},format=yuv420p[vout]`;

    await runProcess(ffmpegPath, [
      ...inputs,
      '-filter_complex', filter,
      '-map', '[vout]', '-map', `${spkIdx}:a?`,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
      '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
      finalOutPath
    ], { onLog });
    return;
  }

  // Default: 'pip' -> Product photos full canvas + Talking Avatar framed nicely in bottom-right corner
  const inputs = ['-y'];
  const prodFilters = [];
  productPaths.forEach((p, idx) => {
    inputs.push('-loop', '1', '-t', perSlide.toFixed(3), '-i', p);
    prodFilters.push(
      `[${idx}:v]scale=${dims.w}:${dims.h}:force_original_aspect_ratio=decrease,pad=${dims.w}:${dims.h}:(ow-iw)/2:(oh-ih)/2:color=#0f172a,setsar=1,fps=25[p${idx}]`
    );
  });
  const spkIdx = productPaths.length;
  inputs.push('-i', rawAvatarVideo);

  const pipW = even(aspect === '9:16' ? dims.w * 0.42 : dims.w * 0.28);
  const concatInputs = productPaths.map((_, i) => `[p${i}]`).join('');
  const filter =
    prodFilters.join(';') + ';' +
    `${concatInputs}concat=n=${productPaths.length}:v=1:a=0,fps=25[prod];` +
    `[${spkIdx}:v]scale=${pipW}:-2,pad=iw+10:ih+10:5:5:color=#38bdf8[spk];` +
    `[prod][spk]overlay=main_w-overlay_w-24:main_h-overlay_h-24,format=yuv420p[vout]`;

  await runProcess(ffmpegPath, [
    ...inputs,
    '-filter_complex', filter,
    '-map', '[vout]', '-map', `${spkIdx}:a?`,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
    finalOutPath
  ], { onLog });
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function createRenderJob(payload = {}) {
  ensureDirs();
  const status = getStatus();
  if (!status.ready) {
    throw new Error('AI Talking Avatar એન્જિન અથવા તેના મોડેલ હજી તૈયાર નથી. કૃપા કરીને થોડી વાર પછી પ્રયાસ કરો.');
  }

  const jobId = `av-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const workDir = path.join(JOBS_BASE_DIR, jobId);
  fs.mkdirSync(workDir, { recursive: true });

  const job = {
    jobId,
    status: 'queued',
    progress: 5,
    step: 'ફાઇલો તૈયાર થઈ રહી છે...',
    logs: [],
    videoUrl: '',
    filename: '',
    error: '',
    createdAt: new Date().toISOString()
  };
  jobs.set(jobId, job);

  const pushLog = (line) => {
    const clean = String(line || '').trim();
    if (!clean) return;
    job.logs.push(clean);
    if (job.logs.length > 60) job.logs.shift();
    if (clean.includes('Extracting 3D face')) {
      job.progress = 20;
      job.step = '૧/૪: ચહેરાના 3D પોઈન્ટ્સ સ્કેન થઈ રહ્યા છે...';
    } else if (clean.includes('Synthesizing realistic lip-sync')) {
      job.progress = 42;
      job.step = '૨/૪: અવાજ પરથી અસલી લિપ-સિંક (Lip-Sync) બની રહ્યું છે...';
    } else if (clean.includes('Rendering high-realism talking video')) {
      job.progress = 62;
      job.step = '૩/૪: RTX 3060 GPU પર અસલી બોલતો વિડિયો રેન્ડર થઈ રહ્યો છે...';
    } else if (clean.includes('Face Enhancer')) {
      job.progress = 78;
      job.step = '૩.૫/૪: GFPGAN HD વડે ચહેરો વધુ સ્પષ્ટ થઈ રહ્યો છે...';
    }
  };

  setImmediate(async () => {
    try {
      job.status = 'running';
      pushLog('Preparing speaker photo, speech audio, and studio layout...');

      if (!payload.speakerImageBase64) {
        throw new Error('બોલનાર વ્યક્તિનો ફોટો અપલોડ કરવો જરૂરી છે.');
      }
      const speakerPath = decodeDataUrl(payload.speakerImageBase64, workDir, 'speaker', '.jpg');

      let audioPath = '';
      if (payload.speechAudioBase64) {
        audioPath = decodeDataUrl(payload.speechAudioBase64, workDir, 'speech', '.wav');
      } else if (payload.speechAudioUrl) {
        audioPath = resolveSavedAudioPath(payload.speechAudioUrl);
      } else {
        throw new Error('તમારી Speech (ઓડિયો) રેકોર્ડ અથવા અપલોડ કરવી જરૂરી છે.');
      }

      const productList = Array.isArray(payload.productImagesBase64) ? payload.productImagesBase64.slice(0, 10) : [];
      const productPaths = productList.map((img, i) => decodeDataUrl(img, workDir, `product_${i + 1}`, '.jpg'));

      const size = Number(payload.size) === 512 && status.checkpoints.model512 ? 512 : 256;
      const preprocess = payload.preprocess === 'crop' ? 'crop' : 'full';
      const enhancer = payload.enhancer !== false && status.checkpoints.gfpgan ? 'gfpgan' : 'none';
      const still = payload.still === true;
      const expressionScale = Math.min(1.6, Math.max(0.7, Number(payload.expressionScale) || 1.15));
      const layout = ['pip', 'split', 'full'].includes(payload.layout) ? payload.layout : (productPaths.length ? 'pip' : 'full');
      const aspect = ['16:9', '9:16', '1:1', 'raw'].includes(payload.aspect) ? payload.aspect : '16:9';

      const rawAvatarVideo = path.join(workDir, 'avatar_raw.mp4');
      const runnerArgs = [
        RUNNER_SCRIPT,
        '--image', speakerPath,
        '--audio', audioPath,
        '--output', rawAvatarVideo,
        '--work-dir', path.join(workDir, 'sadtalker_tmp'),
        '--size', String(size),
        '--preprocess', preprocess,
        '--enhancer', enhancer,
        '--expression-scale', String(expressionScale),
        '--batch-size', '4'
      ];
      if (still) runnerArgs.push('--still');

      job.progress = 12;
      job.step = 'AI મોડેલ લોડ થઈ રહ્યા છે (પ્રથમ વાર 15-30 સેકન્ડ લાગી શકે)...';
      await runProcess(VENV_PYTHON, runnerArgs, { cwd: SADTALKER_DIR, onLog: pushLog });

      if (!fs.existsSync(rawAvatarVideo)) {
        throw new Error('SadTalker એ વિડિયો ફાઇલ બનાવી નહીં.');
      }

      job.progress = 88;
      job.step = productPaths.length
        ? '૪/૪: વસ્તુના ફોટા અને બોલતો વિડિયો HD માં મર્જ થઈ રહ્યા છે...'
        : '૪/૪: ફાઇનલ Full HD MP4 તૈયાર થઈ રહ્યો છે...';

      const outFilename = `avatar_${Date.now()}.mp4`;
      const finalOutPath = path.join(VIDEOS_OUT_DIR, outFilename);
      await composeStudioVideo({
        rawAvatarVideo,
        productPaths,
        layout,
        aspect,
        finalOutPath,
        onLog: pushLog
      });

      try {
        if (typeof db.addVideoEntry === 'function') {
          db.addVideoEntry({
            title: String(payload.title || 'AI Talking Avatar Video').trim(),
            filename: outFilename,
            url: `/videos/${outFilename}`,
            type: 'talking-avatar'
          });
        }
      } catch (_) {}

      job.status = 'completed';
      job.progress = 100;
      job.step = '✅ અસલી બોલતો વિડિયો તૈયાર છે!';
      job.filename = outFilename;
      job.videoUrl = `/videos/${outFilename}`;

      // Clean heavy intermediate directory asynchronously
      setTimeout(() => {
        try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (_) {}
      }, 30000);
    } catch (err) {
      job.status = 'failed';
      job.error = err.message || 'વિડિયો બનાવવામાં ભૂલ આવી.';
      job.step = '❌ ભૂલ આવી';
      pushLog('ERROR: ' + job.error);
    }
  });

  return job;
}

function listAvailableAudios() {
  const results = [];
  try {
    if (fs.existsSync(AUDIO_DIR)) {
      const files = fs.readdirSync(AUDIO_DIR)
        .filter(f => /\.(mp3|wav|m4a|ogg|webm)$/i.test(f))
        .map(f => {
          const full = path.join(AUDIO_DIR, f);
          const st = fs.statSync(full);
          return {
            filename: f,
            url: `/audio/${f}`,
            sizeKB: Math.round(st.size / 1024),
            mtimeMs: st.mtimeMs
          };
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs)
        .slice(0, 40);
      results.push(...files);
    }
  } catch (_) {}
  return results;
}

module.exports = {
  getStatus,
  createRenderJob,
  getJob,
  listAvailableAudios
};
