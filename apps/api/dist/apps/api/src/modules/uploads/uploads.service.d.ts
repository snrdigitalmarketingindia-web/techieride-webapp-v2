import { ConfigService } from '@nestjs/config';
export declare class UploadsService {
    private config;
    private readonly logger;
    private readonly configured;
    constructor(config: ConfigService);
    uploadDocument(file: Express.Multer.File, userId: string, docType: 'employee_id' | 'driving_license' | 'rc' | 'profile_photo'): Promise<string>;
    isAvailable(): Promise<boolean>;
    parseRcFromUrl(imageUrl: string): Promise<{
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
