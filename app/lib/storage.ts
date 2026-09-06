// Wrapper unico per localStorage: prefisso comune, JSON parse/stringify centralizzato,
// e resistenza a storage assente, dati corrotti o quota esaurita (es. navigazione privata).

const STORAGE_PREFIX = 'scale-fingering:';

export function readStorage<T>(key: string, parse: (value: unknown) => T): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    return raw === null ? null : parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Quota esaurita o storage non disponibile: i dati restano solo in memoria per la sessione corrente.
  }
}
