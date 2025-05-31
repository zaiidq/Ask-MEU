// server.js - Enhanced Ask-MEU Backend
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const KB_PATH = path.join(__dirname, 'kb.json');

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(__dirname));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Enhanced knowledge base operations with async/await
async function loadKB() {
  try {
    const data = await fs.readFile(KB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.log('KB file not found, creating new one...');
    const defaultKB = [];
    await saveKB(defaultKB);
    return defaultKB;
  }
}

async function saveKB(data) {
  try {
    await fs.writeFile(KB_PATH, JSON.stringify(data, null, 2));
    console.log('Knowledge base saved successfully');
  } catch (err) {
    console.error('Error saving knowledge base:', err);
    throw err;
  }
}

// Enhanced search function with fuzzy matching
function searchKB(kb, query) {
  if (!query || typeof query !== 'string') return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  const words = normalizedQuery.split(/\s+/);
  
  const results = kb.map(qa => {
    let score = 0;
    const qaText = `${qa.question} ${qa.answer} ${qa.category}`.toLowerCase();
    
    // Exact question match gets highest score
    if (qa.question.toLowerCase().includes(normalizedQuery)) {
      score += 100;
    }
    
    // Word matching with different weights
    words.forEach(word => {
      if (qa.question.toLowerCase().includes(word)) score += 10;
      if (qa.answer.toLowerCase().includes(word)) score += 5;
      if (qa.category.toLowerCase().includes(word)) score += 3;
    });
    
    // Boost popular answers
    score += qa.helpful * 2;
    
    return { ...qa, relevanceScore: score };
  })
  .filter(qa => qa.relevanceScore > 0)
  .sort((a, b) => b.relevanceScore - a.relevanceScore)
  .slice(0, 5); // Return top 5 results
  
  return results;
}

// API Routes with better error handling
app.get('/api/kb', async (req, res) => {
  try {
    const kb = await loadKB();
    const { category, limit = 50 } = req.query;
    
    let filteredKB = kb;
    if (category && category !== 'all') {
      filteredKB = kb.filter(qa => qa.category === category);
    }
    
    res.json(filteredKB.slice(0, parseInt(limit)));
  } catch (error) {
    console.error('Error loading KB:', error);
    res.status(500).json({ error: 'Failed to load knowledge base' });
  }
});

// Enhanced search endpoint
app.get('/api/search', async (req, res) => {
  try {
    const { q: query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const kb = await loadKB();
    const results = searchKB(kb, query);
    
    res.json({
      query,
      results,
      totalFound: results.length
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

app.post('/api/kb', async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    
    // Enhanced validation
    if (!question?.trim() || !answer?.trim() || !category?.trim()) {
      return res.status(400).json({ 
        error: 'Question, answer, and category are required and cannot be empty' 
      });
    }
    
    if (question.length > 500 || answer.length > 2000) {
      return res.status(400).json({ 
        error: 'Question or answer is too long' 
      });
    }
    
    const kb = await loadKB();
    
    // Check for duplicate questions
    const duplicate = kb.find(qa => 
      qa.question.toLowerCase().trim() === question.toLowerCase().trim()
    );
    
    if (duplicate) {
      return res.status(409).json({ 
        error: 'A question with similar content already exists' 
      });
    }
    
    const newQA = {
      id: Date.now() + Math.random(), // More unique ID
      question: question.trim(),
      answer: answer.trim(),
      category: category.trim().toLowerCase(),
      helpful: 0,
      notHelpful: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    kb.push(newQA);
    await saveKB(kb);
    
    res.status(201).json(newQA);
  } catch (error) {
    console.error('Error adding Q&A:', error);
    res.status(500).json({ error: 'Failed to add Q&A' });
  }
});

app.put('/api/kb/:id', async (req, res) => {
  try {
    const id = parseFloat(req.params.id);
    const { question, answer, category } = req.body;
    
    if (!question?.trim() || !answer?.trim() || !category?.trim()) {
      return res.status(400).json({ 
        error: 'Question, answer, and category are required' 
      });
    }
    
    const kb = await loadKB();
    const qaIndex = kb.findIndex(q => q.id === id);
    
    if (qaIndex === -1) {
      return res.status(404).json({ error: 'Q&A not found' });
    }
    
    kb[qaIndex] = {
      ...kb[qaIndex],
      question: question.trim(),
      answer: answer.trim(),
      category: category.trim().toLowerCase(),
      updatedAt: new Date().toISOString()
    };
    
    await saveKB(kb);
    res.json(kb[qaIndex]);
  } catch (error) {
    console.error('Error updating Q&A:', error);
    res.status(500).json({ error: 'Failed to update Q&A' });
  }
});

app.delete('/api/kb/:id', async (req, res) => {
  try {
    const id = parseFloat(req.params.id);
    let kb = await loadKB();
    
    const originalLength = kb.length;
    kb = kb.filter(q => q.id !== id);
    
    if (kb.length === originalLength) {
      return res.status(404).json({ error: 'Q&A not found' });
    }
    
    await saveKB(kb);
    res.json({ success: true, message: 'Q&A deleted successfully' });
  } catch (error) {
    console.error('Error deleting Q&A:', error);
    res.status(500).json({ error: 'Failed to delete Q&A' });
  }
});

app.post('/api/feedback', async (req, res) => {
  try {
    const { id, helpful } = req.body;
    
    if (typeof id !== 'number' || typeof helpful !== 'boolean') {
      return res.status(400).json({ 
        error: 'Invalid feedback data. ID must be number, helpful must be boolean' 
      });
    }
    
    const kb = await loadKB();
    const qa = kb.find(q => q.id === id);
    
    if (!qa) {
      return res.status(404).json({ error: 'Q&A not found' });
    }
    
    if (helpful) qa.helpful++;
    else qa.notHelpful++;
    
    qa.updatedAt = new Date().toISOString();
    
    await saveKB(kb);
    res.json({ 
      success: true, 
      helpful: qa.helpful, 
      notHelpful: qa.notHelpful 
    });
  } catch (error) {
    console.error('Error recording feedback:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const kb = await loadKB();
    
    const stats = {
      totalQAs: kb.length,
      totalQuestions: kb.reduce((sum, q) => sum + q.helpful + q.notHelpful, 0),
      helpfulResponses: kb.reduce((sum, q) => sum + q.helpful, 0),
      notHelpfulResponses: kb.reduce((sum, q) => sum + q.notHelpful, 0),
      averageHelpfulness: 0,
      topCategories: [],
      recentActivity: kb
        .filter(qa => qa.updatedAt)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        .slice(0, 5)
    };
    
    const totalFeedback = stats.helpfulResponses + stats.notHelpfulResponses;
    if (totalFeedback > 0) {
      stats.averageHelpfulness = (stats.helpfulResponses / totalFeedback * 100).toFixed(1);
    }
    
    const categoryCounts = {};
    const categoryHelpful = {};
    
    kb.forEach(q => {
      categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
      categoryHelpful[q.category] = (categoryHelpful[q.category] || 0) + q.helpful;
    });
    
    stats.topCategories = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        count,
        helpful: categoryHelpful[category] || 0
      }))
      .sort((a, b) => b.helpful - a.helpful)
      .slice(0, 8);
    
    res.json(stats);
  } catch (error) {
    console.error('Error generating stats:', error);
    res.status(500).json({ error: 'Failed to generate statistics' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

module.exports = app;