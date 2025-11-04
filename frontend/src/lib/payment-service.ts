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
    return apiClient.post<PaymentResponse>('/payments', data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async getPayment(token: string, paymentId: string): Promise<PaymentResponse> {
    return apiClient.get<PaymentResponse>(`/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async getPaymentHistory(token: string, limit = 20): Promise<PaymentResponse[]> {
    const response = await apiClient.get<{ payments: PaymentResponse[] }>('/payments/history/me', {
      params: { limit },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.payments || [];
  },

  async createPayout(
    token: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<PayoutResponse> {
    return apiClient.post<PayoutResponse>(
      '/payments/payouts',
      { periodStart, periodEnd },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  },

  async getPayoutHistory(token: string, limit = 20): Promise<PayoutResponse[]> {
    const response = await apiClient.get<{ payouts: PayoutResponse[] }>('/payments/payouts/history', {
      params: { limit },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.payouts || [];
  },

  async getPaymentSummary(token: string): Promise<PaymentSummary> {
    return apiClient.get<PaymentSummary>('/payments/payouts/summary', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};





