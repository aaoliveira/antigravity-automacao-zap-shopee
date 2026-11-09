import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WhatsAppGroupsService } from './whatsapp-groups.service';
import { QueryGroupsDto } from './dto/evolution.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@Controller('whatsapp-groups')
@UseGuards(JwtAuthGuard)
export class WhatsAppGroupsController {
  constructor(private readonly service: WhatsAppGroupsService) {}

  @Get()
  async list(@TenantId() tenantId: string, @Query() query: QueryGroupsDto) {
    const data = await this.service.findAllByTenant(tenantId, query);
    return { success: true, data };
  }

  @Post('sync/:instanceId')
  @HttpCode(HttpStatus.OK)
  async syncGroups(
    @TenantId() tenantId: string,
    @Param('instanceId') instanceId: string,
  ) {
    const data = await this.service.syncGroups(tenantId, instanceId);
    return { success: true, data };
  }

  @Post(':id/send-media')
  @HttpCode(HttpStatus.OK)
  async sendMedia(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body()
    body: {
      mediaUrl: string;
      titulo: string;
      preco: string;
      link_afiliado: string;
      captionTemplate?: string;
    },
  ) {
    const data = await this.service.sendMediaToGroup(tenantId, id, {
      mediaUrl: body.mediaUrl,
      captionParams: {
        titulo: body.titulo,
        preco: body.preco,
        link_afiliado: body.link_afiliado,
      },
      captionTemplate: body.captionTemplate,
    });
    return { success: true, data };
  }

  @Post(':id/send-text')
  @HttpCode(HttpStatus.OK)
  async sendText(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() body: { text: string },
  ) {
    const data = await this.service.sendTextToGroup(tenantId, id, body.text);
    return { success: true, data };
  }
}
