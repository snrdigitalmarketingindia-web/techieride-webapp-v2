import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, IsBoolean, MaxLength, Min, Max } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

const MAX_SAVED_LOCATIONS = 30;
const DUPLICATE_RADIUS_M  = 50; // metres

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class CreateSavedLocationDto {
  // Decorators are required: the global ValidationPipe runs with
  // whitelist + forbidNonWhitelisted, which rejects undecorated properties —
  // without these, every POST /saved-locations was a 400.
  @IsString() @MaxLength(40) alias: string;
  @IsNumber() @Min(-90)  @Max(90)  lat: number;
  @IsNumber() @Min(-180) @Max(180) lng: number;
  @IsOptional() @IsString() @MaxLength(255) address?: string;
  @IsOptional() @IsBoolean() isFavorite?: boolean;
  @IsOptional() @IsString() sourceType?: string; // "SEARCH" | "PIN"
}

@Injectable()
export class SavedLocationsService {
  constructor(private prisma: PrismaService) {}

  async findMine(userId: string) {
    const locs = await this.prisma.savedLocation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Sort: favorites first → recently used → rest by createdAt desc
    const favorites    = locs.filter(l => l.isFavorite).sort((a, b) =>
      (b.lastUsedAt?.getTime() ?? 0) - (a.lastUsedAt?.getTime() ?? 0));
    const recentlyUsed = locs.filter(l => !l.isFavorite && l.lastUsedAt).sort((a, b) =>
      b.lastUsedAt!.getTime() - a.lastUsedAt!.getTime());
    const rest         = locs.filter(l => !l.isFavorite && !l.lastUsedAt);

    return [...favorites, ...recentlyUsed, ...rest];
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

    // Duplicate check — reject if another location is within 50m
    const existing = await this.prisma.savedLocation.findMany({
      where: { userId },
      select: { id: true, alias: true, lat: true, lng: true },
    });
    const duplicate = existing.find(
      loc => haversineMeters(loc.lat, loc.lng, dto.lat, dto.lng) < DUPLICATE_RADIUS_M,
    );
    if (duplicate) {
      throw new BadRequestException(
        `A location named "${duplicate.alias}" is already saved very close to this point.`,
      );
    }

    return this.prisma.savedLocation.create({
      data: {
        userId,
        alias,
        lat:        dto.lat,
        lng:        dto.lng,
        address:    dto.address    ?? '',
        isFavorite: dto.isFavorite ?? false,
        sourceType: ['SEARCH', 'PIN'].includes(dto.sourceType ?? '') ? dto.sourceType! : 'SEARCH',
      },
    });
  }

  async update(id: string, userId: string, dto: Partial<CreateSavedLocationDto>) {
    const loc = await this.prisma.savedLocation.findFirst({ where: { id, userId } });
    if (!loc) throw new ForbiddenException('Location not found');

    const alias = dto.alias !== undefined ? dto.alias.trim() : undefined;
    if (alias !== undefined && !alias) throw new BadRequestException('Alias cannot be empty');

    // Duplicate check when coordinates are changing
    if (dto.lat !== undefined || dto.lng !== undefined) {
      const newLat = dto.lat ?? loc.lat;
      const newLng = dto.lng ?? loc.lng;
      const others = await this.prisma.savedLocation.findMany({
        where: { userId, NOT: { id } },
        select: { id: true, alias: true, lat: true, lng: true },
      });
      const duplicate = others.find(
        l => haversineMeters(l.lat, l.lng, newLat, newLng) < DUPLICATE_RADIUS_M,
      );
      if (duplicate) {
        throw new BadRequestException(
          `A location named "${duplicate.alias}" is already saved very close to this point.`,
        );
      }
    }

    return this.prisma.savedLocation.update({
      where: { id },
      data: {
        ...(alias              !== undefined ? { alias }                      : {}),
        ...(dto.lat            !== undefined ? { lat: dto.lat }               : {}),
        ...(dto.lng            !== undefined ? { lng: dto.lng }               : {}),
        ...(dto.address        !== undefined ? { address: dto.address }       : {}),
        ...(dto.isFavorite     !== undefined ? { isFavorite: dto.isFavorite } : {}),
        ...(dto.sourceType     !== undefined ? { sourceType: dto.sourceType } : {}),
      },
    });
  }

  async toggleFavorite(id: string, userId: string) {
    const loc = await this.prisma.savedLocation.findFirst({ where: { id, userId } });
    if (!loc) throw new ForbiddenException('Location not found');
    return this.prisma.savedLocation.update({
      where: { id },
      data: { isFavorite: !loc.isFavorite },
    });
  }

  async recordUsage(id: string, userId: string) {
    // fire-and-forget — never throws to caller
    this.prisma.savedLocation
      .findFirst({ where: { id, userId } })
      .then(loc => {
        if (!loc) return;
        return this.prisma.savedLocation.update({
          where: { id },
          data: { usageCount: { increment: 1 }, lastUsedAt: new Date() },
        });
      })
      .catch(() => {});
    return { ok: true };
  }

  async remove(id: string, userId: string) {
    const loc = await this.prisma.savedLocation.findFirst({ where: { id, userId } });
    if (!loc) throw new ForbiddenException('Location not found');
    return this.prisma.savedLocation.delete({ where: { id } });
  }
}
