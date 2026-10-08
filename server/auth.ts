import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IUser, UserRole } from './models.js';
import { dbStore } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be configured and at least 32 characters long.');
const jwtSecret: string = JWT_SECRET;

export interface AuthJwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  patientId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: IUser;
  jwtPayload?: AuthJwtPayload;
}

export function generateToken(user: IUser): string {
  const payload: AuthJwtPayload = {
    userId: user.id || user._id || '',
    email: user.email,
    role: user.role,
    name: user.name,
    patientId: user.patientId
  };

  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthJwtPayload | null {
  try {
    return jwt.verify(token, jwtSecret) as unknown as AuthJwtPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Express middleware to authenticate JWT from Authorization header.
 */
export function authenticateUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Authentication token required.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized. Invalid or expired token.' });
  }

  // Find user in store
  const user = dbStore.users.find(u => (u.id === decoded.userId || u._id === decoded.userId));
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized. User account not found.' });
  }

  if (user.accountStatus !== 'ACTIVE') {
    return res.status(403).json({ error: `Account is currently ${user.accountStatus.toLowerCase()}. Access denied.` });
  }

  req.user = user;
  req.jwtPayload = decoded;
  next();
}

/**
 * Express middleware to enforce Server-Side Role-Based Access Control (RBAC).
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Log unauthorized attempt in audit log
      dbStore.appendAuditLogEntry({
        eventType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        actor: {
          id: req.user.id || req.user._id || 'unknown',
          name: req.user.name,
          email: req.user.email,
          role: req.user.role
        },
        details: {
          path: req.originalUrl,
          method: req.method,
          requiredRoles: allowedRoles,
          userRole: req.user.role,
          reason: 'Insufficient role permissions'
        }
      });

      return res.status(403).json({
        error: 'Forbidden. Your role does not have authorization to access this resource.',
        requiredRoles: allowedRoles,
        currentRole: req.user.role
      });
    }

    next();
  };
}
