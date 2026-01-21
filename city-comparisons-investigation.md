# City Comparison Feature List with APIs

## Complete Feature List with APIs

### **Cost of Living**
- **Aim**: Show affordability - rent, groceries, dining, transport costs
- **API**: Numbeo API (paid) or unofficial scrapers (free): [GitHub api_cost_of_living](https://github.com/Phernando82/api_cost_of_living), [GitHub cost-of-living-api](https://github.com/zackharley/cost-of-living-api)

### **Population**
- **Aim**: City size, density, demographic composition
- **API**: [Eurostat City Statistics API](https://ec.europa.eu/eurostat/cache/metadata/en/urb_esms.htm) (free)

### **Air Pollution**
- **Aim**: Health/environmental quality (PM2.5, PM10, NO2, etc.)
- **API**: [WAQI API](https://aqicn.org/api/) (free), [Open-Meteo Air Quality](https://open-meteo.com/en/docs/air-quality-api) (free), [OpenWeather Air Pollution](https://openweathermap.org/api/air-pollution) (free tier)

### **Average Income**
- **Aim**: Earning potential, economic prosperity
- **API**: [Eurostat Income/Living Conditions Database](https://ec.europa.eu/eurostat/web/income-and-living-conditions/database) (free)

### **Education Index**
- **Aim**: School quality, education outcomes
- **API**: [Eurostat Education Statistics](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=City_statistics_%E2%80%93_education_and_training) (free) - limited rankings

### **University/School Quality**
- **Aim**: Higher education options
- **Data**: Manual curation (QS Rankings, Times Higher Ed) - no free comprehensive API

### **Happiness Index**
- **Aim**: Life satisfaction, well-being
- **Data**:

---

### **Weather & Climate**
- **Aim**: Temperature, rainfall, sunshine - lifestyle fit
- **API**: [Open-Meteo](https://open-meteo.com/) (free), [OpenWeatherMap](https://openweathermap.org/api) (free tier), [WeatherAPI.com](https://www.weatherapi.com/) (free)

### **Public Transport Quality**
- **Aim**: Transit coverage, convenience, commute times
- **API**: [Walk Score Transit API](https://www.walkscore.com/professional/public-transit-api.php) (requires key), GTFS data per city (free)

### **Safety/Crime Statistics**
- **Aim**: Safety perception, crime rates
- **API**: [Eurostat Crime Database](https://ec.europa.eu/eurostat/web/crime/database) (free), Numbeo Crime Index (scrape or paid API)

### **Healthcare Access**
- **Aim**: Hospital availability, doctor density, quality
- **API**: [Eurostat Health Statistics](https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Healthcare_statistics) (free) - aggregated data

### **Job Market**
- **Aim**: Employment opportunities, unemployment rate
- **API**: [Eurostat Employment/Unemployment LFS Database](https://ec.europa.eu/eurostat/web/lfs/database) (free)


### **Internet Speed**
- **Aim**: Remote work viability, connectivity
- **API**: [Cloudflare Radar](https://radar.cloudflare.com/quality) (free aggregated data), Ookla data (no free public API for cities)

### **Expat Community Size**
- **Aim**: Social integration ease, foreign-born population %
- **API**: [Eurostat Demographics](https://ec.europa.eu/eurostat/web/population-demography) (free)

### **Cultural Amenities**
- **Aim**: Museums, theaters, restaurants, nightlife
- **API**: [OpenStreetMap Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) (free) - count amenities

### **Green Spaces**
- **Aim**: Parks, recreation areas per capita
- **API**: [OpenStreetMap Overpass API](https://overpass-turbo.eu/) (free) - query parks/green areas

### **Proximity to Nature**
- **Aim**: Beach/mountain access, outdoor activities
- **API**: OpenStreetMap (free), Google Places API (limited free tier)

### **Travel Connectivity**
- **Aim**: Flight/train options, travel hub accessibility
- **API**: Skyscanner API (limited free), Aviation Edge (free tier), manual curation

### **Tax Rates**
- **Aim**: Net income after taxes
- **Data**: Manual entry - no comprehensive API

### **Startup Ecosystem**
- **Aim**: Entrepreneurship opportunities, VC presence
- **Data**: Crunchbase API (limited free), manual curation

### **Digital Nomad Friendliness**
- **Aim**: Remote work infrastructure, visa policies
- **Data**: Manual curation (Nomad List data - no free API)

---

## Implementation Priority

### Phase 1 (Free APIs)
1. Population, income, unemployment (Eurostat)
2. Air pollution (WAQI/Open-Meteo)
3. Weather (Open-Meteo)
4. Cultural amenities (OpenStreetMap Overpass)
5. Green spaces (OpenStreetMap)

### Phase 2 (Scraping/Free Tier)
6. Cost of living (unofficial Numbeo scraper)
7. Crime (Eurostat + scrape Numbeo)
8. Internet speed (Cloudflare Radar aggregated)

### Phase 3 (Manual Curation)
9. Happiness, education rankings, tax rates
10. Insurance, visa requirements
11. Startup scene, digital nomad data

---

## Key API Resources

### Free Government Data
- **Eurostat**: https://ec.europa.eu/eurostat - Population, income, employment, crime, health, education
- **European Environment Agency**: https://www.eea.europa.eu/ - Air quality data
- **Cloudflare Radar**: https://radar.cloudflare.com/quality - Internet quality metrics

### Free/Freemium APIs
- **Open-Meteo**: https://open-meteo.com/ - Weather and air quality
- **WAQI**: https://aqicn.org/api/ - Air quality index
- **OpenStreetMap Overpass**: https://overpass-turbo.eu/ - POI data (amenities, parks)
- **OpenWeatherMap**: https://openweathermap.org/api - Weather (free tier)
- **Walk Score**: https://www.walkscore.com/professional/walk-score-apis.php - Transit/walk scores

### Unofficial/Community
- **Numbeo Scrapers**: GitHub projects for cost of living data
- **GTFS Data**: Public transit data per city

### Manual Data Sources
- World Happiness Report
- QS World University Rankings
- Times Higher Education Rankings
- National tax authority websites
- Immigration/visa requirement databases

---

# Implementation Plan

## API Consolidation (3 Free APIs)

### 1. Eurostat API (Government, Free)
Provides 7 data categories:
- Population & density
- Average income
- Employment/unemployment rates
- Crime statistics
- Healthcare access (hospital beds, doctors per capita)
- Expat community (foreign-born %)
- Education statistics

### 2. Open-Meteo API (Free, No Key)
Provides 2 data categories:
- Weather (temp, rainfall, sunshine hours, climate)
- Air quality (PM2.5, PM10, AQI)

### 3. OpenStreetMap Overpass API (Free, No Key)
Provides 3 data categories:
- Cultural amenities (museums, theaters, restaurants count)
- Green spaces (parks, gardens per capita)
- Nature proximity (beaches, mountains nearby)

**Total: 12 data categories from 3 APIs**

---

## Data Categories & Weights

| Category | Source | Default Weight | Range |
|----------|--------|----------------|-------|
| Population | Eurostat | 1x | 0.5x-3x |
| Average Income | Eurostat | 1x | 0.5x-3x |
| Unemployment Rate | Eurostat | 1x | 0.5x-3x |
| Crime Rate | Eurostat | 1x | 0.5x-3x |
| Healthcare Access | Eurostat | 1x | 0.5x-3x |
| Expat Community % | Eurostat | 1x | 0.5x-3x |
| Education Index | Eurostat | 1x | 0.5x-3x |
| Weather Score | Open-Meteo | 1x | 0.5x-3x |
| Air Quality | Open-Meteo | 1x | 0.5x-3x |
| Cultural Amenities | OSM Overpass | 1x | 0.5x-3x |
| Green Spaces | OSM Overpass | 1x | 0.5x-3x |
| Nature Proximity | OSM Overpass | 1x | 0.5x-3x |

**Weight Range**: 0.5x (reduce importance) to 3x (high importance)
**Persistence**: localStorage only - no auth needed for MVP

---

## Architecture

### Database Schema (Convex)
```
cities: { name, country, lat, lon, timezone, lastUpdated }
cityData: { cityId, category, value, rawData, source, fetchedAt }
```

### Data Flow
1. **Seed phase**: Fetch Eurostat city list (~500+ cities)
2. **Fetch phase**: Convex actions call external APIs, store in cityData
3. **Score phase**: Query aggregates data, applies user weights
4. **Display phase**: Frontend shows ranked/filtered cities

---

## Implementation Steps

### Phase 1: Foundation (Convex Schema + City Seed)
1. Define Convex schema: cities, cityData tables
2. Fetch Eurostat city list (~500+ cities with available data)
3. Add Convex mutations for CRUD on cities
4. Create basic `/cities` route showing list

### Phase 2: API Integration Layer
1. Create Convex actions for each API:
   - `fetchEurostatData` - all Eurostat categories
   - `fetchWeatherData` - Open-Meteo weather + air quality
   - `fetchOSMData` - Overpass queries for amenities
2. Add rate limiting & caching logic
3. Store normalized data in cityData table
4. Schedule periodic refresh (Convex cron)

### Phase 3: Scoring Engine
1. Create `calculateCityScore` query function
2. Normalize all categories to 0-100 scale
3. Apply user weights (0.5x-3x multipliers)
4. Support inversion (lower crime = higher score)
5. Add ranking query with pagination

### Phase 4: UI - City List & Filters
1. Create `/cities` route with responsive grid
2. Build FilterPanel component:
   - Toggle each category on/off
   - Weight slider (0.5x to 3x) per category
   - Sort by total score or specific category
3. City cards showing key metrics + score
4. Real-time updates via Convex subscriptions

### Phase 5: UI - City Detail & Comparison
1. Create `/cities/[id]` route for single city
2. Show all 12 categories with values + charts
3. Add "Add to Compare" functionality
4. Create `/compare` route for side-by-side view
5. Comparison table with weighted differences

### Phase 6: User Preferences
1. Add localStorage persistence for weights
2. Save/load preset weight configurations
3. Favorite cities list

### Phase 7: Polish & Performance
1. Add loading skeletons
2. Error boundaries per section
3. Optimize queries with indexes
4. Add search/autocomplete for cities
5. Mobile-responsive design pass

---

## File Structure

```
convex/
  schema.ts           # cities, cityData
  cities.ts           # CRUD queries/mutations
  scoring.ts          # Score calculation logic
  api/
    eurostat.ts       # Eurostat fetcher action
    openmeteo.ts      # Weather + air quality action
    overpass.ts       # OSM Overpass action
  cron.ts             # Scheduled data refresh

src/routes/
  cities/
    index.tsx         # City list with filters
    [id].tsx          # City detail page
    compare.tsx       # Side-by-side comparison

src/components/
  cities/
    CityCard.tsx      # Grid item card
    CityDetail.tsx    # Full city view
    FilterPanel.tsx   # Weight/toggle controls
    CompareTable.tsx  # Comparison view
    ScoreBar.tsx      # Visual score indicator
```

---

## API Details

### Eurostat
- Base: `https://ec.europa.eu/eurostat/api/dissemination/statistics/`
- Format: JSON-stat or CSV
- Key datasets:
  - `urb_cpop` - city population
  - `urb_cliv` - living conditions (income)
  - `urb_cemp` - employment
  - `urb_cenv` - environment
  - `urb_ctran` - transport

### Open-Meteo
- Weather: `https://api.open-meteo.com/v1/forecast`
- Air quality: `https://air-quality-api.open-meteo.com/v1/air-quality`
- Params: lat, lon, timezone
- No API key needed

### OpenStreetMap Overpass
- Endpoint: `https://overpass-api.de/api/interpreter`
- Query language: Overpass QL
- Count amenities within city bounds
- Rate limit: fair use (~10k requests/day)

---

## Decisions Made

- **Cities**: Eurostat cities only (~500+ with available data)
- **Weight range**: 0.5x to 3x
- **Persistence**: localStorage only (no auth)
