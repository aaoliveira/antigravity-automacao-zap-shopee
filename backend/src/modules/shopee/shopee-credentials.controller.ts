import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ShopeeCredentialsService } from './shopee-credentials.service';
import {
  CreateShopeeCredentialDto,
  UpdateShopeeCredentialDto,
  SearchProductsDto,
  GenerateShortLinkDto,
} from './dto/shopee.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@Controller('shopee-credentials')
@UseGuards(JwtAuthGuard)
export class ShopeeCredentialsController {
  constructor(private readonly service: ShopeeCredentialsService) {}

  @Get()
  async list(@TenantId() tenantId: string) {
    const data = await this.service.findAllByTenant(tenantId);
    return { success: true, data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateShopeeCredentialDto,
  ) {
    const data = await this.service.create(tenantId, dto);
    return { success: true, data };
  }

  @Get('products')
  async searchProducts(
    @TenantId() tenantId: string,
    @Query() dto: SearchProductsDto,
  ) {
    const data = await this.service.searchProductsForTenant(tenantId, dto);
    return { success: true, data };
  }

  @Post('short-link')
  @HttpCode(HttpStatus.OK)
  async generateShortLink(
    @TenantId() tenantId: string,
    @Body() dto: GenerateShortLinkDto,
  ) {
    const data = await this.service.generateShortLinkForTenant(tenantId, dto);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.findOne(tenantId, id);
    return { success: true, data };
  }

  @Put(':id')
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateShopeeCredentialDto,
  ) {
    const data = await this.service.update(tenantId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.remove(tenantId, id);
    return { success: true, data };
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  async revalidate(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.revalidate(tenantId, id);
    return { success: true, data };
  }
}
