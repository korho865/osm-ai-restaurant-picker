import { useState } from 'react'
import './App.css'
import { Controls } from './ui/Controls'
import { MapView } from './ui/MapView'
import { ResultsList } from './ui/ResultsList'
import { PlaceDetails } from './ui/PlaceDetails'
import { fetchPlacesFromOverpass } from './api/overpass'
import { geocodeAddress } from './api/nominatim'
import { scorePlaces } from './domain/scoring'
import { DEFAULT_FOOD_CATEGORY_IDS } from './domain/food'
import type { AppStatus, ScoredPlace, SearchCenter, SearchPreferences } from './domain/place'

const DEFAULT_CENTER: SearchCenter = { lat: 52.3728, lon: 4.8936 }
const DEFAULT_PREFS: SearchPreferences = {
  radius: 1500,
  groupIds: [...DEFAULT_FOOD_CATEGORY_IDS],
  selectedAmenityTypes: [],
  selectedShopTypes: [],
  preferenceMode: 'balanced',
}

function App() {
  const [center, setCenter] = useState<SearchCenter>(DEFAULT_CENTER)
  const [preferences, setPreferences] = useState<SearchPreferences>(DEFAULT_PREFS)
  const [status, setStatus] = useState<AppStatus>('idle')
  const [results, setResults] = useState<ScoredPlace[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const clearResults = () => {
    setResults([])
    setSelectedId(null)
    setError(null)
  }

  const handleCenterChange = (next: SearchCenter) => {
    setCenter(next)
    if (status !== 'loading') {
      clearResults()
      setStatus('idle')
    }
  }

  const handlePreferencesChange = (next: SearchPreferences) => {
    setPreferences(next)
  }

  const handleSearch = async () => {
    setStatus('loading')
    setError(null)
    try {
      const raw = await fetchPlacesFromOverpass({
        center,
        radius: preferences.radius,
        groupIds: preferences.groupIds,
        amenityTypes: preferences.selectedAmenityTypes,
        shopTypes: preferences.selectedShopTypes,
      })
      if (!raw.length) {
        clearResults()
        setStatus('empty')
        return
      }

      const scored = scorePlaces(raw, center, preferences)
      if (!scored.length) {
        clearResults()
        setStatus('empty')
        return
      }

      setResults(scored)
      setSelectedId(scored[0]?.id ?? null)
      setStatus('success')
    } catch (caught) {
      setStatus('error')
      setError(caught instanceof Error ? caught.message : 'Unknown error')
    }
  }

  const handleLocateMe = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser')
      setStatus('error')
      return
    }

    return new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleCenterChange({ lat: position.coords.latitude, lon: position.coords.longitude })
          resolve()
        },
        (geoError) => {
          setError(`Unable to read your location (${geoError.message})`)
          setStatus('error')
          reject(geoError)
        },
        { enableHighAccuracy: true, timeout: 10000 },
      )
    })
  }

  const handleGeocode = async (query: string) => {
    const hit = await geocodeAddress(query)
    if (hit) {
      handleCenterChange({ lat: hit.lat, lon: hit.lon })
      return hit.label
    }
    return null
  }

  const placeForDetails = status === 'success' ? results.find((place) => place.id === selectedId) ?? null : null
  const visiblePlaces = status === 'success' ? results.slice(0, 15) : []
  const disableSearch = status === 'loading'

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">OSM AI Restaurant Picker</p>
          <h1>Pick a vibe, let transparent AI do the sorting</h1>
          <p className="lede">
            Click anywhere in Amsterdam (or use your location), tune the scoring weights, and the rule-based explanation engine will rank nearby restaurants, cafes, and fast-food spots using OpenStreetMap data.
          </p>
        </div>
        <div className="hero__badge">Built with Overpass + Leaflet</div>
      </header>

      <div className="layout">
        <MapView
          center={center}
          radius={preferences.radius}
          places={visiblePlaces}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCenterChange={handleCenterChange}
        />

        <div className="panel">
          <Controls
            center={center}
            status={status}
            preferences={preferences}
            onPreferencesChange={handlePreferencesChange}
            onSearch={handleSearch}
            disableSearch={disableSearch}
            onLocateMe={handleLocateMe}
            onGeocode={handleGeocode}
          />

          <ResultsList
            results={results}
            status={status}
            error={error}
            onSelect={setSelectedId}
            selectedId={selectedId}
          />

          <PlaceDetails place={placeForDetails} />
        </div>
      </div>

      <footer className="score-note">
        <p>
          We rank places using a simple, explainable score based on distance, how well a place matches your selected groups, and a small bonus for being well-documented in OpenStreetMap (opening hours, website, cuisine tags, etc.). Switch between Prefer close, Balanced, and Prefer info-rich to adjust the weights, and open "Why this place?" to see the exact breakdown.
        </p>
      </footer>
    </div>
  )
}

export default App
