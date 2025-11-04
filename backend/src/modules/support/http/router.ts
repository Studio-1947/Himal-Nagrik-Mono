import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';

import { authService, AuthError } from '../../auth/auth.service';
import type { DbUser } from '../../auth/auth.types';
import {
  createTicketSchema,
  updateTicketSchema,
  ticketIdSchema,
} from '../support.validation';
import { supportService, SupportError } from '../support.service';
import type { CreateTicketInput, UpdateTicketInput } from '../support.types';

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

  if (error instanceof SupportError || error instanceof AuthError) {
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
      console.error('Failed to authenticate support request', error);
      res.status(401).json({ message: 'Authentication failed' });
    }
  }
};

// Create a support ticket
router.post(
  '/',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const payload = createTicketSchema.parse(req.body) as CreateTicketInput;
      const ticket = await supportService.createTicket(user, payload);
      res.status(201).json(ticket);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Get a specific ticket
router.get(
  '/:id',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const params = ticketIdSchema.parse(req.params);
      const ticket = await supportService.getTicket(params.id, user);
      res.json(ticket);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Get all tickets for current user
router.get(
  '/me/tickets',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const limit = req.query.limit
        ? Math.min(Math.max(parseInt(req.query.limit as string, 10), 1), 100)
        : 20;
      const tickets = await supportService.getUserTickets(user, limit);
      res.json({ tickets, total: tickets.length });
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Get tickets for a specific ride
router.get(
  '/ride/:rideId',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const rideId = req.params.rideId;
      const tickets = await supportService.getRideTickets(rideId, user);
      res.json({ tickets, total: tickets.length });
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Get ticket summary
router.get(
  '/summary/me',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const summary = await supportService.getTicketSummary(user);
      res.json(summary);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Update a ticket
router.put(
  '/:id',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const params = ticketIdSchema.parse(req.params);
      const updates = updateTicketSchema.parse(req.body) as UpdateTicketInput;
      const ticket = await supportService.updateTicket(params.id, user, updates);
      res.json(ticket);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Delete a ticket
router.delete(
  '/:id',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const params = ticketIdSchema.parse(req.params);
      await supportService.deleteTicket(params.id, user);
      res.status(204).send();
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

export const supportRouter = router;




