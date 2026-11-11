import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CouponsService } from './coupons.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  QueryCouponsDto,
} from './dto/coupons.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@Controller('coupons')
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(private readonly service: CouponsService) {}

  @Get('platforms')
  listPlatforms() {
    return {
      success: true,
      data: this.service.getPlatforms(),
    };
  }

  @Get()
  async list(@TenantId() tenantId: string, @Query() query: QueryCouponsDto) {
    const result = await this.service.findAllByTenant(tenantId, query);
    return {
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        maxLimit: result.maxLimit,
      },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@TenantId() tenantId: string, @Body() dto: CreateCouponDto) {
    const data = await this.service.create(tenantId, dto);
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
    @Body() dto: UpdateCouponDto,
  ) {
    const data = await this.service.update(tenantId, id, dto);
    return { success: true, data };
  }

  @Patch(':id/toggle')
  async toggleActive(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.toggleActive(tenantId, id);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
