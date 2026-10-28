/**
 * UPBUS Mobility - Gerenciador de Favoritos do Passageiro (LocalStorage)
 */

const STORAGE_KEYS = {
  LINES: 'upbus_fav_lines',
  STOPS: 'upbus_fav_stops',
  RECENT_SEARCHES: 'upbus_recent_searches',
};

function safeGetItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Erro ao salvar no localStorage:', e);
  }
}

// 1. Linhas Favoritas
export function getFavoriteLines(): string[] {
  return safeGetItem<string[]>(STORAGE_KEYS.LINES, []);
}

export function isFavoriteLine(lineId: string): boolean {
  return getFavoriteLines().includes(lineId);
}

export function toggleFavoriteLine(lineId: string): boolean {
  const current = getFavoriteLines();
  let updated: string[];
  const isFav = current.includes(lineId);
  if (isFav) {
    updated = current.filter((id) => id !== lineId);
  } else {
    updated = [...current, lineId];
  }
  safeSetItem(STORAGE_KEYS.LINES, updated);
  return !isFav;
}

// 2. Pontos Favoritos
export function getFavoriteStops(): string[] {
  return safeGetItem<string[]>(STORAGE_KEYS.STOPS, []);
}

export function isFavoriteStop(stopId: string): boolean {
  return getFavoriteStops().includes(stopId);
}

export function toggleFavoriteStop(stopId: string): boolean {
  const current = getFavoriteStops();
  let updated: string[];
  const isFav = current.includes(stopId);
  if (isFav) {
    updated = current.filter((id) => id !== stopId);
  } else {
    updated = [...current, stopId];
  }
  safeSetItem(STORAGE_KEYS.STOPS, updated);
  return !isFav;
}

// 3. Consultas Frequentes / Histórico de Busca
export function getRecentSearches(): string[] {
  return safeGetItem<string[]>(STORAGE_KEYS.RECENT_SEARCHES, []);
}

export function addRecentSearch(term: string): void {
  const trimmed = term.trim();
  if (!trimmed || trimmed.length < 2) return;
  const current = getRecentSearches().filter(
    (t) => t.toLowerCase() !== trimmed.toLowerCase()
  );
  // Mantém no máximo 8 buscas recentes
  const updated = [trimmed, ...current].slice(0, 8);
  safeSetItem(STORAGE_KEYS.RECENT_SEARCHES, updated);
}

export function clearRecentSearches(): void {
  safeSetItem(STORAGE_KEYS.RECENT_SEARCHES, []);
}
