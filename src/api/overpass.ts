import type { AmenityType, Place, SearchCenter } from '../domain/place'
import { buildAmenityFilter } from '../domain/scoring'

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter'

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

export async function fetchPlacesFromOverpass(params: {
  center: SearchCenter
  radius: number
  types: AmenityType[]
}) {
  const query = buildQuery(params.center, params.radius, params.types)
  const body = new URLSearchParams({ data: query })

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })

  if (!response.ok) {
    throw new Error(`Overpass request failed (${response.status})`)
  }

  const data: OverpassResponse = await response.json()
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
