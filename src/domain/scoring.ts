import type {
  AmenityType,
  Place,
  PreferenceMode,
  ScoreBreakdownRow,
  ScoredPlace,
  SearchCenter,
  SearchPreferences,
} from './place'

const EARTH_RADIUS_KM = 6371

const preferenceWeights: Record<PreferenceMode, { distance: number; cuisine: number; info: number }> = {
  close: { distance: 0.65, cuisine: 0.2, info: 0.15 },
  balanced: { distance: 0.45, cuisine: 0.3, info: 0.25 },
  info: { distance: 0.3, cuisine: 0.25, info: 0.45 },
}

export function toRadians(value: number) {
  return (value * Math.PI) / 180
}

export function haversineDistanceKm(from: SearchCenter, to: SearchCenter) {
  const dLat = toRadians(to.lat - from.lat)
  const dLon = toRadians(to.lon - from.lon)
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_KM * c
}

function computeCuisineScore(place: Place, keyword: string) {
  if (!keyword.trim()) return { score: 0, reason: 'No cuisine preference set' }

  const normalizedKeyword = keyword.trim().toLowerCase()
  const tags = place.cuisine?.split(';').map((item) => item.trim().toLowerCase()) ?? []
  if (tags.includes(normalizedKeyword)) {
    return { score: 2, reason: `Matches cuisine tag "${normalizedKeyword}"` }
  }

  if (place.name.toLowerCase().includes(normalizedKeyword)) {
    return { score: 1, reason: `Name mentions "${normalizedKeyword}"` }
  }

  return { score: 0, reason: 'No matching cuisine tags or name hints' }
}

function computeInfoScore(place: Place) {
  const infoRows: ScoreBreakdownRow[] = []
  const addRow = (label: string, value: number) => {
    infoRows.push({ label, value, reason: label })
  }

  if (place.opening_hours) addRow('Has opening hours', 0.4)
  if (place.website) addRow('Has website', 0.3)
  if (place.phone) addRow('Has phone number', 0.2)
  if (place.cuisine) addRow('Has cuisine tag', 0.1)
  if (place.address) addRow('Has address info', 0.1)

  const infoScore = infoRows.reduce((sum, row) => sum + row.value, 0)
  return { score: infoScore, rows: infoRows }
}

export function scorePlaces(places: Place[], center: SearchCenter, prefs: SearchPreferences): ScoredPlace[] {
  const weights = preferenceWeights[prefs.preferenceMode]

  return places
    .map((place) => {
      const target = { lat: place.lat, lon: place.lon }
      const distanceKm = haversineDistanceKm(center, target)
      const distanceScore = (1 / (1 + distanceKm)) * 5
      const distanceContribution = weights.distance * distanceScore

      const cuisineResult = computeCuisineScore(place, prefs.cuisineKeyword)
      const cuisineContribution = weights.cuisine * cuisineResult.score

      const infoResult = computeInfoScore(place)
      const infoContribution = weights.info * infoResult.score

      const totalScore = distanceContribution + cuisineContribution + infoContribution

      const breakdown: ScoreBreakdownRow[] = [
        {
          label: 'Close to you',
          value: Number(distanceContribution.toFixed(2)),
          reason: `${distanceKm.toFixed(2)} km away (scaled distance score ${distanceScore.toFixed(2)})`,
        },
      ]

      if (cuisineResult.score > 0) {
        breakdown.push({
          label: 'Cuisine match',
          value: Number(cuisineContribution.toFixed(2)),
          reason: cuisineResult.reason,
        })
      }

      infoResult.rows.forEach((row) => {
        breakdown.push({
          label: row.label,
          value: Number((weights.info * row.value).toFixed(2)),
          reason: `${row.label} (+${row.value.toFixed(2)} raw info score)`,
        })
      })

      if (cuisineResult.score === 0) {
        breakdown.push({
          label: 'Cuisine',
          value: 0,
          reason: cuisineResult.reason,
        })
      }

      if (infoResult.rows.length === 0) {
        breakdown.push({
          label: 'Information tags',
          value: 0,
          reason: 'No extra info such as hours, contact, cuisine, or address',
        })
      }

      return {
        ...place,
        distanceKm,
        score: Number(totalScore.toFixed(2)),
        breakdown,
      }
    })
    .sort((a, b) => b.score - a.score)
}

export function buildAmenityFilter(types: AmenityType[]) {
  return types.length ? types : ['restaurant', 'cafe', 'fast_food']
}
