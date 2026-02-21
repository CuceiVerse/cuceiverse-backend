import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { publicUserSelect, type PublicUser } from './auth.types';

type UserIdAndCode = Pick<PublicUser, 'id' | 'siiauCode'>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async signAccessToken(user: UserIdAndCode): Promise<string> {
    const raw = this.config.get<string>('JWT_EXPIRES_IN') ?? '7d';
    const expiresIn = /^\d+$/.test(raw) ? Number(raw) : raw; // string | number

    return this.jwt.signAsync(
      { sub: user.id, siiauCode: user.siiauCode },
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

    const user = await this.prisma.user.create({
      data: {
        siiauCode: dto.siiauCode,
        passwordHash,
        displayName: dto.displayName,
      },
      select: publicUserSelect,
    });

    const accessToken = await this.signAccessToken(user);
    return { accessToken, user };
  }

  async login(dto: LoginDto) {
    const userWithPassword = await this.prisma.user.findUnique({
      where: { siiauCode: dto.siiauCode },
      select: { ...publicUserSelect, passwordHash: true },
    });
    if (!userWithPassword)
      throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(
      dto.password,
      userWithPassword.passwordHash,
    );
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const user: PublicUser = {
      id: userWithPassword.id,
      siiauCode: userWithPassword.siiauCode,
      displayName: userWithPassword.displayName,
      avatarUrl: userWithPassword.avatarUrl,
      createdAt: userWithPassword.createdAt,
      updatedAt: userWithPassword.updatedAt,
    };

    const accessToken = await this.signAccessToken(user);
    return { accessToken, user };
  }
}
