import { UploadsService } from './uploads.service';
export declare class UploadsController {
    private uploads;
    constructor(uploads: UploadsService);
    uploadDocument(file: Express.Multer.File, userId: string, docType?: 'employee_id' | 'driving_license' | 'rc' | 'profile_photo'): Promise<{
        url: string;
        docType: "employee_id" | "driving_license" | "rc" | "profile_photo";
        message: string;
    }>;
    getStatus(): Promise<{
        available: boolean;
        message: string;
    }>;
    parseRc(imageUrl: string): Promise<{
        readable: boolean;
        reason?: string;
        data?: {
            make?: string;
            model?: string;
            year?: number | null;
            color?: string;
            plateNumber?: string;
            totalSeats?: number | null;
        };
    }>;
}
