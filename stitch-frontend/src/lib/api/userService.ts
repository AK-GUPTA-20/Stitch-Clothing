// src/lib/api/userService.ts
import { apiClient } from './apiClient';
import {
  User,
  AuthResponse,
  BasicResponse,
  UserResponse,
  AddressResponse,
  WishlistResponse,
  NotificationResponse,
  WalletResponse,
  LoyaltyResponse,
  ReferralResponse,
  DeletionResponse,
  VerifyEmailOtpRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ChangePasswordRequest,
  UpdateBodyMeasurementsRequest,
  AddAddressRequest,
  UpdateAddressRequest,
  UpdateNotificationPreferencesRequest,
  AddPushTokenRequest,
  AdminWalletRequest,
  AdminLoyaltyRequest,
} from '../types/user.types';

export interface AdminUpdateUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  isActive?: boolean;
  isSuspended?: boolean;
  suspensionReason?: string;
  walletBalance?: number;
  loyaltyPoints?: number;
  loyaltyTier?: string;
}

export const userService = {
  register: (data: { firstName: string; lastName: string; email: string; password: string; phone?: string }) =>
    apiClient.post<AuthResponse>('/api/v1/user/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/api/v1/user/login', data),

  logout: (refreshToken: string) =>
    apiClient.post<BasicResponse>('/api/v1/user/logout', { refreshToken }),

  logoutAll: () =>
    apiClient.post<BasicResponse>('/api/v1/user/logout-all', {}),

  refreshToken: (refreshToken: string) =>
    apiClient.post<AuthResponse & { accessToken: string }>('/api/v1/user/refresh-token', { refreshToken }),

  getProfile: () =>
    apiClient.get<UserResponse>('/api/v1/user/me'),

  updateProfile: (data: Partial<User>) =>
    apiClient.put<UserResponse>('/api/v1/user/me', data),

  sendEmailVerification: () =>
    apiClient.post<BasicResponse>('/api/v1/user/send-email-verification', {}),

  verifyEmailByToken: (token: string) =>
    apiClient.get<BasicResponse>(`/api/v1/user/verify-email/${encodeURIComponent(token)}`),

  verifyEmail: (data: VerifyEmailOtpRequest) =>
    apiClient.post<BasicResponse>('/api/v1/user/verify-email', data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient.post<BasicResponse>('/api/v1/user/forgot-password', data),

  resetPassword: (data: ResetPasswordRequest) =>
    apiClient.post<BasicResponse>('/api/v1/user/reset-password', data),

  changePassword: (data: ChangePasswordRequest) =>
    apiClient.post<BasicResponse>('/api/v1/user/change-password', data),

  // ====================
  // Addresses
  // ====================
  getAddresses: () =>
    apiClient.get<AddressResponse>('/api/v1/user/addresses'),
  addAddress: (data: AddAddressRequest) =>
    apiClient.post<AddressResponse>('/api/v1/user/addresses', data),
  updateAddress: (addressId: string, data: UpdateAddressRequest) =>
    apiClient.put<AddressResponse>(`/api/v1/user/addresses/${addressId}`, data),
  deleteAddress: (addressId: string) =>
    apiClient.delete<AddressResponse>(`/api/v1/user/addresses/${addressId}`),

  // ====================
  // Wishlist
  // ====================
  getWishlist: () =>
    apiClient.get<WishlistResponse>('/api/v1/user/wishlist'),
  addToWishlist: (data: { productId: string; variantId?: string; priceWhenAdded?: number; notifyOnPriceDrop?: boolean }) =>
    apiClient.post<WishlistResponse>('/api/v1/user/wishlist', data),
  removeFromWishlist: (productId: string) =>
    apiClient.delete<WishlistResponse>(`/api/v1/user/wishlist/${productId}`),
  clearWishlist: () =>
    apiClient.delete<BasicResponse>('/api/v1/user/wishlist'),

  // ====================
  // Notifications
  // ====================
  getNotifications: (page = 1, limit = 20, unreadOnly = false) =>
    apiClient.get<NotificationResponse>(
      `/api/v1/user/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`
    ),
  getNotification: (notifId: string) =>
    apiClient.get<NotificationResponse>(`/api/v1/user/notifications/${notifId}`),
  markNotificationRead: (notifId: string) =>
    apiClient.patch<BasicResponse>(`/api/v1/user/notifications/${notifId}/read`, {}),
  markAllNotificationsRead: () =>
    apiClient.patch<BasicResponse>('/api/v1/user/notifications/read-all', {}),
  deleteNotification: (notifId: string) =>
    apiClient.delete<BasicResponse>(`/api/v1/user/notifications/${notifId}`),
  updateNotificationPreferences: (data: UpdateNotificationPreferencesRequest) =>
    apiClient.put<BasicResponse>('/api/v1/user/notification-preferences', data),

  // ====================
  // Wallet
  // ====================
  getWallet: (page = 1, limit = 20) =>
    apiClient.get<WalletResponse>(`/api/v1/user/wallet?page=${page}&limit=${limit}`),

  // ====================
  // Loyalty
  // ====================
  getLoyalty: (page = 1, limit = 20) =>
    apiClient.get<LoyaltyResponse>(`/api/v1/user/loyalty?page=${page}&limit=${limit}`),

  // ====================
  // Referral
  // ====================
  getReferralInfo: () =>
    apiClient.get<ReferralResponse>('/api/v1/user/referral'),

  // ====================
  // Search & History
  // ====================
  getSearchHistory: () =>
    apiClient.get<BasicResponse & { searchHistory: { query: string; searchedAt?: string }[] }>(
      '/api/v1/user/search-history'
    ),
  clearSearchHistory: () =>
    apiClient.delete<BasicResponse>('/api/v1/user/search-history'),
  getRecentlyViewed: () =>
    apiClient.get<BasicResponse & { recentlyViewed: { productId: string; viewedAt?: string }[] }>(
      '/api/v1/user/recently-viewed'
    ),
  addRecentlyViewed: (data: { productId: string; duration?: number }) =>
    apiClient.post<BasicResponse>('/api/v1/user/recently-viewed', data),

  // ====================
  // Account Deletion
  // ====================
  requestAccountDeletion: (reason?: string) =>
    apiClient.post<DeletionResponse>('/api/v1/user/request-deletion', { reason }),
  cancelAccountDeletion: () =>
    apiClient.post<BasicResponse>('/api/v1/user/cancel-deletion', {}),

  // ====================
  // Extended Profile
  // ====================
  updateAvatar: (data: { avatarUrl: string }) =>
    apiClient.put<UserResponse>('/api/v1/user/me/avatar', data),
  updateBodyMeasurements: (data: UpdateBodyMeasurementsRequest) =>
    apiClient.put<UserResponse>('/api/v1/user/me/measurements', data),

  // ====================
  // Push Tokens
  // ====================
  addPushToken: (data: AddPushTokenRequest) =>
    apiClient.post<BasicResponse>('/api/v1/user/push-token', {
      token: data.token,
      platform: data.platform || data.deviceType || 'web',
      deviceId: data.deviceId,
    }),
  removePushToken: (token: string) =>
    apiClient.delete<BasicResponse>(`/api/v1/user/push-token/${token}`),

  // ====================
  // Admin Operations
  // ====================
  adminGetUsers: (query = '') =>
    apiClient.get<BasicResponse & { users: User[]; total: number; activeTotal: number; suspendedTotal: number }>(
      `/api/v1/user/admin${query ? `?${query}` : ''}`
    ),
  adminGetUser: (userId: string) =>
    apiClient.get<BasicResponse & { user: User }>(`/api/v1/user/admin/${userId}`),
  adminUpdateUser: (userId: string, data: AdminUpdateUserPayload) =>
    apiClient.put<BasicResponse & { user: User }>(`/api/v1/user/admin/${userId}`, data),
  adminDeleteUser: (userId: string) =>
    apiClient.delete<BasicResponse>(`/api/v1/user/admin/${userId}`),
  adminSuspendUser: (userId: string, reason?: string) =>
    apiClient.put<BasicResponse>(`/api/v1/user/admin/${userId}/suspend`, { reason }),
  adminUnsuspendUser: (userId: string) =>
    apiClient.put<BasicResponse>(`/api/v1/user/admin/${userId}/unsuspend`, {}),
  adminUpdateWallet: (userId: string, data: AdminWalletRequest) =>
    apiClient.post<BasicResponse>(`/api/v1/user/admin/${userId}/wallet`, data),
  adminUpdateLoyalty: (userId: string, data: AdminLoyaltyRequest) =>
    apiClient.post<BasicResponse>(`/api/v1/user/admin/${userId}/loyalty`, data),
};
