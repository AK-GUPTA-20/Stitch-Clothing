import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sellerService, AnalyticsPeriod } from '../api/sellerService';
import {
  BusinessInfo,
  StoreInfo,
  ShippingSettings,
  NotificationPreferences,
  PayoutSettings,
  BankDetails,
  Warehouse,
} from '../schemas/seller';

/**
 * Shared retry policy: skip retrying on 404 (resource doesn't exist),
 * otherwise allow up to 2 retries.
 */
const NO_RETRY_404 = (failureCount: number, error: any) => {
  if (error?.status === 404 || error?.response?.status === 404) return false;
  return failureCount < 2;
};

// ── Public Queries ─────────────────────────────────────────────────────────

export const useGetSellers = () =>
  useQuery({
    queryKey: ['sellers'],
    queryFn: sellerService.getSellers,
    staleTime: 60_000,
  });

export const useGetSellerById = (id: string) =>
  useQuery({
    queryKey: ['seller', id],
    queryFn: () => sellerService.getSellerById(id),
    enabled: !!id,
    staleTime: 60_000,
  });

export const useGetSellerBySlug = (slug: string) =>
  useQuery({
    queryKey: ['sellerSlug', slug],
    queryFn: () => sellerService.getSellerBySlug(slug),
    enabled: !!slug,
    staleTime: 60_000,
  });

// ── Authenticated Seller Profile ───────────────────────────────────────────

export const useGetMe = () =>
  useQuery({
    queryKey: ['sellerMe'],
    queryFn: sellerService.getMe,
    staleTime: 30_000,
    retry: NO_RETRY_404,
  });

export const useRegisterSeller = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BusinessInfo) => sellerService.register(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sellerMe'] }),
  });
};

export const useUpdateBusinessInfo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: BusinessInfo) => sellerService.updateBusinessInfo(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sellerMe'] }),
  });
};

export const useUpdateStoreInfo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: StoreInfo) => sellerService.updateStoreInfo(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sellerMe'] }),
  });
};

export const useUpdateShippingSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ShippingSettings) =>
      sellerService.updateShippingSettings(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sellerMe'] }),
  });
};

export const useUpdateNotificationPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NotificationPreferences) =>
      sellerService.updateNotificationPreferences(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sellerMe'] }),
  });
};

export const useUpdatePayoutSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PayoutSettings) =>
      sellerService.updatePayoutSettings(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sellerMe'] }),
  });
};

// ── KYC Documents ──────────────────────────────────────────────────────────

export const useGetDocuments = () =>
  useQuery({
    queryKey: ['sellerDocuments'],
    queryFn: sellerService.getDocuments,
    staleTime: 30_000,
    retry: NO_RETRY_404,
  });

export const useUploadDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => sellerService.uploadDocument(formData),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['sellerDocuments'] }),
  });
};

export const useDeleteDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (docId: string) => sellerService.deleteDocument(docId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['sellerDocuments'] }),
  });
};

// ── Bank Details ───────────────────────────────────────────────────────────

export const useGetBankDetails = () =>
  useQuery({
    queryKey: ['sellerBank'],
    queryFn: sellerService.getBankDetails,
    staleTime: 60_000,
    retry: NO_RETRY_404,
  });

export const useUpdateBankDetails = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<BankDetails, 'confirmAccountNumber'>) =>
      sellerService.updateBankDetails(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['sellerBank'] }),
  });
};

// ── Wallet ─────────────────────────────────────────────────────────────────

export const useGetWallet = () =>
  useQuery({
    queryKey: ['sellerWallet'],
    queryFn: sellerService.getWallet,
    staleTime: 15_000,
    retry: NO_RETRY_404,
  });

// ── Payouts ────────────────────────────────────────────────────────────────

export const useGetPayouts = () =>
  useQuery({
    queryKey: ['sellerPayouts'],
    queryFn: sellerService.getPayouts,
    staleTime: 30_000,
    retry: NO_RETRY_404,
  });

export const useRequestPayout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => sellerService.requestPayout(amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellerPayouts'] });
      queryClient.invalidateQueries({ queryKey: ['sellerWallet'] });
    },
  });
};

// ── Warehouses ─────────────────────────────────────────────────────────────

export const useGetWarehouses = () =>
  useQuery({
    queryKey: ['sellerWarehouses'],
    queryFn: sellerService.getWarehouses,
    staleTime: 60_000,
    retry: NO_RETRY_404,
  });

export const useCreateWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Warehouse, 'isDefault'>) =>
      sellerService.createWarehouse(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['sellerWarehouses'] }),
  });
};

export const useUpdateWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Warehouse> }) =>
      sellerService.updateWarehouse(id, data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['sellerWarehouses'] }),
  });
};

export const useDeleteWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sellerService.deleteWarehouse(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['sellerWarehouses'] }),
  });
};

export const useSetDefaultWarehouse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sellerService.setDefaultWarehouse(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['sellerWarehouses'] }),
  });
};

// ── Analytics ──────────────────────────────────────────────────────────────

export const useGetAnalytics = (params?: AnalyticsPeriod) =>
  useQuery({
    queryKey: ['sellerAnalytics', params],
    queryFn: () => sellerService.getAnalytics(params),
    staleTime: 60_000,
    retry: NO_RETRY_404,
  });

// ── Dashboard ──────────────────────────────────────────────────────────────

export const useGetDashboard = () =>
  useQuery({
    queryKey: ['sellerDashboard'],
    queryFn: sellerService.getDashboard,
    staleTime: 30_000,
    retry: NO_RETRY_404,
  });
