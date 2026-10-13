import css from './style.css?inline';
import { countGroups, isBatteryState, toBatteryItem } from './battery';
import { META_TEMPLATE, loadBatteries, parseMeta, type DataSource, type EntityMeta } from './loader';
import { loadFilter, saveFilter } from './storage';
import type { AppView, StatusInfo } from './ui';
import { renderApp, renderBatteryGrid } from './ui';
import type {
  BatteryGroup,
  BatteryItem,
  ConnectionSettings,
  FilterState,
  HassHistoryEntry,
  HassState,
} from './types';

/**
 * Minimalausschnitt des Home-Assistant-Frontend-Objekts, das Home Assistant an
 * Custom Panels uebergibt. Absichtlich lokal definiert, damit das Plugin ohne
 * zusaetzliche Abhaengigkeiten auskommt.
 */
interface HassFrontend {
  states: Record<string, HassState>;
  /** Angemeldeter Benutzer (wird fuer die Admin-Pruefung der Template-API gebraucht). */
  user?: { is_admin?: boolean; is_owner?: boolean };
  callApi<T>(method: string, path: string, parameters?: unknown): Promise<T>;
}

/** Optionen, die in `configuration.yaml` unter `panel_custom.config` gesetzt werden. */
export interface AllBatteryPanelConfig {
  /** Auto-Refresh in Sekunden (0 = aus). Standard: 60 */
  refresh_seconds?: number;
  /** Prognose-Modul aktiv? Standard: true */
  forecast?: boolean;
  /** Betrachteter Zeitraum der Prognose in Stunden. Standard: 24 */
  forecast_hours?: number;
}

/** Datenquelle auf Basis des Frontend-Objekts - kein Token, keine CORS-Konfiguration. */
class HassDataSource implements DataSource {
  /** Raum- und Geraetenamen werden einmal geladen und danach wiederverwendet. */
  meta: Record<string, EntityMeta> = {};
  private metaLoaded = false;

  constructor(private readonly hass: HassFrontend) {}

  async getStates(): Promise<HassState[]> {
    return Object.values(this.hass.states);
  }

  async getHistory(entityId: string, hours: number): Promise<HassHistoryEntry[]> {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 3_600_000);
    const query = [
      `filter_entity_id=${encodeURIComponent(entityId)}`,
      `end_time=${encodeURIComponent(end.toISOString())}`,
      'minimal_response',
      'no_attributes',
    ].join('&');

    const data = await this.hass.callApi<HassHistoryEntry[][]>(
      'GET',
      `history/period/${encodeURIComponent(start.toISOString())}?${query}`,
    );
    return Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];
  }

  async getMeta(): Promise<Record<string, EntityMeta>> {
    if (this.metaLoaded) return this.meta;

    // Die Template-API erfordert Administratorrechte. Ohne Admin wird sie gar
    // nicht erst aufgerufen - sonst wuerde sie mit HTTP 403 fehlschlagen.
    const user = this.hass.user;
    if (user && user.is_admin !== true && user.is_owner !== true) {
      this.metaLoaded = true;
      return {};
    }

    const result = await this.hass.callApi<string>('POST', 'template', {
      template: META_TEMPLATE,
    });

    this.meta = parseMeta(String(result));
    this.metaLoaded = true;
    return this.meta;
  }
}

/**
 * Namen der Custom Elements. WICHTIG: Ein Custom-Element-Name MUSS einen
 * Bindestrich enthalten ("allbattery" allein ist ungueltig und laesst
 * customElements.define() mit einem SyntaxError abbrechen).
 *
 * Home Assistant erzeugt das Element mit dem `webcomponent_name` aus der
 * Integration ("allbattery-panel"); aeltere Varianten nutzen das Praefix
 * `ha-panel-`. Beide werden registriert.
 */
const ELEMENT_NAMES = ['allbattery-panel', 'ha-panel-allbattery'] as const;

interface PanelInfo {
  config?: AllBatteryPanelConfig;
}

class AllBatteryPanel extends HTMLElement {
  private readonly shadow: ShadowRoot;
  private hassObject?: HassFrontend;
  private panelConfig: AllBatteryPanelConfig = {};

  private source?: HassDataSource;
  private items: BatteryItem[] = [];
  private filter: FilterState = loadFilter();
  private status: StatusInfo = { kind: 'idle', message: 'Warte auf Home Assistant ...' };
  private lastUpdate = '';
  private forecastLoading = false;

  private started = false;
  private loading = false;
  private lastSync = 0;
  private timer: number | undefined;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  /** Vom Frontend gesetzt: aktueller Zustand von Home Assistant. */
  set hass(value: HassFrontend) {
    this.hassObject = value;
    if (!this.started) {
      this.started = true;
      void this.refresh();
      return;
    }
    this.syncFromHass();
  }

  get hass(): HassFrontend | undefined {
    return this.hassObject;
  }

  /** Vom Frontend gesetzt: Panel-Informationen inklusive `config`. */
  set panel(value: PanelInfo | undefined) {
    this.applyConfig(value?.config);
  }

  /** Fallback: manche Versionen setzen `config` direkt am Element. */
  set config(value: AllBatteryPanelConfig | undefined) {
    this.applyConfig(value);
  }

  set narrow(value: boolean) {
    this.toggleAttribute('narrow', Boolean(value));
  }

  connectedCallback(): void {
    if (this.shadow.childElementCount === 0) {
      const style = document.createElement('style');
      style.textContent = css;
      const container = document.createElement('div');
      container.setAttribute('data-role', 'app');
      this.shadow.append(style, container);
      this.render();
    }

    this.shadow.addEventListener('click', this.handleClick);
    this.shadow.addEventListener('input', this.handleInput);
    this.shadow.addEventListener('change', this.handleChange);
  }

  disconnectedCallback(): void {
    this.stopTimer();
    this.shadow.removeEventListener('click', this.handleClick);
    this.shadow.removeEventListener('input', this.handleInput);
    this.shadow.removeEventListener('change', this.handleChange);
  }

  private applyConfig(config: AllBatteryPanelConfig | undefined): void {
    if (!config || typeof config !== 'object') return;
    this.panelConfig = { ...this.panelConfig, ...config };
    if (this.started) this.startTimer();
  }

  private get refreshSeconds(): number {
    const value = Number(this.panelConfig.refresh_seconds ?? 60);
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : 60;
  }

  private get forecastEnabled(): boolean {
    return this.panelConfig.forecast !== false;
  }

  private get forecastHours(): number {
    const value = Number(this.panelConfig.forecast_hours ?? 24);
    return Number.isFinite(value) && value > 0 ? Math.round(value) : 24;
  }

  private view(): AppView {
    const settings: ConnectionSettings = {
      url: '',
      token: '',
      refreshSeconds: this.refreshSeconds,
      showForecast: this.forecastEnabled,
      forecastHours: this.forecastHours,
    };

    return {
      mode: 'panel',
      settings,
      filter: this.filter,
      items: this.items,
      counts: countGroups(this.items),
      status: this.status,
      lastUpdate: this.lastUpdate,
      settingsOpen: false,
      forecastLoading: this.forecastLoading,
    };
  }

  private render(): void {
    const container = this.shadow.querySelector<HTMLElement>('[data-role="app"]');
    if (container) container.innerHTML = renderApp(this.view());
  }

  /** Aktualisiert nur das Karten-Raster, damit der Fokus im Suchfeld bleibt. */
  private updateGrid(): void {
    const grid = this.shadow.querySelector<HTMLElement>('[data-role="grid"]');
    if (!grid) {
      this.render();
      return;
    }
    const wrapper = document.createElement('div');
    wrapper.innerHTML = renderBatteryGrid(this.view());
    const next = wrapper.firstElementChild;
    if (next) grid.replaceWith(next);
  }

  private async refresh(): Promise<void> {
    const hass = this.hassObject;
    if (!hass || this.loading) return;

    this.loading = true;
    this.forecastLoading = this.forecastEnabled;
    this.status = { kind: 'loading', message: 'Lade Batterien ...' };
    this.render();

    const source = this.source ?? new HassDataSource(hass);
    this.source = source;

    try {
      const items = await loadBatteries(source, {
        forecast: this.forecastEnabled,
        forecastHours: this.forecastHours,
        onUpdate: (updated) => {
          this.items = [...updated];
          this.lastUpdate = new Date().toLocaleTimeString('de-DE');
          this.status = { kind: 'ok', message: 'Verbunden' };
          this.render();
        },
      });
      this.items = [...items];
      this.status = { kind: 'ok', message: 'Verbunden' };
    } catch (error) {
      this.items = [];
      this.lastUpdate = '';
      this.status = {
        kind: 'error',
        message: error instanceof Error ? error.message : 'Daten konnten nicht geladen werden.',
      };
    } finally {
      this.loading = false;
      this.forecastLoading = false;
      this.render();
      this.startTimer();
    }
  }

  /**
   * Uebernimmt neue Zustaende direkt aus dem Frontend (ohne Netzwerkanfrage) und
   * behaelt bereits berechnete Prognosen bei. Entprellt auf 2 Sekunden.
   */
  private syncFromHass(): void {
    const hass = this.hassObject;
    if (!hass || this.loading) return;

    const now = Date.now();
    if (now - this.lastSync < 2000) return;
    this.lastSync = now;

    const previous = new Map(this.items.map((item) => [item.entityId, item]));
    const meta = this.source?.meta ?? {};

    this.items = Object.values(hass.states)
      .filter(isBatteryState)
      .map((state) => {
        const info = meta[state.entity_id];
        const item = toBatteryItem(state, info?.area ?? '', info?.device ?? '');
        const old = previous.get(item.entityId);
        return old?.forecast ? { ...item, forecast: old.forecast } : item;
      });

    this.lastUpdate = new Date().toLocaleTimeString('de-DE');
    this.render();
  }

  private startTimer(): void {
    this.stopTimer();
    const seconds = this.refreshSeconds;
    if (seconds > 0) {
      this.timer = window.setInterval(() => {
        void this.refresh();
      }, seconds * 1000);
    }
  }

  private stopTimer(): void {
    if (this.timer !== undefined) {
      window.clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  private setFilter(filter: FilterState): void {
    this.filter = filter;
    saveFilter(filter);
    this.render();
  }

  private readonly handleClick = (event: Event): void => {
    const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
    if (!target) return;

    switch (target.dataset.action) {
      case 'refresh':
        void this.refresh();
        break;
      case 'toggle-group': {
        const group = target.dataset.group as BatteryGroup;
        const groups = this.filter.groups.includes(group)
          ? this.filter.groups.filter((entry) => entry !== group)
          : [...this.filter.groups, group];
        this.setFilter({ ...this.filter, groups });
        break;
      }
      case 'clear-groups':
        this.setFilter({ ...this.filter, groups: [] });
        break;
      default:
        break;
    }
  };

  private readonly handleInput = (event: Event): void => {
    const target = event.target as HTMLInputElement | null;
    if (target?.dataset.role !== 'query') return;
    this.filter = { ...this.filter, query: target.value };
    saveFilter(this.filter);
    this.updateGrid();
  };

  private readonly handleChange = (event: Event): void => {
    const target = event.target as HTMLSelectElement | null;
    if (target?.dataset.role !== 'sort') return;
    this.setFilter({ ...this.filter, sort: target.value as FilterState['sort'] });
  };
}

for (const name of ELEMENT_NAMES) {
  try {
    if (!customElements.get(name)) {
      customElements.define(name, AllBatteryPanel);
    }
  } catch (error) {
    // Ein ungueltiger Name darf die Registrierung der anderen nicht verhindern.
    console.error(`AllBattery: Element "${name}" konnte nicht registriert werden.`, error);
  }
}
