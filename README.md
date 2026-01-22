# OSM AI Restaurant Picker

An explainable web app for ranking nearby restaurants, cafés, and food-related shops with OpenStreetMap data. Drop a pin anywhere in Amsterdam, tune the filters, and see exactly why each place lands in the top results.

## Highlights
- **Interactive map** – Leaflet + react-leaflet render the search center, radius ring, and tappable markers.
- **Category-first workflow** – Toggle high-level food groups, then narrow down with specific amenity or shop tags (restaurant, café, fast_food, bakery, etc.).
- **Transparent scoring** – Distance and metadata richness contribute to each score, and the breakdown appears in both the list and the detail panel.
- **Reliable data pipeline** – Overpass queries retry across multiple mirrors to avoid 504s/timeouts; Nominatim powers the “Jump to address” search.
- **Thoughtful controls** – Radius slider, preference mode (Prefer close / Balanced / Prefer info-rich), optional amenity + shop refinements, and “Use my location”.

## Tech Stack
- **UI:** React 19, TypeScript, Vite
- **Map:** Leaflet, react-leaflet
- **Data sources:** Overpass API, Nominatim geocoder
- **Tooling:** ESLint 9, TypeScript strict mode

## Getting Started

### Requirements
- Node.js 20+
- npm 10+

### Install Dependencies
```bash
npm install
```

### Run the Dev Server
```bash
npm run dev
```
Open the printed URL (default `http://localhost:5173`). Hot Module Replacement is enabled.

### Production Build
```bash
npm run build
```
This runs `tsc -b` for type-checking followed by `vite build`. Assets land in `dist/`.

### Preview Production Build
```bash
npm run preview
```

## Project Structure
```
src/
  api/            # Overpass and Nominatim clients
  domain/         # Types, food configuration, scoring logic
  ui/             # React components (Controls, MapView, ResultsList, PlaceDetails)
  assets/         # Static assets
public/           # Static files served by Vite
```

## Scoring Overview
1. **Distance component** – Uses a haversine distance scaled by the selected preference mode.
2. **Information component** – Adds bonuses for metadata such as opening hours, website, phone, cuisine, and address tags.
3. **Explainability** – Each contribution is surfaced in the UI so users can audit the recommendation.

## Usage Tips
- Click the map, use the address search, or share your location to move the center.
- If a query returns no results, widen the radius or include more food categories.
- The top 15 ranked places appear in the panel; click any card or marker to inspect its scoring breakdown.

## License
This project is intended for educational/demo purposes. Ensure you comply with the OpenStreetMap usage policies when deploying it publicly.
