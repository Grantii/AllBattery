/** Attribute einer Entitaet aus der Home-Assistant-REST-API. */
export interface HassAttributes {
  friendly_name?: string;
  device_class?: string;
  unit_of_measurement?: string;
  [key: string]: unknown;
}

/** Rohe Entitaet aus `GET /api/states`. */
export interface HassState {
  entity_id: string;
  state: string;
  attributes: HassAttributes;
  last_changed?: string;
  last_updated?: string;
}

/** Einzelner Verlaufseintrag aus `GET /api/history/period`. */
export interface HassHistoryEntry {
  state: string;
  last_changed?: string;
  last_updated?: string;
}

export type BatteryGroup = 'critical' | 'warning' | 'good' | 'unknown';

/** `level` = Prozent-Sensor, `low` = Binary-Sensor (Batterie schwach). */
export type BatteryKind = 'level' | 'low';

export type ForecastStatus = 'discharging' | 'charging' | 'stable' | 'insufficient-data';

export interface Forecast {
  status: ForecastStatus;
  /** Prozentpunkte pro Stunde (negativ = Entladung). */
  percentPerHour: number;
  /** Geschaetzte Restlaufzeit in Stunden (nur bei `discharging`). */
  hoursRemaining: number | null;
  /** Betrachteter Zeitraum in Stunden. */
  spanHours: number;
  sampleCount: number;
}

export interface BatteryItem {
  entityId: string;
  name: string;
  area: string;
  kind: BatteryKind;
  rawState: string;
  /** Ladestand in Prozent (null = unbekannt/offline). */
  level: number | null;
  unit: string;
  group: BatteryGroup;
  lastChanged: string;
  forecast: Forecast | null;
}

export interface ConnectionSettings {
  /** Basis-URL der Home-Assistant-Instanz, z. B. http://homeassistant.local:8123 */
  url: string;
  /** Long-Lived Access Token - wird ausschliesslich lokal im Browser gespeichert. */
  token: string;
  /** Auto-Refresh in Sekunden (0 = aus). */
  refreshSeconds: number;
  /** Prognose-Modul aktiv? */
  showForecast: boolean;
  /** Betrachteter Zeitraum der Prognose in Stunden. */
  forecastHours: number;
}

export type SortKey = 'level' | 'name' | 'area';

export interface FilterState {
  query: string;
  groups: BatteryGroup[];
  sort: SortKey;
}
