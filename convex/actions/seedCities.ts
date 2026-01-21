'use node'

import { v } from 'convex/values'
import { action } from '../_generated/server'
import { internal } from '../_generated/api'

const GISCO_URL =
  'https://gisco-services.ec.europa.eu/distribution/v2/urau/geojson/URAU_LB_2024_4326_CITIES.geojson'

const CAPITAL_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'NO', 'CH', 'UK', 'GB'
]

interface GiscoFeature {
  type: 'Feature'
  properties: {
    URAU_CODE: string
    URAU_NAME: string
    CNTR_CODE: string
    CITY_CPTL?: string
    AREA_SQM?: number
    POP_2021?: number
  }
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

interface GiscoGeoJSON {
  type: 'FeatureCollection'
  features: GiscoFeature[]
}

export const seedCities = action({
  args: { maxCities: v.optional(v.number()) },
  handler: async (ctx, args): Promise<{ inserted: number; skipped: number }> => {
    const maxCities = args.maxCities ?? 100

    const response = await fetch(GISCO_URL)
    if (!response.ok) {
      throw new Error(`Failed to fetch GISCO data: ${response.status}`)
    }

    const data: GiscoGeoJSON = await response.json()
    const features = data.features

    const europeanCities = features.filter((f) =>
      CAPITAL_COUNTRIES.includes(f.properties.CNTR_CODE)
    )

    const capitals = europeanCities.filter(
      (f) => f.properties.CITY_CPTL === 'Y'
    )
    const nonCapitals = europeanCities.filter(
      (f) => f.properties.CITY_CPTL !== 'Y'
    )

    const sortedNonCapitals = nonCapitals.sort(
      (a, b) => (b.properties.POP_2021 ?? 0) - (a.properties.POP_2021 ?? 0)
    )

    const remainingSlots = maxCities - capitals.length
    const topNonCapitals = sortedNonCapitals.slice(
      0,
      Math.max(0, remainingSlots)
    )

    const selectedCities = [...capitals, ...topNonCapitals].slice(0, maxCities)

    const citiesToInsert = selectedCities.map((f) => ({
      urauCode: f.properties.URAU_CODE,
      name: f.properties.URAU_NAME,
      country: f.properties.CNTR_CODE,
      lon: f.geometry.coordinates[0],
      lat: f.geometry.coordinates[1],
      areaSqKm: (f.properties.AREA_SQM ?? 0) / 1_000_000,
      isCapital: f.properties.CITY_CPTL === 'Y',
      population: f.properties.POP_2021,
    }))

    const result = await ctx.runMutation(internal.mutations.batchInsertCities, {
      cities: citiesToInsert,
    })

    return result
  },
})
