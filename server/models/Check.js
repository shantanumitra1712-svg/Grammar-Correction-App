import mongoose from 'mongoose';

// MongoDB Schema for Check history
const issueSubSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    enum: ['grammar', 'spelling', 'structure', 'style'],
    required: true
  },
  original: { type: String, required: true },
  suggestion: { type: String, required: true },
  explanation: { type: String, required: true },
  startIndex: { type: Number, required: true },
  endIndex: { type: Number, required: true }
}, { _id: false });

const checkSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  originalText: { type: String, required: true },
  tone: { type: String, default: 'general' },
  devMode: { type: Boolean, default: false },
  issues: [issueSubSchema],
  issuesCount: { type: Number, default: 0 },
  timestamp: { type: Date, default: Date.now, index: true }
});

let MongooseCheckModel = null;
try {
  MongooseCheckModel = mongoose.model('Check', checkSchema);
} catch (e) {
  MongooseCheckModel = mongoose.models.Check;
}

// In-memory fallback repository when MongoDB is not connected
const inMemoryStore = [];

export const CheckStore = {
  isMongoConnected() {
    return mongoose.connection.readyState === 1;
  },

  async saveCheck({ sessionId, originalText, tone = 'general', devMode = false, issues = [] }) {
    const record = {
      sessionId,
      originalText,
      tone,
      devMode,
      issues,
      issuesCount: issues.length,
      timestamp: new Date()
    };

    if (this.isMongoConnected() && MongooseCheckModel) {
      try {
        const doc = new MongooseCheckModel(record);
        return await doc.save();
      } catch (err) {
        console.warn('MongoDB save failed, falling back to memory store:', err.message);
      }
    }

    // Fallback store
    const fallbackDoc = {
      _id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      ...record
    };
    inMemoryStore.unshift(fallbackDoc);
    // Keep last 100 entries in memory
    if (inMemoryStore.length > 100) {
      inMemoryStore.pop();
    }
    return fallbackDoc;
  },

  async getHistory(sessionId, limit = 20) {
    if (this.isMongoConnected() && MongooseCheckModel) {
      try {
        const query = sessionId ? { sessionId } : {};
        return await MongooseCheckModel.find(query).sort({ timestamp: -1 }).limit(limit).lean();
      } catch (err) {
        console.warn('MongoDB query failed, falling back to memory store:', err.message);
      }
    }

    let records = inMemoryStore;
    if (sessionId) {
      records = records.filter(item => item.sessionId === sessionId);
    }
    return records.slice(0, limit);
  },

  async getStats(sessionId) {
    const history = await this.getHistory(sessionId, 200);

    const typeCounts = {
      grammar: 0,
      spelling: 0,
      structure: 0,
      style: 0
    };

    let totalChecks = history.length;
    let totalIssuesFound = 0;
    const repetitiveIssuesMap = {};

    history.forEach(check => {
      if (Array.isArray(check.issues)) {
        check.issues.forEach(issue => {
          totalIssuesFound++;
          if (typeCounts[issue.type] !== undefined) {
            typeCounts[issue.type]++;
          }
          const key = issue.original.toLowerCase().trim();
          if (key.length > 1 && key.length < 50) {
            repetitiveIssuesMap[key] = (repetitiveIssuesMap[key] || 0) + 1;
          }
        });
      }
    });

    const topRepetitive = Object.entries(repetitiveIssuesMap)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalChecks,
      totalIssuesFound,
      typeCounts,
      topRepetitive,
      isMongoConnected: this.isMongoConnected()
    };
  }
};

export default MongooseCheckModel;
