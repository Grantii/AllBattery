import { isBatteryState, samplesFromHistory, toBatteryItem, withForecast } from './battery';
import type { BatteryItem, HassHistoryEntry, HassState } from './types';

/** Zusatzinformationen zu einer Entitaet (Raum und Geraet). */
export interface EntityMeta {
  area: string;
  device: string;
}

/**
 * Abstraktion der Datenquelle:
 * - `HomeAssistantClient` (REST mit Long-Lived-Token) fuer die eigenstaendige App
 * - `HassDataSource` (HA-Frontend-Objekt) fuer das HACS-Sidebar-Panel
 */
export interface DataSource {
  getStates(): Promise<HassState[]>;
  getHistory(entityId: string, hours: number): Promise<HassHistoryEntry[]>;
  /** Raum- und Geraetenamen (benoetigt Administratorrechte). */
  getMeta(): Promise<Record<string, EntityMeta>>;
}

/**
 * Jinja-Template, das fuer alle Batterie-Entitaeten Raum- und Geraetenamen liefert.
 * Format je Zeile: `entity_id=Raum<TAB>Geraet`
 */
export const META_TEMPLATE = [
  "{% for s in states if s.attributes.device_class == 'battery' %}",
  "{{ s.entity_id }}={{ area_name(s.entity_id) or '' }}\t{{ device_attr(s.entity_id, 'name_by_user') or device_attr(s.entity_id, 'name') or '' }}\n",
  '{% endfor %}',
].join('');

/** Wandelt die Ausgabe von {@link META_TEMPLATE} in eine Zuordnung um. */
export function parseMeta(result: string): Record<string, EntityMeta> {
  const map: Record<string, EntityMeta> = {};

  for (const line of result.split('\n')) {
    const separator = line.indexOf('=');
    if (separator <= 0) continue;

    const entityId = line.slice(0, separator).trim();
    if (!entityId.includes('.')) continue;

    const [area = '', device = ''] = line.slice(separator + 1).split('\t');
    map[entityId] = { area: area.trim(), device: device.trim() };
  }

  return map;
}

export interface LoadOptions {
  /** Prognose-Modul aktiv? */
  forecast: boolean;
  /** Betrachteter Zeitraum der Prognose in Stunden. */
  forecastHours: number;
  /** Wird nach dem Basisladen und nach jeder fertigen Prognose aufgerufen. */
  onUpdate?: (items: BatteryItem[]) => void;
}

/** Fuehrt `worker` fuer alle Eintraege aus, aber hoechstens `limit` parallel. */
export async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const runners = Array.from({ length: Math.max(1, Math.min(limit, queue.length)) }, async () => {
    for (;;) {
      const next = queue.shift();
      if (next === undefined) return;
      await worker(next);
    }
  });
  await Promise.all(runners);
}

/**
 * Laedt alle Batterie-Entitaeten und - falls aktiviert - die Restlaufzeit-Prognose.
 *
 * Die Prognose wird parallel und progressiv nachgeladen: `onUpdate` wird direkt
 * nach der Liste und nach jeder fertigen Prognose aufgerufen, damit die Oberflaeche
 * sofort etwas anzeigen kann.
 */
export async function loadBatteries(
  source: DataSource,
  options: LoadOptions,
): Promise<BatteryItem[]> {
  const states = await source.getStates();

  let meta: Record<string, EntityMeta> = {};
  try {
    meta = await source.getMeta();
  } catch {
    // Raum- und Geraetenamen sind optional - sie benoetigen Administratorrechte.
  }

  const items = states.filter(isBatteryState).map((state) => {
    const info = meta[state.entity_id];
    return toBatteryItem(state, info?.area ?? '', info?.device ?? '');
  });

  options.onUpdate?.(items);

  if (!options.forecast || items.length === 0) return items;

  const levelItems = items.filter((item) => item.kind === 'level');
  await mapWithConcurrency(levelItems, 4, async (item) => {
    try {
      const entries = await source.getHistory(item.entityId, options.forecastHours);
      const index = items.findIndex((entry) => entry.entityId === item.entityId);
      if (index >= 0) {
        items[index] = withForecast(items[index], samplesFromHistory(entries));
        options.onUpdate?.(items);
      }
    } catch {
      // Die Prognose ist optional: Fehler (z. B. fehlende Historie) werden ignoriert.
    }
  });

  return items;
}
