/** Preferências locais do visualizador (cada navegador guarda as suas). */
const PREFIX = 'ses-mail-viewer:'

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // armazenamento indisponível (modo privado, cota): segue sem persistir
  }
}
