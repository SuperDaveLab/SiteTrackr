import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma } from '@prisma/client';
import {
  BrandingResponse,
  brandingResponseSchema,
  UpdateBrandingBody,
  themePresetOptions,
  updateBrandingBodySchema
} from './company.schemas';

const DEFAULT_THEME_PRESET = themePresetOptions[0];

const DEFAULT_BRANDING: BrandingResponse = {
  primaryColor: '#0f766e',
  logoUrl: null,
  mode: 'light',
  themePreset: DEFAULT_THEME_PRESET
};

const hexColorRegex = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

type GetBrandingRequest = FastifyRequest;
type UpdateBrandingRequest = FastifyRequest<{ Body: UpdateBrandingBody }>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isThemePreset = (value: unknown): value is (typeof themePresetOptions)[number] =>
  typeof value === 'string' && (themePresetOptions as readonly string[]).includes(value);

export class CompanyController {
  constructor(private readonly fastify: FastifyInstance) {}

  private normalizeBranding(value: Prisma.JsonValue | null | undefined): BrandingResponse {
    if (!isRecord(value)) {
      return DEFAULT_BRANDING;
    }

    const primaryColor = typeof value.primaryColor === 'string' && hexColorRegex.test(value.primaryColor)
      ? value.primaryColor
      : DEFAULT_BRANDING.primaryColor;

    const logoUrl = typeof value.logoUrl === 'string' && value.logoUrl.trim().length > 0
      ? value.logoUrl.trim()
      : null;

    const mode = value.mode === 'dark' ? 'dark' : 'light';
    const themePreset = isThemePreset(value.themePreset) ? value.themePreset : DEFAULT_THEME_PRESET;

    return brandingResponseSchema.parse({ primaryColor, logoUrl, mode, themePreset });
  }

  getBranding = async (request: GetBrandingRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const company = await this.fastify.prisma.company.findUnique({
      where: { id: user.companyId },
      select: { branding: true }
    });

    const branding = this.normalizeBranding(company?.branding ?? null);
    await reply.send(branding);
  };

  updateBranding = async (request: UpdateBrandingRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user) {
      await reply.status(401).send({ message: 'Unauthorized' });
      return;
    }

    const payload = updateBrandingBodySchema.parse(request.body ?? {});
    const branding: BrandingResponse = {
      primaryColor: payload.primaryColor,
      logoUrl: payload.logoUrl ?? null,
      mode: payload.mode ?? 'light',
      themePreset: payload.themePreset ?? DEFAULT_THEME_PRESET
    };

    await this.fastify.prisma.company.update({
      where: { id: user.companyId },
      data: { branding }
    });

    await reply.send(branding);
  };
}
