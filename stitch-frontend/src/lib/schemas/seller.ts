import { z } from 'zod';

// Indian phone: 10 digits, optionally starting with +91 or 0
const phoneRegex = /^(?:\+91|0)?[6-9]\d{9}$/;
// IFSC: 4 alpha + 0 + 6 alphanumeric
const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
// GST: 15 char alphanumeric standard format
const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
// Indian postal code: 6 digits
const postalCodeRegex = /^[1-9][0-9]{5}$/;
// Account number: 9-18 digits
const accountNumberRegex = /^[0-9]{9,18}$/;

export const addressSchema = z.object({
  street: z.string().min(3, 'Street must be at least 3 characters').max(200),
  city: z.string().min(2, 'City must be at least 2 characters').max(100),
  state: z.string().min(2, 'State must be at least 2 characters').max(100),
  postalCode: z.string().regex(postalCodeRegex, 'Enter a valid 6-digit postal code'),
  country: z.string().min(2, 'Country is required').max(100),
});

export const businessInfoSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(150, 'Max 150 characters'),
  legalEntityName: z.string().max(150).optional().or(z.literal('')),
  taxId: z.string().min(1, 'Tax ID / GST is required').max(20),
  phone: z.string().regex(phoneRegex, 'Enter a valid 10-digit Indian mobile number'),
  address: addressSchema,
});

export const storeInfoSchema = z.object({
  description: z.string().max(1000, 'Max 1000 characters').optional(),
  logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  coverUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export const shippingSettingsSchema = z.object({
  shippingMethods: z
    .array(z.enum(['standard', 'express', 'same_day', 'pickup']))
    .min(1, 'Select at least one shipping method'),
  freeShippingThreshold: z.number().min(0, 'Must be 0 or more').optional(),
  defaultHandlingDays: z.number().min(0).max(30).optional(),
  selfShipping: z.boolean().optional(),
});

export const notificationPreferencesSchema = z.object({
  email: z.boolean(),
  sms: z.boolean(),
  push: z.boolean(),
  newOrder: z.boolean().optional(),
  orderStatusChange: z.boolean().optional(),
  payoutProcessed: z.boolean().optional(),
  productApproved: z.boolean().optional(),
  productRejected: z.boolean().optional(),
  lowStock: z.boolean().optional(),
  reviewReceived: z.boolean().optional(),
});

export const payoutSettingsSchema = z.object({
  schedule: z.enum(['daily', 'weekly', 'monthly']),
  minimumAmount: z.number().min(100, 'Minimum payout amount is ₹100'),
});

export const bankDetailsSchema = z
  .object({
    accountName: z.string().min(1, 'Account holder name is required'),
    accountNumber: z
      .string()
      .min(9, 'Account number must be at least 9 digits')
      .max(18, 'Account number must be at most 18 digits')
      .regex(/^\d+$/, 'Account number must contain only digits'),
    confirmAccountNumber: z.string().min(1, 'Please confirm your account number'),
    ifscCode: z
      .string()
      .min(1, 'IFSC code is required')
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format (e.g. HDFC0001234)'),
    bankName: z.string().min(1, 'Bank name is required'),
    branch: z.string().optional(),
    accountType: z.enum(['savings', 'current', 'salary'], {
      error: 'Please select an account type',
    }),
  })
  .refine((data) => data.accountNumber === data.confirmAccountNumber, {
    message: 'Account numbers do not match',
  });

export const warehouseSchema = z.object({
  name: z.string().min(2, 'Warehouse name must be at least 2 characters').max(100),
  address: addressSchema,
  isDefault: z.boolean().default(false),
});

export const kycDocumentSchema = z.object({
  type: z.enum([
    'id_proof',
    'address_proof',
    'business_registration',
    'tax_document',
    'bank_statement',
    'gst_certificate',
  ]),
  file: z.any(),
});

export type BusinessInfo = z.infer<typeof businessInfoSchema>;
export type StoreInfo = z.infer<typeof storeInfoSchema>;
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type PayoutSettings = z.infer<typeof payoutSettingsSchema>;
export type BankDetails = z.infer<typeof bankDetailsSchema>;
export type Warehouse = z.infer<typeof warehouseSchema>;
export type KYCDocument = z.infer<typeof kycDocumentSchema>;
