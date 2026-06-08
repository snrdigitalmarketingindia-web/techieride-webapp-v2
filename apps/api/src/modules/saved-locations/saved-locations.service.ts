import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_SAVED_LOCATIONS = 30;

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

  async update(id: string, userId: string, dto: Partial<CreateSavedLocationDto>) {
    const loc = await this.prisma.savedLocation.findFirst({ where: { id, userId } });
    if (!loc) throw new ForbiddenException('Location not found');
    const alias = dto.alias !== undefined ? dto.alias.trim() : undefined;
    if (alias !== undefined && !alias) throw new BadRequestException('Alias cannot be empty');
    return this.prisma.savedLocation.update({
      where: { id },
      data: {
        ...(alias !== undefined ? { alias } : {}),
        ...(dto.lat !== undefined ? { lat: dto.lat } : {}),
        ...(dto.lng !== undefined ? { lng: dto.lng } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
      },
    });
  }

  async remove(id: string, userId: string) {
    const loc = await this.prisma.savedLocation.findFirst({ where: { id, userId } });
    if (!loc) throw new ForbiddenException('Location not found');
    return this.prisma.savedLocation.delete({ where: { id } });
  }
}
