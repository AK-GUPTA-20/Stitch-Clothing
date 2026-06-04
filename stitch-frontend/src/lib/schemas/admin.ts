import { z } from 'zod';

export const taxSettingSchema = z.object({
  name: z.string().min(2, 'Tax name required'),
  rate: z.number().min(0).max(100, 'Tax rate must be between 0 and 100'),
  country: z.string().min(2),
  isActive: z.boolean().default(true),
});

export const shippingZoneSchema = z.object({
  name: z.string().min(2, 'Zone name required'),
  countries: z.array(z.string()).min(1, 'Select at least one country'),
  baseRate: z.number().min(0, 'Must be 0 or greater'),
  freeShippingThreshold: z.number().min(0).optional(),
});

export const webhookSchema = z.object({
  name: z.string().min(2, 'Name required'),
  url: z.string().url('Must be a valid URL'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
  secret: z.string().min(8, 'Secret must be at least 8 characters').optional(),
  isActive: z.boolean().default(true),
});

export type TaxSettingFormData = z.infer<typeof taxSettingSchema>;
export type ShippingZoneFormData = z.infer<typeof shippingZoneSchema>;
export type WebhookFormData = z.infer<typeof webhookSchema>;
