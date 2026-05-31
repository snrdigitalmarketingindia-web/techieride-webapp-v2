import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../config/redis.module';
import { PrismaService } from '../../prisma/prisma.service';
import { OTP_TTL_SECONDS, OTP_MAX_ATTEMPTS, REDIS_KEYS } from '@techieride/shared';

@Injectable()
export class OtpService {
  constructor(
    @Inject(REDIS_CLIENT) private redis: Redis,
    private prisma: PrismaService,
  ) {}

  async sendOtp(phone: string, userId: string): Promise<void> {
    const otp = this.generateOtp();
    const hash = await bcrypt.hash(otp, 10);

    await this.prisma.otp.upsert({
      where: { userId },
      create: {
        userId,
        otpHash: hash,
        expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
        attempts: 0,
      },
      update: {
        otpHash: hash,
        expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
        attempts: 0,
      },
    });

    // In production: send via SMS gateway
    // For dev: log to console
    console.log(`📱 OTP for ${phone}: ${otp}`);
  }

  async verifyOtp(userId: string, otp: string): Promise<boolean> {
    const record = await this.prisma.otp.findUnique({ where: { userId } });
    if (!record) return false;
    if (record.expiresAt < new Date()) {
      await this.prisma.otp.delete({ where: { userId } });
      return false;
    }
    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Too many OTP attempts. Request a new OTP.');
    }

    const valid = await bcrypt.compare(otp, record.otpHash);
    if (!valid) {
      await this.prisma.otp.update({
        where: { userId },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }

    await this.prisma.otp.delete({ where: { userId } });
    return true;
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
