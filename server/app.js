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

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend assets
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/audio', express.static(path.join(__dirname, '..', 'public', 'audio')));

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Antigravity YouTube Creator AI Studio',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Route for Official Channel Website
app.get(['/website', '/channel'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'website.html'));
});

// Route for Creator AI Studio
app.get('/studio', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Single Page Application fallback for client-side routing
app.use((req, res) => {
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
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🚀 YouTube Creator AI Studio is running!`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`📡 Network URL: http://192.168.1.2:${PORT}`);
    console.log(`📺 Gujarati Creator Studio loaded with AI & YouTube APIs`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;
