import {
  Controller, Post, UseInterceptors, UploadedFile,
  BadRequestException, Query, Get, Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { UploadsService } from './uploads.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AllowUnverified } from '../../common/decorators/allow-unverified.decorator';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  @AllowUnverified() // needed so EMAIL_VERIFICATION_PENDING users can upload their company ID for exception requests
  @Post('document')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: MAX_SIZE },
    fileFilter: (_, file, cb) => {
      if (!ALLOWED_TYPES.includes(file.mimetype)) {
        return cb(new BadRequestException('Only JPG, PNG, WebP, PDF allowed'), false);
      }
      cb(null, true);
    },
  }))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('id') userId: string,
    @Query('type') docType: 'employee_id' | 'govt_id' | 'driving_license' | 'rc' | 'profile_photo' = 'employee_id',
  ) {
    if (!file) throw new BadRequestException('No file provided');

    const available = await this.uploads.isAvailable();
    if (!available) {
      throw new BadRequestException('Document storage is not available. Please try again later.');
    }

    const url = await this.uploads.uploadDocument(file, userId, docType);
    return { url, docType, message: 'Upload successful' };
  }

  @Get('status')
  async getStatus() {
    const available = await this.uploads.isAvailable();
    return { available, message: available ? 'Cloudinary storage ready' : 'Storage not available' };
  }

  /**
   * Parse an already-uploaded RC image URL using Gemini Flash vision.
   * Returns { readable, data } or { readable: false, reason }.
   */
  @Post('parse-rc')
  async parseRc(@Body('imageUrl') imageUrl: string) {
    if (!imageUrl) throw new BadRequestException('imageUrl is required');
    return this.uploads.parseRcFromUrl(imageUrl);
  }
}
