import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class HistoryModule {}
