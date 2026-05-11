'use node'

import { v } from 'convex/values'
import { action } from '../_generated/server'
import { api, internal } from '../_generated/api'

const WIKIPEDIA_API = 'https://en.wikipedia.org/api/rest_v1/page/summary'

interface WikipediaSummary {
  title: string
  extract: string
  type?: string
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

async function fetchSummary(cityName: string): Promise<WikipediaSummary | null> {
  const url = `${WIKIPEDIA_API}/${encodeURIComponent(cityName)}`
  const response = await fetch(url, {
    headers: { 'User-Agent': 'tolivein-bot/0.1 (https://github.com/obedparla)' },
  })
  if (!response.ok) return null
  return (await response.json()) as WikipediaSummary
}

export const fetchDescriptionsForAllCities = action({
  args: {
    countries: v.optional(v.array(v.string())),
    forceRefresh: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: number; failed: number; skipped: number; failures: string[] }> => {
    const allCities = await ctx.runQuery(api.cities.list)
    const cities = args.countries?.length
      ? allCities.filter((c) =>
          args.countries!.some((cc) => cc.toUpperCase() === c.country.toUpperCase())
        )
      : allCities

    let success = 0
    let failed = 0
    let skipped = 0
    const failures: string[] = []

    for (const city of cities) {
      if (!args.forceRefresh && city.description) {
        skipped++
        continue
      }
      try {
        const candidates = new Set<string>()
        const baseName = city.name.replace(/\s*\(.*\)\s*$/, '').trim()
        candidates.add(baseName)
        candidates.add(`${baseName}, ${city.country}`)
        candidates.add(`${baseName} (city)`)

        let summary: WikipediaSummary | null = null
        for (const candidate of candidates) {
          const data = await fetchSummary(candidate)
          if (data?.extract && data.type !== 'disambiguation') {
            summary = data
            break
          }
          await delay(150)
        }

        if (summary && summary.extract) {
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
            description: summary.extract,
            thumbnail: summary.thumbnail?.source,
            wikiUrl: summary.content_urls?.desktop?.page,
          })
          success++
        } else {
          failed++
          failures.push(`${city.name} (${city.country})`)
        }

        await delay(200)
      } catch (e) {
        failed++
        failures.push(
          `${city.name} (${city.country}): ${e instanceof Error ? e.message : 'error'}`
        )
      }
    }

    return { success, failed, skipped, failures }
  },
})

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
