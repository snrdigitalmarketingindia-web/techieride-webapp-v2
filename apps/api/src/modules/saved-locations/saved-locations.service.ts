import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_SAVED_LOCATIONS = 20;

export class CreateSavedLocationDto {
  alias: string;
  lat: number;
  lng: number;
  address?: string;
}

@Injectable()
export class SavedLocationsService {
  constructor(private prisma: PrismaService) {}

  async findMine(userId: string) {
    return this.prisma.savedLocation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateSavedLocationDto) {
    const count = await this.prisma.savedLocation.count({ where: { userId } });
    if (count >= MAX_SAVED_LOCATIONS) {
      throw new BadRequestException(
        `You can save up to ${MAX_SAVED_LOCATIONS} locations. Delete one to add a new one.`,
      );
    }
    const alias = (dto.alias ?? '').trim();
    if (!alias) throw new BadRequestException('Alias is required');

    return this.prisma.savedLocation.create({
      data: {
        userId,
        alias,
        lat: dto.lat,
        lng: dto.lng,
        address: dto.address ?? '',
      },
    });
  }

  async remove(id: string, userId: string) {
    const loc = await this.prisma.savedLocation.findFirst({ where: { id, userId } });
    if (!loc) throw new ForbiddenException('Location not found');
    return this.prisma.savedLocation.delete({ where: { id } });
  }
}
