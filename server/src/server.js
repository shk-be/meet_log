const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { initializeDatabase } = require('./database/db');

// Routes
const meetingsRouter = require('./routes/meetings');
const actionItemsRouter = require('./routes/actionItems');
const tagsRouter = require('./routes/tags');
const searchRouter = require('./routes/search');
const settingsRouter = require('./routes/settings');
const recordingsRouter = require('./routes/recordings');
const templatesRouter = require('./routes/templates');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API Routes
app.use('/api/meetings', meetingsRouter);
app.use('/api/action-items', actionItemsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/search', searchRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/recordings', recordingsRouter);
app.use('/api/templates', templatesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured',
    database: 'connected'
  });
});

// Serve static files from React app (when built) - only in production with client build
const clientBuildPath = path.join(__dirname, '../../client/dist');
const fs = require('fs');

if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));

  // Fallback to React app for client-side routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  // API only mode (for separate backend deployment)
  app.get('*', (req, res) => {
    res.status(404).json({
      error: 'API endpoint not found',
      message: 'This is an API-only server. Please use /api/* endpoints.'
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || '서버 오류가 발생했습니다.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log('✓ Database initialized');

    // Initialize default templates
    const templateService = require('./services/templateService');
    await templateService.initializeDefaultTemplates();

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════╗
║   Meeting Logger Server v2.0                  ║
║                                               ║
║   Server running on http://localhost:${PORT}    ║
║   OpenAI: ${process.env.OPENAI_API_KEY ? '✓ Configured' : '✗ Not configured'}              ║
║                                               ║
║   API Endpoints:                              ║
║   - GET  /api/meetings                        ║
║   - POST /api/meetings                        ║
║   - GET  /api/action-items                    ║
║   - POST /api/search                          ║
║   - GET  /api/tags                            ║
║                                               ║
╚═══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
