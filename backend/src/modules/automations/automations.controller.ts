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
import { AutomationsService } from './automations.service';
import {
  CreateAutomationDto,
  UpdateAutomationDto,
  QueryAutomationsDto,
} from './dto/automations.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@Controller('automations')
@UseGuards(JwtAuthGuard)
export class AutomationsController {
  constructor(private readonly service: AutomationsService) {}

  @Get()
  async list(@TenantId() tenantId: string, @Query() query: QueryAutomationsDto) {
    const data = await this.service.findAllByTenant(tenantId, query);
    return { success: true, data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateAutomationDto,
  ) {
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
    @Body() dto: UpdateAutomationDto,
  ) {
    const data = await this.service.update(tenantId, id, dto);
    return { success: true, data };
  }

  @Patch(':id/pause')
  async pause(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.pause(tenantId, id);
    return { success: true, data };
  }

  @Patch(':id/deactivate')
  async deactivate(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.deactivate(tenantId, id);
    return { success: true, data };
  }

  @Patch(':id/resume')
  async resume(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.resume(tenantId, id);
    return { success: true, data };
  }

  @Post(':id/execute-now')
  @HttpCode(HttpStatus.ACCEPTED)
  async executeNow(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.executeNow(tenantId, id);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.remove(tenantId, id);
    return { success: true, data };
  }

  @Get(':id/executions')
  async getExecutions(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.getExecutions(tenantId, id);
    return { success: true, data };
  }
}
