import type { ConnectionSettings, FilterState } from './types';

const SETTINGS_KEY = 'allbattery.settings.v1';
const FILTER_KEY = 'allbattery.filter.v1';

/**
 * Wird die App von Home Assistant selbst ausgeliefert (Pfad beginnt mit
 * `/local/`, z. B. als Webseiten-Karte eingebettet), ist die
 * Home-Assistant-URL identisch mit dem Origin der Seite - dann ist keine
 * Eingabe noetig.
 */
function detectHomeAssistantUrl(): string {
  try {
    return window.location.pathname.startsWith('/local/') ? window.location.origin : '';
  } catch {
    return '';
  }
}

export const DEFAULT_SETTINGS: ConnectionSettings = {
  url: detectHomeAssistantUrl(),
  token: '',
  refreshSeconds: 60,
  showForecast: true,
  forecastHours: 24,
};

export const DEFAULT_FILTER: FilterState = {
  query: '',
  groups: [],
  sort: 'level',
};

function readJson<T extends object>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<T>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Speicher voll oder deaktiviert - die App funktioniert auch ohne Persistenz.
  }
}

export function loadSettings(): ConnectionSettings {
  return readJson<ConnectionSettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
}

export function saveSettings(settings: ConnectionSettings): void {
  writeJson(SETTINGS_KEY, settings);
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(SETTINGS_KEY);
  } catch {
    // ignorieren
  }
}

export function loadFilter(): FilterState {
  const filter = readJson<FilterState>(FILTER_KEY, DEFAULT_FILTER);
  return { ...filter, groups: Array.isArray(filter.groups) ? filter.groups : [] };
}

export function saveFilter(filter: FilterState): void {
  writeJson(FILTER_KEY, filter);
}
