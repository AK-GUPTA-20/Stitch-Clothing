// src/lib/types/config.types.ts
// Typed interfaces for all Config/Settings API responses.
// Replaces `any` usage throughout configService.ts and ConfigContext.tsx.

// ── General Settings ──────────────────────────────────────────────────────────

export interface GeneralSettings {
  platformName?: string;
  platformTagline?: string;
  logoUrl?: string;
  faviconUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  address?: string;
  currency?: string;
  timezone?: string;
  dateFormat?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;
  allowGuestCheckout?: boolean;
  allowSellerRegistration?: boolean;
  minOrderAmount?: number;
}

export interface ShippingSettings {
  freeShippingThreshold?: number;
  /** Alias for freeShippingThreshold used in CartDrawer */
  freeShippingAbove?: number;
  defaultShippingCharge?: number;
  codCharge?: number;
  codEnabled?: boolean;
  maxOrderWeight?: number;
  allowedCountries?: string[];
  defaultCourier?: string;
  packagingCharge?: number;
  expressAvailable?: boolean;
  expressCharge?: number;
}

export interface PaymentSettings {
  razorpayEnabled?: boolean;
  stripeEnabled?: boolean;
  codEnabled?: boolean;
  walletEnabled?: boolean;
  loyaltyEnabled?: boolean;
  minOrderForWallet?: number;
  maxWalletUsagePercent?: number;
  codMaxOrderValue?: number;
  emiEnabled?: boolean;
  autoRefundEnabled?: boolean;
  autoRefundDays?: number;
}

export interface EmailSettings {
  provider?: 'smtp' | 'sendgrid' | 'mailgun' | 'ses';
  fromEmail?: string;
  fromName?: string;
  replyTo?: string;
}

export interface SmsSettings {
  provider?: 'twilio' | 'msg91' | 'vonage' | string;
  senderId?: string;
  fromNumber?: string; // alias for senderId
  enabled?: boolean;
  otpEnabled?: boolean; // alias for enabled
  isActive?: boolean; // alias
  accountSid?: string;
  authToken?: string;
  orderConfirmationEnabled?: boolean;
  orderShippedEnabled?: boolean;
  orderDeliveredEnabled?: boolean;
  marketingEnabled?: boolean;
}

export interface Viewer3DSettings {
  enabled?: boolean;
  defaultBackground?: string;
  autoRotate?: boolean;
  maxFileSize?: number;
  maxFileSizeMb?: number; // alias
  defaultModelFormat?: string;
  showWireframe?: boolean;
  enableAR?: boolean;
  allowedFormats?: string[];
  watermarkEnabled?: boolean;
  watermarkText?: string;
  bgColor?: string;
  shadowEnabled?: boolean;
  exposureLevel?: number;
}

export interface LoyaltySettings {
  enabled?: boolean;
  pointsPerRupee?: number;
  rupeesPerPoint?: number;
  minRedeemPoints?: number;
  maxRedeemPercentage?: number;
  expiryDays?: number;
  pointsExpiryDays?: number; // alias
  pointsValue?: number; // alias
  maxRedemptionPercent?: number; // alias
  referralBonusBuyer?: number;
  referralBonusReferrer?: number;
  rules?: LoyaltyRule[];
  tiers?: LoyaltyTier[];
}

export interface TaxSettings {
  taxEnabled?: boolean;
  taxIncludedInPrice?: boolean;
  defaultTaxRate?: number;
  country?: string;
  gstEnabled?: boolean; // alias
  taxIncluded?: boolean; // alias
  slabs?: TaxSlab[];
}

export interface PlatformSettings {
  general?: GeneralSettings;
  shipping?: ShippingSettings;
  payment?: PaymentSettings;
  email?: EmailSettings;
  sms?: SmsSettings;
  viewer3d?: Viewer3DSettings;
  viewer3D?: Viewer3DSettings; // alias
  loyalty?: LoyaltySettings;
  tax?: TaxSettings;
}

// ── Payment Gateways ──────────────────────────────────────────────────────────

export interface PaymentGateway {
  _id: string;
  name: string;
  provider: 'razorpay' | 'stripe' | 'paypal' | 'payu';
  isPrimary?: boolean;
  isActive?: boolean;
  keyId?: string;
  currency?: string;
  webhookUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ── Tax Slabs ────────────────────────────────────────────────────────────────

export interface TaxSlab {
  _id: string;
  name?: string;
  label?: string; // alias
  rate?: number;
  country?: string;
  isDefault?: boolean;
  hsnCode?: string;
  minAmount?: number;
  maxAmount?: number;
  isActive?: boolean;
  createdAt?: string;
}

// ── Email Templates ───────────────────────────────────────────────────────────

export interface EmailTemplate {
  _id?: string;
  key?: string;
  name?: string;
  subject?: string;
  body?: string;
  htmlBody?: string;
  textBody?: string;
  variables?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ── Loyalty Rules & Tiers ─────────────────────────────────────────────────────

export interface LoyaltyRule {
  _id: string;
  name?: string;
  event?: string;
  action?: string; // alias
  points?: number;
  pointsPerUnit?: number; // alias
  maxPointsPerDay?: number; // alias
  isActive?: boolean;
  createdAt?: string;
}

export interface LoyaltyTier {
  _id: string;
  name: string;
  minPoints: number;
  maxPoints?: number;
  benefits?: string[];
  discountPercent?: number;
  createdAt?: string;
}

// ── Webhooks ─────────────────────────────────────────────────────────────────

export interface Webhook {
  _id: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  isActive?: boolean;
  lastTriggeredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface WebhookLog {
  _id: string;
  webhookId: string;
  event: string;
  status: 'success' | 'failed';
  statusCode?: number;
  responseBody?: string;
  attemptedAt: string;
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

export interface AuditLog {
  _id: string;
  action: string;
  entity?: string;
  entityId?: string;
  performedBy?: string;
  performedByRole?: string;
  ipAddress?: string;
  changes?: Record<string, unknown>;
  createdAt: string;
}

// ── Content Pages ─────────────────────────────────────────────────────────────

export interface ContentPage {
  _id: string;
  title: string;
  slug: string;
  body?: string;
  isActive?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FAQ {
  _id: string;
  question: string;
  answer: string;
  category?: string;
  position?: number;
  isActive?: boolean;
}

// ── Generic Config ────────────────────────────────────────────────────────────

export interface GenericConfig {
  _id: string;
  key: string;
  value: unknown;
  description?: string;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// ── API Response Wrappers ─────────────────────────────────────────────────────

export interface ConfigResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ConfigListResponse<T> {
  success: boolean;
  data: T[];
  total?: number;
  pages?: number;
  message?: string;
}
