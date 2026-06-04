// src/lib/api/configService.ts
import { apiClient } from './apiClient';
import {
  PlatformSettings,
  PaymentGateway,
  TaxSlab,
  EmailTemplate,
  LoyaltyRule,
  LoyaltyTier,
  Webhook,
  WebhookLog,
  AuditLog,
  ContentPage,
  FAQ,
  GenericConfig,
  ConfigResponse,
  ConfigListResponse,
} from '../types/config.types';

export const configService = {
  // ── Public ──────────────────────────────────────────────────────────────────
  getPublicSettings: () =>
    apiClient.get<ConfigResponse<PlatformSettings>>('/api/v1/configs/public'),

  getPublicConfigByKey: (key: string) =>
    apiClient.get<ConfigResponse<GenericConfig>>(`/api/v1/configs/public/${key}`),

  getPublicFAQs: (category?: string) =>
    apiClient.get<ConfigListResponse<FAQ>>(
      `/api/v1/configs/content/faqs${category ? `?category=${encodeURIComponent(category)}` : ''}`
    ),

  getContentBySlug: (slug: string) =>
    apiClient.get<ConfigResponse<ContentPage>>(`/api/v1/configs/content/slug/${slug}`),

  // ── Platform Settings ────────────────────────────────────────────────────────
  getPlatformSettings: () =>
    apiClient.get<ConfigResponse<PlatformSettings>>('/api/v1/configs/settings'),

  updateGeneralSettings: (data: Partial<PlatformSettings['general']>) =>
    apiClient.patch<ConfigResponse<PlatformSettings>>('/api/v1/configs/settings/general', data),

  toggleMaintenanceMode: (data: { maintenanceMode: boolean; maintenanceMessage?: string }) =>
    apiClient.patch<ConfigResponse<PlatformSettings>>('/api/v1/configs/settings/maintenance', data),

  updateShippingSettings: (data: Partial<PlatformSettings['shipping']>) =>
    apiClient.patch<ConfigResponse<PlatformSettings>>('/api/v1/configs/settings/shipping', data),

  updatePaymentSettings: (data: Partial<PlatformSettings['payment']>) =>
    apiClient.patch<ConfigResponse<PlatformSettings>>('/api/v1/configs/settings/payment', data),

  updateEmailSettings: (data: Partial<PlatformSettings['email']>) =>
    apiClient.patch<ConfigResponse<PlatformSettings>>('/api/v1/configs/settings/email', data),

  updateSmsSettings: (data: Partial<PlatformSettings['sms']>) =>
    apiClient.patch<ConfigResponse<PlatformSettings>>('/api/v1/configs/settings/sms', data),

  updateViewer3DSettings: (data: Partial<PlatformSettings['viewer3d']>) =>
    apiClient.patch<ConfigResponse<PlatformSettings>>('/api/v1/configs/settings/viewer3d', data),

  // ── Payment Gateways ────────────────────────────────────────────────────────
  getPaymentGateways: () =>
    apiClient.get<ConfigListResponse<PaymentGateway>>('/api/v1/configs/settings/payment/gateways'),

  addPaymentGateway: (data: Omit<PaymentGateway, '_id' | 'createdAt' | 'updatedAt'>) =>
    apiClient.post<ConfigResponse<PaymentGateway>>('/api/v1/configs/settings/payment/gateways', data),

  updatePaymentGateway: (gatewayId: string, data: Partial<PaymentGateway>) =>
    apiClient.put<ConfigResponse<PaymentGateway>>(
      `/api/v1/configs/settings/payment/gateways/${gatewayId}`,
      data
    ),

  setPrimaryGateway: (gatewayId: string) =>
    apiClient.patch<ConfigResponse<PaymentGateway>>(
      `/api/v1/configs/settings/payment/gateways/${gatewayId}/primary`,
      {}
    ),

  deletePaymentGateway: (gatewayId: string) =>
    apiClient.delete<{ success: boolean }>(`/api/v1/configs/settings/payment/gateways/${gatewayId}`),

  // ── Tax Settings & Slabs ────────────────────────────────────────────────────
  updateTaxSettings: (data: Partial<PlatformSettings['tax']>) =>
    apiClient.patch<ConfigResponse<PlatformSettings>>('/api/v1/configs/settings/tax', data),

  addTaxSlab: (data: Omit<TaxSlab, '_id' | 'createdAt'>) =>
    apiClient.post<ConfigResponse<TaxSlab>>('/api/v1/configs/settings/tax/slabs', data),

  updateTaxSlab: (slabId: string, data: Partial<TaxSlab>) =>
    apiClient.put<ConfigResponse<TaxSlab>>(`/api/v1/configs/settings/tax/slabs/${slabId}`, data),

  deleteTaxSlab: (slabId: string) =>
    apiClient.delete<{ success: boolean }>(`/api/v1/configs/settings/tax/slabs/${slabId}`),

  // ── Email Templates ─────────────────────────────────────────────────────────
  getEmailTemplates: (isActive?: boolean) =>
    apiClient.get<ConfigListResponse<EmailTemplate>>(
      `/api/v1/configs/settings/email/templates${isActive !== undefined ? `?isActive=${isActive}` : ''}`
    ),

  upsertEmailTemplate: (data: Partial<EmailTemplate>) =>
    apiClient.post<ConfigResponse<EmailTemplate>>('/api/v1/configs/settings/email/templates', data),

  toggleEmailTemplate: (templateId: string) =>
    apiClient.patch<ConfigResponse<EmailTemplate>>(
      `/api/v1/configs/settings/email/templates/${templateId}/toggle`,
      {}
    ),

  // ── Loyalty Settings, Rules & Tiers ─────────────────────────────────────────
  updateLoyaltySettings: (data: Partial<PlatformSettings['loyalty']>) =>
    apiClient.patch<ConfigResponse<PlatformSettings>>('/api/v1/configs/settings/loyalty', data),

  addLoyaltyRule: (data: Omit<LoyaltyRule, '_id' | 'createdAt'>) =>
    apiClient.post<ConfigResponse<LoyaltyRule>>('/api/v1/configs/settings/loyalty/rules', data),

  updateLoyaltyRule: (ruleId: string, data: Partial<LoyaltyRule>) =>
    apiClient.put<ConfigResponse<LoyaltyRule>>(
      `/api/v1/configs/settings/loyalty/rules/${ruleId}`,
      data
    ),

  deleteLoyaltyRule: (ruleId: string) =>
    apiClient.delete<{ success: boolean }>(`/api/v1/configs/settings/loyalty/rules/${ruleId}`),

  addLoyaltyTier: (data: Omit<LoyaltyTier, '_id' | 'createdAt'>) =>
    apiClient.post<ConfigResponse<LoyaltyTier>>('/api/v1/configs/settings/loyalty/tiers', data),

  updateLoyaltyTier: (tierId: string, data: Partial<LoyaltyTier>) =>
    apiClient.put<ConfigResponse<LoyaltyTier>>(
      `/api/v1/configs/settings/loyalty/tiers/${tierId}`,
      data
    ),

  // ── Webhooks ───────────────────────────────────────────────────────────────
  getWebhooks: (isActive?: boolean) =>
    apiClient.get<ConfigListResponse<Webhook>>(
      `/api/v1/configs/webhooks${isActive !== undefined ? `?isActive=${isActive}` : ''}`
    ),

  createWebhook: (data: Omit<Webhook, '_id' | 'lastTriggeredAt' | 'createdAt' | 'updatedAt'>) =>
    apiClient.post<ConfigResponse<Webhook>>('/api/v1/configs/webhooks', data),

  getWebhookById: (id: string) =>
    apiClient.get<ConfigResponse<Webhook>>(`/api/v1/configs/webhooks/${id}`),

  updateWebhook: (id: string, data: Partial<Webhook>) =>
    apiClient.put<ConfigResponse<Webhook>>(`/api/v1/configs/webhooks/${id}`, data),

  toggleWebhook: (id: string) =>
    apiClient.patch<ConfigResponse<Webhook>>(`/api/v1/configs/webhooks/${id}/toggle`, {}),

  deleteWebhook: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/api/v1/configs/webhooks/${id}`),

  getWebhookLogs: (id: string, query = '') =>
    apiClient.get<ConfigListResponse<WebhookLog>>(
      `/api/v1/configs/webhooks/${id}/logs${query ? `?${query}` : ''}`
    ),

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  getAuditLogs: (query = '') =>
    apiClient.get<ConfigListResponse<AuditLog>>(
      `/api/v1/configs/audit-logs${query ? `?${query}` : ''}`
    ),

  createAuditLog: (data: Omit<AuditLog, '_id' | 'createdAt'>) =>
    apiClient.post<ConfigResponse<AuditLog>>('/api/v1/configs/audit-logs', data),

  getAuditLogById: (id: string) =>
    apiClient.get<ConfigResponse<AuditLog>>(`/api/v1/configs/audit-logs/${id}`),

  // ── Content Pages ──────────────────────────────────────────────────────────
  getContentPages: (query = '') =>
    apiClient.get<ConfigListResponse<ContentPage>>(
      `/api/v1/configs/content${query ? `?${query}` : ''}`
    ),

  createContentPage: (data: Omit<ContentPage, '_id' | 'createdAt' | 'updatedAt'>) =>
    apiClient.post<ConfigResponse<ContentPage>>('/api/v1/configs/content', data),

  getContentPageById: (id: string) =>
    apiClient.get<ConfigResponse<ContentPage>>(`/api/v1/configs/content/${id}`),

  updateContentPage: (id: string, data: Partial<ContentPage>) =>
    apiClient.put<ConfigResponse<ContentPage>>(`/api/v1/configs/content/${id}`, data),

  toggleContentPage: (id: string) =>
    apiClient.patch<ConfigResponse<ContentPage>>(`/api/v1/configs/content/${id}/toggle`, {}),

  deleteContentPage: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/api/v1/configs/content/${id}`),

  // ── Generic Key-Value Configs ──────────────────────────────────────────────
  getAllConfigs: (query = '') =>
    apiClient.get<ConfigListResponse<GenericConfig>>(
      `/api/v1/configs${query ? `?${query}` : ''}`
    ),

  getConfigByKey: (key: string) =>
    apiClient.get<ConfigResponse<GenericConfig>>(`/api/v1/configs/key/${key}`),

  createConfig: (data: Omit<GenericConfig, '_id' | 'createdAt' | 'updatedAt'>) =>
    apiClient.post<ConfigResponse<GenericConfig>>('/api/v1/configs', data),

  updateConfigByKey: (key: string, data: Partial<GenericConfig>) =>
    apiClient.put<ConfigResponse<GenericConfig>>(`/api/v1/configs/key/${key}`, data),

  deleteConfigByKey: (key: string) =>
    apiClient.delete<{ success: boolean }>(`/api/v1/configs/key/${key}`),
};
