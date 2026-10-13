import type { HassHistoryEntry, HassState } from './types';

export class HassError extends Error {
  readonly status: number | undefined;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'HassError';
    this.status = status;
  }
}

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (trimmed === '') return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

/**
 * Minimaler Client fuer die Home-Assistant-REST-API.
 *
 * Der Token wird nur im Speicher gehalten und ausschliesslich als
 * `Authorization`-Header an die vom Nutzer konfigurierte URL gesendet.
 */
export class HomeAssistantClient {
  readonly baseUrl: string;
  private readonly token: string;

  constructor(url: string, token: string) {
    this.baseUrl = normalizeBaseUrl(url);
    this.token = token.trim();
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  private async send(path: string, init?: RequestInit): Promise<Response> {
    if (this.baseUrl === '') {
      throw new HassError('Es ist noch keine Home-Assistant-URL konfiguriert.');
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { ...this.headers, ...(init?.headers as Record<string, string> | undefined) },
      });
    } catch {
      throw new HassError(
        `Keine Verbindung zu ${this.baseUrl}. Bitte URL, Netzwerk und CORS pruefen.`,
      );
    }

    if (!response.ok) {
      const hint =
        response.status === 401
          ? ' Der Token ist ungueltig oder abgelaufen.'
          : response.status === 404
            ? ' Endpunkt nicht gefunden - bitte die URL pruefen.'
            : '';
      throw new HassError(`HTTP ${response.status} ${response.statusText}.${hint}`, response.status);
    }
    return response;
  }

  private async requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.send(path, init);
    const text = await response.text();
    return (text === '' ? undefined : JSON.parse(text)) as T;
  }

  private async requestText(path: string, init?: RequestInit): Promise<string> {
    const response = await this.send(path, init);
    return response.text();
  }

  /** Prueft die Verbindung: `GET /api/` liefert `{ "message": "API running." }`. */
  async testConnection(): Promise<string> {
    const data = await this.requestJson<{ message?: string }>('/api/');
    return data?.message ?? 'API erreichbar.';
  }

  /** Alle Entitaeten der Instanz. */
  async getStates(): Promise<HassState[]> {
    const data = await this.requestJson<HassState[]>('/api/states');
    return Array.isArray(data) ? data : [];
  }

  /** Verlauf einer Entitaet ueber die letzten `hours` Stunden. */
  async getHistory(entityId: string, hours: number): Promise<HassHistoryEntry[]> {
    const end = new Date();
    const start = new Date(end.getTime() - hours * 3_600_000);
    const query = [
      `filter_entity_id=${encodeURIComponent(entityId)}`,
      `end_time=${encodeURIComponent(end.toISOString())}`,
      'minimal_response',
      'no_attributes',
    ].join('&');
    const path = `/api/history/period/${encodeURIComponent(start.toISOString())}?${query}`;

    const data = await this.requestJson<HassHistoryEntry[][]>(path);
    return Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];
  }

  /**
   * Bereiche (Raeume) aller Batterie-Entitaeten ueber die Template-API.
   * Liefert eine Zuordnung `entity_id -> Raumname` (leerer String = kein Raum).
   * Schlaegt der Aufruf fehl, wird das vom Aufrufer ignoriert.
   */
  async getAreas(): Promise<Record<string, string>> {
    const template = [
      "{% for s in states if s.attributes.device_class == 'battery' %}",
      "{{ s.entity_id }}={{ area_name(s.entity_id) or '' }}\n",
      '{% endfor %}',
    ].join('');

    const result = await this.requestText('/api/template', {
      method: 'POST',
      body: JSON.stringify({ template }),
    });

    const map: Record<string, string> = {};
    for (const line of result.split('\n')) {
      const separator = line.indexOf('=');
      if (separator <= 0) continue;
      const entityId = line.slice(0, separator).trim();
      const area = line.slice(separator + 1).trim();
      if (entityId.includes('.')) map[entityId] = area;
    }
    return map;
  }
}
