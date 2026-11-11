const STORAGE_KEY = 'shopeezap_ml_connector_settings_v1';

const memoryFallback = new Map();

export function normalizeBaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.origin + parsed.pathname.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

export async function loadSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || { baseUrl: '', extensionToken: '', lastSyncAt: null };
  }
  return (
    memoryFallback.get(STORAGE_KEY) || {
      baseUrl: '',
      extensionToken: '',
      lastSyncAt: null,
    }
  );
}

export async function saveSettings(partial) {
  const current = await loadSettings();
  const next = {
    ...current,
    ...partial,
    ...(partial.baseUrl !== undefined
      ? { baseUrl: normalizeBaseUrl(partial.baseUrl) }
      : {}),
  };

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
  } else {
    memoryFallback.set(STORAGE_KEY, next);
  }
  return next;
}

export async function clearSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.remove(STORAGE_KEY);
  } else {
    memoryFallback.delete(STORAGE_KEY);
  }
}
