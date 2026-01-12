import { useState } from 'react'
import type { FormEvent } from 'react'
import type { PreferenceMode, SearchCenter, SearchPreferences } from '../domain/place'
import type { AppStatus } from '../domain/place'
import {
  FOOD_CATEGORIES,
  EAT_AND_DRINK_CATEGORY_ID,
  BUY_FOOD_CATEGORY_ID,
  getAmenityOptionsForGroups,
  getShopOptionsForGroups,
} from '../domain/food'

const preferenceLabels: Record<PreferenceMode, string> = {
  close: 'Prefer close',
  balanced: 'Balanced',
  info: 'Prefer info-rich',
}

type ControlsProps = {
  center: SearchCenter
  status: AppStatus
  preferences: SearchPreferences
  onPreferencesChange: (next: SearchPreferences) => void
  onSearch: () => void
  disableSearch: boolean
  onLocateMe: () => Promise<void> | void
  onGeocode: (query: string) => Promise<string | null>
}

export function Controls({
  center,
  status,
  preferences,
  onPreferencesChange,
  onSearch,
  disableSearch,
  onLocateMe,
  onGeocode,
}: ControlsProps) {
  const [addressQuery, setAddressQuery] = useState('')
  const [geocodeMessage, setGeocodeMessage] = useState<string | null>(null)
  const [geocoding, setGeocoding] = useState(false)

  const setPreferences = (patch: Partial<SearchPreferences>) => {
    onPreferencesChange({ ...preferences, ...patch })
  }

  const toggleCategory = (categoryId: string) => {
    const hasCategory = preferences.groupIds.includes(categoryId)
    if (hasCategory && preferences.groupIds.length === 1) return
    const nextGroups = hasCategory
      ? preferences.groupIds.filter((id) => id !== categoryId)
      : [...preferences.groupIds, categoryId]
    const keepAmenitySelection = nextGroups.includes(EAT_AND_DRINK_CATEGORY_ID)
    const keepShopSelection = nextGroups.includes(BUY_FOOD_CATEGORY_ID)
    setPreferences({
      groupIds: nextGroups,
      selectedAmenityTypes: keepAmenitySelection ? preferences.selectedAmenityTypes : [],
      selectedShopTypes: keepShopSelection ? preferences.selectedShopTypes : [],
    })
  }

  const amenityOptions = getAmenityOptionsForGroups(preferences.groupIds)
  const amenitySelectionEnabled = amenityOptions.length > 0
  const shopOptions = getShopOptionsForGroups(preferences.groupIds)
  const shopSelectionEnabled = shopOptions.length > 0

  const toggleAmenity = (value: string) => {
    const hasValue = preferences.selectedAmenityTypes.includes(value)
    const nextValues = hasValue
      ? preferences.selectedAmenityTypes.filter((item) => item !== value)
      : [...preferences.selectedAmenityTypes, value]
    setPreferences({ selectedAmenityTypes: nextValues })
  }

  const toggleShop = (value: string) => {
    const hasValue = preferences.selectedShopTypes.includes(value)
    const nextValues = hasValue
      ? preferences.selectedShopTypes.filter((item) => item !== value)
      : [...preferences.selectedShopTypes, value]
    setPreferences({ selectedShopTypes: nextValues })
  }

  const handleGeocode = async (event: FormEvent) => {
    event.preventDefault()
    if (!addressQuery.trim()) return
    setGeocoding(true)
    setGeocodeMessage(null)
    try {
      const label = await onGeocode(addressQuery)
      if (label) {
        setGeocodeMessage(`Moved to ${label}`)
        setAddressQuery('')
      } else {
        setGeocodeMessage('No matching location found')
      }
    } catch (error) {
      setGeocodeMessage(error instanceof Error ? error.message : 'Search failed')
    } finally {
      setGeocoding(false)
    }
  }

  return (
    <section className="controls">
      <header className="controls__header">
        <div>
          <p className="eyebrow">Search center</p>
          <p className="coords">
            {center.lat.toFixed(4)} deg, {center.lon.toFixed(4)} deg
          </p>
        </div>
        <button type="button" className="ghost" onClick={onLocateMe} disabled={disableSearch}>
          Use my location
        </button>
      </header>

      <form className="controls__form" onSubmit={handleGeocode}>
        <label className="field-label">Jump to address (Nominatim)</label>
        <div className="field-row">
          <input
            className="text"
            placeholder="Dam Square, Amsterdam"
            value={addressQuery}
            onChange={(event) => setAddressQuery(event.target.value)}
            disabled={geocoding}
          />
          <button type="submit" className="ghost" disabled={geocoding || !addressQuery.trim()}>
            {geocoding ? 'Searching...' : 'Go'}
          </button>
        </div>
        {geocodeMessage && <p className="subtle">{geocodeMessage}</p>}
      </form>

      <div>
        <label className="field-label">Radius • {preferences.radius} m</label>
        <input
          type="range"
          min={250}
          max={5000}
          step={250}
          value={preferences.radius}
          onChange={(event) => setPreferences({ radius: Number(event.target.value) })}
        />
        <p className="subtle">Drag to adjust how far from the center we should look.</p>
      </div>

      <div>
        <label className="field-label">Food categories</label>
        <div className="category-grid">
          {FOOD_CATEGORIES.map((category) => {
            const selected = preferences.groupIds.includes(category.id)
            const tags = category.filters.flatMap((filter) => filter.values)
            const preview = tags.slice(0, 4).join(', ')
            return (
              <button
                key={category.id}
                type="button"
                className={`category-card ${selected ? 'category-card--active' : ''}`}
                onClick={() => toggleCategory(category.id)}
              >
                <div className="category-card__header">
                  <span>{category.label}</span>
                  <span className="category-card__badge">{selected ? 'Selected' : 'Tap to include'}</span>
                </div>
                <p className="subtle">{category.description}</p>
                <p className="category-card__tags subtle">
                  {preview}
                  {tags.length > 4 ? '…' : ''}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {amenitySelectionEnabled && (
        <div>
          <label className="field-label">Amenity focus (optional)</label>
          <div className="amenity-chips">
            {amenityOptions.map((value) => {
              const active = preferences.selectedAmenityTypes.includes(value)
              const label = value.replace(/_/g, ' ')
              return (
                <button
                  key={value}
                  type="button"
                  className={`amenity-chip ${active ? 'amenity-chip--active' : ''}`}
                  onClick={() => toggleAmenity(value)}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <p className="subtle">
            Narrow the search to specific amenity types. Leave all unchecked to include every eat & drink place.
          </p>
          {preferences.selectedAmenityTypes.length > 0 && (
            <button
              type="button"
              className="ghost ghost--inline"
              onClick={() => setPreferences({ selectedAmenityTypes: [] })}
            >
              Clear amenity focus
            </button>
          )}
        </div>
      )}

      {shopSelectionEnabled && (
        <div>
          <label className="field-label">Shop focus (optional)</label>
          <div className="amenity-chips">
            {shopOptions.map((value) => {
              const active = preferences.selectedShopTypes.includes(value)
              const label = value.replace(/_/g, ' ')
              return (
                <button
                  key={value}
                  type="button"
                  className={`amenity-chip ${active ? 'amenity-chip--active' : ''}`}
                  onClick={() => toggleShop(value)}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <p className="subtle">
            Focus the search on specialty food shops. Leave all unchecked to include every food retailer.
          </p>
          {preferences.selectedShopTypes.length > 0 && (
            <button
              type="button"
              className="ghost ghost--inline"
              onClick={() => setPreferences({ selectedShopTypes: [] })}
            >
              Clear shop focus
            </button>
          )}
        </div>
      )}

      <div>
        <label className="field-label">Preference mode</label>
        <div className="segments">
          {(Object.keys(preferenceLabels) as PreferenceMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`segment ${preferences.preferenceMode === mode ? 'segment--active' : ''}`}
              onClick={() => setPreferences({ preferenceMode: mode })}
            >
              {preferenceLabels[mode]}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="primary" onClick={onSearch} disabled={disableSearch}>
        {status === 'loading' ? 'Fetching places...' : 'Search places'}
      </button>
    </section>
  )
}
