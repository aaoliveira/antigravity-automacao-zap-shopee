import { Module } from '@nestjs/common';
import { ShopeeSignerService } from './shopee.signer';
import { ShopeeClientService } from './shopee.client';
import { ShopeeCredentialsService } from './shopee-credentials.service';
import { ShopeeCredentialsController } from './shopee-credentials.controller';

@Module({
  controllers: [ShopeeCredentialsController],
  providers: [
    ShopeeSignerService,
    ShopeeClientService,
    ShopeeCredentialsService,
  ],
  exports: [
    ShopeeSignerService,
    ShopeeClientService,
    ShopeeCredentialsService,
  ],
})
export class ShopeeModule {}
