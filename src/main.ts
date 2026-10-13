import {
  countGroups,
  isBatteryState,
  samplesFromHistory,
  toBatteryItem,
  withForecast,
} from './battery';
import { HassError, HomeAssistantClient } from './hass';
import {
  DEFAULT_SETTINGS,
  clearSettings,
  loadFilter,
  loadSettings,
  saveFilter,
  saveSettings,
} from './storage';
import type { AppView, StatusInfo } from './ui';
import { renderApp, renderBatteryGrid } from './ui';
import type { BatteryGroup, BatteryItem, SortKey } from './types';
import './style.css';

const appRoot = document.querySelector<HTMLDivElement>('#app');
if (!appRoot) throw new Error('Container #app wurde nicht gefunden.');
const root: HTMLDivElement = appRoot;

const state = {
  settings: loadSettings(),
  filter: loadFilter(),
  items: [] as BatteryItem[],
  status: { kind: 'idle', message: 'Nicht verbunden' } as StatusInfo,
  lastUpdate: '',
  settingsOpen: false,
  forecastLoading: false,
};

let refreshTimer: number | undefined;

function view(): AppView {
  return {
    settings: state.settings,
    filter: state.filter,
    items: state.items,
    counts: countGroups(state.items),
    status: state.status,
    lastUpdate: state.lastUpdate,
    settingsOpen: state.settingsOpen,
    forecastLoading: state.forecastLoading,
  };
}

function setStatus(kind: StatusInfo['kind'], message: string): void {
  state.status = { kind, message };
}

function isConfigured(): boolean {
  return state.settings.url.trim() !== '' && state.settings.token.trim() !== '';
}

function render(): void {
  root.innerHTML = renderApp(view());
}

/** Ersetzt nur das Karten-Raster, damit der Fokus im Suchfeld erhalten bleibt. */
function updateGrid(): void {
  const grid = root.querySelector<HTMLElement>('[data-role="grid"]');
  if (!grid) {
    render();
    return;
  }
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderBatteryGrid(view());
  const next = wrapper.firstElementChild;
  if (next) grid.replaceWith(next);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function scheduleRefresh(): void {
  if (refreshTimer !== undefined) {
    window.clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
  const seconds = state.settings.refreshSeconds;
  if (seconds > 0 && isConfigured()) {
    refreshTimer = window.setInterval(() => {
      void connect();
    }, seconds * 1000);
  }
}

async function mapWithConcurrency<T>(
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

async function loadForecasts(client: HomeAssistantClient, items: BatteryItem[]): Promise<void> {
  state.forecastLoading = true;
  render();

  const levelItems = items.filter((item) => item.kind === 'level');
  await mapWithConcurrency(levelItems, 4, async (item) => {
    try {
      const entries = await client.getHistory(item.entityId, state.settings.forecastHours);
      const index = state.items.findIndex((entry) => entry.entityId === item.entityId);
      if (index >= 0) {
        state.items[index] = withForecast(state.items[index], samplesFromHistory(entries));
      }
    } catch {
      // Die Prognose ist optional: Fehler (z. B. fehlende Historie) werden ignoriert.
    }
  });

  state.forecastLoading = false;
  render();
}

async function connect(): Promise<void> {
  if (!isConfigured()) {
    setStatus('error', 'Bitte URL und Token angeben.');
    render();
    return;
  }

  setStatus('loading', 'Verbinde ...');
  render();

  const client = new HomeAssistantClient(state.settings.url, state.settings.token);

  try {
    const message = await client.testConnection();
    const states = await client.getStates();

    let areas: Record<string, string> = {};
    try {
      areas = await client.getAreas();
    } catch {
      areas = {};
    }

    const items = states
      .filter(isBatteryState)
      .map((entity) => toBatteryItem(entity, areas[entity.entity_id] ?? ''));

    state.items = items;
    state.lastUpdate = new Date().toLocaleTimeString('de-DE');
    setStatus('ok', message === 'API running.' ? 'Verbunden' : message);
    render();

    if (state.settings.showForecast && items.length > 0) {
      void loadForecasts(client, items);
    }
  } catch (error) {
    state.items = [];
    state.lastUpdate = '';
    setStatus('error', error instanceof HassError ? error.message : 'Unerwarteter Fehler.');
    render();
  }

  scheduleRefresh();
}

function toggleGroup(group: BatteryGroup): void {
  const groups = state.filter.groups.includes(group)
    ? state.filter.groups.filter((entry) => entry !== group)
    : [...state.filter.groups, group];
  state.filter = { ...state.filter, groups };
  saveFilter(state.filter);
  render();
}

function forget(): void {
  clearSettings();
  if (refreshTimer !== undefined) window.clearInterval(refreshTimer);
  refreshTimer = undefined;
  state.settings = { ...DEFAULT_SETTINGS };
  state.items = [];
  state.lastUpdate = '';
  state.settingsOpen = true;
  setStatus('idle', 'Nicht verbunden');
  render();
}

root.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-action]');
  if (!target) return;

  switch (target.dataset.action) {
    case 'refresh':
      void connect();
      break;
    case 'toggle-settings':
      state.settingsOpen = !state.settingsOpen;
      render();
      break;
    case 'toggle-group':
      toggleGroup(target.dataset.group as BatteryGroup);
      break;
    case 'clear-groups':
      state.filter = { ...state.filter, groups: [] };
      saveFilter(state.filter);
      render();
      break;
    case 'forget':
      forget();
      break;
    default:
      break;
  }
});

root.addEventListener('submit', (event) => {
  const form = event.target as HTMLFormElement | null;
  if (!form || form.dataset.role !== 'connection-form') return;
  event.preventDefault();

  const data = new FormData(form);
  state.settings = {
    url: String(data.get('url') ?? '').trim(),
    token: String(data.get('token') ?? '').trim(),
    refreshSeconds: clamp(Number(data.get('refreshSeconds') ?? 60), 0, 3600),
    showForecast: data.get('showForecast') !== null,
    forecastHours: clamp(Number(data.get('forecastHours') ?? 24), 1, 336),
  };
  saveSettings(state.settings);
  state.settingsOpen = false;
  void connect();
});

root.addEventListener('input', (event) => {
  const target = event.target as HTMLInputElement | null;
  if (target?.dataset.role !== 'query') return;
  state.filter = { ...state.filter, query: target.value };
  saveFilter(state.filter);
  updateGrid();
});

root.addEventListener('change', (event) => {
  const target = event.target as HTMLSelectElement | null;
  if (target?.dataset.role !== 'sort') return;
  state.filter = { ...state.filter, sort: target.value as SortKey };
  saveFilter(state.filter);
  updateGrid();
});

if (isConfigured()) {
  render();
  void connect();
} else {
  state.settingsOpen = true;
  render();
}
