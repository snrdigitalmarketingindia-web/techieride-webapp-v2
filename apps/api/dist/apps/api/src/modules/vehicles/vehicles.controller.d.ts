import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
export declare class VehiclesController {
    private service;
    constructor(service: VehiclesService);
    create(userId: string, dto: CreateVehicleDto): Promise<{
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
    }>;
    findMine(userId: string): Promise<{
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
    }[]>;
    updateRc(id: string, userId: string, rcUrl: string): Promise<{
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
    }>;
    remove(id: string, userId: string): Promise<{
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
    }>;
}
