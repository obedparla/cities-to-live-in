import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  MapPin,
  Loader2,
  ThermometerSun,
  Wind,
  Building2,
  TreePine,
  GraduationCap,
  Banknote,
  Users,
  Shield,
  Home,
  Sun,
} from 'lucide-react'
import { CATEGORIES, type CategoryKey } from '../../../convex/scoring'

export const Route = createFileRoute('/cities/$cityId' as never)({
  component: CityDetailPage,
})

const CATEGORY_ICONS: Record<CategoryKey, React.ReactNode> = {
  population: <Users size={20} />,
  income: <Banknote size={20} />,
  unemployment: <Building2 size={20} />,
  rent: <Home size={20} />,
  crime: <Shield size={20} />,
  education: <GraduationCap size={20} />,
  temperature: <ThermometerSun size={20} />,
  sunshine: <Sun size={20} />,
  air_quality: <Wind size={20} />,
  cultural: <Building2 size={20} />,
  green_spaces: <TreePine size={20} />,
}

function formatRawValue(category: CategoryKey, value: number): string {
  switch (category) {
    case 'population':
    case 'unemployment':
      return value.toLocaleString()
    case 'income':
      return `€${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
    case 'rent':
      return `€${value.toFixed(1)}/m²`
    case 'crime':
      return `${value.toFixed(0)}% feel safe`
    case 'education':
      return `${value.toFixed(1)}% higher ed`
    case 'temperature':
      return `${value.toFixed(1)}°C avg`
    case 'sunshine':
      return `${value.toFixed(1)} hrs/day`
    case 'air_quality':
      return `AQI ${value.toFixed(0)}`
    case 'cultural':
      return `${value.toFixed(0)} venues`
    case 'green_spaces':
      return `${value.toFixed(0)} parks`
    default:
      return value.toFixed(2)
  }
}

const COUNTRY_NAMES: Record<string, string> = {
  AT: 'Austria',
  BE: 'Belgium',
  BG: 'Bulgaria',
  HR: 'Croatia',
  CY: 'Cyprus',
  CZ: 'Czechia',
  DK: 'Denmark',
  EE: 'Estonia',
  FI: 'Finland',
  FR: 'France',
  DE: 'Germany',
  GR: 'Greece',
  HU: 'Hungary',
  IE: 'Ireland',
  IT: 'Italy',
  LV: 'Latvia',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MT: 'Malta',
  NL: 'Netherlands',
  PL: 'Poland',
  PT: 'Portugal',
  RO: 'Romania',
  SK: 'Slovakia',
  SI: 'Slovenia',
  ES: 'Spain',
  SE: 'Sweden',
  NO: 'Norway',
  CH: 'Switzerland',
  UK: 'United Kingdom',
  GB: 'United Kingdom',
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400">N/A</span>
  const clampedScore = Math.min(100, Math.max(0, score))
  const color =
    clampedScore >= 70
      ? 'bg-green-500'
      : clampedScore >= 40
        ? 'bg-yellow-500'
        : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-3 rounded-full ${color}`}
          style={{ width: `${clampedScore}%` }}
        />
      </div>
      <span className="text-sm font-medium w-12 text-right">
        {score.toFixed(0)}
      </span>
    </div>
  )
}

function CityDetailPage() {
  const { cityId } = Route.useParams()
  const cityData = useQuery(api.scoring.getCityScore, {
    cityId: cityId as Id<'cities'>,
  })

  if (!cityData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const { city, totalScore, categoryScores, metrics } = cityData

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <a href="/cities">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft size={16} className="mr-2" />
            Back to Cities
          </Button>
        </a>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl flex items-center gap-3">
                  {city.name}
                  {city.isCapital && (
                    <Badge variant="secondary">Capital</Badge>
                  )}
                </CardTitle>
                <p className="text-gray-500 flex items-center gap-2 mt-2">
                  <MapPin size={16} />
                  {COUNTRY_NAMES[city.country] || city.country}
                </p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold text-blue-600">
                  {totalScore.toFixed(0)}
                </div>
                <div className="text-sm text-gray-500">Overall Score</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {city.description && (
              <div className="mb-4">
                <p className="text-gray-700 text-sm leading-relaxed">
                  {city.description}
                </p>
                {city.wikiUrl && (
                  <a
                    href={city.wikiUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline"
                  >
                    Read more on Wikipedia
                  </a>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Population</span>
                <p className="font-medium">
                  {city.population?.toLocaleString() || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Area</span>
                <p className="font-medium">{city.areaSqKm.toFixed(0)} km²</p>
              </div>
              <div>
                <span className="text-gray-500">Latitude</span>
                <p className="font-medium">{city.lat.toFixed(2)}°</p>
              </div>
              <div>
                <span className="text-gray-500">Longitude</span>
                <p className="font-medium">{city.lon.toFixed(2)}°</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <h2 className="text-xl font-bold mb-4">Category Scores</h2>
        <div className="grid gap-4">
          {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => {
            const cat = CATEGORIES[key]
            const score = categoryScores[key]
            return (
              <Card key={key}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-blue-600">
                      {CATEGORY_ICONS[key]}
                    </span>
                    <span className="font-medium flex-1">{cat.label}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                      {cat.source}
                    </span>
                  </div>
                  <ScoreBar score={score?.normalized ?? null} />
                  {score && score.raw !== null && (
                    <p className="text-xs text-gray-500 mt-1">
                      Raw: {formatRawValue(key, score.raw)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {metrics && metrics.length > 0 && (
          <>
            <h2 className="text-xl font-bold mt-8 mb-4">Raw Metrics</h2>
            <Card>
              <CardContent className="py-4">
                <div className="grid gap-2 text-sm">
                  {metrics.map((m: Doc<'cityMetrics'>) => (
                    <div
                      key={m._id}
                      className="flex justify-between py-1 border-b last:border-0"
                    >
                      <span className="text-gray-600">
                        {m.category}: {m.metricKey}
                      </span>
                      <span className="font-medium">
                        {m.value.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
