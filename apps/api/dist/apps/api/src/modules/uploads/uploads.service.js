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
const Minio = require("minio");
const uuid_1 = require("uuid");
let UploadsService = UploadsService_1 = class UploadsService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(UploadsService_1.name);
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
    async ensureBuckets() {
        for (const bucket of [this.bucketDocuments, this.bucketPhotos]) {
            try {
                const exists = await this.client.bucketExists(bucket);
                if (!exists) {
                    await this.client.makeBucket(bucket, 'ap-south-1');
                    this.logger.log(`Created bucket: ${bucket}`);
                }
            }
            catch (err) {
                this.logger.warn(`MinIO not available: ${err.message}. Document uploads will be disabled.`);
                return;
            }
        }
        this.logger.log('✅ MinIO buckets ready');
    }
    async uploadDocument(file, userId, docType) {
        const bucket = docType === 'profile_photo' ? this.bucketPhotos : this.bucketDocuments;
        const ext = file.originalname.split('.').pop() || 'jpg';
        const objectName = `${userId}/${docType}/${(0, uuid_1.v4)()}.${ext}`;
        await this.client.putObject(bucket, objectName, file.buffer, file.size, { 'Content-Type': file.mimetype });
        return `${this.useSSL ? 'https' : 'http'}://${this.endpoint}:${this.port}/${bucket}/${objectName}`;
    }
    async getPresignedUrl(objectPath, expirySeconds = 900) {
        const [bucket, ...rest] = objectPath.replace(/^https?:\/\/[^/]+\//, '').split('/');
        const objectName = rest.join('/');
        return this.client.presignedGetObject(bucket, objectName, expirySeconds);
    }
    async isAvailable() {
        try {
            await this.client.listBuckets();
            return true;
        }
        catch {
            return false;
        }
    }
};
exports.UploadsService = UploadsService;
exports.UploadsService = UploadsService = UploadsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], UploadsService);
//# sourceMappingURL=uploads.service.js.map