import type { AppStatus, ScoredPlace } from '../domain/place'
import { formatFoodType } from '../domain/food'

type ResultsListProps = {
  results: ScoredPlace[]
  status: AppStatus
  error: string | null
  onSelect: (id: string) => void
  selectedId: string | null
}

const statusCopy: Record<AppStatus, string> = {
  idle: 'Choose a spot on the map and start the search.',
  loading: 'Crunching OSM data...',
  success: '',
  empty: 'No results found in this radius. Try widening your search.',
  error: 'Something went wrong. Check the message below.',
}

export function ResultsList({ results, status, error, onSelect, selectedId }: ResultsListProps) {
  const headline = statusCopy[status]
  const showList = status === 'success' && results.length > 0

  return (
    <section className="results">
      <header className="results__header">
        <div>
          <p className="eyebrow">Top picks</p>
          {showList ? (
            <h2>Top {Math.min(results.length, 15)} picks near you</h2>
          ) : (
            <h2>{headline}</h2>
          )}
        </div>
        {status === 'loading' && <div className="dot-loader" aria-label="Loading" />}
      </header>

      {status === 'error' && error && <p className="error">{error}</p>}

      {showList && (
        <div className="result-grid">
          {results.slice(0, 15).map((place, index) => (
            <button
              key={place.id}
              className={`result-card ${selectedId === place.id ? 'result-card--active' : ''}`}
              onClick={() => onSelect(place.id)}
            >
              <p className="result-rank">#{index + 1}</p>
              <h3>{place.name}</h3>
              <p className="result-amenity">{formatFoodType(place.kind, place.type)}</p>
              <p className="result-meta">
                <span>{place.distanceKm.toFixed(2)} km</span>
                <span>Score {place.score}</span>
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
