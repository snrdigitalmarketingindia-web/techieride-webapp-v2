import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateVehicleDto) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) throw new ForbiddenException('Only ride givers can add vehicles');
    return this.prisma.vehicle.create({
      data: { rideGiverId: giver.id, ...dto },
    });
  }

  async findMine(userId: string) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) return [];
    return this.prisma.vehicle.findMany({ where: { rideGiverId: giver.id, isActive: true } });
  }

  async updateRcUrl(vehicleId: string, userId: string, rcUrl: string) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) throw new ForbiddenException();
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, rideGiverId: giver.id } });
    if (!vehicle) throw new NotFoundException();
    return this.prisma.vehicle.update({ where: { id: vehicleId }, data: { rcUrl } });
  }

  async remove(vehicleId: string, userId: string) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) throw new ForbiddenException();

    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, rideGiverId: giver.id } });
    if (!vehicle) throw new NotFoundException('Vehicle not found');

    // Block deletion if vehicle is used on an active (PUBLISHED/ONGOING) ride
    const activeRide = await this.prisma.ride.findFirst({
      where: { vehicleId, status: { in: ['PUBLISHED', 'ONGOING'] } },
    });
    if (activeRide) {
      throw new ConflictException('Cannot remove a vehicle that is used in an active ride. Cancel or complete the ride first.');
    }

    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { isActive: false },
    });
  }
}
