import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class UploadsService implements OnModuleInit {
    private config;
    private readonly logger;
    private client;
    private readonly bucketDocuments;
    private readonly bucketPhotos;
    private readonly endpoint;
    private readonly port;
    private readonly useSSL;
    constructor(config: ConfigService);
    onModuleInit(): Promise<void>;
    private ensureBuckets;
    uploadDocument(file: Express.Multer.File, userId: string, docType: 'employee_id' | 'driving_license' | 'rc' | 'profile_photo'): Promise<string>;
    getPresignedUrl(objectPath: string, expirySeconds?: number): Promise<string>;
    isAvailable(): Promise<boolean>;
}
