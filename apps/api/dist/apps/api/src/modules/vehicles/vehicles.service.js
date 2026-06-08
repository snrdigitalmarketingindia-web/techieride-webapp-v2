"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VehiclesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let VehiclesService = class VehiclesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(userId, dto) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        if (!giver)
            throw new common_1.ForbiddenException('Only ride givers can add vehicles');
        try {
            return await this.prisma.vehicle.create({
                data: { rideGiverId: giver.id, ...dto },
            });
        }
        catch (e) {
            if (e?.code === 'P2002') {
                throw new common_1.ConflictException('A vehicle with this plate number already exists');
            }
            throw e;
        }
    }
    async findMine(userId) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        if (!giver)
            return [];
        return this.prisma.vehicle.findMany({ where: { rideGiverId: giver.id, isActive: true } });
    }
    async updateRcUrl(vehicleId, userId, rcUrl, parsedData) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        if (!giver)
            throw new common_1.ForbiddenException();
        const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, rideGiverId: giver.id } });
        if (!vehicle)
            throw new common_1.NotFoundException();
        if (parsedData) {
            const norm = (s) => (s ?? '').toLowerCase().replace(/[\s\-_]/g, '');
            const parsedPlate = norm(parsedData.plateNumber);
            const vehiclePlate = norm(vehicle.plateNumber);
            const parsedMake = norm(parsedData.make);
            const vehicleMake = norm(vehicle.make);
            const parsedModel = norm(parsedData.model);
            const vehicleModel = norm(vehicle.model);
            const plateMatch = !parsedPlate || parsedPlate === vehiclePlate;
            const makeMatch = !parsedMake || parsedMake.includes(vehicleMake) || vehicleMake.includes(parsedMake);
            const modelMatch = !parsedModel || parsedModel.includes(vehicleModel) || vehicleModel.includes(parsedModel);
            if (!plateMatch) {
                throw new common_1.BadRequestException(`RC plate "${parsedData.plateNumber}" does not match the vehicle plate "${vehicle.plateNumber}". Please correct the plate number.`);
            }
            if (!makeMatch || !modelMatch) {
                const rcVehicle = [parsedData.make, parsedData.model].filter(Boolean).join(' ');
                throw new common_1.BadRequestException(`Your RC is for "${rcVehicle}" but the vehicle is saved as "${vehicle.make} ${vehicle.model}". Please correct the vehicle details.`);
            }
        }
        return this.prisma.vehicle.update({
            where: { id: vehicleId },
            data: {
                rcUrl,
                ...(parsedData ? { rcParsedData: parsedData, rcMatchStatus: 'MATCHED' } : {}),
            },
        });
    }
    async remove(vehicleId, userId) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        if (!giver)
            throw new common_1.ForbiddenException();
        const vehicle = await this.prisma.vehicle.findFirst({ where: { id: vehicleId, rideGiverId: giver.id } });
        if (!vehicle)
            throw new common_1.NotFoundException('Vehicle not found');
        const activeRide = await this.prisma.ride.findFirst({
            where: { vehicleId, status: { in: ['PUBLISHED', 'ONGOING'] } },
        });
        if (activeRide) {
            throw new common_1.ConflictException('Cannot remove a vehicle that is used in an active ride. Cancel or complete the ride first.');
        }
        return this.prisma.vehicle.update({
            where: { id: vehicleId },
            data: { isActive: false },
        });
    }
};
exports.VehiclesService = VehiclesService;
exports.VehiclesService = VehiclesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], VehiclesService);
//# sourceMappingURL=vehicles.service.js.map