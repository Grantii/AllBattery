import { GROUP_LABELS, GROUP_ORDER, filterAndSort } from './battery';
import { formatDuration } from './forecast';
import { LOGO_DATA_URI } from './logo';
import type { BatteryGroup, BatteryItem, ConnectionSettings, FilterState, SortKey } from './types';

export interface StatusInfo {
  kind: 'idle' | 'loading' | 'ok' | 'error';
  message: string;
}

/** Gesamter Zustand, den die UI zum Rendern benoetigt. */
export interface AppView {
  /** `standalone` = eigene Seite mit Verbindungsformular, `panel` = HA-Sidebar-Panel. */
  mode: 'standalone' | 'panel';
  settings: ConnectionSettings;
  filter: FilterState;
  items: BatteryItem[];
  counts: Record<BatteryGroup, number>;
  status: StatusInfo;
  lastUpdate: string;
  settingsOpen: boolean;
  forecastLoading: boolean;
}

/** Literale Tailwind-Klassen pro Gruppe (wichtig: nicht dynamisch zusammensetzen). */
const GROUP_STYLES: Record<
  BatteryGroup,
  { badge: string; fill: string; dot: string; card: string }
> = {
  critical: {
    badge: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
    fill: 'bg-rose-500',
    dot: 'bg-rose-500',
    card: 'border-rose-500/30',
  },
  warning: {
    badge: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
    fill: 'bg-amber-500',
    dot: 'bg-amber-500',
    card: 'border-amber-500/25',
  },
  good: {
    badge: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
    fill: 'bg-emerald-500',
    dot: 'bg-emerald-500',
    card: 'border-slate-800',
  },
  unknown: {
    badge: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30',
    fill: 'bg-slate-600',
    dot: 'bg-slate-500',
    card: 'border-slate-800',
  },
};

const STATUS_BADGE: Record<StatusInfo['kind'], string> = {
  idle: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30',
  loading: 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30',
  ok: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  error: 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30',
};

const STATUS_DOT: Record<StatusInfo['kind'], string> = {
  idle: 'bg-slate-400',
  loading: 'bg-sky-400 animate-pulse',
  ok: 'bg-emerald-400',
  error: 'bg-rose-400',
};

const INPUT_CLASS =
  'rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500';
const LABEL_CLASS = 'text-xs font-medium uppercase tracking-wide text-slate-400';

/** Escaped jeden dynamischen Wert, bevor er in HTML eingesetzt wird. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatRate(percentPerHour: number): string {
  return `${percentPerHour.toFixed(2)} %/h`;
}

function levelLabel(item: BatteryItem): string {
  if (item.kind === 'low') {
    const value = item.rawState.trim().toLowerCase();
    if (value === 'on') return 'Schwach';
    if (value === 'off') return 'OK';
    return 'Unbekannt';
  }
  return item.level === null ? 'Unbekannt' : `${formatNumber(item.level)} ${item.unit}`.trim();
}

function forecastText(item: BatteryItem): string | null {
  const forecast = item.forecast;
  if (!forecast) return null;

  switch (forecast.status) {
    case 'discharging':
      return `Reicht ca. ${formatDuration(forecast.hoursRemaining)} (${formatRate(forecast.percentPerHour)})`;
    case 'charging':
      return `Laedt (+${formatRate(Math.abs(forecast.percentPerHour))})`;
    case 'stable':
      return 'Ladestand stabil';
    default:
      return 'Zu wenig Verlaufsdaten';
  }
}

function statusBadge(status: StatusInfo): string {
  return `<span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE[status.kind]}">
    <span class="h-2 w-2 rounded-full ${STATUS_DOT[status.kind]}"></span>${escapeHtml(status.message)}
  </span>`;
}

/** Logo in der Kopfzeile (Data-URI aus `src/logo.ts`, erzeugt aus assets/Logo.png). */
const LOGO_IMAGE = `<img src="${LOGO_DATA_URI}" alt="" class="h-10 w-10 shrink-0 rounded-xl" aria-hidden="true" />`;

const HEADER_BUTTON_CLASS =
  'rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800';

function renderHeader(view: AppView): string {
  return `
  <header class="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
      <div class="flex items-center gap-3">
        ${LOGO_IMAGE}
        <div>
          <h1 class="text-lg font-semibold tracking-tight">AllBattery</h1>
          <p class="text-xs text-slate-400">Batterie-Monitoring fuer Home Assistant</p>
        </div>
      </div>
      <div class="ml-auto flex flex-wrap items-center gap-2">
        ${statusBadge(view.status)}
        ${view.lastUpdate ? `<span class="text-xs text-slate-400">Stand: ${escapeHtml(view.lastUpdate)}</span>` : ''}
        <button type="button" data-action="refresh" class="${HEADER_BUTTON_CLASS}">Aktualisieren</button>
        ${
          view.mode === 'standalone'
            ? `<button type="button" data-action="toggle-settings" class="${HEADER_BUTTON_CLASS}">Einstellungen</button>`
            : ''
        }
      </div>
    </div>
  </header>`;
}

/** Eine Filter-Kachel (Gruppe oder "Alle") mit deutlichem Aktiv-Zustand. */
function renderFilterTile(options: {
  action: string;
  label: string;
  count: number;
  active: boolean;
  dotClass: string;
}): string {
  const { action, label, count, active, dotClass } = options;
  const stateClasses = active
    ? 'border-sky-500 bg-sky-500/15 ring-2 ring-sky-500/40'
    : 'border-slate-800 bg-slate-900/60 hover:border-sky-500/40 hover:bg-slate-800/60';
  const labelClasses = active ? 'text-sky-100' : 'text-slate-300';
  const countClasses = active ? 'text-white' : 'text-slate-100';
  const checkmark = active
    ? '<span class="ml-auto font-bold text-sky-300" aria-hidden="true">&#10003;</span>'
    : '';

  return `
      <button type="button" ${action} aria-pressed="${active}"
        class="flex cursor-pointer flex-col items-start gap-1 rounded-2xl border ${stateClasses} p-4 text-left transition">
        <span class="flex w-full items-center gap-2 text-xs font-medium ${labelClasses}">
          <span class="h-2 w-2 shrink-0 rounded-full ${dotClass}"></span>
          <span class="truncate">${label}</span>
          ${checkmark}
        </span>
        <span class="text-2xl font-semibold tabular-nums ${countClasses}">${count}</span>
      </button>`;
}

function renderSummary(view: AppView): string {
  const activeGroups = view.filter.groups;
  const allActive = activeGroups.length === 0;

  const allTile = renderFilterTile({
    action: 'data-action="clear-groups"',
    label: 'Alle',
    count: view.items.length,
    active: allActive,
    dotClass: 'bg-sky-400',
  });

  const tiles = GROUP_ORDER.map((group) =>
    renderFilterTile({
      action: `data-action="toggle-group" data-group="${group}"`,
      label: GROUP_LABELS[group],
      count: view.counts[group],
      active: activeGroups.includes(group),
      dotClass: GROUP_STYLES[group].dot,
    }),
  ).join('');

  const filteredCount = view.items.filter((item) => activeGroups.includes(item.group)).length;

  const status = allActive
    ? `<p class="mb-2 text-xs text-slate-400">
        Klicke eine Gruppe, um nur diese Batterien anzuzeigen - mehrere Gruppen lassen sich kombinieren.
      </p>`
    : `<p class="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <span class="font-semibold text-sky-300">Filter aktiv:</span>
        <span>${activeGroups.map((group) => GROUP_LABELS[group]).join(' &middot; ')}</span>
        <span class="text-slate-400">(${filteredCount} von ${view.items.length} Batterien)</span>
        <button type="button" data-action="clear-groups"
          class="cursor-pointer rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-200 transition hover:border-sky-500/60 hover:text-white">
          Alle anzeigen
        </button>
      </p>`;

  return `
  <section aria-label="Uebersicht und Filter">
    ${status}
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">${allTile}${tiles}</div>
  </section>`;
}

export function renderApp(view: AppView): string {
  const isPanel = view.mode === 'panel';
  const configured = view.settings.url.trim() !== '' && view.settings.token.trim() !== '';
  const showConnection = !isPanel && (!configured || view.settingsOpen);
  const body =
    isPanel || configured
      ? renderSummary(view) + renderControls(view) + renderBatteryGrid(view)
      : renderIntro();

  return `
    ${renderHeader(view)}
    <main class="mx-auto max-w-7xl px-4 pb-16 pt-6">
      ${showConnection ? renderConnection(view) : ''}
      ${body}
    </main>
    ${renderFooter()}`;
}

function renderIntro(): string {
  return `
  <section class="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
    <h2 class="text-base font-semibold text-slate-100">Willkommen bei AllBattery</h2>
    <p class="mt-2 max-w-3xl text-sm text-slate-300">
      Trage deine Home-Assistant-URL und einen Long-Lived Access Token ein, um alle
      Batterie-Entitaeten deiner Installation zu ueberwachen. AllBattery sucht Entitaeten mit
      <code class="rounded bg-slate-800 px-1.5 py-0.5 text-xs">device_class: battery</code>,
      gruppiert sie nach Zustand und schaetzt die Restlaufzeit aus dem Entladetrend.
    </p>
    <ul class="mt-4 grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
      <li>&#8226; Gruppierung: Kritisch, Warnung, Gut, Unbekannt</li>
      <li>&#8226; Filter &amp; Sortierung nach Ladestand, Name und Raum</li>
      <li>&#8226; Prognose der Restlaufzeit in Tagen und Stunden</li>
      <li>&#8226; Responsives Dashboard im Dark Mode</li>
    </ul>
  </section>`;
}

function renderConnection(view: AppView): string {
  const settings = view.settings;
  const closeButton = view.settingsOpen
    ? '<button type="button" data-action="toggle-settings" class="text-sm text-slate-400 transition hover:text-slate-200">Schliessen</button>'
    : '';

  return `
  <section class="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
    <div class="mb-4 flex items-center justify-between gap-3">
      <h2 class="text-base font-semibold text-slate-100">Verbindung zu Home Assistant</h2>
      ${closeButton}
    </div>

    <form data-role="connection-form" class="grid gap-4 sm:grid-cols-2">
      <label class="flex flex-col gap-1 sm:col-span-2">
        <span class="${LABEL_CLASS}">Home-Assistant-URL</span>
        <input type="text" name="url" required autocomplete="off" spellcheck="false"
          placeholder="http://homeassistant.local:8123" value="${escapeHtml(settings.url)}"
          class="${INPUT_CLASS}" />
      </label>

      <label class="flex flex-col gap-1 sm:col-span-2">
        <span class="${LABEL_CLASS}">Long-Lived Access Token</span>
        <input type="password" name="token" required autocomplete="off" spellcheck="false"
          placeholder="eyJhbGciOi..." value="${escapeHtml(settings.token)}"
          class="${INPUT_CLASS}" />
      </label>

      <label class="flex flex-col gap-1">
        <span class="${LABEL_CLASS}">Auto-Refresh (Sekunden, 0 = aus)</span>
        <input type="number" name="refreshSeconds" min="0" max="3600" step="5"
          value="${settings.refreshSeconds}" class="${INPUT_CLASS}" />
      </label>

      <label class="flex flex-col gap-1">
        <span class="${LABEL_CLASS}">Prognose-Zeitraum (Stunden)</span>
        <input type="number" name="forecastHours" min="1" max="336" step="1"
          value="${settings.forecastHours}" class="${INPUT_CLASS}" />
      </label>

      <label class="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" name="showForecast" ${settings.showForecast ? 'checked' : ''}
          class="h-4 w-4 rounded border-slate-600 bg-slate-950" />
        <span class="text-sm text-slate-300">Prognose-Modul aktivieren (nutzt /api/history/period)</span>
      </label>

      <div class="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button type="submit" class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">Verbinden</button>
        <button type="button" data-action="forget" class="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-rose-500/50 hover:text-rose-300">Zugangsdaten loeschen</button>
      </div>

      <p class="text-xs text-slate-400 sm:col-span-2">
        URL und Token bleiben ausschliesslich lokal in diesem Browser (localStorage) und werden
        nur an die oben angegebene Adresse gesendet - niemals an Dritte.
      </p>
    </form>
  </section>`;
}

function renderControls(view: AppView): string {
  const sortOptions: Array<{ value: SortKey; label: string }> = [
    { value: 'level', label: 'Ladestand (aufsteigend)' },
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'area', label: 'Raum (A-Z)' },
  ];

  const options = sortOptions
    .map(
      (option) =>
        `<option value="${option.value}" ${view.filter.sort === option.value ? 'selected' : ''}>${option.label}</option>`,
    )
    .join('');

  const resetButton =
    view.filter.groups.length > 0
      ? '<button type="button" data-action="clear-groups" class="text-sm text-sky-300 transition hover:text-sky-200">Filter zuruecksetzen</button>'
      : '';

  const forecastHint = view.forecastLoading
    ? '<span class="text-xs text-sky-300">Prognose wird berechnet ...</span>'
    : '';

  return `
  <section class="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
    <input type="search" data-role="query" value="${escapeHtml(view.filter.query)}"
      placeholder="Nach Name, Raum oder Entity-ID suchen ..."
      class="min-w-[14rem] flex-1 ${INPUT_CLASS}" />
    <label class="flex items-center gap-2 text-sm text-slate-300">
      <span>Sortieren:</span>
      <select data-role="sort" class="${INPUT_CLASS}">${options}</select>
    </label>
    ${forecastHint}
    ${resetButton}
  </section>`;
}

/** Hauptzeile der Karte: Geraetename, sonst der Entitaetsname. */
function displayTitle(item: BatteryItem): string {
  return item.device || item.name;
}

/** Detailangaben fuer den Mouse-Over-Tooltip. */
function renderTooltip(item: BatteryItem): string {
  const rows: Array<[string, string]> = [
    ['Gerät', item.device || '—'],
    ['Bereich', item.area || '—'],
    ['Entität', item.name],
    ['Entity-ID', item.entityId],
    ['Zustand', `${item.rawState}${item.unit ? ` ${item.unit}` : ''}`],
    ['Gruppe', GROUP_LABELS[item.group]],
  ];

  const forecast = item.forecast;
  if (forecast) {
    rows.push(['Prognose', forecastText(item) ?? '—']);
    rows.push([
      'Trend',
      `${formatRate(forecast.percentPerHour)} · ${forecast.sampleCount} Messpunkte · ${formatDuration(forecast.spanHours)}`,
    ]);
  }
  if (item.lastChanged) {
    rows.push(['Letzte Änderung', new Date(item.lastChanged).toLocaleString('de-DE')]);
  }

  const entries = rows
    .map(
      ([label, value]) =>
        `<dt class="text-slate-400">${escapeHtml(label)}</dt><dd class="break-words text-slate-100">${escapeHtml(value)}</dd>`,
    )
    .join('');

  return `
    <div class="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-72 rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-xl group-hover:block group-focus-within:block">
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">${entries}</dl>
    </div>`;
}

function renderCard(item: BatteryItem): string {
  const styles = GROUP_STYLES[item.group];
  const unknown = item.level === null;
  const percent = unknown ? 100 : Math.max(0, Math.min(100, item.level ?? 0));
  const forecast = forecastText(item);
  const updated = item.lastChanged ? new Date(item.lastChanged).toLocaleString('de-DE') : '';
  const title = displayTitle(item);
  const subtitle = [item.area, item.device ? item.name : ''].filter((part) => part !== '').join(' · ');

  return `
  <article tabindex="0"
    class="group relative flex flex-col gap-3 rounded-2xl border ${styles.card} bg-slate-900/60 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60">
    ${renderTooltip(item)}
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="truncate text-sm font-semibold text-slate-100">${escapeHtml(title)}</h3>
        ${subtitle ? `<p class="mt-0.5 truncate text-xs text-slate-400">${escapeHtml(subtitle)}</p>` : ''}
        <p class="mt-0.5 truncate font-mono text-[11px] text-slate-500">${escapeHtml(item.entityId)}</p>
      </div>
      <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${styles.badge}">${escapeHtml(levelLabel(item))}</span>
    </div>

    <div class="level-bar" role="img" aria-label="${escapeHtml(levelLabel(item))}">
      <div class="level-bar__fill ${unknown ? 'level-bar__fill--unknown' : styles.fill}" style="width:${percent}%"></div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
      <span class="text-slate-400">${GROUP_LABELS[item.group]}</span>
      ${forecast ? `<span class="text-slate-300">${escapeHtml(forecast)}</span>` : ''}
    </div>

    ${updated ? `<p class="text-[11px] text-slate-500">Letzte Aenderung: ${escapeHtml(updated)}</p>` : ''}
  </article>`;
}

export function renderBatteryGrid(view: AppView): string {
  const items = filterAndSort(view.items, view.filter);
  const gridClass = 'mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3';
  const emptyClass =
    'mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300';

  if (view.items.length === 0) {
    return `<section data-role="grid" class="${emptyClass}">
      Keine Batterie-Entitaeten gefunden. AllBattery sucht nach Entitaeten mit
      <code class="rounded bg-slate-800 px-1.5 py-0.5 text-xs">device_class: battery</code>.
    </section>`;
  }

  if (items.length === 0) {
    return `<section data-role="grid" class="${emptyClass}">Kein Eintrag passt zum aktuellen Filter.</section>`;
  }

  return `<section data-role="grid" class="${gridClass}">${items.map(renderCard).join('')}</section>`;
}

function renderFooter(): string {
  return `
  <footer class="border-t border-slate-800 py-6">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 text-xs text-slate-500">
      <span>AllBattery &middot; MIT-Lizenz</span>
      <span>Zugangsdaten bleiben lokal im Browser - es werden keine Daten an Dritte gesendet.</span>
      <a class="ml-auto text-slate-400 transition hover:text-slate-200" href="https://github.com/Grantii/AllBattery" target="_blank" rel="noopener noreferrer">Projekt auf GitHub</a>
    </div>
  </footer>`;
}
