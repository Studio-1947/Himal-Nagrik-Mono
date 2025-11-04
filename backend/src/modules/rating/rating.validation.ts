import { z } from 'zod';

export const ratingIdSchema = z.object({
  id: z.string().uuid(),
});

export const createRatingSchema = z.object({
  rideId: z.string().uuid(),
  score: z.number().int().min(1).max(5),
  review: z.string().max(1000).optional(),
  isAnonymous: z.boolean().default(false),
});






