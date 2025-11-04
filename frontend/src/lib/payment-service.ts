import { apiClient } from './api-client';

export interface CreatePaymentRequest {
  rideId: string;
  amountCents: number;
  currency?: string;
  provider?: string;
  paymentMethod: 'cash' | 'card' | 'upi' | 'wallet';
}

export interface PaymentResponse {
  id: string;
  rideId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
  capturedAt?: string;
}

export interface PayoutResponse {
  id: string;
  driverId: string;
  amount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  processedAt?: string;
  createdAt: string;
}

export interface PaymentSummary {
  totalEarnings: number;
  pendingPayouts: number;
  completedPayouts: number;
  currency: string;
}

export const paymentService = {
  async createPayment(
    token: string,
    data: CreatePaymentRequest,
  ): Promise<PaymentResponse> {
    const response = await apiClient.post('/payments', data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async getPayment(token: string, paymentId: string): Promise<PaymentResponse> {
    const response = await apiClient.get(`/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  async getPaymentHistory(token: string, limit = 20): Promise<PaymentResponse[]> {
    const response = await apiClient.get('/payments/history/me', {
      params: { limit },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.payments || [];
  },

  async createPayout(
    token: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<PayoutResponse> {
    const response = await apiClient.post(
      '/payments/payouts',
      { periodStart, periodEnd },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  },

  async getPayoutHistory(token: string, limit = 20): Promise<PayoutResponse[]> {
    const response = await apiClient.get('/payments/payouts/history', {
      params: { limit },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data.payouts || [];
  },

  async getPaymentSummary(token: string): Promise<PaymentSummary> {
    const response = await apiClient.get('/payments/payouts/summary', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};




