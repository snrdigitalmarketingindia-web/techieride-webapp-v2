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

  /**
   * Uses Google Gemini Flash vision to extract vehicle details from an RC image URL.
   * Returns { readable: false, reason } if image is blurry/unreadable.
   * Returns { readable: true, data: { make, model, ... } } if successfully parsed.
   */
  async parseRcFromUrl(imageUrl: string): Promise<{
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
  }> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not set — RC parsing skipped');
      return { readable: false, reason: 'RC parsing service not configured' };
    }

    // Fetch image bytes from Cloudinary URL (10s timeout — guards against hangs in CI/test envs)
    let imageBase64: string;
    let mimeType: string;
    try {
      const resp = await fetch(imageUrl, { signal: AbortSignal.timeout(10_000) });
      if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
      const contentType = resp.headers.get('content-type') || 'image/jpeg';
      mimeType = contentType.split(';')[0].trim();
      const buf = await resp.arrayBuffer();
      imageBase64 = Buffer.from(buf).toString('base64');
    } catch (err: any) {
      this.logger.warn(`RC image fetch failed: ${err.message}`);
      return { readable: false, reason: 'Could not download the uploaded RC image' };
    }

    const prompt = `You are analyzing an Indian vehicle Registration Certificate (RC) image.

Extract vehicle details and return ONLY a JSON object. If the image is blurry, dark, rotated, or too unclear to reliably read key fields, set "readable" to false.

Return exactly this structure:
{
  "readable": true or false,
  "unreadableReason": "describe why if readable is false, otherwise omit",
  "make": "manufacturer brand (e.g. Maruti Suzuki, Honda, Hyundai, Tata Motors)",
  "model": "model name (e.g. Swift, City, i20, Nexon, Innova)",
  "year": manufacturing year as integer or null,
  "color": "vehicle color exactly as printed on RC",
  "plateNumber": "registration number without spaces or hyphens (e.g. TS09AB1234)",
  "totalSeats": passenger seating capacity as integer EXCLUDING the driver (so a 5-seater car = 4), or null
}

Return only valid JSON. No markdown, no explanation, no code blocks.`;

    try {
      const geminiResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: imageBase64 } },
                { text: prompt },
              ],
            }],
            generationConfig: { temperature: 0, maxOutputTokens: 512 },
          }),
        },
      );

      if (!geminiResp.ok) {
        const errText = await geminiResp.text();
        this.logger.warn(`Gemini API error ${geminiResp.status}: ${errText}`);
        return { readable: false, reason: 'RC analysis service temporarily unavailable' };
      }

      const geminiJson: any = await geminiResp.json();
      const rawText: string = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      // Extract JSON from response (handle any accidental wrapping)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn(`Gemini returned non-JSON: ${rawText}`);
        return { readable: false, reason: 'Could not parse RC response from AI' };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.readable) {
        return {
          readable: false,
          reason: parsed.unreadableReason || 'RC image is not clear enough to read',
        };
      }

      return {
        readable: true,
        data: {
          make:        parsed.make        || undefined,
          model:       parsed.model       || undefined,
          year:        parsed.year        ?? null,
          color:       parsed.color       || undefined,
          plateNumber: parsed.plateNumber || undefined,
          totalSeats:  parsed.totalSeats  ?? null,
        },
      };
    } catch (err: any) {
      this.logger.warn(`RC parse error: ${err.message}`);
      return { readable: false, reason: 'RC parsing failed unexpectedly' };
    }
  }
}
