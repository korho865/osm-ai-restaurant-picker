import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, CircleMarker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { ScoredPlace, SearchCenter } from '../domain/place'
import { formatFoodType } from '../domain/food'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

type MapViewProps = {
  center: SearchCenter
  radius: number
  places: ScoredPlace[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCenterChange: (center: SearchCenter) => void
}

function MapClickHandler({ onCenterChange }: { onCenterChange: MapViewProps['onCenterChange'] }) {
  useMapEvents({
    click: (event) => {
      onCenterChange({ lat: event.latlng.lat, lon: event.latlng.lng })
    },
  })
  return null
}

function MapPan({ center }: { center: SearchCenter }) {
  const map = useMap()
  useEffect(() => {
    map.panTo([center.lat, center.lon], { animate: true })
  }, [center, map])
  return null
}

export function MapView({ center, radius, places, selectedId, onSelect, onCenterChange }: MapViewProps) {
  const selectedPlace = places.find((place) => place.id === selectedId)

  return (
    <div className="map-shell">
      <MapContainer center={[center.lat, center.lon]} zoom={14} className="map">
        <TileLayer
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onCenterChange={onCenterChange} />
        <MapPan center={center} />
        <CircleMarker
          center={[center.lat, center.lon]}
          radius={8}
          pathOptions={{ color: '#ff8c52', weight: 2, fillColor: '#ff6230', fillOpacity: 0.8 }}
        />
        <Circle center={[center.lat, center.lon]} radius={radius} pathOptions={{ color: '#ff8c52', weight: 2, fillOpacity: 0.05 }} />
        {places.map((place) => (
          <Marker
            key={place.id}
            position={[place.lat, place.lon]}
            eventHandlers={{ click: () => onSelect(place.id) }}
          >
            <Popup>
              <strong>{place.name}</strong>
              <div>{formatFoodType(place.kind, place.type)}</div>
              <div>{place.distanceKm.toFixed(2)} km away</div>
              <div>Score: {place.score}</div>
            </Popup>
          </Marker>
        ))}
        {selectedPlace && (
          <Circle
            center={[selectedPlace.lat, selectedPlace.lon]}
            radius={90}
            pathOptions={{ color: '#101828', weight: 1.5, dashArray: '6 4', opacity: 0.8, fillOpacity: 0 }}
          />
        )}
      </MapContainer>
    </div>
  )
}
