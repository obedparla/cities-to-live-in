const ALIASES: Record<string, string> = {
  UK: 'GB',
  EL: 'GR',
}

function normalize(code: string): string {
  const upper = code.toUpperCase()
  return ALIASES[upper] ?? upper
}

let displayNamesCache: Intl.DisplayNames | null = null
function getDisplayNames(): Intl.DisplayNames | null {
  if (typeof Intl === 'undefined' || !('DisplayNames' in Intl)) return null
  if (!displayNamesCache) {
    try {
      displayNamesCache = new Intl.DisplayNames(['en'], { type: 'region' })
    } catch {
      return null
    }
  }
  return displayNamesCache
}

export function countryName(code: string): string {
  const normalized = normalize(code)
  const displayNames = getDisplayNames()
  if (!displayNames) return normalized
  try {
    return displayNames.of(normalized) ?? normalized
  } catch {
    return normalized
  }
}

export function countryFlag(code: string): string {
  const normalized = normalize(code)
  if (normalized.length !== 2 || !/^[A-Z]{2}$/.test(normalized)) return ''
  const base = 0x1f1e6 - 'A'.charCodeAt(0)
  return String.fromCodePoint(
    base + normalized.charCodeAt(0),
    base + normalized.charCodeAt(1)
  )
}
