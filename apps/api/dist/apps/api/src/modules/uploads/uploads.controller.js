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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const multer_1 = require("multer");
const uploads_service_1 = require("./uploads.service");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024;
let UploadsController = class UploadsController {
    constructor(uploads) {
        this.uploads = uploads;
    }
    async uploadDocument(file, userId, docType = 'employee_id') {
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        const available = await this.uploads.isAvailable();
        if (!available) {
            throw new common_1.BadRequestException('Document storage is not available. Please try again later.');
        }
        const url = await this.uploads.uploadDocument(file, userId, docType);
        return { url, docType, message: 'Upload successful' };
    }
    async getStatus() {
        const available = await this.uploads.isAvailable();
        return { available, message: available ? 'Cloudinary storage ready' : 'Storage not available' };
    }
    async parseRc(imageUrl) {
        if (!imageUrl)
            throw new common_1.BadRequestException('imageUrl is required');
        return this.uploads.parseRcFromUrl(imageUrl);
    }
};
exports.UploadsController = UploadsController;
__decorate([
    (0, common_1.Post)('document'),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: MAX_SIZE },
        fileFilter: (_, file, cb) => {
            if (!ALLOWED_TYPES.includes(file.mimetype)) {
                return cb(new common_1.BadRequestException('Only JPG, PNG, WebP, PDF allowed'), false);
            }
            cb(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)('id')),
    __param(2, (0, common_1.Query)('type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadDocument", null);
__decorate([
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('parse-rc'),
    __param(0, (0, common_1.Body)('imageUrl')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "parseRc", null);
exports.UploadsController = UploadsController = __decorate([
    (0, swagger_1.ApiTags)('Uploads'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('uploads'),
    __metadata("design:paramtypes", [uploads_service_1.UploadsService])
], UploadsController);
//# sourceMappingURL=uploads.controller.js.map