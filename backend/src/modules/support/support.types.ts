import type { z } from 'zod';
import type {
  createTicketSchema,
  updateTicketSchema,
  ticketIdSchema,
} from './support.validation';

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketIdParams = z.infer<typeof ticketIdSchema>;

export interface TicketRecord {
  id: string;
  userId: string;
  rideId: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string | null;
  subject: string | null;
  description: string | null;
  assignee: string | null;
  resolutionNotes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketResponse {
  id: string;
  userId: string;
  rideId?: string;
  status: string;
  priority: string;
  category?: string;
  subject?: string;
  description?: string;
  assignee?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketSummary {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
}




