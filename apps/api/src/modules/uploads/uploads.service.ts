import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly configured: boolean;

  constructor(private config: ConfigService) {
    const cloudName  = config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey     = config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret  = config.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
      this.configured = true;
      this.logger.log('✅ Cloudinary storage ready');
    } else {
      this.configured = false;
      this.logger.warn('Cloudinary credentials missing — uploads disabled');
    }
  }

  async uploadDocument(
    file: Express.Multer.File,
    userId: string,
    docType: 'employee_id' | 'driving_license' | 'rc' | 'profile_photo',
  ): Promise<string> {
    const folder = `techieride/${docType}/${userId}`;
    const publicId = `${folder}/${uuidv4()}`;

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder,
          public_id: uuidv4(),
          resource_type: 'auto',
          format: file.mimetype === 'application/pdf' ? 'pdf' : undefined,
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Upload failed'));
          resolve(result);
        },
      ).end(file.buffer);
    });

    return result.secure_url;
  }

  async isAvailable(): Promise<boolean> {
    return this.configured;
  }
}
