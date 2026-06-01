import { SetMetadata } from '@nestjs/common';
export const ALLOW_DOCS_PENDING_KEY = 'allowDocsPending';
export const AllowDocsPending = () => SetMetadata(ALLOW_DOCS_PENDING_KEY, true);
