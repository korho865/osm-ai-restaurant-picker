import type { SearchCenter } from '../domain/place'

const NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search'

type NominatimEntry = {
  lat: string
  lon: string
  display_name: string
}

export async function geocodeAddress(query: string): Promise<(SearchCenter & { label: string }) | null> {
  if (!query.trim()) return null

  const url = new URL(NOMINATIM_ENDPOINT)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('q', query.trim())

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error('Nominatim lookup failed')
  }

  const results: NominatimEntry[] = await response.json()
  if (!results.length) return null

  return {
    lat: Number(results[0].lat),
    lon: Number(results[0].lon),
    label: results[0].display_name,
  }
}
