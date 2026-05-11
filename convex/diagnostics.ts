import { v } from 'convex/values'
import { query } from './_generated/server'

export const coverageByCountry = query({
  args: { countries: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    const allCities = await ctx.db.query('cities').collect()
    const filter = args.countries?.length
      ? new Set(args.countries.map((c) => c.toUpperCase()))
      : null
    const cities = filter
      ? allCities.filter((c) => filter.has(c.country.toUpperCase()))
      : allCities

    const cityIds = new Set(cities.map((c) => c._id))
    const cityByCountry: Record<string, number> = {}
    for (const city of cities) {
      cityByCountry[city.country] = (cityByCountry[city.country] ?? 0) + 1
    }

    const allMetrics = await ctx.db.query('cityMetrics').collect()
    const metrics = allMetrics.filter((m) => cityIds.has(m.cityId))

    const byKey: Record<string, { total: number; perCountry: Record<string, number> }> = {}
    const cityCountryMap: Record<string, string> = {}
    for (const c of cities) cityCountryMap[c._id] = c.country

    for (const m of metrics) {
      const key = `${m.category}:${m.metricKey}`
      if (!byKey[key]) byKey[key] = { total: 0, perCountry: {} }
      byKey[key].total++
      const country = cityCountryMap[m.cityId]
      byKey[key].perCountry[country] = (byKey[key].perCountry[country] ?? 0) + 1
    }

    return {
      totalCities: cities.length,
      citiesByCountry: cityByCountry,
      metricsCoverage: byKey,
    }
  },
})

export const citiesMissingDescription = query({
  args: { countries: v.optional(v.array(v.string())) },
  handler: async (ctx, args) => {
    const allCities = await ctx.db.query('cities').collect()
    const filter = args.countries?.length
      ? new Set(args.countries.map((c) => c.toUpperCase()))
      : null
    const cities = filter
      ? allCities.filter((c) => filter.has(c.country.toUpperCase()))
      : allCities
    return cities
      .filter((c) => !c.description)
      .map((c) => ({ name: c.name, country: c.country }))
  },
})
