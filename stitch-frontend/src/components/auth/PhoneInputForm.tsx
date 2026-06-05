'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ConfirmationResult, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { setupRecaptcha, clearRecaptcha } from '@/lib/firebase/recaptcha';
import { phoneSchema, type PhoneFormValues } from "@/lib/schemas/auth";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface PhoneInputFormProps {
  onSuccess: (confirmationResult: ConfirmationResult, phoneNumber: string) => void;
}

export const PhoneInputForm = ({ onSuccess }: PhoneInputFormProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, formState: { errors, isValid } } = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    mode: 'onChange',
  });

  useEffect(() => {
    // Setup recaptcha on mount
    setupRecaptcha('recaptcha-container');
    return () => {
      // Cleanup recaptcha on unmount if needed, though invisible recaptcha 
      // is usually kept as singleton to avoid double rendering issues
      // clearRecaptcha(); 
    };
  }, []);

  const onSubmit = (data: PhoneFormValues) => {
    setError(null);
    startTransition(async () => {
      try {
        const appVerifier = setupRecaptcha('recaptcha-container');
        if (!appVerifier) throw new Error('reCAPTCHA not initialized');

        // Note: Make sure the phone number includes the country code. 
        // For production, you'd likely use a robust country code selector.
        // Here we assume the user types the full number e.g. +1234567890
        let formattedPhone = data.phone;
        if (!formattedPhone.startsWith('+')) {
          formattedPhone = `+${formattedPhone}`; 
        }

        const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        onSuccess(confirmationResult, formattedPhone);
      } catch (err: any) {
        console.error('Phone Sign-In Error:', err);
        setError(err.message || 'Failed to send OTP. Please try again.');
        // Reset recaptcha if failed
        clearRecaptcha();
        setupRecaptcha('recaptcha-container');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number (with Country Code)</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="+1 234 567 8900"
          {...register('phone')}
          disabled={isPending}
        />
        {errors.phone && (
          <p className="text-sm text-red-500">{errors.phone.message}</p>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container"></div>

      <Button type="submit" className="w-full" disabled={!isValid || isPending}>
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {isPending ? 'Sending OTP...' : 'Send OTP'}
      </Button>
    </form>
  );
};
