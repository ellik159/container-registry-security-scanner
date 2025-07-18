const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const logger = require('./utils/logger');
const scanner = require('./scanner');
const { validateScanRequest } = require('./utils/validators');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage for scan results (TODO: move to Redis or DB)
const scanResults = new Map();
let scanIdCounter = 1000;

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Scan endpoint - handles async scanning
app.post('/api/scan', async (req, res) => {
  try {
    const { error, value } = validateScanRequest(req.body);
    
    if (error) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        details: error.details 
      });
    }

    const scanId = `scan_${scanIdCounter++}`;
    const { image, registry, policies } = value;

    logger.info(`Starting scan ${scanId} for image: ${image}`);

    // Store initial status
    scanResults.set(scanId, {
      id: scanId,
      image,
      status: 'scanning',
      startTime: new Date().toISOString(),
      progress: 0
    });

    // Start scan asynchronously
    scanner.scanImage(image, { registry, policies })
      .then(results => {
        scanResults.set(scanId, {
          ...scanResults.get(scanId),
          status: 'completed',
          endTime: new Date().toISOString(),
          progress: 100,
          results
        });
        logger.info(`Scan ${scanId} completed successfully`);
      })
      .catch(err => {
        scanResults.set(scanId, {
          ...scanResults.get(scanId),
          status: 'failed',
          endTime: new Date().toISOString(),
          error: err.message
        });
        logger.error(`Scan ${scanId} failed: ${err.message}`);
      });

    res.status(202).json({
      scanId,
      status: 'scanning',
      message: 'Scan initiated successfully',
      statusUrl: `/api/scan/${scanId}`
    });

    } catch (err) {
      logger.error(`Scan request error: ${err.message}`, { stack: err.stack });
      res.status(500).json({ 
        error: 'Internal server error',
        message: 'Failed to process scan request'
      });
    }
});

// Get scan results
app.get('/api/scan/:id', (req, res) => {
  const { id } = req.params;
  const scan = scanResults.get(id);

  if (!scan) {
    return res.status(404).json({ 
      error: 'Scan not found',
      scanId: id 
    });
  }

  res.json(scan);
});

// List recent scans
app.get('/api/scans', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  const scans = Array.from(scanResults.values())
    .slice(-limit)
    .reverse();

  res.json({
    total: scanResults.size,
    scans
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ 
    error: 'Internal server error' 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path 
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Container Registry Scanner API listening on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

module.exports = app;
