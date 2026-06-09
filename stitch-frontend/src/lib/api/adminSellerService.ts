import { apiClient } from './apiClient';
import { Seller } from './sellerService';

export const adminSellerService = {
  getSellers: async () => {
    const res = await apiClient.get<any>('/api/v1/sellers/admin');
    return Array.isArray(res) ? res : (res.data || []);
  },
  getSellerById: (id: string) => apiClient.get<Seller>(`/api/v1/sellers/admin/${id}`).then((res: any) => res.data || res),
  deleteSeller: (id: string) => apiClient.delete<void>(`/api/v1/sellers/admin/${id}`),
  verifySeller: (id: string, status: 'approved' | 'rejected', remarks?: string) => 
    apiClient.patch<Seller>(`/api/v1/sellers/admin/${id}/verify`, { status, remarks }),
  suspendSeller: (id: string, reason?: string) => apiClient.patch<Seller>(`/api/v1/sellers/admin/${id}/suspend`, { reason }),
  unsuspendSeller: (id: string) => apiClient.patch<Seller>(`/api/v1/sellers/admin/${id}/unsuspend`, {}),
  
  updateCommission: (id: string, commissionRate: number) => apiClient.patch<Seller>(`/api/v1/sellers/admin/${id}/commission`, { commissionRate }),
  updateLevel: (id: string, level: string) => apiClient.patch<Seller>(`/api/v1/sellers/admin/${id}/level`, { level }),
  
  verifyBank: (id: string, status: 'verified' | 'rejected', reason?: string) => 
    apiClient.patch<any>(`/api/v1/sellers/admin/${id}/bank/verify`, { status, reason }),
  
  adjustWallet: (id: string, amount: number, reason: string) => 
    apiClient.patch<any>(`/api/v1/sellers/admin/${id}/wallet/adjust`, { amount, reason }),
  
  updateDocumentStatus: (id: string, docId: string, status: 'approved' | 'rejected', reason?: string) => 
    apiClient.patch<any>(`/api/v1/sellers/admin/${id}/documents/${docId}/status`, { status, reason }),
  
  updatePayoutStatus: (id: string, payoutId: string, status: 'completed' | 'failed', txnRef?: string) => 
    apiClient.patch<any>(`/api/v1/sellers/admin/${id}/payouts/${payoutId}/status`, { status, txnRef }),
  
  refreshAnalytics: (id: string) => apiClient.patch<any>(`/api/v1/sellers/admin/${id}/analytics/refresh`, {}),
};
