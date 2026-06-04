export type UserRole = 'user' | 'seller' | 'admin';
export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app';
export type NotificationType =
  | 'order_update'
  | 'payment'
  | 'promotion'
  | 'review'
  | 'wishlist_alert'
  | 'price_drop'
  | 'system'
  | 'referral'
  | 'loyalty'
  | 'return_update';

export interface Address {
  _id?: string;
  label?: string;
  type?: 'shipping' | 'billing' | 'pickup' | 'both';
  recipientName?: string;
  phone?: string;
  alternatePhone?: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  district?: string;
  state: string;
  postalCode: string;
  country: string;
  gstin?: string;
  isDefault?: boolean;
  isVerified?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface ImageAsset {
  _id?: string;
  url: string;
  alt?: string;
  position?: number;
  isDefault?: boolean;
  width?: number;
  height?: number;
  mimeType?: string;
  fileSize?: number;
}

export interface BodyMeasurements {
  height?: number;
  weight?: number;
  chest?: number;
  waist?: number;
  hips?: number;
  inseam?: number;
  shoulder?: number;
  neck?: number;
  sleeve?: number;
  unit?: 'cm' | 'in';
  updatedAt?: string;
}

export interface RefreshToken {
  _id?: string;
  token: string;
  deviceId?: string;
  platform?: 'web' | 'android' | 'ios' | 'desktop';
  fcmToken?: string;
  userAgent?: string;
  ip?: string;
  expiresAt: string;
  isRevoked?: boolean;
  revokedAt?: string;
  createdAt?: string;
}

export interface OtpRecord {
  code?: string;
  hashedCode?: string;
  purpose?: 'email_verify' | 'phone_verify' | 'password_reset' | 'login_2fa';
  deliveredTo?: string;
  expiresAt?: string;
  attempts?: number;
  verified?: boolean;
  verifiedAt?: string;
}

export interface PushToken {
  _id?: string;
  token: string;
  platform?: 'android' | 'ios' | 'web';
  deviceId?: string;
  isActive?: boolean;
  updatedAt?: string;
}

export interface NotificationPreferencesSection {
  orderUpdates?: boolean;
  promotions?: boolean;
  newArrivals?: boolean;
  priceDrops?: boolean;
  reviews?: boolean;
  wishlistAlert?: boolean;
  otp?: boolean;
  loyalty?: boolean;
  returnUpdates?: boolean;
}

export interface NotificationPreferences {
  email?: NotificationPreferencesSection;
  push?: NotificationPreferencesSection;
  sms?: NotificationPreferencesSection;
}

export interface WalletTransaction {
  _id?: string;
  type: 'credit' | 'debit';
  amount: number;
  balance: number;
  source?:
    | 'order_refund'
    | 'gift_card'
    | 'loyalty_redeem'
    | 'admin_credit'
    | 'cashback'
    | 'withdrawal'
    | 'order_payment'
    | 'referral_bonus';
  referenceId?: string;
  description?: string;
  createdAt?: string;
}

export interface LoyaltyHistoryEntry {
  _id?: string;
  type: 'earn' | 'redeem' | 'expire' | 'adjust';
  points: number;
  balance: number;
  source?:
    | 'purchase'
    | 'signup'
    | 'review'
    | 'referral'
    | 'birthday_bonus'
    | 'admin_credit'
    | 'redemption'
    | 'tier_upgrade_bonus';
  referenceId?: string;
  description?: string;
  expiresAt?: string;
  createdAt?: string;
}

export interface WishlistItem {
  _id?: string;
  productId: string;
  variantId?: string;
  addedAt?: string;
  priceWhenAdded?: number;
  notifyOnPriceDrop?: boolean;
}

export interface RecentlyViewedItem {
  productId: string;
  viewedAt?: string;
  duration?: number;
}

export interface NotificationData {
  orderId?: string;
  productId?: string;
  promotionId?: string;
  actionUrl?: string;
  deepLink?: string;
}

export interface NotificationItem {
  _id?: string;
  type: NotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  data?: NotificationData;
  channel?: NotificationChannel;
  isRead?: boolean;
  readAt?: string;
  createdAt?: string;
}

export interface DeletionRequest {
  requestedAt?: string;
  reason?: string;
  scheduledAt?: string;
  isCancelled?: boolean;
  cancelledAt?: string;
}

export interface User {
  _id: string;
  sellerId?: string;
  firstName: string;
  lastName: string;
  name?: string;
  fullName?: string;
  email: string;
  phone?: string;
  password?: string;
  avatar?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  dob?: string;
  age?: number;
  role: UserRole;
  orderCount?: number;
  preferredLanguage?: string;
  preferredCurrency?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  isActive?: boolean;
  isSuspended?: boolean;
  suspensionReason?: string;
  suspendedAt?: string;
  suspendedBy?: string;
  emailVerifyToken?: string;
  isEmailUnsubscribed?: boolean;
  passwordChangedAt?: string;
  loginAttempts?: number;
  lockUntil?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  refreshTokens?: RefreshToken[];
  otp?: OtpRecord;
  pushTokens?: PushToken[];
  googleId?: string;
  facebookId?: string;
  appleId?: string;
  activeCartId?: string;
  addresses?: Address[];
  bodyMeasurements?: BodyMeasurements;
  walletBalance?: number;
  walletTransactions?: WalletTransaction[];
  loyaltyPoints?: number;
  loyaltyTier?: LoyaltyTier;
  loyaltyHistory?: LoyaltyHistoryEntry[];
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;
  wishlist?: WishlistItem[];
  searchHistory?: { query: string; searchedAt?: string }[];
  recentlyViewed?: RecentlyViewedItem[];
  notifications?: NotificationItem[];
  unreadNotifCount?: number;
  notificationPreferences?: NotificationPreferences;
  deletionRequest?: DeletionRequest;
  deletedAt?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastActiveAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface BasicResponse {
  success: boolean;
  message: string;
}

export interface UserResponse {
  success: boolean;
  user: User;
  message?: string;
}

export interface AddressResponse {
  success: boolean;
  addresses: Address[];
  message?: string;
}

export interface WishlistResponse {
  success: boolean;
  wishlist: WishlistItem[];
  message?: string;
}

export interface NotificationResponse {
  success: boolean;
  notifications: NotificationItem[];
  unreadCount?: number;
  total?: number;
  message?: string;
}

export interface WalletResponse {
  success: boolean;
  balance: number;
  transactions: WalletTransaction[];
  total?: number;
  message?: string;
}

export interface LoyaltyResponse {
  success: boolean;
  points: number;
  tier: LoyaltyTier | string;
  history: LoyaltyHistoryEntry[];
  total?: number;
  message?: string;
}

export interface ReferralResponse {
  success: boolean;
  referralCode: string;
  referralCount: number;
  referredBy: string | null;
  referralLink: string;
  message?: string;
}

export interface DeletionResponse {
  success: boolean;
  scheduledAt?: string;
  message?: string;
}

export interface VerifyEmailTokenRequest {
  token: string;
}

export interface VerifyEmailOtpRequest {
  email: string;
  otp: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  otp: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateAvatarRequest {
  avatarUrl: string;
}

export interface UpdateBodyMeasurementsRequest extends BodyMeasurements {}

export interface AddressPayload extends Omit<Address, '_id'> {}

export interface AddAddressRequest extends AddressPayload {}

export interface UpdateAddressRequest extends Partial<AddressPayload> {}

export interface UpdateNotificationPreferencesRequest {
  email?: NotificationPreferencesSection;
  push?: NotificationPreferencesSection;
  sms?: NotificationPreferencesSection;
}

export interface AddPushTokenRequest {
  token: string;
  deviceType?: string;
  deviceId?: string;
  platform?: 'web' | 'android' | 'ios' | 'desktop';
}

export interface AdminWalletRequest {
  amount: number;
  type: 'credit' | 'debit';
  description: string;
}

export interface AdminLoyaltyRequest {
  points: number;
  type: 'earn' | 'redeem' | 'adjust';
  description: string;
}
