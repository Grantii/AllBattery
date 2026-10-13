import type { Forecast } from './types';

export interface ForecastSample {
  /** Zeitstempel in Millisekunden. */
  t: number;
  /** Ladestand in Prozent. */
  v: number;
}

/** Ab dieser Steigung gilt ein Akku als "stabil" (Prozentpunkte pro Stunde). */
const EPSILON_PERCENT_PER_HOUR = 0.01;

/**
 * Lineare Restlaufzeit-Prognose aus dem Entladetrend.
 *
 * Es wird eine Ausgleichsgerade (Methode der kleinsten Quadrate) durch alle
 * Messpunkte gelegt - das ist deutlich robuster gegen Ausreisser als die
 * Betrachtung von erstem und letztem Wert.
 */
export function computeForecast(samples: ForecastSample[], currentLevel: number | null): Forecast {
  const clean = samples
    .filter((s) => Number.isFinite(s.t) && Number.isFinite(s.v))
    .sort((a, b) => a.t - b.t);

  const base: Forecast = {
    status: 'insufficient-data',
    percentPerHour: 0,
    hoursRemaining: null,
    spanHours: 0,
    sampleCount: clean.length,
  };

  if (clean.length < 3) return base;

  const first = clean[0]!;
  const last = clean[clean.length - 1]!;
  const spanHours = (last.t - first.t) / 3_600_000;
  if (spanHours < 0.25) return { ...base, spanHours };

  const n = clean.length;
  const meanT = clean.reduce((sum, s) => sum + s.t, 0) / n;
  const meanV = clean.reduce((sum, s) => sum + s.v, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (const sample of clean) {
    const dt = sample.t - meanT;
    numerator += dt * (sample.v - meanV);
    denominator += dt * dt;
  }
  if (denominator === 0) return { ...base, spanHours };

  const percentPerHour = (numerator / denominator) * 3_600_000;
  const level = currentLevel ?? last.v;

  if (percentPerHour < -EPSILON_PERCENT_PER_HOUR) {
    const hoursRemaining = level > 0 ? level / -percentPerHour : 0;
    return { status: 'discharging', percentPerHour, hoursRemaining, spanHours, sampleCount: n };
  }
  if (percentPerHour > EPSILON_PERCENT_PER_HOUR) {
    return { status: 'charging', percentPerHour, hoursRemaining: null, spanHours, sampleCount: n };
  }
  return { status: 'stable', percentPerHour, hoursRemaining: null, spanHours, sampleCount: n };
}

/** Formatiert eine Stundenzahl als "3 Tage 4 h" / "5 h 20 min" / "12 min". */
export function formatDuration(hours: number | null): string {
  if (hours === null || !Number.isFinite(hours)) return 'unbekannt';
  if (hours <= 0) return 'jetzt';

  const totalMinutes = Math.round(hours * 60);
  const days = Math.floor(totalMinutes / 1440);
  const restHours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return restHours > 0 ? `${days} Tage ${restHours} h` : `${days} Tage`;
  if (restHours > 0) return `${restHours} h ${minutes} min`;
  return `${minutes} min`;
}
