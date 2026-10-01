import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import checkRouter from './server/routes/check.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Connect to MongoDB if MONGO_URI is set
const mongoUri = process.env.MONGO_URI;
if (mongoUri && mongoUri.trim() !== '') {
  mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
    .then(() => console.log(' Connected to MongoDB at', mongoUri.replace(/\/\/.*@/, '//<credentials>@')))
    .catch((err) => console.warn(' MongoDB connection failed, using in-memory store fallback:', err.message));
} else {
  console.log('ℹ️ No MONGO_URI provided in env, running with high-performance in-memory fallback store.');
}

// Global middlewares
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// API health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    mongoConnected: mongoose.connection.readyState === 1,
    llmProvider: process.env.LLM_PROVIDER || 'gemini',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY || process.env.LLM_API_KEY)
  });
});

// API routes
app.use('/api', checkRouter);

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  // Centralized error handling middleware
  app.use((err, req, res, next) => {
    console.error('[Server Error]', err);
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || 'An unexpected error occurred during grammar analysis.'
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(` GrammarLens Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
