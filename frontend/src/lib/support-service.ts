import { apiClient } from './api-client';

export interface CreateTicketRequest {
  rideId?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  subject: string;
  description: string;
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

export const supportService = {
  async createTicket(
    token: string,
    data: CreateTicketRequest,
  ): Promise<TicketResponse> {
    const response = await apiClient.post('/support', data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async getTicket(token: string, ticketId: string): Promise<TicketResponse> {
    const response = await apiClient.get(`/support/${ticketId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async getMyTickets(token: string, limit = 20): Promise<TicketResponse[]> {
    const response = await apiClient.get('/support/me/tickets', {
      params: { limit },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.tickets || [];
  },

  async getRideTickets(
    token: string,
    rideId: string,
  ): Promise<TicketResponse[]> {
    const response = await apiClient.get(`/support/ride/${rideId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.tickets || [];
  },

  async getTicketSummary(token: string): Promise<TicketSummary> {
    const response = await apiClient.get('/support/summary/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async updateTicket(
    token: string,
    ticketId: string,
    updates: { status?: 'closed' },
  ): Promise<TicketResponse> {
    const response = await apiClient.put(`/support/${ticketId}`, updates, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async deleteTicket(token: string, ticketId: string): Promise<void> {
    await apiClient.delete(`/support/${ticketId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};



