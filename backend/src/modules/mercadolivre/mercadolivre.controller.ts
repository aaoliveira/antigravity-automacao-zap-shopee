import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
  TenantId,
} from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { MercadoLivreService } from './mercadolivre.service';
import {
  CreateMlOfferDto,
  ExchangeMlCodeDto,
  ExtensionSyncDto,
  SaveMlOAuthCredentialsDto,
  SaveMlPrototypeConfigDto,
  SearchMlProductsDto,
  TestMlConversionDto,
  UpdateMlOfferDto,
} from './dto/mercadolivre.dto';

@Controller('mercadolivre')
export class MercadoLivreController {
  constructor(private readonly mlService: MercadoLivreService) {}

  @Get('status')
  async getStatus(@TenantId() tenantId: string) {
    const data = await this.mlService.getStatusOverview(tenantId);
    return { success: true, data };
  }

  // --- Alternativa B ---

  @Post('prototype/config')
  @HttpCode(HttpStatus.CREATED)
  async savePrototypeConfig(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveMlPrototypeConfigDto,
  ) {
    const data = await this.mlService.savePrototypeConfig(
      tenantId,
      user?.userId,
      dto,
    );
    return { success: true, data };
  }

  @Delete('prototype/config')
  async clearPrototypeConfig(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('accountId') accountId?: string,
  ) {
    const data = await this.mlService.clearPrototypeConfig(
      tenantId,
      user?.userId,
      accountId,
    );
    return { success: true, data };
  }

  @Post('prototype/pairing-token')
  @HttpCode(HttpStatus.CREATED)
  async createPairingToken(
    @TenantId() tenantId: string,
    @Body('accountId') accountId?: string,
  ) {
    const data = await this.mlService.createPairingToken(tenantId, accountId);
    return { success: true, data };
  }

  @Post('prototype/test-conversion')
  @HttpCode(HttpStatus.OK)
  async testConversion(
    @TenantId() tenantId: string,
    @Body() dto: TestMlConversionDto,
  ) {
    const data = await this.mlService.testConversion(tenantId, dto);
    return { success: true, data };
  }

  @Public()
  @Post('extension/sync')
  @HttpCode(HttpStatus.OK)
  async syncFromExtension(@Body() dto: ExtensionSyncDto) {
    const data = await this.mlService.syncFromExtension(dto);
    return { success: true, data };
  }

  // --- Alternativa A ---

  @Post('oauth/credentials')
  @HttpCode(HttpStatus.CREATED)
  async saveOAuthCredentials(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveMlOAuthCredentialsDto,
  ) {
    const data = await this.mlService.saveOAuthCredentials(
      tenantId,
      user?.userId,
      dto,
    );
    return { success: true, data };
  }

  @Get('oauth/authorize-url')
  async getAuthorizeUrl(
    @TenantId() tenantId: string,
    @Query('accountId') accountId?: string,
  ) {
    const data = await this.mlService.getOAuthAuthorizationUrl(
      tenantId,
      accountId,
    );
    return { success: true, data };
  }

  @Post('oauth/exchange')
  @HttpCode(HttpStatus.OK)
  async exchangeCode(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExchangeMlCodeDto,
  ) {
    const data = await this.mlService.exchangeOAuthCode(
      tenantId,
      user?.userId,
      dto,
    );
    return { success: true, data };
  }

  @Delete('oauth/disconnect')
  async disconnectOAuth(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('accountId') accountId?: string,
  ) {
    const data = await this.mlService.disconnectOAuth(
      tenantId,
      user?.userId,
      accountId,
    );
    return { success: true, data };
  }

  @Get('search')
  async searchProducts(
    @TenantId() tenantId: string,
    @Query() query: SearchMlProductsDto,
  ) {
    const data = await this.mlService.searchProducts(tenantId, query);
    return { success: true, data };
  }

  @Get('offers')
  async listOffers(@TenantId() tenantId: string) {
    const data = await this.mlService.listOffers(tenantId);
    return { success: true, data };
  }

  @Post('offers')
  @HttpCode(HttpStatus.CREATED)
  async createOffer(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMlOfferDto,
  ) {
    const data = await this.mlService.createOffer(tenantId, user?.userId, dto);
    return { success: true, data };
  }

  @Patch('offers/:id')
  async updateOffer(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMlOfferDto,
  ) {
    const data = await this.mlService.updateOffer(tenantId, id, dto);
    return { success: true, data };
  }

  @Delete('offers/:id')
  async removeOffer(
    @TenantId() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.mlService.removeOffer(tenantId, id);
    return { success: true, data };
  }
}
