import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminSellerService } from '../api/adminSellerService';

export const useAdminGetSellers = () => {
  return useQuery({
    queryKey: ['adminSellers'],
    queryFn: adminSellerService.getSellers,
  });
};

export const useAdminGetSellerById = (id: string) => {
  return useQuery({
    queryKey: ['adminSeller', id],
    queryFn: () => adminSellerService.getSellerById(id),
    enabled: !!id,
  });
};

export const useAdminDeleteSeller = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminSellerService.deleteSeller(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminSellers'] }),
  });
};

export const useAdminVerifySeller = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminSellerService.verifySeller(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['adminSellers'] });
      queryClient.invalidateQueries({ queryKey: ['adminSeller', id] });
    },
  });
};

export const useAdminSuspendSeller = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => adminSellerService.suspendSeller(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['adminSellers'] });
      queryClient.invalidateQueries({ queryKey: ['adminSeller', id] });
    },
  });
};

export const useAdminUnsuspendSeller = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminSellerService.unsuspendSeller(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['adminSellers'] });
      queryClient.invalidateQueries({ queryKey: ['adminSeller', id] });
    },
  });
};

export const useAdminUpdateCommission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, commissionRate }: { id: string; commissionRate: number }) => adminSellerService.updateCommission(id, commissionRate),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['adminSellers'] });
      queryClient.invalidateQueries({ queryKey: ['adminSeller', id] });
    },
  });
};

export const useAdminUpdateLevel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, level }: { id: string; level: string }) => adminSellerService.updateLevel(id, level),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['adminSellers'] });
      queryClient.invalidateQueries({ queryKey: ['adminSeller', id] });
    },
  });
};

export const useAdminVerifyBank = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: 'verified' | 'rejected'; reason?: string }) => adminSellerService.verifyBank(id, status, reason),
    onSuccess: (_, { id }) => queryClient.invalidateQueries({ queryKey: ['adminSeller', id] }),
  });
};

export const useAdminAdjustWallet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount: number; reason: string }) => adminSellerService.adjustWallet(id, amount, reason),
    onSuccess: (_, { id }) => queryClient.invalidateQueries({ queryKey: ['adminSeller', id] }),
  });
};

export const useAdminUpdateDocumentStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, docId, status, reason }: { id: string; docId: string; status: 'approved' | 'rejected'; reason?: string }) => 
      adminSellerService.updateDocumentStatus(id, docId, status, reason),
    onSuccess: (_, { id }) => queryClient.invalidateQueries({ queryKey: ['adminSeller', id] }),
  });
};

export const useAdminUpdatePayoutStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payoutId, status, txnRef }: { id: string; payoutId: string; status: 'completed' | 'failed'; txnRef?: string }) => 
      adminSellerService.updatePayoutStatus(id, payoutId, status, txnRef),
    onSuccess: (_, { id }) => queryClient.invalidateQueries({ queryKey: ['adminSeller', id] }),
  });
};

export const useAdminRefreshAnalytics = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminSellerService.refreshAnalytics(id),
    onSuccess: (_, id) => queryClient.invalidateQueries({ queryKey: ['adminSeller', id] }),
  });
};
