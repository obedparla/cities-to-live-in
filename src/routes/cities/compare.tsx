import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from 'convex/react'
import { useState, useEffect } from 'react'
import { api } from '../../../convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Loader2, X } from 'lucide-react'
import { CATEGORIES, type CategoryKey, type CityScore } from '../../../convex/scoring'

export const Route = createFileRoute('/cities/compare' as never)({
  component: ComparePage,
})

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

function ScoreCell({ score, best }: { score: number | null; best: boolean }) {
  if (score === null) return <span className="text-gray-400">N/A</span>
  return (
    <span
      className={`font-medium ${best ? 'text-green-600 font-bold' : 'text-gray-700'}`}
    >
      {score.toFixed(0)}
      {best && ' *'}
    </span>
  )
}

function ComparePage() {
  const [comparingCities, setComparingCities] = useLocalStorage<string[]>(
    'comparing-cities',
    []
  )

  const allCities = useQuery(api.scoring.getCitiesWithScores, {})

  const cities = allCities?.filter((c: CityScore) =>
    comparingCities.includes(c.cityId.toString())
  )

  const removeCity = (cityId: string) => {
    setComparingCities((prev) => prev.filter((id) => id !== cityId))
  }

  if (!allCities) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!cities || cities.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <a href="/cities">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft size={16} className="mr-2" />
              Back to Cities
            </Button>
          </a>
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 mb-4">
                No cities selected for comparison
              </p>
              <a href="/cities">
                <Button>Select Cities to Compare</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const getBestScore = (key: CategoryKey): number | null => {
    const scores = cities
      .map((c: CityScore) => c.categoryScores[key]?.normalized)
      .filter((s: number | null | undefined): s is number => s !== null && s !== undefined)
    return scores.length > 0 ? Math.max(...scores) : null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <a href="/cities">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft size={16} className="mr-2" />
            Back to Cities
          </Button>
        </a>

        <Card>
          <CardHeader>
            <CardTitle>City Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Category</TableHead>
                    {cities.map((c: CityScore) => (
                      <TableHead key={c.cityId} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <a
                            href={`/cities/${c.cityId}`}
                            className="font-bold hover:text-blue-600"
                          >
                            {c.city.name}
                          </a>
                          <span className="text-xs text-gray-400 font-normal">
                            {c.city.country}
                          </span>
                          <button
                            onClick={() => removeCity(c.cityId.toString())}
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-blue-50">
                    <TableCell className="font-bold">Overall Score</TableCell>
                    {cities.map((c: CityScore) => {
                      const bestTotal = Math.max(
                        ...cities.map((x: CityScore) => x.totalScore)
                      )
                      return (
                        <TableCell
                          key={c.cityId}
                          className="text-center text-lg"
                        >
                          <span
                            className={
                              c.totalScore === bestTotal
                                ? 'text-green-600 font-bold'
                                : ''
                            }
                          >
                            {c.totalScore.toFixed(0)}
                            {c.totalScore === bestTotal && ' *'}
                          </span>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                  {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => {
                    const cat = CATEGORIES[key]
                    const best = getBestScore(key)
                    return (
                      <TableRow key={key}>
                        <TableCell>{cat.label}</TableCell>
                        {cities.map((c: CityScore) => {
                          const score = c.categoryScores[key]?.normalized
                          return (
                            <TableCell key={c.cityId} className="text-center">
                              <ScoreCell
                                score={score ?? null}
                                best={score !== null && score === best}
                              />
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-gray-500 mt-4">* Best score in category</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
