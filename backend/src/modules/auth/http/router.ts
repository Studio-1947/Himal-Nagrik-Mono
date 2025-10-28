import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';

import { authService, AuthError } from '../auth.service';
import type { DbUser } from '../auth.types';
import {
  loginSchema,
  profileUpdateSchema,
  registerSchema,
  type LoginInput,
  type ProfileUpdateInput,
  type RegisterInput,
} from '../auth.validation';

type AuthenticatedRequest = Request & { user: DbUser; token: string };

const authRouter = Router();

const handleZodError = (error: unknown, res: Response): boolean => {
  if (error instanceof z.ZodError) {
    res.status(400).json({
      message: 'Validation error',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return true;
  }
  return false;
};

const handleServiceError = (error: unknown, res: Response): boolean => {
  if (error instanceof AuthError) {
    res.status(error.status).json({ message: error.message });
    return true;
  }
  return false;
};

const authenticateRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    res.status(401).json({ message: 'Missing or invalid authorization header' });
    return;
  }

  const token = header.slice(7).trim();
  if (!token) {
    res.status(401).json({ message: 'Missing authorization token' });
    return;
  }

  try {
    const { user } = await authService.authenticate(token);
    (req as AuthenticatedRequest).token = token;
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    if (!handleServiceError(error, res)) {
      console.error('Failed to verify token', error);
      res.status(401).json({ message: 'Authentication failed' });
    }
  }
};

authRouter.post('/register', async (req, res, next) => {
  try {
    const payload = registerSchema.parse(req.body) as RegisterInput;
    const session = await authService.register(payload);
    res.status(201).json(session);
  } catch (error) {
    if (handleZodError(error, res)) {
      return;
    }
    if (handleServiceError(error, res)) {
      return;
    }
    next(error);
  }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const payload = loginSchema.parse(req.body) as LoginInput;
    const session = await authService.login(payload);
    res.json(session);
  } catch (error) {
    if (handleZodError(error, res)) {
      return;
    }
    if (handleServiceError(error, res)) {
      return;
    }
    next(error);
  }
});

authRouter.get(
  '/profile',
  (req, res, next) => {
    void authenticateRequest(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const profile = await authService.getProfile(user.id);
      if (!profile) {
        res.status(404).json({ message: 'Profile not found' });
        return;
      }
      res.json(profile);
    } catch (error) {
      next(error);
    }
  },
);

authRouter.patch(
  '/profile',
  (req, res, next) => {
    void authenticateRequest(req, res, next);
  },
  async (req, res, next) => {
    try {
      const updates = profileUpdateSchema.parse(req.body) as ProfileUpdateInput;
      const { user } = req as AuthenticatedRequest;
      const updatedUser = await authService.updateProfile(user, updates);
      (req as AuthenticatedRequest).user = updatedUser;
      res.json(authService.mapUserToProfile(updatedUser));
    } catch (error) {
      if (handleZodError(error, res)) {
        return;
      }
      if (handleServiceError(error, res)) {
        return;
      }
      next(error);
    }
  },
);

authRouter.post(
  '/logout',
  (req, res, next) => {
    void authenticateRequest(req, res, next);
  },
  (req, res) => {
    const { token } = req as AuthenticatedRequest;
    if (!token) {
      res.status(204).end();
      return;
    }
    res.status(204).end();
  },
);

export { authRouter };
