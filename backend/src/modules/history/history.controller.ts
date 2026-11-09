import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { HistoryService, HistoryQueryDto } from './history.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@Controller('history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly service: HistoryService) {}

  @Get('executions')
  async listExecutions(
    @TenantId() tenantId: string,
    @Query() query: HistoryQueryDto,
  ) {
    const data = await this.service.listExecutions(tenantId, query);
    return { success: true, data };
  }

  @Get('executions/:id')
  async getDetails(@TenantId() tenantId: string, @Param('id') id: string) {
    const data = await this.service.getExecutionDetails(tenantId, id);
    return { success: true, data };
  }
}
