import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { QueueModule } from '../queue/queue.module';
import { ShopeeModule } from '../shopee/shopee.module';
import { CryptoVaultModule } from '../crypto-vault/crypto-vault.module';
import { EvolutionModule } from '../evolution/evolution.module';
import { CouponsModule } from '../coupons/coupons.module';

import { AutomationsService } from './automations.service';
import { AutomationsSchedulerService } from './automations-scheduler.service';
import { AutomationsExecutorService } from './automations-executor.service';
import { AutomationsProcessor } from './automations.processor';
import { AutomationsController } from './automations.controller';

@Module({
  imports: [
    DatabaseModule,
    QueueModule,
    ShopeeModule,
    CryptoVaultModule,
    EvolutionModule,
    CouponsModule,
  ],
  controllers: [AutomationsController],
  providers: [
    AutomationsService,
    AutomationsSchedulerService,
    AutomationsExecutorService,
    AutomationsProcessor,
  ],
  exports: [
    AutomationsService,
    AutomationsSchedulerService,
    AutomationsExecutorService,
  ],
})
export class AutomationsModule {}
