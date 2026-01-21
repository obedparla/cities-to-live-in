'use node'

import { v } from 'convex/values'
import { action } from '../_generated/server'
import { internal } from '../_generated/api'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

interface OverpassElement {
  type: string
  id?: number
  tags?: { total?: string; nodes?: string; ways?: string; relations?: string }
  [key: string]: unknown
}

interface OverpassResponse {
  elements: OverpassElement[]
}

async function queryOverpass(query: string): Promise<number> {
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!response.ok) {
    throw new Error(`Overpass error: ${response.status}`)
  }

  const data: OverpassResponse = await response.json()
  const countEl = data.elements.find((e) => e.type === 'count')
  return parseInt(countEl?.tags?.total || '0', 10)
}

export const fetchAmenityData = action({
  args: {
    cityId: v.id('cities'),
    cityName: v.string(),
    lat: v.number(),
    lon: v.number(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const radius = 10000

    try {
      const culturalQuery = `
        [out:json][timeout:25];
        (
          node["amenity"~"museum|theatre|cinema|library"](around:${radius},${args.lat},${args.lon});
          way["amenity"~"museum|theatre|cinema|library"](around:${radius},${args.lat},${args.lon});
        );
        out count;
      `
      const culturalCount = await queryOverpass(culturalQuery)

      await delay(1000)

      const parkQuery = `
        [out:json][timeout:25];
        (
          way["leisure"="park"](around:${radius},${args.lat},${args.lon});
          relation["leisure"="park"](around:${radius},${args.lat},${args.lon});
        );
        out count;
      `
      const parkCount = await queryOverpass(parkQuery)

      await delay(1000)

      const restaurantQuery = `
        [out:json][timeout:25];
        (
          node["amenity"~"restaurant|cafe|bar"](around:${radius},${args.lat},${args.lon});
        );
        out count;
      `
      const restaurantCount = await queryOverpass(restaurantQuery)

      await ctx.runMutation(internal.mutations.batchUpsertAmenityMetrics, {
        cityId: args.cityId,
        metrics: [
          { metricKey: 'cultural_count', value: culturalCount },
          { metricKey: 'park_count', value: parkCount },
          { metricKey: 'restaurant_count', value: restaurantCount },
        ],
      })

      return { success: true }
    } catch (e) {
      console.error('Overpass fetch error:', e)
      return { success: false }
    }
  },
})

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
