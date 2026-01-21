# tolivein Project Context

City comparison app for ~100 European cities. Users rank cities by preferences (income, weather, safety, culture, etc.)

## Stack
- **Frontend**: React 19.2, TanStack Router (file-based), TanStack Query, ShadCN UI
- **Backend**: Convex (real-time BaaS), tRPC
- **Styling**: Tailwind CSS v4
- **Build**: Vite 7, Nitro
- **Testing**: Vitest, Testing Library
- **Type Safety**: TypeScript strict mode
- **Node**: 22+ required (see .nvmrc)

## Project Structure
```
src/
  routes/
    index.tsx           # Landing page
    cities/
      index.tsx         # City rankings with filters
      $cityId.tsx       # City detail page
      compare.tsx       # Side-by-side comparison
  components/
    ui/                 # ShadCN components
    cities/
      CityCard.tsx      # City card with scores
      FilterPanel.tsx   # Weight sliders
    Header.tsx          # Navigation
  integrations/         # Provider setup (Convex, TanStack Query, tRPC)
convex/
  schema.ts             # cities + cityMetrics tables
  cities.ts             # CRUD operations
  scoring.ts            # Scoring engine with normalization
  actions/
    seedCities.ts       # Fetch ~100 EU cities from GISCO
    eurostat.ts         # Demographics/economy data
    openmeteo.ts        # Weather + air quality
    overpass.ts         # OSM amenities
  _generated/           # Auto-generated types
```

## Key Integrations

### Convex
- **Connection**: ConvexProvider wraps app, uses `VITE_CONVEX_URL` env var
- **Pattern**: Import from `convex/_generated/api` and `convex/react`
- **Hooks**:
  - `useQuery(api.table.function)` - read data, auto-subscribes to updates
  - `useMutation(api.table.function)` - write operations
- **Types**: Auto-generated at `convex/_generated/dataModel` (Id types)
- **Functions**: Export `query`, `mutation`, `action` from files in convex/
- **Setup**: Run `npx convex dev` for local development

### TanStack Router
- **Mode**: File-based routing in `src/routes/`
- **Root**: `__root.tsx` for layouts
- **SSR Config**: Various modes in demo routes (full-ssr, spa-mode, data-only)
- **Integration**: Router + Query SSR via `setupRouterSsrQueryIntegration`
- **Context**: QueryClient passed to router context
- **Preload**: Default is 'intent' (preload on hover)

### TanStack Query
- Setup in `integrations/tanstack-query/root-provider.tsx`
- Devtools available at `integrations/tanstack-query/devtools.tsx`
- Works alongside Convex queries

### tRPC
- Router defined in `integrations/trpc/router.ts`
- React setup in `integrations/trpc/react.ts`
- API route at `/api/trpc/$` handles requests
- Uses superjson for serialization

## Convex Schema Patterns (from .cursorrules)

### System Fields (Auto-generated)
- `_id`: Document ID
- `_creationTime`: Unix timestamp in ms
- Never define these in schema

### Validators (v object)
```ts
v.id("tableName")        // References
v.string()               // Text
v.number() / v.float64() // Numbers
v.bigint() / v.int64()   // Big integers
v.boolean()              // Booleans
v.array(v.string())      // Arrays
v.object({...})          // Objects
v.union(...)             // Discriminated unions
v.optional(v.string())   // Optional fields
v.literal("value")       // Exact values
v.record(key, value)     // Dynamic keys
```

### Current Schema
```ts
cities: {
  urauCode: string      // EU city code
  name: string
  country: string       // ISO code
  lat: number
  lon: number
  areaSqKm: number
  isCapital: boolean
  population?: number
  lastUpdated: number
}
cityMetrics: {
  cityId: Id<'cities'>
  category: string      // 'population', 'income', 'weather', etc.
  metricKey: string     // specific metric identifier
  value: number
  rawData?: any
  source: string        // 'eurostat', 'open-meteo', 'osm'
  fetchedAt: number
}
```

### Index Pattern
```ts
.index("indexName", ["field1", "field2"])
```

## Development Commands
```bash
nvm use 22           # Use Node 22+ (required)
npm run dev          # Dev server on :3000
npm run build        # Production build
npm run test         # Run Vitest tests
npm run check        # Prettier + ESLint fix
npx convex dev       # Start Convex backend
```

## Path Aliases
- `@/*` maps to `src/*` (tsconfig + vite-tsconfig-paths)

## Scoring Categories
12 categories scored 0-100 via min-max normalization:
- Population, Income, Unemployment (inverted), Cost of Living (inverted)
- Healthcare, Crime (inverted), Education
- Temperature (user preference), Sunshine, Air Quality (inverted)
- Cultural Amenities, Green Spaces

User weights stored in localStorage (0.5x to 3x).

## Environment Setup
Required vars:
- `VITE_CONVEX_URL` - Convex deployment URL
- `CONVEX_DEPLOYMENT` - Deployment name

Run `npx convex init` to auto-configure.

## Convex Function Patterns

### Query (Read)
```ts
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('todos').collect()
  },
})
```

### Mutation (Write)
```ts
export const add = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert('todos', {
      text: args.text,
      completed: false,
    })
  },
})
```

### Update Pattern
```ts
await ctx.db.patch(id, { field: value })
```

### Delete Pattern
```ts
await ctx.db.delete(id)
```

### Query Methods
- `.query('table')` - Start query
- `.withIndex('by_creation_time')` - Use index
- `.order('desc')` - Sort
- `.collect()` - Get all results
- `.first()` - Get first result
- `.get(id)` - Get by ID

## React Usage Pattern
```tsx
import { useQuery, useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'

const data = useQuery(api.todos.list)
const mutate = useMutation(api.todos.add)

await mutate({ text: 'New todo' })
```

## Routing Conventions
- `index.tsx` = `/`
- `about.tsx` = `/about`
- `demo/convex.tsx` = `/demo/convex`
- `api.trpc.$.tsx` = `/api/trpc/*` (catch-all)
- `ssr: false` in route config disables SSR for that route

## Notes
- Convex provides real-time subscriptions by default via useQuery
- tRPC and Convex can coexist (tRPC for custom server logic)
- SSR works with TanStack Start, configurable per-route
- Seed cities via seedCities action after Convex setup
- Data fetched from Eurostat, Open-Meteo, OSM Overpass APIs
