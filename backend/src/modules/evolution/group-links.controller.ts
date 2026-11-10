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
import { GroupLinksService } from './group-links.service';
import { CreateGroupLinkDto, UpdateGroupLinkDto } from './dto/group-links.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@Controller('group-links')
@UseGuards(JwtAuthGuard)
export class GroupLinksController {
  constructor(private readonly service: GroupLinksService) {}

  @Get()
  async list(@TenantId() tenantId: string) {
    const data = await this.service.findAllByTenant(tenantId);
    return { success: true, data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @TenantId() tenantId: string,
    @Body() dto: CreateGroupLinkDto,
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
    @Body() dto: UpdateGroupLinkDto,
  ) {
    const data = await this.service.update(tenantId, id, dto);
    return { success: true, data };
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.OK)
  async sync(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.syncLinkTargets(tenantId, id);
    return { success: true, data };
  }

  @Delete(':id')
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id);
  }
}
