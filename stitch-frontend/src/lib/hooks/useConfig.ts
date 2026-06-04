/**
 * src/lib/hooks/useConfig.ts
 *
 * Lightweight data-fetching hooks for Config APIs.
 * These wrap configService calls with React state management,
 * providing a consistent { data, isLoading, error, refresh } interface
 * without requiring a full TanStack Query installation.
 */

import { useState, useEffect, useCallback } from 'react';
import { configService } from '@/lib/api/configService';
import type { AuditLog } from '@/lib/types/config.types';

// ── Generic hook factory ────────────────────────────────────────────────────

interface HookState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

function useAsyncData<T>(
  fetcher: () => Promise<{ data?: T } | T>,
  extractData?: (res: any) => T,
  deps: any[] = []
): HookState<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      const extracted = extractData ? extractData(res) : (res as any)?.data ?? res;
      setData(extracted);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refresh: fetch };
}

// ── Public Settings ──────────────────────────────────────────────────────────

/**
 * Fetches all public platform settings.
 * Suitable for use in public-facing components and pages.
 */
export function usePublicSettings() {
  return useAsyncData(
    () => configService.getPublicSettings(),
    (res) => res?.data ?? null
  );
}

/**
 * Fetches a single public config value by key.
 */
export function usePublicConfig(key: string) {
  return useAsyncData(
    () => configService.getPublicConfigByKey(key),
    (res) => res?.data ?? null,
    [key]
  );
}

// ── Platform Settings (Admin) ────────────────────────────────────────────────

/**
 * Fetches all platform settings for admin pages.
 * Requires admin authentication.
 */
export function usePlatformSettings() {
  return useAsyncData(
    () => configService.getPlatformSettings(),
    (res) => res?.data ?? null
  );
}

// ── Content Pages & FAQs ─────────────────────────────────────────────────────

/**
 * Fetches a CMS page by its URL slug for public rendering.
 */
export function useContentPage(slug: string | undefined) {
  return useAsyncData(
    () => {
      if (!slug) return Promise.resolve(null);
      return configService.getContentBySlug(slug);
    },
    (res) => res?.data ?? res ?? null,
    [slug]
  );
}

/**
 * Fetches public FAQ items, optionally filtered by category.
 */
export function usePublicFAQs(category?: string) {
  return useAsyncData(
    () => configService.getPublicFAQs(category),
    (res) => {
      // Backend may return { data: [] } or an array directly
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      return [];
    },
    [category]
  );
}

// ── Content Pages (Admin) ────────────────────────────────────────────────────

/**
 * Fetches all content pages with optional query string.
 * Admin use only.
 */
export function useContentPages(query: string = '') {
  return useAsyncData(
    () => configService.getContentPages(query),
    (res) => res?.data ?? [],
    [query]
  );
}

// ── Payment Gateways (Admin) ─────────────────────────────────────────────────

/**
 * Fetches all payment gateways.
 */
export function usePaymentGateways() {
  return useAsyncData(
    () => configService.getPaymentGateways(),
    (res) => res?.data ?? []
  );
}

// ── Email Templates (Admin) ──────────────────────────────────────────────────

/**
 * Fetches email templates, optionally filtered by active status.
 */
export function useEmailTemplates(isActive?: boolean) {
  return useAsyncData(
    () => configService.getEmailTemplates(isActive),
    (res) => res?.data ?? [],
    [isActive]
  );
}

// ── Webhooks (Admin) ─────────────────────────────────────────────────────────

/**
 * Fetches all webhooks.
 */
export function useWebhooks(isActive?: boolean) {
  return useAsyncData(
    () => configService.getWebhooks(isActive),
    (res) => res?.data ?? [],
    [isActive]
  );
}

/**
 * Fetches delivery logs for a specific webhook.
 */
export function useWebhookLogs(webhookId: string, query: string = '') {
  return useAsyncData(
    () => {
      if (!webhookId) return Promise.resolve(null);
      return configService.getWebhookLogs(webhookId, query);
    },
    (res) => res ?? null,
    [webhookId, query]
  );
}

// ── Audit Logs (Admin) ───────────────────────────────────────────────────────

interface AuditLogsData {
  logs: AuditLog[];
  total: number;
  pages: number;
}

/**
 * Fetches paginated audit logs with optional query parameters.
 */
export function useAuditLogs(query: string = '') {
  return useAsyncData<AuditLogsData>(
    () => configService.getAuditLogs(query) as any,
    (res) => ({
      logs: (res?.data ?? []) as AuditLog[],
      total: res?.total ?? 0,
      pages: res?.pages ?? 1,
    }),
    [query]
  );
}

// ── Generic Configs (Admin) ──────────────────────────────────────────────────

/**
 * Fetches all generic key-value configs with optional query parameters.
 */
export function useGenericConfigs(query: string = '') {
  return useAsyncData(
    () => configService.getAllConfigs(query),
    (res) => res?.data ?? [],
    [query]
  );
}

/**
 * Fetches a single config by key.
 */
export function useConfigByKey(key: string) {
  return useAsyncData(
    () => {
      if (!key) return Promise.resolve(null);
      return configService.getConfigByKey(key);
    },
    (res) => res?.data ?? null,
    [key]
  );
}
