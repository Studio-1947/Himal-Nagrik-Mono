import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';

import { authService, AuthError } from '../../auth/auth.service';
import type { DbUser } from '../../auth/auth.types';
import {
  driverAvailabilityToggleSchema,
  driverDocumentSchema,
  driverProfilePatchSchema,
  type DriverAvailabilityToggleInput,
  type DriverDocumentInput,
  type DriverProfilePatchInput,
} from '../driver.validation';
import { driverService, DriverError } from '../driver.service';

type AuthenticatedRequest = Request & { user: DbUser; token: string };

const driverRouter = Router();

const handleErrorResponse = (error: unknown, res: Response): boolean => {
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

  if (error instanceof DriverError || error instanceof AuthError) {
    res.status(error.status).json({ message: error.message });
    return true;
  }

  return false;
};

const authenticateDriver = async (
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
    if (user.role !== 'driver') {
      res.status(403).json({ message: 'Access restricted to driver accounts' });
      return;
    }
    (req as AuthenticatedRequest).token = token;
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    if (!handleErrorResponse(error, res)) {
      console.error('Driver authentication failed', error);
      res.status(401).json({ message: 'Authentication failed' });
    }
  }
};

driverRouter.get(
  '/me',
  (req, res, next) => {
    void authenticateDriver(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const profile = await driverService.getSelfProfile(user.id);
      res.json(profile);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

driverRouter.patch(
  '/me',
  (req, res, next) => {
    void authenticateDriver(req, res, next);
  },
  async (req, res, next) => {
    try {
      const updates = driverProfilePatchSchema.parse(req.body) as DriverProfilePatchInput;
      const { user } = req as AuthenticatedRequest;
      const profile = await driverService.updateSelfProfile(user, updates);
      const updatedAuth = await authService.authenticate(
        (req as AuthenticatedRequest).token,
      );
      (req as AuthenticatedRequest).user = updatedAuth.user;
      res.json(profile);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

driverRouter.post(
  '/me/availability/toggle',
  (req, res, next) => {
    void authenticateDriver(req, res, next);
  },
  async (req, res, next) => {
    try {
      const body = driverAvailabilityToggleSchema.parse(req.body) as DriverAvailabilityToggleInput;
      const { user } = req as AuthenticatedRequest;
      const profile = await driverService.toggleAvailability(user.id, body?.isActive);
      res.json(profile);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

driverRouter.post(
  '/me/documents',
  (req, res, next) => {
    void authenticateDriver(req, res, next);
  },
  async (req, res, next) => {
    try {
      const body = driverDocumentSchema.parse(req.body) as DriverDocumentInput;
      const { user } = req as AuthenticatedRequest;
      const profile = await driverService.submitDocument(user.id, body);
      res.status(201).json(profile);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

export { driverRouter };
