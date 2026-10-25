import jwt from "jsonwebtoken";

export function createAuthMiddleware(secret) {
  return function authenticate(req, res, next) {
    const authorization = req.get("authorization");
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: "Authentication required." });
    }

    try {
      req.user = jwt.verify(token, secret);
      return next();
    } catch {
      return res.status(401).json({ error: "Your session is invalid or expired. Please sign in again." });
    }
  };
}

export function requireRole(...roles) {
  return function authorize(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have permission to perform this action." });
    }
    return next();
  };
}
