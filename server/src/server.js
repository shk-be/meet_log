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

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
try {
  initializeDatabase();
  console.log('✓ Database initialized');
} catch (error) {
  console.error('✗ Database initialization failed:', error);
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/meetings', meetingsRouter);
app.use('/api/action-items', actionItemsRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/search', searchRouter);
app.use('/api/settings', settingsRouter);

// Serve static files from React app (when built)
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    openai: process.env.OPENAI_API_KEY ? 'configured' : 'not configured'
  });
});

// Fallback to React app for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || '서버 오류가 발생했습니다.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
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

module.exports = app;
