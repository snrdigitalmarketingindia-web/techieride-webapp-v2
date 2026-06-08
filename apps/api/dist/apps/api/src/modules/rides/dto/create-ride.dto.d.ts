export declare class CreateRideDto {
    vehicleId: string;
    originName: string;
    originLat: number;
    originLng: number;
    destinationName: string;
    destinationLat: number;
    destinationLng: number;
    departureDate: string;
    departureTime: string;
    totalSeats: number;
    notes?: string;
    womenOnly?: boolean;
}
