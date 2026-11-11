import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
  TenantId,
} from '../../common/decorators/current-user.decorator';
import { FeatureFlagsService } from './feature-flags.service';
import { UpdateFeatureFlagsDto } from './dto/feature-flags.dto';

@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  async getFlags(@TenantId() tenantId: string) {
    const data = await this.featureFlagsService.getFlagsForTenant(tenantId);
    return { success: true, data };
  }

  @Patch()
  async updateFlags(
    @TenantId() tenantId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateFeatureFlagsDto,
  ) {
    const data = await this.featureFlagsService.updateFlagsForTenant(
      tenantId,
      user?.userId,
      dto,
    );
    return { success: true, data };
  }
}
