import { Module } from '@nestjs/common';
import { EvolutionClient } from './evolution.client';
import { EvolutionServersService } from './evolution-servers.service';
import { WhatsAppInstancesService } from './whatsapp-instances.service';
import { WhatsAppGroupsService } from './whatsapp-groups.service';
import { EvolutionServersController } from './evolution-servers.controller';
import { WhatsAppInstancesController } from './whatsapp-instances.controller';
import { WhatsAppGroupsController } from './whatsapp-groups.controller';
import { EvolutionWebhookController } from './evolution-webhook.controller';
import { DatabaseModule } from '../database/database.module';
import { CryptoVaultModule } from '../crypto-vault/crypto-vault.module';

@Module({
  imports: [DatabaseModule, CryptoVaultModule],
  controllers: [
    EvolutionServersController,
    WhatsAppInstancesController,
    WhatsAppGroupsController,
    EvolutionWebhookController,
  ],
  providers: [
    EvolutionClient,
    EvolutionServersService,
    WhatsAppInstancesService,
    WhatsAppGroupsService,
  ],
  exports: [
    EvolutionClient,
    EvolutionServersService,
    WhatsAppInstancesService,
    WhatsAppGroupsService,
  ],
})
export class EvolutionModule {}
