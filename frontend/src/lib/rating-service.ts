import { apiClient } from './api-client';

export interface CreateRatingRequest {
  rideId: string;
  score: number;
  review?: string;
  isAnonymous?: boolean;
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

export const ratingService = {
  async createRating(
    token: string,
    data: CreateRatingRequest,
  ): Promise<RatingResponse> {
    return apiClient.post<RatingResponse>('/ratings', data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async getRating(token: string, ratingId: string): Promise<RatingResponse> {
    return apiClient.get<RatingResponse>(`/ratings/${ratingId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async getUserRatings(
    token: string,
    userId: string,
    limit = 20,
  ): Promise<RatingResponse[]> {
    const response = await apiClient.get<{ ratings: RatingResponse[] }>(`/ratings/user/${userId}`, {
      params: { limit },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ratings || [];
  },

  async getMyGivenRatings(token: string, limit = 20): Promise<RatingResponse[]> {
    const response = await apiClient.get<{ ratings: RatingResponse[] }>('/ratings/me/given', {
      params: { limit },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.ratings || [];
  },

  async getUserRatingSummary(
    token: string,
    userId: string,
  ): Promise<RatingSummary> {
    return apiClient.get<RatingSummary>(`/ratings/user/${userId}/summary`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async updateRating(
    token: string,
    ratingId: string,
    updates: Partial<CreateRatingRequest>,
  ): Promise<RatingResponse> {
    return apiClient.put<RatingResponse>(`/ratings/${ratingId}`, updates, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async deleteRating(token: string, ratingId: string): Promise<void> {
    await apiClient.delete(`/ratings/${ratingId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};





