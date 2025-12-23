import { z } from 'zod';

const hexColorRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
export const themePresetOptions = ['classic', 'slate', 'sunset'] as const;
export type ThemePresetOption = (typeof themePresetOptions)[number];

const logoUrlSchema = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value ?? null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}, z.string().url('Logo URL must be a valid URL').max(500).nullable());

export const brandingResponseSchema = z.object({
  primaryColor: z.string().regex(hexColorRegex),
  logoUrl: logoUrlSchema,
  mode: z.enum(['light', 'dark']),
  themePreset: z.enum(themePresetOptions)
});

export type BrandingResponse = z.infer<typeof brandingResponseSchema>;

export const updateBrandingBodySchema = z.object({
  primaryColor: z.string().regex(hexColorRegex, 'Primary color must be a valid hex code'),
  logoUrl: logoUrlSchema.optional().default(null),
  mode: z.enum(['light', 'dark']).optional().default('light'),
  themePreset: z.enum(themePresetOptions).optional().default('classic')
});

export type UpdateBrandingBody = z.infer<typeof updateBrandingBodySchema>;
