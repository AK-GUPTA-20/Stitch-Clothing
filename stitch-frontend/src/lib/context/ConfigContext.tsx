// src/lib/context/ConfigContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { configService } from '@/lib/api/configService';
import { PlatformSettings } from '@/lib/types/config.types';

interface ConfigState {
  settings: PlatformSettings | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const ConfigContext = createContext<ConfigState>({
  settings: null,
  isLoading: true,
  error: null,
  refresh: async () => {},
});

export const ConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await configService.getPublicSettings();
      setSettings(res.data ?? null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load configuration.';
      setError(message);
      // Don't block the app on config failure — use null settings as fallback
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return (
    <ConfigContext.Provider value={{ settings, isLoading, error, refresh: fetchConfig }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => useContext(ConfigContext);
