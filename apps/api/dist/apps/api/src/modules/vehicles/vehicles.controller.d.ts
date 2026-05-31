import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
export declare class VehiclesController {
    private service;
    constructor(service: VehiclesService);
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
    remove(id: string, userId: string): Promise<{
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
