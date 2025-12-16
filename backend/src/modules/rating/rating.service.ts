import { publishRealtimeEvent } from '../../infra/realtime';
import type { DbUser } from '../auth/auth.types';
import { ratingRepository } from './rating.repository';
import type {
  CreateRatingInput,
  RatingResponse,
  RatingSummary,
} from './rating.types';

class RatingError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'RatingError';
  }
}

const mapRatingToResponse = (
  rating: any,
  raterName?: string | null,
): RatingResponse => ({
  id: rating.id,
  rideId: rating.rideId,
  score: rating.score,
  review: rating.review || undefined,
  isAnonymous: rating.isAnonymous,
  createdAt: rating.createdAt.toISOString(),
  raterName: rating.isAnonymous ? undefined : raterName || undefined,
});

export const ratingService = {
  async createRating(
    user: DbUser,
    input: CreateRatingInput,
  ): Promise<RatingResponse> {
    // Verify ride exists
    const ride = await ratingRepository.getRideById(input.rideId);
    if (!ride) {
      throw new RatingError('Ride not found', 404);
    }

    // Verify ride is completed
    if (ride.status !== 'completed') {
      throw new RatingError('Can only rate completed rides', 409);
    }

    // Verify user was involved in the ride
    if (user.role === 'passenger' && ride.passengerId !== user.id) {
      throw new RatingError('You were not a passenger on this ride', 403);
    }
    if (user.role === 'driver' && ride.driverId !== user.id) {
      throw new RatingError('You were not the driver on this ride', 403);
    }

    // Check if rating already exists
    const existing = await ratingRepository.getRatingByRideId(input.rideId);
    if (existing) {
      throw new RatingError('Rating already exists for this ride', 409);
    }

    // Determine who is being rated
    const rateeId =
      user.role === 'passenger' ? ride.driverId : ride.passengerId;
    if (!rateeId) {
      throw new RatingError('Cannot rate this ride', 400);
    }

    const rating = await ratingRepository.createRating({
      rideId: input.rideId,
      raterId: user.id,
      rateeId,
      raterRole: user.role as 'passenger' | 'driver',
      score: input.score,
      review: input.review,
      isAnonymous: input.isAnonymous,
    });

    // Update the rated user's stats
    const summary = await ratingRepository.getUserRatingSummary(rateeId);

    // Broadcast rating event
    publishRealtimeEvent(`user:${rateeId}`, 'rating.received', {
      ratingId: rating.id,
      score: rating.score,
      averageRating: summary.averageRating,
    });

    return mapRatingToResponse(rating);
  },

  async getRating(ratingId: string, user: DbUser): Promise<RatingResponse> {
    const rating = await ratingRepository.getRatingById(ratingId);
    if (!rating) {
      throw new RatingError('Rating not found', 404);
    }

    // Check access permission
    if (rating.raterId !== user.id && rating.rateeId !== user.id) {
      throw new RatingError('You do not have access to this rating', 403);
    }

    return mapRatingToResponse(rating);
  },

  async getUserRatings(
    userId: string,
    requester: DbUser,
    limit = 20,
  ): Promise<RatingResponse[]> {
    // Anyone can view ratings for a user (for transparency)
    const ratings = await ratingRepository.getRatingsForUser(userId, limit);
    return ratings.map((r) =>
      mapRatingToResponse(r, (r as any).raterName),
    );
  },

  async getMyGivenRatings(user: DbUser, limit = 20): Promise<RatingResponse[]> {
    const ratings = await ratingRepository.getRatingsByRater(user.id, limit);
    return ratings.map((r) => mapRatingToResponse(r));
  },

  async getUserRatingSummary(userId: string): Promise<RatingSummary> {
    return ratingRepository.getUserRatingSummary(userId);
  },

  async updateRating(
    ratingId: string,
    user: DbUser,
    updates: {
      score?: number;
      review?: string;
      isAnonymous?: boolean;
    },
  ): Promise<RatingResponse> {
    const rating = await ratingRepository.getRatingById(ratingId);
    if (!rating) {
      throw new RatingError('Rating not found', 404);
    }

    // Only the rater can update their rating
    if (rating.raterId !== user.id) {
      throw new RatingError('You can only update your own ratings', 403);
    }

    const updated = await ratingRepository.updateRating(ratingId, updates);
    if (!updated) {
      throw new RatingError('Failed to update rating', 500);
    }

    // Update the rated user's stats if score changed
    if (updates.score) {
      const summary = await ratingRepository.getUserRatingSummary(
        rating.rateeId,
      );
      publishRealtimeEvent(`user:${rating.rateeId}`, 'rating.updated', {
        ratingId: rating.id,
        averageRating: summary.averageRating,
      });
    }

    return mapRatingToResponse(updated);
  },

  async deleteRating(ratingId: string, user: DbUser): Promise<void> {
    const rating = await ratingRepository.getRatingById(ratingId);
    if (!rating) {
      throw new RatingError('Rating not found', 404);
    }

    // Only the rater can delete their rating
    if (rating.raterId !== user.id) {
      throw new RatingError('You can only delete your own ratings', 403);
    }

    await ratingRepository.deleteRating(ratingId);

    // Update the rated user's stats
    const summary = await ratingRepository.getUserRatingSummary(rating.rateeId);
    publishRealtimeEvent(`user:${rating.rateeId}`, 'rating.deleted', {
      ratingId: rating.id,
      averageRating: summary.averageRating,
    });
  },
};

export { RatingError };










