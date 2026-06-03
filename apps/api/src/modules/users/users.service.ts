import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddEmergencyContactDto } from './dto/emergency-contact.dto';
import { EmailService } from '../email/email.service';
import { isAllowedDomain } from '../../config/allowed-domains';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        rideGiver: { select: { averageRating: true, totalRidesGiven: true } },
        rideSeeker: { select: { averageRating: true, totalRidesTaken: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    // Strip all sensitive fields before returning
    const { passwordHash, emailVerificationToken, emailVerificationExpiry,
            passwordResetToken, passwordResetExpiry, ...safeUser } = user;
    return safeUser;
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        profilePhoto: true,
        ecoLevel: true,
        companyName: true,
        trustScore: true,
        trustBand: true,
        rideGiver: { select: { averageRating: true, totalRidesGiven: true } },
        rideSeeker: { select: { averageRating: true, totalRidesTaken: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.fullName !== undefined ? { fullName: dto.fullName } : {}),
        ...(dto.profilePhoto !== undefined ? { profilePhoto: dto.profilePhoto } : {}),
        ...(dto.gender !== undefined ? { gender: dto.gender as any } : {}),
        ...(dto.companyName !== undefined ? { companyName: dto.companyName } : {}),
        ...(dto.fcmToken !== undefined ? { fcmToken: dto.fcmToken } : {}),
        ...(dto.homeLocation !== undefined ? { homeLocation: dto.homeLocation } : {}),
        ...(dto.officeLocation !== undefined ? { officeLocation: dto.officeLocation } : {}),
        // personalEmail not updated here — use requestPersonalEmailChange for verified flow
        ...(dto.bloodGroup !== undefined ? { bloodGroup: dto.bloodGroup } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.countryCode !== undefined ? { countryCode: dto.countryCode } : {}),
      },
    });
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });
  }

  async getEmergencyContacts(userId: string) {
    return this.prisma.emergencyContact.findMany({ where: { userId } });
  }

  async addEmergencyContact(userId: string, dto: AddEmergencyContactDto) {
    const count = await this.prisma.emergencyContact.count({ where: { userId } });
    if (count >= 3) {
      throw new Error('Maximum 3 emergency contacts allowed');
    }
    return this.prisma.emergencyContact.create({
      data: { userId, ...dto },
    });
  }

  // ── Official email change ─────────────────────────────────────────────────
  async requestEmailChange(userId: string, newEmail: string) {
    const emailLower = newEmail.toLowerCase().trim();
    if (!isAllowedDomain(emailLower))
      throw new BadRequestException('Only corporate email addresses are allowed');
    const existing = await this.prisma.user.findUnique({ where: { email: emailLower } });
    if (existing) throw new BadRequestException('Email already in use');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    const token = randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: userId },
      data: { pendingEmail: emailLower, pendingEmailToken: token, pendingEmailExpiry: expiry },
    });
    await this.email.sendEmailChangeVerification(emailLower, user.fullName, token, false);
    return { message: `Verification email sent to ${emailLower}` };
  }

  async confirmEmailChange(token: string) {
    const user = await this.prisma.user.findUnique({ where: { pendingEmailToken: token } });
    if (!user) throw new BadRequestException('Invalid or expired token');
    if (user.pendingEmailExpiry && user.pendingEmailExpiry < new Date())
      throw new BadRequestException('Token expired — please request a new email change');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { email: user.pendingEmail!, pendingEmail: null, pendingEmailToken: null, pendingEmailExpiry: null },
    });
    return { message: 'Email updated successfully' };
  }

  // ── Personal email change ─────────────────────────────────────────────────
  async requestPersonalEmailChange(userId: string, newEmail: string) {
    const emailLower = newEmail.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    const token = randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    // Reuse pendingEmail fields — prefix personal with 'p:' to distinguish
    await this.prisma.user.update({
      where: { id: userId },
      data: { pendingEmail: `p:${emailLower}`, pendingEmailToken: token, pendingEmailExpiry: expiry },
    });
    await this.email.sendEmailChangeVerification(emailLower, user.fullName, token, true);
    return { message: `Confirmation email sent to ${emailLower}` };
  }

  async confirmPersonalEmailChange(token: string) {
    const user = await this.prisma.user.findUnique({ where: { pendingEmailToken: token } });
    if (!user) throw new BadRequestException('Invalid or expired token');
    if (user.pendingEmailExpiry && user.pendingEmailExpiry < new Date())
      throw new BadRequestException('Token expired — please request a new change');
    if (!user.pendingEmail?.startsWith('p:'))
      throw new BadRequestException('Invalid token type');
    const newPersonalEmail = user.pendingEmail.slice(2);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { personalEmail: newPersonalEmail, personalEmailVerified: true, pendingEmail: null, pendingEmailToken: null, pendingEmailExpiry: null },
    });
    return { message: 'Personal email verified and updated successfully' };
  }

  async removeEmergencyContact(userId: string, contactId: string) {
    return this.prisma.emergencyContact.deleteMany({
      where: { id: contactId, userId },
    });
  }
}
