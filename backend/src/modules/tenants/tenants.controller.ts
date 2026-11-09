import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('current')
  async getCurrentTenant(@TenantId() tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado.');
    }

    return {
      success: true,
      data: tenant,
    };
  }

  // Rota de teste de recurso protegido por tenantId
  @Get('resources/:resourceId')
  async getTenantResource(
    @TenantId() tenantId: string,
    @Param('resourceId') resourceId: string,
  ) {
    // Procura recurso garantindo filtro de tenant_id
    const resource = await this.prisma.auditLog.findFirst({
      where: {
        id: resourceId,
        tenantId, // ESCOPO MANDATÓRIO DE TENANT
      },
    });

    if (!resource) {
      // Retorna 404 para não vazar a existência do recurso de outro tenant
      throw new NotFoundException('Recurso não encontrado.');
    }

    return {
      success: true,
      data: resource,
    };
  }
}
