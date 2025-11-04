import { randomUUID } from 'node:crypto';
import { and, eq, or, sql } from 'drizzle-orm';
import { db } from '../../infra/database';
import { supportTickets } from '../../infra/database/schema/users';

export const supportRepository = {
  async createTicket(data: {
    userId: string;
    rideId?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category?: string;
    subject: string;
    description: string;
  }) {
    const [ticket] = await db
      .insert(supportTickets)
      .values({
        id: randomUUID(),
        userId: data.userId,
        rideId: data.rideId || null,
        status: 'open',
        priority: data.priority,
        category: data.category || null,
        subject: data.subject,
        description: data.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return ticket;
  },

  async getTicketById(ticketId: string) {
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId));
    return ticket;
  },

  async getTicketsByUser(userId: string, limit = 20) {
    return db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(supportTickets.createdAt)
      .limit(limit);
  },

  async getTicketsByRide(rideId: string) {
    return db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.rideId, rideId));
  },

  async getAllTickets(filters?: {
    status?: 'open' | 'in_progress' | 'resolved' | 'closed';
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    limit?: number;
  }) {
    let query = db.select().from(supportTickets);

    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(supportTickets.status, filters.status));
    }
    if (filters?.priority) {
      conditions.push(eq(supportTickets.priority, filters.priority));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(supportTickets.createdAt) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return query;
  },

  async updateTicket(
    ticketId: string,
    updates: {
      status?: 'open' | 'in_progress' | 'resolved' | 'closed';
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      assignee?: string;
      resolutionNotes?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const [updated] = await db
      .update(supportTickets)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return updated;
  },

  async getTicketSummary(userId?: string) {
    const conditions = userId ? eq(supportTickets.userId, userId) : undefined;

    const result = await db
      .select({
        totalTickets: sql<number>`COUNT(*)::int`,
        openTickets: sql<number>`COUNT(*) FILTER (WHERE ${supportTickets.status} = 'open')::int`,
        inProgressTickets: sql<number>`COUNT(*) FILTER (WHERE ${supportTickets.status} = 'in_progress')::int`,
        resolvedTickets: sql<number>`COUNT(*) FILTER (WHERE ${supportTickets.status} = 'resolved')::int`,
        closedTickets: sql<number>`COUNT(*) FILTER (WHERE ${supportTickets.status} = 'closed')::int`,
      })
      .from(supportTickets)
      .where(conditions);

    const summary = result[0];
    return {
      totalTickets: summary?.totalTickets || 0,
      openTickets: summary?.openTickets || 0,
      inProgressTickets: summary?.inProgressTickets || 0,
      resolvedTickets: summary?.resolvedTickets || 0,
      closedTickets: summary?.closedTickets || 0,
    };
  },

  async deleteTicket(ticketId: string) {
    const [deleted] = await db
      .delete(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return deleted;
  },
};


