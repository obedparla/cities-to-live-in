'use node'

import { action } from '../_generated/server'
import { api, internal } from '../_generated/api'

const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast'
const AIR_QUALITY_BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality'

export const fetchWeatherForAllCities = action({
  args: {},
  handler: async (ctx): Promise<{ success: number; failed: number }> => {
    const cities = await ctx.runQuery(api.cities.list)
    let success = 0
    let failed = 0

    for (const city of cities) {
      try {
        const weatherUrl = `${WEATHER_BASE}?latitude=${city.lat}&longitude=${city.lon}&daily=temperature_2m_max,temperature_2m_min,sunshine_duration&timezone=auto&past_days=92&forecast_days=0`
        const weatherRes = await fetch(weatherUrl)

        if (weatherRes.ok) {
          const data = await weatherRes.json()
          const days = data.daily.temperature_2m_max.length

          const avgTempMax = data.daily.temperature_2m_max.reduce((a: number, b: number) => a + b, 0) / days
          const avgTempMin = data.daily.temperature_2m_min.reduce((a: number, b: number) => a + b, 0) / days
          const avgTemp = (avgTempMax + avgTempMin) / 2
          const totalSunshine = data.daily.sunshine_duration.reduce((a: number, b: number) => a + b, 0)
          const avgSunshineHours = totalSunshine / 3600 / days

          await ctx.runMutation(internal.mutations.batchUpsertWeatherMetrics, {
            cityId: city._id,
            metrics: [
              { metricKey: 'avg_temp', value: avgTemp },
              { metricKey: 'avg_sunshine_hours', value: avgSunshineHours },
            ],
          })
          success++
        } else {
          failed++
        }

        await delay(100)
      } catch (e) {
        console.error(`Failed for ${city.name}:`, e)
        failed++
      }
    }

    return { success, failed }
  },
})

export const fetchAirQualityForAllCities = action({
  args: {},
  handler: async (ctx): Promise<{ success: number; failed: number }> => {
    const cities = await ctx.runQuery(api.cities.list)
    let success = 0
    let failed = 0

    for (const city of cities) {
      try {
        const url = `${AIR_QUALITY_BASE}?latitude=${city.lat}&longitude=${city.lon}&hourly=european_aqi&past_days=30&forecast_days=0`
        const res = await fetch(url)

        if (res.ok) {
          const data = await res.json()
          const validAqi = data.hourly.european_aqi.filter((v: number | null) => v !== null)

          if (validAqi.length > 0) {
            const avgAqi = validAqi.reduce((a: number, b: number) => a + b, 0) / validAqi.length

            await ctx.runMutation(internal.mutations.batchUpsertAirMetrics, {
              cityId: city._id,
              metrics: [{ metricKey: 'avg_aqi', value: avgAqi }],
            })
            success++
          } else {
            failed++
          }
        } else {
          failed++
        }

        await delay(100)
      } catch (e) {
        console.error(`Failed for ${city.name}:`, e)
        failed++
      }
    }

    return { success, failed }
  },
})

export const fetchAmenitiesForAllCities = action({
  args: {},
  handler: async (ctx): Promise<{ success: number; failed: number; skipped: number }> => {
    const cities = await ctx.runQuery(api.cities.list)
    const existingMetrics = await ctx.runQuery(api.cities.getCitiesWithAmenities)
    const citiesWithAmenities = new Set(existingMetrics.map((m: { cityId: string }) => m.cityId))

    let success = 0
    let failed = 0
    let skipped = 0

    for (const city of cities) {
      if (citiesWithAmenities.has(city._id)) {
        skipped++
        continue
      }
      try {
        const radius = 10000

        const culturalQuery = `
          [out:json][timeout:25];
          (
            node["amenity"~"museum|theatre|cinema|library"](around:${radius},${city.lat},${city.lon});
            way["amenity"~"museum|theatre|cinema|library"](around:${radius},${city.lat},${city.lon});
          );
          out count;
        `
        const culturalRes = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(culturalQuery)}`,
        })

        let culturalCount = 0
        if (culturalRes.ok) {
          const data = await culturalRes.json()
          const countEl = data.elements?.find((e: { type: string }) => e.type === 'count')
          culturalCount = parseInt(countEl?.tags?.total || '0', 10)
        }

        await delay(1000)

        const parkQuery = `
          [out:json][timeout:25];
          (
            way["leisure"="park"](around:${radius},${city.lat},${city.lon});
            relation["leisure"="park"](around:${radius},${city.lat},${city.lon});
          );
          out count;
        `
        const parkRes = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(parkQuery)}`,
        })

        let parkCount = 0
        if (parkRes.ok) {
          const data = await parkRes.json()
          const countEl = data.elements?.find((e: { type: string }) => e.type === 'count')
          parkCount = parseInt(countEl?.tags?.total || '0', 10)
        }

        await ctx.runMutation(internal.mutations.batchUpsertAmenityMetrics, {
          cityId: city._id,
          metrics: [
            { metricKey: 'cultural_count', value: culturalCount },
            { metricKey: 'park_count', value: parkCount },
          ],
        })
        success++

        await delay(1000)
      } catch (e) {
        console.error(`Amenities failed for ${city.name}:`, e)
        failed++
      }
    }

    return { success, failed, skipped }
  },
})

export const fetchEurostatForAllCities = action({
  args: {},
  handler: async (ctx): Promise<{ results: Record<string, { success: number; failed: number }> }> => {
    const cities = await ctx.runQuery(api.cities.list)
    const citiesWithUrau = cities.filter((c) => c.urauCode)

    if (citiesWithUrau.length === 0) {
      return { results: {} }
    }

    const EUROSTAT_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'

    const DATASETS = [
      { key: 'population', dataset: 'urb_cpop1', indicator: 'DE1001V' },
      { key: 'income', dataset: 'urb_clivcon', indicator: 'EC3040V' },
      { key: 'unemployment', dataset: 'urb_clma', indicator: 'EC1010V' },
      { key: 'rent', dataset: 'urb_clivcon', indicator: 'SA1049V' },
      { key: 'crime', dataset: 'urb_percep', indicator: 'PS3290V' },
      { key: 'education', dataset: 'urb_ceduc', indicator: 'TE2031I' },
    ]

    const results: Record<string, { success: number; failed: number }> = {}

    for (const ds of DATASETS) {
      let dsSuccess = 0
      let dsFailed = 0

      for (const city of citiesWithUrau) {
        try {
          const url = `${EUROSTAT_BASE}/${ds.dataset}?format=JSON&lang=EN&indic_ur=${ds.indicator}&cities=${city.urauCode}`

          const response = await fetch(url)
          if (!response.ok) {
            dsFailed++
            continue
          }

          const data = await response.json()
          const values = data.value ?? {}
          const timeIndex = data.dimension?.time?.category?.index ?? {}
          const timeKeys = Object.keys(timeIndex).sort()

          let latestValue: number | null = null
          for (let i = timeKeys.length - 1; i >= 0; i--) {
            const timeIdx = timeIndex[timeKeys[i]]
            const val = values[String(timeIdx)]
            if (val !== undefined && val !== null) {
              latestValue = val
              break
            }
          }

          if (latestValue !== null) {
            await ctx.runMutation(internal.mutations.batchUpsertMetrics, {
              metrics: [{
                cityId: city._id,
                category: ds.key,
                metricKey: ds.indicator,
                value: latestValue,
                source: 'eurostat',
              }],
            })
            dsSuccess++
          } else {
            dsFailed++
          }

          await delay(100)
        } catch (e) {
          dsFailed++
        }
      }

      results[ds.key] = { success: dsSuccess, failed: dsFailed }
      console.log(`Eurostat ${ds.key}: ${dsSuccess} success, ${dsFailed} failed`)
    }

    return { results }
  },
})

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
