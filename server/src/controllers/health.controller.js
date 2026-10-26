import { checkDbConnection } from '../config/db.js';

/**
 * Liveness Probe: GET /api/health
 * Confirms whether the Node.js API process is running
 */
export const getHealthStatus = (req, res) => {
  const uptimeSeconds = Math.floor(process.uptime());

  res.status(200).json({
    status: 'ok',
    message: 'NexCart API is online and healthy',
    timestamp: new Date().toISOString(),
    uptime: `${uptimeSeconds}s`,
    environment: process.env.NODE_ENV || 'development',
    service: 'nexcart-api',
    version: '1.0.0'
  });
};

/**
 * Readiness Probe: GET /api/health/ready
 * Confirms whether the application can communicate with PostgreSQL
 */
export const getReadinessStatus = async (req, res) => {
  try {
    const dbInfo = await checkDbConnection();

    res.status(200).json({
      status: 'ready',
      message: 'NexCart API and database are ready to serve requests',
      timestamp: new Date().toISOString(),
      service: 'nexcart-api',
      database: {
        status: 'connected',
        name: dbInfo.database,
        version: dbInfo.version,
        serverTime: dbInfo.serverTime
      }
    });
  } catch (err) {
    // Return 503 Service Unavailable without exposing internal credentials
    res.status(503).json({
      status: 'unready',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      service: 'nexcart-api',
      database: {
        status: 'disconnected',
        error: 'Unable to reach PostgreSQL database'
      }
    });
  }
};