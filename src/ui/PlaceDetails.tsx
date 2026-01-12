import type { ScoredPlace } from '../domain/place'

type PlaceDetailsProps = {
  place: ScoredPlace | null
}

export function PlaceDetails({ place }: PlaceDetailsProps) {
  if (!place) {
    return (
      <section className="details">
        <p className="subtle">Select a result to see the scoring explanation.</p>
      </section>
    )
  }

  return (
    <section className="details">
      <header>
        <p className="eyebrow">Explanation</p>
        <h2>{place.name}</h2>
        <p className="details__score">Final score {place.score}</p>
      </header>

      <ul className="breakdown">
        {place.breakdown.map((row, index) => (
          <li key={`${row.label}-${index}`}>
            <div>
              <p>{row.label}</p>
              <p className="subtle">{row.reason}</p>
            </div>
            <span>+{row.value.toFixed(2)}</span>
          </li>
        ))}
      </ul>

      <div className="details__meta">
        <p>
          <span className="subtle">Amenity</span>
          <br />
          {place.amenity}
        </p>
        {place.address && (
          <p>
            <span className="subtle">Address</span>
            <br />
            {place.address}
          </p>
        )}
        {place.phone && (
          <p>
            <span className="subtle">Phone</span>
            <br />
            {place.phone}
          </p>
        )}
        {place.website && (
          <p>
            <span className="subtle">Website</span>
            <br />
            <a href={place.website} target="_blank" rel="noreferrer">
              {place.website.replace(/^https?:\/\//, '')}
            </a>
          </p>
        )}
        {place.opening_hours && (
          <p>
            <span className="subtle">Opening hours</span>
            <br />
            {place.opening_hours}
          </p>
        )}
      </div>
    </section>
  )
}
