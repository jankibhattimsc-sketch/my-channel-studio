require('dotenv').config();

process.on('unhandledRejection', (reason) => {
  console.warn('[Server Warning] Unhandled Rejection:', reason && reason.message ? reason.message : reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Server Warning] Uncaught Exception:', err && err.message ? err.message : err);
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const youtubeRoutes = require('./routes/youtube');
const topicsRoutes = require('./routes/topics');
const seoRoutes = require('./routes/seo');
const thumbnailsRoutes = require('./routes/thumbnails');
const scriptsRoutes = require('./routes/scripts');
const chatRoutes = require('./routes/chat');
const researchRoutes = require('./routes/research');
const settingsRoutes = require('./routes/settings');
const voiceRoutes = require('./routes/voice');
const plannerRoutes = require('./routes/planner');
const previewRoutes = require('./routes/preview');
const avatarRoutes = require('./routes/avatar');
const worksheetsRoutes = require('./routes/worksheets');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use((req, res, next) => {
  if (!req.url.startsWith('/vendor') && !req.url.startsWith('/favicon')) {
    console.log(`[HTTP ${req.method}] ${req.url}`);
  }
  next();
});
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: true, limit: '500mb' }));
app.use(express.raw({ type: ['video/*', 'application/octet-stream'], limit: '500mb' }));

// Direct APK Download Route for Mobile (mounted before static so headers always apply)
app.get(['/download-apk', '/app', '/gyan-yatra-studio.apk', '/gyan_yatra_studio.apk'], (req, res) => {
  const apkPath = path.join(__dirname, '..', 'public', 'gyan-yatra-studio.apk');
  if (fs.existsSync(apkPath)) {
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="gyan-yatra-studio.apk"');
    res.sendFile(apkPath);
  } else {
    res.status(404).send('APK is currently building. Please wait a minute and retry.');
  }
});

// Serve static frontend assets with no-cache so updates reflect immediately on refresh
app.use(express.static(path.join(__dirname, '..', 'public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res, filePath) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
    if (filePath && filePath.endsWith('.mjs')) {
      res.set('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));
app.use('/audio', express.static(path.join(__dirname, '..', 'public', 'audio')));
app.use('/videos', express.static(path.join(__dirname, '..', 'public', 'videos')));
app.use('/presentations', express.static(path.join(__dirname, '..', 'public', 'presentations')));
app.use('/vendor/pdfjs', (req, res, next) => {
  if (req.path.endsWith('.mjs')) {
    res.type('application/javascript');
  }
  next();
}, express.static(path.join(__dirname, '..', 'public', 'vendor', 'pdfjs')));



// Mobile & WhatsApp-friendly standalone video player
app.get('/watch', (req, res) => {
  const file = req.query.v || 'latest_video.mp4';
  const cleanFile = path.basename(file);
  const videoSrc = `/videos/${cleanFile}`;
  const title = req.query.title || 'Gyan Yatra Educational Video';
  const host = req.get('host') || '192.168.1.2:5000';
  const fullShareUrl = `http://${host}/watch?v=${cleanFile}`;

  let fileTimeDisplay = '';
  try {
    const filePath = path.join(__dirname, '..', 'public', 'videos', cleanFile);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const mtime = stats.mtime;
      fileTimeDisplay = mtime.toLocaleTimeString('gu-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) +
        ' (' + mtime.toLocaleDateString('gu-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'long', year: 'numeric' }) + ')';
    }
  } catch (_) {}

  const html = `<!DOCTYPE html>
<html lang="gu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="ઓરિજિનલ ગુજરાતી ૧૦૮૦p પ્રેઝન્ટેશન વિડીયો • બન્યા સમય: ${fileTimeDisplay || 'તાજો વિડીયો'}">
  <meta property="og:type" content="video.other">
  <meta property="og:video" content="http://${host}${videoSrc}">
  <meta property="og:video:type" content="video/mp4">
  <style>
    body {
      margin: 0; padding: 14px; background: #0f172a; color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; box-sizing: border-box;
    }
    .card {
      width: 100%; max-width: 860px; background: #1e293b; border-radius: 16px; overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5); border: 1.5px solid #334155;
    }
    video { width: 100%; display: block; background: #000; aspect-ratio: 16/9; }
    .meta { padding: 18px 20px; }
    h1 { font-size: 1.15rem; margin: 0 0 10px 0; color: #f8fafc; }
    .btns { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
    .btn {
      flex: 1; min-width: 140px; padding: 12px 18px; border-radius: 8px; font-weight: 800; font-size: 0.92rem;
      text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    }
    .btn-dl { background: linear-gradient(135deg, #10b981, #059669); color: #fff; }
    .btn-wa { background: linear-gradient(135deg, #25D366, #128C7E); color: #fff; }
  </style>
</head>
<body>
  <div class="card">
    <video controls autoplay playsinline preload="auto">
      <source src="${videoSrc}" type="video/mp4">
      તમારું બ્રાઉઝર વિડીયો સપોર્ટ કરતું નથી.
    </video>
    <div class="meta">
      <h1>🎬 ${title}</h1>
      <div style="font-size: 0.82rem; color: #94a3b8;">✓ 1080p Full HD • ઓરિજિનલ ગુજરાતી અવાજ ${fileTimeDisplay ? `• 🕒 બન્યા સમય: <strong style="color:#38bdf8;">${fileTimeDisplay}</strong>` : ''}</div>
      <div class="btns">
        <a href="/api/voice/download-video?file=${cleanFile}&name=presentation_1080p.mp4" class="btn btn-dl" download>
          <span>📥</span> <span>મોબાઇલમાં ડાઉનલોડ કરો</span>
        </a>
        <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareUrl)}" class="btn btn-wa">
          <span>💬</span> <span>WhatsApp માં શેર કરો</span>
        </a>
      </div>
    </div>
  </div>
</body>
</html>`;
  res.send(html);
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/thumbnails', thumbnailsRoutes);
app.use('/api/scripts', scriptsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/voice', voiceRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/preview', previewRoutes);
app.use('/api/avatar', avatarRoutes);
app.use('/api/worksheet-studio', worksheetsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Antigravity YouTube Creator AI Studio',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Network info endpoint for mobile & WhatsApp sharing
const os = require('os');
app.get('/api/network-info', (req, res) => {
  let localIp = '127.0.0.1';
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          localIp = net.address;
          break;
        }
      }
      if (localIp !== '127.0.0.1') break;
    }
  } catch (_) {}
  res.json({
    success: true,
    localIp,
    port: PORT,
    networkUrl: `http://${localIp}:${PORT}`
  });
});

// Firebase Web Public Configuration
app.get('/api/firebase-config', (req, res) => {
  res.json({
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'gyan-yatra-ai-studio.firebaseapp.com',
    projectId: process.env.FIREBASE_PROJECT_ID || 'gyan-yatra-ai-studio',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'gyan-yatra-ai-studio.firebasestorage.app',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || ''
  });
});

// Cloud Sync Status & Manual Backup/Restore
app.get('/api/cloud/status', (req, res) => {
  const cloudSync = require('./services/cloudSyncService');
  res.json({ success: true, ...cloudSync.getStatus() });
});

app.post('/api/cloud/sync', async (req, res) => {
  const cloudSync = require('./services/cloudSyncService');
  const db = require('./db');
  const ok = await cloudSync.pushDatabase(db.data);
  res.json({ success: ok, ...cloudSync.getStatus() });
});

// Route for Official Channel Website
app.get(['/website', '/channel'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'website.html'));
});

// Route for Dedicated Standalone Preview Web Portal
app.get(['/preview', '/preview.html'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'preview.html'));
});

// Route for Desktop Mobile App Simulator & Preview
app.get(['/app-preview', '/simulator', '/app-preview.html', '/mobile-preview'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'app-preview.html'));
});

// Route for Creator AI Studio
app.get('/studio', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Single Page Application fallback for client-side routing
app.use((req, res, next) => {
  if (req.path.includes('.') || req.path.startsWith('/api/')) {
    return res.status(404).send('Not Found');
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[App Error Handler]:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start server if executed directly
if (require.main === module) {
  const db = require('./db');
  db.syncFromCloudOnBoot().catch(() => {});
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🚀 YouTube Creator AI Studio is running!`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`📡 Network URL: http://192.168.1.2:${PORT}`);
    console.log(`📺 Gujarati Creator Studio loaded with AI & YouTube APIs`);
    console.log(`======================================================\n`);
  });
  setInterval(() => {}, 60000);
}

module.exports = app;
