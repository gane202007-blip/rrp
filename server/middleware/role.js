/**
 * Role-Checking Middleware
 * =======================
 * Restricts access based on user role.
 * Must be used AFTER the auth (protect) middleware.
 * 
 * USAGE:
 *   router.get('/admin-only', protect, requireRole('admin'), handler);
 *   
 * HOW IT WORKS:
 *   - protect middleware sets req.user (with role)
 *   - requireRole checks if req.user.role matches the required role
 *   - Returns 403 Forbidden if role doesn't match
 */

const requireRole = (role) => {
  return (req, res, next) => {
    // req.user is set by the protect middleware
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        message: `Access denied. ${role} role required.`,
      });
    }

    next(); // Role matches → proceed
  };
};

module.exports = { requireRole };
