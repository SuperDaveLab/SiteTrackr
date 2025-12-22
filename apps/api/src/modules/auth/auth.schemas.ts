import { FromSchema } from 'json-schema-to-ts';

export const loginBodySchema = {
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 6 }
  },
  additionalProperties: false
} as const;

export const loginResponseSchema = {
  type: 'object',
  required: ['accessToken', 'refreshToken', 'user'],
  properties: {
    accessToken: { type: 'string' },
    refreshToken: { type: 'string' },
    user: {
      type: 'object',
      required: ['id', 'email', 'displayName', 'role'],
      properties: {
        id: { type: 'string' },
        email: { type: 'string', format: 'email' },
        displayName: { type: 'string' },
        role: { type: 'string', enum: ['ADMIN', 'DISPATCHER', 'TECH'] }
      },
      additionalProperties: false
    }
  },
  additionalProperties: false
} as const;

export type LoginBody = FromSchema<typeof loginBodySchema>;
export type LoginResponse = FromSchema<typeof loginResponseSchema>;
