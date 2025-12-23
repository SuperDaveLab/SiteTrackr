export const THEME_PRESET_NAMES = ['classic', 'slate', 'sunset'] as const;
export type ThemePresetName = (typeof THEME_PRESET_NAMES)[number];

export interface ThemePresetTokens {
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
}

interface ThemePresetDefinition {
  label: string;
  description: string;
  tokens: {
    light: ThemePresetTokens;
    dark: ThemePresetTokens;
  };
}

export const themePresets: Record<ThemePresetName, ThemePresetDefinition> = {
  classic: {
    label: 'Classic Emerald',
    description: 'Clean surfaces with teal accents',
    tokens: {
      light: {
        bg: '#f1f5f9',
        surface: '#ffffff',
        text: '#0f172a',
        muted: '#475467',
        border: '#d0d5dd'
      },
      dark: {
        bg: '#050816',
        surface: '#0f172a',
        text: '#f8fafc',
        muted: '#cbd5f5',
        border: '#1f2a3d'
      }
    }
  },
  slate: {
    label: 'Midnight Slate',
    description: 'Deep blues with crisp typography',
    tokens: {
      light: {
        bg: '#eef2ff',
        surface: '#ffffff',
        text: '#111827',
        muted: '#4b5563',
        border: '#c7d2fe'
      },
      dark: {
        bg: '#0b1220',
        surface: '#141b2d',
        text: '#f4f6ff',
        muted: '#9ca3af',
        border: '#1f2a44'
      }
    }
  },
  sunset: {
    label: 'Sunset Sand',
    description: 'Warm neutrals with subtle depth',
    tokens: {
      light: {
        bg: '#fff7ed',
        surface: '#fffbf5',
        text: '#3b2c21',
        muted: '#7c5f48',
        border: '#f5d3b4'
      },
      dark: {
        bg: '#2b1c1a',
        surface: '#3b241f',
        text: '#ffedd5',
        muted: '#fecba1',
        border: '#5c3227'
      }
    }
  }
};
