/**
 * Health Controller
 * Provides system diagnostics and status checks for monitoring and readiness.
 */

export const getHealthStatus = (req, res) => {
  const uptimeSeconds = Math.floor(process.uptime());
  
  res.status(200).json({
    status: 'ok',
    message: 'ShopMate AI API is online and healthy',
    timestamp: new Date().toISOString(),
    uptime: `${uptimeSeconds}s`,
    environment: process.env.NODE_ENV || 'development',
    service: 'shopmate-server',
    version: '1.0.0'
  });
};
