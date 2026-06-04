import { RecaptchaVerifier } from 'firebase/auth';
import { auth } from './client';

let recaptchaVerifier: RecaptchaVerifier | null = null;

export const setupRecaptcha = (containerId: string) => {
  if (typeof window === 'undefined') return null;
  
  if (!recaptchaVerifier) {
    try {
      recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: (response: any) => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          // Response expired. Ask user to solve reCAPTCHA again.
          recaptchaVerifier?.clear();
          recaptchaVerifier = null;
        }
      });
    } catch (error) {
      console.error('Error initializing reCAPTCHA', error);
      return null;
    }
  }
  return recaptchaVerifier;
};

export const clearRecaptcha = () => {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear();
    recaptchaVerifier = null;
  }
};
