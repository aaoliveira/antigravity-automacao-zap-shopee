import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  async getSummary(@TenantId() tenantId: string) {
    const data = await this.service.getSummary(tenantId);
    return { success: true, data };
  }

  @Get('upcoming')
  async getUpcoming(@TenantId() tenantId: string) {
    const data = await this.service.getUpcoming(tenantId);
    return { success: true, data };
  }
}
