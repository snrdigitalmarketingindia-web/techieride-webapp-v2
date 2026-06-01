import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AddEmergencyContactDto } from './dto/emergency-contact.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
        phone: true,
        countryCode: true,
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
        ...(dto.personalEmail !== undefined ? { personalEmail: dto.personalEmail } : {}),
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

  async removeEmergencyContact(userId: string, contactId: string) {
    return this.prisma.emergencyContact.deleteMany({
      where: { id: contactId, userId },
    });
  }
}
