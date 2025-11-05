import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';

import { authService, AuthError } from '../../auth/auth.service';
import type { DbUser } from '../../auth/auth.types';
import {
  startTripSchema,
  updateTripLocationSchema,
  completeTripSchema,
  tripIdSchema,
} from '../trip.validation';
import { tripService, TripError } from '../trip.service';
import type {
  StartTripInput,
  UpdateTripLocationInput,
  CompleteTripInput,
} from '../trip.types';

type AuthenticatedRequest = Request & { user: DbUser; token: string };

const router = Router();

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

  if (error instanceof TripError || error instanceof AuthError) {
    res.status(error.status).json({ message: error.message });
    return true;
  }

  return false;
};

const authenticate = async (
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
    if (!handleErrorResponse(error, res)) {
      console.error('Failed to authenticate trip request', error);
      res.status(401).json({ message: 'Authentication failed' });
    }
  }
};

// Start a trip (driver only)
router.post(
  '/start',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (user.role !== 'driver') {
        res.status(403).json({ message: 'Only drivers can start trips' });
        return;
      }

      const payload = startTripSchema.parse(req.body) as StartTripInput;
      const trip = await tripService.startTrip(user.id, payload);
      res.status(200).json(trip);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Update location during trip (driver only)
router.post(
  '/:id/location',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (user.role !== 'driver') {
        res.status(403).json({ message: 'Only drivers can update trip location' });
        return;
      }

      const params = tripIdSchema.parse(req.params);
      const payload = updateTripLocationSchema.parse(
        req.body,
      ) as UpdateTripLocationInput;
      await tripService.updateLocation(user.id, params.id, payload);
      res.status(200).json({ message: 'Location updated' });
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Complete a trip (driver only)
router.post(
  '/:id/complete',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (user.role !== 'driver') {
        res.status(403).json({ message: 'Only drivers can complete trips' });
        return;
      }

      const params = tripIdSchema.parse(req.params);
      const payload = completeTripSchema.parse(req.body) as CompleteTripInput;
      const trip = await tripService.completeTrip(user.id, params.id, payload);
      res.status(200).json(trip);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Get current active trip
router.get(
  '/current',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const trip = await tripService.getCurrentTrip(user);
      if (!trip) {
        res.status(404).json({ message: 'No active trip found' });
        return;
      }
      res.json(trip);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Get trip history
router.get(
  '/history',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const limit = req.query.limit
        ? Math.min(Math.max(parseInt(req.query.limit as string, 10), 1), 100)
        : 20;
      const history = await tripService.getTripHistory(user, limit);
      res.json({ trips: history, total: history.length });
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Get specific trip details
router.get(
  '/:id',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const params = tripIdSchema.parse(req.params);
      const trip = await tripService.getTripDetails(params.id, user);
      res.json(trip);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

export const tripRouter = router;









