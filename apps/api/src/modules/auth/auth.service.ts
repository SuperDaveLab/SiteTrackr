import jwt from 'jsonwebtoken';
import { env } from '../../env';
import { LoginBody, LoginResponse } from './auth.schemas';

export class AuthService {
  async login(credentials: LoginBody): Promise<LoginResponse> {
    // TODO: Replace with actual user lookup from database
    const user = {
      id: 'dummy',
      email: credentials.email,
      displayName: 'Demo Admin',
      role: 'ADMIN' as const,
      companyId: '11111111-1111-1111-1111-111111111111'
    };

    const accessToken = jwt.sign({ 
      email: user.email,
      role: user.role,
      companyId: user.companyId
    }, env.JWT_SECRET, {
      subject: user.id,
      expiresIn: '15m'
    });

    const refreshToken = jwt.sign({ 
      email: user.email, 
      type: 'refresh' 
    }, env.JWT_SECRET, {
      subject: user.id,
      expiresIn: '7d'
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role
      }
    };
  }
}
