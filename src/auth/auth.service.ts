import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import type { StringValue } from 'ms';

import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

type PublicUser = {
  id: string;
  siiauCode: string;
  displayName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type UserIdAndCode = Pick<PublicUser, 'id' | 'siiauCode'>;

const publicUserSelect = {
  id: true,
  siiauCode: true,
  displayName: true,
  avatarUrl: true,
  isAdmin: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async signAccessToken(
    user: UserIdAndCode & { isAdmin: boolean },
  ): Promise<string> {
    const expiresInRaw = this.config.get<string>('JWT_EXPIRES_IN');
    const expiresIn =
      expiresInRaw && /^\d+$/.test(expiresInRaw)
        ? Number(expiresInRaw)
        : ((expiresInRaw ?? '7d') as StringValue);
    return this.jwt.signAsync(
      { sub: user.id, siiauCode: user.siiauCode, isAdmin: user.isAdmin },
      { expiresIn },
    );
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({
      where: { siiauCode: dto.siiauCode },
      select: { id: true },
    });
    if (exists) throw new ConflictException('siiauCode already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = (await this.prisma.user.create({
      data: {
        siiauCode: dto.siiauCode,
        passwordHash,
        displayName: dto.displayName,
      },
      select: publicUserSelect,
    })) as PublicUser;

    const accessToken = await this.signAccessToken(user);
    return { accessToken, user };
  }

  async login(dto: LoginDto) {
    const loginCode = dto.codigo.trim();
    const loginNip = dto.nip;

    const allowTestAdmin =
      this.config.get<string>('NODE_ENV') !== 'production' &&
      this.config.get<string>('AUTH_TEST_ADMIN_ENABLED') !== 'false';
    const testAdminCode = this.config.get<string>('AUTH_TEST_ADMIN_CODE') ?? 'admin';
    const testAdminNip = this.config.get<string>('AUTH_TEST_ADMIN_NIP') ?? 'admin123';

    if (allowTestAdmin && loginCode === testAdminCode && loginNip === testAdminNip) {
      const passwordHash = await bcrypt.hash(loginNip, 10);
      const admin = (await this.prisma.user.upsert({
        where: { siiauCode: loginCode },
        update: {
          passwordHash,
          isAdmin: true,
          displayName: 'Admin Pruebas',
        },
        create: {
          siiauCode: loginCode,
          passwordHash,
          displayName: 'Admin Pruebas',
          isAdmin: true,
        },
        select: publicUserSelect,
      })) as PublicUser;

      const accessToken = await this.signAccessToken(admin);
      return { accessToken, user: admin };
    }

    const userWithPassword = (await this.prisma.user.findUnique({
      where: { siiauCode: loginCode },
      select: { ...publicUserSelect, passwordHash: true },
    })) as (PublicUser & { passwordHash: string }) | null;

    if (!userWithPassword)
      throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(
      loginNip,
      userWithPassword.passwordHash,
    );
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const user: PublicUser = {
      id: userWithPassword.id,
      siiauCode: userWithPassword.siiauCode,
      displayName: userWithPassword.displayName,
      avatarUrl: userWithPassword.avatarUrl,
      isAdmin: userWithPassword.isAdmin,
      createdAt: userWithPassword.createdAt,
      updatedAt: userWithPassword.updatedAt,
    };

    const accessToken = await this.signAccessToken(user);
    return { accessToken, user };
  }
}
