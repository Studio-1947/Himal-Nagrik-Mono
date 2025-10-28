import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';

import { authService, AuthError } from '../../auth/auth.service';
import type { DbUser } from '../../auth/auth.types';
import { bookingRepository } from '../../booking/booking.repository';
import { mapBookingRecordToResponse } from '../../booking/booking.service';
import { dispatchService, DispatchError } from '../dispatch.service';
import {
  heartbeatSchema,
  offerParamsSchema,
  offerActionSchema,
  nearbyAvailabilityQuerySchema,
  type HeartbeatInput,
  type OfferActionInput,
  type NearbyAvailabilityQueryInput,
} from '../dispatch.validation';

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

  if (error instanceof DispatchError || error instanceof AuthError) {
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
      console.error('Driver authentication failure', error);
      res.status(401).json({ message: 'Authentication failed' });
    }
  }
};

router.post(
  '/availability/heartbeat',
  (req, res, next) => {
    void authenticateDriver(req, res, next);
  },
  async (req, res, next) => {
    try {
      const input = heartbeatSchema.parse(req.body) as HeartbeatInput;
      const { user } = req as AuthenticatedRequest;
      const availability = await dispatchService.registerHeartbeat(user.id, input);
      res.json(availability);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

router.get(
  '/availability/nearby',
  async (req, res, next) => {
    try {
      const header = req.headers.authorization;
      if (!header || !header.toLowerCase().startsWith('bearer ')) {
        res
          .status(401)
          .json({ message: 'Missing or invalid authorization header' });
        return;
      }

      const token = header.slice(7).trim();
      if (!token) {
        res.status(401).json({ message: 'Missing authorization token' });
        return;
      }

      const { user } = await authService.authenticate(token);
      if (user.role !== 'driver' && user.role !== 'passenger') {
        res.status(403).json({ message: 'Access restricted to authenticated users' });
        return;
      }

      const query = nearbyAvailabilityQuerySchema.parse(
        req.query,
      ) as NearbyAvailabilityQueryInput;

      const summary = await dispatchService.getNearbyAvailability(
        { latitude: query.lat, longitude: query.lng },
        { radiusKm: query.radiusKm, limit: query.limit },
      );

      res.json(summary);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

router.get(
  '/offers',
  (req, res, next) => {
    void authenticateDriver(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const offers = await dispatchService.listOffers(user.id);
      res.json(offers);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

router.post(
  '/offers/:id/accept',
  (req, res, next) => {
    void authenticateDriver(req, res, next);
  },
  async (req, res, next) => {
    try {
      const params = offerParamsSchema.parse(req.params);
      offerActionSchema.parse(req.body ?? {}) as OfferActionInput;
      const { user } = req as AuthenticatedRequest;
      const booking = await dispatchService.acceptOffer(user.id, params.id);
      res.json(booking);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

router.post(
  '/offers/:id/reject',
  (req, res, next) => {
    void authenticateDriver(req, res, next);
  },
  async (req, res, next) => {
    try {
      const params = offerParamsSchema.parse(req.params);
      const body = offerActionSchema.parse(req.body ?? {}) as OfferActionInput;
      const { user } = req as AuthenticatedRequest;
      await dispatchService.rejectOffer(user.id, params.id, body.etaMinutes ? `Driver ETA ${body.etaMinutes} mins` : undefined);
      res.status(204).end();
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

router.get(
  '/bookings/:id',
  (req, res, next) => {
    void authenticateDriver(req, res, next);
  },
  async (req, res, next) => {
    try {
      const params = offerParamsSchema.parse({ id: req.params.id });
      const record = await bookingRepository.getBookingById(params.id);
      if (!record) {
        res.status(404).json({ message: 'Booking not found' });
        return;
      }
      res.json(mapBookingRecordToResponse(record));
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

export const dispatchRouter = router;
