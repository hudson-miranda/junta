import { randomBytes, randomUUID, createHash } from 'node:crypto';
import {
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaClient, User, Prisma } from '../generated/client';
import { hash, verify, argon2id } from 'argon2';
import jwt from 'jsonwebtoken';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import nodemailer from 'nodemailer';
import { SignupInput } from '@junta/validation';
import { config } from './config';
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export const publicUser = (u: User) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  referralCode: u.referralCode,
  preferences: u.preferences,
});
const googleKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const appleKeys = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
export class AuthService {
  constructor(readonly db: PrismaClient) {}
  async signup(input: SignupInput) {
    const passwordHash = await hash(input.password, {
      type: argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    try {
      const user = await this.db.$transaction(async (tx) => {
        const referrer = input.referralCode
          ? await tx.user.findUnique({ where: { referralCode: input.referralCode } })
          : null;
        const u = await tx.user.create({
          data: { email: input.email, name: input.name, passwordHash, referredBy: referrer?.id },
        });
        await tx.analyticsEvent.create({
          data: { userId: u.id, name: 'activation', properties: { provider: 'email' } },
        });
        if (referrer && referrer.email !== u.email)
          await tx.analyticsEvent.create({
            data: {
              userId: u.id,
              name: 'referral.converted',
              properties: { referrerId: referrer.id },
            },
          });
        return u;
      });
      return this.session(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002')
        throw new ConflictException('Email já cadastrado');
      throw e;
    }
  }
  async login(email: string, password: string) {
    const user = await this.db.user.findUnique({ where: { email } });
    // Equal-cost failure path reduces user enumeration by timing.
    const dummy =
      '$argon2id$v=19$m=19456,t=2,p=1$YWFhYWFhYWFhYWFhYWFhYQ$SXkNmi0cplVsXzwgx4v5GBG0mYg7lnY2fcQzvWL1d5Q';
    const valid = await verify(user?.passwordHash ?? dummy, password).catch(() => false);
    if (!user || user.deletedAt || !valid)
      throw new UnauthorizedException('Email ou senha inválidos');
    return this.session(user);
  }
  async oauth(provider: 'google' | 'apple', idToken: string) {
    const audience = process.env[provider === 'google' ? 'GOOGLE_CLIENT_ID' : 'APPLE_CLIENT_ID'];
    if (!audience)
      throw new ServiceUnavailableException('Login social indisponível neste ambiente');
    let payload;
    try {
      ({ payload } = await jwtVerify(idToken, provider === 'google' ? googleKeys : appleKeys, {
        audience: audience.split(',').map((v) => v.trim()),
        issuer:
          provider === 'google'
            ? ['https://accounts.google.com', 'accounts.google.com']
            : 'https://appleid.apple.com',
        algorithms: ['RS256'],
      }));
    } catch {
      throw new UnauthorizedException('Identidade inválida');
    }
    if (
      typeof payload.email !== 'string' ||
      ![true, 'true'].includes(payload.email_verified as boolean) ||
      !payload.sub
    )
      throw new UnauthorizedException('Email não verificado');
    const subject = `${provider}:${payload.sub}`;
    let user = await this.db.user.findUnique({ where: { providerSubject: subject } });
    if (!user) {
      if (await this.db.user.findUnique({ where: { email: payload.email.toLowerCase() } }))
        throw new ConflictException('Entre com sua senha para usar a conta existente');
      user = await this.db.user.create({
        data: {
          email: payload.email.toLowerCase(),
          name: typeof payload.name === 'string' ? payload.name : 'Pessoa JUNTA',
          providerSubject: subject,
        },
      });
    }
    if (user.deletedAt) throw new UnauthorizedException();
    return this.session(user);
  }
  async session(user: User, family = randomUUID()) {
    const refreshToken = randomBytes(48).toString('base64url');
    const s = await this.db.session.create({
      data: {
        userId: user.id,
        family,
        tokenHash: digest(refreshToken),
        expiresAt: new Date(Date.now() + 30 * 86400000),
      },
    });
    return {
      user: publicUser(user),
      accessToken: jwt.sign({ sub: user.id, sid: s.id }, config().secret, {
        expiresIn: '15m',
        issuer: 'junta',
        audience: 'junta-clients',
      }),
      refreshToken,
    };
  }
  async refresh(token: string) {
    const found = await this.db.session.findUnique({ where: { tokenHash: digest(token) } });
    if (!found) throw new UnauthorizedException('Sessão inválida');
    // Commit replay revocation before throwing; do not roll it back with the error.
    const claim = await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${found.userId}))`;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${found.family}))`;
      const s = await tx.session.findUniqueOrThrow({
        where: { id: found.id },
        include: { user: true },
      });
      if (s.revokedAt || s.rotatedAt || s.expiresAt < new Date() || s.user.deletedAt) {
        await tx.session.updateMany({
          where: { family: s.family },
          data: { revokedAt: new Date() },
        });
        return null;
      }
      await tx.session.update({ where: { id: s.id }, data: { rotatedAt: new Date() } });
      const refreshToken = randomBytes(48).toString('base64url');
      const next = await tx.session.create({
        data: {
          userId: s.userId,
          family: s.family,
          tokenHash: digest(refreshToken),
          expiresAt: new Date(Date.now() + 30 * 86400000),
        },
      });
      return {
        user: publicUser(s.user),
        accessToken: jwt.sign({ sub: s.userId, sid: next.id }, config().secret, {
          expiresIn: '15m',
          issuer: 'junta',
          audience: 'junta-clients',
        }),
        refreshToken,
      };
    });
    if (!claim) throw new UnauthorizedException('Sessão expirada; entre novamente');
    return claim;
  }
  async user(authorization?: string) {
    try {
      if (!authorization?.startsWith('Bearer ')) throw new Error();
      const payload = jwt.verify(authorization.slice(7), config().secret, {
        issuer: 'junta',
        audience: 'junta-clients',
        algorithms: ['HS256'],
      }) as { sub: string; sid: string };
      const s = await this.db.session.findUnique({
        where: { id: payload.sid },
        include: { user: true },
      });
      if (
        !s ||
        s.userId !== payload.sub ||
        s.revokedAt ||
        s.expiresAt < new Date() ||
        s.user.deletedAt
      )
        throw new Error();
      return s.user;
    } catch {
      throw new UnauthorizedException('Entre na sua conta');
    }
  }
  roles(user: User, roles: string[]) {
    if (!roles.includes(user.role)) throw new ForbiddenException('Acesso não permitido');
  }
  async logout(user: User) {
    await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      await tx.session.updateMany({
        where: { userId: user.id },
        data: { revokedAt: new Date() },
      });
      await tx.device.updateMany({ where: { userId: user.id }, data: { enabled: false } });
    });
    return { ok: true };
  }
  async forgot(email: string) {
    if (!process.env.MAIL_HOST)
      throw new ServiceUnavailableException('Recuperação temporariamente indisponível');
    const user = await this.db.user.findUnique({ where: { email } });
    if (user && !user.deletedAt) {
      const token = randomBytes(32).toString('base64url');
      await this.db.passwordReset.create({
        data: {
          userId: user.id,
          tokenHash: digest(token),
          expiresAt: new Date(Date.now() + 30 * 60000),
        },
      });
      const transport = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port: Number(process.env.MAIL_PORT ?? 587),
        secure: process.env.MAIL_SECURE === 'true',
        ...(process.env.MAIL_USER
          ? { auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD } }
          : {}),
      });
      await transport.sendMail({
        from: process.env.MAIL_FROM ?? 'JUNTA <noreply@junta.local>',
        to: user.email,
        subject: 'Redefinir sua senha JUNTA',
        text: `Abra ${config().webUrl}/reset?token=${token} em até 30 minutos.`,
      });
    }
    return { message: 'Se a conta existir, enviaremos as instruções.' };
  }
  async reset(token: string, password: string) {
    const passwordHash = await hash(password, {
      type: argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
    return this.db.$transaction(async (tx) => {
      const reset = await tx.passwordReset.findUnique({ where: { tokenHash: digest(token) } });
      if (!reset) throw new UnauthorizedException('Link inválido');
      const updated = await tx.passwordReset.updateMany({
        where: { id: reset.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (!updated.count) throw new UnauthorizedException('Link expirado ou utilizado');
      await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
      await tx.session.updateMany({
        where: { userId: reset.userId },
        data: { revokedAt: new Date() },
      });
      return { ok: true };
    });
  }
}
