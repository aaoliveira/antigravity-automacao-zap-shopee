import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CryptoVaultModule } from '../crypto-vault/crypto-vault.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';
import { MercadoLivreClient } from './mercadolivre.client';
import { MercadoLivreService } from './mercadolivre.service';
import { MercadoLivreController } from './mercadolivre.controller';

@Module({
  imports: [DatabaseModule, CryptoVaultModule, FeatureFlagsModule],
  controllers: [MercadoLivreController],
  providers: [MercadoLivreClient, MercadoLivreService],
  exports: [MercadoLivreService, MercadoLivreClient],
})
export class MercadoLivreModule {}
