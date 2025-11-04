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
    return apiClient.post<TicketResponse>('/support', data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async getTicket(token: string, ticketId: string): Promise<TicketResponse> {
    return apiClient.get<TicketResponse>(`/support/${ticketId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async getMyTickets(token: string, limit = 20): Promise<TicketResponse[]> {
    const response = await apiClient.get<{ tickets: TicketResponse[] }>('/support/me/tickets', {
      params: { limit },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.tickets || [];
  },

  async getRideTickets(
    token: string,
    rideId: string,
  ): Promise<TicketResponse[]> {
    const response = await apiClient.get<{ tickets: TicketResponse[] }>(`/support/ride/${rideId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.tickets || [];
  },

  async getTicketSummary(token: string): Promise<TicketSummary> {
    return apiClient.get<TicketSummary>('/support/summary/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async updateTicket(
    token: string,
    ticketId: string,
    updates: { status?: 'closed' },
  ): Promise<TicketResponse> {
    return apiClient.put<TicketResponse>(`/support/${ticketId}`, updates, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async deleteTicket(token: string, ticketId: string): Promise<void> {
    await apiClient.delete(`/support/${ticketId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};





