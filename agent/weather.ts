// Weather is fetched once per user per hour and injected into AgentContext
// as data (tool layer dev spec §3), never exposed as a get_weather tool --
// rain is a hard constraint (see api/dal/garments.ts:listCandidateGarments),
// so it must not depend on the model sequencing a fetch correctly. There is
// always a forecast snapshot (live or fallback); the model can only *refine*
// it with what the user explicitly states about the weather where they are
// (get_candidates' stated_temp_f / stated_condition -> applyStatedWeather),
// never remove the floor.

export type WeatherCondition = 'clear' | 'rain' | 'snow' | 'wind';

export interface WeatherSnapshot {
  condition: WeatherCondition;
  tempF: number;
  // Provenance, and it must survive into the trajectory log:
  //   'live'        -- from the forecast provider
  //   'fallback'    -- provider failed; a proposal made on this is degraded,
  //                    not broken, but the degradation must be traceable
  //   'user_stated' -- the user overrode the forecast for at least one field
  source: 'live' | 'fallback' | 'user_stated';
}

// What the user explicitly told us about their current weather. Either field
// may be absent -- "it's 80 out" sets tempF and leaves condition alone.
export interface StatedWeather {
  tempF?: number;
  condition?: WeatherCondition;
}

// Layer a user statement over the forecast. Unstated fields fall through to
// the forecast; if anything was stated, the result is marked 'user_stated'
// so downstream (the warmth/rain filter, the outfits decision snapshot) and
// the trajectory all record that the proposal was made on the user's word,
// not the forecast.
export function applyStatedWeather(
  forecast: WeatherSnapshot,
  stated: StatedWeather | null,
): WeatherSnapshot {
  if (!stated || (stated.tempF === undefined && stated.condition === undefined)) {
    return forecast;
  }
  return {
    tempF: stated.tempF ?? forecast.tempF,
    condition: stated.condition ?? forecast.condition,
    source: 'user_stated',
  };
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface WeatherProvider {
  forecast(location: Location, when: Date): Promise<WeatherSnapshot>;
}

// Used on provider failure (network error, non-2xx, malformed body).
// 'clear' is the least constraining condition -- it doesn't spuriously
// exclude non-water-resistant garments the way defaulting to 'rain' would.
const FALLBACK_SNAPSHOT: WeatherSnapshot = {
  condition: 'clear',
  tempF: 65,
  source: 'fallback',
};

// Open-Meteo: no API key required (tool layer dev spec §9.2). WMO weather
// code buckets collapse to our four-value condition enum; anything not
// recognized falls through to 'clear' rather than throwing, since an
// unmapped code is a forecast we don't understand, not a fetch failure.
function conditionFromWmoCode(code: number): WeatherCondition {
  if (code >= 71 && code <= 86) return 'snow';
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99)
  ) {
    return 'rain';
  }
  if (code === 0 || code === 1) return 'clear';
  return 'wind';
}

export class OpenMeteoWeatherProvider implements WeatherProvider {
  async forecast(location: Location, when: Date): Promise<WeatherSnapshot> {
    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', String(location.latitude));
      url.searchParams.set('longitude', String(location.longitude));
      url.searchParams.set('current', 'temperature_2m,weather_code');
      url.searchParams.set('temperature_unit', 'fahrenheit');

      const response = await fetch(url);
      if (!response.ok) return FALLBACK_SNAPSHOT;

      const body = (await response.json()) as {
        current?: { temperature_2m?: number; weather_code?: number };
      };
      const tempF = body.current?.temperature_2m;
      const weatherCode = body.current?.weather_code;
      if (tempF === undefined || weatherCode === undefined) {
        return FALLBACK_SNAPSHOT;
      }

      return {
        condition: conditionFromWmoCode(weatherCode),
        tempF,
        source: 'live',
      };
    } catch {
      return FALLBACK_SNAPSHOT;
    }
  }
}

// Cache one call per user per hour (tool layer dev spec §3). Keyed on
// userId, not location, since AgentContext is built per-user and the
// location itself comes from the user's profile.
export function cachedWeatherProvider(
  inner: WeatherProvider,
): (userId: number, location: Location, when: Date) => Promise<WeatherSnapshot> {
  const cache = new Map<number, { fetchedAtMs: number; snapshot: WeatherSnapshot }>();
  const ONE_HOUR_MS = 60 * 60 * 1000;

  return async (userId, location, when) => {
    const cached = cache.get(userId);
    if (cached && when.getTime() - cached.fetchedAtMs < ONE_HOUR_MS) {
      return cached.snapshot;
    }
    const snapshot = await inner.forecast(location, when);
    cache.set(userId, { fetchedAtMs: when.getTime(), snapshot });
    return snapshot;
  };
}
