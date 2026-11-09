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

  it('deve rejeitar appId ou secret vazios', () => {
    expect(() => signer.generateAuthorization('', 'secret', {})).toThrow();
    expect(() => signer.generateAuthorization('appId', '', {})).toThrow();
  });
});
