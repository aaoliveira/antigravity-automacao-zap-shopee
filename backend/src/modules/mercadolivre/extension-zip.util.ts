import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { InternalServerErrorException } from '@nestjs/common';

export interface ExtensionPackageMetadata {
  ready: boolean;
  name: string;
  shortName: string;
  version: string;
  contractVersion: string;
  description: string;
  filesCount: number;
}

export interface ZipEntry {
  name: string;
  data: Buffer;
}

const EXCLUDED_DIR_NAMES = new Set([
  'tests',
  'scripts',
  'dist',
  'node_modules',
  '.git',
]);

function computeCrc32(buffer: Buffer): number {
  let crc = -1;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ -1) >>> 0;
}

export function buildZipArchiveBuffer(entries: ZipEntry[]): Buffer {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const normalizedName = entry.name.replace(/\\/g, '/');
    const nameBuf = Buffer.from(normalizedName, 'utf8');
    const rawData = entry.data;
    const compressed = zlib.deflateRawSync(rawData);
    const crc = computeCrc32(rawData);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHeader.writeUInt16LE(8, 8); // Deflate compression
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0x5421, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(rawData.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    localChunks.push(localHeader, nameBuf, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(8, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x5421, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(rawData.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralChunks.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + compressed.length;
  }

  const centralDir = Buffer.concat(centralChunks);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, centralDir, eocd]);
}

export function resolveMercadoLivreExtensionDir(): string | null {
  const candidates = [
    process.env.ML_EXTENSION_DIR
      ? path.resolve(process.env.ML_EXTENSION_DIR)
      : null,
    path.resolve(process.cwd(), 'extensions', 'mercadolivre-chrome'),
    path.resolve(process.cwd(), '..', 'extensions', 'mercadolivre-chrome'),
    path.resolve(__dirname, '../../../../extensions/mercadolivre-chrome'),
    path.resolve(__dirname, '../../../../../extensions/mercadolivre-chrome'),
  ].filter((c): c is string => Boolean(c));

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, 'manifest.json'))) {
      return fs.realpathSync(candidate);
    }
  }

  return null;
}

function collectRuntimeEntries(
  baseRealDir: string,
  currentDir: string,
  relPrefix = '',
): ZipEntry[] {
  const entries: ZipEntry[] = [];
  const items = fs.readdirSync(currentDir, { withFileTypes: true });
  items.sort((a, b) => a.name.localeCompare(b.name));

  for (const item of items) {
    if (EXCLUDED_DIR_NAMES.has(item.name) || item.name.startsWith('.')) {
      continue;
    }
    const fullPath = path.resolve(currentDir, item.name);
    const realPath = fs.realpathSync(fullPath);

    // Proteção contra path traversal via symlinks fora do diretório da extensão
    if (
      realPath !== baseRealDir &&
      !realPath.startsWith(`${baseRealDir}${path.sep}`)
    ) {
      continue;
    }

    const relName = relPrefix ? `${relPrefix}/${item.name}` : item.name;
    if (item.isDirectory()) {
      entries.push(...collectRuntimeEntries(baseRealDir, realPath, relName));
    } else if (item.isFile()) {
      entries.push({
        name: relName,
        data: fs.readFileSync(realPath),
      });
    }
  }

  return entries;
}

export function getExtensionMetadata(): ExtensionPackageMetadata {
  const dir = resolveMercadoLivreExtensionDir();
  if (!dir) {
    return {
      ready: false,
      name: 'ShopeeZap — Conector Mercado Livre Afiliados',
      shortName: 'ShopeeZap ML',
      version: '0.0.0',
      contractVersion: '1.0.0',
      description: 'Pacote da extensão não encontrado no servidor.',
      filesCount: 0,
    };
  }

  const manifest = JSON.parse(
    fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'),
  );
  let contractVersion = String(manifest.version || '1.0.0');
  const contractsPath = path.join(dir, 'src', 'config', 'contracts.js');
  if (fs.existsSync(contractsPath)) {
    const content = fs.readFileSync(contractsPath, 'utf8');
    const match = content.match(/contractVersion:\s*['"]([^'"]+)['"]/);
    if (match) {
      contractVersion = match[1];
    }
  }

  const entries = collectRuntimeEntries(dir, dir);

  return {
    ready: true,
    name: String(manifest.name || 'ShopeeZap ML'),
    shortName: String(manifest.short_name || 'ShopeeZap ML'),
    version: String(manifest.version || '1.0.0'),
    contractVersion,
    description: String(manifest.description || ''),
    filesCount: entries.length,
  };
}

export function buildExtensionDownloadZip(): {
  filename: string;
  version: string;
  filesCount: number;
  buffer: Buffer;
} {
  const dir = resolveMercadoLivreExtensionDir();
  if (!dir) {
    throw new InternalServerErrorException(
      'Pacote da extensão Chrome não está disponível no diretório de distribuição.',
    );
  }

  const metadata = getExtensionMetadata();
  const entries = collectRuntimeEntries(dir, dir);
  const buffer = buildZipArchiveBuffer(entries);
  const safeVersion = metadata.version.replace(/[^0-9A-Za-z._-]/g, '');

  return {
    filename: `shopeezap-ml-extensao-v${safeVersion}.zip`,
    version: metadata.version,
    filesCount: entries.length,
    buffer,
  };
}
