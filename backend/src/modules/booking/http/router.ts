import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';

import { authService, AuthError } from '../../auth/auth.service';
import type { DbUser } from '../../auth/auth.types';
import {
  bookingIdSchema,
  cancelBookingSchema,
  createBookingSchema,
  type CancelBookingInput,
  type CreateBookingInput,
} from '../booking.validation';
import { bookingService, BookingError } from '../booking.service';

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

  if (error instanceof BookingError || error instanceof AuthError) {
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
      console.error('Failed to authenticate booking request', error);
      res.status(401).json({ message: 'Authentication failed' });
    }
  }
};

router.post(
  '/',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const payload = createBookingSchema.parse(req.body) as CreateBookingInput;
      const { user } = req as AuthenticatedRequest;
      const booking = await bookingService.createBooking(user, payload);
      res.status(201).json(booking);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

router.get(
  '/:id',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const params = bookingIdSchema.parse(req.params);
      const { user } = req as AuthenticatedRequest;
      const booking = await bookingService.getBooking(params.id, user);
      res.json(booking);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

router.post(
  '/:id/cancel',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const params = bookingIdSchema.parse(req.params);
      const body = cancelBookingSchema.parse(req.body) as CancelBookingInput;
      const { user } = req as AuthenticatedRequest;
      const booking = await bookingService.cancelBooking(params.id, user, body.reason);
      res.json(booking);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

export const bookingRouter = router;
