import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import {
  BrandingSettings,
  fetchBrandingSettings
} from '../lib/companyBrandingApi';
import { themePresets, THEME_PRESET_NAMES, type ThemePresetName } from './presets';
import { useAuth } from '../features/auth/hooks/useAuth';

const STORAGE_KEY = 'siteTrackr.themePreferences';
const DEFAULT_THEME_PRESET: ThemePresetName = THEME_PRESET_NAMES[0];

const DEFAULT_BRANDING: BrandingSettings = {
  primaryColor: '#0f766e',
  logoUrl: null,
  mode: 'light',
  themePreset: DEFAULT_THEME_PRESET
};

interface ThemeContextValue {
  branding: BrandingSettings;
  setBranding: (settings: BrandingSettings) => void;
  refreshBranding: () => Promise<BrandingSettings>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const isThemePreset = (value: unknown): value is ThemePresetName =>
  typeof value === 'string' && (THEME_PRESET_NAMES as readonly string[]).includes(value);

const readStoredBranding = (): BrandingSettings => {
  if (typeof window === 'undefined') {
    return DEFAULT_BRANDING;
  }

  const cached = window.localStorage.getItem(STORAGE_KEY);
  if (!cached) {
    return DEFAULT_BRANDING;
  }

  try {
    const parsed = JSON.parse(cached) as BrandingSettings;
    return {
      primaryColor: parsed.primaryColor ?? DEFAULT_BRANDING.primaryColor,
      logoUrl: parsed.logoUrl ?? null,
      mode: parsed.mode === 'dark' ? 'dark' : 'light',
      themePreset: isThemePreset(parsed.themePreset) ? parsed.themePreset : DEFAULT_THEME_PRESET
    };
  } catch (error) {
    console.warn('Failed to parse stored branding preferences', error);
    return DEFAULT_BRANDING;
  }
};

const getContrastColor = (hex: string): string => {
  const value = hex.replace('#', '');
  const normalized = value.length === 3
    ? value.split('').map((char) => char + char).join('')
    : value.padStart(6, '0');

  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? '#0f172a' : '#ffffff';
};

const applyBrandingTokens = (branding: BrandingSettings) => {
  if (typeof document === 'undefined') {
    return;
  }
  const root = document.documentElement;
  root.dataset.theme = branding.mode;
  root.style.setProperty('--color-primary', branding.primaryColor);
  root.style.setProperty('--color-primary-contrast', getContrastColor(branding.primaryColor));

  const preset = themePresets[branding.themePreset] ?? themePresets[DEFAULT_THEME_PRESET];
  const tokens = preset.tokens[branding.mode];
  root.style.setProperty('--color-bg', tokens.bg);
  root.style.setProperty('--color-surface', tokens.surface);
  root.style.setProperty('--color-text', tokens.text);
  root.style.setProperty('--color-muted', tokens.muted);
  root.style.setProperty('--color-border', tokens.border);
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [branding, setBrandingState] = useState<BrandingSettings>(() => readStoredBranding());
  const brandingRef = useRef(branding);

  useEffect(() => {
    brandingRef.current = branding;
  }, [branding]);

  // Apply CSS variables whenever branding changes
  useEffect(() => {
    applyBrandingTokens(branding);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
    }
  }, [branding]);

  const setBranding = useCallback((settings: BrandingSettings) => {
    setBrandingState(settings);
  }, []);

  const refreshBranding = useCallback(async (): Promise<BrandingSettings> => {
    if (!isAuthenticated) {
      return brandingRef.current;
    }

    try {
      const remote = await fetchBrandingSettings();
      setBrandingState(remote);
      return remote;
    } catch (error) {
      console.warn('Failed to load branding settings', error);
      return brandingRef.current;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void refreshBranding();
    }
  }, [isAuthenticated, refreshBranding]);

  const value = useMemo<ThemeContextValue>(
    () => ({ branding, setBranding, refreshBranding }),
    [branding, setBranding, refreshBranding]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
