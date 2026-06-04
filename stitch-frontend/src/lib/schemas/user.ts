import { z } from 'zod';

const phoneRegex = /^(?:\+91|0)?[6-9]\d{9}$/;
const postalCodeRegex = /^[1-9][0-9]{5}$/;
const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

/** Full password complexity: 8+ chars, uppercase, lowercase, number */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const profileSchema = z.object({
  firstName: z.string().min(2, 'First name is required').max(50),
  lastName: z.string().min(2, 'Last name is required').max(50),
  phone: z.string().regex(phoneRegex, 'Enter a valid 10-digit mobile number').optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say', '']).optional(),
  dob: z.string().optional(),
  preferredLanguage: z.string().optional(),
  preferredCurrency: z.string().optional(),
});

export const measurementsSchema = z.object({
  // ✅ z.coerce.number() converts string inputs from HTML <input type="number">
  // to numbers and rejects non-numeric strings properly
  height: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).optional(),
  chest: z.coerce.number().min(0).optional(),
  waist: z.coerce.number().min(0).optional(),
  hips: z.coerce.number().min(0).optional(),
  inseam: z.coerce.number().min(0).optional(),
  shoulder: z.coerce.number().min(0).optional(),
  neck: z.coerce.number().min(0).optional(),
  sleeve: z.coerce.number().min(0).optional(),
  unit: z.enum(['cm', 'in']).default('cm'),
});

export const addressSchema = z.object({
  label: z.string().max(50).optional(),
  type: z.enum(['shipping', 'billing', 'pickup', 'both']).default('shipping'),
  recipientName: z.string().min(2, 'Recipient name is required').max(100),
  country: z.string().default('IN'),
  line1: z.string().min(3, 'Address Line 1 is required').max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(2, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(100),
  postalCode: z.string().regex(postalCodeRegex, 'Enter a valid 6-digit postal code').optional().or(z.literal('')),
  district: z.string().max(100).optional(),
  landmark: z.string().max(100).optional(),
  phone: z.string().regex(phoneRegex, 'Enter a valid 10-digit mobile number').optional().or(z.literal('')),
  alternatePhone: z.string().regex(phoneRegex, 'Enter a valid 10-digit mobile number').optional().or(z.literal('')),
  gstin: z.string().regex(gstinRegex, 'Enter a valid GSTIN').optional().or(z.literal('')),
  isDefault: z.boolean().default(false),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  // ✅ Full complexity enforced — same rules as registration
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Confirm new password'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

export type ProfileFormData = z.infer<typeof profileSchema>;
export type MeasurementsFormData = z.infer<typeof measurementsSchema>;
export type AddressFormData = z.infer<typeof addressSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
