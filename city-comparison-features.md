# City Comparison App - Implementation Plan

## Summary
Build a city ranking app for ~100 European cities using 3 free APIs (Eurostat, Open-Meteo, OSM Overpass) with ShadCN UI. Users can adjust weights to rank cities by their preferences.

---

## Tech Stack
- **Frontend**: React 19 + TanStack Router + ShadCN UI + Tailwind v4
- **Backend**: Convex (real-time DB + server actions)
- **APIs**: Eurostat (stats), Open-Meteo (weather/air), OSM Overpass (amenities)

---

## Data Sources (Resolved)

### 1. City List Source
- **URL**: `https://gisco-services.ec.europa.eu/distribution/v2/urau/geojson/URAU_LB_2024_4326_CITIES.geojson`
- Contains 1,087 cities with: `URAU_CODE`, `URAU_NAME`, `CNTR_CODE`, `lat/lon`, `AREA_SQM`
- Filter to ~100 cities by selecting capitals (`CITY_CPTL=Y`) + major cities by population

### 2. Eurostat API
**Base URL**: `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/{dataset}?format=JSON&lang=EN&cities={code}`

| Dataset | Category | Key Indicators |
|---------|----------|----------------|
| `urb_cpop1` | Population | DE1001V (total), DE1040V-DE1139V (by age/sex) |
| `urb_clma` | Labour | EC1001V-EC1003V (active pop), EC2020V (employment) |
| `urb_cecfi` | Economy | EC* codes for GDP, income |
| `urb_clivcon` | Living | SA1049V (rent €/m²), SA1050V (house prices) |
| `urb_cenv` | Environment | EN* codes for green areas |
| `urb_ceduc` | Education | Education attainment stats |

**Indicator code format**: `{Domain}{Number}{V|I}` where V=variable, I=indicator
- DE* = Demographics
- EC* = Economy/Labour
- SA* = Social/Living
- EN* = Environment

### 3. Open-Meteo API
- **Weather**: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration`
- **Air Quality**: `https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&hourly=pm2_5,pm10,european_aqi`
- No API key required

### 4. OSM Overpass API
- **Endpoint**: `https://overpass-api.de/api/interpreter`
- Query cultural amenities: `[out:json];area[name="{city}"]->.a;(node["amenity"~"museum|theatre|cinema"](area.a););out count;`
- Query green spaces: `[out:json];area[name="{city}"]->.a;(way["leisure"="park"](area.a););out count;`
- Rate limit: ~10k requests/day (cache heavily)

---

## Database Schema (Convex)

```ts
// convex/schema.ts
cities: defineTable({
  urauCode: v.string(),       // "DE001C"
  name: v.string(),           // "Berlin"
  country: v.string(),        // "DE"
  lat: v.number(),
  lon: v.number(),
  areaSqKm: v.number(),
  isCapital: v.boolean(),
  population: v.optional(v.number()),
  lastUpdated: v.number(),
})
  .index("by_country", ["country"])
  .index("by_urauCode", ["urauCode"]),

cityMetrics: defineTable({
  cityId: v.id("cities"),
  category: v.string(),       // "population", "income", "weather", etc.
  metricKey: v.string(),      // "total", "unemployment_rate", "avg_temp"
  value: v.number(),
  rawData: v.optional(v.any()),
  source: v.string(),         // "eurostat", "open-meteo", "osm"
  fetchedAt: v.number(),
})
  .index("by_city", ["cityId"])
  .index("by_city_category", ["cityId", "category"]),
```

---

## Scoring System

### Categories (13 total)
| # | Category | Source | Higher = Better? |
|---|----------|--------|------------------|
| 1 | Population | Eurostat | Neutral (user pref) |
| 2 | Average Income | Eurostat | Yes |
| 3 | Unemployment Rate | Eurostat | No (invert) |
| 4 | Cost of Living | Eurostat (rent) | No (invert) |
| 5 | Healthcare Access | Eurostat | Yes |
| 6 | Crime Rate | Eurostat | No (invert) |
| 7 | Education Index | Eurostat | Yes |
| 8 | Temperature Pref | Open-Meteo | User slider (warm↔cold) |
| 9 | Sunshine Hours | Open-Meteo | Yes (more sun = higher) |
| 10 | Air Quality | Open-Meteo | Yes (low AQI) |
| 11 | Cultural Amenities | OSM | Yes |
| 12 | Green Spaces | OSM | Yes |
| 13 | Expat % | Eurostat | Neutral |

### Normalization
- All values normalized to 0-100 scale using min-max across dataset
- For inverted metrics: `score = 100 - normalizedValue`
- Missing data: show "N/A", exclude from total score calculation

### User Weights
- Range: 0.5x to 3x (slider)
- Storage: localStorage (no auth for MVP)
- Default: all 1x

### Temperature Preference
- Special slider: warm ↔ cold preference
- Cities ranked by closeness to user's temp preference
- E.g., user prefers 25°C avg → cities with ~25°C score highest

---

## File Structure

```
convex/
  schema.ts              # cities, cityMetrics tables
  cities.ts              # CRUD + scoring queries
  actions/
    eurostat.ts          # Fetch Eurostat data
    openmeteo.ts         # Fetch weather + air quality
    overpass.ts          # Fetch OSM amenities
    seedCities.ts        # Initial city seed from GISCO
  cron.ts                # Scheduled refresh (daily/weekly)

src/
  routes/
    index.tsx            # Landing page
    cities/
      index.tsx          # City ranking list + filters
      [id].tsx           # City detail page
      compare.tsx        # Side-by-side comparison
  components/
    ui/                  # ShadCN components
    cities/
      CityCard.tsx       # Grid card component
      FilterPanel.tsx    # Weight sliders + toggles
      ScoreBar.tsx       # Visual score indicator
      MetricChart.tsx    # Category breakdown chart
      CompareTable.tsx   # Comparison view
    layout/
      Header.tsx         # Navigation
```

---

## Implementation Phases

### Phase 1: Setup + Schema
1. Install ShadCN UI (`npx shadcn@latest init --force`)
2. Add ShadCN components: Button, Card, Slider, Badge, Tabs, Dialog
3. Create Convex schema (cities, cityMetrics)
4. Create seed action to fetch GISCO cities, filter to ~100

### Phase 2: API Integration
1. Create `fetchEurostatData` action - batch fetch by dataset
2. Create `fetchOpenMeteoData` action - weather + air quality
3. Create `fetchOverpassData` action - amenities count
4. Add caching: only refetch if >24h old
5. Store normalized data in cityMetrics

### Phase 3: Scoring Engine
1. Create `calculateCityScores` query
2. Implement min-max normalization
3. Implement score inversion for negative metrics
4. Apply user weights from localStorage
5. Return sorted city list with scores

### Phase 4: City List UI
1. Create `/cities` route with grid layout
2. Build FilterPanel with ShadCN Slider per category
3. Build CityCard showing key metrics + total score
4. Add sort/filter controls
5. Real-time updates via Convex subscription

### Phase 5: City Detail + Compare
1. Create `/cities/[id]` route
2. Show all 13 categories with values
3. Add "Add to Compare" button (localStorage)
4. Create `/cities/compare` route
5. Build comparison table

### Phase 6: Polish
1. Loading skeletons
2. Error boundaries
3. Mobile responsive pass
4. Search/autocomplete

---

## Key Files to Modify

| File | Action |
|------|--------|
| `convex/schema.ts` | Replace with cities + cityMetrics |
| `convex/todos.ts` | **Delete** |
| `src/routes/demo/*` | **Delete all demo files** |
| `src/routes/index.tsx` | Replace with landing page |
| `src/components/Header.tsx` | Update navigation |
| `package.json` | Add ShadCN dependencies |
| `components.json` | ShadCN config (new) |

---

## UI Style
- **Theme**: Light mode default
- **Library**: ShadCN UI with Tailwind v4
- **Colors**: Clean white/light gray, accent color for scores/rankings

---

## Verification

1. **Schema**: `npx convex dev` - verify tables created
2. **Seed**: Run seed action, verify ~100 cities in DB
3. **APIs**: Test each fetch action individually
4. **Scoring**: Query cities, verify scores calculate
5. **UI**: Navigate to `/cities`, adjust weights, verify re-ranking
6. **Compare**: Add 2-3 cities, verify comparison view

---

## Research Sources

- [Eurostat City Statistics Metadata](https://ec.europa.eu/eurostat/cache/metadata/en/urb_esms.htm)
- [Eurostat API Documentation](https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-introduction)
- [GISCO Cities GeoJSON](https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/cities-functional-urban-areas)
- [Open-Meteo API](https://open-meteo.com/)
- [OSM Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [ShadCN UI Installation](https://ui.shadcn.com/docs/installation/vite)

---

## Implementation Status

### API Coverage Summary

| Source | Done | Coverage |
|--------|------|----------|
| Open-Meteo (weather) | ✅ temp, sunshine | 100/100 cities |
| Open-Meteo (air) | ✅ AQI | 100/100 cities |
| OSM Overpass | ✅ cultural, parks | 100/100 cities |
| Wikipedia | ✅ descriptions | 96/100 cities |
| Eurostat population | ✅ DE1001V | 100/100 cities |
| Eurostat income | ✅ EC3040V | 91/100 cities |
| Eurostat unemployment | ✅ EC1010V | 100/100 cities |
| Eurostat rent | ✅ SA1049V | 91/100 cities |
| Eurostat safety | ✅ PS3290V | 47/100 cities |
| Eurostat education | ✅ TE2031I | 97/100 cities |

### ✅ Completed

| Phase | Item | Notes |
|-------|------|-------|
| 1 | ShadCN UI setup | Button, Card, Slider, Badge, Table, Input |
| 1 | Convex schema | cities + cityMetrics tables |
| 1 | Seed action | 100 cities from GISCO GeoJSON |
| 2 | Open-Meteo weather | 100/100 cities (past_days=92 limit) |
| 2 | Open-Meteo air quality | 100/100 cities |
| 2 | OSM Overpass amenities | 100/100 cities (cultural + parks) |
| 2 | Eurostat population | urb_cpop1 (sparse coverage) |
| 3 | Min-max normalization | Per category |
| 3 | Score inversion | For unemployment, rent, crime |
| 3 | User weights | localStorage, 0-2x range |
| 3 | Temperature preference | Closeness to user pref |
| 4 | /cities route | Grid + FilterPanel |
| 4 | CityCard component | Score bars, top 3 categories |
| 4 | FilterPanel | Weight sliders per category |
| 4 | Search | Text filter by name/country |
| 4 | Real-time updates | Convex subscription |
| 5 | /cities/$cityId | Detail page with all categories |
| 5 | Compare toggle | localStorage, max 5 cities |
| 5 | /cities/compare | Side-by-side table with best scores |
| 6 | Loading spinner | Loader2 while fetching |
| 6 | Mobile nav | Hamburger menu sidebar |

### ✅ APIs Implemented (Updated Jan 2026)

| API | Dataset | Category | Indicator | Coverage |
|-----|---------|----------|-----------|----------|
| Eurostat | `urb_cpop1` | population | DE1001V | 100/100 |
| Eurostat | `urb_clivcon` | income | EC3040V | 91/100 |
| Eurostat | `urb_clma` | unemployment | EC1010V | 100/100 |
| Eurostat | `urb_clivcon` | rent | SA1049V | 91/100 |
| Eurostat | `urb_percep` | safety | PS3290V | 47/100 |
| Eurostat | `urb_ceduc` | education | TE2031I | 97/100 |

**Note**: Healthcare removed (no suitable dataset). Safety uses perception data (% who feel safe).

### ✅ All Features Complete

| Phase | Item | Status |
|-------|------|--------|
| 6 | Loading skeletons | ✅ Complete |
| 6 | Error boundaries | ✅ Complete |
| 6 | Search autocomplete | ✅ Complete |
| - | Delete demo files | ✅ Complete |
| - | Cron refresh | Low - manual fetch works |
| - | Expat % metric | Low - no clear Eurostat dataset |

### Known Limitations

- **Eurostat Safety**: Only 47% city coverage (perception survey data)
- **Weather**: Limited to 92 days history (API limit was 365→93)
- **OSM**: Rate limited, used `out count` for efficiency

---

## Open Questions Resolved

| Question | Answer |
|----------|--------|
| City list source | GISCO GeoJSON (1,087 cities available) |
| Filter to ~100 | Capitals + population filter |
| Eurostat city codes | URAU_CODE format (e.g., DE001C) |
| Indicator codes | DE*=demo, EC*=economy, SA*=social |
| Missing data | Show "N/A", exclude from score |
| Normalization | Min-max across dataset |
| UI library | ShadCN UI |
| Weather scoring | User slider (warm↔cold) + sunshine |
| UI theme | Light mode default |
| Demo files | Delete all |
