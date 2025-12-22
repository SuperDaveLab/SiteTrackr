import { FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { LoginBody } from './auth.schemas';

export class AuthController {
  constructor(private readonly authService: AuthService = new AuthService()) {}

  login = async (
    request: FastifyRequest<{ Body: LoginBody }>,
    reply: FastifyReply
  ): Promise<void> => {
    const result = await this.authService.login(request.body);
    await reply.status(200).send(result);
  };
}
