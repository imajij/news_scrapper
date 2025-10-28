import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB, disconnectDB } from './utils/db.js';
import newsRouter from './routes/news.js';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

// Security and performance middlewares
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    name: 'News Scraper API',
    version: '1.0.0',
    endpoints: {
      live: '/api/news?sources=toi,bbc,ht,guardian&limit=10',
      stored: '/api/news/stored?limit=20&source=toi',
      sources: '/api/news/sources'
    },
    availableSources: ['toi', 'bbc', 'ht', 'guardian']
  });
});

// API routes
app.use('/api/news', newsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message || 'Unknown error';
  
  console.error('[ERROR]', err);
  res.status(status).json({ status: 'error', message });
});

// Connect to MongoDB and start server
let server;
async function startServer() {
  try {
    // Connect to MongoDB Atlas
    await connectDB();
    
    // Start Express server
    server = app.listen(PORT, () => {
      console.log(`[server] listening on port ${PORT}`);
      console.log(`[server] environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('[server] failed to start:', error.message);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown(signal) {
  console.log(`[server] received ${signal}, shutting down gracefully...`);
  
  if (server) {
    server.close(async () => {
      console.log('[server] HTTP server closed');
      await disconnectDB();
      console.log('[server] shutdown complete');
      process.exit(0);
    });
    
    // Force exit after 10 seconds
    setTimeout(() => {
      console.warn('[server] forcing exit after timeout');
      process.exit(1);
    }, 10000).unref();
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Start the server
startServer();
