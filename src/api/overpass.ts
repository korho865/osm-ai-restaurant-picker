import type { AmenityType, Place, SearchCenter } from '../domain/place'
import { buildAmenityFilter } from '../domain/scoring'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const RETRY_DELAYS_MS = [0, 400, 900]

type OverpassElement = {
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

type OverpassResponse = {
  elements: OverpassElement[]
}

function buildAddress(tags: Record<string, string> = {}) {
  const parts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']]
    .filter(Boolean)
    .join(' ')
  return parts || null
}

function normalizePlace(element: OverpassElement): Place | null {
  if (!element.tags) return null

  const location = element.center ?? (element.lat && element.lon ? { lat: element.lat, lon: element.lon } : null)
  if (!location) return null

  return {
    id: `${element.id}`,
    name: element.tags.name ?? 'Unnamed place',
    lat: location.lat,
    lon: location.lon,
    amenity: element.tags.amenity ?? 'poi',
    tags: element.tags,
    cuisine: element.tags.cuisine ?? null,
    opening_hours: element.tags.opening_hours ?? null,
    website: element.tags.website ?? null,
    phone: element.tags.phone ?? null,
    address: buildAddress(element.tags),
  }
}

function buildQuery(center: SearchCenter, radius: number, types: AmenityType[]) {
  const amenities = buildAmenityFilter(types).join('|')
  return `
[out:json][timeout:25];
(
  node["amenity"~"^(${amenities})$"](around:${radius},${center.lat},${center.lon});
  way["amenity"~"^(${amenities})$"](around:${radius},${center.lat},${center.lon});
);
out body;
>;
out center;`
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function requestOverpass(endpoint: string, body: string) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })

  if (!response.ok) {
    throw new Error(`status ${response.status}`)
  }

  return (await response.json()) as OverpassResponse
}

export async function fetchPlacesFromOverpass(params: {
  center: SearchCenter
  radius: number
  types: AmenityType[]
}) {
  const query = buildQuery(params.center, params.radius, params.types)
  const payload = new URLSearchParams({ data: query }).toString()
  const errors: string[] = []

  for (let attempt = 0; attempt < OVERPASS_ENDPOINTS.length; attempt += 1) {
    const endpoint = OVERPASS_ENDPOINTS[attempt]
    try {
      if (RETRY_DELAYS_MS[attempt]) {
        await sleep(RETRY_DELAYS_MS[attempt])
      }
      const data = await requestOverpass(endpoint, payload)
      return normalizeResponse(data)
    } catch (error) {
      errors.push(`${new URL(endpoint).host}: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  throw new Error(`Overpass request failed (${errors.join(' | ')})`)
}

function normalizeResponse(data: OverpassResponse) {
  const places: Place[] = []
  const seen = new Set<string>()

  for (const element of data.elements) {
    const normalized = normalizePlace(element)
    if (normalized && !seen.has(normalized.id)) {
      seen.add(normalized.id)
      places.push(normalized)
    }
  }

  return places
}
