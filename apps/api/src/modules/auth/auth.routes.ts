import { FastifyInstance } from 'fastify';
import { AuthController } from './auth.controller';
import { loginBodySchema, loginResponseSchema } from './auth.schemas';

const authRoutes = async (fastify: FastifyInstance): Promise<void> => {
  const controller = new AuthController();

  fastify.post(
    '/login',
    {
      schema: {
        tags: ['auth'],
        body: loginBodySchema,
        response: {
          200: loginResponseSchema
        }
      }
    },
    controller.login
  );
};

export default authRoutes;
