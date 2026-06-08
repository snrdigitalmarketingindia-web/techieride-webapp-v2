"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var UploadsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const cloudinary_1 = require("cloudinary");
const uuid_1 = require("uuid");
let UploadsService = UploadsService_1 = class UploadsService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(UploadsService_1.name);
        const cloudName = config.get('CLOUDINARY_CLOUD_NAME');
        const apiKey = config.get('CLOUDINARY_API_KEY');
        const apiSecret = config.get('CLOUDINARY_API_SECRET');
        if (cloudName && apiKey && apiSecret) {
            cloudinary_1.v2.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
            this.configured = true;
            this.logger.log('✅ Cloudinary storage ready');
        }
        else {
            this.configured = false;
            this.logger.warn('Cloudinary credentials missing — uploads disabled');
        }
    }
    async uploadDocument(file, userId, docType) {
        const folder = `techieride/${docType}/${userId}`;
        const result = await new Promise((resolve, reject) => {
            cloudinary_1.v2.uploader.upload_stream({
                folder,
                public_id: (0, uuid_1.v4)(),
                resource_type: 'auto',
                format: file.mimetype === 'application/pdf' ? 'pdf' : undefined,
            }, (error, result) => {
                if (error || !result)
                    return reject(error ?? new Error('Upload failed'));
                resolve(result);
            }).end(file.buffer);
        });
        return result.secure_url;
    }
    async isAvailable() {
        return this.configured;
    }
    async parseRcFromUrl(imageUrl) {
        const apiKey = this.config.get('GEMINI_API_KEY');
        if (!apiKey) {
            this.logger.warn('GEMINI_API_KEY not set — RC parsing skipped');
            return { readable: false, reason: 'RC parsing service not configured' };
        }
        let imageBase64;
        let mimeType;
        try {
            const resp = await fetch(imageUrl, { signal: AbortSignal.timeout(10_000) });
            if (!resp.ok)
                throw new Error(`Failed to fetch image: ${resp.status}`);
            const contentType = resp.headers.get('content-type') || 'image/jpeg';
            mimeType = contentType.split(';')[0].trim();
            const buf = await resp.arrayBuffer();
            imageBase64 = Buffer.from(buf).toString('base64');
        }
        catch (err) {
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
            const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
            });
            if (!geminiResp.ok) {
                const errText = await geminiResp.text();
                this.logger.warn(`Gemini API error ${geminiResp.status}: ${errText}`);
                return { readable: false, reason: 'RC analysis service temporarily unavailable' };
            }
            const geminiJson = await geminiResp.json();
            const rawText = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
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
                    make: parsed.make || undefined,
                    model: parsed.model || undefined,
                    year: parsed.year ?? null,
                    color: parsed.color || undefined,
                    plateNumber: parsed.plateNumber || undefined,
                    totalSeats: parsed.totalSeats ?? null,
                },
            };
        }
        catch (err) {
            this.logger.warn(`RC parse error: ${err.message}`);
            return { readable: false, reason: 'RC parsing failed unexpectedly' };
        }
    }
};
exports.UploadsService = UploadsService;
exports.UploadsService = UploadsService = UploadsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UploadsService);
//# sourceMappingURL=uploads.service.js.map