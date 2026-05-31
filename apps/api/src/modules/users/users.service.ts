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
    return user;
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
        fullName: dto.fullName,
        profilePhoto: dto.profilePhoto,
        gender: dto.gender as any,
        companyName: dto.companyName,
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
