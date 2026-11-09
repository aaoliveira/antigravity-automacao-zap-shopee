import { CryptoVaultService } from './crypto-vault.service';

describe('CryptoVaultService (AES-256-GCM)', () => {
  let service: CryptoVaultService;

  beforeEach(() => {
    process.env.ENCRYPTION_MASTER_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    service = new CryptoVaultService();
  });

  it('deve cifrar e decifrar um texto claro com sucesso', () => {
    const secret = 'shopee_secret_super_confidencial_xyz_123';
    const encrypted = service.encrypt(secret);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toEqual(secret);
    expect(encrypted.split(':')).toHaveLength(3); // iv:ciphertext:tag

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toEqual(secret);
  });

  it('deve falhar a decifragem se a tag ou ciphertext for adulterado (integridade GCM)', () => {
    const secret = 'chave_secreta_teste';
    const encrypted = service.encrypt(secret);
    const [iv, ciphertext, tag] = encrypted.split(':');

    // Adultera o último caractere do ciphertext
    const tamperedCiphertext =
      ciphertext.slice(0, -1) + (ciphertext.slice(-1) === 'a' ? 'b' : 'a');
    const tamperedPayload = `${iv}:${tamperedCiphertext}:${tag}`;

    expect(() => service.decrypt(tamperedPayload)).toThrow(
      /Falha de autenticação ao decifrar segredo/,
    );
  });

  it('deve gerar IVs diferentes para duas cifragens do mesmo segredo (não repetição de nonce)', () => {
    const secret = 'mesmo_segredo';
    const enc1 = service.encrypt(secret);
    const enc2 = service.encrypt(secret);

    expect(enc1).not.toEqual(enc2);
    expect(enc1.split(':')[0]).not.toEqual(enc2.split(':')[0]); // IVs distintos
  });

  it('deve mascarar segredos corretamente preservando apenas o sufixo', () => {
    const secret = 'shopee_live_secret_9981';
    const masked = service.maskSecret(secret, 4);

    expect(masked).toEqual('************9981');
    expect(masked).not.toContain('shopee_live');
  });
});
