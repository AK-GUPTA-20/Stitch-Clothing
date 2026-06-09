import { apiClient } from './apiClient';
import {
  BusinessInfo,
  StoreInfo,
  ShippingSettings,
  NotificationPreferences,
  PayoutSettings,
  BankDetails,
  Warehouse,
} from '../schemas/seller';

export interface SellerAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface Seller {
  id: string;
  _id: string;
  slug: string;
  businessName: string;
  storeName: string;
  logoUrl?: string;
  coverUrl?: string;
  description?: string;
  status: 'pending' | 'verified' | 'suspended' | 'rejected';
  kycRejectionReason?: string;
  rating?: number;
  totalOrders?: number;
  totalRevenue?: number;
  totalProducts?: number;
  joinedAt?: string;
  commissionRate?: number;
  settlementCycle?: 'daily' | 'weekly' | 'monthly';
  phone?: string;
  legalEntityName?: string;
  taxId?: string;
  address?: SellerAddress;
  /** Nested store info (some API responses populate this) */
  store?: {
    name?: string;
    description?: string;
    logoUrl?: string;
    coverUrl?: string;
    rating?: number;
    totalProducts?: number;
    totalOrders?: number;
  };
  /** Verification status string used across the entire application as source of truth for KYC */
  verificationStatus?: 'not_submitted' | 'documents_received' | 'under_review' | 'approved' | 'rejected' | 'suspended';
  bankVerificationStatus?: 'not_started' | 'pending' | 'verified' | 'rejected';
  level?: string;
  bank?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    status?: string;
  };
  documents?: any[];
  wallet?: {
    balance?: number;
    currency?: string;
  };
  payouts?: any[];
  createdAt: string;
  updatedAt?: string;
}

export interface Wallet {
  balance: number;
  currency: string;
  status: string;
  pendingBalance?: number;
  lifetimeEarnings?: number;
  transactions: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
  orderId?: string;
  payoutId?: string;
}

export interface Payout {
  id: string;
  _id?: string;
  amount: number;
  currency?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
  };
  transactionId?: string;
  notes?: string;
}

export interface AnalyticsPeriod {
  startDate?: string;
  endDate?: string;
  period?: '7d' | '30d' | '90d' | 'ytd' | 'all';
}

export interface TopProduct {
  productId: string;
  name: string;
  salesCount: number;
  revenue: number;
  imageUrl?: string;
  averageRating?: number;
}

export interface LowStockItem {
  productId: string;
  name: string;
  variantSku: string;
  variantLabel?: string;
  stock: number;
  lowStockThreshold?: number;
}

export interface Analytics {
  revenue: number;
  orders: number;
  conversionRate: number;
  productsSold: number;
  averageOrderValue?: number;
  returnsRate?: number;
  pendingPayoutAmount?: number;
  revenueByDay?: { date: string; revenue: number; orders: number }[];
  ordersByStatus?: Record<string, number>;
  topProducts?: TopProduct[];
  lowStockProducts?: LowStockItem[];
  period?: { start: string; end: string };
  // Legacy
  topPerformers: any[];
  charts: any[];
}

export interface Dashboard {
  pendingOrders?: number;
  totalRevenue?: number;
  walletBalance?: number;
  lowStockCount?: number;
  pendingApprovalProducts?: number;
  recentOrders?: any[];
  todayOrders?: number;
  [key: string]: any;
}

export interface SellerDashboard {
  seller: Seller;
  todayOrders: number;
  todayRevenue: number;
  pendingOrders: number;
  pendingApprovalProducts: number;
  lowStockCount: number;
  walletBalance: number;
  recentOrders?: any[];
}

export const sellerService = {
  // ── Public ──────────────────────────────────────────────────────────────
  getSellers: () =>
    apiClient.get<{ data: Seller[]; total: number }>('/api/v1/sellers'),
  getSellerById: (id: string) =>
    apiClient.get<{ data: Seller }>(`/api/v1/sellers/${id}`),
  getSellerBySlug: (slug: string) =>
    apiClient.get<{ data: Seller }>(`/api/v1/sellers/slug/${slug}`),

  // ── Profile & Onboarding ────────────────────────────────────────────────
  register: (data: BusinessInfo) =>
    apiClient.post<{ seller: Seller }>('/api/v1/sellers/register', data),
  getMe: () => apiClient.get<Seller>('/api/v1/sellers/me'),
  updateBusinessInfo: (data: BusinessInfo) =>
    apiClient.patch<{ seller: Seller }>('/api/v1/sellers/me/business', data),
  updateStoreInfo: (data: StoreInfo) =>
    apiClient.patch<{ seller: Seller }>('/api/v1/sellers/me/store', data),
  updateShippingSettings: (data: ShippingSettings) =>
    apiClient.patch<{ seller: Seller }>('/api/v1/sellers/me/shipping', data),
  updateNotificationPreferences: (data: NotificationPreferences) =>
    apiClient.patch<{ seller: Seller }>(
      '/api/v1/sellers/me/notification-preferences',
      data
    ),
  updatePayoutSettings: (data: PayoutSettings) =>
    apiClient.patch<{ seller: Seller }>('/api/v1/sellers/me/payout-settings', data),

  // ── KYC Documents ───────────────────────────────────────────────────────
  getDocuments: () =>
    apiClient.get<{ documents: any[]; kycStatus?: string }>(
      '/api/v1/sellers/me/documents'
    ),
  uploadDocument: (formData: FormData) =>
    apiClient.uploadFile<{ document: any }>('/api/v1/sellers/me/documents', formData),
  deleteDocument: (docId: string) =>
    apiClient.delete<{ success: boolean }>(
      `/api/v1/sellers/me/documents/${docId}`
    ),

  // ── Bank Details ────────────────────────────────────────────────────────
  getBankDetails: () => apiClient.get<BankDetails>('/api/v1/sellers/me/bank'),
  updateBankDetails: (data: Omit<BankDetails, 'confirmAccountNumber'>) =>
    apiClient.put<{ bankDetails: BankDetails }>('/api/v1/sellers/me/bank', data),

  // ── Wallet ──────────────────────────────────────────────────────────────
  getWallet: () => apiClient.get<Wallet>('/api/v1/sellers/me/wallet'),

  // ── Payouts ─────────────────────────────────────────────────────────────
  getPayouts: () =>
    apiClient.get<{ payouts: Payout[]; total: number }>(
      '/api/v1/sellers/me/payouts'
    ),
  requestPayout: (amount: number) =>
    apiClient.post<{ payout: Payout }>('/api/v1/sellers/me/payouts', { amount }),

  // ── Warehouses ──────────────────────────────────────────────────────────
  getWarehouses: () =>
    apiClient.get<{ warehouses: Warehouse[] }>('/api/v1/sellers/me/warehouses'),
  createWarehouse: (data: Omit<Warehouse, 'isDefault'>) =>
    apiClient.post<{ warehouse: Warehouse }>('/api/v1/sellers/me/warehouses', data),
  updateWarehouse: (id: string, data: Partial<Warehouse>) =>
    apiClient.put<{ warehouse: Warehouse }>(
      `/api/v1/sellers/me/warehouses/${id}`,
      data
    ),
  deleteWarehouse: (id: string) =>
    apiClient.delete<{ success: boolean }>(
      `/api/v1/sellers/me/warehouses/${id}`
    ),
  setDefaultWarehouse: (id: string) =>
    apiClient.patch<{ warehouse: Warehouse }>(
      `/api/v1/sellers/me/warehouses/${id}/default`,
      {}
    ),

  // ── Analytics ───────────────────────────────────────────────────────────
  getAnalytics: (params?: { period?: string; startDate?: string; endDate?: string }) => {
    const entries = Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== null && v !== '');
    const qs = entries.length > 0 ? '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&') : '';
    return apiClient.get<Analytics>(`/api/v1/sellers/me/analytics${qs}`);
  },

  // ── Dashboard ───────────────────────────────────────────────────────────
  getDashboard: () => apiClient.get<Dashboard>('/api/v1/sellers/me/dashboard'),

  // ── Public Store ────────────────────────────────────────────────────────
  getPublicAnalytics: (slug: string) => 
    apiClient.get<{ metrics: PublicSellerAnalyticsMetrics, topProduct: any }>(`/api/v1/sellers/slug/${slug}/analytics`),
};

export interface PublicSellerAnalyticsMetrics {
  ordersDelivered: number;
  ordersCancelled: number;
  ordersReturned: number;
  deliverySuccessRate: string;
  returnRate: string;
  averageDeliveryTimeDays: string;
  activeProducts: number;
  totalViews: number;
  totalWishlisted: number;
  totalSales: number;
  totalReviews: number;
  averageProductRating: string;
}
