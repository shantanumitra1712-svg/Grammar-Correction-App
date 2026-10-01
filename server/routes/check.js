import express from 'express';
import crypto from 'crypto';
import { checkGrammar, applyCorrections } from '../services/checker.js';
import { CheckStore } from '../models/Check.js';
import { checkRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply rate limiter to check endpoints
router.post('/check', checkRateLimiter, async (req, res, next) => {
  try {
    const { text, tone = 'general', devMode = false, sessionId } = req.body;

    if (text === undefined || text === null) {
      return res.status(400).json({ error: 'Text field is required' });
    }

    if (typeof text !== 'string') {
      return res.status(400).json({ error: 'Text must be a string' });
    }

    const effectiveSessionId = sessionId && typeof sessionId === 'string'
      ? sessionId
      : 'anon_' + crypto.randomBytes(8).toString('hex');

    // Run grammar engine
    const checkResult = await checkGrammar(text, { tone, devMode });

    // Save to database/persistent store
    const savedDoc = await CheckStore.saveCheck({
      sessionId: effectiveSessionId,
      originalText: text,
      tone,
      devMode,
      issues: checkResult.issues
    });

    return res.json({
      id: savedDoc._id,
      sessionId: effectiveSessionId,
      originalText: text,
      tone,
      devMode,
      issues: checkResult.issues,
      issuesCount: checkResult.issues.length,
      correctedText: checkResult.correctedText,
      stats: {
        wordCount: checkResult.wordCount,
        charCount: checkResult.charCount
      },
      timestamp: savedDoc.timestamp
    });
  } catch (error) {
    next(error);
  }
});

// Recompute corrected text for specific accepted subset of issues
router.post('/correct', (req, res) => {
  try {
    const { originalText, issues } = req.body;
    if (typeof originalText !== 'string') {
      return res.status(400).json({ error: 'originalText is required' });
    }
    const correctedText = applyCorrections(originalText, issues || []);
    return res.json({ correctedText });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get user history
router.get('/history', async (req, res, next) => {
  try {
    const { sessionId, limit = 20 } = req.query;
    const history = await CheckStore.getHistory(sessionId, parseInt(limit, 10) || 20);
    return res.json({
      history,
      count: history.length
    });
  } catch (error) {
    next(error);
  }
});

// Get aggregated mistake analytics
router.get('/stats', async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    const stats = await CheckStore.getStats(sessionId);
    return res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
