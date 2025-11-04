import { publishRealtimeEvent } from '../../infra/realtime';
import type { DbUser } from '../auth/auth.types';
import { supportRepository } from './support.repository';
import type {
  CreateTicketInput,
  UpdateTicketInput,
  TicketResponse,
  TicketSummary,
} from './support.types';

class SupportError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'SupportError';
  }
}

const mapTicketToResponse = (ticket: any): TicketResponse => ({
  id: ticket.id,
  userId: ticket.userId,
  rideId: ticket.rideId || undefined,
  status: ticket.status,
  priority: ticket.priority,
  category: ticket.category || undefined,
  subject: ticket.subject || undefined,
  description: ticket.description || undefined,
  assignee: ticket.assignee || undefined,
  resolutionNotes: ticket.resolutionNotes || undefined,
  createdAt: ticket.createdAt.toISOString(),
  updatedAt: ticket.updatedAt.toISOString(),
});

export const supportService = {
  async createTicket(
    user: DbUser,
    input: CreateTicketInput,
  ): Promise<TicketResponse> {
    const ticket = await supportRepository.createTicket({
      userId: user.id,
      rideId: input.rideId,
      priority: input.priority,
      category: input.category,
      subject: input.subject,
      description: input.description,
    });

    // Broadcast ticket creation to admins
    publishRealtimeEvent('support:tickets', 'ticket.created', {
      ticketId: ticket.id,
      userId: user.id,
      priority: ticket.priority,
      subject: ticket.subject,
    });

    return mapTicketToResponse(ticket);
  },

  async getTicket(ticketId: string, user: DbUser): Promise<TicketResponse> {
    const ticket = await supportRepository.getTicketById(ticketId);
    if (!ticket) {
      throw new SupportError('Ticket not found', 404);
    }

    // Users can only view their own tickets (unless admin, but we'll keep it simple for now)
    if (ticket.userId !== user.id) {
      throw new SupportError('You do not have access to this ticket', 403);
    }

    return mapTicketToResponse(ticket);
  },

  async getUserTickets(user: DbUser, limit = 20): Promise<TicketResponse[]> {
    const tickets = await supportRepository.getTicketsByUser(user.id, limit);
    return tickets.map(mapTicketToResponse);
  },

  async getRideTickets(
    rideId: string,
    user: DbUser,
  ): Promise<TicketResponse[]> {
    const tickets = await supportRepository.getTicketsByRide(rideId);
    
    // Filter to only show tickets created by the user
    const userTickets = tickets.filter((t) => t.userId === user.id);
    return userTickets.map(mapTicketToResponse);
  },

  async getAllTickets(
    filters?: {
      status?: 'open' | 'in_progress' | 'resolved' | 'closed';
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      limit?: number;
    },
  ): Promise<TicketResponse[]> {
    // This would typically be admin-only
    const tickets = await supportRepository.getAllTickets(filters);
    return tickets.map(mapTicketToResponse);
  },

  async updateTicket(
    ticketId: string,
    user: DbUser,
    updates: UpdateTicketInput,
  ): Promise<TicketResponse> {
    const ticket = await supportRepository.getTicketById(ticketId);
    if (!ticket) {
      throw new SupportError('Ticket not found', 404);
    }

    // Users can only update their own tickets (status only)
    if (ticket.userId !== user.id) {
      throw new SupportError('You do not have access to this ticket', 403);
    }

    // Regular users can only close their own tickets
    const allowedUpdates: UpdateTicketInput = {};
    if (updates.status === 'closed') {
      allowedUpdates.status = 'closed';
    }

    if (Object.keys(allowedUpdates).length === 0) {
      throw new SupportError('No valid updates provided', 400);
    }

    const updated = await supportRepository.updateTicket(ticketId, allowedUpdates);
    if (!updated) {
      throw new SupportError('Failed to update ticket', 500);
    }

    // Broadcast update
    publishRealtimeEvent(`user:${ticket.userId}`, 'ticket.updated', {
      ticketId: ticket.id,
      status: updated.status,
    });

    return mapTicketToResponse(updated);
  },

  async adminUpdateTicket(
    ticketId: string,
    updates: UpdateTicketInput,
  ): Promise<TicketResponse> {
    // Admin version with full update permissions
    const ticket = await supportRepository.getTicketById(ticketId);
    if (!ticket) {
      throw new SupportError('Ticket not found', 404);
    }

    const updated = await supportRepository.updateTicket(ticketId, updates);
    if (!updated) {
      throw new SupportError('Failed to update ticket', 500);
    }

    // Notify user of ticket update
    publishRealtimeEvent(`user:${ticket.userId}`, 'ticket.updated', {
      ticketId: ticket.id,
      status: updated.status,
      assignee: updated.assignee,
    });

    return mapTicketToResponse(updated);
  },

  async getTicketSummary(user?: DbUser): Promise<TicketSummary> {
    return supportRepository.getTicketSummary(user?.id);
  },

  async deleteTicket(ticketId: string, user: DbUser): Promise<void> {
    const ticket = await supportRepository.getTicketById(ticketId);
    if (!ticket) {
      throw new SupportError('Ticket not found', 404);
    }

    // Users can only delete their own tickets if they are still open
    if (ticket.userId !== user.id) {
      throw new SupportError('You do not have access to this ticket', 403);
    }

    if (ticket.status !== 'open') {
      throw new SupportError('Can only delete open tickets', 409);
    }

    await supportRepository.deleteTicket(ticketId);
  },
};

export { SupportError };




