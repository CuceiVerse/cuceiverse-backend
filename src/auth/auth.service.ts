import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private sanitizeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async register(dto: RegisterDto) {
    const siiauCode = dto.siiauCode.trim();

    const exists = await this.prisma.user.findUnique({ where: { siiauCode } });
    if (exists) throw new BadRequestException('siiauCode already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        siiauCode,
        passwordHash,
        displayName: dto.displayName?.trim() || null,
      },
    });

    const token = await this.jwt.signAsync({
      sub: user.id,
      siiauCode: user.siiauCode,
    });

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  async login(dto: LoginDto) {
    const siiauCode = dto.siiauCode.trim();

    const user = await this.prisma.user.findUnique({ where: { siiauCode } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const token = await this.jwt.signAsync({
      sub: user.id,
      siiauCode: user.siiauCode,
    });

    return {
      token,
      user: this.sanitizeUser(user),
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return this.sanitizeUser(user);
  }
}
