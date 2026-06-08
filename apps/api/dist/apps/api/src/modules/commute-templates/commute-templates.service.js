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
var CommuteTemplatesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommuteTemplatesService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../../prisma/prisma.service");
const common_2 = require("@nestjs/common");
let CommuteTemplatesService = CommuteTemplatesService_1 = class CommuteTemplatesService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_2.Logger(CommuteTemplatesService_1.name);
    }
    async create(userId, dto) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        if (!giver)
            throw new common_1.ForbiddenException('Only ride givers can create templates');
        return this.prisma.commuteTemplate.create({
            data: { rideGiverId: giver.id, ...dto },
        });
    }
    async findMine(userId) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        if (!giver)
            return [];
        return this.prisma.commuteTemplate.findMany({
            where: { rideGiverId: giver.id },
            include: { vehicle: true },
        });
    }
    async toggle(templateId, userId) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        if (!giver)
            throw new common_1.ForbiddenException();
        const template = await this.prisma.commuteTemplate.findFirst({
            where: { id: templateId, rideGiverId: giver.id },
        });
        if (!template)
            throw new common_1.ForbiddenException('Template not found');
        return this.prisma.commuteTemplate.update({
            where: { id: templateId },
            data: { isActive: !template.isActive },
        });
    }
    async remove(templateId, userId) {
        const giver = await this.prisma.rideGiver.findUnique({ where: { userId } });
        if (!giver)
            throw new common_1.ForbiddenException();
        return this.prisma.commuteTemplate.deleteMany({
            where: { id: templateId, rideGiverId: giver.id },
        });
    }
    async autoPublishRides() {
        this.logger.log('⏰ Auto-publishing rides from templates...');
        const today = new Date();
        const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
        const templates = await this.prisma.commuteTemplate.findMany({
            where: { isActive: true },
        });
        let created = 0;
        for (const template of templates) {
            if (!template.departureDays.includes(dayOfWeek))
                continue;
            const existingRide = await this.prisma.ride.findFirst({
                where: {
                    templateId: template.id,
                    departureDate: {
                        gte: new Date(today.toDateString()),
                        lt: new Date(today.getTime() + 86400000),
                    },
                },
            });
            if (existingRide)
                continue;
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
};
exports.CommuteTemplatesService = CommuteTemplatesService;
__decorate([
    (0, schedule_1.Cron)('30 0 * * 1-5', { timeZone: 'Asia/Kolkata' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], CommuteTemplatesService.prototype, "autoPublishRides", null);
exports.CommuteTemplatesService = CommuteTemplatesService = CommuteTemplatesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CommuteTemplatesService);
//# sourceMappingURL=commute-templates.service.js.map