import { v } from 'convex/values'
import { query } from './_generated/server'
import type { Doc, Id } from './_generated/dataModel'

export const CATEGORIES = {
  population: { label: 'Population', higherBetter: null, source: 'eurostat' },
  income: { label: 'Average Income', higherBetter: true, source: 'eurostat' },
  unemployment: { label: 'Unemployment', higherBetter: false, source: 'eurostat' },
  rent: { label: 'Cost of Living', higherBetter: false, source: 'eurostat' },
  crime: { label: 'Safety', higherBetter: true, source: 'eurostat' },
  education: { label: 'Education', higherBetter: true, source: 'eurostat' },
  temperature: { label: 'Temperature', higherBetter: null, source: 'open-meteo' },
  sunshine: { label: 'Sunshine Hours', higherBetter: true, source: 'open-meteo' },
  air_quality: { label: 'Air Quality', higherBetter: false, source: 'open-meteo' },
  cultural: { label: 'Cultural Amenities', higherBetter: true, source: 'osm' },
  green_spaces: { label: 'Green Spaces', higherBetter: true, source: 'osm' },
} as const

export type CategoryKey = keyof typeof CATEGORIES

const METRIC_MAPPING: Record<CategoryKey, { category: string; metricKey: string }> = {
  population: { category: 'population', metricKey: 'DE1001V' },
  income: { category: 'income', metricKey: 'EC3040V' },
  unemployment: { category: 'unemployment', metricKey: 'EC1010V' },
  rent: { category: 'rent', metricKey: 'SA1049V' },
  crime: { category: 'crime', metricKey: 'PS3290V' },
  education: { category: 'education', metricKey: 'TE2031I' },
  temperature: { category: 'weather', metricKey: 'avg_temp' },
  sunshine: { category: 'weather', metricKey: 'avg_sunshine_hours' },
  air_quality: { category: 'air_quality', metricKey: 'avg_aqi' },
  cultural: { category: 'amenities', metricKey: 'cultural_count' },
  green_spaces: { category: 'amenities', metricKey: 'park_count' },
}

interface UserWeights {
  [key: string]: number
}

export interface CityScore {
  cityId: Id<'cities'>
  city: Doc<'cities'>
  totalScore: number
  categoryScores: Partial<Record<CategoryKey, { raw: number | null; normalized: number | null }>>
}

function normalizeMinMax(
  values: (number | null)[],
  higherBetter: boolean | null
): (number | null)[] {
  const validValues = values.filter((v): v is number => v !== null)
  if (validValues.length === 0) return values.map(() => null)

  const min = Math.min(...validValues)
  const max = Math.max(...validValues)

  if (min === max) return validValues.map(() => 50)

  return values.map((v) => {
    if (v === null) return null
    const normalized = ((v - min) / (max - min)) * 100
    if (higherBetter === false) {
      return 100 - normalized
    }
    return normalized
  })
}

function scoreTemperature(temp: number | null, preferredTemp: number): number | null {
  if (temp === null) return null
  const diff = Math.abs(temp - preferredTemp)
  return Math.max(0, 100 - diff * 5)
}

export const getCitiesWithScores = query({
  args: {
    weights: v.optional(v.record(v.string(), v.number())),
    preferredTemp: v.optional(v.number()),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.union(v.literal('asc'), v.literal('desc'))),
  },
  handler: async (ctx, args): Promise<CityScore[]> => {
    const weights: UserWeights = args.weights ?? {}
    const preferredTemp = args.preferredTemp ?? 20
    const sortBy = args.sortBy ?? 'totalScore'
    const sortOrder = args.sortOrder ?? 'desc'

    const cities = await ctx.db.query('cities').collect()
    if (cities.length === 0) return []

    const allMetrics = await ctx.db.query('cityMetrics').collect()

    const metricsByCity = new Map<string, Doc<'cityMetrics'>[]>()
    for (const metric of allMetrics) {
      const cityId = metric.cityId.toString()
      if (!metricsByCity.has(cityId)) {
        metricsByCity.set(cityId, [])
      }
      metricsByCity.get(cityId)!.push(metric)
    }

    const rawValues: Record<CategoryKey, (number | null)[]> = {} as Record<CategoryKey, (number | null)[]>
    for (const key of Object.keys(CATEGORIES) as CategoryKey[]) {
      rawValues[key] = []
    }

    for (const city of cities) {
      const cityMetrics = metricsByCity.get(city._id.toString()) ?? []

      for (const catKey of Object.keys(CATEGORIES) as CategoryKey[]) {
        const mapping = METRIC_MAPPING[catKey]
        const metric = cityMetrics.find(
          (m) => m.category === mapping.category && m.metricKey === mapping.metricKey
        )
        rawValues[catKey].push(metric?.value ?? null)
      }
    }

    const normalizedValues: Record<CategoryKey, (number | null)[]> = {} as Record<CategoryKey, (number | null)[]>
    for (const catKey of Object.keys(CATEGORIES) as CategoryKey[]) {
      const cat = CATEGORIES[catKey]
      if (catKey === 'temperature') {
        normalizedValues[catKey] = rawValues[catKey].map((v) =>
          scoreTemperature(v, preferredTemp)
        )
      } else {
        normalizedValues[catKey] = normalizeMinMax(rawValues[catKey], cat.higherBetter)
      }
    }

    const results: CityScore[] = cities.map((city, idx) => {
      const categoryScores: Partial<Record<CategoryKey, { raw: number | null; normalized: number | null }>> = {}
      let weightedSum = 0
      let totalWeight = 0

      for (const catKey of Object.keys(CATEGORIES) as CategoryKey[]) {
        const raw = rawValues[catKey][idx]
        const normalized = normalizedValues[catKey][idx]
        categoryScores[catKey] = { raw, normalized }

        if (normalized !== null) {
          const weight = weights[catKey] ?? 1
          weightedSum += normalized * weight
          totalWeight += weight
        }
      }

      const totalScore = totalWeight > 0 ? weightedSum / totalWeight : 0

      return {
        cityId: city._id,
        city,
        totalScore,
        categoryScores,
      }
    })

    results.sort((a, b) => {
      let aVal: number
      let bVal: number

      if (sortBy === 'totalScore') {
        aVal = a.totalScore
        bVal = b.totalScore
      } else if (sortBy === 'name') {
        aVal = a.city.name.localeCompare(b.city.name)
        bVal = 0
        return sortOrder === 'asc' ? aVal : -aVal
      } else if (sortBy === 'country') {
        aVal = a.city.country.localeCompare(b.city.country)
        bVal = 0
        return sortOrder === 'asc' ? aVal : -aVal
      } else {
        const catKey = sortBy as CategoryKey
        aVal = a.categoryScores[catKey]?.normalized ?? -1
        bVal = b.categoryScores[catKey]?.normalized ?? -1
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
    })

    return results
  },
})

export const getCityScore = query({
  args: {
    cityId: v.id('cities'),
    weights: v.optional(v.record(v.string(), v.number())),
    preferredTemp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const city = await ctx.db.get(args.cityId)
    if (!city) return null

    const weights: UserWeights = args.weights ?? {}
    const preferredTemp = args.preferredTemp ?? 20

    const metrics = await ctx.db
      .query('cityMetrics')
      .withIndex('by_city', (q) => q.eq('cityId', args.cityId))
      .collect()

    const categoryScores: Partial<Record<CategoryKey, { raw: number | null; normalized: number | null }>> = {}
    let weightedSum = 0
    let totalWeight = 0

    for (const catKey of Object.keys(CATEGORIES) as CategoryKey[]) {
      const mapping = METRIC_MAPPING[catKey]
      const metric = metrics.find(
        (m) => m.category === mapping.category && m.metricKey === mapping.metricKey
      )
      const raw = metric?.value ?? null

      let normalized: number | null = null
      if (raw !== null) {
        if (catKey === 'temperature') {
          normalized = scoreTemperature(raw, preferredTemp)
        } else {
          normalized = raw
        }
      }

      categoryScores[catKey] = { raw, normalized }

      if (normalized !== null) {
        const weight = weights[catKey] ?? 1
        weightedSum += normalized * weight
        totalWeight += weight
      }
    }

    return {
      cityId: args.cityId,
      city,
      totalScore: totalWeight > 0 ? weightedSum / totalWeight : 0,
      categoryScores,
      metrics,
    }
  },
})

export const getMetricRanges = query({
  args: {},
  handler: async (ctx) => {
    const metrics = await ctx.db.query('cityMetrics').collect()

    const ranges: Record<string, { min: number; max: number; count: number }> = {}

    for (const metric of metrics) {
      const key = `${metric.category}:${metric.metricKey}`
      if (!ranges[key]) {
        ranges[key] = { min: Infinity, max: -Infinity, count: 0 }
      }
      ranges[key].min = Math.min(ranges[key].min, metric.value)
      ranges[key].max = Math.max(ranges[key].max, metric.value)
      ranges[key].count++
    }

    return ranges
  },
})
