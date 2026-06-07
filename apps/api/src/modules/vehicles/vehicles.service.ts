import { Injectable, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateVehicleDto) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) throw new ForbiddenException('Only ride givers can add vehicles');
    try {
      return await this.prisma.vehicle.create({
        data: { rideGiverId: giver.id, ...dto },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException('A vehicle with this plate number already exists');
      }
      throw e;
    }
  }

  async findMine(userId: string) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) return [];
    return this.prisma.vehicle.findMany({ where: { rideGiverId: giver.id, isActive: true } });
  }

  async updateRcUrl(
    vehicleId: string,
    userId: string,
    rcUrl: string,
    parsedData?: Record<string, any> | null,
  ) {
    const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
    if (!giver) throw new ForbiddenException();
    const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, rideGiverId: giver.id } });
    if (!vehicle) throw new NotFoundException();

    // Mismatch detection — only when parsedData is provided
    let rcMatchStatus: string | null = null;
    let rcMismatchNote: string | null = null;

    if (parsedData) {
      const norm = (s?: string) => (s ?? '').toLowerCase().replace(/[\s\-_]/g, '');

      const parsedPlate = norm(parsedData.plateNumber);
      const vehiclePlate = norm(vehicle.plateNumber);
      const parsedMake  = norm(parsedData.make);
      const vehicleMake = norm(vehicle.make);
      const parsedModel = norm(parsedData.model);
      const vehicleModel = norm(vehicle.model);

      const plateMatch = parsedPlate && parsedPlate === vehiclePlate;
      const makeMatch  = !parsedMake  || parsedMake.includes(vehicleMake) || vehicleMake.includes(parsedMake);
      const modelMatch = !parsedModel || parsedModel.includes(vehicleModel) || vehicleModel.includes(parsedModel);

      if (!plateMatch && parsedPlate) {
        rcMatchStatus  = 'MISMATCH';
        rcMismatchNote = `RC plate "${parsedData.plateNumber}" does not match vehicle plate "${vehicle.plateNumber}"`;
      } else if ((!makeMatch || !modelMatch) && (parsedMake || parsedModel)) {
        rcMatchStatus  = 'MISMATCH';
        rcMismatchNote = `RC shows "${parsedData.make || ''} ${parsedData.model || ''}".trim() but vehicle is "${vehicle.make} ${vehicle.model}"`;
      } else {
        rcMatchStatus = 'MATCHED';
      }
    }

    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        rcUrl,
        ...(parsedData        ? { rcParsedData: parsedData }       : {}),
        ...(rcMatchStatus     ? { rcMatchStatus }                   : {}),
        ...(rcMismatchNote    ? { rcMismatchNote }                  : {}),
      },
    });
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
