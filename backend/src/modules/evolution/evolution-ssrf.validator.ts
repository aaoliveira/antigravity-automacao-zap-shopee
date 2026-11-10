import { BadRequestException } from '@nestjs/common';
import * as net from 'net';

export class EvolutionSsrfValidator {
  /**
   * Valida uma URL contra ataques de Server-Side Request Forgery (SSRF).
   * Bloqueia destinos privados, link-local, loopback e metadados de nuvem.
   * Exceção: ALLOW_INTERNAL_EVOLUTION_URL=true para testes e ambientes locais controlados.
   */
  static validateUrl(rawUrl: string, allowInternalOverride = false): void {
    if (!rawUrl || typeof rawUrl !== 'string') {
      throw new BadRequestException('URL não fornecida ou inválida.');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      throw new BadRequestException(`Formato de URL inválido: ${rawUrl}`);
    }

    // Apenas protocolos HTTP e HTTPS são aceitos
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new BadRequestException(
        `Protocolo ${parsedUrl.protocol} não permitido. Use apenas HTTP ou HTTPS.`,
      );
    }

    // Verifica se há permissão explícita para URLs internas (ex: ambiente de teste/dev com flag específica)
    const allowInternal =
      allowInternalOverride ||
      process.env.ALLOW_INTERNAL_EVOLUTION_URL === 'true';

    if (allowInternal) {
      return;
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // Bloqueia nomes óbvios de localhost
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      throw new BadRequestException(
        `Destino interno não autorizado (SSRF mitigado): ${hostname}`,
      );
    }

    // Se for endereço IP numérico, valida a faixa
    if (net.isIP(hostname)) {
      if (this.isPrivateOrRestrictedIp(hostname)) {
        throw new BadRequestException(
          `Endereço IP privado/restrito não permitido (SSRF mitigado): ${hostname}`,
        );
      }
    }
  }

  /**
   * Verifica se um IP é privado, loopback, link-local ou reservado.
   */
  static isPrivateOrRestrictedIp(ip: string): boolean {
    // IPv4
    if (net.isIPv4(ip)) {
      const parts = ip.split('.').map((p) => parseInt(p, 10));
      const [a, b] = parts;

      // 0.0.0.0/8 (Broadcast atual)
      if (a === 0) return true;

      // 127.0.0.0/8 (Loopback)
      if (a === 127) return true;

      // 10.0.0.0/8 (RFC 1918 privada)
      if (a === 10) return true;

      // 172.16.0.0/12 (RFC 1918 privada: 172.16.x.x - 172.31.x.x)
      if (a === 172 && b >= 16 && b <= 31) return true;

      // 192.168.0.0/16 (RFC 1918 privada)
      if (a === 192 && b === 168) return true;

      // 169.254.0.0/16 (Link-local / AWS / GCP Metadata)
      if (a === 169 && b === 254) return true;

      // 224.0.0.0/4 (Multicast) e 240.0.0.0/4 (Reservado)
      if (a >= 224) return true;

      return false;
    }

    // IPv6
    if (net.isIPv6(ip)) {
      const lower = ip.toLowerCase();
      // ::1 (Loopback)
      if (lower === '::1' || lower === '0:0:0:0:0:0:0:1') return true;
      // fe80::/10 (Link-local)
      if (lower.startsWith('fe80:')) return true;
      // fc00::/7 (Unique local)
      if (lower.startsWith('fc') || lower.startsWith('fd')) return true;

      return false;
    }

    return false;
  }

  /**
   * Verifica se uma URL corresponde estritamente à instância Docker da Evolution API
   * habilitada e configurada pelo administrador via variáveis de ambiente.
   */
  static isAuthorizedDockerUrl(rawUrl: string): boolean {
    if (process.env.EVOLUTION_DOCKER_ENABLED !== 'true') {
      return false;
    }

    const configuredUrl = (process.env.EVOLUTION_DOCKER_BASE_URL || '').trim();
    if (!configuredUrl || !rawUrl) {
      return false;
    }

    try {
      const target = new URL(rawUrl);
      const allowed = new URL(configuredUrl);
      return (
        ['http:', 'https:'].includes(allowed.protocol) &&
        target.origin === allowed.origin
      );
    } catch {
      return false;
    }
  }
}
