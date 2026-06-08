"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllowUnverified = exports.ALLOW_UNVERIFIED_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.ALLOW_UNVERIFIED_KEY = 'allowUnverified';
const AllowUnverified = () => (0, common_1.SetMetadata)(exports.ALLOW_UNVERIFIED_KEY, true);
exports.AllowUnverified = AllowUnverified;
//# sourceMappingURL=allow-unverified.decorator.js.map