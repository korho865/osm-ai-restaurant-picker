import { useState } from 'react'
import type { FormEvent } from 'react'
import type { AmenityType, PreferenceMode, SearchCenter, SearchPreferences } from '../domain/place'
import type { AppStatus } from '../domain/place'

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

const typeOptions: { label: string; value: AmenityType }[] = [
  { label: 'Restaurant', value: 'restaurant' },
  { label: 'Cafe', value: 'cafe' },
  { label: 'Fast food', value: 'fast_food' },
]

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

  const toggleType = (type: AmenityType) => {
    const hasType = preferences.types.includes(type)
    if (hasType && preferences.types.length === 1) return
    const nextTypes = hasType ? preferences.types.filter((t) => t !== type) : [...preferences.types, type]
    setPreferences({ types: nextTypes })
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
        <label className="field-label">Place types</label>
        <div className="chips">
          {typeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`chip ${preferences.types.includes(option.value) ? 'chip--active' : ''}`}
              onClick={() => toggleType(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="field-label">Cuisine keyword (optional)</label>
        <input
          className="text"
          placeholder="ramen, vegan, tapas..."
          value={preferences.cuisineKeyword}
          onChange={(event) => setPreferences({ cuisineKeyword: event.target.value })}
        />
        <p className="subtle">Matches against both `cuisine` tags and the place name.</p>
      </div>

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
