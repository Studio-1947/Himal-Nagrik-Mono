import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../infra/database';
import { ratings } from '../../infra/database/schema/ratings';
import { appUsers, rides } from '../../infra/database/schema/users';

export const ratingRepository = {
  async createRating(data: {
    rideId: string;
    raterId: string;
    rateeId: string;
    raterRole: 'passenger' | 'driver';
    score: number;
    review?: string;
    isAnonymous: boolean;
  }) {
    const [rating] = await db
      .insert(ratings)
      .values({
        id: randomUUID(),
        rideId: data.rideId,
        raterId: data.raterId,
        rateeId: data.rateeId,
        raterRole: data.raterRole,
        score: data.score,
        review: data.review || null,
        isAnonymous: data.isAnonymous,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return rating;
  },

  async getRatingById(ratingId: string) {
    const [rating] = await db
      .select()
      .from(ratings)
      .where(eq(ratings.id, ratingId));
    return rating;
  },

  async getRatingByRideId(rideId: string) {
    const [rating] = await db
      .select()
      .from(ratings)
      .where(eq(ratings.rideId, rideId));
    return rating;
  },

  async getRatingsForUser(userId: string, limit = 20) {
    const results = await db
      .select({
        rating: ratings,
        raterName: appUsers.name,
      })
      .from(ratings)
      .leftJoin(appUsers, eq(ratings.raterId, appUsers.id))
      .where(eq(ratings.rateeId, userId))
      .orderBy(ratings.createdAt)
      .limit(limit);

    return results.map((r) => ({
      ...r.rating,
      raterName: r.rating.isAnonymous ? null : r.raterName,
    }));
  },

  async getRatingsByRater(raterId: string, limit = 20) {
    return db
      .select()
      .from(ratings)
      .where(eq(ratings.raterId, raterId))
      .orderBy(ratings.createdAt)
      .limit(limit);
  },

  async getUserRatingSummary(userId: string) {
    const result = await db
      .select({
        averageRating: sql<number>`AVG(${ratings.score})::float`,
        totalRatings: sql<number>`COUNT(*)::int`,
        stars1: sql<number>`COUNT(*) FILTER (WHERE ${ratings.score} = 1)::int`,
        stars2: sql<number>`COUNT(*) FILTER (WHERE ${ratings.score} = 2)::int`,
        stars3: sql<number>`COUNT(*) FILTER (WHERE ${ratings.score} = 3)::int`,
        stars4: sql<number>`COUNT(*) FILTER (WHERE ${ratings.score} = 4)::int`,
        stars5: sql<number>`COUNT(*) FILTER (WHERE ${ratings.score} = 5)::int`,
      })
      .from(ratings)
      .where(eq(ratings.rateeId, userId));

    const summary = result[0];
    return {
      averageRating: summary?.averageRating || 0,
      totalRatings: summary?.totalRatings || 0,
      ratingDistribution: {
        1: summary?.stars1 || 0,
        2: summary?.stars2 || 0,
        3: summary?.stars3 || 0,
        4: summary?.stars4 || 0,
        5: summary?.stars5 || 0,
      },
    };
  },

  async updateRating(
    ratingId: string,
    updates: {
      score?: number;
      review?: string;
      isAnonymous?: boolean;
    },
  ) {
    const [updated] = await db
      .update(ratings)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(ratings.id, ratingId))
      .returning();
    return updated;
  },

  async deleteRating(ratingId: string) {
    const [deleted] = await db
      .delete(ratings)
      .where(eq(ratings.id, ratingId))
      .returning();
    return deleted;
  },

  async getRideById(rideId: string) {
    const [ride] = await db.select().from(rides).where(eq(rides.id, rideId));
    return ride;
  },
};




