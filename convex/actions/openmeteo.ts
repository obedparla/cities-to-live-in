'use node'

import { v } from 'convex/values'
import { action } from '../_generated/server'
import { internal } from '../_generated/api'

const WEATHER_BASE = 'https://api.open-meteo.com/v1/forecast'
const AIR_QUALITY_BASE = 'https://air-quality-api.open-meteo.com/v1/air-quality'

interface WeatherResponse {
  daily: {
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_sum: number[]
    sunshine_duration: number[]
  }
}

interface AirQualityResponse {
  hourly: {
    european_aqi: number[]
    pm2_5: number[]
    pm10: number[]
  }
}

export const fetchWeatherData = action({
  args: {
    cityId: v.id('cities'),
    lat: v.number(),
    lon: v.number(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const url = `${WEATHER_BASE}?latitude=${args.lat}&longitude=${args.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,sunshine_duration&timezone=auto&past_days=92&forecast_days=0`

    try {
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Weather API error: ${response.status}`)
        return { success: false }
      }

      const data: WeatherResponse = await response.json()

      const avgTempMax =
        data.daily.temperature_2m_max.reduce((a, b) => a + b, 0) /
        data.daily.temperature_2m_max.length
      const avgTempMin =
        data.daily.temperature_2m_min.reduce((a, b) => a + b, 0) /
        data.daily.temperature_2m_min.length
      const avgTemp = (avgTempMax + avgTempMin) / 2

      const totalPrecipitation = data.daily.precipitation_sum.reduce(
        (a, b) => a + b,
        0
      )

      const totalSunshine = data.daily.sunshine_duration.reduce(
        (a, b) => a + b,
        0
      )
      const days = data.daily.sunshine_duration.length
      const avgSunshineHoursPerDay = totalSunshine / 3600 / days

      await ctx.runMutation(internal.mutations.batchUpsertWeatherMetrics, {
        cityId: args.cityId,
        metrics: [
          { metricKey: 'avg_temp', value: avgTemp },
          { metricKey: 'avg_temp_max', value: avgTempMax },
          { metricKey: 'avg_temp_min', value: avgTempMin },
          { metricKey: 'annual_precipitation_mm', value: totalPrecipitation },
          { metricKey: 'avg_sunshine_hours', value: avgSunshineHoursPerDay },
        ],
      })

      return { success: true }
    } catch (e) {
      console.error('Weather fetch error:', e)
      return { success: false }
    }
  },
})

export const fetchAirQualityData = action({
  args: {
    cityId: v.id('cities'),
    lat: v.number(),
    lon: v.number(),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    const url = `${AIR_QUALITY_BASE}?latitude=${args.lat}&longitude=${args.lon}&hourly=european_aqi,pm2_5,pm10&past_days=30&forecast_days=0`

    try {
      const response = await fetch(url)
      if (!response.ok) {
        console.error(`Air quality API error: ${response.status}`)
        return { success: false }
      }

      const data: AirQualityResponse = await response.json()

      const validAqi = data.hourly.european_aqi.filter(
        (v) => v !== null && v !== undefined
      )
      const avgAqi =
        validAqi.length > 0
          ? validAqi.reduce((a, b) => a + b, 0) / validAqi.length
          : null

      const validPm25 = data.hourly.pm2_5.filter(
        (v) => v !== null && v !== undefined
      )
      const avgPm25 =
        validPm25.length > 0
          ? validPm25.reduce((a, b) => a + b, 0) / validPm25.length
          : null

      const validPm10 = data.hourly.pm10.filter(
        (v) => v !== null && v !== undefined
      )
      const avgPm10 =
        validPm10.length > 0
          ? validPm10.reduce((a, b) => a + b, 0) / validPm10.length
          : null

      const metrics: Array<{ metricKey: string; value: number }> = []
      if (avgAqi !== null) metrics.push({ metricKey: 'avg_aqi', value: avgAqi })
      if (avgPm25 !== null) metrics.push({ metricKey: 'avg_pm25', value: avgPm25 })
      if (avgPm10 !== null) metrics.push({ metricKey: 'avg_pm10', value: avgPm10 })

      if (metrics.length > 0) {
        await ctx.runMutation(internal.mutations.batchUpsertAirMetrics, {
          cityId: args.cityId,
          metrics,
        })
      }

      return { success: true }
    } catch (e) {
      console.error('Air quality fetch error:', e)
      return { success: false }
    }
  },
})
