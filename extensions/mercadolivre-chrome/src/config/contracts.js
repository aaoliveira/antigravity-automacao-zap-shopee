/**
 * Contrato de comunicação versionado e desacoplado da plataforma.
 * Permite evoluir endpoints, versão e capacidades da extensão sem recompilar o backend.
 */
export const EXTENSION_METADATA = {
  version: '1.0.0',
  contractVersion: '1.0.0',
  defaultBaseUrl: 'http://localhost:5173',
};

export const API_ENDPOINTS = {
  EXTENSION_STATUS: '/api/mercadolivre/extension/status',
  EXTENSION_SYNC: '/api/mercadolivre/extension/sync',
  EXTENSION_TEST_CONVERSION: '/api/mercadolivre/extension/test-conversion',
  EXTENSION_GATEWAY: '/api/mercadolivre/extension/gateway',
  EXTENSION_SESSION: '/api/mercadolivre/extension/session',
};

export const ML_COOKIE_DOMAINS = [
  'mercadolivre.com.br',
  'mercadolibre.com',
];

export const PRIORITY_SESSION_COOKIE_NAMES = [
  'orguserid',
  'orguseridp',
  'ssid',
  'orgnickp',
  'c_ui-t',
  '_csrf',
];
