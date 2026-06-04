'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ConfirmationResult } from 'firebase/auth';
import { otpSchema, OTPFormValues } from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface OTPVerificationFormProps {
  confirmationResult: ConfirmationResult;
  phoneNumber: string;
  onResend: () => void;
  onVerified?: () => void;
}

export const OTPVerificationForm = ({ confirmationResult, phoneNumber, onResend, onVerified }: OTPVerificationFormProps) => {
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { handleSubmit, setValue, watch } = useForm<OTPFormValues>({
    resolver: zodResolver(otpSchema),
    mode: 'onChange',
    defaultValues: { otp: '' }
  });

  const otpValue = watch('otp');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Auto-submit when 6 digits are entered
  useEffect(() => {
    if (otpValue && otpValue.length === 6) {
      onSubmit({ otp: otpValue });
    }
  }, [otpValue]);

  const onSubmit = (data: OTPFormValues) => {
    setError(null);
    startTransition(async () => {
      try {
        const credential = await confirmationResult.confirm(data.otp);
        // Successfully authenticated!
        if (onVerified) {
          onVerified();
        } else {
          router.push('/profile');
        }
      } catch (err: any) {
        console.error('OTP Verification Error:', err);
        setError('Invalid OTP. Please try again.');
      }
    });
  };

  const handleResend = () => {
    setCountdown(60);
    setError(null);
    onResend();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex flex-col items-center">
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit code sent to <span className="font-medium text-foreground">{phoneNumber}</span>
        </p>
      </div>

      <InputOTP
        maxLength={6}
        value={otpValue}
        onChange={(val) => setValue('otp', val, { shouldValidate: true })}
        disabled={isPending}
      >
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>

      {error && (
        <Alert variant="destructive" className="w-full">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2 w-full">
        <Button type="submit" className="w-full" disabled={otpValue?.length !== 6 || isPending}>
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {isPending ? 'Verifying...' : 'Verify OTP'}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={countdown > 0 || isPending}
          onClick={handleResend}
        >
          {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
        </Button>
      </div>
    </form>
  );
};
