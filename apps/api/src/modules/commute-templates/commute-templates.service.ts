import { Injectable, ForbiddenException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { Logger } from '@nestjs/common';

@Injectable()
export class CommuteTemplatesService {
  private readonly logger = new Logger(CommuteTemplatesService.name);

  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateTemplateDto) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) throw new ForbiddenException('Only ride givers can create templates');
    return this.prisma.commuteTemplate.create({
      data: { rideGiverId: giver.id, ...dto },
    });
  }

  async findMine(userId: string) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) return [];
    return this.prisma.commuteTemplate.findMany({
      where: { rideGiverId: giver.id },
      include: { vehicle: true },
    });
  }

  async toggle(templateId: string, userId: string) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) throw new ForbiddenException();
    const template = await this.prisma.commuteTemplate.findFirst({
      where: { id: templateId, rideGiverId: giver.id },
    });
    if (!template) throw new ForbiddenException('Template not found');
    return this.prisma.commuteTemplate.update({
      where: { id: templateId },
      data: { isActive: !template.isActive },
    });
  }

  async remove(templateId: string, userId: string) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) throw new ForbiddenException();
    return this.prisma.commuteTemplate.deleteMany({
      where: { id: templateId, rideGiverId: giver.id },
    });
  }

  // Auto-publish rides daily at 6 AM IST (00:30 UTC)
  @Cron('30 0 * * 1-5', { timeZone: 'Asia/Kolkata' })
  async autoPublishRides() {
    this.logger.log('⏰ Auto-publishing rides from templates...');
    const today = new Date();
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // ISO weekday

    const templates = await this.prisma.commuteTemplate.findMany({
      where: { isActive: true },
    });

    let created = 0;
    for (const template of templates) {
      if (!template.departureDays.includes(dayOfWeek)) continue;

      const existingRide = await this.prisma.ride.findFirst({
        where: {
          templateId: template.id,
          departureDate: {
            gte: new Date(today.toDateString()),
            lt: new Date(today.getTime() + 86400000),
          },
        },
      });
      if (existingRide) continue;

      await this.prisma.ride.create({
        data: {
          rideGiverId: template.rideGiverId,
          vehicleId: template.vehicleId,
          templateId: template.id,
          originName: template.originName,
          originLat: template.originLat,
          originLng: template.originLng,
          destinationName: template.destinationName,
          destinationLat: template.destinationLat,
          destinationLng: template.destinationLng,
          departureDate: new Date(today.toDateString()),
          departureTime: template.departureTime,
          totalSeats: template.totalSeats,
          availableSeats: template.totalSeats,
          status: 'PUBLISHED',
        },
      });

      await this.prisma.commuteTemplate.update({
        where: { id: template.id },
        data: { lastPublishedDate: today },
      });
      created++;
    }
    this.logger.log(`✅ Auto-published ${created} rides`);
  }
}
