import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { checkDbConnection, closePool } from './config/db.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log('====================================================');
  console.log(`🚀 NexCart Server running in [${process.env.NODE_ENV || 'development'}] mode`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🩺 Liveness check:  http://localhost:${PORT}/api/health`);
  console.log(`🗄️ Readiness check: http://localhost:${PORT}/api/health/ready`);

  try {
    const dbInfo = await checkDbConnection();
    console.log(`✅ PostgreSQL: Connected to "${dbInfo.database}" (${dbInfo.version})`);
  } catch (err) {
    console.error('⚠️ PostgreSQL: Initial connection check failed:', err.message);
  }
  console.log('====================================================');
});

// Graceful process termination handling
const handleGracefulShutdown = async (signal) => {
  console.log(`\nReceived ${signal}. Gracefully terminating HTTP server...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await closePool();
    console.log('Process exiting cleanly.');
    process.exit(0);
  });

  // Force close if graceful shutdown hangs
  setTimeout(() => {
    console.error('Forcefully terminating process after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));