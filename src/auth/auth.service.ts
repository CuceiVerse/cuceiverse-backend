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

type PublicUser = {
  id: string;
  siiauCode: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type UserIdAndCode = Pick<PublicUser, 'id' | 'siiauCode'>;

const publicUserSelect = {
  id: true,
  siiauCode: true,
  displayName: true,
  avatarUrl: true,
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

  private async signAccessToken(user: UserIdAndCode): Promise<string> {
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN') ?? '7d';
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
    const userWithPassword = (await this.prisma.user.findUnique({
      where: { siiauCode: dto.siiauCode },
      select: { ...publicUserSelect, passwordHash: true },
    })) as (PublicUser & { passwordHash: string }) | null;

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
