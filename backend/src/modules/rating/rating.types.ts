import type { z } from 'zod';
import type { createRatingSchema, ratingIdSchema } from './rating.validation';

export type CreateRatingInput = z.infer<typeof createRatingSchema>;
export type RatingIdParams = z.infer<typeof ratingIdSchema>;

export interface RatingRecord {
  id: string;
  rideId: string;
  raterId: string;
  rateeId: string;
  raterRole: 'passenger' | 'driver';
  score: number;
  review: string | null;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RatingResponse {
  id: string;
  rideId: string;
  score: number;
  review?: string;
  isAnonymous: boolean;
  createdAt: string;
  raterName?: string;
}

export interface RatingSummary {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}


