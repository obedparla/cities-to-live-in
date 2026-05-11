'use node'

import { v } from 'convex/values'
import { action } from '../_generated/server'
import { api, internal } from '../_generated/api'

const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast'
const AIR_QUALITY_BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality'

function filterByCountries<T extends { country: string }>(
  cities: T[],
  countries: string[] | undefined
): T[] {
  if (!countries || countries.length === 0) return cities
  const set = new Set(countries.map((c) => c.toUpperCase()))
  return cities.filter((c) => set.has(c.country.toUpperCase()))
}

export const fetchWeatherForAllCities = action({
  args: { countries: v.optional(v.array(v.string())) },
  handler: async (ctx, args): Promise<{ success: number; failed: number }> => {
    const allCities = await ctx.runQuery(api.cities.list)
    const cities = filterByCountries(allCities, args.countries)
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
  args: { countries: v.optional(v.array(v.string())) },
  handler: async (ctx, args): Promise<{ success: number; failed: number }> => {
    const allCities = await ctx.runQuery(api.cities.list)
    const cities = filterByCountries(allCities, args.countries)
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
  args: {
    forceRefresh: v.optional(v.boolean()),
    batchSize: v.optional(v.number()),
    offset: v.optional(v.number()),
    countries: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ success: number; failed: number; skipped: number; total: number; processed: number }> => {
    const rawCities = await ctx.runQuery(api.cities.list)
    const allCities = filterByCountries(rawCities, args.countries)
    const existingMetrics = await ctx.runQuery(api.cities.getCitiesWithAmenities)
    const citiesWithAmenities = new Set(existingMetrics.map((m: { cityId: string }) => m.cityId))

    const batchSize = args.batchSize ?? 20
    const offset = args.offset ?? 0
    const cities = allCities.slice(offset, offset + batchSize)

    let success = 0
    let failed = 0
    let skipped = 0

    for (const city of cities) {
      if (!args.forceRefresh && citiesWithAmenities.has(city._id)) {
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

        await delay(500)

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

        await delay(500)
      } catch (e) {
        console.error(`Amenities failed for ${city.name}:`, e)
        failed++
      }
    }

    return { success, failed, skipped, total: allCities.length, processed: offset + cities.length }
  },
})

export const fetchEurostatForAllCities = action({
  args: { countries: v.optional(v.array(v.string())) },
  handler: async (ctx, args): Promise<{ results: Record<string, { success: number; failed: number }> }> => {
    const allCities = await ctx.runQuery(api.cities.list)
    const cities = filterByCountries(allCities, args.countries)
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

export const fetchHealthcareForAllCities = action({
  args: { countries: v.optional(v.array(v.string())) },
  handler: async (ctx, args): Promise<{ success: number; failed: number }> => {
    const allCities = await ctx.runQuery(api.cities.list)
    const cities = filterByCountries(allCities, args.countries)

    const url = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/hlth_rs_bds?format=JSON&lang=EN&unit=P_HTHAB&facility=HBEDT'

    try {
      const response = await fetch(url)
      if (!response.ok) {
        console.error('Healthcare API error:', response.status)
        return { success: 0, failed: cities.length }
      }

      const data = await response.json()
      const values = data.value ?? {}
      const geoIndex = data.dimension?.geo?.category?.index ?? {}
      const timeIndex = data.dimension?.time?.category?.index ?? {}

      const timeKeys = Object.keys(timeIndex).sort()
      const geoKeys = Object.keys(geoIndex)

      const healthcareByCountry: Record<string, number> = {}

      for (const geo of geoKeys) {
        const geoIdx = geoIndex[geo]
        for (let i = timeKeys.length - 1; i >= 0; i--) {
          const timeIdx = timeIndex[timeKeys[i]]
          const valueIdx = geoIdx * timeKeys.length + timeIdx
          const val = values[String(valueIdx)]
          if (val !== undefined && val !== null) {
            healthcareByCountry[geo] = val
            break
          }
        }
      }

      let success = 0
      let failed = 0

      for (const city of cities) {
        const countryCode = city.country.toUpperCase()
        const healthcareValue = healthcareByCountry[countryCode]

        if (healthcareValue !== undefined) {
          await ctx.runMutation(internal.mutations.batchUpsertMetrics, {
            metrics: [{
              cityId: city._id,
              category: 'healthcare',
              metricKey: 'hospital_beds_per_100k',
              value: healthcareValue,
              source: 'eurostat',
            }],
          })
          success++
        } else {
          failed++
        }
      }

      console.log(`Healthcare: ${success} success, ${failed} failed`)
      return { success, failed }
    } catch (e) {
      console.error('Healthcare fetch error:', e)
      return { success: 0, failed: cities.length }
    }
  },
})

export const fetchExpatDataForAllCities = action({
  args: { countries: v.optional(v.array(v.string())) },
  handler: async (ctx, args): Promise<{ success: number; failed: number }> => {
    const allCities = await ctx.runQuery(api.cities.list)
    const cities = filterByCountries(allCities, args.countries)

    const url = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/migr_pop1ctz?format=JSON&lang=EN&citizen=FOR&age=TOTAL&sex=T'

    try {
      const response = await fetch(url)
      if (!response.ok) {
        console.error('Expat API error:', response.status)
        return { success: 0, failed: cities.length }
      }

      const data = await response.json()
      const values = data.value ?? {}
      const geoIndex = data.dimension?.geo?.category?.index ?? {}
      const timeIndex = data.dimension?.time?.category?.index ?? {}

      const timeKeys = Object.keys(timeIndex).sort()
      const geoKeys = Object.keys(geoIndex)

      const expatByCountry: Record<string, number> = {}

      for (const geo of geoKeys) {
        const geoIdx = geoIndex[geo]
        for (let i = timeKeys.length - 1; i >= 0; i--) {
          const timeIdx = timeIndex[timeKeys[i]]
          const valueIdx = geoIdx * timeKeys.length + timeIdx
          const val = values[String(valueIdx)]
          if (val !== undefined && val !== null) {
            expatByCountry[geo] = val
            break
          }
        }
      }

      let success = 0
      let failed = 0

      for (const city of cities) {
        const countryCode = city.country.toUpperCase()
        const expatValue = expatByCountry[countryCode]

        if (expatValue !== undefined) {
          await ctx.runMutation(internal.mutations.batchUpsertMetrics, {
            metrics: [{
              cityId: city._id,
              category: 'expat',
              metricKey: 'foreign_born_population',
              value: expatValue,
              source: 'eurostat',
            }],
          })
          success++
        } else {
          failed++
        }
      }

      console.log(`Expat data: ${success} success, ${failed} failed`)
      return { success, failed }
    } catch (e) {
      console.error('Expat fetch error:', e)
      return { success: 0, failed: cities.length }
    }
  },
})

export const fetchNatureProximityForAllCities = action({
  args: {
    forceRefresh: v.optional(v.boolean()),
    batchSize: v.optional(v.number()),
    offset: v.optional(v.number()),
    countries: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ success: number; failed: number; skipped: number; total: number; processed: number }> => {
    const rawCities = await ctx.runQuery(api.cities.list)
    const allCities = filterByCountries(rawCities, args.countries)
    const existingMetrics = await ctx.runQuery(api.cities.getCitiesWithNature)
    const citiesWithNature = new Set(existingMetrics.map((m: { cityId: string }) => m.cityId))

    const batchSize = args.batchSize ?? 15
    const offset = args.offset ?? 0
    const cities = allCities.slice(offset, offset + batchSize)

    let success = 0
    let failed = 0
    let skipped = 0

    for (const city of cities) {
      if (!args.forceRefresh && citiesWithNature.has(city._id)) {
        skipped++
        continue
      }
      try {
        const radius = 30000

        const beachQuery = `
          [out:json][timeout:25];
          (
            node["natural"="beach"](around:${radius},${city.lat},${city.lon});
            way["natural"="beach"](around:${radius},${city.lat},${city.lon});
          );
          out count;
        `
        const beachRes = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(beachQuery)}`,
        })

        let beachCount = 0
        if (beachRes.ok) {
          const data = await beachRes.json()
          const countEl = data.elements?.find((e: { type: string }) => e.type === 'count')
          beachCount = parseInt(countEl?.tags?.total || '0', 10)
        }

        await delay(500)

        const forestQuery = `
          [out:json][timeout:25];
          (
            way["landuse"="forest"](around:${radius},${city.lat},${city.lon});
            relation["landuse"="forest"](around:${radius},${city.lat},${city.lon});
            way["natural"="wood"](around:${radius},${city.lat},${city.lon});
          );
          out count;
        `
        const forestRes = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(forestQuery)}`,
        })

        let forestCount = 0
        if (forestRes.ok) {
          const data = await forestRes.json()
          const countEl = data.elements?.find((e: { type: string }) => e.type === 'count')
          forestCount = parseInt(countEl?.tags?.total || '0', 10)
        }

        await delay(500)

        const mountainQuery = `
          [out:json][timeout:25];
          (
            node["natural"="peak"](around:${radius},${city.lat},${city.lon});
          );
          out count;
        `
        const mountainRes = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(mountainQuery)}`,
        })

        let mountainCount = 0
        if (mountainRes.ok) {
          const data = await mountainRes.json()
          const countEl = data.elements?.find((e: { type: string }) => e.type === 'count')
          mountainCount = parseInt(countEl?.tags?.total || '0', 10)
        }

        const totalNature = beachCount + forestCount + mountainCount

        await ctx.runMutation(internal.mutations.batchUpsertMetrics, {
          metrics: [{
            cityId: city._id,
            category: 'nature',
            metricKey: 'nature_score',
            value: totalNature,
            source: 'osm',
          }],
        })
        success++

        await delay(500)
      } catch (e) {
        console.error(`Nature failed for ${city.name}:`, e)
        failed++
      }
    }

    return { success, failed, skipped, total: allCities.length, processed: offset + cities.length }
  },
})

const INTERNET_SPEEDS: Record<string, number> = {
  DK: 226, NL: 206, ES: 202, FR: 199, SE: 188, CH: 185,
  HU: 184, RO: 180, BE: 166, PT: 157, LU: 155, AT: 153,
  PL: 150, DE: 135, NO: 133, IT: 130, FI: 129, IE: 123,
  CZ: 117, SK: 109, SI: 103, LT: 100, EE: 97, LV: 95,
  HR: 90, BG: 85, GR: 72, CY: 65, MT: 60, GB: 145, UK: 145,
}

export const fetchInternetSpeedForAllCities = action({
  args: { countries: v.optional(v.array(v.string())) },
  handler: async (ctx, args): Promise<{ success: number; failed: number }> => {
    const allCities = await ctx.runQuery(api.cities.list)
    const cities = filterByCountries(allCities, args.countries)

    let success = 0
    let failed = 0

    for (const city of cities) {
      const countryCode = city.country.toUpperCase()
      const speed = INTERNET_SPEEDS[countryCode]

      if (speed !== undefined) {
        await ctx.runMutation(internal.mutations.batchUpsertMetrics, {
          metrics: [{
            cityId: city._id,
            category: 'internet',
            metricKey: 'download_speed_mbps',
            value: speed,
            source: 'ookla-2024',
          }],
        })
        success++
      } else {
        failed++
      }
    }

    console.log(`Internet speed: ${success} success, ${failed} failed`)
    return { success, failed }
  },
})

export const fetchInfrastructureForAllCities = action({
  args: {
    forceRefresh: v.optional(v.boolean()),
    batchSize: v.optional(v.number()),
    offset: v.optional(v.number()),
    countries: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ success: number; failed: number; skipped: number; total: number; processed: number }> => {
    const rawCities = await ctx.runQuery(api.cities.list)
    const allCities = filterByCountries(rawCities, args.countries)
    const existingMetrics = await ctx.runQuery(api.cities.getCitiesWithInfrastructure)
    const citiesWithInfra = new Set(existingMetrics.map((m: { cityId: string }) => m.cityId))

    const batchSize = args.batchSize ?? 10
    const offset = args.offset ?? 0
    const cities = allCities.slice(offset, offset + batchSize)

    let success = 0
    let failed = 0
    let skipped = 0

    for (const city of cities) {
      if (!args.forceRefresh && citiesWithInfra.has(city._id)) {
        skipped++
        continue
      }
      try {
        const radius = 10000

        const bikeQuery = `
          [out:json][timeout:25];
          (
            way["highway"="cycleway"](around:${radius},${city.lat},${city.lon});
            way["bicycle"="designated"](around:${radius},${city.lat},${city.lon});
          );
          out count;
        `
        const bikeRes = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(bikeQuery)}`,
        })

        let bikeCount = 0
        if (bikeRes.ok) {
          const data = await bikeRes.json()
          const countEl = data.elements?.find((e: { type: string }) => e.type === 'count')
          bikeCount = parseInt(countEl?.tags?.total || '0', 10)
        }

        await delay(500)

        const coworkingQuery = `
          [out:json][timeout:25];
          (
            node["amenity"="coworking_space"](around:${radius},${city.lat},${city.lon});
            way["amenity"="coworking_space"](around:${radius},${city.lat},${city.lon});
          );
          out count;
        `
        const coworkingRes = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(coworkingQuery)}`,
        })

        let coworkingCount = 0
        if (coworkingRes.ok) {
          const data = await coworkingRes.json()
          const countEl = data.elements?.find((e: { type: string }) => e.type === 'count')
          coworkingCount = parseInt(countEl?.tags?.total || '0', 10)
        }

        await delay(500)

        const uniQuery = `
          [out:json][timeout:25];
          (
            node["amenity"="university"](around:${radius},${city.lat},${city.lon});
            way["amenity"="university"](around:${radius},${city.lat},${city.lon});
            relation["amenity"="university"](around:${radius},${city.lat},${city.lon});
          );
          out count;
        `
        const uniRes = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(uniQuery)}`,
        })

        let uniCount = 0
        if (uniRes.ok) {
          const data = await uniRes.json()
          const countEl = data.elements?.find((e: { type: string }) => e.type === 'count')
          uniCount = parseInt(countEl?.tags?.total || '0', 10)
        }

        await delay(500)

        const trainQuery = `
          [out:json][timeout:25];
          (
            node["railway"="station"](around:${radius},${city.lat},${city.lon});
            node["railway"="halt"](around:${radius},${city.lat},${city.lon});
          );
          out count;
        `
        const trainRes = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(trainQuery)}`,
        })

        let trainCount = 0
        if (trainRes.ok) {
          const data = await trainRes.json()
          const countEl = data.elements?.find((e: { type: string }) => e.type === 'count')
          trainCount = parseInt(countEl?.tags?.total || '0', 10)
        }

        await ctx.runMutation(internal.mutations.batchUpsertInfrastructureMetrics, {
          cityId: city._id,
          metrics: [
            { metricKey: 'bike_paths', value: bikeCount },
            { metricKey: 'coworking_spaces', value: coworkingCount },
            { metricKey: 'universities', value: uniCount },
            { metricKey: 'train_stations', value: trainCount },
          ],
        })
        success++

        await delay(500)
      } catch (e) {
        console.error(`Infrastructure failed for ${city.name}:`, e)
        failed++
      }
    }

    return { success, failed, skipped, total: allCities.length, processed: offset + cities.length }
  },
})

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
