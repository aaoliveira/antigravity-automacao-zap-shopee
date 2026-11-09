import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoVaultService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly masterKey: Buffer;

  constructor() {
    const keyHex = process.env.ENCRYPTION_MASTER_KEY;
    if (!keyHex || keyHex.length !== 64) {
      throw new Error(
        'ENCRYPTION_MASTER_KEY inválida ou ausente. Deve ser uma chave hexadecimal de 64 caracteres (256 bits).',
      );
    }
    this.masterKey = Buffer.from(keyHex, 'hex');
  }

  /**
   * Criptografa um texto claro utilizando AES-256-GCM com IV aleatório de 12 bytes.
   * Retorna formato: iv_hex:ciphertext_hex:auth_tag_hex
   */
  encrypt(plainText: string): string {
    if (!plainText) {
      throw new Error('Texto para criptografia não pode ser vazio.');
    }

    try {
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag().toString('hex');
      const ivHex = iv.toString('hex');

      return `${ivHex}:${encrypted}:${authTag}`;
    } catch (error) {
      throw new InternalServerErrorException('Falha ao cifrar dados confidenciais.');
    }
  }

  /**
   * Descriptografa um texto cifrado no formato iv_hex:ciphertext_hex:auth_tag_hex.
   * Valida a tag de autenticação e falha se houver qualquer adulteração.
   */
  decrypt(encryptedPayload: string): string {
    if (!encryptedPayload) {
      throw new Error('Payload criptografado não pode ser vazio.');
    }

    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato de cifra inválido. Esperado iv:ciphertext:tag.');
    }

    const [ivHex, ciphertextHex, authTagHex] = parts;

    try {
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);

      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new InternalServerErrorException(
        'Falha de autenticação ao decifrar segredo. Dados corrompidos ou chave incorreta.',
      );
    }
  }

  /**
   * Mascara um segredo para exibição segura no frontend (ex: ************abcd)
   */
  maskSecret(secret: string, visibleChars = 4): string {
    if (!secret || secret.length <= visibleChars) {
      return '************';
    }
    const tail = secret.slice(-visibleChars);
    return `************${tail}`;
  }

  /**
   * Suporte à rotação segura de chave mestre.
   * Decifra o segredo com a chave mestre atual e recifra com uma nova chave informada.
   */
  reencryptWithNewKey(encryptedPayload: string, newMasterKeyHex: string): string {
    if (!newMasterKeyHex || newMasterKeyHex.length !== 64) {
      throw new Error('Nova chave mestre inválida. Deve ter 64 caracteres hexadecimais (256 bits).');
    }

    const plainText = this.decrypt(encryptedPayload);
    const newMasterKey = Buffer.from(newMasterKeyHex, 'hex');

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, newMasterKey, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    const ivHex = iv.toString('hex');

    return `${ivHex}:${encrypted}:${authTag}`;
  }
}
