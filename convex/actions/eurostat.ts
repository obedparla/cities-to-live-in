'use node'

import { v } from 'convex/values'
import { action } from '../_generated/server'
import { internal } from '../_generated/api'
import type { Id } from '../_generated/dataModel'

const EUROSTAT_BASE =
  'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'

const DATASETS = {
  population: { dataset: 'urb_cpop1', indicators: ['DE1001V'] },
  income: { dataset: 'urb_clivcon', indicators: ['EC3040V'] },
  unemployment: { dataset: 'urb_clma', indicators: ['EC1010V'] },
  rent: { dataset: 'urb_clivcon', indicators: ['SA1049V'] },
  crime: { dataset: 'urb_percep', indicators: ['PS3290V'] },
  education: { dataset: 'urb_ceduc', indicators: ['TE2031I'] },
} as const

type DatasetKey = keyof typeof DATASETS

interface EurostatResponse {
  value: Record<string, number>
  dimension: {
    cities: {
      category: {
        index: Record<string, number>
      }
    }
    indic_ur: {
      category: {
        index: Record<string, number>
      }
    }
    time: {
      category: {
        index: Record<string, number>
      }
    }
  }
  size: number[]
}

export const fetchEurostatData = action({
  args: {
    cityIds: v.array(v.id('cities')),
    urauCodes: v.array(v.string()),
    category: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: number; failed: number }> => {
    const category = args.category as DatasetKey
    const config = DATASETS[category]
    if (!config) {
      throw new Error(`Unknown category: ${category}`)
    }

    const citiesParam = args.urauCodes.join(',')
    const indicatorParam = config.indicators.join(',')

    const url = `${EUROSTAT_BASE}/${config.dataset}?format=JSON&lang=EN&cities=${citiesParam}&indic_ur=${indicatorParam}`

    let data: EurostatResponse | null = null
    try {
      const response = await fetch(url)
      if (response.ok) {
        data = await response.json()
      }
    } catch (e) {
      console.error(`Failed to fetch Eurostat ${category}:`, e)
    }

    if (!data) {
      return { success: 0, failed: args.cityIds.length }
    }

    const metrics: Array<{
      cityId: Id<'cities'>
      category: string
      metricKey: string
      value: number
      source: string
    }> = []

    const citiesIndex = data.dimension.cities?.category?.index ?? {}
    const indicIndex = data.dimension.indic_ur?.category?.index ?? {}
    const timeIndex = data.dimension.time?.category?.index ?? {}

    const timeKeys = Object.keys(timeIndex).sort()
    const latestTime = timeKeys[timeKeys.length - 1]
    const latestTimeIdx = timeIndex[latestTime]

    const indicSize = Object.keys(indicIndex).length

    for (let i = 0; i < args.urauCodes.length; i++) {
      const urauCode = args.urauCodes[i]
      const cityId = args.cityIds[i]
      const cityIdx = citiesIndex[urauCode]

      if (cityIdx === undefined) continue

      for (const [indicCode, indicIdx] of Object.entries(indicIndex)) {
        const valueIdx =
          cityIdx * indicSize * timeKeys.length + (indicIdx as number) * timeKeys.length + latestTimeIdx
        const value = data.value[String(valueIdx)]

        if (value !== undefined && value !== null) {
          metrics.push({
            cityId,
            category,
            metricKey: indicCode,
            value,
            source: 'eurostat',
          })
        }
      }
    }

    if (metrics.length > 0) {
      await ctx.runMutation(internal.mutations.batchUpsertMetrics, {
        metrics,
      })
    }

    return { success: metrics.length, failed: args.cityIds.length - metrics.length }
  },
})
