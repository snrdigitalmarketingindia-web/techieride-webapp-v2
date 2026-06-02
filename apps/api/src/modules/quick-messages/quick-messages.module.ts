import { Module } from '@nestjs/common';
import { QuickMessagesController } from './quick-messages.controller';
import { QuickMessagesService } from './quick-messages.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [QuickMessagesController],
  providers: [QuickMessagesService],
})
export class QuickMessagesModule {}
