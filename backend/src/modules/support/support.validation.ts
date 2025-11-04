import { z } from 'zod';

export const ticketIdSchema = z.object({
  id: z.string().uuid(),
});

export const createTicketSchema = z.object({
  rideId: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z.string().max(100).optional(),
  subject: z.string().max(200),
  description: z.string().max(2000),
});

export const updateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignee: z.string().max(100).optional(),
  resolutionNotes: z.string().max(1000).optional(),
});





