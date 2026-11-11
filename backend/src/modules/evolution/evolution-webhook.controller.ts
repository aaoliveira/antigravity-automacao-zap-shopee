import {
  Controller,
  Post,
  Headers,
  Body,
  UnauthorizedException,
  BadRequestException,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';
import { InstanceStatus } from '@prisma/client';

@Controller('webhooks/evolution')
export class EvolutionWebhookController {
  private readonly logger = new Logger(EvolutionWebhookController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('x-webhook-secret') secretHeader: string,
    @Body() payload: any,
  ) {
    const expectedSecret =
      process.env.EVOLUTION_WEBHOOK_SECRET ||
      (process.env.NODE_ENV !== 'production' ? 'evolution-default-webhook-secret' : '');

    if (!expectedSecret || !secretHeader) {
      this.logger.warn('Tentativa de acesso a webhook com x-webhook-secret ausente ou segredo não configurado.');
      throw new UnauthorizedException('Segredo de webhook inválido ou ausente.');
    }

    const headerBuf = Buffer.from(secretHeader);
    const expectedBuf = Buffer.from(expectedSecret);

    if (
      headerBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(headerBuf, expectedBuf)
    ) {
      this.logger.warn('Tentativa de acesso a webhook com x-webhook-secret inválido.');
      throw new UnauthorizedException('Segredo de webhook inválido ou ausente.');
    }

    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Payload de webhook inválido.');
    }

    const eventName = payload.event || payload.type;
    const instanceName = payload.instance;

    if (!eventName || !instanceName) {
      throw new BadRequestException('Evento ou nome da instância ausente no payload.');
    }

    // Busca a instância associada para vincular com o tenant correto
    const instance = await this.prisma.whatsAppInstance.findFirst({
      where: { instanceName },
    });

    if (!instance) {
      this.logger.warn(
        `Webhook recebido para instância desconhecida no banco: ${instanceName}. Ignorando processamento.`,
      );
      return { success: false, message: 'Instância não cadastrada no sistema.' };
    }

    // Processa de acordo com o tipo de evento
    let processed = false;

    if (eventName === 'connection.update' || eventName === 'CONNECTION_UPDATE') {
      const state = payload.data?.state;
      let newStatus: InstanceStatus = instance.status;

      if (state === 'open') {
        newStatus = InstanceStatus.CONNECTED;
      } else if (state === 'close') {
        newStatus = InstanceStatus.DISCONNECTED;
      } else if (state === 'connecting') {
        newStatus = InstanceStatus.CONNECTING;
      }

      await this.prisma.whatsAppInstance.update({
        where: { id: instance.id },
        data: {
          status: newStatus,
          qrCodeBase64: newStatus === InstanceStatus.CONNECTED ? null : instance.qrCodeBase64,
          lastConnectedAt: newStatus === InstanceStatus.CONNECTED ? new Date() : instance.lastConnectedAt,
          ...(newStatus === InstanceStatus.CONNECTED
            ? {
                circuitOpenUntil: null,
                consecutiveSendFailures: 0,
                lastErrorReason: null,
              }
            : {}),
        },
      });

      processed = true;
      this.logger.log(`Status da instância ${instanceName} atualizado para ${newStatus} via webhook.`);
    } else if (eventName === 'qrcode.updated' || eventName === 'QRCODE_UPDATED') {
      const base64 = payload.data?.qrcode?.base64;
      if (base64) {
        await this.prisma.whatsAppInstance.update({
          where: { id: instance.id },
          data: {
            qrCodeBase64: base64,
            status: InstanceStatus.CONNECTING,
          },
        });
        processed = true;
        this.logger.log(`QR Code da instância ${instanceName} atualizado via webhook.`);
      }
    }

    // Registra na tabela de auditoria de eventos de webhook
    await this.prisma.webhookEvent.create({
      data: {
        tenantId: instance.tenantId,
        provider: 'EVOLUTION',
        eventType: eventName,
        payloadJson: payload,
        processed,
      },
    });

    return { success: true, processed };
  }
}
