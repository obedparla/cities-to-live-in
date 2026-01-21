import { MapPin, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Doc, Id } from '../../../convex/_generated/dataModel'
import { CATEGORIES, type CategoryKey } from '../../../convex/scoring'

interface CityCardProps {
  cityId: Id<'cities'>
  city: Doc<'cities'>
  totalScore: number
  categoryScores: Partial<
    Record<CategoryKey, { raw: number | null; normalized: number | null }>
  >
  rank: number
  onCompareToggle?: () => void
  isComparing?: boolean
}

const COUNTRY_FLAGS: Record<string, string> = {
  AT: '\uD83C\uDDE6\uD83C\uDDF9',
  BE: '\uD83C\uDDE7\uD83C\uDDEA',
  BG: '\uD83C\uDDE7\uD83C\uDDEC',
  HR: '\uD83C\uDDED\uD83C\uDDF7',
  CY: '\uD83C\uDDE8\uD83C\uDDFE',
  CZ: '\uD83C\uDDE8\uD83C\uDDFF',
  DK: '\uD83C\uDDE9\uD83C\uDDF0',
  EE: '\uD83C\uDDEA\uD83C\uDDEA',
  FI: '\uD83C\uDDEB\uD83C\uDDEE',
  FR: '\uD83C\uDDEB\uD83C\uDDF7',
  DE: '\uD83C\uDDE9\uD83C\uDDEA',
  GR: '\uD83C\uDDEC\uD83C\uDDF7',
  HU: '\uD83C\uDDED\uD83C\uDDFA',
  IE: '\uD83C\uDDEE\uD83C\uDDEA',
  IT: '\uD83C\uDDEE\uD83C\uDDF9',
  LV: '\uD83C\uDDF1\uD83C\uDDFB',
  LT: '\uD83C\uDDF1\uD83C\uDDF9',
  LU: '\uD83C\uDDF1\uD83C\uDDFA',
  MT: '\uD83C\uDDF2\uD83C\uDDF9',
  NL: '\uD83C\uDDF3\uD83C\uDDF1',
  PL: '\uD83C\uDDF5\uD83C\uDDF1',
  PT: '\uD83C\uDDF5\uD83C\uDDF9',
  RO: '\uD83C\uDDF7\uD83C\uDDF4',
  SK: '\uD83C\uDDF8\uD83C\uDDF0',
  SI: '\uD83C\uDDF8\uD83C\uDDEE',
  ES: '\uD83C\uDDEA\uD83C\uDDF8',
  SE: '\uD83C\uDDF8\uD83C\uDDEA',
  NO: '\uD83C\uDDF3\uD83C\uDDF4',
  CH: '\uD83C\uDDE8\uD83C\uDDED',
  UK: '\uD83C\uDDEC\uD83C\uDDE7',
  GB: '\uD83C\uDDEC\uD83C\uDDE7',
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-sm">N/A</span>
  const clampedScore = Math.min(100, Math.max(0, score))
  const color =
    clampedScore >= 70 ? 'bg-green-500' : clampedScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full ${color}`}
        style={{ width: `${clampedScore}%` }}
      />
    </div>
  )
}

export function CityCard({
  cityId,
  city,
  totalScore,
  categoryScores,
  rank,
  onCompareToggle,
  isComparing,
}: CityCardProps) {
  const topCategories = (Object.keys(CATEGORIES) as CategoryKey[])
    .filter((k) => categoryScores[k]?.normalized !== null)
    .sort(
      (a, b) =>
        (categoryScores[b]?.normalized ?? 0) -
        (categoryScores[a]?.normalized ?? 0)
    )
    .slice(0, 3)

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-gray-300">#{rank}</span>
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>{COUNTRY_FLAGS[city.country] || ''}</span>
<a
                  href={`/cities/${cityId}`}
                  className="hover:text-blue-600 transition-colors"
                >
                  {city.name}
                </a>
              </CardTitle>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin size={12} />
                {city.country}
                {city.isCapital && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    Capital
                  </Badge>
                )}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {totalScore.toFixed(0)}
            </div>
            <div className="text-xs text-gray-500">Score</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mt-2">
          {topCategories.map((catKey) => (
            <div key={catKey} className="flex items-center gap-2">
              <span className="text-xs text-gray-600 w-20 truncate">
                {CATEGORIES[catKey].label}
              </span>
              <div className="flex-1">
                <ScoreBar score={categoryScores[catKey]?.normalized ?? null} />
              </div>
              <span className="text-xs text-gray-500 w-8 text-right">
                {categoryScores[catKey]?.normalized?.toFixed(0) ?? '-'}
              </span>
            </div>
          ))}
        </div>
        {onCompareToggle && (
          <button
            onClick={onCompareToggle}
            className={`mt-4 w-full py-2 text-sm rounded-lg transition-colors ${
              isComparing
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Star
              size={14}
              className="inline mr-1"
              fill={isComparing ? 'currentColor' : 'none'}
            />
            {isComparing ? 'Comparing' : 'Compare'}
          </button>
        )}
      </CardContent>
    </Card>
  )
}
