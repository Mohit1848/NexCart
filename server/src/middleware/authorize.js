/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access to endpoints based on user roles
 *
 * @param  {...string} allowedRoles - e.g. 'admin', 'customer'
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required prior to authorization check.',
          statusCode: 401
        }
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied: You do not have sufficient permissions to perform this action.',
          statusCode: 403
        }
      });
    }

    next();
  };
};

export default authorize;