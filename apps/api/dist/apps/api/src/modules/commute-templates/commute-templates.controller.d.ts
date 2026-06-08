import { CommuteTemplatesService } from './commute-templates.service';
import { CreateTemplateDto } from './dto/create-template.dto';
export declare class CommuteTemplatesController {
    private service;
    constructor(service: CommuteTemplatesService);
    create(userId: string, dto: CreateTemplateDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        rideGiverId: string;
        vehicleId: string;
        originName: string;
        originLat: number;
        originLng: number;
        destinationName: string;
        destinationLat: number;
        destinationLng: number;
        departureTime: string;
        totalSeats: number;
        departureDays: number[];
        lastPublishedDate: Date | null;
    }>;
    findMine(userId: string): Promise<({
        vehicle: {
            year: number | null;
            id: string;
            isActive: boolean;
            createdAt: Date;
            rcUrl: string | null;
            rideGiverId: string;
            totalSeats: number;
            make: string;
            model: string;
            color: string | null;
            plateNumber: string;
            rcVerified: boolean;
            rcMatchStatus: string | null;
            rcParsedData: import("@prisma/client/runtime/library").JsonValue | null;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        rideGiverId: string;
        vehicleId: string;
        originName: string;
        originLat: number;
        originLng: number;
        destinationName: string;
        destinationLat: number;
        destinationLng: number;
        departureTime: string;
        totalSeats: number;
        departureDays: number[];
        lastPublishedDate: Date | null;
    })[]>;
    toggle(id: string, userId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        rideGiverId: string;
        vehicleId: string;
        originName: string;
        originLat: number;
        originLng: number;
        destinationName: string;
        destinationLat: number;
        destinationLng: number;
        departureTime: string;
        totalSeats: number;
        departureDays: number[];
        lastPublishedDate: Date | null;
    }>;
    remove(id: string, userId: string): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
