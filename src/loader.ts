import { isBatteryState, samplesFromHistory, toBatteryItem, withForecast } from './battery';
import type { BatteryItem, HassHistoryEntry, HassState } from './types';

/**
 * Abstraktion der Datenquelle:
 * - `HomeAssistantClient` (REST mit Long-Lived-Token) fuer die eigenstaendige App
 * - `HassDataSource` (HA-Frontend-Objekt) fuer das HACS-Sidebar-Panel
 */
export interface DataSource {
  getStates(): Promise<HassState[]>;
  getHistory(entityId: string, hours: number): Promise<HassHistoryEntry[]>;
  getAreas(): Promise<Record<string, string>>;
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

  let areas: Record<string, string> = {};
  try {
    areas = await source.getAreas();
  } catch {
    // Raumnamen sind optional - sie benoetigen Administratorrechte.
  }

  const items = states
    .filter(isBatteryState)
    .map((state) => toBatteryItem(state, areas[state.entity_id] ?? ''));

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
