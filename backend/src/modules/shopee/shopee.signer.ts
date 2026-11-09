import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface ShopeeSignatureResult {
  authorizationHeader: string;
  timestamp: number;
  signature: string;
  payloadString: string;
}

@Injectable()
export class ShopeeSignerService {
  /**
   * Constrói o cabeçalho de autenticação oficial da Shopee Affiliate Open API.
   * Concatenação obrigatória: AppId + Timestamp + MinifiedPayload + Secret
   */
  generateAuthorization(
    appId: string,
    secret: string,
    payload: any,
    fixedTimestamp?: number,
  ): ShopeeSignatureResult {
    if (!appId || !secret) {
      throw new Error('AppId e Secret são obrigatórios para assinar requisições da Shopee.');
    }

    const timestamp = fixedTimestamp ?? Math.floor(Date.now() / 1000);
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

    // Concatenação estrita conforme contrato oficial da Shopee
    const factor = `${appId}${timestamp}${payloadString}${secret}`;
    const signature = crypto.createHash('sha256').update(factor, 'utf8').digest('hex').toLowerCase();

    const authorizationHeader = `SHA256 Credential=${appId},Timestamp=${timestamp},Signature=${signature}`;

    return {
      authorizationHeader,
      timestamp,
      signature,
      payloadString,
    };
  }
}
