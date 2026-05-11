'use node'

import { v } from 'convex/values'
import { action } from '../_generated/server'
import { api, internal } from '../_generated/api'

const WIKIPEDIA_API = 'https://en.wikipedia.org/api/rest_v1/page/summary'

interface WikipediaSummary {
  title: string
  extract: string
  thumbnail?: {
    source: string
    width: number
    height: number
  }
  content_urls?: {
    desktop: { page: string }
  }
}

export const fetchCityDescription = action({
  args: { cityName: v.string() },
  handler: async (_ctx, args): Promise<{ description: string; thumbnail?: string; wikiUrl?: string } | null> => {
    try {
      const cityName = args.cityName.replace(/\s*\(.*\)\s*$/, '').trim()
      const url = `${WIKIPEDIA_API}/${encodeURIComponent(cityName)}`

      const response = await fetch(url)
      if (!response.ok) return null

      const data: WikipediaSummary = await response.json()

      return {
        description: data.extract,
        thumbnail: data.thumbnail?.source,
        wikiUrl: data.content_urls?.desktop?.page,
      }
    } catch {
      return null
    }
  },
})

export const fetchDescriptionsForAllCities = action({
  args: { countries: v.optional(v.array(v.string())) },
  handler: async (ctx, args): Promise<{ success: number; failed: number }> => {
    const allCities = await ctx.runQuery(api.cities.list)
    const cities = args.countries?.length
      ? allCities.filter((c) =>
          args.countries!.some((cc) => cc.toUpperCase() === c.country.toUpperCase())
        )
      : allCities
    let success = 0
    let failed = 0

    for (const city of cities) {
      try {
        const cityName = city.name.replace(/\s*\(.*\)\s*$/, '').trim()
        const url = `${WIKIPEDIA_API}/${encodeURIComponent(cityName)}`

        const response = await fetch(url)
        if (!response.ok) {
          failed++
          continue
        }

        const data: WikipediaSummary = await response.json()

        if (data.extract) {
          await ctx.runMutation(internal.mutations.batchUpsertMetrics, {
            metrics: [{
              cityId: city._id,
              category: 'description',
              metricKey: 'wikipedia_extract',
              value: 0,
              source: 'wikipedia',
            }],
          })

          await ctx.runMutation(api.cities.updateDescription, {
            id: city._id,
            description: data.extract,
            thumbnail: data.thumbnail?.source,
            wikiUrl: data.content_urls?.desktop?.page,
          })
          success++
        } else {
          failed++
        }

        await delay(100)
      } catch {
        failed++
      }
    }

    return { success, failed }
  },
})

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
