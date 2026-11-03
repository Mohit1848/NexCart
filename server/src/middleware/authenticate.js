import { verifyToken } from '../config/jwt.js';
import { query } from '../config/db.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Authentication Middleware
 * 
 * Security Hardening (Pre-Phase 7):
 * 1. Cryptographically verifies Bearer JWT signature, issuer, audience, and expiration.
 * 2. Queries PostgreSQL primary key (users.id) to guarantee user exists (rejects deleted users).
 * 3. Verifies tokenVersion matches live users.token_version (invalidates sessions after password change).
 * 4. Binds the live database role (users.role) to req.user (instant enforcement of admin demotion/elevation).
 * 5. Database errors fail closed with HTTP 500.
 */
export const authenticate = async (req, res, next) => {
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
  let decoded;

  try {
    decoded = verifyToken(token);
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

  // Validate UUID format to prevent invalid input syntax database errors
  if (!decoded.id || !UUID_REGEX.test(decoded.id)) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid user identity format in token claims.',
        statusCode: 401
      }
    });
  }

  // Live PostgreSQL verification: Existence, Role, and Session Revocation
  try {
    const userRes = await query(
      'SELECT id, email, role, token_version FROM users WHERE id = $1 LIMIT 1;',
      [decoded.id]
    );

    // Requirement B: Reject deleted or non-existent users
    if (userRes.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User account no longer exists or has been deleted.',
          statusCode: 401
        }
      });
    }

    const liveUser = userRes.rows[0];

    // Requirement C: Revoke sessions issued prior to password change
    const tokenVersion = decoded.tokenVersion ?? 1;
    if (tokenVersion !== liveUser.token_version) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Session has been invalidated or revoked. Please log in again.',
          statusCode: 401
        }
      });
    }

    // Requirement A: Bind verified live database role (instant demotion/elevation enforcement)
    req.user = {
      id: liveUser.id,
      email: liveUser.email,
      role: liveUser.role
    };

    next();
  } catch (dbErr) {
    // Fail closed: Database errors must NEVER grant access
    return res.status(500).json({
      success: false,
      error: {
        message: 'Authentication verification failed due to internal database error.',
        statusCode: 500
      }
    });
  }
};

export default authenticate;
