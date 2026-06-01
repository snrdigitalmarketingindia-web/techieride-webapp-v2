import { PrismaService } from '../../prisma/prisma.service';
import { CreateTemplateDto } from './dto/create-template.dto';
export declare class CommuteTemplatesService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(userId: string, dto: CreateTemplateDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        vehicleId: string;
        originName: string;
        originLat: number;
        originLng: number;
        destinationName: string;
        destinationLat: number;
        destinationLng: number;
        departureTime: string;
        totalSeats: number;
        rideGiverId: string;
        departureDays: number[];
        lastPublishedDate: Date | null;
    }>;
    findMine(userId: string): Promise<({
        vehicle: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            rcUrl: string | null;
            totalSeats: number;
            rideGiverId: string;
            make: string;
            model: string;
            year: number | null;
            color: string | null;
            plateNumber: string;
            rcVerified: boolean;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        vehicleId: string;
        originName: string;
        originLat: number;
        originLng: number;
        destinationName: string;
        destinationLat: number;
        destinationLng: number;
        departureTime: string;
        totalSeats: number;
        rideGiverId: string;
        departureDays: number[];
        lastPublishedDate: Date | null;
    })[]>;
    toggle(templateId: string, userId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        vehicleId: string;
        originName: string;
        originLat: number;
        originLng: number;
        destinationName: string;
        destinationLat: number;
        destinationLng: number;
        departureTime: string;
        totalSeats: number;
        rideGiverId: string;
        departureDays: number[];
        lastPublishedDate: Date | null;
    }>;
    remove(templateId: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
    autoPublishRides(): Promise<void>;
}
