import { apiClient } from './apiClient';
import type { ThemePresetName } from '../theme/presets';

export type ThemeMode = 'light' | 'dark';

export interface BrandingSettings {
  primaryColor: string;
  logoUrl: string | null;
  mode: ThemeMode;
  themePreset: ThemePresetName;
}

export interface UpdateBrandingPayload {
  primaryColor: string;
  logoUrl: string | null;
  mode?: ThemeMode;
  themePreset?: ThemePresetName;
}

const BRANDING_PATH = '/company/branding';

export const fetchBrandingSettings = () => apiClient.get<BrandingSettings>(BRANDING_PATH);

export const updateBrandingSettings = (payload: UpdateBrandingPayload) =>
  apiClient.put<BrandingSettings>(BRANDING_PATH, payload);
