import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';

import { authService, AuthError } from '../../auth/auth.service';
import type { DbUser } from '../../auth/auth.types';
import {
  passengerProfilePatchSchema,
  createSavedLocationSchema,
  savedLocationParamsSchema,
  passengerDashboardQuerySchema,
  type PassengerProfilePatchInput,
  type CreateSavedLocationInput,
  type SavedLocationParamsInput,
  type PassengerDashboardQueryInput,
} from '../passenger.validation';
import { passengerService, PassengerError } from '../passenger.service';

type AuthenticatedRequest = Request & { user: DbUser; token: string };

const passengerRouter = Router();

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

  if (error instanceof PassengerError || error instanceof AuthError) {
    res.status(error.status).json({ message: error.message });
    return true;
  }

  return false;
};

const authenticatePassenger = async (
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
    if (user.role !== 'passenger') {
      res.status(403).json({ message: 'Access restricted to passenger accounts' });
      return;
    }
    (req as AuthenticatedRequest).token = token;
    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    if (!handleErrorResponse(error, res)) {
      console.error('Passenger authentication failed', error);
      res.status(401).json({ message: 'Authentication failed' });
    }
  }
};

passengerRouter.get(
  '/me',
  (req, res, next) => {
    void authenticatePassenger(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const profile = await passengerService.getSelfProfile(user.id);
      res.json(profile);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

passengerRouter.get(
  '/me/summary',
  (req, res, next) => {
    void authenticatePassenger(req, res, next);
  },
  async (req, res, next) => {
    try {
      const query = passengerDashboardQuerySchema.parse(
        req.query,
      ) as PassengerDashboardQueryInput;
      const { user } = req as AuthenticatedRequest;

      const options = {
        radiusKm: query.radiusKm,
        limitDrivers: query.limitDrivers,
        recentTrips: query.recentTrips,
        location:
          query.lat !== undefined && query.lng !== undefined
            ? { latitude: query.lat, longitude: query.lng }
            : undefined,
      };

      const summary = await passengerService.getDashboardSummary(user, options);
      res.json(summary);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

passengerRouter.patch(
  '/me',
  (req, res, next) => {
    void authenticatePassenger(req, res, next);
  },
  async (req, res, next) => {
    try {
      const updates = passengerProfilePatchSchema.parse(req.body) as PassengerProfilePatchInput;
      const { user } = req as AuthenticatedRequest;
      const profile = await passengerService.updateSelfProfile(user, updates);
      res.json(profile);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

passengerRouter.get(
  '/me/locations',
  (req, res, next) => {
    void authenticatePassenger(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const locations = await passengerService.listSavedLocations(user.id);
      res.json(locations);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

passengerRouter.post(
  '/me/locations',
  (req, res, next) => {
    void authenticatePassenger(req, res, next);
  },
  async (req, res, next) => {
    try {
      const body = createSavedLocationSchema.parse(req.body) as CreateSavedLocationInput;
      const { user } = req as AuthenticatedRequest;
      const location = await passengerService.addSavedLocation(user.id, body);
      res.status(201).json(location);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

passengerRouter.delete(
  '/me/locations/:id',
  (req, res, next) => {
    void authenticatePassenger(req, res, next);
  },
  async (req, res, next) => {
    try {
      const params = savedLocationParamsSchema.parse(req.params) as SavedLocationParamsInput;
      const { user } = req as AuthenticatedRequest;
      await passengerService.removeSavedLocation(user.id, params.id);
      res.status(204).end();
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

export { passengerRouter };
