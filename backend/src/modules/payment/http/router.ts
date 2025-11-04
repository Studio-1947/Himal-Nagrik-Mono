import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';

import { authService, AuthError } from '../../auth/auth.service';
import type { DbUser } from '../../auth/auth.types';
import {
  createPaymentSchema,
  capturePaymentSchema,
  refundPaymentSchema,
  paymentIdSchema,
  createPayoutSchema,
} from '../payment.validation';
import { paymentService, PaymentError } from '../payment.service';
import type {
  CreatePaymentInput,
  CapturePaymentInput,
  RefundPaymentInput,
} from '../payment.types';

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

  if (error instanceof PaymentError || error instanceof AuthError) {
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
      console.error('Failed to authenticate payment request', error);
      res.status(401).json({ message: 'Authentication failed' });
    }
  }
};

// Create payment (passenger only)
router.post(
  '/',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (user.role !== 'passenger') {
        res.status(403).json({ message: 'Only passengers can create payments' });
        return;
      }

      const payload = createPaymentSchema.parse(req.body) as CreatePaymentInput;
      const payment = await paymentService.createPayment(user.id, payload);
      res.status(201).json(payment);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Capture payment
router.post(
  '/:id/capture',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const params = paymentIdSchema.parse(req.params);
      const payload = capturePaymentSchema.parse(req.body) as CapturePaymentInput;
      const payment = await paymentService.capturePayment(params.id, payload);
      res.json(payment);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Refund payment (admin only - simplified for now)
router.post(
  '/:id/refund',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const params = paymentIdSchema.parse(req.params);
      const payload = refundPaymentSchema.parse(req.body) as RefundPaymentInput;
      const payment = await paymentService.refundPayment(params.id, payload);
      res.json(payment);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Get payment details
router.get(
  '/:id',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const params = paymentIdSchema.parse(req.params);
      const payment = await paymentService.getPayment(params.id, user);
      res.json(payment);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Get payment history
router.get(
  '/history/me',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const limit = req.query.limit
        ? Math.min(Math.max(parseInt(req.query.limit as string, 10), 1), 100)
        : 20;
      const payments = await paymentService.getPaymentHistory(user, limit);
      res.json({ payments, total: payments.length });
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Create payout for driver
router.post(
  '/payouts',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (user.role !== 'driver') {
        res.status(403).json({ message: 'Only drivers can request payouts' });
        return;
      }

      const payload = createPayoutSchema.parse(req.body);
      const payout = await paymentService.createPayout(
        user.id,
        new Date(payload.periodStart),
        new Date(payload.periodEnd),
      );
      res.status(201).json(payout);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Get payout history for driver
router.get(
  '/payouts/history',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (user.role !== 'driver') {
        res.status(403).json({ message: 'Only drivers can view payout history' });
        return;
      }

      const limit = req.query.limit
        ? Math.min(Math.max(parseInt(req.query.limit as string, 10), 1), 100)
        : 20;
      const payouts = await paymentService.getPayoutHistory(user.id, limit);
      res.json({ payouts, total: payouts.length });
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Get payment summary for driver
router.get(
  '/payouts/summary',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (user.role !== 'driver') {
        res.status(403).json({ message: 'Only drivers can view payment summary' });
        return;
      }

      const summary = await paymentService.getDriverPaymentSummary(user.id);
      res.json(summary);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Process payout (admin only - simplified for now)
router.post(
  '/payouts/:id/process',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const params = paymentIdSchema.parse(req.params);
      const payout = await paymentService.processPayout(params.id);
      res.json(payout);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

export const paymentRouter = router;




