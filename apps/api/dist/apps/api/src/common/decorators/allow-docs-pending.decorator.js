"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllowDocsPending = exports.ALLOW_DOCS_PENDING_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.ALLOW_DOCS_PENDING_KEY = 'allowDocsPending';
const AllowDocsPending = () => (0, common_1.SetMetadata)(exports.ALLOW_DOCS_PENDING_KEY, true);
exports.AllowDocsPending = AllowDocsPending;
//# sourceMappingURL=allow-docs-pending.decorator.js.map