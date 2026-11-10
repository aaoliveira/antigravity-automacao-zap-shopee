import { Module } from '@nestjs/common';
import { EvolutionClient } from './evolution.client';
import { EvolutionServersService } from './evolution-servers.service';
import { WhatsAppInstancesService } from './whatsapp-instances.service';
import { WhatsAppGroupsService } from './whatsapp-groups.service';
import { EvolutionServersController } from './evolution-servers.controller';
import { WhatsAppInstancesController } from './whatsapp-instances.controller';
import { WhatsAppGroupsController } from './whatsapp-groups.controller';
import { EvolutionWebhookController } from './evolution-webhook.controller';
import { GroupLinksService } from './group-links.service';
import { GroupLinksController } from './group-links.controller';
import { PublicJoinController } from './public-join.controller';
import { DatabaseModule } from '../database/database.module';
import { CryptoVaultModule } from '../crypto-vault/crypto-vault.module';

@Module({
  imports: [DatabaseModule, CryptoVaultModule],
  controllers: [
    EvolutionServersController,
    WhatsAppInstancesController,
    WhatsAppGroupsController,
    EvolutionWebhookController,
    GroupLinksController,
    PublicJoinController,
  ],
  providers: [
    EvolutionClient,
    EvolutionServersService,
    WhatsAppInstancesService,
    WhatsAppGroupsService,
    GroupLinksService,
  ],
  exports: [
    EvolutionClient,
    EvolutionServersService,
    WhatsAppInstancesService,
    WhatsAppGroupsService,
    GroupLinksService,
  ],
})
export class EvolutionModule {}
