import { v } from 'convex/values'
import { internalMutation } from './_generated/server'

export const batchInsertCities = internalMutation({
  args: {
    cities: v.array(
      v.object({
        urauCode: v.string(),
        name: v.string(),
        country: v.string(),
        lat: v.number(),
        lon: v.number(),
        areaSqKm: v.number(),
        isCapital: v.boolean(),
        population: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args): Promise<{ inserted: number; skipped: number }> => {
    let inserted = 0
    let skipped = 0

    for (const city of args.cities) {
      const existing = await ctx.db
        .query('cities')
        .withIndex('by_urauCode', (q) => q.eq('urauCode', city.urauCode))
        .first()

      if (existing) {
        skipped++
        continue
      }

      await ctx.db.insert('cities', {
        ...city,
        lastUpdated: Date.now(),
      })
      inserted++
    }

    return { inserted, skipped }
  },
})

export const batchUpsertMetrics = internalMutation({
  args: {
    metrics: v.array(
      v.object({
        cityId: v.id('cities'),
        category: v.string(),
        metricKey: v.string(),
        value: v.number(),
        source: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const m of args.metrics) {
      const existing = await ctx.db
        .query('cityMetrics')
        .withIndex('by_city_category', (q) =>
          q.eq('cityId', m.cityId).eq('category', m.category)
        )
        .filter((q) => q.eq(q.field('metricKey'), m.metricKey))
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: m.value,
          source: m.source,
          fetchedAt: Date.now(),
        })
      } else {
        await ctx.db.insert('cityMetrics', {
          cityId: m.cityId,
          category: m.category,
          metricKey: m.metricKey,
          value: m.value,
          source: m.source,
          fetchedAt: Date.now(),
        })
      }
    }
  },
})

export const batchUpsertWeatherMetrics = internalMutation({
  args: {
    cityId: v.id('cities'),
    metrics: v.array(
      v.object({
        metricKey: v.string(),
        value: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const m of args.metrics) {
      const existing = await ctx.db
        .query('cityMetrics')
        .withIndex('by_city_category', (q) =>
          q.eq('cityId', args.cityId).eq('category', 'weather')
        )
        .filter((q) => q.eq(q.field('metricKey'), m.metricKey))
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: m.value,
          fetchedAt: Date.now(),
        })
      } else {
        await ctx.db.insert('cityMetrics', {
          cityId: args.cityId,
          category: 'weather',
          metricKey: m.metricKey,
          value: m.value,
          source: 'open-meteo',
          fetchedAt: Date.now(),
        })
      }
    }
  },
})

export const batchUpsertAirMetrics = internalMutation({
  args: {
    cityId: v.id('cities'),
    metrics: v.array(
      v.object({
        metricKey: v.string(),
        value: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const m of args.metrics) {
      const existing = await ctx.db
        .query('cityMetrics')
        .withIndex('by_city_category', (q) =>
          q.eq('cityId', args.cityId).eq('category', 'air_quality')
        )
        .filter((q) => q.eq(q.field('metricKey'), m.metricKey))
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: m.value,
          fetchedAt: Date.now(),
        })
      } else {
        await ctx.db.insert('cityMetrics', {
          cityId: args.cityId,
          category: 'air_quality',
          metricKey: m.metricKey,
          value: m.value,
          source: 'open-meteo',
          fetchedAt: Date.now(),
        })
      }
    }
  },
})

export const batchUpsertAmenityMetrics = internalMutation({
  args: {
    cityId: v.id('cities'),
    metrics: v.array(
      v.object({
        metricKey: v.string(),
        value: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const m of args.metrics) {
      const existing = await ctx.db
        .query('cityMetrics')
        .withIndex('by_city_category', (q) =>
          q.eq('cityId', args.cityId).eq('category', 'amenities')
        )
        .filter((q) => q.eq(q.field('metricKey'), m.metricKey))
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: m.value,
          fetchedAt: Date.now(),
        })
      } else {
        await ctx.db.insert('cityMetrics', {
          cityId: args.cityId,
          category: 'amenities',
          metricKey: m.metricKey,
          value: m.value,
          source: 'osm',
          fetchedAt: Date.now(),
        })
      }
    }
  },
})

export const batchUpsertInfrastructureMetrics = internalMutation({
  args: {
    cityId: v.id('cities'),
    metrics: v.array(
      v.object({
        metricKey: v.string(),
        value: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const m of args.metrics) {
      const existing = await ctx.db
        .query('cityMetrics')
        .withIndex('by_city_category', (q) =>
          q.eq('cityId', args.cityId).eq('category', 'infrastructure')
        )
        .filter((q) => q.eq(q.field('metricKey'), m.metricKey))
        .first()

      if (existing) {
        await ctx.db.patch(existing._id, {
          value: m.value,
          fetchedAt: Date.now(),
        })
      } else {
        await ctx.db.insert('cityMetrics', {
          cityId: args.cityId,
          category: 'infrastructure',
          metricKey: m.metricKey,
          value: m.value,
          source: 'osm',
          fetchedAt: Date.now(),
        })
      }
    }
  },
})
