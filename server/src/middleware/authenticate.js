import { verifyToken } from '../config/jwt.js';

/**
 * Authentication Middleware
 * Validates the Authorization: Bearer <token> header and attaches the authenticated user identity to req.user.
 */
export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Authentication required. No authorization token was provided.',
        statusCode: 401
      }
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid authorization format. Format must be "Bearer <token>".',
        statusCode: 401
      }
    });
  }

  const token = parts[1];

  try {
    const decoded = verifyToken(token);
    // Attach verified token claims to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (err) {
    let message = 'Invalid or expired authentication token.';
    if (err.name === 'TokenExpiredError') {
      message = 'Authentication token has expired. Please log in again.';
    } else if (err.name === 'JsonWebTokenError') {
      message = 'Invalid authentication token signature or malformed token.';
    }

    return res.status(401).json({
      success: false,
      error: {
        message,
        statusCode: 401
      }
    });
  }
};

export default authenticate;