import { z } from 'zod';

const phoneRegex = /^(?:\+91|0)?[6-9]\d{9}$/;
const postalCodeRegex = /^[1-9][0-9]{5}$/;

export const addressSchema = z.object({
  fullName: z.string().min(2, 'Name is required').max(100),
  phone: z.string().regex(phoneRegex, 'Enter a valid 10-digit mobile number'),
  street: z.string().min(3, 'Street address is required').max(200),
  city: z.string().min(2, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(100),
  postalCode: z.string().regex(postalCodeRegex, 'Enter a valid 6-digit postal code'),
  country: z.string().default('IN'),
  isDefault: z.boolean().optional(),
});

export const checkoutSchema = z.object({
  shippingAddress: addressSchema,
  billingAddress: addressSchema.optional(),
  useSameForBilling: z.boolean().default(true),
  paymentMethod: z.enum(['razorpay', 'cod', 'wallet']),
  couponCode: z.string().optional(),
  useWalletBalance: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

export type AddressFormData = z.infer<typeof addressSchema>;
export type CheckoutFormData = z.infer<typeof checkoutSchema>;
