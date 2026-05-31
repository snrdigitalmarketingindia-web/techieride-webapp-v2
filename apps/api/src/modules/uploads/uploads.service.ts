import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly logger = new Logger(UploadsService.name);
  private client: Minio.Client;
  private readonly bucketDocuments: string;
  private readonly bucketPhotos: string;
  private readonly endpoint: string;
  private readonly port: number;
  private readonly useSSL: boolean;

  constructor(private config: ConfigService) {
    this.endpoint = config.get('MINIO_ENDPOINT', 'localhost');
    this.port = parseInt(config.get('MINIO_PORT', '9000'), 10);
    this.useSSL = config.get('MINIO_USE_SSL', 'false') === 'true';
    this.bucketDocuments = config.get('MINIO_BUCKET_DOCUMENTS', 'user-documents');
    this.bucketPhotos = config.get('MINIO_BUCKET_PHOTOS', 'profile-photos');

    this.client = new Minio.Client({
      endPoint: this.endpoint,
      port: this.port,
      useSSL: this.useSSL,
      accessKey: config.get('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: config.get('MINIO_SECRET_KEY', 'minioadmin'),
    });
  }

  async onModuleInit() {
    await this.ensureBuckets();
  }

  private async ensureBuckets() {
    for (const bucket of [this.bucketDocuments, this.bucketPhotos]) {
      try {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
          await this.client.makeBucket(bucket, 'ap-south-1');
          this.logger.log(`Created bucket: ${bucket}`);
        }
      } catch (err) {
        this.logger.warn(`MinIO not available: ${err.message}. Document uploads will be disabled.`);
        return;
      }
    }
    this.logger.log('✅ MinIO buckets ready');
  }

  async uploadDocument(
    file: Express.Multer.File,
    userId: string,
    docType: 'employee_id' | 'driving_license' | 'rc' | 'profile_photo',
  ): Promise<string> {
    const bucket = docType === 'profile_photo' ? this.bucketPhotos : this.bucketDocuments;
    const ext = file.originalname.split('.').pop() || 'jpg';
    const objectName = `${userId}/${docType}/${uuidv4()}.${ext}`;

    await this.client.putObject(
      bucket,
      objectName,
      file.buffer,
      file.size,
      { 'Content-Type': file.mimetype },
    );

    return `${this.useSSL ? 'https' : 'http'}://${this.endpoint}:${this.port}/${bucket}/${objectName}`;
  }

  async getPresignedUrl(objectPath: string, expirySeconds = 900): Promise<string> {
    // objectPath format: "bucket/objectName"
    const [bucket, ...rest] = objectPath.replace(/^https?:\/\/[^/]+\//, '').split('/');
    const objectName = rest.join('/');
    return this.client.presignedGetObject(bucket, objectName, expirySeconds);
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.listBuckets();
      return true;
    } catch {
      return false;
    }
  }
}
