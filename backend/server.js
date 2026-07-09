import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { parseCSVFromBuffer } from './utils/csv.js';
import { extractCRMFieldsBatch } from './utils/ai.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse JSON request bodies (increased limit to support batch uploads)
app.use(express.json({ limit: '10mb' }));

// Configure Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

/**
 * Endpoint to upload and parse CSV file (Preview phase)
 */
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a valid CSV file.' });
    }

    // Ensure it's a CSV file
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    if (fileExtension !== 'csv' && req.file.mimetype !== 'text/csv') {
      return res.status(400).json({ error: 'Invalid file format. Only CSV files are supported.' });
    }

    const { headers, rows } = await parseCSVFromBuffer(req.file.buffer);

    res.json({
      success: true,
      filename: req.file.originalname,
      rowCount: rows.length,
      headers,
      rows
    });
  } catch (error) {
    console.error('Error during CSV upload & parsing:', error);
    res.status(500).json({ error: 'Failed to parse CSV file: ' + error.message });
  }
});

/**
 * Endpoint to map a batch of records using Gemini AI
 */
app.post('/api/extract-batch', async (req, res) => {
  try {
    const { records } = req.body;
    if (!records || !Array.isArray(records)) {
      return res.status(400).json({ error: 'Missing or invalid "records" array in request body.' });
    }

    if (records.length === 0) {
      return res.json({ success: true, results: [] });
    }

    // Get API Key from header or body, fallback to process.env.GEMINI_API_KEY. Default to 'mock_mode' if none is found.
    const apiKey = req.headers['x-gemini-api-key'] || req.body.apiKey || process.env.GEMINI_API_KEY || 'mock_mode';

    const results = await extractCRMFieldsBatch(records, apiKey);

    res.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error in /api/extract-batch:', error);
    res.status(500).json({ error: error.message || 'An error occurred during AI mapping.' });
  }
});

// Start the server (only if not running in Vercel serverless environment)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
