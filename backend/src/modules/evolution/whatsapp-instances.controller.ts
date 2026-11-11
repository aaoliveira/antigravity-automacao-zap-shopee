import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WhatsAppInstancesService } from './whatsapp-instances.service';
import {
  CreateWhatsAppInstanceDto,
  UpdateInstanceSafetySettingsDto,
} from './dto/evolution.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@Controller('whatsapp-instances')
@UseGuards(JwtAuthGuard)
export class WhatsAppInstancesController {
  constructor(private readonly service: WhatsAppInstancesService) {}

  @Get()
  async list(@TenantId() tenantId: string) {
    const data = await this.service.findAllByTenant(tenantId);
    return { success: true, data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateWhatsAppInstanceDto,
  ) {
    const data = await this.service.create(tenantId, dto);
    return { success: true, data };
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.findOne(tenantId, id);
    return { success: true, data };
  }

  @Get(':id/qrcode')
  async getQrCode(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.getQrCode(tenantId, id);
    return { success: true, data };
  }

  @Get(':id/status')
  async getStatus(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.getStatus(tenantId, id);
    return { success: true, data };
  }

  @Post(':id/logout')
  @HttpCode(HttpStatus.OK)
  async logout(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.logout(tenantId, id);
    return { success: true, data };
  }

  @Patch(':id/safety-settings')
  async updateSafetySettings(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInstanceSafetySettingsDto,
  ) {
    const data = await this.service.updateSafetySettings(tenantId, id, dto);
    return { success: true, data };
  }

  @Post(':id/reset-circuit')
  @HttpCode(HttpStatus.OK)
  async resetCircuit(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.resetCircuitBreaker(tenantId, id);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.remove(tenantId, id);
    return { success: true, data };
  }
}
