import { computeForecast, type ForecastSample } from './forecast';
import type {
  BatteryGroup,
  BatteryItem,
  BatteryKind,
  FilterState,
  HassHistoryEntry,
  HassState,
  SortKey,
} from './types';

/** Grenzwerte laut Spezifikation. */
export const CRITICAL_THRESHOLD = 10;
export const WARNING_THRESHOLD = 20;

export const GROUP_ORDER: BatteryGroup[] = ['critical', 'warning', 'good', 'unknown'];

export const GROUP_LABELS: Record<BatteryGroup, string> = {
  critical: 'Kritisch',
  warning: 'Warnung',
  good: 'Gut',
  unknown: 'Unbekannt / Offline',
};

/** Notnagel-Erkennung fuer Sensoren ohne `device_class`, die klar Batterien sind. */
const NAME_HINTS = /batter(y|ie)|akku|battery_level/i;

const UNKNOWN_STATES = new Set(['', 'unknown', 'unavailable', 'none', 'null']);

function isUnknownState(state: string): boolean {
  return UNKNOWN_STATES.has(state.trim().toLowerCase());
}

function parseNumber(state: string): number | null {
  if (isUnknownState(state)) return null;
  const parsed = Number.parseFloat(state.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Ordnet einen Ladestand einer Gruppe zu. */
export function groupForLevel(level: number | null): BatteryGroup {
  if (level === null || !Number.isFinite(level)) return 'unknown';
  if (level < CRITICAL_THRESHOLD) return 'critical';
  if (level < WARNING_THRESHOLD) return 'warning';
  return 'good';
}

/**
 * Erkennt Batterie-Entitaeten.
 *
 * Primaer ueber `device_class: battery` (sensor = Ladestand, binary_sensor =
 * "Batterie schwach"). Zusaetzlich als Fallback: Sensoren in Prozent, deren
 * Entity-ID eindeutig auf eine Batterie hindeutet.
 */
export function isBatteryState(state: HassState): boolean {
  const domain = state.entity_id.split('.')[0] ?? '';
  const attributes = state.attributes ?? {};
  const deviceClass = String(attributes.device_class ?? '').toLowerCase();

  if (deviceClass === 'battery' && (domain === 'sensor' || domain === 'binary_sensor')) return true;

  const unit = String(attributes.unit_of_measurement ?? '');
  return domain === 'sensor' && unit === '%' && NAME_HINTS.test(state.entity_id);
}

function friendlyName(state: HassState): string {
  const name = state.attributes?.friendly_name;
  return typeof name === 'string' && name.trim() !== '' ? name.trim() : state.entity_id;
}

/** Wandelt eine Entitaet in ein darstellbares Batterie-Objekt um. */
export function toBatteryItem(state: HassState, area: string): BatteryItem {
  const attributes = state.attributes ?? {};
  const kind: BatteryKind = state.entity_id.startsWith('binary_sensor.') ? 'low' : 'level';

  let level: number | null;
  if (kind === 'low') {
    const value = state.state.trim().toLowerCase();
    level = value === 'on' ? 0 : value === 'off' ? 100 : null;
  } else {
    level = parseNumber(state.state);
  }

  return {
    entityId: state.entity_id,
    name: friendlyName(state),
    area,
    kind,
    rawState: state.state,
    level,
    unit: kind === 'level' ? String(attributes.unit_of_measurement ?? '%') : '',
    group: groupForLevel(level),
    lastChanged: state.last_changed ?? state.last_updated ?? '',
    forecast: null,
  };
}

/** Baut Messpunkte fuer die Prognose aus einem Verlaufs-Ergebnis. */
export function samplesFromHistory(entries: HassHistoryEntry[]): ForecastSample[] {
  const samples: ForecastSample[] = [];
  for (const entry of entries) {
    const timestamp = Date.parse(entry.last_changed ?? entry.last_updated ?? '');
    const value = parseNumber(String(entry.state ?? ''));
    if (!Number.isFinite(timestamp) || value === null) continue;
    samples.push({ t: timestamp, v: value });
  }
  return samples;
}

/** Verknuepft ein Batterie-Objekt mit seiner Prognose. */
export function withForecast(item: BatteryItem, samples: ForecastSample[]): BatteryItem {
  if (item.kind !== 'level') return item;
  return { ...item, forecast: computeForecast(samples, item.level) };
}

export function countGroups(items: BatteryItem[]): Record<BatteryGroup, number> {
  const counts: Record<BatteryGroup, number> = { critical: 0, warning: 0, good: 0, unknown: 0 };
  for (const item of items) counts[item.group] += 1;
  return counts;
}

export function sortItems(items: BatteryItem[], sort: SortKey): BatteryItem[] {
  const collator = new Intl.Collator('de', { sensitivity: 'base', numeric: true });
  const copy = [...items];

  switch (sort) {
    case 'name':
      return copy.sort((a, b) => collator.compare(a.name, b.name));
    case 'area':
      return copy.sort(
        (a, b) => collator.compare(a.area, b.area) || collator.compare(a.name, b.name),
      );
    case 'level':
    default:
      return copy.sort((a, b) => {
        const levelA = a.level ?? Number.POSITIVE_INFINITY;
        const levelB = b.level ?? Number.POSITIVE_INFINITY;
        return levelA - levelB || collator.compare(a.name, b.name);
      });
  }
}

export function filterAndSort(items: BatteryItem[], filter: FilterState): BatteryItem[] {
  const query = filter.query.trim().toLowerCase();

  const filtered = items.filter((item) => {
    if (filter.groups.length > 0 && !filter.groups.includes(item.group)) return false;
    if (query === '') return true;
    return (
      item.name.toLowerCase().includes(query) ||
      item.entityId.toLowerCase().includes(query) ||
      item.area.toLowerCase().includes(query)
    );
  });

  return sortItems(filtered, filter.sort);
}
