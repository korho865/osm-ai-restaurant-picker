import type { Place, SearchCenter } from '../domain/place'
import { getFiltersForCategories, resolveAmenitySelection, resolveShopSelection } from '../domain/food'

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

const RETRY_DELAYS_MS = [0, 400, 900]

type OverpassElement = {
  id: number
  type?: 'node' | 'way' | 'relation'
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
  const kind = element.tags.amenity ? 'amenity' : element.tags.shop ? 'shop' : null
  if (!kind) return null

  const typeValue = element.tags[kind]
  if (!typeValue) return null

  return {
    id: `${element.type ?? 'node'}-${element.id}`,
    name: element.tags.name ?? 'Unnamed place',
    lat: location.lat,
    lon: location.lon,
    kind,
    type: typeValue,
    tags: element.tags,
    cuisine: element.tags.cuisine ?? null,
    opening_hours: element.tags.opening_hours ?? null,
    website: element.tags.website ?? null,
    phone: element.tags.phone ?? null,
    address: buildAddress(element.tags),
  }
}

function buildQuery(
  center: SearchCenter,
  radius: number,
  groupIds: string[],
  amenityOverrides: string[],
  shopOverrides: string[],
) {
  const { amenity, shop } = getFiltersForCategories(groupIds)
  if (!amenity.length && !shop.length) {
    throw new Error('No food categories selected')
  }

  const queryParts: string[] = []

  const amenityList = amenity.length ? resolveAmenitySelection(amenityOverrides, amenity) : []
  const shopList = shop.length ? resolveShopSelection(shopOverrides, shop) : []

  if (amenityList.length) {
    const list = amenityList.join('|')
    queryParts.push(
      `  node["amenity"~"^(${list})$"](around:${radius},${center.lat},${center.lon});`,
      `  way["amenity"~"^(${list})$"](around:${radius},${center.lat},${center.lon});`,
    )
  }

  if (shopList.length) {
    const list = shopList.join('|')
    queryParts.push(
      `  node["shop"~"^(${list})$"](around:${radius},${center.lat},${center.lon});`,
      `  way["shop"~"^(${list})$"](around:${radius},${center.lat},${center.lon});`,
    )
  }

  const joined = queryParts.join('\n')

  return `
[out:json][timeout:25];
(
${joined}
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
  groupIds: string[]
  amenityTypes: string[]
  shopTypes: string[]
}) {
  const query = buildQuery(params.center, params.radius, params.groupIds, params.amenityTypes, params.shopTypes)
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
