'use client';

import React, { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function OtpInput({ length = 6, value, onChange, disabled = false }: OtpInputProps) {
  const [activeInput, setActiveInput] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value;
    if (!/^[0-9A-Za-z]?$/.test(val)) return;

    const newValue = value.split('');
    newValue[index] = val;
    const newStringValue = newValue.join('');
    
    onChange(newStringValue);

    if (val !== '') {
      focusNextInput(index);
    }
  };

  const handleOnKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newValue = value.split('');
      
      if (newValue[index]) {
        // Clear current input
        newValue[index] = '';
        onChange(newValue.join(''));
      } else {
        // Move to previous and clear it
        if (index > 0) {
          newValue[index - 1] = '';
          onChange(newValue.join(''));
          focusPrevInput(index);
        }
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      focusPrevInput(index);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      focusNextInput(index);
    }
  };

  const handleOnPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, length);
    // Remove spaces and special chars if needed, but we'll accept alphanumeric for now
    const sanitized = pastedData.replace(/[^0-9A-Za-z]/g, '').slice(0, length);
    
    if (sanitized) {
      onChange(sanitized);
      // Focus the next empty input or the last one
      const nextIndex = Math.min(sanitized.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      setActiveInput(nextIndex);
    }
  };

  const focusNextInput = (index: number) => {
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setActiveInput(index + 1);
    }
  };

  const focusPrevInput = (index: number) => {
    if (index > 0) {
      inputRefs.current[index - 1]?.focus();
      setActiveInput(index - 1);
    }
  };

  return (
    <div className="flex justify-between gap-2 sm:gap-3">
      {Array.from({ length }, (_, i) => {
        const val = value[i] || '';
        return (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="text"
            maxLength={1}
            disabled={disabled}
            value={val}
            onChange={(e) => handleOnChange(e, i)}
            onKeyDown={(e) => handleOnKeyDown(e, i)}
            onPaste={handleOnPaste}
            onFocus={() => setActiveInput(i)}
            className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold font-sans uppercase rounded-md border transition-all focus:outline-none ${
              activeInput === i 
                ? 'border-stone-900 ring-2 ring-stone-900/20' 
                : val 
                  ? 'border-stone-500 bg-stone-50' 
                  : 'border-stone-300 bg-white'
            } ${disabled ? 'opacity-50 cursor-not-allowed bg-stone-100' : ''}`}
          />
        );
      })}
    </div>
  );
}
