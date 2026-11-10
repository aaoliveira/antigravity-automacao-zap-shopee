import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EvolutionServersService } from './evolution-servers.service';
import {
  CreateEvolutionServerDto,
  UpdateEvolutionServerDto,
  ConnectDockerEvolutionDto,
} from './dto/evolution.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@Controller('evolution-servers')
@UseGuards(JwtAuthGuard)
export class EvolutionServersController {
  constructor(private readonly service: EvolutionServersService) {}

  @Get()
  async list(@TenantId() tenantId: string) {
    const data = await this.service.findAllByTenant(tenantId);
    return { success: true, data };
  }

  @Get('docker/status')
  async dockerStatus(@TenantId() tenantId: string) {
    const data = await this.service.getDockerStatus(tenantId);
    return { success: true, data };
  }

  @Post('docker')
  @HttpCode(HttpStatus.CREATED)
  async connectDocker(
    @TenantId() tenantId: string,
    @Body() dto: ConnectDockerEvolutionDto,
  ) {
    const data = await this.service.provisionDockerServer(tenantId, dto);
    return { success: true, data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateEvolutionServerDto,
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
    @Body() dto: UpdateEvolutionServerDto,
  ) {
    const data = await this.service.update(tenantId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.remove(tenantId, id);
    return { success: true, data };
  }
}
