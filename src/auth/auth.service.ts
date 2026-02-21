import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

function publicUser(u: any) {
  const { passwordHash, ...rest } = u;
  return rest;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async signAccessToken(user: { id: string; siiauCode: string }) {
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

    const user = await this.prisma.user.create({
      data: {
        siiauCode: dto.siiauCode,
        passwordHash,
        displayName: dto.displayName,
      },
    });

    const accessToken = await this.signAccessToken(user);
    return { accessToken, user: publicUser(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { siiauCode: dto.siiauCode },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const accessToken = await this.signAccessToken(user);
    return { accessToken, user: publicUser(user) };
  }
}