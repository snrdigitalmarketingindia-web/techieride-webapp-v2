import { PrismaService } from '../../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
export declare class VehiclesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(userId: string, dto: CreateVehicleDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        totalSeats: number;
        rideGiverId: string;
        make: string;
        model: string;
        year: number | null;
        color: string | null;
        plateNumber: string;
        rcUrl: string | null;
        rcVerified: boolean;
    }>;
    findMine(userId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        totalSeats: number;
        rideGiverId: string;
        make: string;
        model: string;
        year: number | null;
        color: string | null;
        plateNumber: string;
        rcUrl: string | null;
        rcVerified: boolean;
    }[]>;
    updateRcUrl(vehicleId: string, userId: string, rcUrl: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        totalSeats: number;
        rideGiverId: string;
        make: string;
        model: string;
        year: number | null;
        color: string | null;
        plateNumber: string;
        rcUrl: string | null;
        rcVerified: boolean;
    }>;
    remove(vehicleId: string, userId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        totalSeats: number;
        rideGiverId: string;
        make: string;
        model: string;
        year: number | null;
        color: string | null;
        plateNumber: string;
        rcUrl: string | null;
        rcVerified: boolean;
    }>;
}
