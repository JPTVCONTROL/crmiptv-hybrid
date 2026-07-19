import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { usuarioRepository } from '../repositories/usuarioRepository.js';

export interface AuthUsuario {
  id: number;
  email: string;
  nome: string;
}

export interface LoginResult {
  token: string;
  usuario: AuthUsuario;
}

interface TokenPayload {
  sub: number;
  email: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AuthService {
  async login(email: string, senha: string): Promise<LoginResult> {
    const emailNormalizado = email.trim().toLowerCase();

    if (!emailNormalizado || !senha) {
      throw new AuthError('Informe e-mail e senha.');
    }

    const usuario = await usuarioRepository.findByEmail(emailNormalizado);
    if (!usuario) {
      throw new AuthError('E-mail ou senha inválidos.');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.passwordHash);
    if (!senhaValida) {
      throw new AuthError('E-mail ou senha inválidos.');
    }

    const token = jwt.sign(
      { sub: usuario.id, email: usuario.email },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    return {
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
      },
    };
  }

  async obterPorId(id: number): Promise<AuthUsuario> {
    const usuario = await usuarioRepository.findById(id);
    if (!usuario) {
      throw new AuthError('Usuário não encontrado.');
    }

    return {
      id: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
    };
  }

  verificarToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, env.jwtSecret);

      if (
        typeof payload === 'string' ||
        payload.sub === undefined ||
        payload.email === undefined
      ) {
        throw new AuthError('Sessão inválida ou expirada.');
      }

      return {
        sub: Number(payload.sub),
        email: String(payload.email),
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      throw new AuthError('Sessão inválida ou expirada.');
    }
  }
}

export const authService = new AuthService();
