import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpService } from './otp.service';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '@techieride/shared';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private otpService: OtpService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ phone: dto.phone }, { email: dto.email }] },
    });
    if (existing) {
      throw new ConflictException('Phone or email already registered');
    }

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        fullName: dto.fullName,
        gender: dto.gender as any,
        companyName: dto.companyName,
        employeeId: dto.employeeId,
        role: dto.role as UserRole,
      },
    });

    if (dto.role === UserRole.RIDE_GIVER || dto.role === UserRole.BOTH) {
      await this.prisma.rideGiver.create({ data: { userId: user.id } });
    }
    if (dto.role === UserRole.RIDE_SEEKER || dto.role === UserRole.BOTH) {
      await this.prisma.rideSeeker.create({ data: { userId: user.id } });
    }

    await this.otpService.sendOtp(dto.phone, user.id);
    return { userId: user.id, message: 'OTP sent to phone' };
  }

  async requestOtp(phone: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new UnauthorizedException('Phone number not registered');
    await this.otpService.sendOtp(phone, user.id);
    return { message: 'OTP sent' };
  }

  async verifyOtp(phone: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new UnauthorizedException('Phone number not registered');

    const valid = await this.otpService.verifyOtp(user.id, otp);
    if (!valid) throw new UnauthorizedException('Invalid or expired OTP');

    return this.generateTokens(user);
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) throw new UnauthorizedException();
      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(user: { id: string; role: string; email: string }) {
    const payload = { sub: user.id, role: user.role, email: user.email };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });
    return { accessToken, refreshToken };
  }
}
