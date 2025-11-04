import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';

import { authService, AuthError } from '../../auth/auth.service';
import type { DbUser } from '../../auth/auth.types';
import { createRatingSchema, ratingIdSchema } from '../rating.validation';
import { ratingService, RatingError } from '../rating.service';
import type { CreateRatingInput } from '../rating.types';

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

  if (error instanceof RatingError || error instanceof AuthError) {
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
      console.error('Failed to authenticate rating request', error);
      res.status(401).json({ message: 'Authentication failed' });
    }
  }
};

// Create a rating
router.post(
  '/',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const payload = createRatingSchema.parse(req.body) as CreateRatingInput;
      const rating = await ratingService.createRating(user, payload);
      res.status(201).json(rating);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Get a specific rating
router.get(
  '/:id',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const params = ratingIdSchema.parse(req.params);
      const rating = await ratingService.getRating(params.id, user);
      res.json(rating);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Get ratings for a specific user
router.get(
  '/user/:userId',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const userId = req.params.userId;
      const limit = req.query.limit
        ? Math.min(Math.max(parseInt(req.query.limit as string, 10), 1), 100)
        : 20;
      const ratings = await ratingService.getUserRatings(userId, user, limit);
      res.json({ ratings, total: ratings.length });
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Get ratings given by the current user
router.get(
  '/me/given',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const limit = req.query.limit
        ? Math.min(Math.max(parseInt(req.query.limit as string, 10), 1), 100)
        : 20;
      const ratings = await ratingService.getMyGivenRatings(user, limit);
      res.json({ ratings, total: ratings.length });
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Get rating summary for a user
router.get(
  '/user/:userId/summary',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const userId = req.params.userId;
      const summary = await ratingService.getUserRatingSummary(userId);
      res.json(summary);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Update a rating
router.put(
  '/:id',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const params = ratingIdSchema.parse(req.params);
      const updates = createRatingSchema.partial().parse(req.body);
      const rating = await ratingService.updateRating(params.id, user, updates);
      res.json(rating);
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

// Delete a rating
router.delete(
  '/:id',
  (req, res, next) => {
    void authenticate(req, res, next);
  },
  async (req, res, next) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const params = ratingIdSchema.parse(req.params);
      await ratingService.deleteRating(params.id, user);
      res.status(204).send();
    } catch (error) {
      if (!handleErrorResponse(error, res)) {
        next(error);
      }
    }
  },
);

export const ratingRouter = router;



