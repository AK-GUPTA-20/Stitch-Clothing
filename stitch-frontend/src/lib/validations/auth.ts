import * as z from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

export const phoneSchema = z.object({
  phone: z.string().min(1, 'Phone number is required').refine((val) => {
    try {
      const phoneNumber = parsePhoneNumberFromString(val);
      return phoneNumber ? phoneNumber.isValid() : false;
    } catch (e) {
      return false;
    }
  }, 'Invalid phone number format'),
});

export const otpSchema = z.object({
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d+$/, 'OTP must contain only numbers'),
});

export type PhoneFormValues = z.infer<typeof phoneSchema>;
export type OTPFormValues = z.infer<typeof otpSchema>;
