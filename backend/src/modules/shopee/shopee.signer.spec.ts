import { ShopeeSignerService } from './shopee.signer';
import * as crypto from 'crypto';

describe('ShopeeSignerService (Assinatura HMAC/SHA-256 Oficial)', () => {
  let signer: ShopeeSignerService;

  beforeEach(() => {
    signer = new ShopeeSignerService();
  });

  it('deve gerar assinatura e header Authorization com formato exato', () => {
    const appId = '123456';
    const secret = 'shopee_secret_key_abc';
    const timestamp = 1731150000;
    const payload = { query: 'mutation { generateShortLink(input: { originUrl: "https://shopee.com.br/test" }) { shortLink } }' };

    const result = signer.generateAuthorization(appId, secret, payload, timestamp);

    const payloadString = JSON.stringify(payload);
    const expectedFactor = `${appId}${timestamp}${payloadString}${secret}`;
    const expectedSignature = crypto.createHash('sha256').update(expectedFactor).digest('hex').toLowerCase();

    expect(result.signature).toEqual(expectedSignature);
    expect(result.timestamp).toEqual(timestamp);
    expect(result.authorizationHeader).toEqual(
      `SHA256 Credential=${appId},Timestamp=${timestamp},Signature=${expectedSignature}`,
    );
  });

  it('deve gerar assinaturas distintas se qualquer parâmetro ou espaço no JSON mudar', () => {
    const appId = '123456';
    const secret = 'shopee_secret_key_abc';
    const timestamp = 1731150000;

    const payload1 = { query: 'mutation { ping }' };
    const payload2 = { query: 'mutation { ping  }' }; // espaço extra

    const res1 = signer.generateAuthorization(appId, secret, payload1, timestamp);
    const res2 = signer.generateAuthorization(appId, secret, payload2, timestamp);

    expect(res1.signature).not.toEqual(res2.signature);
  });

  it('deve reproduzir exatamente o vetor oficial publicado na documentação da Shopee Brasil', () => {
    const payload = {
      query: '{\nbrandOffer{\n    nodes{\n        commissionRate\n        offerName\n    }\n}\n}',
    };
    const result = signer.generateAuthorization('123456', 'demo', payload, 1577836800);

    expect(result.signature).toBe(
      'dc88d72feea70c80c52c3399751a7d34966763f51a7f056aa070a5e9df645412',
    );
    expect(result.authorizationHeader).toBe(
      'SHA256 Credential=123456,Timestamp=1577836800,Signature=dc88d72feea70c80c52c3399751a7d34966763f51a7f056aa070a5e9df645412',
    );
  });

  it('deve rejeitar appId ou secret vazios', () => {
    expect(() => signer.generateAuthorization('', 'secret', {})).toThrow();
    expect(() => signer.generateAuthorization('appId', '', {})).toThrow();
  });
});
