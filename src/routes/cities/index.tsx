import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useAction } from 'convex/react'
import { useMemo, useState, useEffect } from 'react'
import { api } from '../../../convex/_generated/api'
import { CityCard } from '@/components/cities/CityCard'
import { CityGridSkeleton } from '@/components/cities/CityCardSkeleton'
import { SearchAutocomplete } from '@/components/cities/SearchAutocomplete'
import { FilterPanel } from '@/components/cities/FilterPanel'
import {
  CountryFilter,
  SelectedCountryBadges,
} from '@/components/cities/CountryFilter'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  SlidersHorizontal,
  Database,
  GitCompare,
  X,
  RefreshCw,
} from 'lucide-react'
import type { Id } from '../../../convex/_generated/dataModel'
import type { CityScore } from '../../../convex/scoring'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

export const Route = createFileRoute('/cities/' as never)({
  component: CitiesPage,
})

const WEIGHTS_DEBOUNCE_MS = 3000

function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, JSON.stringify(value))
    }
  }, [key, value])

  return [value, setValue] as const
}

function CitiesPage() {
  const [weights, setWeights] = useLocalStorage<Record<string, number>>(
    'city-weights',
    {}
  )
  const [preferredTemp, setPreferredTemp] = useLocalStorage(
    'preferred-temp',
    20
  )
  const [comparingCities, setComparingCities] = useLocalStorage<string[]>(
    'comparing-cities',
    []
  )
  const [selectedCountries, setSelectedCountries] = useLocalStorage<string[]>(
    'selected-countries',
    []
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const debouncedWeights = useDebouncedValue(weights, WEIGHTS_DEBOUNCE_MS)
  const debouncedPreferredTemp = useDebouncedValue(
    preferredTemp,
    WEIGHTS_DEBOUNCE_MS
  )
  const isPendingWeightUpdate =
    debouncedWeights !== weights || debouncedPreferredTemp !== preferredTemp

  const cities = useQuery(api.scoring.getCitiesWithScores, {
    weights: debouncedWeights,
    preferredTemp: debouncedPreferredTemp,
  })

  const seedCities = useAction(api.actions.seedCities.seedCities)

  const countriesWithCounts = useMemo(() => {
    if (!cities) return []
    const counts = new Map<string, number>()
    for (const c of cities) {
      counts.set(c.city.country, (counts.get(c.city.country) ?? 0) + 1)
    }
    return Array.from(counts.entries()).map(([code, cityCount]) => ({
      code,
      cityCount,
    }))
  }, [cities])

  const filteredCities = cities?.filter((c: CityScore) => {
    const matchesSearch =
      c.city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.city.country.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCountry =
      selectedCountries.length === 0 ||
      selectedCountries.includes(c.city.country)
    return matchesSearch && matchesCountry
  })

  const toggleCompare = (cityId: Id<'cities'>) => {
    const idStr = cityId.toString()
    setComparingCities((prev) =>
      prev.includes(idStr)
        ? prev.filter((id) => id !== idStr)
        : prev.length < 5
          ? [...prev, idStr]
          : prev
    )
  }

  const handleSeed = async () => {
    try {
      await seedCities({ maxCities: 100 })
    } catch (e) {
      console.error('Seed failed:', e)
    }
  }

  const hasAnyScores = cities?.some((c: CityScore) => c.totalScore > 0)

  if (!cities) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex gap-6">
            <aside className="w-72 shrink-0 hidden md:block">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                      <div className="h-2 bg-gray-200 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </aside>
            <main className="flex-1">
              <CityGridSkeleton count={6} />
            </main>
          </div>
        </div>
      </div>
    )
  }

  if (cities.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Database className="w-16 h-16 text-gray-400" />
        <h2 className="text-2xl font-bold text-gray-700">No Cities Yet</h2>
        <p className="text-gray-500">
          Seed the database with European cities to get started.
        </p>
        <Button onClick={handleSeed}>
          <Database className="mr-2" size={16} />
          Seed Cities
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {!hasAnyScores && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
            <p className="text-yellow-800">
              Cities loaded but no metrics data yet.
            </p>
            <a href="/update">
              <Button variant="outline">
                <RefreshCw className="mr-2" size={16} />
                Fetch All Data
              </Button>
            </a>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <SearchAutocomplete
              cities={cities.map((c: CityScore) => ({
                _id: c.cityId.toString(),
                name: c.city.name,
                country: c.city.country,
              }))}
              value={searchQuery}
              onChange={setSearchQuery}
            />
          </div>
          <div className="flex gap-2">
            <CountryFilter
              countries={countriesWithCounts}
              selected={selectedCountries}
              onChange={setSelectedCountries}
            />
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden"
            >
              <SlidersHorizontal size={16} className="mr-2" />
              Filters
            </Button>
            {comparingCities.length > 0 && (
              <a href="/cities/compare">
                <Button>
                  <GitCompare size={16} className="mr-2" />
                  Compare ({comparingCities.length})
                </Button>
              </a>
            )}
          </div>
        </div>

        {selectedCountries.length > 0 && (
          <div className="mb-4">
            <SelectedCountryBadges
              selected={selectedCountries}
              onRemove={(code) =>
                setSelectedCountries(
                  selectedCountries.filter((c) => c !== code)
                )
              }
              onClear={() => setSelectedCountries([])}
            />
          </div>
        )}

        {comparingCities.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {comparingCities.map((id) => {
              const city = cities.find((c: CityScore) => c.cityId.toString() === id)
              return (
                <Badge key={id} variant="secondary" className="pr-1">
                  {city?.city.name || id}
                  <button
                    onClick={() => toggleCompare(id as Id<'cities'>)}
                    className="ml-1 p-0.5 hover:bg-gray-300 rounded"
                  >
                    <X size={12} />
                  </button>
                </Badge>
              )
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setComparingCities([])}
            >
              Clear all
            </Button>
          </div>
        )}

        <div className="flex gap-6">
          <aside
            className={`w-72 shrink-0 ${showFilters ? 'block' : 'hidden md:block'}`}
          >
            <FilterPanel
              weights={weights}
              onWeightsChange={setWeights}
              preferredTemp={preferredTemp}
              onPreferredTempChange={setPreferredTemp}
              isPendingUpdate={isPendingWeightUpdate}
            />
          </aside>

          <main className="flex-1">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {filteredCities?.length || 0} cities
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredCities?.map((city: CityScore, idx: number) => (
                <CityCard
                  key={city.cityId}
                  cityId={city.cityId}
                  city={city.city}
                  totalScore={city.totalScore}
                  categoryScores={city.categoryScores}
                  rank={idx + 1}
                  onCompareToggle={() => toggleCompare(city.cityId)}
                  isComparing={comparingCities.includes(city.cityId.toString())}
                />
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
