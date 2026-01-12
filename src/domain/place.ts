export type PreferenceMode = 'close' | 'balanced' | 'info'

export type FoodKind = 'amenity' | 'shop'

export type SearchCenter = {
  lat: number
  lon: number
}

export type SearchPreferences = {
  radius: number
  groupIds: string[]
  selectedAmenityTypes: string[]
  selectedShopTypes: string[]
  preferenceMode: PreferenceMode
}

export type Place = {
  id: string
  name: string
  lat: number
  lon: number
  kind: FoodKind
  type: string
  tags: Record<string, string>
  cuisine: string | null
  opening_hours: string | null
  website: string | null
  phone: string | null
  address: string | null
}

export type ScoreBreakdownRow = {
  label: string
  value: number
  reason: string
}

export type ScoredPlace = Place & {
  distanceKm: number
  score: number
  breakdown: ScoreBreakdownRow[]
}

export type AppStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error'
